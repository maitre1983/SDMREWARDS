"""
SDM REWARDS - API Security Module
==================================
Enhanced security features for API key management.
Includes rate limiting, IP validation, key rotation, and audit logging.
"""

import os
import re
import hmac
import secrets
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Dict, Any
from fastapi import HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


# Security Configuration
API_KEY_PREFIX = "sdm_live_"
API_KEY_LENGTH = 32  # Length of random part
MAX_API_KEYS_PER_MERCHANT = 10
KEY_ROTATION_GRACE_PERIOD_DAYS = 7  # Old key valid for 7 days after rotation
SUSPICIOUS_ACTIVITY_THRESHOLD = 100  # Requests per minute before flagging


class APIKeySecurity:
    """Enhanced API key security manager"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    @staticmethod
    def generate_secure_key() -> Tuple[str, str]:
        """
        Generate a cryptographically secure API key.
        Returns (plaintext_key, hashed_key)
        """
        # Use secrets module for cryptographic randomness
        random_bytes = secrets.token_bytes(API_KEY_LENGTH)
        random_part = secrets.token_urlsafe(API_KEY_LENGTH)
        
        # Create the full key with prefix
        api_key = f"{API_KEY_PREFIX}{random_part}"
        
        # Hash with SHA-256 and a salt
        salt = secrets.token_hex(16)
        key_hash = hashlib.pbkdf2_hmac(
            'sha256',
            api_key.encode('utf-8'),
            salt.encode('utf-8'),
            100000  # iterations
        ).hex()
        
        # Store salt with hash
        full_hash = f"{salt}:{key_hash}"
        
        return api_key, full_hash
    
    @staticmethod
    def verify_key_hash(api_key: str, stored_hash: str) -> bool:
        """Verify an API key against its stored hash"""
        try:
            if ':' not in stored_hash:
                # Legacy simple hash
                return hashlib.sha256(api_key.encode()).hexdigest() == stored_hash
            
            salt, key_hash = stored_hash.split(':', 1)
            computed_hash = hashlib.pbkdf2_hmac(
                'sha256',
                api_key.encode('utf-8'),
                salt.encode('utf-8'),
                100000
            ).hex()
            
            # Use constant-time comparison to prevent timing attacks
            return hmac.compare_digest(computed_hash, key_hash)
        except Exception:
            return False
    
    @staticmethod
    def validate_api_key_format(api_key: str) -> bool:
        """Validate API key format"""
        if not api_key:
            return False
        
        # Must start with prefix
        if not api_key.startswith(API_KEY_PREFIX):
            return False
        
        # Check length (prefix + random part)
        if len(api_key) < len(API_KEY_PREFIX) + 20:
            return False
        
        # Must be alphanumeric with URL-safe characters
        random_part = api_key[len(API_KEY_PREFIX):]
        if not re.match(r'^[A-Za-z0-9_-]+$', random_part):
            return False
        
        return True
    
    async def check_rate_limit(
        self,
        key_id: str,
        rate_limit: int,
        window_seconds: int = 60
    ) -> Tuple[bool, int]:
        """
        Check if API key is within rate limit.
        Returns (is_allowed, remaining_requests)
        """
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(seconds=window_seconds)
        
        # Count recent requests
        recent_count = await self.db.api_requests.count_documents({
            "key_id": key_id,
            "timestamp": {"$gte": window_start.isoformat()}
        })
        
        remaining = max(0, rate_limit - recent_count)
        is_allowed = recent_count < rate_limit
        
        return is_allowed, remaining
    
    async def log_api_request(
        self,
        key_id: str,
        merchant_id: str,
        endpoint: str,
        method: str,
        ip_address: str,
        user_agent: str,
        status_code: int,
        response_time_ms: float
    ):
        """Log API request for auditing and rate limiting"""
        log_entry = {
            "key_id": key_id,
            "merchant_id": merchant_id,
            "endpoint": endpoint,
            "method": method,
            "ip_address": ip_address,
            "user_agent": user_agent[:500] if user_agent else None,
            "status_code": status_code,
            "response_time_ms": response_time_ms,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.api_requests.insert_one(log_entry)
        
        # Check for suspicious activity
        await self.check_suspicious_activity(key_id, ip_address)
    
    async def check_suspicious_activity(self, key_id: str, ip_address: str):
        """Check for and flag suspicious API usage patterns"""
        now = datetime.now(timezone.utc)
        minute_ago = now - timedelta(minutes=1)
        
        # Count requests in last minute
        count = await self.db.api_requests.count_documents({
            "key_id": key_id,
            "timestamp": {"$gte": minute_ago.isoformat()}
        })
        
        if count > SUSPICIOUS_ACTIVITY_THRESHOLD:
            # Log suspicious activity
            await self.db.security_alerts.insert_one({
                "type": "high_request_volume",
                "key_id": key_id,
                "ip_address": ip_address,
                "request_count": count,
                "threshold": SUSPICIOUS_ACTIVITY_THRESHOLD,
                "timestamp": now.isoformat(),
                "resolved": False
            })
            
            logger.warning(f"Suspicious activity detected for key {key_id}: {count} requests/minute from {ip_address}")
    
    async def validate_ip_whitelist(
        self,
        key_doc: Dict[str, Any],
        client_ip: str
    ) -> bool:
        """Validate client IP against whitelist"""
        allowed_ips = key_doc.get("allowed_ips")
        
        if not allowed_ips:
            return True  # No whitelist = allow all
        
        # Check exact match
        if client_ip in allowed_ips:
            return True
        
        # Check CIDR ranges (basic implementation)
        for allowed in allowed_ips:
            if '/' in allowed:
                # Basic CIDR check
                try:
                    import ipaddress
                    network = ipaddress.ip_network(allowed, strict=False)
                    if ipaddress.ip_address(client_ip) in network:
                        return True
                except Exception:
                    pass
        
        return False
    
    async def rotate_api_key(
        self,
        key_id: str,
        merchant_id: str
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Rotate an API key.
        Returns (new_api_key, new_key_id) or (None, None) on failure
        """
        # Find existing key
        existing_key = await self.db.api_keys.find_one({
            "key_id": key_id,
            "merchant_id": merchant_id,
            "is_active": True
        })
        
        if not existing_key:
            return None, None
        
        # Generate new key
        new_api_key, new_hash = self.generate_secure_key()
        new_key_id = f"key_{secrets.token_hex(6)}"
        
        now = datetime.now(timezone.utc)
        
        # Create new key document
        new_key_doc = {
            "key_id": new_key_id,
            "merchant_id": merchant_id,
            "name": existing_key["name"] + " (rotated)",
            "description": f"Rotated from {key_id}",
            "key_hash": new_hash,
            "key_prefix": new_api_key[:15] + "...",
            "allowed_ips": existing_key.get("allowed_ips"),
            "rate_limit": existing_key.get("rate_limit", 100),
            "is_active": True,
            "created_at": now.isoformat(),
            "rotated_from": key_id,
            "expires_at": None,
            "last_used_at": None,
            "request_count": 0
        }
        
        # Mark old key with grace period
        grace_period_end = now + timedelta(days=KEY_ROTATION_GRACE_PERIOD_DAYS)
        
        await self.db.api_keys.update_one(
            {"key_id": key_id},
            {
                "$set": {
                    "rotated_to": new_key_id,
                    "rotation_grace_until": grace_period_end.isoformat(),
                    "rotation_date": now.isoformat()
                }
            }
        )
        
        await self.db.api_keys.insert_one(new_key_doc)
        
        logger.info(f"Rotated API key {key_id} -> {new_key_id} for merchant {merchant_id}")
        
        return new_api_key, new_key_id
    
    async def get_key_usage_stats(
        self,
        key_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get usage statistics for an API key"""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)
        
        pipeline = [
            {
                "$match": {
                    "key_id": key_id,
                    "timestamp": {"$gte": start_date.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_requests": {"$sum": 1},
                    "success_count": {
                        "$sum": {"$cond": [{"$lt": ["$status_code", 400]}, 1, 0]}
                    },
                    "error_count": {
                        "$sum": {"$cond": [{"$gte": ["$status_code", 400]}, 1, 0]}
                    },
                    "avg_response_time": {"$avg": "$response_time_ms"},
                    "unique_ips": {"$addToSet": "$ip_address"}
                }
            }
        ]
        
        result = await self.db.api_requests.aggregate(pipeline).to_list(length=1)
        
        if not result:
            return {
                "total_requests": 0,
                "success_count": 0,
                "error_count": 0,
                "avg_response_time_ms": 0,
                "unique_ip_count": 0,
                "period_days": days
            }
        
        stats = result[0]
        return {
            "total_requests": stats["total_requests"],
            "success_count": stats["success_count"],
            "error_count": stats["error_count"],
            "success_rate": round(stats["success_count"] / max(stats["total_requests"], 1) * 100, 2),
            "avg_response_time_ms": round(stats["avg_response_time"], 2) if stats["avg_response_time"] else 0,
            "unique_ip_count": len(stats["unique_ips"]),
            "period_days": days
        }


# Singleton instance
_api_security: Optional[APIKeySecurity] = None


def get_api_security(db: AsyncIOMotorDatabase) -> APIKeySecurity:
    """Get or create the API security instance"""
    global _api_security
    if _api_security is None:
        _api_security = APIKeySecurity(db)
    return _api_security
