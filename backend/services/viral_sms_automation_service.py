"""
SDM REWARDS - Viral SMS Automation Service
============================================
Automated SMS triggers for viral growth:
1. Welcome SMS after signup (with referral incentive)
2. Cashback received SMS (with share incentive)
3. Inactivity reminder SMS (automated worker)
"""

import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'test_database')


class ViralSMSAutomationService:
    """Service for automated viral growth SMS"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def _get_sms_service(self):
        """Get SMS service instance"""
        from services.hubtel_sms_service import get_sms_service
        return get_sms_service(self.db)
    
    # ============== SIGNUP WELCOME SMS ==============
    
    async def send_viral_welcome_sms(
        self,
        phone: str,
        client_name: str,
        referral_code: str
    ) -> Dict:
        """
        Send viral welcome SMS after client registration.
        Includes referral incentive to encourage sharing.
        """
        try:
            sms = await self._get_sms_service()
            
            # Viral welcome message with referral incentive
            message = (
                f"Welcome {client_name}! You joined SDM Rewards! "
                f"Share your code {referral_code} with friends - "
                f"you BOTH earn 3 GHS for each signup! Start earning cashback now!"
            )
            
            result = await sms.send_sms(phone, message, "viral_welcome")
            
            # Log the automation
            await self._log_automation(
                automation_type="viral_welcome",
                recipient_phone=phone,
                recipient_name=client_name,
                message=message,
                result=result
            )
            
            logger.info(f"Viral welcome SMS sent to {phone[:6]}...")
            return {"success": True, "type": "viral_welcome"}
            
        except Exception as e:
            logger.error(f"Viral welcome SMS error: {e}")
            return {"success": False, "error": str(e)}
    
    # ============== CASHBACK RECEIVED SMS ==============
    
    async def send_viral_cashback_sms(
        self,
        phone: str,
        client_name: str,
        cashback_amount: float,
        total_balance: float,
        merchant_name: str = None
    ) -> Dict:
        """
        Send viral SMS after cashback is credited.
        Encourages sharing with friends.
        """
        try:
            sms = await self._get_sms_service()
            
            # Viral cashback message
            merchant_text = f" at {merchant_name}" if merchant_name else ""
            message = (
                f"Great news {client_name}! You earned +{cashback_amount:.2f} GHS cashback{merchant_text}! "
                f"Balance: {total_balance:.2f} GHS. "
                f"Share SDM Rewards with friends - they get cashback too!"
            )
            
            result = await sms.send_sms(phone, message, "viral_cashback")
            
            # Log the automation
            await self._log_automation(
                automation_type="viral_cashback",
                recipient_phone=phone,
                recipient_name=client_name,
                message=message,
                result=result,
                metadata={"cashback": cashback_amount, "balance": total_balance}
            )
            
            logger.info(f"Viral cashback SMS sent to {phone[:6]}... (+{cashback_amount} GHS)")
            return {"success": True, "type": "viral_cashback"}
            
        except Exception as e:
            logger.error(f"Viral cashback SMS error: {e}")
            return {"success": False, "error": str(e)}
    
    # ============== INACTIVITY REMINDER SMS ==============
    
    async def send_inactivity_reminder_sms(
        self,
        phone: str,
        client_name: str,
        cashback_balance: float,
        days_inactive: int
    ) -> Dict:
        """
        Send reminder SMS to inactive users.
        """
        try:
            sms = await self._get_sms_service()
            
            # Inactivity reminder with cashback incentive
            if cashback_balance > 0:
                message = (
                    f"Hi {client_name}, we miss you! "
                    f"You have {cashback_balance:.2f} GHS cashback waiting. "
                    f"Come back and enjoy rewards at 100+ partner merchants! SDM Rewards"
                )
            else:
                message = (
                    f"Hi {client_name}, we miss you! "
                    f"Visit any SDM partner merchant and start earning cashback today. "
                    f"Refer friends = earn 3 GHS each! SDM Rewards"
                )
            
            result = await sms.send_sms(phone, message, "inactivity_reminder")
            
            # Log the automation
            await self._log_automation(
                automation_type="inactivity_reminder",
                recipient_phone=phone,
                recipient_name=client_name,
                message=message,
                result=result,
                metadata={"days_inactive": days_inactive, "cashback": cashback_balance}
            )
            
            logger.info(f"Inactivity reminder SMS sent to {phone[:6]}... ({days_inactive} days inactive)")
            return {"success": True, "type": "inactivity_reminder"}
            
        except Exception as e:
            logger.error(f"Inactivity reminder SMS error: {e}")
            return {"success": False, "error": str(e)}
    
    # ============== AUTOMATION LOGGING ==============
    
    async def _log_automation(
        self,
        automation_type: str,
        recipient_phone: str,
        recipient_name: str,
        message: str,
        result: Dict,
        metadata: Dict = None
    ):
        """Log automated SMS for analytics"""
        try:
            log_entry = {
                "type": automation_type,
                "phone": recipient_phone,
                "name": recipient_name,
                "message": message,
                "success": result.get("success", False),
                "hubtel_message_id": result.get("message_id"),
                "metadata": metadata or {},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await self.db.sms_automation_logs.insert_one(log_entry)
        except Exception as e:
            logger.error(f"Failed to log automation: {e}")


# ============== INACTIVITY WORKER ==============

async def process_inactive_users_batch(days_threshold: int = 7, batch_size: int = 50) -> Dict:
    """
    Process inactive users and send reminder SMS.
    Should be run by a scheduled worker.
    
    Args:
        days_threshold: Number of days of inactivity to trigger reminder
        batch_size: Max users to process per run
    
    Returns:
        Dict with sent/failed counts
    """
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        automation_service = ViralSMSAutomationService(db)
        
        # Calculate cutoff date
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days_threshold)).isoformat()
        
        # Find inactive clients who haven't been reminded recently
        reminder_cooldown = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        
        inactive_clients = await db.clients.find({
            "status": "active",
            "phone": {"$exists": True, "$ne": None},
            "$or": [
                {"last_activity": {"$lt": cutoff_date}},
                {"last_activity": {"$exists": False}}
            ],
            "$or": [
                {"last_inactivity_reminder": {"$lt": reminder_cooldown}},
                {"last_inactivity_reminder": {"$exists": False}}
            ]
        }, {
            "_id": 0, 
            "id": 1, 
            "phone": 1, 
            "full_name": 1, 
            "username": 1,
            "cashback_balance": 1,
            "last_activity": 1
        }).limit(batch_size).to_list(batch_size)
        
        results = {"sent": 0, "failed": 0, "total": len(inactive_clients)}
        
        for client_doc in inactive_clients:
            try:
                # Calculate days inactive
                last_activity = client_doc.get("last_activity")
                if last_activity:
                    try:
                        last_dt = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
                        days_inactive = (datetime.now(timezone.utc) - last_dt).days
                    except:
                        days_inactive = days_threshold
                else:
                    days_inactive = days_threshold
                
                # Send reminder
                result = await automation_service.send_inactivity_reminder_sms(
                    phone=client_doc["phone"],
                    client_name=client_doc.get("full_name") or client_doc.get("username") or "Friend",
                    cashback_balance=client_doc.get("cashback_balance", 0),
                    days_inactive=days_inactive
                )
                
                if result.get("success"):
                    results["sent"] += 1
                    # Update last reminder time
                    await db.clients.update_one(
                        {"id": client_doc["id"]},
                        {"$set": {"last_inactivity_reminder": datetime.now(timezone.utc).isoformat()}}
                    )
                else:
                    results["failed"] += 1
                    
            except Exception as e:
                logger.error(f"Error sending reminder to {client_doc.get('id')}: {e}")
                results["failed"] += 1
            
            # Small delay to avoid overwhelming SMS API
            await asyncio.sleep(0.5)
        
        client.close()
        logger.info(f"Inactivity reminder batch complete: {results}")
        return results
        
    except Exception as e:
        logger.error(f"Inactivity batch processing error: {e}")
        return {"sent": 0, "failed": 0, "error": str(e)}


async def start_inactivity_reminder_worker(
    days_threshold: int = 7,
    run_hour: int = 10,  # Run at 10:00 AM
    batch_size: int = 50
):
    """
    Background worker that runs once daily at specified hour.
    Sends inactivity reminders to users who haven't been active.
    
    Args:
        days_threshold: Days of inactivity before sending reminder
        run_hour: Hour of day to run (0-23, in UTC)
        batch_size: Max users to process per run
    """
    logger.info(f"Starting inactivity reminder worker (runs daily at {run_hour}:00 UTC, threshold: {days_threshold} days)")
    
    while True:
        try:
            now = datetime.now(timezone.utc)
            
            # Calculate next run time
            next_run = now.replace(hour=run_hour, minute=0, second=0, microsecond=0)
            if now.hour >= run_hour:
                next_run = next_run + timedelta(days=1)
            
            # Wait until next run time
            wait_seconds = (next_run - now).total_seconds()
            logger.info(f"Inactivity worker: Next run in {wait_seconds/3600:.1f} hours at {next_run.isoformat()}")
            
            await asyncio.sleep(wait_seconds)
            
            # Run the batch processing
            logger.info("Running inactivity reminder batch...")
            result = await process_inactive_users_batch(days_threshold, batch_size)
            logger.info(f"Inactivity batch result: {result}")
            
        except asyncio.CancelledError:
            logger.info("Inactivity reminder worker cancelled")
            break
        except Exception as e:
            logger.error(f"Inactivity worker error: {e}")
            # Wait 1 hour before retrying on error
            await asyncio.sleep(3600)


# ============== SINGLETON ==============

_viral_sms_service = None

def get_viral_sms_service(db: AsyncIOMotorDatabase) -> ViralSMSAutomationService:
    """Get or create viral SMS automation service instance"""
    global _viral_sms_service
    if _viral_sms_service is None or _viral_sms_service.db != db:
        _viral_sms_service = ViralSMSAutomationService(db)
    return _viral_sms_service
