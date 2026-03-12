"""
SDM REWARDS - Trusted Device Service
=====================================
Manages trusted devices for passwordless/OTP-less login on recognized devices.
"""

import os
import secrets
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Device trust configuration
DEVICE_TOKEN_EXPIRY_DAYS = 90  # Trust expires after 90 days
MAX_TRUSTED_DEVICES_PER_USER = 5  # Maximum trusted devices per user


class DeviceTrustService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.trusted_devices
    
    def _generate_device_token(self) -> str:
        """Generate a secure device token"""
        return secrets.token_urlsafe(32)
    
    def _hash_token(self, token: str) -> str:
        """Hash token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def _generate_device_fingerprint(self, device_info: dict) -> str:
        """Generate a fingerprint from device info for additional validation"""
        fingerprint_data = f"{device_info.get('user_agent', '')}-{device_info.get('platform', '')}"
        return hashlib.md5(fingerprint_data.encode()).hexdigest()[:16]
    
    async def register_trusted_device(
        self,
        user_id: str,
        user_type: str,  # 'client', 'merchant', 'admin'
        device_info: dict
    ) -> Optional[str]:
        """
        Register a new trusted device for a user.
        Returns the device token to be stored on client side.
        """
        try:
            # Check if user already has max trusted devices
            existing_count = await self.collection.count_documents({
                "user_id": user_id,
                "user_type": user_type,
                "revoked": False
            })
            
            if existing_count >= MAX_TRUSTED_DEVICES_PER_USER:
                # Remove oldest device to make room
                oldest = await self.collection.find_one(
                    {"user_id": user_id, "user_type": user_type, "revoked": False},
                    sort=[("created_at", 1)]
                )
                if oldest:
                    await self.collection.update_one(
                        {"_id": oldest["_id"]},
                        {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    logger.info(f"Revoked oldest device for {user_type} {user_id}")
            
            # Generate new device token
            device_token = self._generate_device_token()
            token_hash = self._hash_token(device_token)
            fingerprint = self._generate_device_fingerprint(device_info)
            
            # Create trusted device record
            device_record = {
                "user_id": user_id,
                "user_type": user_type,
                "token_hash": token_hash,
                "fingerprint": fingerprint,
                "device_name": device_info.get("device_name", "Unknown Device"),
                "device_type": device_info.get("device_type", "web"),  # 'web', 'android', 'ios'
                "user_agent": device_info.get("user_agent", "")[:500],  # Limit length
                "platform": device_info.get("platform", ""),
                "browser": device_info.get("browser", ""),
                "ip_address": device_info.get("ip_address", ""),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=DEVICE_TOKEN_EXPIRY_DAYS)).isoformat(),
                "last_used_at": datetime.now(timezone.utc).isoformat(),
                "revoked": False,
                "revoked_at": None
            }
            
            await self.collection.insert_one(device_record)
            logger.info(f"Registered trusted device for {user_type} {user_id}: {device_record['device_name']}")
            
            return device_token
            
        except Exception as e:
            logger.error(f"Error registering trusted device: {e}")
            return None
    
    async def verify_trusted_device(
        self,
        user_id: str,
        user_type: str,
        device_token: str,
        device_info: Optional[dict] = None
    ) -> bool:
        """
        Verify if a device token is valid for the user.
        Optionally validate device fingerprint for additional security.
        """
        try:
            token_hash = self._hash_token(device_token)
            
            device = await self.collection.find_one({
                "user_id": user_id,
                "user_type": user_type,
                "token_hash": token_hash,
                "revoked": False
            })
            
            if not device:
                return False
            
            # Check expiry
            expires_at = datetime.fromisoformat(device["expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > expires_at:
                logger.info(f"Device token expired for {user_type} {user_id}")
                await self.collection.update_one(
                    {"_id": device["_id"]},
                    {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc).isoformat()}}
                )
                return False
            
            # Optional: Validate fingerprint (loose validation - only warn if different)
            if device_info:
                current_fingerprint = self._generate_device_fingerprint(device_info)
                if current_fingerprint != device["fingerprint"]:
                    logger.warning(f"Device fingerprint mismatch for {user_type} {user_id} - might be different browser/device")
                    # We don't reject - just log. User agent can change with browser updates.
            
            # Update last used timestamp
            await self.collection.update_one(
                {"_id": device["_id"]},
                {"$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            logger.info(f"Trusted device verified for {user_type} {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error verifying trusted device: {e}")
            return False
    
    async def get_user_devices(self, user_id: str, user_type: str) -> List[Dict]:
        """Get all trusted devices for a user"""
        try:
            devices = await self.collection.find(
                {"user_id": user_id, "user_type": user_type, "revoked": False},
                {"_id": 0, "token_hash": 0}  # Don't expose token hash
            ).sort("last_used_at", -1).to_list(length=MAX_TRUSTED_DEVICES_PER_USER)
            
            # Add "is_current" flag and format dates
            for device in devices:
                device["is_expired"] = datetime.now(timezone.utc) > datetime.fromisoformat(
                    device["expires_at"].replace("Z", "+00:00")
                )
            
            return devices
            
        except Exception as e:
            logger.error(f"Error getting user devices: {e}")
            return []
    
    async def revoke_device(self, user_id: str, user_type: str, device_created_at: str) -> bool:
        """Revoke a specific trusted device"""
        try:
            result = await self.collection.update_one(
                {
                    "user_id": user_id,
                    "user_type": user_type,
                    "created_at": device_created_at,
                    "revoked": False
                },
                {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            if result.modified_count > 0:
                logger.info(f"Revoked device for {user_type} {user_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error revoking device: {e}")
            return False
    
    async def revoke_all_devices(self, user_id: str, user_type: str) -> int:
        """Revoke all trusted devices for a user (useful for password change/security reset)"""
        try:
            result = await self.collection.update_many(
                {"user_id": user_id, "user_type": user_type, "revoked": False},
                {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            logger.info(f"Revoked {result.modified_count} devices for {user_type} {user_id}")
            return result.modified_count
            
        except Exception as e:
            logger.error(f"Error revoking all devices: {e}")
            return 0


# Singleton instance
_device_trust_service = None

def get_device_trust_service(db: AsyncIOMotorDatabase) -> DeviceTrustService:
    """Get or create the device trust service instance"""
    global _device_trust_service
    if _device_trust_service is None:
        _device_trust_service = DeviceTrustService(db)
    return _device_trust_service
