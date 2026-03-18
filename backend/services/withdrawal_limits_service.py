"""
SDM REWARDS - Withdrawal Limits Service
========================================
Centralized control for client withdrawal limits.

Principle: effective_limit = MIN(global_limit, user_limit)
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')

# Default global limits (GHS)
DEFAULT_GLOBAL_LIMITS = {
    "momo": {
        "max_per_tx": 500,
        "daily": 1000,
        "weekly": 5000,
        "monthly": 20000
    },
    "bank": {
        "max_per_tx": 2000,
        "daily": 5000,
        "weekly": 20000,
        "monthly": 100000
    }
}


class WithdrawalLimitsService:
    """
    Manages withdrawal limits for clients.
    
    Enforces: effective_limit = MIN(global_limit, user_limit)
    """
    
    COLLECTION_NAME = "withdrawal_limits_global"
    USER_LIMITS_COLLECTION = "user_withdrawal_limits"
    
    def __init__(self, db=None):
        self.db = db
    
    async def get_global_limits(self) -> Dict:
        """Get global withdrawal limits from database"""
        if self.db is None:
            return DEFAULT_GLOBAL_LIMITS
        
        config = await self.db[self.COLLECTION_NAME].find_one({"key": "main"})
        if not config:
            return DEFAULT_GLOBAL_LIMITS
        
        return {
            "momo": {
                "max_per_tx": config.get("momo_max_per_tx", DEFAULT_GLOBAL_LIMITS["momo"]["max_per_tx"]),
                "daily": config.get("momo_daily", DEFAULT_GLOBAL_LIMITS["momo"]["daily"]),
                "weekly": config.get("momo_weekly", DEFAULT_GLOBAL_LIMITS["momo"]["weekly"]),
                "monthly": config.get("momo_monthly", DEFAULT_GLOBAL_LIMITS["momo"]["monthly"])
            },
            "bank": {
                "max_per_tx": config.get("bank_max_per_tx", DEFAULT_GLOBAL_LIMITS["bank"]["max_per_tx"]),
                "daily": config.get("bank_daily", DEFAULT_GLOBAL_LIMITS["bank"]["daily"]),
                "weekly": config.get("bank_weekly", DEFAULT_GLOBAL_LIMITS["bank"]["weekly"]),
                "monthly": config.get("bank_monthly", DEFAULT_GLOBAL_LIMITS["bank"]["monthly"])
            }
        }
    
    async def set_global_limits(self, limits: Dict) -> bool:
        """Set global withdrawal limits"""
        if self.db is None:
            return False
        
        update_data = {
            "key": "main",
            "momo_max_per_tx": limits.get("momo", {}).get("max_per_tx", DEFAULT_GLOBAL_LIMITS["momo"]["max_per_tx"]),
            "momo_daily": limits.get("momo", {}).get("daily", DEFAULT_GLOBAL_LIMITS["momo"]["daily"]),
            "momo_weekly": limits.get("momo", {}).get("weekly", DEFAULT_GLOBAL_LIMITS["momo"]["weekly"]),
            "momo_monthly": limits.get("momo", {}).get("monthly", DEFAULT_GLOBAL_LIMITS["momo"]["monthly"]),
            "bank_max_per_tx": limits.get("bank", {}).get("max_per_tx", DEFAULT_GLOBAL_LIMITS["bank"]["max_per_tx"]),
            "bank_daily": limits.get("bank", {}).get("daily", DEFAULT_GLOBAL_LIMITS["bank"]["daily"]),
            "bank_weekly": limits.get("bank", {}).get("weekly", DEFAULT_GLOBAL_LIMITS["bank"]["weekly"]),
            "bank_monthly": limits.get("bank", {}).get("monthly", DEFAULT_GLOBAL_LIMITS["bank"]["monthly"]),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db[self.COLLECTION_NAME].update_one(
            {"key": "main"},
            {"$set": update_data},
            upsert=True
        )
        
        logger.info(f"Global withdrawal limits updated: {update_data}")
        return True
    
    async def get_user_limits(self, user_id: str) -> Dict:
        """Get individual user limits (if any)"""
        if self.db is None:
            return None
        
        user_limits = await self.db[self.USER_LIMITS_COLLECTION].find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        return user_limits
    
    async def set_user_limits(self, user_id: str, limits: Dict) -> bool:
        """Set individual user limits"""
        if self.db is None:
            return False
        
        update_data = {
            "user_id": user_id,
            **limits,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db[self.USER_LIMITS_COLLECTION].update_one(
            {"user_id": user_id},
            {"$set": update_data},
            upsert=True
        )
        return True
    
    async def get_effective_limits(self, user_id: str, method: str = "momo") -> Dict:
        """
        Get effective limits for a user.
        
        Formula: effective_limit = MIN(global_limit, user_limit)
        
        Returns limits and current usage for the period.
        """
        global_limits = await self.get_global_limits()
        user_limits = await self.get_user_limits(user_id)
        
        # Get global limits for the method
        g_limits = global_limits.get(method, DEFAULT_GLOBAL_LIMITS.get(method, {}))
        
        # If user has individual limits, take the minimum
        if user_limits and method in user_limits:
            u_limits = user_limits.get(method, {})
            effective = {
                "max_per_tx": min(g_limits.get("max_per_tx", 9999999), u_limits.get("max_per_tx", 9999999)),
                "daily": min(g_limits.get("daily", 9999999), u_limits.get("daily", 9999999)),
                "weekly": min(g_limits.get("weekly", 9999999), u_limits.get("weekly", 9999999)),
                "monthly": min(g_limits.get("monthly", 9999999), u_limits.get("monthly", 9999999))
            }
        else:
            effective = g_limits
        
        # Get current usage
        usage = await self.get_user_usage(user_id, method)
        
        return {
            "limits": effective,
            "usage": usage,
            "remaining": {
                "daily": max(0, effective["daily"] - usage["daily"]),
                "weekly": max(0, effective["weekly"] - usage["weekly"]),
                "monthly": max(0, effective["monthly"] - usage["monthly"])
            }
        }
    
    async def get_user_usage(self, user_id: str, method: str = "momo") -> Dict:
        """
        Get user's withdrawal usage for current periods.
        
        Tracks: today, this week, this month
        """
        if self.db is None:
            return {"daily": 0, "weekly": 0, "monthly": 0}
        
        now = datetime.now(timezone.utc)
        
        # Calculate period starts
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)
        
        # Query withdrawals
        withdrawal_types = ["withdrawal", "bank_withdrawal"] if method == "bank" else ["withdrawal", "momo_withdrawal"]
        
        # Daily usage
        daily_pipeline = [
            {
                "$match": {
                    "client_id": user_id,
                    "type": {"$in": withdrawal_types},
                    "status": {"$in": ["success", "processing", "pending"]},
                    "created_at": {"$gte": today_start.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount"}
                }
            }
        ]
        
        # Weekly usage
        weekly_pipeline = [
            {
                "$match": {
                    "client_id": user_id,
                    "type": {"$in": withdrawal_types},
                    "status": {"$in": ["success", "processing", "pending"]},
                    "created_at": {"$gte": week_start.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount"}
                }
            }
        ]
        
        # Monthly usage
        monthly_pipeline = [
            {
                "$match": {
                    "client_id": user_id,
                    "type": {"$in": withdrawal_types},
                    "status": {"$in": ["success", "processing", "pending"]},
                    "created_at": {"$gte": month_start.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount"}
                }
            }
        ]
        
        daily_result = await self.db.service_transactions.aggregate(daily_pipeline).to_list(1)
        weekly_result = await self.db.service_transactions.aggregate(weekly_pipeline).to_list(1)
        monthly_result = await self.db.service_transactions.aggregate(monthly_pipeline).to_list(1)
        
        return {
            "daily": daily_result[0]["total"] if daily_result else 0,
            "weekly": weekly_result[0]["total"] if weekly_result else 0,
            "monthly": monthly_result[0]["total"] if monthly_result else 0
        }
    
    async def validate_withdrawal(self, user_id: str, amount: float, method: str = "momo") -> Dict:
        """
        Validate if a withdrawal is allowed.
        
        Returns:
            {
                "allowed": bool,
                "reason": str or None,
                "max_allowed": float
            }
        """
        effective = await self.get_effective_limits(user_id, method)
        limits = effective["limits"]
        usage = effective["usage"]
        remaining = effective["remaining"]
        
        # Check max per transaction
        if amount > limits["max_per_tx"]:
            return {
                "allowed": False,
                "reason": f"Maximum amount per transaction is GHS {limits['max_per_tx']:.2f}",
                "max_allowed": limits["max_per_tx"]
            }
        
        # Check daily limit
        if usage["daily"] + amount > limits["daily"]:
            return {
                "allowed": False,
                "reason": f"Daily limit exceeded. Remaining: GHS {remaining['daily']:.2f}",
                "max_allowed": remaining["daily"]
            }
        
        # Check weekly limit
        if usage["weekly"] + amount > limits["weekly"]:
            return {
                "allowed": False,
                "reason": f"Weekly limit exceeded. Remaining: GHS {remaining['weekly']:.2f}",
                "max_allowed": remaining["weekly"]
            }
        
        # Check monthly limit
        if usage["monthly"] + amount > limits["monthly"]:
            return {
                "allowed": False,
                "reason": f"Monthly limit exceeded. Remaining: GHS {remaining['monthly']:.2f}",
                "max_allowed": remaining["monthly"]
            }
        
        return {
            "allowed": True,
            "reason": None,
            "max_allowed": min(limits["max_per_tx"], remaining["daily"], remaining["weekly"], remaining["monthly"])
        }


# Singleton instance
_limits_service = None

def get_withdrawal_limits_service(db=None) -> WithdrawalLimitsService:
    """Get singleton instance"""
    global _limits_service
    if _limits_service is None:
        _limits_service = WithdrawalLimitsService(db)
    elif db is not None and _limits_service.db is None:
        _limits_service.db = db
    return _limits_service
