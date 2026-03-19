"""
SDM REWARDS - Merchant Payment Routes
=====================================
Handles merchant payments (MoMo, cash, cashback)
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from .shared import (
    MerchantPaymentRequest, ClientCashPaymentRequest, get_db, 
    detect_network, is_test_mode, get_push_service, logger
)

# Import auth dependency
from routers.auth import get_current_client

router = APIRouter()


class CashbackPaymentRequest(BaseModel):
    client_phone: str
    merchant_qr_code: str
    amount: float
    payment_method: str  # "cashback" or "hybrid"
    cashback_to_use: float
    momo_amount: float = 0
    momo_phone: Optional[str] = None


@router.post("/merchant/initiate")
async def initiate_merchant_payment(request: MerchantPaymentRequest):
    """
    Initiate payment to merchant (for earning cashback)
    Client scans merchant QR and pays
    """
    db = get_db()
    
    if request.amount < 1:
        raise HTTPException(status_code=400, detail="Minimum payment is GHS 1")
    
    # Find client
    client = await db.clients.find_one({"phone": request.client_phone}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client.get("status") != "active":
        raise HTTPException(status_code=400, detail="Please purchase a membership card first")
    
    # Find merchant by QR code
    merchant = await db.merchants.find_one({"payment_qr_code": request.merchant_qr_code}, {"_id": 0})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    if merchant.get("status") != "active":
        raise HTTPException(status_code=400, detail="Merchant is not active")
    
    # Calculate expected cashback
    cashback_rate = merchant.get("cashback_rate", 5) / 100
    expected_cashback = round(request.amount * cashback_rate, 2)
    
    # Use specified network or detect from phone
    network = request.network.upper() if request.network else detect_network(request.client_phone)
    if not network:
        raise HTTPException(status_code=400, detail="Invalid phone number or network not specified")
    
    # Generate payment reference
    payment_ref = f"SDM-PAY-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Create payment record
    payment_record = {
        "id": str(uuid.uuid4()),
        "reference": payment_ref,
        "type": "merchant_payment",
        "phone": request.client_phone,
        "network": network,
        "amount": request.amount,
        "description": f"Payment at {merchant['business_name']}",
        "client_id": client["id"],
        "merchant_id": merchant["id"],
        "status": "pending",
        "metadata": {
            "merchant_id": merchant["id"],
            "merchant_name": merchant["business_name"],
            "cashback_rate": merchant.get("cashback_rate", 5),
            "expected_cashback": expected_cashback
        },
        "provider_reference": None,
        "test_mode": is_test_mode(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    await db.momo_payments.insert_one(payment_record)
    
    # Test mode response
    if is_test_mode():
        return {
            "success": True,
            "payment_id": payment_record["id"],
            "reference": payment_ref,
            "amount": request.amount,
            "merchant": merchant["business_name"],
            "expected_cashback": expected_cashback,
            "status": "pending",
            "test_mode": True,
            "message": f"Payment initiated. Use /api/payments/test/confirm/{payment_record['id']} to complete."
        }
    
    # Production: Call Hubtel MoMo Collection API
    from services.hubtel_momo_service import get_hubtel_momo_service
    
    hubtel_service = get_hubtel_momo_service(db)
    
    result = await hubtel_service.collect_momo(
        phone=request.client_phone,
        amount=request.amount,
        description=f"Payment to {merchant['business_name']}",
        client_reference=payment_ref
    )
    
    if result.get("success"):
        await db.momo_payments.update_one(
            {"id": payment_record["id"]},
            {
                "$set": {
                    "status": "processing",
                    "provider": "hubtel",
                    "provider_reference": result.get("transaction_id"),
                    "hubtel_transaction_id": result.get("transaction_id"),
                    "client_reference": payment_ref,
                    "provider_message": result.get("message"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "payment_id": payment_record["id"],
            "reference": payment_ref,
            "hubtel_transaction_id": result.get("transaction_id"),
            "amount": request.amount,
            "merchant": merchant["business_name"],
            "expected_cashback": expected_cashback,
            "status": "processing",
            "test_mode": result.get("test_mode", False),
            "message": "Please approve the MoMo prompt on your phone"
        }
    else:
        await db.momo_payments.update_one(
            {"id": payment_record["id"]},
            {"$set": {"status": "failed", "provider_message": result.get("error", "Payment initiation failed")}}
        )
        raise HTTPException(status_code=400, detail=result.get("error", "Payment initiation failed"))


@router.post("/merchant/cash")
async def initiate_cash_payment(request: ClientCashPaymentRequest):
    """
    Client-initiated cash payment to merchant
    - Creates pending transaction requiring merchant confirmation
    - Max 3 pending confirmations per client
    - Expires after 72 hours if not confirmed
    - Cashback only credited after merchant confirms
    """
    db = get_db()
    
    if request.amount < 1:
        raise HTTPException(status_code=400, detail="Minimum payment is GHS 1")
    
    # Find client
    client = await db.clients.find_one({"phone": request.client_phone}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client.get("status") != "active":
        raise HTTPException(status_code=400, detail="Please purchase a membership card first")
    
    # Check max pending confirmations per client (limit: 3)
    pending_count = await db.transactions.count_documents({
        "client_id": client["id"],
        "payment_method": "cash",
        "status": "pending_confirmation"
    })
    
    if pending_count >= 3:
        raise HTTPException(
            status_code=400, 
            detail="You have 3 pending cash payments awaiting confirmation. Please wait for merchant to confirm previous payments."
        )
    
    # Find merchant by QR code
    merchant = await db.merchants.find_one({"payment_qr_code": request.merchant_qr_code}, {"_id": 0})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    if merchant.get("status") != "active":
        raise HTTPException(status_code=400, detail="Merchant is not active")
    
    # Check merchant's debit account
    debit_account = merchant.get("debit_account", {})
    current_balance = debit_account.get("balance", 0)
    debit_limit = debit_account.get("limit", 0)
    is_blocked = debit_account.get("is_blocked", False)
    
    # Calculate cashback (using 95% of rate like MoMo payments)
    cashback_rate = merchant.get("cashback_rate", 5) / 100
    cashback_amount = round(request.amount * cashback_rate * 0.95, 2)
    sdm_commission = round(request.amount * cashback_rate * 0.05, 2)
    
    if debit_limit <= 0:
        raise HTTPException(
            status_code=400, 
            detail="Cash payments not available. This merchant has no debit limit configured. Please pay with MoMo."
        )
    
    if is_blocked:
        raise HTTPException(
            status_code=400, 
            detail="Cash payments blocked. Merchant's debit limit has been reached. Please pay with MoMo."
        )
    
    new_balance = current_balance - cashback_amount
    
    if abs(new_balance) > debit_limit:
        raise HTTPException(
            status_code=400, 
            detail="Cash payment would exceed merchant's debit limit. Please pay with MoMo or use a smaller amount."
        )
    
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=72)
    transaction_id = str(uuid.uuid4())
    payment_ref = f"SDM-CASH-{now.strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Create main transaction with PENDING_CONFIRMATION status
    transaction = {
        "id": transaction_id,
        "reference": payment_ref,
        "type": "payment",
        "payment_method": "cash",
        "client_id": client["id"],
        "client_phone": client.get("phone"),
        "client_name": client.get("full_name"),
        "merchant_id": merchant["id"],
        "merchant_name": merchant.get("business_name"),
        "amount": request.amount,
        "cashback_rate": merchant.get("cashback_rate", 5),
        "cashback_amount": cashback_amount,
        "sdm_commission": sdm_commission,
        "status": "pending_confirmation",
        "description": f"Cash payment at {merchant['business_name']}",
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat()
    }
    await db.transactions.insert_one(transaction)
    
    # Send push notification to merchant
    try:
        from push_notifications import PushNotificationPayload
        push_service = get_push_service()
        
        notification_payload = PushNotificationPayload(
            title="💵 Pending Cash Payment",
            message=f"{client.get('full_name', 'A customer')} paid GHS {request.amount:.2f} in cash. Please confirm receipt.",
            url="/merchant",
            data={
                "type": "cash_payment_pending",
                "transaction_id": transaction_id,
                "amount": request.amount,
                "client_name": client.get("full_name", "Customer"),
                "cashback_amount": cashback_amount
            }
        )
        
        push_result = await push_service.send_to_user(merchant["id"], notification_payload)
        logger.info(f"Push notification to merchant {merchant['id']}: {push_result}")
    except Exception as e:
        logger.error(f"Failed to send push notification to merchant: {e}")
    
    logger.info(f"Cash payment pending confirmation: {payment_ref}, amount={request.amount}, cashback={cashback_amount}")
    
    return {
        "success": True,
        "payment_id": transaction_id,
        "reference": payment_ref,
        "amount": request.amount,
        "merchant": merchant["business_name"],
        "cashback_amount": cashback_amount,
        "status": "pending_confirmation",
        "payment_method": "cash",
        "expires_at": expires_at.isoformat(),
        "message": "Payment recorded! Awaiting merchant confirmation. Cashback will be credited once confirmed."
    }


@router.post("/merchant/cashback")
async def process_cashback_merchant_payment(
    request: CashbackPaymentRequest,
    current_user: dict = Depends(get_current_client)
):
    """
    Process payment to merchant using cashback (full or hybrid).
    
    Payment methods:
    - cashback: 100% payment from client's cashback balance
    - hybrid: Part cashback + part MoMo
    """
    db = get_db()
    
    if request.amount < 1:
        raise HTTPException(status_code=400, detail="Minimum payment is GHS 1")
    
    # Find client by their authenticated ID
    client = await db.clients.find_one({"id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client.get("status") != "active":
        raise HTTPException(status_code=400, detail="Please purchase a membership card first")
    
    current_cashback = client.get("cashback_balance", 0)
    
    # Validate cashback usage
    if request.cashback_to_use > current_cashback:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient cashback balance. Available: GHS {current_cashback:.2f}"
        )
    
    if request.cashback_to_use + request.momo_amount < request.amount:
        raise HTTPException(
            status_code=400,
            detail="Payment amounts don't add up to the total"
        )
    
    # Find merchant by QR code
    merchant = await db.merchants.find_one({"payment_qr_code": request.merchant_qr_code}, {"_id": 0})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    if merchant.get("status") != "active":
        raise HTTPException(status_code=400, detail="Merchant is not active")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    payment_ref = f"SDM-CB-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Calculate cashback earned (only on MoMo portion)
    cashback_rate = merchant.get("cashback_rate", 5) / 100
    momo_portion = request.momo_amount if request.payment_method == "hybrid" else 0
    cashback_earned = round(momo_portion * cashback_rate * 0.95, 2)
    sdm_commission = round(momo_portion * cashback_rate * 0.05, 2) if momo_portion > 0 else 0
    
    # Deduct cashback from client's balance
    new_cashback_balance = round(current_cashback - request.cashback_to_use + cashback_earned, 2)
    await db.clients.update_one(
        {"id": client["id"]},
        {"$set": {"cashback_balance": new_cashback_balance, "updated_at": now}}
    )
    
    # Create main transaction
    transaction = {
        "id": transaction_id,
        "reference": payment_ref,
        "type": "payment",
        "payment_method": request.payment_method,
        "client_id": client["id"],
        "client_phone": client.get("phone"),
        "client_name": client.get("full_name"),
        "merchant_id": merchant["id"],
        "merchant_name": merchant.get("business_name"),
        "amount": request.amount,
        "cashback_used": request.cashback_to_use,
        "momo_amount": request.momo_amount,
        "cashback_rate": merchant.get("cashback_rate", 5),
        "cashback_amount": cashback_earned,
        "sdm_commission": sdm_commission,
        "status": "completed",
        "description": f"{'Cashback' if request.payment_method == 'cashback' else 'Hybrid'} payment at {merchant['business_name']}",
        "created_at": now
    }
    
    await db.transactions.insert_one(transaction)
    
    # Update merchant stats
    await db.merchants.update_one(
        {"id": merchant["id"]},
        {
            "$inc": {"stats.total_payments": 1, "stats.total_volume": request.amount},
            "$set": {"updated_at": now}
        }
    )
    
    # Record client wallet transaction for cashback spent
    if request.cashback_to_use > 0:
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "client_id": client["id"],
            "type": "cashback_payment",
            "amount": -request.cashback_to_use,
            "balance_after": new_cashback_balance - cashback_earned,
            "description": f"Cashback used for payment at {merchant['business_name']}",
            "reference": payment_ref,
            "created_at": now
        })
    
    # If earned new cashback, record it
    if cashback_earned > 0:
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "client_id": client["id"],
            "type": "cashback_earned",
            "amount": cashback_earned,
            "balance_after": new_cashback_balance,
            "description": f"Cashback from payment at {merchant['business_name']}",
            "reference": payment_ref,
            "created_at": now
        })
    
    logger.info(f"Cashback payment completed: {payment_ref}, method={request.payment_method}, amount={request.amount}, cashback_used={request.cashback_to_use}, cashback_earned={cashback_earned}")
    
    return {
        "success": True,
        "payment_id": transaction_id,
        "reference": payment_ref,
        "amount": request.amount,
        "merchant": merchant["business_name"],
        "payment_method": request.payment_method,
        "cashback_used": request.cashback_to_use,
        "momo_paid": request.momo_amount,
        "cashback_earned": cashback_earned,
        "new_balance": new_cashback_balance,
        "status": "completed",
        "message": f"Payment successful! {'Cashback used: GHS ' + str(request.cashback_to_use) if request.cashback_to_use > 0 else ''}{' + MoMo: GHS ' + str(request.momo_amount) if request.momo_amount > 0 else ''}."
    }
