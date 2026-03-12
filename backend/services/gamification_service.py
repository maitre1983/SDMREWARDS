"""
SDM REWARDS - Gamification System
==================================
Missions, XP, Levels, Badges, and Rewards
"""

import os
import logging
import json
import random
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

logger = logging.getLogger(__name__)

# ============== LEVEL CONFIGURATION ==============
LEVELS = {
    1: {
        "name": "SDM Starter",
        "min_xp": 0,
        "max_xp": 499,
        "color": "#94a3b8",  # Slate
        "icon": "star",
        "cashback_bonus": 0,  # % bonus on cashback
        "perks": ["Basic cashback", "Standard support"]
    },
    2: {
        "name": "SDM Builder",
        "min_xp": 500,
        "max_xp": 1499,
        "color": "#22c55e",  # Green
        "icon": "trending-up",
        "cashback_bonus": 2,
        "perks": ["2% cashback bonus", "Priority support", "Weekly missions"]
    },
    3: {
        "name": "SDM Pro",
        "min_xp": 1500,
        "max_xp": 3999,
        "color": "#3b82f6",  # Blue
        "icon": "zap",
        "cashback_bonus": 5,
        "perks": ["5% cashback bonus", "Exclusive offers", "Monthly rewards"]
    },
    4: {
        "name": "SDM Elite",
        "min_xp": 4000,
        "max_xp": 9999,
        "color": "#a855f7",  # Purple
        "icon": "crown",
        "cashback_bonus": 10,
        "perks": ["10% cashback bonus", "VIP support", "Special events access"]
    },
    5: {
        "name": "SDM Ambassador",
        "min_xp": 10000,
        "max_xp": float('inf'),
        "color": "#f59e0b",  # Amber/Gold
        "icon": "award",
        "cashback_bonus": 15,
        "perks": ["15% cashback bonus", "Ambassador badge", "Revenue sharing", "Surprise gifts"]
    }
}

# ============== BADGE DEFINITIONS ==============
BADGES = {
    "first_transaction": {
        "id": "first_transaction",
        "name": "First Steps",
        "name_fr": "Premiers Pas",
        "description": "Complete your first transaction",
        "description_fr": "Effectuez votre première transaction",
        "icon": "shopping-bag",
        "color": "#22c55e",
        "xp_reward": 50
    },
    "referral_starter": {
        "id": "referral_starter",
        "name": "Connector",
        "name_fr": "Connecteur",
        "description": "Invite your first friend",
        "description_fr": "Invitez votre premier ami",
        "icon": "user-plus",
        "color": "#3b82f6",
        "xp_reward": 100
    },
    "referral_pro": {
        "id": "referral_pro",
        "name": "Network Builder",
        "name_fr": "Bâtisseur de Réseau",
        "description": "Invite 10 friends",
        "description_fr": "Invitez 10 amis",
        "icon": "users",
        "color": "#a855f7",
        "xp_reward": 500
    },
    "referral_master": {
        "id": "referral_master",
        "name": "Community Leader",
        "name_fr": "Leader Communautaire",
        "description": "Invite 50 friends",
        "description_fr": "Invitez 50 amis",
        "icon": "crown",
        "color": "#f59e0b",
        "xp_reward": 2000
    },
    "big_spender": {
        "id": "big_spender",
        "name": "Big Spender",
        "name_fr": "Grand Dépensier",
        "description": "Spend over GHS 1000",
        "description_fr": "Dépensez plus de 1000 GHS",
        "icon": "wallet",
        "color": "#ec4899",
        "xp_reward": 300
    },
    "loyal_customer": {
        "id": "loyal_customer",
        "name": "Loyal Customer",
        "name_fr": "Client Fidèle",
        "description": "Make 50 transactions",
        "description_fr": "Effectuez 50 transactions",
        "icon": "heart",
        "color": "#ef4444",
        "xp_reward": 500
    },
    "mission_hunter": {
        "id": "mission_hunter",
        "name": "Mission Hunter",
        "name_fr": "Chasseur de Missions",
        "description": "Complete 10 missions",
        "description_fr": "Complétez 10 missions",
        "icon": "target",
        "color": "#14b8a6",
        "xp_reward": 200
    },
    "streak_master": {
        "id": "streak_master",
        "name": "Streak Master",
        "name_fr": "Maître des Séries",
        "description": "7-day activity streak",
        "description_fr": "Série d'activité de 7 jours",
        "icon": "flame",
        "color": "#f97316",
        "xp_reward": 300
    },
    "early_adopter": {
        "id": "early_adopter",
        "name": "Early Adopter",
        "name_fr": "Pionnier",
        "description": "Joined during beta phase",
        "description_fr": "Rejoint pendant la phase beta",
        "icon": "rocket",
        "color": "#6366f1",
        "xp_reward": 100
    },
    "cashback_king": {
        "id": "cashback_king",
        "name": "Cashback King",
        "name_fr": "Roi du Cashback",
        "description": "Earn over GHS 100 cashback",
        "description_fr": "Gagnez plus de 100 GHS de cashback",
        "icon": "dollar-sign",
        "color": "#10b981",
        "xp_reward": 400
    }
}

