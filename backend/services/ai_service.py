"""
SDM REWARDS - AI Service
=========================
AI-powered analysis for transactions, recommendations, and fraud detection
Using Gemini via Emergent LLM Key
"""

import os
import logging
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Lazy load emergent integrations
_llm_chat = None

def get_llm_chat():
    """Get or create LLM chat instance"""
    global _llm_chat
    if _llm_chat is None:
        try:
            from emergentintegrations.llm.chat import LlmChat
            api_key = os.environ.get("EMERGENT_LLM_KEY")
            if not api_key:
                logger.error("EMERGENT_LLM_KEY not found in environment")
                return None
            
            _llm_chat = LlmChat(
                api_key=api_key,
                session_id="sdm-ai-service",
                system_message="""You are an AI financial assistant for SDM REWARDS, a cashback and loyalty platform in Ghana.
                
Your role is to:
1. Analyze user spending patterns and habits
2. Recommend merchants and cashback opportunities
3. Provide personalized tips to maximize savings
4. Detect unusual transaction patterns that might indicate fraud

Always respond in the user's detected language (English or French).
Be concise, helpful, and focused on helping users save money.
Format responses with clear sections and bullet points when appropriate.
Use GHS (Ghana Cedis) for currency."""
            ).with_model("gemini", "gemini-3-flash-preview")
            
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {e}")
            return None
    return _llm_chat


class AIService:
    """AI Service for SDM REWARDS platform"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_client_transaction_summary(self, client_id: str, days: int = 90) -> Dict:
        """Get transaction summary for AI analysis"""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        cutoff_str = cutoff.isoformat()
        
        # Get transactions
        transactions = await self.db.transactions.find({
            "client_id": client_id,
            "status": "completed",
            "created_at": {"$gte": cutoff_str}
        }, {"_id": 0}).to_list(500)
        
        if not transactions:
            return {
                "total_transactions": 0,
                "total_spent": 0,
                "total_cashback": 0,
                "merchants_visited": [],
                "payment_methods": {},
                "daily_average": 0,
                "transactions": []
            }
        
        # Analyze transactions
        total_spent = 0
        total_cashback = 0
        merchants = {}
        payment_methods = {}
        
        for txn in transactions:
            if txn.get("type") in ["payment", "merchant_payment"]:
                amount = txn.get("amount", 0)
                total_spent += amount
                
                merchant_name = txn.get("merchant_name", "Unknown")
                if merchant_name not in merchants:
                    merchants[merchant_name] = {"count": 0, "total": 0}
                merchants[merchant_name]["count"] += 1
                merchants[merchant_name]["total"] += amount
                
                method = txn.get("payment_method", "unknown")
                payment_methods[method] = payment_methods.get(method, 0) + 1
            
            if txn.get("type") in ["cashback_earned", "welcome_bonus", "referral_bonus"]:
                total_cashback += txn.get("amount", 0)
            elif txn.get("cashback_amount"):
                total_cashback += txn.get("cashback_amount", 0)
        
        # Sort merchants by visit count
        sorted_merchants = sorted(
            [{"name": k, **v} for k, v in merchants.items()],
            key=lambda x: x["count"],
            reverse=True
        )[:10]
        
        return {
            "total_transactions": len([t for t in transactions if t.get("type") in ["payment", "merchant_payment"]]),
            "total_spent": round(total_spent, 2),
            "total_cashback": round(total_cashback, 2),
            "merchants_visited": sorted_merchants,
            "payment_methods": payment_methods,
            "daily_average": round(total_spent / days, 2) if days > 0 else 0,
            "period_days": days,
            "transactions": transactions[-20:]  # Last 20 for context
        }
    
    async def get_top_merchants(self, limit: int = 10) -> List[Dict]:
        """Get top merchants by volume for recommendations"""
        merchants = await self.db.merchants.find(
            {"status": "active"},
            {
                "_id": 0,
                "id": 1,
                "business_name": 1,
                "business_type": 1,
                "cashback_rate": 1,
                "total_transactions": 1,
                "total_volume": 1
            }
        ).sort("total_transactions", -1).limit(limit).to_list(limit)
        
        return merchants
    
    async def analyze_spending_patterns(self, client_id: str, language: str = "en") -> Dict:
        """Analyze client spending patterns using AI"""
        summary = await self.get_client_transaction_summary(client_id)
        
        if summary["total_transactions"] == 0:
            return {
                "success": True,
                "has_data": False,
                "message": "No transaction history yet. Start shopping with SDM REWARDS partners to get personalized insights!" if language == "en" else "Pas encore d'historique de transactions. Commencez à acheter chez les partenaires SDM REWARDS pour obtenir des insights personnalisés!",
                "insights": None
            }
        
        llm = get_llm_chat()
        if not llm:
            return {
                "success": False,
                "error": "AI service unavailable"
            }
        
        # Prepare prompt
        prompt = f"""Analyze this customer's spending data and provide personalized insights.

