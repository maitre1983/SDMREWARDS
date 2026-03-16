"""
SDM REWARDS - Scheduled SMS Processor
=====================================
Background task to process scheduled SMS at their scheduled time.
"""

import asyncio
import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'test_database')


async def process_scheduled_sms():
    """
    Process all scheduled SMS that are due.
    This function should be called periodically (e.g., every minute).
    """
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        now = datetime.now(timezone.utc)
        
        # Find all pending scheduled SMS that are due
        due_sms = await db.scheduled_sms.find({
            "status": "pending",
            "scheduled_at": {"$lte": now.isoformat()}
        }).to_list(50)
        
        if not due_sms:
            return {"processed": 0}
        
        logger.info(f"Processing {len(due_sms)} scheduled SMS")
        
        # Import SMS service
        from services.sms_service import get_sms
        sms_service = get_sms(db)
        
        processed = 0
        for scheduled in due_sms:
            try:
                # Mark as processing
                await db.scheduled_sms.update_one(
                    {"id": scheduled["id"]},
                    {"$set": {"status": "processing", "processed_at": now.isoformat()}}
                )
                
                # Send the SMS
                recipients = scheduled.get("recipients", [])
                if scheduled.get("type") == "personalized":
                    result = await sms_service.send_personalized_bulk_sms(
                        recipients, 
                        f"scheduled_{scheduled['id']}"
                    )
                else:
                    # For regular bulk SMS
                    phones = [r.get("phone") for r in recipients if r.get("phone")]
                    message = scheduled.get("message", "")
                    result = await sms_service.send_bulk_sms(phones, message, f"scheduled_{scheduled['id']}")
                
                # Update status
                final_status = "completed" if result.get("success") else "failed"
                await db.scheduled_sms.update_one(
                    {"id": scheduled["id"]},
                    {"$set": {
                        "status": final_status,
                        "result": {
                            "sent": result.get("sent", 0),
                            "failed": result.get("failed", 0),
                            "error": result.get("error")
                        },
                        "completed_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                logger.info(f"Scheduled SMS {scheduled['id']} completed: {final_status}")
                processed += 1
                
            except Exception as e:
                logger.error(f"Error processing scheduled SMS {scheduled['id']}: {e}")
                await db.scheduled_sms.update_one(
                    {"id": scheduled["id"]},
                    {"$set": {
                        "status": "failed",
                        "error": str(e),
                        "completed_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        client.close()
        return {"processed": processed}
        
    except Exception as e:
        logger.error(f"Error in scheduled SMS processor: {e}")
        return {"processed": 0, "error": str(e)}


async def start_scheduled_sms_worker():
    """
    Start a background worker that processes scheduled SMS every minute.
    """
    logger.info("Starting scheduled SMS worker...")
    while True:
        try:
            result = await process_scheduled_sms()
            if result.get("processed", 0) > 0:
                logger.info(f"Processed {result['processed']} scheduled SMS")
        except Exception as e:
            logger.error(f"Scheduled SMS worker error: {e}")
        
        # Wait 60 seconds before next check
        await asyncio.sleep(60)


# For testing/manual trigger
async def trigger_scheduled_sms_check():
    """
    Manually trigger a check for scheduled SMS.
    Useful for testing or immediate processing.
    """
    return await process_scheduled_sms()