# ============== MISSION TEMPLATES ==============
MISSION_TEMPLATES = {
    "daily": [
        {
            "id": "daily_transaction",
            "type": "transaction",
            "name": "Daily Shopper",
            "name_fr": "Acheteur du Jour",
            "description": "Make 1 transaction today",
            "description_fr": "Effectuez 1 transaction aujourd'hui",
            "target": 1,
            "xp_reward": 20,
            "cashback_reward": 0.5,
            "difficulty": "easy"
        },
        {
            "id": "daily_spend",
            "type": "spend",
            "name": "Spend GHS 20",
            "name_fr": "Dépensez 20 GHS",
            "description": "Spend at least GHS 20 today",
            "description_fr": "Dépensez au moins 20 GHS aujourd'hui",
            "target": 20,
            "xp_reward": 30,
            "cashback_reward": 1,
            "difficulty": "easy"
        },
        {
            "id": "daily_share",
            "type": "share",
            "name": "Share the Love",
            "name_fr": "Partagez l'Amour",
            "description": "Share your referral link once",
            "description_fr": "Partagez votre lien de parrainage",
            "target": 1,
            "xp_reward": 15,
            "cashback_reward": 0,
            "difficulty": "easy"
        }
    ],
    "weekly": [
        {
            "id": "weekly_transactions",
            "type": "transaction",
            "name": "Weekly Warrior",
            "name_fr": "Guerrier de la Semaine",
            "description": "Make 5 transactions this week",
            "description_fr": "Effectuez 5 transactions cette semaine",
            "target": 5,
            "xp_reward": 100,
            "cashback_reward": 3,
            "difficulty": "medium"
        },
        {
            "id": "weekly_referral",
            "type": "referral",
            "name": "Bring a Friend",
            "name_fr": "Amenez un Ami",
            "description": "Invite 1 new friend this week",
            "description_fr": "Invitez 1 nouvel ami cette semaine",
            "target": 1,
            "xp_reward": 150,
            "cashback_reward": 5,
            "difficulty": "medium"
        },
        {
            "id": "weekly_spend",
            "type": "spend",
            "name": "Big Spender Week",
            "name_fr": "Semaine du Grand Dépensier",
            "description": "Spend GHS 100 this week",
            "description_fr": "Dépensez 100 GHS cette semaine",
            "target": 100,
            "xp_reward": 150,
            "cashback_reward": 5,
            "difficulty": "medium"
        }
    ],
    "special": [
        {
            "id": "special_referral_spree",
            "type": "referral",
            "name": "Referral Spree",
            "name_fr": "Folie de Parrainages",
            "description": "Invite 5 friends in 7 days",
            "description_fr": "Invitez 5 amis en 7 jours",
            "target": 5,
            "xp_reward": 500,
            "cashback_reward": 15,
            "difficulty": "hard"
        },
        {
            "id": "special_merchant_explorer",
            "type": "unique_merchants",
            "name": "Merchant Explorer",
            "name_fr": "Explorateur de Marchands",
            "description": "Shop at 3 different merchants",
            "description_fr": "Achetez chez 3 marchands différents",
            "target": 3,
            "xp_reward": 200,
            "cashback_reward": 5,
            "difficulty": "medium"
        }
    ]
}

