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


@router.get("/poll-status/{payment_id}")
async def poll_payment_status(payment_id: str):
    """
    Lightweight endpoint for automatic status polling.
    Frontend should call this every 3-5 seconds after payment initiation.
    
    This checks database first (for webhook updates), then queries Hubtel if still pending.
    No authentication required as payment_id is unique.
    """
    db = get_db()
    
    logger.info(f"[POLL STATUS] Checking payment: {payment_id}")
    
    # STEP 1: Check our database directly first
    # Look in momo_payments (where merchant.py creates the record)
    payment = await db.momo_payments.find_one(
        {"$or": [
            {"id": payment_id},
            {"reference": payment_id},
            {"client_reference": payment_id}
        ]},
        {"_id": 0}
    )
    
    if payment:
        status = payment.get("status", "pending")
        logger.info(f"[POLL STATUS] Found in momo_payments: status={status}")
        
        # If payment is already completed, ensure complete_payment was called
        if status in ["completed", "success"]:
            # Check if transaction was recorded (indicates complete_payment ran)
            txn = await db.transactions.find_one(
                {"payment_reference": payment.get("reference")},
                {"_id": 0, "id": 1}
            )
            if not txn:
                # Transaction not recorded - run complete_payment now
                logger.info("[POLL STATUS] Payment completed but transaction missing - running complete_payment")
                try:
                    from .processing import complete_payment
                    await complete_payment(payment.get("id"))
                    logger.info(f"[POLL STATUS] complete_payment executed for {payment.get('id')}")
                except Exception as e:
                    logger.error(f"[POLL STATUS] Error in complete_payment: {e}")
            
            return {
                "success": True,
                "status": "completed",
                "should_poll": False,
                "completed": True,
                "failed": False,
                "message": "Payment successful! Cashback credited.",
                "source": "database"
            }
        
        if status == "failed":
            return {
                "success": True,
                "status": "failed",
                "should_poll": False,
                "completed": False,
                "failed": True,
                "message": "Payment failed. Please try again.",
                "source": "database"
            }
    
    # Also check hubtel_payments (where hubtel_momo_service creates records)
    hubtel_payment = await db.hubtel_payments.find_one(
        {"$or": [
            {"id": payment_id},
            {"client_reference": payment_id}
        ]},
        {"_id": 0}
    )
    
    if hubtel_payment:
        status = hubtel_payment.get("status", "pending")
        logger.info(f"[POLL STATUS] Found in hubtel_payments: status={status}")
        
        if status in ["completed", "success"]:
            # Find and complete the corresponding momo_payment
            client_ref = hubtel_payment.get("client_reference")
            if client_ref:
                momo = await db.momo_payments.find_one(
                    {"$or": [{"reference": client_ref}, {"client_reference": client_ref}]},
                    {"_id": 0, "id": 1}
                )
                if momo:
                    try:
                        from .processing import complete_payment
                        await complete_payment(momo.get("id"))
                        logger.info("[POLL STATUS] complete_payment executed via hubtel_payments")
                    except Exception as e:
                        logger.error(f"[POLL STATUS] Error in complete_payment: {e}")
            
            return {
                "success": True,
                "status": "completed",
                "should_poll": False,
                "completed": True,
                "failed": False,
                "message": "Payment successful! Cashback credited.",
                "source": "hubtel_payments"
            }
        
        if status == "failed":
            return {
                "success": True,
                "status": "failed",
                "should_poll": False,
                "completed": False,
                "failed": True,
                "message": "Payment failed. Please try again.",
                "source": "hubtel_payments"
            }
    
    # STEP 2: If still pending, try Hubtel API (but it often returns 403)
    from services.payment_reconciliation_service import get_reconciliation_service
    reconciliation = get_reconciliation_service(db)
    
    result = await reconciliation.check_single_payment(payment_id=payment_id)
    
    status = result.get("status", "unknown")
    logger.info(f"[POLL STATUS] Reconciliation result: status={status}, source={result.get('source')}")
    
    # If reconciliation found it completed, run complete_payment
    if status == "completed":
        if payment:
            try:
                from .processing import complete_payment
                await complete_payment(payment.get("id"))
                logger.info("[POLL STATUS] complete_payment executed after reconciliation")
            except Exception as e:
                logger.error(f"[POLL STATUS] Error in complete_payment: {e}")
    
    # Determine if frontend should continue polling
    should_poll = status in ["pending", "processing", "prompt_sent", "unknown"]
    
    return {
        "success": result.get("success", False),
        "status": status,
        "should_poll": should_poll,
        "completed": status == "completed",
        "failed": status == "failed",
        "message": _get_status_message(status),
        "source": result.get("source", "unknown")
    }