SPENDING DATA (Last {summary['period_days']} days):
- Total Transactions: {summary['total_transactions']}
- Total Spent: GHS {summary['total_spent']}
- Total Cashback Earned: GHS {summary['total_cashback']}
- Daily Average: GHS {summary['daily_average']}
- Top Merchants Visited: {json.dumps(summary['merchants_visited'][:5])}
- Payment Methods: {json.dumps(summary['payment_methods'])}

Respond in {'French' if language == 'fr' else 'English'}.

Provide:
1. SPENDING SUMMARY (2-3 sentences)
2. SPENDING PATTERNS (3 key observations)
3. SAVINGS TIPS (3 actionable tips to earn more cashback)
4. SPENDING SCORE (1-100, based on how well they use cashback opportunities)

Format as JSON with keys: summary, patterns (array), tips (array), score (number)"""

        try:
            from emergentintegrations.llm.chat import UserMessage
            response = await llm.send_message(UserMessage(text=prompt))
            
            # Parse JSON response
            try:
                # Extract JSON from response
                json_str = response
                if "```json" in response:
                    json_str = response.split("```json")[1].split("```")[0]
                elif "```" in response:
                    json_str = response.split("```")[1].split("```")[0]
                
                insights = json.loads(json_str.strip())
            except:
                # Fallback to raw response
                insights = {
                    "summary": response[:500],
                    "patterns": [],
                    "tips": [],
                    "score": 50
                }
            
            return {
                "success": True,
                "has_data": True,
                "data": {
                    "total_spent": summary["total_spent"],
                    "total_cashback": summary["total_cashback"],
                    "transactions_count": summary["total_transactions"],
                    "top_merchants": summary["merchants_visited"][:5]
                },
                "insights": insights
            }
            
        except Exception as e:
            logger.error(f"AI analysis error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_merchant_recommendations(self, client_id: str, language: str = "en") -> Dict:
        """Get AI-powered merchant recommendations"""
        # Get client's transaction history
        summary = await self.get_client_transaction_summary(client_id, days=60)
        
        # Get all active merchants
        all_merchants = await self.get_top_merchants(20)
        
        # Get merchants client hasn't visited
        visited_names = [m["name"] for m in summary.get("merchants_visited", [])]
        new_merchants = [m for m in all_merchants if m["business_name"] not in visited_names][:10]
        
        # Get client's favorite categories based on visited merchants
        favorite_merchants = summary.get("merchants_visited", [])[:5]
        
        llm = get_llm_chat()
        if not llm:
            # Fallback without AI
            return {
                "success": True,
                "recommendations": [
                    {
                        "merchant": m,
                        "reason": f"Offers {m.get('cashback_rate', 5)}% cashback" if language == "en" else f"Offre {m.get('cashback_rate', 5)}% de cashback"
                    }
                    for m in new_merchants[:5]
                ],
                "ai_powered": False
            }
        
        # AI-powered recommendations
        prompt = f"""Based on this customer's shopping history, recommend merchants they should try.

CUSTOMER'S FAVORITE MERCHANTS:
{json.dumps(favorite_merchants)}

