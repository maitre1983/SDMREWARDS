"""
SDM REWARDS - Payment Callbacks & Status Routes
===============================================
Handles payment status checks and Hubtel callbacks
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


@router.post("/check-status/{payment_id}")
async def check_and_update_payment_status(payment_id: str):
    """
    Check payment status and update from Hubtel if needed.
    Called when user clicks "I have paid - Check Status"
    
    This endpoint:
    1. Looks up the payment in our database
    2. If still pending/processing, queries Hubtel for current status
    3. Updates our database with the latest status
    4. Returns the current status to the user
    """
    db = get_db()
    
    logger.info(f"[CHECK STATUS] Looking up payment: {payment_id}")
    
    # First check momo_payments collection - search by id, reference, or client_reference
    payment = await db.momo_payments.find_one(
        {"$or": [
            {"id": payment_id},
            {"reference": payment_id},
            {"client_reference": payment_id}
        ]},
        {"_id": 0}
    )
    
    if payment:
        logger.info(f"[CHECK STATUS] Found in momo_payments: {payment.get('id')}")
    
    # If not found in momo_payments, check hubtel_payments by client_reference
    if not payment:
        payment = await db.hubtel_payments.find_one(
            {"$or": [
                {"id": payment_id},
                {"client_reference": payment_id},
                {"hubtel_transaction_id": payment_id}
            ]},
            {"_id": 0}
        )
        if payment:
            logger.info(f"[CHECK STATUS] Found in hubtel_payments: {payment.get('client_reference')}")
    
    # Also check transactions collection
    if not payment:
        payment = await db.transactions.find_one(
            {"$or": [
                {"id": payment_id},
                {"reference": payment_id},
                {"payment_reference": payment_id}
            ]},
            {"_id": 0}
        )
        if payment:
            logger.info(f"[CHECK STATUS] Found in transactions: {payment.get('id')}")
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found. Please wait a moment and try again.")
    
    current_status = payment.get("status", "unknown")
    
    # If payment is still pending/processing, try to get updated status from Hubtel
    if current_status in ["pending", "processing", "prompt_sent"]:
        # Try to get status from Hubtel using the transaction ID or client reference
        hubtel_tx_id = payment.get("hubtel_transaction_id") or payment.get("provider_reference")
        client_ref = payment.get("client_reference") or payment.get("reference")
        
        logger.info(f"[CHECK STATUS] Querying Hubtel - tx_id: {hubtel_tx_id}, client_ref: {client_ref}")
        
        if hubtel_tx_id or client_ref:
            from services.hubtel_momo_service import get_hubtel_momo_service
            
            hubtel_service = get_hubtel_momo_service(db)
            
            # Check Hubtel for transaction status using the correct API
            status_result = await hubtel_service.query_hubtel_transaction_status(
                client_reference=client_ref,
                transaction_id=hubtel_tx_id
            )
            
            logger.info(f"[CHECK STATUS] Hubtel response: {status_result}")
            
            if status_result.get("success"):
                new_status = status_result.get("status", current_status)
                
                # Update status if changed
                if new_status != current_status:
                    update_data = {
                        "status": new_status,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "hubtel_status_check": status_result
                    }
                    
                    if new_status == "completed":
                        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
                        
                        # Also trigger payment completion logic
                        from .processing import complete_payment
                        payment_id_to_complete = payment.get("id")
                        if payment_id_to_complete:
                            try:
                                await complete_payment(payment_id_to_complete)
                                logger.info(f"[CHECK STATUS] Payment completed: {payment_id_to_complete}")
                            except Exception as e:
                                logger.error(f"[CHECK STATUS] Error completing payment: {e}")
                    
                    # Update in the appropriate collection
                    await db.momo_payments.update_one(
                        {"$or": [{"id": payment_id}, {"reference": payment_id}]},
                        {"$set": update_data}
                    )
                    await db.hubtel_payments.update_one(
                        {"$or": [{"id": payment_id}, {"client_reference": payment_id}]},
                        {"$set": update_data}
                    )
                    
                    current_status = new_status
                    logger.info(f"[CHECK STATUS] Status updated to: {new_status}")
    
    # Prepare user-friendly message
    status_messages = {
        "completed": "Payment confirmed! Cashback has been credited to your account.",
        "success": "Payment confirmed! Cashback has been credited to your account.",
        "failed": "Payment failed or was declined. Please try again.",
        "pending": "Payment is pending. Please complete the MoMo prompt on your phone.",
        "processing": "Payment is being processed. Please wait a moment.",
        "prompt_sent": "MoMo prompt sent. Please approve the payment on your phone."
    }
    
    return {
        "success": True,
        "payment_id": payment_id,
        "status": current_status,
        "message": status_messages.get(current_status, f"Payment status: {current_status}"),
        "amount": payment.get("amount"),
        "merchant": payment.get("merchant_name") or payment.get("description", ""),
        "created_at": payment.get("created_at"),
        "completed_at": payment.get("completed_at")
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
    """Hubtel payment callback webhook"""
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
    """Hubtel specific payment callback for Direct MoMo Prompt"""
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
            logger.warning("Hubtel callback missing ClientReference")
            return {"ResponseCode": "0001", "Message": "Missing ClientReference"}
        
        logger.info(f"Processing callback for ClientReference: {client_reference}, Status: {status}")
        
        # Search in multiple collections
        payment = await db.momo_payments.find_one(
            {"$or": [{"reference": client_reference}, {"client_reference": client_reference}]},
            {"_id": 0}
        )
        
        if not payment:
            payment = await db.hubtel_payments.find_one(
                {"client_reference": client_reference},
                {"_id": 0}
            )
        
        if not payment:
            logger.warning(f"Payment not found for ClientReference: {client_reference}")
            return {"ResponseCode": "0001", "Message": "Payment not found"}
        
        payment_id = payment.get("id")
        logger.info(f"Found payment: {payment_id}")
        
        if status in ["success", "successful", "completed", "paid"]:
            from .processing import complete_payment
            await complete_payment(payment_id)
            logger.info(f"Payment {payment_id} COMPLETED via callback")
            
            # Also update hubtel_payments if exists
            await db.hubtel_payments.update_one(
                {"client_reference": client_reference},
                {"$set": {
                    "status": "completed",
                    "hubtel_transaction_id": transaction_id,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
        elif status in ["failed", "error", "declined", "cancelled"]:
            await db.momo_payments.update_one(
                {"id": payment_id},
                {"$set": {
                    "status": "failed",
                    "provider_reference": transaction_id,
                    "provider_message": data.get("Description", "Payment failed"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            await db.hubtel_payments.update_one(
                {"client_reference": client_reference},
                {"$set": {
                    "status": "failed",
                    "error": data.get("Description", "Payment failed"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"Payment {payment_id} marked as FAILED")
        
        return {"ResponseCode": "0000", "Message": "Success"}
        
    except Exception as e:
        logger.error(f"Hubtel callback error: {e}")
        return {"ResponseCode": "0001", "Message": str(e)}
