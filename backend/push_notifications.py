"""
OneSignal Push Notification Service for SDM Fintech
===================================================
This module handles push notifications via OneSignal API.
Configure ONESIGNAL_APP_ID and ONESIGNAL_API_KEY in .env
"""

import os
import httpx
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid

# OneSignal Configuration
ONESIGNAL_APP_ID = os.environ.get("ONESIGNAL_APP_ID", "")
ONESIGNAL_API_KEY = os.environ.get("ONESIGNAL_API_KEY", "")
ONESIGNAL_API_URL = "https://onesignal.com/api/v1"


class PushDevice(BaseModel):
    """Model for storing push notification device tokens"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_type: str  # "client" or "merchant"
    player_id: str  # OneSignal player/subscription ID
    platform: str = "web"  # web, ios, android
    device_model: Optional[str] = None
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_active: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PushNotificationPayload(BaseModel):
    """Payload for sending push notifications"""
    title: str
    message: str
    url: Optional[str] = None
    image_url: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    buttons: Optional[List[Dict[str, str]]] = None


class OneSignalService:
    """Service class for OneSignal push notifications"""
    
    def __init__(self, db):
        self.db = db
        self.app_id = ONESIGNAL_APP_ID
        self.api_key = ONESIGNAL_API_KEY
        self.headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": f"Basic {self.api_key}"
        }
    
    def is_configured(self) -> bool:
        """Check if OneSignal is properly configured"""
        return bool(self.app_id and self.api_key)
    
    async def register_device(
        self,
        user_id: str,
        user_type: str,
        player_id: str,
        platform: str = "web",
        device_model: Optional[str] = None
    ) -> Dict[str, Any]:
        """Register a device for push notifications"""
        
        # Check if device already registered
        existing = await self.db.push_devices.find_one({
            "player_id": player_id
        }, {"_id": 0})
        
        device = PushDevice(
            user_id=user_id,
            user_type=user_type,
            player_id=player_id,
            platform=platform,
            device_model=device_model
        )
        
        if existing:
            # Update existing device
            await self.db.push_devices.update_one(
                {"player_id": player_id},
                {"$set": {
                    "user_id": user_id,
                    "user_type": user_type,
                    "is_active": True,
                    "last_active": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"status": "updated", "device_id": existing.get("id")}
        else:
            # Create new device
            await self.db.push_devices.insert_one(device.model_dump())
            
            # Set external_id in OneSignal for targeting
            if self.is_configured():
                await self._set_external_id(player_id, user_id)
            
            return {"status": "registered", "device_id": device.id}
    
    async def unregister_device(self, player_id: str) -> bool:
        """Unregister a device from push notifications"""
        result = await self.db.push_devices.update_one(
            {"player_id": player_id},
            {"$set": {"is_active": False}}
        )
        return result.modified_count > 0
    
    async def get_user_devices(self, user_id: str) -> List[Dict]:
        """Get all registered devices for a user"""
        devices = await self.db.push_devices.find(
            {"user_id": user_id, "is_active": True},
            {"_id": 0}
        ).to_list(100)
        return devices
    
    async def _set_external_id(self, player_id: str, external_id: str) -> bool:
        """Set external_id in OneSignal for user targeting"""
        if not self.is_configured():
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.put(
                    f"{ONESIGNAL_API_URL}/players/{player_id}",
                    headers=self.headers,
                    json={
                        "app_id": self.app_id,
                        "external_user_id": external_id
                    },
                    timeout=10.0
                )
                return response.status_code == 200
        except Exception as e:
            print(f"Error setting external_id: {e}")
            return False
    
    async def send_to_user(
        self,
        user_id: str,
        payload: PushNotificationPayload
    ) -> Dict[str, Any]:
        """Send push notification to a specific user (all their devices)"""
        
        if not self.is_configured():
            return {
                "success": False,
                "error": "OneSignal not configured",
                "simulated": True
            }
        
        # Get user's devices
        devices = await self.get_user_devices(user_id)
        
        if not devices:
            return {
                "success": False,
                "error": "No devices registered for user"
            }
        
        player_ids = [d["player_id"] for d in devices]
        
        return await self._send_notification(
            player_ids=player_ids,
            payload=payload
        )
    
    async def send_to_segment(
        self,
        segment: str,
        payload: PushNotificationPayload
    ) -> Dict[str, Any]:
        """Send push notification to a OneSignal segment"""
        
        if not self.is_configured():
            return {
                "success": False,
                "error": "OneSignal not configured",
                "simulated": True
            }
        
        try:
            async with httpx.AsyncClient() as client:
                body = {
                    "app_id": self.app_id,
                    "included_segments": [segment],
                    "headings": {"en": payload.title},
                    "contents": {"en": payload.message},
                }
                
                if payload.url:
                    body["url"] = payload.url
                
                if payload.image_url:
                    body["big_picture"] = payload.image_url
                    body["ios_attachments"] = {"id": payload.image_url}
                
                if payload.data:
                    body["data"] = payload.data
                
                if payload.buttons:
                    body["buttons"] = payload.buttons
                
                response = await client.post(
                    f"{ONESIGNAL_API_URL}/notifications",
                    headers=self.headers,
                    json=body,
                    timeout=10.0
                )
                
                result = response.json()
                
                return {
                    "success": response.status_code == 200,
                    "notification_id": result.get("id"),
                    "recipients": result.get("recipients", 0),
                    "response": result
                }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_to_all(
        self,
        payload: PushNotificationPayload,
        user_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send push notification to all subscribed users"""
        
        if not self.is_configured():
            # Simulate for demo purposes
            count = await self.db.push_devices.count_documents({"is_active": True})
            return {
                "success": True,
                "simulated": True,
                "message": f"Would send to {count} devices (OneSignal not configured)"
            }
        
        segment = "Subscribed Users"
        if user_type == "client":
            segment = "Clients"
        elif user_type == "merchant":
            segment = "Merchants"
        
        return await self.send_to_segment(segment, payload)
    
    async def _send_notification(
        self,
        player_ids: List[str],
        payload: PushNotificationPayload
    ) -> Dict[str, Any]:
        """Internal method to send notification to specific player IDs"""
        
        if not self.is_configured():
            return {
                "success": True,
                "simulated": True,
                "message": f"Would send to {len(player_ids)} devices"
            }
        
        try:
            async with httpx.AsyncClient() as client:
                body = {
                    "app_id": self.app_id,
                    "include_player_ids": player_ids,
                    "headings": {"en": payload.title},
                    "contents": {"en": payload.message},
                }
                
                if payload.url:
                    body["url"] = payload.url
                
                if payload.image_url:
                    body["big_picture"] = payload.image_url
                
                if payload.data:
                    body["data"] = payload.data
                
                if payload.buttons:
                    body["buttons"] = payload.buttons
                
                response = await client.post(
                    f"{ONESIGNAL_API_URL}/notifications",
                    headers=self.headers,
                    json=body,
                    timeout=10.0
                )
                
                result = response.json()
                
                # Handle invalid player IDs
                if "errors" in result and "invalid_player_ids" in result["errors"]:
                    invalid_ids = result["errors"]["invalid_player_ids"]
                    # Mark invalid devices as inactive
                    await self.db.push_devices.update_many(
                        {"player_id": {"$in": invalid_ids}},
                        {"$set": {"is_active": False}}
                    )
                
                return {
                    "success": response.status_code == 200,
                    "notification_id": result.get("id"),
                    "recipients": result.get("recipients", 0),
                    "errors": result.get("errors")
                }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_notification_stats(self) -> Dict[str, Any]:
        """Get push notification statistics"""
        
        total_devices = await self.db.push_devices.count_documents({})
        active_devices = await self.db.push_devices.count_documents({"is_active": True})
        
        # Count by platform
        platform_stats = await self.db.push_devices.aggregate([
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$platform", "count": {"$sum": 1}}}
        ]).to_list(100)
        
        # Count by user type
        user_type_stats = await self.db.push_devices.aggregate([
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$user_type", "count": {"$sum": 1}}}
        ]).to_list(100)
        
        return {
            "total_devices": total_devices,
            "active_devices": active_devices,
            "is_configured": self.is_configured(),
            "by_platform": {s["_id"]: s["count"] for s in platform_stats},
            "by_user_type": {s["_id"]: s["count"] for s in user_type_stats}
        }
