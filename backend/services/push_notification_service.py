"""
SDM REWARDS - Push Notification Service
=======================================
Sends push notifications via OneSignal
"""

import os
import httpx
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)

# OneSignal Configuration - Read at runtime
ONESIGNAL_BASE_URL = "https://onesignal.com/api/v1"


def get_onesignal_config():
    """Get OneSignal configuration from environment at runtime"""
    return {
        "app_id": os.environ.get("ONESIGNAL_APP_ID", "5c95e6f8-d2e8-4c22-b070-dfd556d746a0"),
        "api_key": os.environ.get("ONESIGNAL_API_KEY", "")
    }


class PushNotificationService:
    """Service for sending push notifications via OneSignal"""
    
    def __init__(self, db=None):
        self.db = db
        self.base_url = ONESIGNAL_BASE_URL
    
    @property
    def app_id(self):
        return get_onesignal_config()["app_id"]
    
    @property
    def api_key(self):
        return get_onesignal_config()["api_key"]
    
    def is_configured(self) -> bool:
        """Check if OneSignal is properly configured"""
        return bool(self.app_id and self.api_key)
    
    async def send_to_all(self, title: str, message: str, url: Optional[str] = None, data: Optional[Dict] = None) -> Dict:
        """
        Send push notification to all subscribed users
        
        Returns: {"success": bool, "notification_id": str, "recipients": int, "error": str}
        """
        # Log the notification attempt
        notification_record = {
            "id": str(__import__('uuid').uuid4()),
            "title": title,
            "message": message,
            "url": url,
            "target": "all",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.push_notifications.insert_one(notification_record)
        
        if not self.is_configured():
            error = "OneSignal not configured - missing API key"
            logger.warning(error)
            if self.db is not None:
                await self.db.push_notifications.update_one(
                    {"id": notification_record["id"]},
                    {"$set": {"status": "failed", "error": error}}
                )
            return {"success": False, "error": error}
        
        try:
            payload = {
                "app_id": self.app_id,
                "included_segments": ["All"],
                "headings": {"en": title},
                "contents": {"en": message},
            }
            
            if url:
                payload["url"] = url
            
            if data:
                payload["data"] = data
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/notifications",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Basic {self.api_key}"
                    },
                    json=payload,
                    timeout=30.0
                )
                
                result = response.json()
                logger.info(f"OneSignal response: {result}")
                
                if response.status_code == 200 and result.get("id"):
                    if self.db is not None:
                        await self.db.push_notifications.update_one(
                            {"id": notification_record["id"]},
                            {
                                "$set": {
                                    "status": "sent",
                                    "onesignal_id": result.get("id"),
                                    "recipients": result.get("recipients", 0),
                                    "sent_at": datetime.now(timezone.utc).isoformat()
                                }
                            }
                        )
                    return {
                        "success": True,
                        "notification_id": result.get("id"),
                        "recipients": result.get("recipients", 0)
                    }
                else:
                    error = result.get("errors", ["Unknown error"])[0] if result.get("errors") else "Failed to send"
                    if self.db is not None:
                        await self.db.push_notifications.update_one(
                            {"id": notification_record["id"]},
                            {"$set": {"status": "failed", "error": str(error)}}
                        )
                    return {"success": False, "error": str(error)}
                    
        except Exception as e:
            error = str(e)
            logger.error(f"Push notification error: {error}")
            if self.db is not None:
                await self.db.push_notifications.update_one(
                    {"id": notification_record["id"]},
                    {"$set": {"status": "failed", "error": error}}
                )
            return {"success": False, "error": error}
    
    async def send_to_segment(self, title: str, message: str, segment: str, url: Optional[str] = None) -> Dict:
        """
        Send push notification to a specific segment
        Segments: "All", "Active Users", "Inactive Users", etc.
        """
        notification_record = {
            "id": str(__import__('uuid').uuid4()),
            "title": title,
            "message": message,
            "url": url,
            "target": f"segment:{segment}",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.push_notifications.insert_one(notification_record)
        
        if not self.is_configured():
            return {"success": False, "error": "OneSignal not configured"}
        
        try:
            payload = {
                "app_id": self.app_id,
                "included_segments": [segment],
                "headings": {"en": title},
                "contents": {"en": message},
            }
            
            if url:
                payload["url"] = url
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/notifications",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Basic {self.api_key}"
                    },
                    json=payload,
                    timeout=30.0
                )
                
                result = response.json()
                
                if response.status_code == 200 and result.get("id"):
                    if self.db is not None:
                        await self.db.push_notifications.update_one(
                            {"id": notification_record["id"]},
                            {
                                "$set": {
                                    "status": "sent",
                                    "onesignal_id": result.get("id"),
                                    "recipients": result.get("recipients", 0),
                                    "sent_at": datetime.now(timezone.utc).isoformat()
                                }
                            }
                        )
                    return {
                        "success": True,
                        "notification_id": result.get("id"),
                        "recipients": result.get("recipients", 0)
                    }
                else:
                    error = result.get("errors", ["Failed"])[0] if result.get("errors") else "Failed"
                    return {"success": False, "error": str(error)}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_notification_history(self, limit: int = 50) -> List[Dict]:
        """Get push notification history from database"""
        if self.db is None:
            return []
        
        notifications = await self.db.push_notifications.find(
            {}, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return notifications
    
    async def get_app_stats(self) -> Dict:
        """Get OneSignal app statistics"""
        if not self.is_configured():
            return {"error": "Not configured", "subscribers": 0}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/apps/{self.app_id}",
                    headers={
                        "Authorization": f"Basic {self.api_key}"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "success": True,
                        "subscribers": result.get("players", 0),
                        "app_name": result.get("name", "SDM Rewards")
                    }
                else:
                    return {"success": False, "subscribers": 0}
                    
        except Exception as e:
            logger.error(f"Failed to get OneSignal stats: {e}")
            return {"success": False, "subscribers": 0, "error": str(e)}


# Singleton instance
_push_service = None

def get_push_service(db=None):
    """Get or create push notification service instance"""
    global _push_service
    if _push_service is None:
        _push_service = PushNotificationService(db)
    elif db is not None:
        _push_service.db = db
    return _push_service
