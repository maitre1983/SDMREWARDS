"""
SDM REWARDS - Payment Callbacks & Status Routes
===============================================
Handles payment status checks and Hubtel/BulkClix callbacks
"""

from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import logging

from .shared import get_db, logger

router = APIRouter()


@router.get("/status/{payment_id}")
async def get_payment_status(payment_id: str):
    """Check payment status"""
    db = get_db()
    payment = await db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {
        "success": True,
        "payment_id": payment["id"],
        "reference": payment["reference"],
        "type": payment["type"],
        "amount": payment["amount"],
        "status": payment["status"],
        "completed_at": payment.get("completed_at"),
        "test_mode": payment.get("test_mode", False)
    }


@router.get("/cash/status")
async def check_cash_payment_status(client_phone: str, merchant_id: str):
    """
    Check the status of a pending cash payment.
    Returns the latest cash payment between this client and merchant.
    """
    db = get_db()
    
    # Normalize phone number - try multiple formats
    phone_variants = [client_phone]
    if client_phone.startswith('+'):
        phone_variants.append(client_phone[1:])
        phone_variants.append(client_phone[4:])
    elif client_phone.startswith('233'):
        phone_variants.append('+' + client_phone)
        phone_variants.append(client_phone[3:])
    elif client_phone.startswith('0'):
        phone_variants.append('+233' + client_phone[1:])
        phone_variants.append('233' + client_phone[1:])
    else:
        phone_variants.append('+233' + client_phone)
        phone_variants.append('233' + client_phone)
        phone_variants.append('0' + client_phone)
    
    payment = await db.transactions.find_one(
        {
            "payment_method": "cash",
            "client_phone": {"$in": phone_variants},
            "merchant_id": merchant_id,
            "status": {"$in": ["pending_confirmation", "confirmed", "completed"]}
        },
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    if not payment:
        client = await db.clients.find_one(
            {"phone": {"$in": phone_variants}}, 
            {"_id": 0, "id": 1}
        )
        if client:
            payment = await db.transactions.find_one(
                {
                    "payment_method": "cash",
                    "client_id": client["id"],
                    "merchant_id": merchant_id,
                    "status": {"$in": ["pending_confirmation", "confirmed", "completed"]}
                },
                {"_id": 0},
                sort=[("created_at", -1)]
            )
    
    if not payment:
        raise HTTPException(status_code=404, detail="No cash payment found")
    
    status = payment.get("status", "pending_confirmation")
    if status == "pending_confirmation":
        status = "pending"
    
    return {
        "success": True,
        "payment_id": payment.get("id"),
        "status": status,
        "amount": payment.get("amount"),
        "cashback_amount": payment.get("cashback_amount", 0),
        "confirmed_at": payment.get("confirmed_at"),
        "created_at": payment.get("created_at")
    }


@router.post("/callback")
async def payment_callback(request: Request):
    """BulkClix/Hubtel payment callback webhook"""
    db = get_db()
    
    try:
        body = await request.json()
        logger.info(f"Payment callback received: {body}")
        
        # Handle different callback formats
        reference = body.get("ClientReference") or body.get("client_reference") or body.get("reference")
        status = body.get("Status") or body.get("status", "").lower()
        transaction_id = body.get("TransactionId") or body.get("transaction_id")
        
        if not reference:
            return {"success": False, "message": "Missing reference"}
        
        # Find payment
        payment = await db.momo_payments.find_one({"reference": reference}, {"_id": 0})
        if not payment:
            logger.warning(f"Payment not found for reference: {reference}")
            return {"success": False, "message": "Payment not found"}
        
        # Map status
        if status in ["success", "successful", "completed", "paid"]:
            from .processing import complete_payment
            await complete_payment(payment["id"])
            logger.info(f"Payment {payment['id']} completed via callback")
        elif status in ["failed", "error", "declined", "cancelled"]:
            await db.momo_payments.update_one(
                {"id": payment["id"]},
                {
                    "$set": {
                        "status": "failed",
                        "provider_message": body.get("message") or body.get("Message") or "Payment failed",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            logger.info(f"Payment {payment['id']} marked as failed")
        elif status in ["pending", "processing"]:
            await db.momo_payments.update_one(
                {"id": payment["id"]},
                {
                    "$set": {
                        "status": "processing",
                        "provider_reference": transaction_id,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        
        return {"success": True, "message": "Callback processed"}
        
    except Exception as e:
        logger.error(f"Payment callback error: {e}")
        return {"success": False, "message": str(e)}


@router.post("/hubtel/callback")
async def hubtel_payment_callback(request: Request):
    """Hubtel specific payment callback"""
    db = get_db()
    
    try:
        body = await request.json()
        logger.info(f"Hubtel callback received: {body}")
        
        # Hubtel format
        data = body.get("Data", body)
        client_reference = data.get("ClientReference") or body.get("ClientReference")
        status = (data.get("Status") or body.get("Status") or "").lower()
        transaction_id = data.get("TransactionId") or body.get("TransactionId")
        
        if not client_reference:
            return {"ResponseCode": "0001", "Message": "Missing ClientReference"}
        
        payment = await db.momo_payments.find_one({"reference": client_reference}, {"_id": 0})
        if not payment:
            return {"ResponseCode": "0001", "Message": "Payment not found"}
        
        if status in ["success", "successful", "completed", "paid"]:
            from .processing import complete_payment
            await complete_payment(payment["id"])
        elif status in ["failed", "error", "declined", "cancelled"]:
            await db.momo_payments.update_one(
                {"id": payment["id"]},
                {"$set": {
                    "status": "failed",
                    "provider_reference": transaction_id,
                    "provider_message": data.get("Description", "Payment failed"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {"ResponseCode": "0000", "Message": "Success"}
        
    except Exception as e:
        logger.error(f"Hubtel callback error: {e}")
        return {"ResponseCode": "0001", "Message": str(e)}
