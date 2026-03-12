"""
SDM REWARDS - Smart Notification Service
=========================================
AI-powered intelligent notifications via Push, SMS, and Email
"""

import os
import logging
import json
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Configuration
ONESIGNAL_APP_ID = os.environ.get("ONESIGNAL_APP_ID")
ONESIGNAL_API_KEY = os.environ.get("ONESIGNAL_API_KEY")
BULKCLIX_API_KEY = os.environ.get("BULKCLIX_API_KEY")
BULKCLIX_SENDER_ID = os.environ.get("BULKCLIX_SENDER_ID", "SDM")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")


class SmartNotificationService:
    """Service for sending AI-powered smart notifications"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    # ============== NOTIFICATION CHANNELS ==============
    
    async def send_push_notification(
        self,
        client_id: str,
        title: str,
        body: str,
        data: Dict = None
    ) -> Dict:
        """Send push notification via OneSignal"""
        if not ONESIGNAL_APP_ID or not ONESIGNAL_API_KEY:
            logger.warning("OneSignal not configured")
            return {"success": False, "error": "Push not configured"}
        
        try:
            # Get client's OneSignal player ID
            client = await self.db.clients.find_one(
                {"id": client_id},
                {"onesignal_player_id": 1}
            )
            
            if not client or not client.get("onesignal_player_id"):
                return {"success": False, "error": "No push subscription"}
            
            async with httpx.AsyncClient() as http_client:
                response = await http_client.post(
                    "https://onesignal.com/api/v1/notifications",
                    headers={
                        "Authorization": f"Basic {ONESIGNAL_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "app_id": ONESIGNAL_APP_ID,
                        "include_player_ids": [client["onesignal_player_id"]],
                        "headings": {"en": title},
                        "contents": {"en": body},
                        "data": data or {}
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    return {"success": True, "channel": "push"}
                else:
                    logger.error(f"OneSignal error: {response.text}")
                    return {"success": False, "error": response.text}
                    
        except Exception as e:
            logger.error(f"Push notification error: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_sms_notification(
        self,
        phone: str,
        message: str
    ) -> Dict:
        """Send SMS via BulkClix"""
        if not BULKCLIX_API_KEY:
            logger.warning("BulkClix not configured")
            return {"success": False, "error": "SMS not configured"}
        
        try:
            # Format phone number
            formatted_phone = phone.replace("+", "").replace(" ", "")
            
            async with httpx.AsyncClient() as http_client:
                response = await http_client.post(
                    "https://api.bulkclix.com/sms/send",
                    headers={
                        "Authorization": f"Bearer {BULKCLIX_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "to": formatted_phone,
                        "message": message,
                        "sender_id": BULKCLIX_SENDER_ID
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    return {"success": True, "channel": "sms"}
                else:
                    logger.error(f"BulkClix error: {response.text}")
                    return {"success": False, "error": response.text}
                    
        except Exception as e:
            logger.error(f"SMS notification error: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_email_notification(
        self,
        email: str,
        subject: str,
        html_content: str
    ) -> Dict:
        """Send email via Resend"""
        if not RESEND_API_KEY:
            logger.warning("Resend not configured")
            return {"success": False, "error": "Email not configured"}
        
        try:
            async with httpx.AsyncClient() as http_client:
                response = await http_client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {RESEND_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": "SDM REWARDS <noreply@sdmrewards.com>",
                        "to": [email],
                        "subject": subject,
                        "html": html_content
                    },
                    timeout=30
                )
                
                if response.status_code in [200, 201]:
                    return {"success": True, "channel": "email"}
                else:
                    logger.error(f"Resend error: {response.text}")
                    return {"success": False, "error": response.text}
                    
        except Exception as e:
            logger.error(f"Email notification error: {e}")
            return {"success": False, "error": str(e)}
    
    # ============== SMART NOTIFICATION LOGIC ==============
    
    async def get_client_notification_preferences(self, client_id: str) -> Dict:
        """Get client's notification preferences"""
        prefs = await self.db.notification_preferences.find_one(
            {"client_id": client_id},
            {"_id": 0}
        )
        
        if not prefs:
            # Default preferences
            return {
                "client_id": client_id,
                "push_enabled": True,
                "sms_enabled": True,
                "email_enabled": True,
                "cashback_alerts": True,
                "merchant_recommendations": True,
                "security_alerts": True,
                "promotional": True,
                "frequency": "daily",  # daily, weekly, instant
                "quiet_hours_start": 22,  # 10 PM
                "quiet_hours_end": 8  # 8 AM
            }
        
        return prefs
    
    async def update_notification_preferences(
        self,
        client_id: str,
        preferences: Dict
    ) -> Dict:
        """Update client's notification preferences"""
        preferences["client_id"] = client_id
        preferences["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await self.db.notification_preferences.update_one(
            {"client_id": client_id},
            {"$set": preferences},
            upsert=True
        )
        
        return {"success": True, "preferences": preferences}
    
    async def is_within_quiet_hours(self, prefs: Dict) -> bool:
        """Check if current time is within quiet hours"""
        now = datetime.now(timezone.utc)
        current_hour = now.hour
        
        start = prefs.get("quiet_hours_start", 22)
        end = prefs.get("quiet_hours_end", 8)
        
        if start > end:  # Overnight quiet hours (e.g., 22:00 - 08:00)
            return current_hour >= start or current_hour < end
        else:
            return start <= current_hour < end
    
    async def send_smart_notification(
        self,
        client_id: str,
        notification_type: str,
        title: str,
        body: str,
        channels: List[str] = None,  # ["push", "sms", "email"] or None for all enabled
        data: Dict = None,
        force: bool = False  # Bypass quiet hours and preferences
    ) -> Dict:
        """
        Send notification through preferred channels
        
        notification_type: cashback_opportunity, merchant_recommendation, 
                          security_alert, promotional, system
        """
        # Get client data
        client = await self.db.clients.find_one(
            {"id": client_id},
            {"_id": 0, "phone": 1, "email": 1, "full_name": 1}
        )
        
        if not client:
            return {"success": False, "error": "Client not found"}
        
        # Get preferences
        prefs = await self.get_client_notification_preferences(client_id)
        
        # Check quiet hours (unless forced)
        if not force and await self.is_within_quiet_hours(prefs):
            logger.info(f"Notification skipped - quiet hours for client {client_id}")
            return {"success": False, "error": "Quiet hours", "queued": True}
        
        # Check notification type preference
        type_mapping = {
            "cashback_opportunity": "cashback_alerts",
            "merchant_recommendation": "merchant_recommendations",
            "security_alert": "security_alerts",
            "promotional": "promotional",
            "system": None  # Always send system notifications
        }
        
        pref_key = type_mapping.get(notification_type)
        if pref_key and not force and not prefs.get(pref_key, True):
            return {"success": False, "error": f"{notification_type} notifications disabled"}
        
        # Determine channels to use
        results = []
        
        if channels is None:
            channels = []
            if prefs.get("push_enabled", True):
                channels.append("push")
            if prefs.get("sms_enabled", True):
                channels.append("sms")
            if prefs.get("email_enabled", True):
                channels.append("email")
        
        # Send through each channel
        for channel in channels:
            if channel == "push":
                result = await self.send_push_notification(client_id, title, body, data)
                results.append({"channel": "push", **result})
                
            elif channel == "sms" and client.get("phone"):
                # Shorten message for SMS
                sms_body = body[:150] + "..." if len(body) > 150 else body
                result = await self.send_sms_notification(client["phone"], f"{title}\n{sms_body}")
                results.append({"channel": "sms", **result})
                
            elif channel == "email" and client.get("email"):
                html = self._generate_email_html(title, body, client.get("full_name", ""))
                result = await self.send_email_notification(client["email"], title, html)
                results.append({"channel": "email", **result})
        
        # Log notification
        await self._log_notification(client_id, notification_type, title, body, results)
        
        success_count = sum(1 for r in results if r.get("success"))
        
        return {
            "success": success_count > 0,
            "sent_via": results,
            "channels_attempted": len(channels),
            "channels_succeeded": success_count
        }
    
    def _generate_email_html(self, title: str, body: str, name: str) -> str:
        """Generate HTML email template"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; background: #1a1a2e; color: #fff; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #16213e; border-radius: 12px; padding: 30px; }}
                .header {{ text-align: center; margin-bottom: 20px; }}
                .logo {{ font-size: 24px; font-weight: bold; color: #f59e0b; }}
                h1 {{ color: #f59e0b; font-size: 20px; margin-bottom: 15px; }}
                p {{ color: #94a3b8; line-height: 1.6; }}
                .cta {{ display: inline-block; background: #f59e0b; color: #1a1a2e; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }}
                .footer {{ margin-top: 30px; text-align: center; color: #64748b; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">SDM REWARDS</div>
                </div>
                <h1>{title}</h1>
                <p>Hi {name or 'there'},</p>
                <p>{body}</p>
                <p style="text-align: center;">
                    <a href="https://sdmrewards.com/client" class="cta">Open SDM REWARDS</a>
                </p>
                <div class="footer">
                    <p>You're receiving this because you enabled notifications on SDM REWARDS.</p>
                    <p>© 2026 SDM REWARDS. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    async def _log_notification(
        self,
        client_id: str,
        notification_type: str,
        title: str,
        body: str,
        results: List[Dict]
    ):
        """Log notification to database"""
        await self.db.notification_logs.insert_one({
            "client_id": client_id,
            "type": notification_type,
            "title": title,
            "body": body,
            "results": results,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # ============== SMART NOTIFICATION TRIGGERS ==============
    
    async def check_and_send_cashback_opportunities(self, client_id: str) -> Dict:
        """Check for cashback opportunities and send notification"""
        from services.ai_service import AIService
        
        ai_service = AIService(self.db)
        
        # Get recommendations
        recommendations = await ai_service.get_merchant_recommendations(client_id, "en")
        
        if not recommendations.get("recommendations"):
            return {"success": False, "reason": "No recommendations available"}
        
        # Get top recommendation
        top_rec = recommendations["recommendations"][0]
        merchant_name = top_rec.get("merchant_name", "a partner merchant")
        reason = top_rec.get("reason", "great cashback offers")
        
        # Send notification
        return await self.send_smart_notification(
            client_id=client_id,
            notification_type="cashback_opportunity",
            title="💰 Cashback Opportunity!",
            body=f"Try {merchant_name}! {reason}",
            data={"type": "merchant_recommendation", "merchant": merchant_name}
        )
    
    async def check_and_send_security_alert(self, client_id: str) -> Dict:
        """Check for security issues and send alert if needed"""
        from services.ai_service import AIService
        
        ai_service = AIService(self.db)
        
        # Get fraud check
        fraud_result = await ai_service.detect_fraud_patterns(client_id)
        
        if fraud_result.get("risk_level") in ["medium", "high"]:
            alerts = fraud_result.get("alerts", [])
            alert_msg = alerts[0].get("message") if alerts else "Unusual activity detected"
            
            return await self.send_smart_notification(
                client_id=client_id,
                notification_type="security_alert",
                title="⚠️ Security Alert",
                body=f"{alert_msg}. Please review your recent transactions.",
                data={"type": "security_alert", "risk_score": fraud_result.get("risk_score")},
                force=True  # Security alerts bypass preferences
            )
        
        return {"success": False, "reason": "No security concerns"}
    
    async def send_inactive_reminder(self, client_id: str, days_inactive: int) -> Dict:
        """Send reminder to inactive users"""
        client = await self.db.clients.find_one(
            {"id": client_id},
            {"_id": 0, "full_name": 1, "cashback_balance": 1}
        )
        
        if not client:
            return {"success": False, "error": "Client not found"}
        
        name = client.get("full_name", "").split()[0] or "there"
        balance = client.get("cashback_balance", 0)
        
        body = f"We miss you! Your GHS {balance:.2f} cashback is waiting. Shop with SDM partners today and earn more rewards!"
        
        return await self.send_smart_notification(
            client_id=client_id,
            notification_type="promotional",
            title=f"We miss you, {name}! 💛",
            body=body,
            data={"type": "inactive_reminder", "days_inactive": days_inactive}
        )
    
    async def send_cashback_earned_notification(
        self,
        client_id: str,
        amount: float,
        merchant_name: str
    ) -> Dict:
        """Send notification when cashback is earned"""
        return await self.send_smart_notification(
            client_id=client_id,
            notification_type="cashback_opportunity",
            title="🎉 Cashback Earned!",
            body=f"You earned GHS {amount:.2f} cashback at {merchant_name}! Keep shopping to earn more.",
            channels=["push"],  # Only push for instant notifications
            data={"type": "cashback_earned", "amount": amount, "merchant": merchant_name}
        )
    
    async def send_weekly_summary(self, client_id: str) -> Dict:
        """Send weekly spending and cashback summary"""
        from services.ai_service import AIService
        
        ai_service = AIService(self.db)
        summary = await ai_service.get_client_transaction_summary(client_id, days=7)
        
        if summary["total_transactions"] == 0:
            return {"success": False, "reason": "No activity this week"}
        
        body = f"This week: {summary['total_transactions']} transactions, GHS {summary['total_spent']:.2f} spent, GHS {summary['total_cashback']:.2f} cashback earned! 🎯"
        
        return await self.send_smart_notification(
            client_id=client_id,
            notification_type="system",
            title="📊 Your Weekly Summary",
            body=body,
            channels=["push", "email"],
            data={"type": "weekly_summary"}
        )
    
    # ============== BATCH PROCESSING ==============
    
    async def process_daily_notifications(self) -> Dict:
        """Process daily smart notifications for all active clients"""
        # Get active clients who haven't received a notification today
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Find clients who:
        # 1. Are active (have transactions in last 90 days)
        # 2. Haven't received a daily notification today
        
        clients = await self.db.clients.find(
            {"status": "active"},
            {"_id": 0, "id": 1, "phone": 1}
        ).to_list(1000)
        
        results = {
            "processed": 0,
            "sent": 0,
            "skipped": 0,
            "errors": 0
        }
        
        for client in clients:
            client_id = client.get("id")
            if not client_id:
                continue
            
            results["processed"] += 1
            
            # Check if already notified today
            existing = await self.db.notification_logs.find_one({
                "client_id": client_id,
                "created_at": {"$gte": today.isoformat()}
            })
            
            if existing:
                results["skipped"] += 1
                continue
            
            try:
                # Send cashback opportunity notification
                result = await self.check_and_send_cashback_opportunities(client_id)
                
                if result.get("success"):
                    results["sent"] += 1
                else:
                    results["skipped"] += 1
                    
            except Exception as e:
                logger.error(f"Error processing notifications for {client_id}: {e}")
                results["errors"] += 1
        
        return results
    
    async def process_inactive_user_notifications(self, days_threshold: int = 7) -> Dict:
        """Send notifications to users inactive for X days"""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_threshold)
        
        # Find inactive clients
        clients = await self.db.clients.find(
            {
                "status": "active",
                "last_transaction_at": {"$lt": cutoff.isoformat()}
            },
            {"_id": 0, "id": 1}
        ).to_list(500)
        
        results = {"sent": 0, "skipped": 0}
        
        for client in clients:
            result = await self.send_inactive_reminder(client["id"], days_threshold)
            if result.get("success"):
                results["sent"] += 1
            else:
                results["skipped"] += 1
        
        return results
