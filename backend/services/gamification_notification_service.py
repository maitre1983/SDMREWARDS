"""
SDM REWARDS - Real-time Gamification Notifications
===================================================
Push notifications for mission completion, level up, and badge awards
"""

import os
import logging
import httpx
from datetime import datetime, timezone
from typing import Dict, Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Configuration
ONESIGNAL_APP_ID = os.environ.get("ONESIGNAL_APP_ID")
ONESIGNAL_API_KEY = os.environ.get("ONESIGNAL_API_KEY")

# Notification templates
NOTIFICATION_TEMPLATES = {
    "mission_completed": {
        "en": {
            "title": "Mission Complete!",
            "body": "You earned {xp} XP and GHS {cashback}! Keep going!"
        },
        "fr": {
            "title": "Mission Terminee!",
            "body": "Vous avez gagne {xp} XP et {cashback} GHS! Continuez!"
        }
    },
    "level_up": {
        "en": {
            "title": "Level Up!",
            "body": "Congratulations! You're now {level_name} with +{bonus}% cashback bonus!"
        },
        "fr": {
            "title": "Niveau Superieur!",
            "body": "Felicitations! Vous etes maintenant {level_name} avec +{bonus}% de bonus cashback!"
        }
    },
    "badge_earned": {
        "en": {
            "title": "New Badge Earned!",
            "body": "You earned the '{badge_name}' badge! +{xp} XP"
        },
        "fr": {
            "title": "Nouveau Badge Obtenu!",
            "body": "Vous avez obtenu le badge '{badge_name}'! +{xp} XP"
        }
    },
    "streak_milestone": {
        "en": {
            "title": "Streak Milestone!",
            "body": "{days} day streak! You're on fire!"
        },
        "fr": {
            "title": "Serie Record!",
            "body": "Serie de {days} jours! Vous etes en feu!"
        }
    },
    "xp_milestone": {
        "en": {
            "title": "XP Milestone!",
            "body": "You've reached {xp} XP! {message}"
        },
        "fr": {
            "title": "Palier XP!",
            "body": "Vous avez atteint {xp} XP! {message}"
        }
    }
}