def _get_status_message(status: str) -> str:
    """Get user-friendly message for status"""
    messages = {
        "completed": "Payment successful! Cashback credited.",
        "success": "Payment successful! Cashback credited.",
        "failed": "Payment failed. Please try again.",
        "pending": "Waiting for payment approval...",
        "processing": "Processing payment...",
        "prompt_sent": "Please approve on your phone.",
        "not_found": "Payment not found.",
        "unknown": "Checking payment status..."
    }
    return messages.get(status, f"Status: {status}")


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
    """
    Hubtel specific payment callback for Direct MoMo Prompt.
    This is the PRIMARY mechanism for payment confirmation.
    Hubtel sends callbacks when:
    - Payment is approved by customer
    - Payment fails or is declined
    - Payment times out
    """
    db = get_db()
    
    try:
        body = await request.json()
        logger.info(f"🔔 [HUBTEL CALLBACK] Received: {body}")
        
        # Hubtel format - can be nested in "Data" or flat
        data = body.get("Data", body)
        client_reference = data.get("ClientReference") or body.get("ClientReference")
        status = (data.get("Status") or body.get("Status") or "").lower()
        transaction_id = data.get("TransactionId") or body.get("TransactionId")
        amount = data.get("Amount") or body.get("Amount")
        
        if not client_reference:
            logger.warning("🔔 [HUBTEL CALLBACK] Missing ClientReference")
            return {"ResponseCode": "0001", "Message": "Missing ClientReference"}
        
        logger.info(f"🔔 [HUBTEL CALLBACK] Processing - ref: {client_reference}, status: {status}, amount: {amount}")
        
        # Find payment in momo_payments (primary collection)
        payment = await db.momo_payments.find_one(
            {"$or": [
                {"reference": client_reference}, 
                {"client_reference": client_reference}
            ]},
            {"_id": 0}
        )
        
        if not payment:
            # Try hubtel_payments as fallback
            hubtel_payment = await db.hubtel_payments.find_one(
                {"client_reference": client_reference},
                {"_id": 0}
            )
            if hubtel_payment:
                logger.info("🔔 [HUBTEL CALLBACK] Found in hubtel_payments, looking for momo_payment")
                # The hubtel_payment exists but we need the momo_payment to complete
                # Update hubtel_payments status first
                await db.hubtel_payments.update_one(
                    {"client_reference": client_reference},
                    {"$set": {
                        "status": "completed" if status in ["success", "successful", "completed", "paid"] else "failed",
                        "hubtel_transaction_id": transaction_id,
                        "callback_received": True,
                        "callback_data": body,
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
            
            logger.warning(f"🔔 [HUBTEL CALLBACK] Payment not found in momo_payments for ref: {client_reference}")
            return {"ResponseCode": "0001", "Message": "Payment not found"}
        
        payment_id = payment.get("id")
        logger.info(f"🔔 [HUBTEL CALLBACK] Found payment: {payment_id}")
        
        # Update hubtel_payments collection
        await db.hubtel_payments.update_one(
            {"client_reference": client_reference},
            {"$set": {
                "status": "completed" if status in ["success", "successful", "completed", "paid"] else status,
                "hubtel_transaction_id": transaction_id,
                "callback_received": True,
                "callback_data": body,
                "completed_at": datetime.now(timezone.utc).isoformat() if status in ["success", "successful", "completed", "paid"] else None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if status in ["success", "successful", "completed", "paid"]:
            logger.info("🔔 [HUBTEL CALLBACK] Payment SUCCESSFUL - calling complete_payment")
            
            # Call complete_payment to process the payment fully
            from .processing import complete_payment
            try:
                await complete_payment(payment_id)
                logger.info(f"✅ [HUBTEL CALLBACK] complete_payment executed for {payment_id}")
            except Exception as e:
                logger.error(f"❌ [HUBTEL CALLBACK] Error in complete_payment: {e}")
                # Even if complete_payment fails, update the status
                await db.momo_payments.update_one(
                    {"id": payment_id},
                    {"$set": {
                        "status": "success",
                        "hubtel_transaction_id": transaction_id,
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "callback_data": body
                    }}
                )
            
        elif status in ["failed", "error", "declined", "cancelled", "expired"]:
            logger.info("🔔 [HUBTEL CALLBACK] Payment FAILED - updating status")
            await db.momo_payments.update_one(
                {"id": payment_id},
                {"$set": {
                    "status": "failed",
                    "provider_reference": transaction_id,
                    "provider_message": data.get("Description") or data.get("Message") or "Payment failed",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "callback_data": body
                }}
            )
        else:
            # Processing/pending update
            await db.momo_payments.update_one(
                {"id": payment_id},
                {"$set": {
                    "status": status or "processing",
                    "provider_reference": transaction_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {"ResponseCode": "0000", "Message": "Success"}
        
    except Exception as e:
        logger.error(f"❌ [HUBTEL CALLBACK] Error: {e}")
        import traceback
        logger.error(f"❌ [HUBTEL CALLBACK] Traceback: {traceback.format_exc()}")
        return {"ResponseCode": "0001", "Message": str(e)}



# ========== ADMIN/DIAGNOSTIC ENDPOINTS ==========

@router.post("/admin/force-complete/{payment_ref}")
async def admin_force_complete_payment(payment_ref: str, admin_secret: str = None):
    """
    ADMIN ENDPOINT: Force complete a payment when Hubtel callback didn't arrive.
    
    This is a WORKAROUND for when:
    - Customer approved the payment on their phone
    - But Hubtel callback didn't reach our server
    - Or the callback was processed but something went wrong
    
    Requires admin_secret for basic security (should match env ADMIN_SECRET).
    
    Usage: POST /api/payments/admin/force-complete/{payment_reference}?admin_secret=YOUR_SECRET
    """
    import os
    
    db = get_db()
    expected_secret = os.environ.get("ADMIN_SECRET", "sdm-admin-2026")
    
    if admin_secret != expected_secret:
        logger.warning(f"[ADMIN] Force complete attempt with invalid secret for {payment_ref}")
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    
    logger.info(f"🔧 [ADMIN] Force completing payment: {payment_ref}")
    
    # Find payment in momo_payments
    payment = await db.momo_payments.find_one(
        {"$or": [
            {"id": payment_ref},
            {"reference": payment_ref},
            {"client_reference": payment_ref}
        ]},
        {"_id": 0}
    )
    
    if not payment:
        # Try hubtel_payments
        hubtel_payment = await db.hubtel_payments.find_one(
            {"$or": [
                {"id": payment_ref},
                {"client_reference": payment_ref}
            ]},
            {"_id": 0}
        )
        if hubtel_payment:
            # Find corresponding momo_payment
            client_ref = hubtel_payment.get("client_reference")
            payment = await db.momo_payments.find_one(
                {"$or": [{"reference": client_ref}, {"client_reference": client_ref}]},
                {"_id": 0}
            )
    
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment not found: {payment_ref}")
    
    payment_id = payment.get("id")
    current_status = payment.get("status")
    
    logger.info(f"🔧 [ADMIN] Found payment {payment_id} with status: {current_status}")
    
    # Check if already completed
    if current_status in ["success", "completed"]:
        # Check if transaction exists
        existing_txn = await db.transactions.find_one(
            {"payment_reference": payment.get("reference")},
            {"_id": 0, "id": 1}
        )
        if existing_txn:
            return {
                "success": True,
                "message": "Payment was already completed",
                "status": "completed",
                "transaction_id": existing_txn.get("id")
            }
    
    # Force complete the payment
    from .processing import complete_payment
    
    try:
        await complete_payment(payment_id)
        logger.info(f"✅ [ADMIN] Force completed payment {payment_id}")
        
        # Verify transaction was created
        txn = await db.transactions.find_one(
            {"payment_reference": payment.get("reference")},
            {"_id": 0, "id": 1}
        )
        
        return {
            "success": True,
            "message": "Payment force completed successfully",
            "status": "completed",
            "payment_id": payment_id,
            "transaction_id": txn.get("id") if txn else None
        }
        
    except Exception as e:
        logger.error(f"❌ [ADMIN] Error force completing: {e}")
        raise HTTPException(status_code=500, detail=f"Error completing payment: {str(e)}")


@router.get("/admin/pending-payments")
async def admin_list_pending_payments(limit: int = 20, admin_secret: str = None):
    """
    ADMIN ENDPOINT: List pending payments that haven't been confirmed.
    Useful for identifying payments that need manual intervention.
    """
    import os
    
    db = get_db()
    expected_secret = os.environ.get("ADMIN_SECRET", "sdm-admin-2026")
    
    if admin_secret != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    
    # Find pending payments
    pending_payments = []
    
    cursor = db.momo_payments.find(
        {"status": {"$in": ["pending", "processing", "prompt_sent"]}},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    
    async for payment in cursor:
        pending_payments.append({
            "id": payment.get("id"),
            "reference": payment.get("reference"),
            "amount": payment.get("amount"),
            "status": payment.get("status"),
            "created_at": payment.get("created_at"),
            "type": payment.get("type"),
            "client_id": payment.get("client_id")
        })
    
    return {
        "success": True,
        "count": len(pending_payments),
        "payments": pending_payments
    }


@router.get("/debug/callback-test")
async def debug_callback_test():
    """
    Debug endpoint to test if callbacks can reach this server.
    Call this from external services to verify connectivity.
    """
    return {
        "success": True,
        "message": "Callback endpoint is reachable",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "endpoints": {
            "hubtel_callback": "/api/payments/hubtel/callback",
            "generic_callback": "/api/payments/callback"
        }
    }
