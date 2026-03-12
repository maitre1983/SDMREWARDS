"""
SDM REWARDS - AI Referral Growth System
========================================
Smart referral timing, message generation, and ambassador tracking
"""

import os
import logging
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Lazy load LLM
_llm_chat = None

def get_llm_chat():
    """Get or create LLM chat instance for referral messages"""
    global _llm_chat
    if _llm_chat is None:
        try:
            from emergentintegrations.llm.chat import LlmChat
            api_key = os.environ.get("EMERGENT_LLM_KEY")
            if not api_key:
                return None
            
            _llm_chat = LlmChat(
                api_key=api_key,
                session_id="sdm-referral-ai",
                system_message="""You are a marketing assistant for SDM REWARDS, a cashback app in Ghana.
Generate short, engaging referral invitation messages.
Messages should be friendly, highlight cashback benefits, and include a call to action.
Keep messages under 160 characters for SMS compatibility.
Adapt tone and language based on the platform (WhatsApp is casual, Email is more formal)."""
            ).with_model("gemini", "gemini-3-flash-preview")
            
        except Exception as e:
            logger.error(f"Failed to initialize LLM for referrals: {e}")
            return None
    return _llm_chat


class ReferralGrowthService:
    """AI-powered referral growth system"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    # ============== REFERRAL TIMING ==============
    
    async def should_prompt_referral(self, client_id: str) -> Dict:
        """
        Determine if this is a good moment to prompt for referral
        Returns timing score and reason
        """
        client = await self.db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            return {"should_prompt": False, "reason": "Client not found"}
        
        # Get recent activity
        now = datetime.now(timezone.utc)
        
        # Check last referral prompt time
        last_prompt = client.get("last_referral_prompt")
        if last_prompt:
            try:
                last_prompt_time = datetime.fromisoformat(last_prompt)
                hours_since_prompt = (now - last_prompt_time).total_seconds() / 3600
                if hours_since_prompt < 24:  # Don't prompt more than once per day
                    return {"should_prompt": False, "reason": "Recently prompted"}
            except:
                pass
        
        # Calculate prompt score based on triggers
        score = 0
        triggers = []
        
        # Trigger 1: Just earned cashback
        recent_cashback = await self.db.transactions.find_one({
            "client_id": client_id,
            "type": {"$in": ["cashback_earned", "welcome_bonus"]},
            "created_at": {"$gte": (now - timedelta(hours=1)).isoformat()}
        })
        if recent_cashback:
            score += 40
            triggers.append("just_earned_cashback")
        
        # Trigger 2: Completed a transaction
        recent_transaction = await self.db.transactions.find_one({
            "client_id": client_id,
            "type": {"$in": ["payment", "merchant_payment"]},
            "status": "completed",
            "created_at": {"$gte": (now - timedelta(minutes=30)).isoformat()}
        })
        if recent_transaction:
            score += 30
            triggers.append("completed_transaction")
        
        # Trigger 3: Haven't referred anyone yet
        if client.get("referral_count", 0) == 0:
            score += 20
            triggers.append("no_referrals_yet")
        
        # Trigger 4: High engagement (multiple transactions this week)
        week_ago = (now - timedelta(days=7)).isoformat()
        weekly_txns = await self.db.transactions.count_documents({
            "client_id": client_id,
            "type": {"$in": ["payment", "merchant_payment"]},
            "created_at": {"$gte": week_ago}
        })
        if weekly_txns >= 3:
            score += 15
            triggers.append("high_engagement")
        
        # Trigger 5: Has good cashback balance (happy customer)
        if client.get("cashback_balance", 0) >= 5:
            score += 10
            triggers.append("positive_balance")
        
        should_prompt = score >= 30
        
        return {
            "should_prompt": should_prompt,
            "score": score,
            "triggers": triggers,
            "reason": ", ".join(triggers) if triggers else "No triggers"
        }
    
    async def record_referral_prompt(self, client_id: str):
        """Record that we prompted for referral"""
        await self.db.clients.update_one(
            {"id": client_id},
            {"$set": {"last_referral_prompt": datetime.now(timezone.utc).isoformat()}}
        )
    
    # ============== MESSAGE GENERATION ==============
    
    async def generate_referral_messages(
        self,
        client_id: str,
        language: str = "en"
    ) -> Dict:
        """Generate personalized referral messages for different platforms"""
        client = await self.db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            return {"success": False, "error": "Client not found"}
        
        referral_code = client.get("referral_code", "")
        client_name = client.get("full_name", "").split()[0]
        total_earned = client.get("total_earned", 0)
        
        # Get platform config for bonus amount
        config = await self.db.platform_config.find_one({"key": "main"})
        bonus = config.get("referee_bonus", 2) if config else 2
        
        # Base referral link
        referral_link = f"https://sdmrewards.com/join?ref={referral_code}"
        
        # Try AI-generated messages
        llm = get_llm_chat()
        
        if llm:
            try:
                from emergentintegrations.llm.chat import UserMessage
                
                prompt = f"""Generate referral invitation messages for SDM REWARDS cashback app.