# ============== SURPRISE GIFTS ==============
SURPRISE_GIFTS = [
    {"type": "cashback", "amount": 5, "name": "Bonus Cashback GHS 5"},
    {"type": "cashback", "amount": 10, "name": "Bonus Cashback GHS 10"},
    {"type": "xp", "amount": 100, "name": "100 Bonus XP"},
    {"type": "xp", "amount": 250, "name": "250 Bonus XP"},
    {"type": "badge", "badge_id": "lucky_winner", "name": "Lucky Winner Badge"},
    {"type": "free_transaction", "amount": 1, "name": "1 Free Transaction Fee"}
]


class GamificationService:
    """Service for gamification features"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    # ============== XP & LEVELS ==============
    
    def calculate_level(self, xp: int) -> Dict:
        """Calculate level from XP"""
        for level_num, level_data in LEVELS.items():
            if level_data["min_xp"] <= xp <= level_data["max_xp"]:
                progress = 0
                if level_data["max_xp"] != float('inf'):
                    range_xp = level_data["max_xp"] - level_data["min_xp"]
                    current_in_level = xp - level_data["min_xp"]
                    progress = (current_in_level / range_xp) * 100
                
                next_level = LEVELS.get(level_num + 1)
                xp_to_next = next_level["min_xp"] - xp if next_level else 0
                
                return {
                    "level": level_num,
                    "name": level_data["name"],
                    "color": level_data["color"],
                    "icon": level_data["icon"],
                    "progress": round(progress, 1),
                    "xp_to_next_level": xp_to_next,
                    "cashback_bonus": level_data["cashback_bonus"],
                    "perks": level_data["perks"],
                    "next_level": next_level["name"] if next_level else None
                }
        
        # Default to highest level
        return {
            "level": 5,
            "name": LEVELS[5]["name"],
            "color": LEVELS[5]["color"],
            "icon": LEVELS[5]["icon"],
            "progress": 100,
            "xp_to_next_level": 0,
            "cashback_bonus": LEVELS[5]["cashback_bonus"],
            "perks": LEVELS[5]["perks"],
            "next_level": None
        }
    
    async def get_client_gamification_data(self, client_id: str) -> Dict:
        """Get complete gamification data for a client"""
        # Get or create gamification record
        gam_data = await self.db.gamification.find_one(
            {"client_id": client_id},
            {"_id": 0}
        )
        
        if not gam_data:
            # Initialize gamification data
            gam_data = {
                "client_id": client_id,
                "xp": 0,
                "badges": [],
                "missions_completed": 0,
                "current_streak": 0,
                "longest_streak": 0,
                "last_activity_date": None,
                "total_referrals": 0,
                "surprise_gifts_received": 0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await self.db.gamification.insert_one({**gam_data})
            gam_data.pop("_id", None)
        
        # Calculate level
        level_info = self.calculate_level(gam_data.get("xp", 0))
        
        return {
            "xp": gam_data.get("xp", 0),
            "level": level_info,
            "badges": gam_data.get("badges", []),
            "missions_completed": gam_data.get("missions_completed", 0),
            "current_streak": gam_data.get("current_streak", 0),
            "longest_streak": gam_data.get("longest_streak", 0),
            "total_referrals": gam_data.get("total_referrals", 0)
        }
    
    async def add_xp(self, client_id: str, amount: int, reason: str) -> Dict:
        """Add XP to a client and check for level up"""
        # Get current data
        gam_data = await self.db.gamification.find_one({"client_id": client_id})
        current_xp = gam_data.get("xp", 0) if gam_data else 0
        current_level = self.calculate_level(current_xp)["level"]
        
        new_xp = current_xp + amount
        new_level_info = self.calculate_level(new_xp)
        
        # Update database
        await self.db.gamification.update_one(
            {"client_id": client_id},
            {
                "$set": {"xp": new_xp},
                "$push": {
                    "xp_history": {
                        "amount": amount,
                        "reason": reason,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                }
            },
            upsert=True
        )
        
        # Check for level up
        leveled_up = new_level_info["level"] > current_level
        
        return {
            "success": True,
            "xp_added": amount,
            "new_xp": new_xp,
            "new_level": new_level_info,
            "leveled_up": leveled_up,
            "old_level": current_level if leveled_up else None
        }
    
    # ============== BADGES ==============
    
    async def award_badge(self, client_id: str, badge_id: str) -> Dict:
        """Award a badge to a client"""
        if badge_id not in BADGES:
            return {"success": False, "error": "Invalid badge"}
        
        badge = BADGES[badge_id]
        
        # Check if already has badge
        gam_data = await self.db.gamification.find_one({"client_id": client_id})
        existing_badges = gam_data.get("badges", []) if gam_data else []
        
        if badge_id in [b.get("id") for b in existing_badges]:
            return {"success": False, "error": "Badge already earned"}
        
        # Award badge
        badge_record = {
            **badge,
            "earned_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.gamification.update_one(
            {"client_id": client_id},
            {
                "$push": {"badges": badge_record},
                "$inc": {"xp": badge["xp_reward"]}
            },
            upsert=True
        )
        
        return {
            "success": True,
            "badge": badge,
            "xp_reward": badge["xp_reward"]
        }
    
    async def check_and_award_badges(self, client_id: str) -> List[Dict]:
        """Check all badge conditions and award earned badges"""
        awarded = []
        
        # Get client stats
        client = await self.db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            return awarded
        
        gam_data = await self.db.gamification.find_one({"client_id": client_id})
        existing_badges = [b.get("id") for b in gam_data.get("badges", [])] if gam_data else []
        
        # Count transactions
        txn_count = await self.db.transactions.count_documents({
            "client_id": client_id,
            "type": {"$in": ["payment", "merchant_payment"]},
            "status": "completed"
        })
        
        total_spent = client.get("total_spent", 0)
        total_cashback = client.get("total_earned", 0)
        referral_count = client.get("referral_count", 0)
        
        # Check badge conditions
        badge_checks = [
            ("first_transaction", txn_count >= 1),
            ("referral_starter", referral_count >= 1),
            ("referral_pro", referral_count >= 10),
            ("referral_master", referral_count >= 50),
            ("big_spender", total_spent >= 1000),
            ("loyal_customer", txn_count >= 50),
            ("cashback_king", total_cashback >= 100),
        ]
        
        for badge_id, condition in badge_checks:
            if condition and badge_id not in existing_badges:
                result = await self.award_badge(client_id, badge_id)
                if result.get("success"):
                    awarded.append(result["badge"])
        
        return awarded
    
    # ============== MISSIONS ==============
    
    async def get_active_missions(self, client_id: str, language: str = "en") -> Dict:
        """Get active missions for a client"""
        today = datetime.now(timezone.utc).date()
        week_start = today - timedelta(days=today.weekday())
        
        # Get or create daily missions
        daily_missions = await self._get_or_create_missions(
            client_id, "daily", today.isoformat(), language
        )
        
        # Get or create weekly missions
        weekly_missions = await self._get_or_create_missions(
            client_id, "weekly", week_start.isoformat(), language
        )
        
        # Get active special missions
        special_missions = await self.db.client_missions.find({
            "client_id": client_id,
            "period": "special",
            "status": {"$in": ["active", "in_progress"]},
            "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
        }, {"_id": 0}).to_list(10)
        
        return {
            "daily": daily_missions,
            "weekly": weekly_missions,
            "special": special_missions
        }
    
    async def _get_or_create_missions(
        self,
        client_id: str,
        period: str,
        period_key: str,
        language: str
    ) -> List[Dict]:
        """Get existing missions or create new ones for the period"""
        # Check for existing missions
        existing = await self.db.client_missions.find({
            "client_id": client_id,
            "period": period,
            "period_key": period_key
        }, {"_id": 0}).to_list(10)
        
        if existing:
            return existing
        
        # Create new missions from templates
        templates = MISSION_TEMPLATES.get(period, [])
        missions = []
        
        for template in templates:
            mission = {
                "id": f"{template['id']}_{period_key}_{client_id[:8]}",
                "client_id": client_id,
                "template_id": template["id"],
                "period": period,
                "period_key": period_key,
                "type": template["type"],
                "name": template.get(f"name_{language[:2]}", template["name"]),
                "description": template.get(f"description_{language[:2]}", template["description"]),
                "target": template["target"],
                "progress": 0,
                "xp_reward": template["xp_reward"],
                "cashback_reward": template["cashback_reward"],
                "difficulty": template["difficulty"],
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": self._calculate_expiry(period)
            }
            missions.append(mission)
        
        # Insert missions
        if missions:
            await self.db.client_missions.insert_many(missions)
        
        return missions
    
    def _calculate_expiry(self, period: str) -> str:
        """Calculate mission expiry based on period"""
        now = datetime.now(timezone.utc)
        
        if period == "daily":
            expiry = now.replace(hour=23, minute=59, second=59) + timedelta(days=1)
        elif period == "weekly":
            days_until_sunday = 6 - now.weekday()
            expiry = now + timedelta(days=days_until_sunday + 1)
            expiry = expiry.replace(hour=23, minute=59, second=59)
        else:  # special
            expiry = now + timedelta(days=7)
        
        return expiry.isoformat()
    
    async def update_mission_progress(
        self,
        client_id: str,
        mission_type: str,
        increment: float = 1
    ) -> List[Dict]:
        """Update progress for missions of a specific type"""
        completed_missions = []
        
        # Find active missions of this type
        missions = await self.db.client_missions.find({
            "client_id": client_id,
            "type": mission_type,
            "status": {"$in": ["active", "in_progress"]},
            "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
        }).to_list(20)
        
        for mission in missions:
            new_progress = mission.get("progress", 0) + increment
            target = mission.get("target", 1)
            
            if new_progress >= target:
                # Mission completed!
                await self.db.client_missions.update_one(
                    {"id": mission["id"]},
                    {
                        "$set": {
                            "progress": target,
                            "status": "completed",
                            "completed_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                # Award rewards
                await self.add_xp(client_id, mission["xp_reward"], f"Mission: {mission['name']}")
                
                if mission.get("cashback_reward", 0) > 0:
                    await self.db.clients.update_one(
                        {"id": client_id},
                        {"$inc": {"cashback_balance": mission["cashback_reward"]}}
                    )
                
                # Update missions completed count
                await self.db.gamification.update_one(
                    {"client_id": client_id},
                    {"$inc": {"missions_completed": 1}},
                    upsert=True
                )
                
                completed_missions.append({
                    "mission": mission,
                    "xp_earned": mission["xp_reward"],
                    "cashback_earned": mission.get("cashback_reward", 0)
                })
            else:
                # Update progress
                await self.db.client_missions.update_one(
                    {"id": mission["id"]},
                    {
                        "$set": {
                            "progress": new_progress,
                            "status": "in_progress"
                        }
                    }
                )
        
        return completed_missions
    
    # ============== LEADERBOARD ==============
    
    async def get_leaderboard(self, leaderboard_type: str = "xp", limit: int = 20) -> List[Dict]:
        """Get leaderboard rankings"""
        if leaderboard_type == "xp":
            # XP leaderboard
            rankings = await self.db.gamification.find(
                {},
                {"_id": 0, "client_id": 1, "xp": 1}
            ).sort("xp", -1).limit(limit).to_list(limit)
            
            # Enrich with client data
            result = []
            for i, rank in enumerate(rankings, 1):
                client = await self.db.clients.find_one(
                    {"id": rank["client_id"]},
                    {"_id": 0, "full_name": 1, "username": 1}
                )
                if client:
                    level_info = self.calculate_level(rank.get("xp", 0))
                    result.append({
                        "rank": i,
                        "client_id": rank["client_id"],
                        "name": client.get("full_name", "Anonymous"),
                        "username": client.get("username"),
                        "xp": rank.get("xp", 0),
                        "level": level_info
                    })
            
            return result
        
        elif leaderboard_type == "referrals":
            # Referral leaderboard
            rankings = await self.db.clients.find(
                {"referral_count": {"$gt": 0}},
                {"_id": 0, "id": 1, "full_name": 1, "username": 1, "referral_count": 1}
            ).sort("referral_count", -1).limit(limit).to_list(limit)
            
            result = []
            for i, client in enumerate(rankings, 1):
                gam_data = await self.db.gamification.find_one(
                    {"client_id": client["id"]},
                    {"xp": 1}
                )
                level_info = self.calculate_level(gam_data.get("xp", 0) if gam_data else 0)
                
                result.append({
                    "rank": i,
                    "client_id": client["id"],
                    "name": client.get("full_name", "Anonymous"),
                    "username": client.get("username"),
                    "referral_count": client.get("referral_count", 0),
                    "level": level_info
                })
            
            return result
        
        return []
    
    async def get_client_rank(self, client_id: str, leaderboard_type: str = "xp") -> Dict:
        """Get a specific client's rank"""
        if leaderboard_type == "xp":
            gam_data = await self.db.gamification.find_one({"client_id": client_id})
            client_xp = gam_data.get("xp", 0) if gam_data else 0
            
            # Count users with more XP
            rank = await self.db.gamification.count_documents({"xp": {"$gt": client_xp}}) + 1
            total = await self.db.gamification.count_documents({})
            
            return {
                "rank": rank,
                "total_users": total,
                "percentile": round((1 - rank / total) * 100, 1) if total > 0 else 0,
                "xp": client_xp
            }
        
        elif leaderboard_type == "referrals":
            client = await self.db.clients.find_one({"id": client_id})
            referral_count = client.get("referral_count", 0) if client else 0
            
            rank = await self.db.clients.count_documents({
                "referral_count": {"$gt": referral_count}
            }) + 1
            total = await self.db.clients.count_documents({"referral_count": {"$gt": 0}})
            
            return {
                "rank": rank,
                "total_users": total,
                "percentile": round((1 - rank / total) * 100, 1) if total > 0 else 0,
                "referral_count": referral_count
            }
        
        return {}
    
    # ============== SURPRISE GIFTS ==============
    
    async def check_and_award_surprise_gift(self, client_id: str) -> Optional[Dict]:
        """Randomly award a surprise gift (for Ambassadors or special occasions)"""
        gam_data = await self.db.gamification.find_one({"client_id": client_id})
        if not gam_data:
            return None
        
        level_info = self.calculate_level(gam_data.get("xp", 0))
        
        # Only Ambassadors get surprise gifts, with 5% chance
        if level_info["level"] < 5 or random.random() > 0.05:
            return None
        
        # Select random gift
        gift = random.choice(SURPRISE_GIFTS)
        
        # Apply gift
        if gift["type"] == "cashback":
            await self.db.clients.update_one(
                {"id": client_id},
                {"$inc": {"cashback_balance": gift["amount"]}}
            )
        elif gift["type"] == "xp":
            await self.add_xp(client_id, gift["amount"], "Surprise Gift")
        elif gift["type"] == "badge" and gift.get("badge_id"):
            await self.award_badge(client_id, gift["badge_id"])
        
        # Record gift
        await self.db.gamification.update_one(
            {"client_id": client_id},
            {
                "$inc": {"surprise_gifts_received": 1},
                "$push": {
                    "gifts_history": {
                        "gift": gift,
                        "awarded_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            }
        )
        
        return gift
    
    # ============== STREAK TRACKING ==============
    
    async def update_activity_streak(self, client_id: str) -> Dict:
        """Update user's activity streak"""
        gam_data = await self.db.gamification.find_one({"client_id": client_id})
        
        today = datetime.now(timezone.utc).date()
        last_activity = None
        
        if gam_data and gam_data.get("last_activity_date"):
            try:
                last_activity = datetime.fromisoformat(gam_data["last_activity_date"]).date()
            except:
                pass
        
        current_streak = gam_data.get("current_streak", 0) if gam_data else 0
        longest_streak = gam_data.get("longest_streak", 0) if gam_data else 0
        
        if last_activity:
            days_diff = (today - last_activity).days
            
            if days_diff == 0:
                # Same day, no change
                pass
            elif days_diff == 1:
                # Consecutive day, increase streak
                current_streak += 1
            else:
                # Streak broken
                current_streak = 1
        else:
            current_streak = 1
        
        # Update longest streak
        if current_streak > longest_streak:
            longest_streak = current_streak
        
        # Update database
        await self.db.gamification.update_one(
            {"client_id": client_id},
            {
                "$set": {
                    "current_streak": current_streak,
                    "longest_streak": longest_streak,
                    "last_activity_date": today.isoformat()
                }
            },
            upsert=True
        )
        
        # Check for streak badge
        if current_streak >= 7:
            await self.award_badge(client_id, "streak_master")
        
        return {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "streak_bonus_xp": current_streak * 5 if current_streak > 1 else 0
        }
