"""
SDM REWARDS - Payment Callbacks & Status Routes
===============================================
Handles payment status checks and Hubtel callbacks
"""

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from datetime import datetime, timezone, timedelta
import logging
import uuid

from .shared import get_db, logger

router = APIRouter()


# ========== BACKGROUND PROCESSING FUNCTIONS ==========

async def process_callback_async(callback_id: str, body: dict):
    """
    Background task to process callback after immediate response.
    This runs AFTER the HTTP 200 is returned to Hubtel.
    """
    db = get_db()
    
    try:
        logger.info(f"🔄 [ASYNC PROCESS] Starting for callback: {callback_id}")
        
        # Parse callback data
        data = body.get("Data", body)
        client_reference = data.get("ClientReference") or body.get("ClientReference")
        transaction_id = data.get("TransactionId") or body.get("TransactionId")
        amount = data.get("Amount") or body.get("Amount")
        
        # CRITICAL FIX: Hubtel uses ResponseCode to indicate success, not a Status field
        # ResponseCode "0000" = Success, anything else = failure
        response_code = body.get("ResponseCode", "")
        message = body.get("Message", "").lower()
        
        # Determine status from ResponseCode or Message
        if response_code == "0000" or message == "success":
            status = "success"
        elif response_code in ["0001", "2001"] or "pending" in message:
            status = "pending"
        elif "fail" in message or "decline" in message or "reject" in message:
            status = "failed"
        else:
            # Fallback: check Data.Status if exists
            status = (data.get("Status") or body.get("Status") or message or "unknown").lower()
        
        logger.info(f"🔄 [ASYNC PROCESS] Parsed - ResponseCode={response_code}, Message={message}, Determined status={status}")
        
        if not client_reference:
            logger.warning(f"🔄 [ASYNC PROCESS] No ClientReference in callback {callback_id}")
            await db.callback_logs.update_one(
                {"id": callback_id},
                {"$set": {"processed": True, "error": "Missing ClientReference"}}
            )
            return
        
        logger.info(f"🔄 [ASYNC PROCESS] Processing ref={client_reference}, status={status}, amount={amount}")
        
        # Search for payment with multiple patterns
        search_patterns = [
            {"reference": client_reference},
            {"client_reference": client_reference},
        ]
        
        if client_reference.startswith("SDM-"):
            short_ref = client_reference.split("-")[-1]
            search_patterns.append({"reference": {"$regex": short_ref, "$options": "i"}})
        
        # Find payment
        payment = None
        for pattern in search_patterns:
            payment = await db.momo_payments.find_one(pattern, {"_id": 0})
            if payment:
                logger.info(f"🔄 [ASYNC PROCESS] Found payment with pattern: {pattern}")
                break
        
        if not payment:
            # Try hubtel_payments and then find recent pending
            hubtel_payment = await db.hubtel_payments.find_one(
                {"client_reference": client_reference},
                {"_id": 0}
            )
            
            if hubtel_payment:
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
                
                # Try to find recent pending payment by amount
                if amount:
                    recent_pending = await db.momo_payments.find_one(
                        {
                            "status": {"$in": ["pending", "processing", "prompt_sent"]},
                            "amount": float(amount),
                            "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()}
                        },
                        {"_id": 0},
                        sort=[("created_at", -1)]
                    )
                    if recent_pending:
                        payment = recent_pending
                        logger.info(f"🔄 [ASYNC PROCESS] Found recent pending: {payment.get('id')}")
            
            if not payment:
                logger.warning(f"🔄 [ASYNC PROCESS] Payment not found for ref: {client_reference}")
                await db.callback_logs.update_one(
                    {"id": callback_id},
                    {"$set": {
                        "processed": True,
                        "error": f"Payment not found: {client_reference}",
                        "client_reference": client_reference,
                        "status": status
                    }}
                )
                return
        
        payment_id = payment.get("id")
        logger.info(f"🔄 [ASYNC PROCESS] Processing payment: {payment_id}")
        
        # Update callback log
        await db.callback_logs.update_one(
            {"id": callback_id},
            {"$set": {
                "payment_id": payment_id,
                "client_reference": client_reference,
                "status": status,
                "processed": True
            }}
        )
        
        # Update hubtel_payments
        await db.hubtel_payments.update_one(
            {"client_reference": payment.get("reference") or payment.get("client_reference") or client_reference},
            {"$set": {
                "status": "completed" if status in ["success", "successful", "completed", "paid"] else status,
                "hubtel_transaction_id": transaction_id,
                "callback_received": True,
                "callback_data": body,
                "completed_at": datetime.now(timezone.utc).isoformat() if status in ["success", "successful", "completed", "paid"] else None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        # Process based on status
        if status in ["success", "successful", "completed", "paid"]:
            logger.info(f"🔄 [ASYNC PROCESS] Payment SUCCESSFUL - completing payment {payment_id}")
            
            from .processing import complete_payment
            try:
                await complete_payment(payment_id)
                logger.info(f"✅ [ASYNC PROCESS] complete_payment executed for {payment_id}")
            except Exception as e:
                logger.error(f"❌ [ASYNC PROCESS] Error in complete_payment: {e}")
                # Still update status even if complete_payment fails
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
            logger.info(f"🔄 [ASYNC PROCESS] Payment FAILED: {payment_id}")
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
            await db.momo_payments.update_one(
                {"id": payment_id},
                {"$set": {
                    "status": status or "processing",
                    "provider_reference": transaction_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        logger.info(f"✅ [ASYNC PROCESS] Completed processing callback {callback_id}")
        
    except Exception as e:
        logger.error(f"❌ [ASYNC PROCESS] Error processing callback {callback_id}: {e}")
        import traceback
        logger.error(f"❌ [ASYNC PROCESS] Traceback: {traceback.format_exc()}")
        
        # Update callback log with error
        try:
            await db.callback_logs.update_one(
                {"id": callback_id},
                {"$set": {"processed": True, "error": str(e)}}
            )
        except Exception:
            pass


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
async def hubtel_payment_callback(request: Request, background_tasks: BackgroundTasks):
    """
    Hubtel specific payment callback for Direct MoMo Prompt.
    
    OPTIMIZED FOR SPEED:
    - Returns HTTP 200 immediately (< 500ms)
    - All heavy processing done in background task
    
    This is the PRIMARY mechanism for payment confirmation.
    """
    db = get_db()
    start_time = datetime.now(timezone.utc)
    
    try:
        body = await request.json()
        
        # Generate callback ID
        callback_id = str(uuid.uuid4())
        
        # MINIMAL SYNC WORK: Just log the callback and return
        callback_log = {
            "id": callback_id,
            "received_at": start_time.isoformat(),
            "raw_body": body,
            "source_ip": request.client.host if request.client else "unknown",
            "processed": False,
            "error": None
        }
        
        # Insert callback log (fast operation)
        await db.callback_logs.insert_one(callback_log)
        
        # Log receipt
        data = body.get("Data", body)
        client_ref = data.get("ClientReference") or body.get("ClientReference") or "unknown"
        status = data.get("Status") or body.get("Status") or "unknown"
        
        logger.info(f"🔔 [CALLBACK] Received: ref={client_ref}, status={status}, id={callback_id}")
        
        # SCHEDULE ASYNC PROCESSING
        background_tasks.add_task(process_callback_async, callback_id, body)
        
        # Calculate response time
        response_time = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.info(f"🔔 [CALLBACK] Responding in {response_time:.3f}s - processing in background")
        
        # RETURN IMMEDIATELY
        return {"ResponseCode": "0000", "Message": "Callback received"}
        
    except Exception as e:
        logger.error(f"❌ [CALLBACK] Error: {e}")
        # Still return success to prevent Hubtel from retrying
        return {"ResponseCode": "0000", "Message": "Callback received"}


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


@router.get("/debug/connection-status")
async def debug_connection_status():
    """
    Debug endpoint to check connection method status.
    Shows which method (proxy vs direct) is currently working.
    """
    from services.hubtel_momo_service import _last_working_method, FIXIE_PROXY_URL
    
    return {
        "success": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "connection_status": {
            "last_working_method": _last_working_method.get("method", "unknown"),
            "last_success_time": _last_working_method.get("timestamp"),
            "recent_failures": _last_working_method.get("failures", 0),
            "proxy_configured": bool(FIXIE_PROXY_URL),
            "fallback_enabled": True
        },
        "strategy": "System alternates between proxy and direct connection. If one fails, it tries the other."
    }



@router.get("/admin/callback-logs")
async def admin_view_callback_logs(limit: int = 50, admin_secret: str = None):
    """
    ADMIN ENDPOINT: View all callback logs received.
    This is CRITICAL for debugging callback delivery issues.
    Shows ALL callbacks that reached the server, even if payment wasn't found.
    """
    import os
    
    db = get_db()
    expected_secret = os.environ.get("ADMIN_SECRET", "sdm-admin-2026")
    
    if admin_secret != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    
    # Get recent callback logs
    logs = []
    cursor = db.callback_logs.find({}, {"_id": 0}).sort("received_at", -1).limit(limit)
    
    async for log in cursor:
        logs.append(log)
    
    return {
        "success": True,
        "count": len(logs),
        "logs": logs,
        "message": "If callbacks are missing here, Hubtel is NOT sending them"
    }


@router.get("/admin/payment-debug/{payment_ref}")
async def admin_debug_payment(payment_ref: str, admin_secret: str = None):
    """
    ADMIN ENDPOINT: Debug a specific payment - shows all related data across collections.
    Helps identify why a payment isn't completing.
    """
    import os
    
    db = get_db()
    expected_secret = os.environ.get("ADMIN_SECRET", "sdm-admin-2026")
    
    if admin_secret != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    
    result = {
        "payment_ref": payment_ref,
        "momo_payment": None,
        "hubtel_payment": None,
        "transaction": None,
        "callback_logs": [],
        "diagnosis": []
    }
    
    # Check momo_payments
    momo_payment = await db.momo_payments.find_one(
        {"$or": [
            {"id": payment_ref},
            {"reference": payment_ref},
            {"client_reference": payment_ref},
            {"reference": {"$regex": payment_ref, "$options": "i"}}
        ]},
        {"_id": 0}
    )
    result["momo_payment"] = momo_payment
    
    # Check hubtel_payments
    search_ref = payment_ref
    if momo_payment:
        search_ref = momo_payment.get("reference", payment_ref)
    
    hubtel_payment = await db.hubtel_payments.find_one(
        {"$or": [
            {"client_reference": search_ref},
            {"client_reference": payment_ref},
            {"id": payment_ref}
        ]},
        {"_id": 0}
    )
    result["hubtel_payment"] = hubtel_payment
    
    # Check transaction
    if momo_payment:
        transaction = await db.transactions.find_one(
            {"payment_reference": momo_payment.get("reference")},
            {"_id": 0}
        )
        result["transaction"] = transaction
    
    # Check callback logs for this reference
    callback_logs = []
    cursor = db.callback_logs.find(
        {"$or": [
            {"client_reference": payment_ref},
            {"client_reference": search_ref},
            {"raw_body.ClientReference": payment_ref},
            {"raw_body.ClientReference": search_ref},
            {"raw_body.Data.ClientReference": payment_ref},
            {"raw_body.Data.ClientReference": search_ref}
        ]},
        {"_id": 0}
    ).sort("received_at", -1).limit(10)
    
    async for log in cursor:
        callback_logs.append(log)
    result["callback_logs"] = callback_logs
    
    # Generate diagnosis
    if not momo_payment:
        result["diagnosis"].append("❌ No momo_payment record found - payment may not have been initiated")
    else:
        result["diagnosis"].append(f"✅ momo_payment found: status={momo_payment.get('status')}")
        
    if not hubtel_payment:
        result["diagnosis"].append("❌ No hubtel_payment record - Hubtel API may not have been called")
    else:
        result["diagnosis"].append(f"✅ hubtel_payment found: status={hubtel_payment.get('status')}, callback_received={hubtel_payment.get('callback_received')}")
        
    if not callback_logs:
        result["diagnosis"].append("❌ No callback logs found - Hubtel callback may not have reached the server")
    else:
        result["diagnosis"].append(f"✅ Found {len(callback_logs)} callback log(s)")
        
    if momo_payment and not result["transaction"]:
        if momo_payment.get("status") in ["success", "completed"]:
            result["diagnosis"].append("⚠️ Payment marked success but NO transaction record - complete_payment may have failed")
        else:
            result["diagnosis"].append(f"ℹ️ No transaction yet - payment status: {momo_payment.get('status')}")
    elif result["transaction"]:
        result["diagnosis"].append("✅ Transaction record exists - payment was fully processed")
    
    return result



@router.get("/admin/transactions")
async def admin_list_transactions(limit: int = 30, admin_secret: str = None):
    """
    ADMIN ENDPOINT: List all transactions in the system.
    Shows transactions across all merchants with merchant_id verification.
    """
    import os
    
    db = get_db()
    expected_secret = os.environ.get("ADMIN_SECRET", "sdm-admin-2026")
    
    if admin_secret != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    
    # Get recent transactions
    transactions = []
    cursor = db.transactions.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    
    async for txn in cursor:
        transactions.append({
            "id": txn.get("id"),
            "type": txn.get("type"),
            "amount": txn.get("amount"),
            "merchant_id": txn.get("merchant_id"),
            "client_id": txn.get("client_id"),
            "payment_method": txn.get("payment_method"),
            "status": txn.get("status"),
            "created_at": txn.get("created_at"),
            "description": txn.get("description")
        })
    
    # Count by type
    type_counts = {}
    for t in transactions:
        tx_type = t.get("type", "unknown")
        type_counts[tx_type] = type_counts.get(tx_type, 0) + 1
    
    # Count with merchant_id
    with_merchant = sum(1 for t in transactions if t.get("merchant_id"))
    
    return {
        "success": True,
        "count": len(transactions),
        "with_merchant_id": with_merchant,
        "type_breakdown": type_counts,
        "transactions": transactions
    }
