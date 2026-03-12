"""
SDM REWARDS - Smart Notifications Router
=========================================
Endpoints for managing smart notifications
"""

import os
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from routers.auth import get_current_client
from services.notification_service import SmartNotificationService

router = APIRouter()
logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Notification Service
notification_service = SmartNotificationService(db)


# ============== REQUEST MODELS ==============

class NotificationPreferencesUpdate(BaseModel):
    push_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    cashback_alerts: Optional[bool] = None
    merchant_recommendations: Optional[bool] = None
    security_alerts: Optional[bool] = None
    promotional: Optional[bool] = None
    frequency: Optional[str] = None  # daily, weekly, instant
    quiet_hours_start: Optional[int] = None  # 0-23
    quiet_hours_end: Optional[int] = None  # 0-23


class TestNotificationRequest(BaseModel):
    channel: str  # push, sms, email, all
    notification_type: Optional[str] = "system"


# ============== CLIENT ENDPOINTS ==============

@router.get("/preferences")
async def get_notification_preferences(
    current_client: dict = Depends(get_current_client)
):
    """Get current notification preferences"""
    prefs = await notification_service.get_client_notification_preferences(
        current_client["id"]
    )
    return {"success": True, "preferences": prefs}


@router.put("/preferences")
async def update_notification_preferences(
    updates: NotificationPreferencesUpdate,
    current_client: dict = Depends(get_current_client)
):
    """Update notification preferences"""
    # Filter out None values
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    result = await notification_service.update_notification_preferences(
        current_client["id"],
        update_data
    )
    return result


@router.get("/history")
async def get_notification_history(
    limit: int = 20,
    current_client: dict = Depends(get_current_client)
):
    """Get notification history for current client"""
    notifications = await db.notification_logs.find(
        {"client_id": current_client["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "notifications": notifications,
        "count": len(notifications)
    }


@router.post("/test")
async def test_notification(
    request: TestNotificationRequest,
    current_client: dict = Depends(get_current_client)
):
    """Send a test notification to verify channels are working"""
    channels = None
    if request.channel != "all":
        channels = [request.channel]
    
    result = await notification_service.send_smart_notification(
        client_id=current_client["id"],
        notification_type="system",
        title="🔔 Test Notification",
        body="This is a test notification from SDM REWARDS. If you received this, your notifications are working!",
        channels=channels,
        force=True  # Bypass quiet hours for test
    )
    
    return result


@router.post("/trigger/cashback-opportunities")
async def trigger_cashback_notification(
    background_tasks: BackgroundTasks,
    current_client: dict = Depends(get_current_client)
):
    """Manually trigger a cashback opportunity check and notification"""
    result = await notification_service.check_and_send_cashback_opportunities(
        current_client["id"]
    )
    return result


@router.post("/trigger/security-check")
async def trigger_security_notification(
    current_client: dict = Depends(get_current_client)
):
    """Manually trigger a security check and notification if needed"""
    result = await notification_service.check_and_send_security_alert(
        current_client["id"]
    )
    return result


@router.post("/trigger/weekly-summary")
async def trigger_weekly_summary(
    current_client: dict = Depends(get_current_client)
):
    """Manually trigger weekly summary notification"""
    result = await notification_service.send_weekly_summary(
        current_client["id"]
    )
    return result


# ============== ADMIN ENDPOINTS (for batch processing) ==============

@router.post("/admin/process-daily")
async def admin_process_daily_notifications(
    background_tasks: BackgroundTasks
):
    """
    Process daily smart notifications for all clients
    Should be called by a cron job or scheduler
    """
    # Run in background
    background_tasks.add_task(notification_service.process_daily_notifications)
    return {"success": True, "message": "Daily notification processing started"}


@router.post("/admin/process-inactive")
async def admin_process_inactive_notifications(
    days_threshold: int = 7,
    background_tasks: BackgroundTasks = None
):
    """
    Send notifications to inactive users
    Should be called by a cron job or scheduler
    """
    result = await notification_service.process_inactive_user_notifications(days_threshold)
    return {"success": True, **result}



# ============== GAMIFICATION NOTIFICATIONS ==============

@router.get("/gamification/unread")
async def get_unread_gamification_notifications(
    current_client: dict = Depends(get_current_client),
    limit: int = 20
):
    """Get unread gamification notifications for a client"""
    from services.gamification_notification_service import GamificationNotificationService
    
    gam_notif_service = GamificationNotificationService(db)
    notifications = await gam_notif_service.get_unread_notifications(
        current_client["id"],
        limit
    )
    
    return {
        "success": True,
        "notifications": notifications,
        "count": len(notifications)
    }


@router.post("/gamification/mark-read")
async def mark_gamification_notifications_read(
    current_client: dict = Depends(get_current_client),
    notification_ids: List[str] = None
):
    """Mark gamification notifications as read"""
    from services.gamification_notification_service import GamificationNotificationService
    
    gam_notif_service = GamificationNotificationService(db)
    await gam_notif_service.mark_notifications_read(
        current_client["id"],
        notification_ids
    )
    
    return {"success": True, "message": "Notifications marked as read"}
