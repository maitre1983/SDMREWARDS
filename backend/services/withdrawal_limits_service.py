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

    async def get_all_clients_usage(self, limit: int = 50, sort_by: str = "daily_usage", 
                                     filter_approaching: bool = False, threshold: float = 0.8) -> Dict:
        """
        Get withdrawal usage for all clients with activity.
        
        Args:
            limit: Max number of clients to return
            sort_by: Sort field (daily_usage, weekly_usage, monthly_usage, daily_percent)
            filter_approaching: Only show clients at or above threshold
            threshold: Percentage threshold (0.8 = 80% of limit)
        
        Returns aggregated usage data for dashboard display.
        """
        if self.db is None:
            return {"clients": [], "summary": {}}
        
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)
        
        global_limits = await self.get_global_limits()
        
        # Aggregate withdrawals by client for each period
        pipeline = [
            {
                "$match": {
                    "type": {"$in": ["withdrawal", "momo_withdrawal", "bank_withdrawal"]},
                    "status": {"$in": ["success", "processing", "pending"]},
                    "created_at": {"$gte": month_start.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": "$client_id",
                    "total_monthly": {"$sum": "$amount"},
                    "tx_count": {"$sum": 1},
                    "last_withdrawal": {"$max": "$created_at"}
                }
            },
            {"$sort": {"total_monthly": -1}},
            {"$limit": 200}  # Get more to filter later
        ]
        
        monthly_usage = await self.db.service_transactions.aggregate(pipeline).to_list(200)
        
        # Build client usage map
        client_ids = [item["_id"] for item in monthly_usage if item["_id"]]
        
        # Get daily and weekly usage for these clients
        daily_pipeline = [
            {
                "$match": {
                    "client_id": {"$in": client_ids},
                    "type": {"$in": ["withdrawal", "momo_withdrawal", "bank_withdrawal"]},
                    "status": {"$in": ["success", "processing", "pending"]},
                    "created_at": {"$gte": today_start.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": "$client_id",
                    "total": {"$sum": "$amount"}
                }
            }
        ]
        
        weekly_pipeline = [
            {
                "$match": {
                    "client_id": {"$in": client_ids},
                    "type": {"$in": ["withdrawal", "momo_withdrawal", "bank_withdrawal"]},
                    "status": {"$in": ["success", "processing", "pending"]},
                    "created_at": {"$gte": week_start.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": "$client_id",
                    "total": {"$sum": "$amount"}
                }
            }
        ]
        
        daily_results = await self.db.service_transactions.aggregate(daily_pipeline).to_list(200)
        weekly_results = await self.db.service_transactions.aggregate(weekly_pipeline).to_list(200)
        
        daily_map = {item["_id"]: item["total"] for item in daily_results}
        weekly_map = {item["_id"]: item["total"] for item in weekly_results}
        
        # Get client info
        clients_info = await self.db.clients.find(
            {"id": {"$in": client_ids}},
            {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1, "card_type": 1}
        ).to_list(200)
        
        clients_map = {c["id"]: c for c in clients_info}
        
        # Build final client list with usage data
        clients = []
        total_daily = 0
        total_weekly = 0
        total_monthly = 0
        at_limit_count = 0
        approaching_limit_count = 0
        
        # Use MoMo limits as default (most common)
        default_limits = global_limits.get("momo", {})
        daily_limit = default_limits.get("daily", 1000)
        weekly_limit = default_limits.get("weekly", 5000)
        monthly_limit = default_limits.get("monthly", 20000)
        
        for item in monthly_usage:
            client_id = item["_id"]
            if not client_id:
                continue
                
            client_info = clients_map.get(client_id, {})
            daily_usage = daily_map.get(client_id, 0)
            weekly_usage = weekly_map.get(client_id, 0)
            monthly_usage_val = item["total_monthly"]
            
            # Calculate percentages
            daily_percent = (daily_usage / daily_limit * 100) if daily_limit > 0 else 0
            weekly_percent = (weekly_usage / weekly_limit * 100) if weekly_limit > 0 else 0
            monthly_percent = (monthly_usage_val / monthly_limit * 100) if monthly_limit > 0 else 0
            
            # Determine status
            max_percent = max(daily_percent, weekly_percent, monthly_percent)
            if max_percent >= 100:
                status = "at_limit"
                at_limit_count += 1
            elif max_percent >= threshold * 100:
                status = "approaching"
                approaching_limit_count += 1
            else:
                status = "normal"
            
            # Filter if requested
            if filter_approaching and max_percent < threshold * 100:
                continue
            
            total_daily += daily_usage
            total_weekly += weekly_usage
            total_monthly += monthly_usage_val
            
            clients.append({
                "client_id": client_id,
                "name": client_info.get("name", "Unknown"),
                "phone": client_info.get("phone", ""),
                "email": client_info.get("email", ""),
                "card_type": client_info.get("card_type", ""),
                "daily_usage": daily_usage,
                "weekly_usage": weekly_usage,
                "monthly_usage": monthly_usage_val,
                "daily_percent": round(daily_percent, 1),
                "weekly_percent": round(weekly_percent, 1),
                "monthly_percent": round(monthly_percent, 1),
                "tx_count": item["tx_count"],
                "last_withdrawal": item["last_withdrawal"],
                "status": status
            })
        
        # Sort based on sort_by parameter
        sort_key_map = {
            "daily_usage": lambda x: x["daily_usage"],
            "weekly_usage": lambda x: x["weekly_usage"],
            "monthly_usage": lambda x: x["monthly_usage"],
            "daily_percent": lambda x: x["daily_percent"],
            "weekly_percent": lambda x: x["weekly_percent"],
            "monthly_percent": lambda x: x["monthly_percent"],
            "tx_count": lambda x: x["tx_count"]
        }
        
        sort_fn = sort_key_map.get(sort_by, sort_key_map["daily_usage"])
        clients.sort(key=sort_fn, reverse=True)
        
        # Apply limit
        clients = clients[:limit]
        
        return {
            "clients": clients,
            "summary": {
                "total_clients_with_activity": len(monthly_usage),
                "clients_at_limit": at_limit_count,
                "clients_approaching_limit": approaching_limit_count,
                "total_daily_volume": total_daily,
                "total_weekly_volume": total_weekly,
                "total_monthly_volume": total_monthly,
                "global_limits": global_limits
            },
            "period": {
                "today_start": today_start.isoformat(),
                "week_start": week_start.isoformat(),
                "month_start": month_start.isoformat()
            }
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