class GamificationNotificationService:
    """Service for sending real-time gamification notifications"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def _get_client_info(self, client_id: str) -> Dict:
        """Get client info including language preference and push ID"""
        client = await self.db.clients.find_one(
            {"id": client_id},
            {"_id": 0, "full_name": 1, "language": 1, "onesignal_player_id": 1}
        )
        return client or {}
    
    async def _send_push(
        self,
        player_id: str,
        title: str,
        body: str,
        data: Dict = None
    ) -> bool:
        """Send push notification via OneSignal"""
        if not ONESIGNAL_APP_ID or not ONESIGNAL_API_KEY:
            logger.warning("OneSignal not configured - notification not sent")
            return False
        
        if not player_id:
            logger.debug("No player ID - notification not sent")
            return False
        
        try:
            async with httpx.AsyncClient() as http:
                response = await http.post(
                    "https://onesignal.com/api/v1/notifications",
                    headers={
                        "Authorization": f"Basic {ONESIGNAL_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "app_id": ONESIGNAL_APP_ID,
                        "include_player_ids": [player_id],
                        "headings": {"en": title},
                        "contents": {"en": body},
                        "data": data or {},
                        "ios_sound": "notification.wav",
                        "android_sound": "notification",
                        "small_icon": "ic_notification",
                        "large_icon": "ic_launcher"
                    },
                    timeout=15
                )
                
                if response.status_code == 200:
                    logger.info(f"Push notification sent: {title}")
                    return True
                else:
                    logger.error(f"OneSignal error: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Push notification error: {e}")
            return False
    
    async def _store_notification(
        self,
        client_id: str,
        notification_type: str,
        title: str,
        body: str,
        data: Dict = None
    ):
        """Store notification in database for history"""
        await self.db.notification_history.insert_one({
            "client_id": client_id,
            "type": notification_type,
            "title": title,
            "body": body,
            "data": data or {},
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    async def notify_mission_completed(
        self,
        client_id: str,
        mission_name: str,
        xp_earned: int,
        cashback_earned: float
    ):
        """Send notification when a mission is completed"""
        client = await self._get_client_info(client_id)
        lang = client.get("language", "en")[:2]
        
        template = NOTIFICATION_TEMPLATES["mission_completed"].get(lang, NOTIFICATION_TEMPLATES["mission_completed"]["en"])
        
        title = template["title"]
        body = template["body"].format(
            xp=xp_earned,
            cashback=f"{cashback_earned:.2f}" if cashback_earned > 0 else "0"
        )
        
        data = {
            "type": "mission_completed",
            "mission_name": mission_name,
            "xp_earned": xp_earned,
            "cashback_earned": cashback_earned,
            "screen": "Missions"
        }
        
        # Store notification
        await self._store_notification(client_id, "mission_completed", title, body, data)
        
        # Send push
        player_id = client.get("onesignal_player_id")
        return await self._send_push(player_id, title, body, data)
    
    async def notify_level_up(
        self,
        client_id: str,
        new_level: int,
        level_name: str,
        cashback_bonus: int
    ):
        """Send notification when user levels up"""
        client = await self._get_client_info(client_id)
        lang = client.get("language", "en")[:2]
        
        template = NOTIFICATION_TEMPLATES["level_up"].get(lang, NOTIFICATION_TEMPLATES["level_up"]["en"])
        
        title = template["title"]
        body = template["body"].format(
            level_name=level_name,
            bonus=cashback_bonus
        )
        
        data = {
            "type": "level_up",
            "new_level": new_level,
            "level_name": level_name,
            "cashback_bonus": cashback_bonus,
            "screen": "Missions"
        }
        
        # Store notification
        await self._store_notification(client_id, "level_up", title, body, data)
        
        # Send push
        player_id = client.get("onesignal_player_id")
        return await self._send_push(player_id, title, body, data)
    
    async def notify_badge_earned(
        self,
        client_id: str,
        badge_id: str,
        badge_name: str,
        xp_reward: int
    ):
        """Send notification when user earns a badge"""
        client = await self._get_client_info(client_id)
        lang = client.get("language", "en")[:2]
        
        template = NOTIFICATION_TEMPLATES["badge_earned"].get(lang, NOTIFICATION_TEMPLATES["badge_earned"]["en"])
        
        title = template["title"]
        body = template["body"].format(
            badge_name=badge_name,
            xp=xp_reward
        )
        
        data = {
            "type": "badge_earned",
            "badge_id": badge_id,
            "badge_name": badge_name,
            "xp_reward": xp_reward,
            "screen": "Missions"
        }
        
        # Store notification
        await self._store_notification(client_id, "badge_earned", title, body, data)
        
        # Send push
        player_id = client.get("onesignal_player_id")
        return await self._send_push(player_id, title, body, data)
    
    async def notify_streak_milestone(
        self,
        client_id: str,
        streak_days: int
    ):
        """Send notification for streak milestones (3, 7, 14, 30 days)"""
        milestones = [3, 7, 14, 30, 60, 100]
        
        if streak_days not in milestones:
            return False
        
        client = await self._get_client_info(client_id)
        lang = client.get("language", "en")[:2]
        
        template = NOTIFICATION_TEMPLATES["streak_milestone"].get(lang, NOTIFICATION_TEMPLATES["streak_milestone"]["en"])
        
        title = template["title"]
        body = template["body"].format(days=streak_days)
        
        data = {
            "type": "streak_milestone",
            "streak_days": streak_days,
            "screen": "Home"
        }
        
        # Store notification
        await self._store_notification(client_id, "streak_milestone", title, body, data)
        
        # Send push
        player_id = client.get("onesignal_player_id")
        return await self._send_push(player_id, title, body, data)
    
    async def notify_xp_milestone(
        self,
        client_id: str,
        xp: int
    ):
        """Send notification for XP milestones (500, 1000, 2500, 5000, 10000)"""
        milestones = {
            500: "Keep going!",
            1000: "You're doing great!",
            2500: "Halfway to Pro!",
            5000: "Almost Elite!",
            10000: "Ambassador unlocked!"
        }
        
        if xp not in milestones:
            return False
        
        client = await self._get_client_info(client_id)
        lang = client.get("language", "en")[:2]
        
        template = NOTIFICATION_TEMPLATES["xp_milestone"].get(lang, NOTIFICATION_TEMPLATES["xp_milestone"]["en"])
        
        title = template["title"]
        body = template["body"].format(
            xp=f"{xp:,}",
            message=milestones[xp]
        )
        
        data = {
            "type": "xp_milestone",
            "xp": xp,
            "screen": "Missions"
        }
        
        # Store notification
        await self._store_notification(client_id, "xp_milestone", title, body, data)
        
        # Send push
        player_id = client.get("onesignal_player_id")
        return await self._send_push(player_id, title, body, data)
    
    async def get_unread_notifications(self, client_id: str, limit: int = 20) -> List[Dict]:
        """Get unread notifications for a client"""
        cursor = self.db.notification_history.find(
            {"client_id": client_id, "read": False},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit)
        
        return await cursor.to_list(limit)
    
    async def mark_notifications_read(self, client_id: str, notification_ids: List[str] = None):
        """Mark notifications as read"""
        query = {"client_id": client_id}
        if notification_ids:
            query["id"] = {"$in": notification_ids}
        
        await self.db.notification_history.update_many(
            query,
            {"$set": {"read": True}}
        )