User info:
- Name: {client_name}
- Total cashback earned: GHS {total_earned:.2f}
- New user bonus: GHS {bonus}
- Referral link: {referral_link}

Language: {'French' if language == 'fr' else 'English'}

Generate 4 messages for:
1. WhatsApp (casual, with emoji, ~100 chars)
2. SMS (brief, ~140 chars, no link - will be added separately)
3. Email subject line (~50 chars)
4. Email body (2-3 sentences, friendly but professional)

Format as JSON with keys: whatsapp, sms, email_subject, email_body"""

                response = await llm.send_message(UserMessage(text=prompt))
                
                # Parse response
                json_str = response
                if "```json" in response:
                    json_str = response.split("```json")[1].split("```")[0]
                elif "```" in response:
                    json_str = response.split("```")[1].split("```")[0]
                
                messages = json.loads(json_str.strip())
                
                return {
                    "success": True,
                    "ai_generated": True,
                    "messages": {
                        "whatsapp": messages.get("whatsapp", ""),
                        "sms": messages.get("sms", ""),
                        "email_subject": messages.get("email_subject", ""),
                        "email_body": messages.get("email_body", ""),
                        "telegram": messages.get("whatsapp", "")  # Same as WhatsApp
                    },
                    "referral_link": referral_link,
                    "referral_code": referral_code
                }
                
            except Exception as e:
                logger.error(f"AI message generation error: {e}")
        
        # Fallback templates
        if language == "fr":
            messages = {
                "whatsapp": f"🎉 Rejoins SDM REWARDS et gagne {bonus} GHS de bonus! J'ai déjà gagné {total_earned:.0f} GHS en cashback. Utilise mon code: {referral_code}",
                "sms": f"Gagne {bonus} GHS en rejoignant SDM REWARDS! Code: {referral_code}. Cashback sur tous tes achats!",
                "email_subject": f"{client_name} t'invite sur SDM REWARDS - {bonus} GHS offerts!",
                "email_body": f"Salut!\n\nJe voulais te parler de SDM REWARDS, une super app de cashback. J'ai déjà gagné {total_earned:.0f} GHS!\n\nUtilise mon code {referral_code} et reçois {bonus} GHS de bonus.\n\n{referral_link}",
                "telegram": f"🎉 Rejoins SDM REWARDS et gagne {bonus} GHS de bonus! Code: {referral_code}"
            }
        else:
            messages = {
                "whatsapp": f"🎉 Join SDM REWARDS and get GHS {bonus} bonus! I've earned GHS {total_earned:.0f} in cashback. Use my code: {referral_code}",
                "sms": f"Get GHS {bonus} joining SDM REWARDS! Code: {referral_code}. Cashback on all purchases!",
                "email_subject": f"{client_name} invited you to SDM REWARDS - GHS {bonus} free!",
                "email_body": f"Hey!\n\nI wanted to tell you about SDM REWARDS, an amazing cashback app. I've already earned GHS {total_earned:.0f}!\n\nUse my code {referral_code} and get GHS {bonus} bonus.\n\n{referral_link}",
                "telegram": f"🎉 Join SDM REWARDS and get GHS {bonus} bonus! Code: {referral_code}"
            }
        
        return {
            "success": True,
            "ai_generated": False,
            "messages": messages,
            "referral_link": referral_link,
            "referral_code": referral_code
        }
    
    # ============== SHARE TRACKING ==============
    
    async def track_share(
        self,
        client_id: str,
        platform: str,  # whatsapp, sms, email, telegram, copy
        success: bool = True
    ) -> Dict:
        """Track when a user shares their referral"""
        await self.db.referral_shares.insert_one({
            "client_id": client_id,
            "platform": platform,
            "success": success,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Update mission progress
        from services.gamification_service import GamificationService
        gam_service = GamificationService(self.db)
        await gam_service.update_mission_progress(client_id, "share", 1)
        
        return {"success": True, "tracked": True}
    
    async def get_share_stats(self, client_id: str) -> Dict:
        """Get sharing statistics for a client"""
        shares = await self.db.referral_shares.find(
            {"client_id": client_id}
        ).to_list(1000)
        
        by_platform = {}
        for share in shares:
            platform = share.get("platform", "unknown")
            by_platform[platform] = by_platform.get(platform, 0) + 1
        
        return {
            "total_shares": len(shares),
            "by_platform": by_platform
        }
    
    # ============== AMBASSADOR SYSTEM ==============
    
    async def check_ambassador_status(self, client_id: str) -> Dict:
        """Check if user qualifies for Ambassador status"""
        client = await self.db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            return {"success": False, "error": "Client not found"}
        
        referral_count = client.get("referral_count", 0)
        is_ambassador = client.get("is_ambassador", False)
        
        # Ambassador criteria
        AMBASSADOR_THRESHOLD = 25  # 25 referrals to become Ambassador
        
        qualifies = referral_count >= AMBASSADOR_THRESHOLD
        
        # Auto-promote to Ambassador if qualified
        if qualifies and not is_ambassador:
            await self.db.clients.update_one(
                {"id": client_id},
                {
                    "$set": {
                        "is_ambassador": True,
                        "ambassador_since": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            is_ambassador = True
        
        return {
            "is_ambassador": is_ambassador,
            "referral_count": referral_count,
            "threshold": AMBASSADOR_THRESHOLD,
            "progress": min(100, (referral_count / AMBASSADOR_THRESHOLD) * 100),
            "referrals_needed": max(0, AMBASSADOR_THRESHOLD - referral_count),
            "benefits": [
                "15% cashback bonus",
                "Priority support",
                "Exclusive Ambassador badge",
                "Monthly surprise gifts",
                "Revenue sharing program"
            ] if is_ambassador else []
        }
    
    async def get_ambassador_leaderboard(self, limit: int = 20) -> List[Dict]:
        """Get top ambassadors by referral count"""
        ambassadors = await self.db.clients.find(
            {"is_ambassador": True},
            {"_id": 0, "id": 1, "full_name": 1, "username": 1, "referral_count": 1, "ambassador_since": 1}
        ).sort("referral_count", -1).limit(limit).to_list(limit)
        
        result = []
        for i, amb in enumerate(ambassadors, 1):
            result.append({
                "rank": i,
                "client_id": amb["id"],
                "name": amb.get("full_name", "Anonymous"),
                "username": amb.get("username"),
                "referral_count": amb.get("referral_count", 0),
                "ambassador_since": amb.get("ambassador_since")
            })
        
        return result
    
    # ============== SMART REFERRAL PROMPTS ==============
    
    async def get_referral_prompt_data(self, client_id: str, language: str = "en") -> Dict:
        """Get all data needed for a referral prompt UI"""
        # Check if should prompt
        timing = await self.should_prompt_referral(client_id)
        
        # Generate messages
        messages = await self.generate_referral_messages(client_id, language)
        
        # Get ambassador status
        ambassador = await self.check_ambassador_status(client_id)
        
        # Get share stats
        share_stats = await self.get_share_stats(client_id)
        
        # Get client referral info
        client = await self.db.clients.find_one(
            {"id": client_id},
            {"_id": 0, "referral_code": 1, "referral_count": 1, "total_referral_earnings": 1}
        )
        
        return {
            "should_show_prompt": timing.get("should_prompt", False),
            "prompt_triggers": timing.get("triggers", []),
            "messages": messages.get("messages", {}),
            "referral_link": messages.get("referral_link", ""),
            "referral_code": client.get("referral_code", "") if client else "",
            "referral_count": client.get("referral_count", 0) if client else 0,
            "total_earnings": client.get("total_referral_earnings", 0) if client else 0,
            "ambassador_status": ambassador,
            "share_stats": share_stats
        }
