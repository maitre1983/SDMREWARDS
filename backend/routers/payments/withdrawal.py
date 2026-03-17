"""
SDM REWARDS - Withdrawal Routes
================================
Cashback withdrawal to MoMo
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

from .shared import get_db, get_sms, detect_network, normalize_network, is_test_mode, logger
from routers.auth import get_current_client, decode_token

router = APIRouter()


class WithdrawalRequest(BaseModel):
    phone: str
    amount: float
    network: Optional[str] = None


@router.get("/withdrawal/fee")
async def get_withdrawal_fee():
    """Get current withdrawal fee configuration"""
    db = get_db()
    config = await db.platform_config.find_one({}, {"_id": 0, "service_commissions": 1})
    withdrawal_config = {"type": "fixed", "rate": 0}
    
    if config and config.get("service_commissions"):
        commissions = config["service_commissions"]
        if "withdrawal" in commissions:
            withdrawal_config = commissions["withdrawal"]
    
    return {
        "fee_type": withdrawal_config.get("type", "fixed"),
        "fee_rate": withdrawal_config.get("rate", 0),
        "minimum_withdrawal": 1.0,
        "maximum_withdrawal": 5000.0
    }


@router.post("/withdrawal/request")
async def request_withdrawal(
    request: WithdrawalRequest,
    current_client: dict = Depends(get_current_client)
):
    """
    Request cashback withdrawal to MoMo.
    Uses Hubtel Send Money API.
    """
    db = get_db()
    
    # Validate amount
    if request.amount < 1:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is GHS 1")
    
    if request.amount > 5000:
        raise HTTPException(status_code=400, detail="Maximum withdrawal is GHS 5,000")
    
    # Get client
    client = await db.clients.find_one({"id": current_client["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check balance
    current_balance = client.get("cashback_balance", 0)
    
    # Get withdrawal fee config
    config = await db.platform_config.find_one({}, {"_id": 0, "service_commissions": 1})
    withdrawal_config = {"type": "fixed", "rate": 0}
    
    if config and config.get("service_commissions"):
        commissions = config["service_commissions"]
        if "withdrawal" in commissions:
            withdrawal_config = commissions["withdrawal"]
    
    # Calculate fee
    fee_type = withdrawal_config.get("type", "fixed")
    fee_rate = withdrawal_config.get("rate", 0)
    
    if fee_type == "percentage":
        withdrawal_fee = round(request.amount * (fee_rate / 100), 2)
    else:
        withdrawal_fee = fee_rate
    
    total_deduction = request.amount + withdrawal_fee
    net_amount = request.amount
    
    if current_balance < total_deduction:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: GHS {current_balance:.2f}, Required: GHS {total_deduction:.2f} (including GHS {withdrawal_fee:.2f} fee)"
        )
    
    # Detect/validate network
    network = request.network.upper() if request.network else detect_network(request.phone)
    if not network:
        raise HTTPException(status_code=400, detail="Could not detect network. Please specify: MTN, TELECEL, or AIRTELTIGO")
    
    network = normalize_network(network)
    
    # Generate reference
    withdrawal_ref = f"SDM-WD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Create withdrawal record
    withdrawal_record = {
        "id": str(uuid.uuid4()),
        "reference": withdrawal_ref,
        "client_id": client["id"],
        "client_phone": client.get("phone"),
        "destination_phone": request.phone,
        "network": network,
        "amount": request.amount,
        "fee": withdrawal_fee,
        "net_amount": net_amount,
        "total_deduction": total_deduction,
        "status": "pending",
        "test_mode": is_test_mode(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.withdrawals.insert_one(withdrawal_record)
    
    # Deduct from balance immediately (before API call)
    new_balance = round(current_balance - total_deduction, 2)
    await db.clients.update_one(
        {"id": client["id"]},
        {"$set": {
            "cashback_balance": new_balance,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Record wallet transaction
    await db.wallet_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "client_id": client["id"],
        "type": "withdrawal",
        "amount": -total_deduction,
        "fee": withdrawal_fee,
        "balance_after": new_balance,
        "description": f"Withdrawal to {request.phone}",
        "reference": withdrawal_ref,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Test mode
    if is_test_mode():
        await db.withdrawals.update_one(
            {"id": withdrawal_record["id"]},
            {"$set": {
                "status": "processing",
                "provider_message": "Test mode - use /withdrawal/test/confirm to complete"
            }}
        )
        
        return {
            "success": True,
            "withdrawal_id": withdrawal_record["id"],
            "reference": withdrawal_ref,
            "amount": request.amount,
            "fee": withdrawal_fee,
            "net_amount": net_amount,
            "destination": request.phone,
            "network": network,
            "status": "pending",
            "test_mode": True,
            "new_balance": new_balance,
            "message": f"Test mode: Use /api/payments/withdrawal/test/confirm/{withdrawal_record['id']} to complete"
        }
    
    # Production: Use Hubtel Send Money
    from services.hubtel_momo_service import get_hubtel_momo_service
    
    hubtel_service = get_hubtel_momo_service(db)
    
    result = await hubtel_service.send_momo(
        phone=request.phone,
        amount=net_amount,
        description=f"SDM Rewards Withdrawal - {withdrawal_ref}",
        client_reference=withdrawal_ref,
        recipient_name=client.get("name", "SDM Client")
    )
    
    if result.get("success"):
        await db.withdrawals.update_one(
            {"id": withdrawal_record["id"]},
            {"$set": {
                "status": "processing",
                "provider": "hubtel",
                "provider_reference": result.get("transaction_id"),
                "provider_message": result.get("message"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Send SMS
        try:
            sms = get_sms()
            await sms.send_sms(
                client["phone"],
                f"SDM Rewards: Your withdrawal of GHS {net_amount:.2f} to {request.phone} is being processed."
            )
        except Exception as e:
            logger.error(f"Withdrawal SMS error: {e}")
        
        return {
            "success": True,
            "withdrawal_id": withdrawal_record["id"],
            "reference": withdrawal_ref,
            "amount": request.amount,
            "fee": withdrawal_fee,
            "net_amount": net_amount,
            "destination": request.phone,
            "network": network,
            "status": "processing",
            "new_balance": new_balance,
            "message": "Withdrawal is being processed. You will receive funds shortly."
        }
    else:
        # Refund on failure
        await db.clients.update_one(
            {"id": client["id"]},
            {"$inc": {"cashback_balance": total_deduction}}
        )
        
        await db.withdrawals.update_one(
            {"id": withdrawal_record["id"]},
            {"$set": {"status": "failed", "provider_message": result.get("error")}}
        )
        
        raise HTTPException(status_code=500, detail=result.get("error", "Withdrawal failed. Please try again."))


@router.post("/withdrawal/test/confirm/{withdrawal_id}")
async def confirm_test_withdrawal(withdrawal_id: str, req: Request):
    """Test mode: Manually confirm a withdrawal"""
    db = get_db()
    
    # Auth check
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    if not payload or payload.get("type") != "client":
        raise HTTPException(status_code=401, detail="Invalid token")
    
    withdrawal = await db.withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal["client_id"] != payload["sub"]:
        raise HTTPException(status_code=403, detail="Not your withdrawal")
    
    if withdrawal["status"] not in ["pending", "processing"]:
        raise HTTPException(status_code=400, detail=f"Withdrawal already {withdrawal['status']}")
    
    if not withdrawal.get("test_mode"):
        raise HTTPException(status_code=400, detail="This endpoint is only for test mode")
    
    # Update withdrawal status
    await db.withdrawals.update_one(
        {"id": withdrawal_id},
        {"$set": {
            "status": "success",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Record transaction
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "type": "withdrawal",
        "client_id": withdrawal["client_id"],
        "amount": -withdrawal["amount"],
        "description": f"Cashback withdrawal to {withdrawal['destination_phone']}",
        "payment_reference": withdrawal["reference"],
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Get updated balance
    client = await db.clients.find_one({"id": withdrawal["client_id"]}, {"_id": 0})
    new_balance = client.get("cashback_balance", 0) if client else 0
    
    return {
        "success": True,
        "message": "Withdrawal confirmed successfully",
        "amount": withdrawal["amount"],
        "destination": withdrawal["destination_phone"],
        "new_balance": new_balance
    }


@router.get("/withdrawal/status/{withdrawal_id}")
async def get_withdrawal_status(withdrawal_id: str, req: Request):
    """Get withdrawal status"""
    db = get_db()
    
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    if not payload or payload.get("type") != "client":
        raise HTTPException(status_code=401, detail="Invalid token")
    
    withdrawal = await db.withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal["client_id"] != payload["sub"]:
        raise HTTPException(status_code=403, detail="Not your withdrawal")
    
    return {
        "id": withdrawal["id"],
        "reference": withdrawal["reference"],
        "amount": withdrawal["amount"],
        "fee": withdrawal.get("fee", 0),
        "net_amount": withdrawal.get("net_amount", withdrawal["amount"]),
        "destination": withdrawal["destination_phone"],
        "network": withdrawal["network"],
        "status": withdrawal["status"],
        "created_at": withdrawal["created_at"],
        "completed_at": withdrawal.get("completed_at")
    }


@router.post("/withdrawal/callback")
async def withdrawal_callback(request: Request):
    """Callback for withdrawal status updates"""
    db = get_db()
    
    try:
        body = await request.json()
        logger.info(f"Withdrawal callback received: {body}")
        
        reference = body.get("reference") or body.get("ClientReference")
        status = (body.get("status") or body.get("Status") or "").lower()
        
        if not reference:
            return {"success": False, "message": "Missing reference"}
        
        withdrawal = await db.withdrawals.find_one({"reference": reference}, {"_id": 0})
        if not withdrawal:
            return {"success": False, "message": "Withdrawal not found"}
        
        if status in ["success", "successful", "completed"]:
            await db.withdrawals.update_one(
                {"id": withdrawal["id"]},
                {"$set": {
                    "status": "success",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Record transaction
            await db.transactions.insert_one({
                "id": str(uuid.uuid4()),
                "type": "withdrawal",
                "client_id": withdrawal["client_id"],
                "amount": -withdrawal["amount"],
                "description": f"Cashback withdrawal to {withdrawal['destination_phone']}",
                "payment_reference": withdrawal["reference"],
                "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            # Send SMS
            client = await db.clients.find_one({"id": withdrawal["client_id"]}, {"_id": 0})
            if client:
                try:
                    sms = get_sms()
                    await sms.send_sms(
                        client["phone"],
                        f"SDM Rewards: Your withdrawal of GHS {withdrawal['amount']:.2f} to {withdrawal['destination_phone']} was successful."
                    )
                except Exception as e:
                    logger.error(f"Withdrawal SMS error: {e}")
                    
        elif status in ["failed", "error", "declined"]:
            # Refund client
            await db.clients.update_one(
                {"id": withdrawal["client_id"]},
                {"$inc": {"cashback_balance": withdrawal.get("total_deduction", withdrawal["amount"])}}
            )
            
            await db.withdrawals.update_one(
                {"id": withdrawal["id"]},
                {"$set": {
                    "status": "failed",
                    "provider_message": body.get("message", "Withdrawal failed")
                }}
            )
            
            # Notify client
            client = await db.clients.find_one({"id": withdrawal["client_id"]}, {"_id": 0})
            if client:
                try:
                    sms = get_sms()
                    await sms.send_sms(
                        client["phone"],
                        f"SDM Rewards: Your withdrawal of GHS {withdrawal['amount']:.2f} could not be processed. Amount refunded."
                    )
                except Exception as e:
                    logger.error(f"Failed withdrawal SMS error: {e}")
        
        return {"success": True, "message": "Callback processed"}
        
    except Exception as e:
        logger.error(f"Withdrawal callback error: {e}")
        return {"success": False, "message": str(e)}