NEW MERCHANTS TO CONSIDER (customer hasn't visited):
{json.dumps([{"name": m["business_name"], "type": m.get("business_type"), "cashback": m.get("cashback_rate")} for m in new_merchants])}

Respond in {'French' if language == 'fr' else 'English'}.

Select the top 5 merchants to recommend and explain why each would be good for this customer.
Format as JSON array with objects containing: merchant_name, reason, potential_savings_tip"""

        try:
            from emergentintegrations.llm.chat import UserMessage
            response = await llm.send_message(UserMessage(text=prompt))
            
            try:
                json_str = response
                if "```json" in response:
                    json_str = response.split("```json")[1].split("```")[0]
                elif "```" in response:
                    json_str = response.split("```")[1].split("```")[0]
                
                recommendations = json.loads(json_str.strip())
            except:
                recommendations = [
                    {"merchant_name": m["business_name"], "reason": f"High cashback rate of {m.get('cashback_rate', 5)}%"}
                    for m in new_merchants[:5]
                ]
            
            return {
                "success": True,
                "recommendations": recommendations,
                "ai_powered": True
            }
            
        except Exception as e:
            logger.error(f"AI recommendations error: {e}")
            return {
                "success": True,
                "recommendations": [
                    {"merchant_name": m["business_name"], "reason": f"Offers {m.get('cashback_rate', 5)}% cashback"}
                    for m in new_merchants[:5]
                ],
                "ai_powered": False
            }
    
    async def detect_fraud_patterns(self, client_id: str) -> Dict:
        """Detect unusual transaction patterns"""
        # Get recent transactions (last 7 days)
        recent = await self.get_client_transaction_summary(client_id, days=7)
        # Get historical baseline (30-90 days ago)
        historical = await self.get_client_transaction_summary(client_id, days=90)
        
        alerts = []
        risk_score = 0
        
        if historical["total_transactions"] < 5:
            return {
                "success": True,
                "risk_score": 0,
                "alerts": [],
                "message": "Not enough transaction history for fraud analysis"
            }
        
        # Check for unusual patterns
        historical_daily_avg = historical["daily_average"]
        recent_daily_avg = recent["total_spent"] / 7 if recent["total_transactions"] > 0 else 0
        
        # 1. Sudden spike in spending
        if historical_daily_avg > 0 and recent_daily_avg > historical_daily_avg * 3:
            alerts.append({
                "type": "spending_spike",
                "severity": "medium",
                "message": f"Spending is {round(recent_daily_avg / historical_daily_avg, 1)}x higher than usual"
            })
            risk_score += 30
        
        # 2. Check for rapid successive transactions
        recent_txns = recent.get("transactions", [])
        if len(recent_txns) >= 3:
            # Check for 3+ transactions within 1 hour
            for i in range(len(recent_txns) - 2):
                try:
                    t1 = datetime.fromisoformat(recent_txns[i].get("created_at", ""))
                    t3 = datetime.fromisoformat(recent_txns[i+2].get("created_at", ""))
                    if (t3 - t1).total_seconds() < 3600:  # 1 hour
                        alerts.append({
                            "type": "rapid_transactions",
                            "severity": "low",
                            "message": "Multiple transactions detected in short timeframe"
                        })
                        risk_score += 15
                        break
                except:
                    pass
        
        # 3. New merchant with large transaction
        for txn in recent_txns:
            merchant_name = txn.get("merchant_name")
            amount = txn.get("amount", 0)
            
            # Check if merchant is new for this client
            is_new = merchant_name not in [m["name"] for m in historical.get("merchants_visited", [])]
            
            if is_new and amount > historical["daily_average"] * 5:
                alerts.append({
                    "type": "large_new_merchant",
                    "severity": "medium",
                    "message": f"Large transaction (GHS {amount}) at new merchant"
                })
                risk_score += 25
                break
        
        # Normalize risk score
        risk_score = min(risk_score, 100)
        
        return {
            "success": True,
            "risk_score": risk_score,
            "risk_level": "high" if risk_score >= 60 else "medium" if risk_score >= 30 else "low",
            "alerts": alerts,
            "recommendation": "Review recent transactions" if risk_score >= 30 else "No action needed"
        }
    
    async def get_cashback_tips(self, client_id: str, language: str = "en") -> Dict:
        """Get personalized tips to maximize cashback"""
        client = await self.db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            return {"success": False, "error": "Client not found"}
        
        summary = await self.get_client_transaction_summary(client_id, days=30)
        top_merchants = await self.get_top_merchants(5)
        
        # Get platform config for bonus info
        config = await self.db.platform_config.find_one({"key": "main"}, {"_id": 0})
        referrer_bonus = config.get("referrer_bonus", 3) if config else 3
        
        tips = []
        
        # 1. Referral tip
        if client.get("referral_count", 0) < 5:
            tips.append({
                "type": "referral",
                "icon": "users",
                "title": "Invite Friends" if language == "en" else "Invitez des amis",
                "description": f"Earn GHS {referrer_bonus} for each friend who joins!" if language == "en" else f"Gagnez {referrer_bonus} GHS pour chaque ami qui rejoint!",
                "potential_earnings": referrer_bonus * 5
            })
        
        # 2. High cashback merchants not visited
        visited_names = [m["name"] for m in summary.get("merchants_visited", [])]
        high_cashback = [m for m in top_merchants if m["business_name"] not in visited_names and m.get("cashback_rate", 0) >= 7]
        
        if high_cashback:
            best = high_cashback[0]
            tips.append({
                "type": "merchant",
                "icon": "store",
                "title": f"Try {best['business_name']}" if language == "en" else f"Essayez {best['business_name']}",
                "description": f"Get {best.get('cashback_rate', 5)}% cashback!" if language == "en" else f"Obtenez {best.get('cashback_rate', 5)}% de cashback!",
                "cashback_rate": best.get("cashback_rate", 5)
            })
        
        # 3. Card upgrade tip
        card_type = client.get("card_type", "silver")
        if card_type == "silver" and summary["total_spent"] > 200:
            tips.append({
                "type": "upgrade",
                "icon": "credit-card",
                "title": "Upgrade to Gold" if language == "en" else "Passez à Gold",
                "description": "Get higher cashback rates and exclusive offers" if language == "en" else "Obtenez des taux de cashback plus élevés et des offres exclusives"
            })
        
        # 4. Payment method tip
        methods = summary.get("payment_methods", {})
        if methods.get("cash", 0) > methods.get("momo", 0):
            tips.append({
                "type": "payment",
                "icon": "smartphone",
                "title": "Use MoMo Payments" if language == "en" else "Utilisez MoMo",
                "description": "MoMo payments are processed instantly with guaranteed cashback" if language == "en" else "Les paiements MoMo sont traités instantanément avec cashback garanti"
            })
        
        return {
            "success": True,
            "tips": tips,
            "current_cashback": client.get("cashback_balance", 0),
            "total_earned": client.get("total_earned", 0)
        }
    
    async def generate_smart_notification(
        self, 
        client_id: str, 
        notification_type: str,
        context: Dict = None,
        language: str = "en"
    ) -> Dict:
        """Generate personalized notification content using AI"""
        
        client = await self.db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            return {"success": False, "error": "Client not found"}
        
        client_name = client.get("full_name", "").split()[0]  # First name
        
        # Template-based notifications (no AI needed)
        templates = {
            "welcome": {
                "en": {
                    "title": f"Welcome to SDM REWARDS, {client_name}!",
                    "body": "Start earning cashback on every purchase. Visit our partner merchants today!"
                },
                "fr": {
                    "title": f"Bienvenue sur SDM REWARDS, {client_name}!",
                    "body": "Commencez à gagner du cashback sur chaque achat. Visitez nos marchands partenaires!"
                }
            },
            "cashback_earned": {
                "en": {
                    "title": "Cashback Earned!",
                    "body": f"You earned GHS {context.get('amount', 0):.2f} cashback at {context.get('merchant', 'a partner')}!"
                },
                "fr": {
                    "title": "Cashback Gagné!",
                    "body": f"Vous avez gagné {context.get('amount', 0):.2f} GHS de cashback chez {context.get('merchant', 'un partenaire')}!"
                }
            },
            "inactive_reminder": {
                "en": {
                    "title": f"We miss you, {client_name}!",
                    "body": "Your cashback is waiting! Shop with SDM partners and earn rewards today."
                },
                "fr": {
                    "title": f"Vous nous manquez, {client_name}!",
                    "body": "Votre cashback vous attend! Achetez chez les partenaires SDM et gagnez des récompenses."
                }
            },
            "high_cashback_offer": {
                "en": {
                    "title": "Special Offer Alert!",
                    "body": f"{context.get('merchant', 'A partner')} is offering {context.get('rate', 10)}% cashback today!"
                },
                "fr": {
                    "title": "Alerte Offre Spéciale!",
                    "body": f"{context.get('merchant', 'Un partenaire')} offre {context.get('rate', 10)}% de cashback aujourd'hui!"
                }
            }
        }
        
        template = templates.get(notification_type, {}).get(language, templates.get(notification_type, {}).get("en", {}))
        
        if template:
            return {
                "success": True,
                "notification": template
            }
        
        # For custom notifications, use AI
        llm = get_llm_chat()
        if not llm:
            return {
                "success": False,
                "error": "AI service unavailable"
            }
        
        prompt = f"""Generate a short, engaging push notification for a cashback app user.

User: {client_name}
Notification Type: {notification_type}
Context: {json.dumps(context or {})}
Language: {'French' if language == 'fr' else 'English'}

Return JSON with: title (max 50 chars), body (max 150 chars)"""

        try:
            from emergentintegrations.llm.chat import UserMessage
            response = await llm.send_message(UserMessage(text=prompt))
            
            json_str = response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            
            notification = json.loads(json_str.strip())
            
            return {
                "success": True,
                "notification": notification,
                "ai_generated": True
            }
            
        except Exception as e:
            logger.error(f"AI notification error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def detect_language(self, text: str) -> str:
        """Detect language from text (simple heuristic)"""
        french_words = ["je", "le", "la", "les", "de", "du", "un", "une", "est", "sont", "avec", "pour", "dans", "sur", "ce", "cette", "mon", "ma", "mes", "votre", "nous", "vous", "ils", "elles", "bonjour", "merci", "oui", "non"]
        
        text_lower = text.lower()
        words = text_lower.split()
        
        french_count = sum(1 for word in words if word in french_words)
        
        # If more than 20% French words, assume French
        if len(words) > 0 and french_count / len(words) > 0.2:
            return "fr"
        
        return "en"
