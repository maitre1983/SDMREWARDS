"""
SDM REWARDS - Payment Reconciliation Service
=============================================
Automatic background service to reconcile pending MoMo payments.
Queries Hubtel directly for payment status and updates accordingly.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class PaymentReconciliationService:
    """
    Service to automatically reconcile pending payments with Hubtel.
    Runs in background to ensure payments are confirmed even if callbacks fail.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self._running = False
        self._task = None
    
    async def reconcile_pending_payments(self) -> Dict:
        """
        Check all pending payments and update their status from Hubtel.
        Called periodically by background task or manually.
        """
        if self.db is None:
            return {"success": False, "error": "Database not available"}
        
        results = {
            "checked": 0,
            "completed": 0,
            "failed": 0,
            "still_pending": 0,
            "errors": []
        }
        
        # Find payments that are pending/processing and older than 30 seconds
        cutoff_time = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
        
        # Check momo_payments collection
        pending_momo = await self.db.momo_payments.find({
            "status": {"$in": ["pending", "processing", "prompt_sent"]},
            "created_at": {"$lt": cutoff_time}
        }, {"_id": 0}).to_list(50)
        
        # Check hubtel_payments collection
        pending_hubtel = await self.db.hubtel_payments.find({
            "status": {"$in": ["pending", "processing", "prompt_sent"]},
            "created_at": {"$lt": cutoff_time}
        }, {"_id": 0}).to_list(50)
        
        all_pending = pending_momo + pending_hubtel
        
        logger.info(f"[RECONCILE] Found {len(all_pending)} pending payments to check")
        
        from services.hubtel_momo_service import get_hubtel_momo_service
        hubtel_service = get_hubtel_momo_service(self.db)
        
        for payment in all_pending:
            results["checked"] += 1
            
            try:
                client_ref = payment.get("client_reference") or payment.get("reference")
                tx_id = payment.get("hubtel_transaction_id") or payment.get("provider_reference")
                payment_id = payment.get("id")
                
                if not client_ref and not tx_id:
                    logger.warning(f"[RECONCILE] Payment {payment_id} has no reference, skipping")
                    continue
                
                # Query Hubtel for actual status
                status_result = await hubtel_service.query_hubtel_transaction_status(
                    client_reference=client_ref,
                    transaction_id=tx_id
                )
                
                if status_result.get("success"):
                    new_status = status_result.get("status")
                    
                    if new_status == "completed":
                        # Complete the payment
                        await self._complete_payment(payment)
                        results["completed"] += 1
                        logger.info(f"[RECONCILE] Payment {payment_id} COMPLETED")
                        
                    elif new_status == "failed":
                        # Mark as failed
                        await self._fail_payment(payment, status_result.get("data", {}))
                        results["failed"] += 1
                        logger.info(f"[RECONCILE] Payment {payment_id} FAILED")
                        
                    else:
                        results["still_pending"] += 1
                        logger.debug(f"[RECONCILE] Payment {payment_id} still {new_status}")
                else:
                    # Check if payment is too old (> 10 minutes) - likely failed
                    created_at = payment.get("created_at", "")
                    if created_at:
                        try:
                            created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                            age_minutes = (datetime.now(timezone.utc) - created_dt).total_seconds() / 60
                            
                            if age_minutes > 10:
                                # Payment is too old and status unknown - likely failed
                                await self._fail_payment(payment, {"reason": "Timeout - no confirmation received"})
                                results["failed"] += 1
                                logger.info(f"[RECONCILE] Payment {payment_id} timed out after {age_minutes:.1f} minutes")
                        except Exception as age_error:
                            logger.debug(f"[RECONCILE] Age check error: {age_error}")
                    
                    results["errors"].append(f"Payment {payment_id}: {status_result.get('error')}")
                    
            except Exception as e:
                results["errors"].append(f"Error processing payment: {str(e)}")
                logger.error(f"[RECONCILE] Error: {e}")
        
        return results
    
    async def _complete_payment(self, payment: Dict):
        """Complete a payment and credit cashback"""
        payment_id = payment.get("id")
        
        from routers.payments.processing import complete_payment
        
        try:
            await complete_payment(payment_id)
        except Exception as e:
            logger.error(f"[RECONCILE] Error completing payment {payment_id}: {e}")
            
            # Manual update as fallback
            update_data = {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "reconciled_at": datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.momo_payments.update_one(
                {"id": payment_id},
                {"$set": update_data}
            )
            await self.db.hubtel_payments.update_one(
                {"$or": [{"id": payment_id}, {"client_reference": payment.get("client_reference")}]},
                {"$set": update_data}
            )
    
    async def _fail_payment(self, payment: Dict, data: Dict):
        """Mark a payment as failed"""
        payment_id = payment.get("id")
        client_ref = payment.get("client_reference") or payment.get("reference")
        
        update_data = {
            "status": "failed",
            "error": data.get("reason") or data.get("Message") or "Payment failed or timed out",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "reconciled_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.momo_payments.update_one(
            {"id": payment_id},
            {"$set": update_data}
        )
        await self.db.hubtel_payments.update_one(
            {"$or": [{"id": payment_id}, {"client_reference": client_ref}]},
            {"$set": update_data}
        )
    
    async def check_single_payment(self, payment_id: str = None, client_reference: str = None) -> Dict:
        """
        Check status of a single payment immediately.
        Used for real-time status updates.
        
        Priority:
        1. Check database (momo_payments, hubtel_payments) - most reliable as updated by webhooks
        2. Query Hubtel API - often fails with 403, but try anyway
        """
        if self.db is None:
            return {"success": False, "error": "Database not available", "status": "unknown"}
        
        logger.info(f"[RECONCILE SINGLE] Checking - payment_id: {payment_id}, client_ref: {client_reference}")
        
        # Find the payment in momo_payments
        payment = None
        
        if payment_id:
            payment = await self.db.momo_payments.find_one(
                {"$or": [
                    {"id": payment_id}, 
                    {"reference": payment_id},
                    {"client_reference": payment_id}
                ]},
                {"_id": 0}
            )
            
            # Also check hubtel_payments
            if not payment:
                payment = await self.db.hubtel_payments.find_one(
                    {"$or": [
                        {"id": payment_id}, 
                        {"client_reference": payment_id}
                    ]},
                    {"_id": 0}
                )
        
        if not payment and client_reference:
            payment = await self.db.momo_payments.find_one(
                {"$or": [
                    {"reference": client_reference}, 
                    {"client_reference": client_reference}
                ]},
                {"_id": 0}
            )
            if not payment:
                payment = await self.db.hubtel_payments.find_one(
                    {"client_reference": client_reference},
                    {"_id": 0}
                )
        
        if not payment:
            logger.warning("[RECONCILE SINGLE] Payment not found")
            return {"success": False, "error": "Payment not found", "status": "not_found"}
        
        current_status = payment.get("status", "unknown")
        logger.info(f"[RECONCILE SINGLE] Found payment - current status: {current_status}")
        
        # If already completed or failed, return immediately
        if current_status in ["completed", "success"]:
            return {
                "success": True,
                "status": "completed",
                "payment": payment,
                "source": "database"
            }
        
        if current_status == "failed":
            return {
                "success": True,
                "status": "failed",
                "payment": payment,
                "source": "database"
            }
        
        # Query Hubtel for live status
        from services.hubtel_momo_service import get_hubtel_momo_service
        hubtel_service = get_hubtel_momo_service(self.db)
        
        client_ref = payment.get("client_reference") or payment.get("reference")
        tx_id = payment.get("hubtel_transaction_id") or payment.get("provider_reference")
        
        status_result = await hubtel_service.query_hubtel_transaction_status(
            client_reference=client_ref,
            transaction_id=tx_id
        )
        
        logger.info(f"[RECONCILE SINGLE] Hubtel result: {status_result.get('status')}, source: {status_result.get('source')}")
        
        if status_result.get("success"):
            new_status = status_result.get("status")
            
            # Update if status changed
            if new_status and new_status != current_status:
                logger.info(f"[RECONCILE SINGLE] Status changed: {current_status} -> {new_status}")
                
                if new_status == "completed":
                    await self._complete_payment(payment)
                elif new_status == "failed":
                    await self._fail_payment(payment, status_result.get("data", {}))
                else:
                    # Just update status
                    update_data = {
                        "status": new_status,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                    await self.db.momo_payments.update_one(
                        {"id": payment.get("id")},
                        {"$set": update_data}
                    )
            
            return {
                "success": True,
                "status": new_status or current_status,
                "hubtel_response": status_result.get("data"),
                "source": status_result.get("source", "hubtel")
            }
        
        # Hubtel API failed (likely 403) - return current database status
        return {
            "success": False,
            "status": current_status,
            "error": status_result.get("error"),
            "source": "database_fallback"
        }


# Singleton instance
_reconciliation_service = None

def get_reconciliation_service(db) -> PaymentReconciliationService:
    global _reconciliation_service
    if _reconciliation_service is None:
        _reconciliation_service = PaymentReconciliationService(db)
    else:
        _reconciliation_service.db = db
    return _reconciliation_service
