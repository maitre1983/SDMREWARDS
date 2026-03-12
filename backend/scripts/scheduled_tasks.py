#!/usr/bin/env python3
"""
SDM REWARDS - Scheduled Tasks Runner
=====================================
Run scheduled tasks like daily notifications
Can be triggered by cron or systemd timer

Usage:
  python scheduled_tasks.py daily-notifications
  python scheduled_tasks.py inactive-reminders
  python scheduled_tasks.py weekly-summaries
"""

import os
import sys
import asyncio
import logging
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from services.notification_service import SmartNotificationService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')


async def run_daily_notifications():
    """Process daily smart notifications for all clients"""
    logger.info("Starting daily notifications processing...")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    notification_service = SmartNotificationService(db)
    
    try:
        result = await notification_service.process_daily_notifications()
        logger.info(f"Daily notifications completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Error processing daily notifications: {e}")
        raise
    finally:
        client.close()


async def run_inactive_reminders(days_threshold: int = 7):
    """Send reminders to inactive users"""
    logger.info(f"Starting inactive user reminders (threshold: {days_threshold} days)...")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    notification_service = SmartNotificationService(db)
    
    try:
        result = await notification_service.process_inactive_user_notifications(days_threshold)
        logger.info(f"Inactive reminders completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Error processing inactive reminders: {e}")
        raise
    finally:
        client.close()


async def run_weekly_summaries():
    """Send weekly spending summaries to active clients"""
    logger.info("Starting weekly summaries processing...")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    notification_service = SmartNotificationService(db)
    
    # Get active clients
    clients = await db.clients.find(
        {"status": "active"},
        {"id": 1}
    ).to_list(1000)
    
    results = {"sent": 0, "failed": 0}
    
    try:
        for c in clients:
            try:
                result = await notification_service.send_weekly_summary(c["id"])
                if result.get("success"):
                    results["sent"] += 1
                else:
                    results["failed"] += 1
            except Exception as e:
                logger.error(f"Error sending summary to {c['id']}: {e}")
                results["failed"] += 1
        
        logger.info(f"Weekly summaries completed: {results}")
        return results
    finally:
        client.close()


async def run_security_checks():
    """Run security checks for all active clients"""
    logger.info("Starting security checks...")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    notification_service = SmartNotificationService(db)
    
    # Get active clients
    clients = await db.clients.find(
        {"status": "active"},
        {"id": 1}
    ).to_list(1000)
    
    results = {"alerts_sent": 0, "clean": 0}
    
    try:
        for c in clients:
            try:
                result = await notification_service.check_and_send_security_alert(c["id"])
                if result.get("success"):
                    results["alerts_sent"] += 1
                else:
                    results["clean"] += 1
            except Exception as e:
                logger.error(f"Error checking security for {c['id']}: {e}")
        
        logger.info(f"Security checks completed: {results}")
        return results
    finally:
        client.close()


def main():
    if len(sys.argv) < 2:
        print("Usage: python scheduled_tasks.py <task>")
        print("Tasks:")
        print("  daily-notifications  - Process daily smart notifications")
        print("  inactive-reminders   - Send reminders to inactive users")
        print("  weekly-summaries     - Send weekly spending summaries")
        print("  security-checks      - Run fraud detection checks")
        sys.exit(1)
    
    task = sys.argv[1]
    
    if task == "daily-notifications":
        asyncio.run(run_daily_notifications())
    elif task == "inactive-reminders":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
        asyncio.run(run_inactive_reminders(days))
    elif task == "weekly-summaries":
        asyncio.run(run_weekly_summaries())
    elif task == "security-checks":
        asyncio.run(run_security_checks())
    else:
        print(f"Unknown task: {task}")
        sys.exit(1)


if __name__ == "__main__":
    main()
