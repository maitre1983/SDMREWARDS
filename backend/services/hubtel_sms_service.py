"""
SDM REWARDS - Hubtel SMS Service
================================
Sends SMS notifications via Hubtel SMS API
API Documentation: https://developers.hubtel.com

Endpoints:
- Single SMS: POST https://sms.hubtel.com/v1/messages/send
- Batch SMS: POST https://sms.hubtel.com/v1/messages/batch/simple/send
- Status Check: GET https://sms.hubtel.com/v1/messages/{messageId}
"""

import os
import httpx
import base64
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)

# Hubtel SMS Configuration
HUBTEL_SMS_CLIENT_ID = os.environ.get("HUBTEL_CLIENT_ID", "")
HUBTEL_SMS_CLIENT_SECRET = os.environ.get("HUBTEL_CLIENT_SECRET", "")
HUBTEL_SMS_SENDER_ID = os.environ.get("HUBTEL_SMS_SENDER_ID", "SDMRewards")
HUBTEL_SMS_BASE_URL = "https://sms.hubtel.com/v1/messages"
SMS_TEST_MODE = os.environ.get("SMS_TEST_MODE", "false").lower() == "true"


class HubtelSMSService:
    """Service for sending SMS notifications via Hubtel API"""
    
    def __init__(self, db=None):
        self.db = db
        self.client_id = HUBTEL_SMS_CLIENT_ID
        self.client_secret = HUBTEL_SMS_CLIENT_SECRET
        self.sender_id = HUBTEL_SMS_SENDER_ID
        self.base_url = HUBTEL_SMS_BASE_URL
    
    def is_configured(self) -> bool:
        """Check if Hubtel SMS is properly configured"""
        return bool(self.client_id and self.client_secret)
    
    def _get_auth_header(self) -> str:
        """Generate Basic Auth header for Hubtel API"""
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"
    
    def _format_phone_international(self, phone: str) -> str:
        """
        Format phone number to international format (+233XXXXXXXXX)
        """
        phone = phone.replace(" ", "").replace("-", "")
        
        # Already has + prefix
        if phone.startswith("+"):
            return phone
        
        # Has country code without +
        if phone.startswith("233"):
            return f"+{phone}"
        
        # Local format starting with 0
        if phone.startswith("0"):
            return f"+233{phone[1:]}"
        
        # Just the number without country code
        return f"+233{phone}"
    
    def _format_phone_local(self, phone: str) -> str:
        """
        Format phone number to local Ghana format (0XXXXXXXXX)
        Hubtel SMS API expects local format
        """
        phone = phone.replace(" ", "").replace("-", "").replace("+", "")
        
        # Remove country code if present
        if phone.startswith("233"):
            phone = "0" + phone[3:]
        elif not phone.startswith("0"):
            phone = "0" + phone
        
        return phone
    
    async def send_sms(self, phone: str, message: str, sms_type: str = "notification") -> Dict:
        """
        Send SMS via Hubtel API
        
        API Endpoint: POST https://sms.hubtel.com/v1/messages/send
        Headers:
            - Content-Type: application/json
            - Authorization: Basic base64(ClientId:ClientSecret)
        Body:
            - From: Sender ID (e.g., "SDMRewards")
            - To: Phone number (0XXXXXXXXX local format)
            - Content: Message text
        
        Returns: {"success": bool, "message_id": str, "error": str}
        """
        # Hubtel SMS accepts local format (0XXXXXXXXX)
        formatted_phone = self._format_phone_local(phone)
        
        # Create SMS record for logging
        sms_record = {
            "id": str(uuid.uuid4()),
            "phone": formatted_phone,
            "original_phone": phone,
            "message": message,
            "type": sms_type,
            "provider": "hubtel",
            "status": "pending",
            "test_mode": SMS_TEST_MODE or not self.is_configured(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.sms_logs.insert_one(sms_record)
        
        # Test mode - don't actually send
        if SMS_TEST_MODE:
            logger.info(f"[TEST SMS - Hubtel] To: {formatted_phone} | Message: {message}")
            if self.db is not None:
                await self.db.sms_logs.update_one(
                    {"id": sms_record["id"]},
                    {"$set": {"status": "sent_test", "sent_at": datetime.now(timezone.utc).isoformat()}}
                )
            return {"success": True, "message_id": sms_record["id"], "test_mode": True}
        
        # Check configuration
        if not self.is_configured():
            error = "Hubtel SMS not configured - missing Client ID or Secret"
            logger.error(error)
            if self.db is not None:
                await self.db.sms_logs.update_one(
                    {"id": sms_record["id"]},
                    {"$set": {"status": "failed", "error": error}}
                )
            return {"success": False, "error": error}
        
        # Send via Hubtel
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/send",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": self._get_auth_header()
                    },
                    json={
                        "From": self.sender_id,
                        "To": formatted_phone,
                        "Content": message
                    },
                    timeout=30.0
                )
                
                # Parse response
                try:
                    result = response.json()
                except:
                    result = {"raw_response": response.text}
                
                logger.info(f"Hubtel SMS response for {formatted_phone}: status={response.status_code}, result={result}")
                
                # Check for success - Hubtel returns status 0 for success
                status_code = result.get("status", result.get("Status", -1))
                is_success = (
                    response.status_code in [200, 201] and
                    status_code == 0
                )
                
                if is_success:
                    message_id = result.get("messageId", result.get("MessageId", sms_record["id"]))
                    if self.db is not None:
                        await self.db.sms_logs.update_one(
                            {"id": sms_record["id"]},
                            {
                                "$set": {
                                    "status": "sent",
                                    "hubtel_message_id": message_id,
                                    "provider_response": result,
                                    "sent_at": datetime.now(timezone.utc).isoformat()
                                }
                            }
                        )
                    return {
                        "success": True,
                        "message_id": message_id
                    }
                else:
                    error = result.get("statusDescription", result.get("Message", f"HTTP {response.status_code} - Status {status_code}"))
                    logger.error(f"Hubtel SMS failed: {error} | Full response: {result}")
                    if self.db is not None:
                        await self.db.sms_logs.update_one(
                            {"id": sms_record["id"]},
                            {"$set": {"status": "failed", "error": error, "provider_response": result}}
                        )
                    return {"success": False, "error": error}
                    
        except Exception as e:
            error = str(e)
            logger.error(f"Hubtel SMS exception: {error}")
            if self.db is not None:
                await self.db.sms_logs.update_one(
                    {"id": sms_record["id"]},
                    {"$set": {"status": "failed", "error": error}}
                )
            return {"success": False, "error": error}
    
    async def send_bulk_sms(self, phones: List[str], message: str, sms_type: str = "bulk") -> Dict:
        """
        Send SMS to multiple recipients using Hubtel Batch API
        
        API Endpoint: POST https://sms.hubtel.com/v1/messages/batch/simple/send
        
        Returns: {"success": bool, "sent": int, "failed": int, "batch_id": str}
        """
        # Format and deduplicate phone numbers (local format)
        formatted_phones = list(set([
            self._format_phone_local(p) for p in phones if p
        ]))
        
        if not formatted_phones:
            return {"success": False, "error": "No valid phone numbers provided", "sent": 0, "failed": 0}
        
        # Create bulk SMS log
        bulk_record = {
            "id": str(uuid.uuid4()),
            "phones": formatted_phones,
            "recipient_count": len(formatted_phones),
            "message": message,
            "type": sms_type,
            "provider": "hubtel",
            "status": "pending",
            "test_mode": SMS_TEST_MODE or not self.is_configured(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.bulk_sms_logs.insert_one(bulk_record)
        
        # Test mode
        if SMS_TEST_MODE:
            logger.info(f"[TEST BULK SMS - Hubtel] To: {len(formatted_phones)} recipients | Message: {message[:50]}...")
            if self.db is not None:
                await self.db.bulk_sms_logs.update_one(
                    {"id": bulk_record["id"]},
                    {"$set": {"status": "sent_test", "sent_at": datetime.now(timezone.utc).isoformat()}}
                )
            return {"success": True, "sent": len(formatted_phones), "failed": 0, "test_mode": True}
        
        # Check configuration
        if not self.is_configured():
            error = "Hubtel SMS not configured"
            if self.db is not None:
                await self.db.bulk_sms_logs.update_one(
                    {"id": bulk_record["id"]},
                    {"$set": {"status": "failed", "error": error}}
                )
            return {"success": False, "error": error, "sent": 0, "failed": len(formatted_phones)}
        
        # Use Hubtel Batch API for bulk sending
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/batch/simple/send",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": self._get_auth_header()
                    },
                    json={
                        "From": self.sender_id,
                        "To": formatted_phones,
                        "Content": message
                    },
                    timeout=60.0
                )
                
                try:
                    result = response.json()
                except:
                    result = {"raw_response": response.text}
                
                logger.info(f"Hubtel Batch SMS response: status={response.status_code}, result={result}")
                
                # Check for success
                status_code = result.get("status", result.get("Status", -1))
                is_success = response.status_code in [200, 201] and status_code == 0
                
                if is_success:
                    batch_id = result.get("batchId", result.get("BatchId", bulk_record["id"]))
                    if self.db is not None:
                        await self.db.bulk_sms_logs.update_one(
                            {"id": bulk_record["id"]},
                            {
                                "$set": {
                                    "status": "sent",
                                    "batch_id": batch_id,
                                    "provider_response": result,
                                    "sent_at": datetime.now(timezone.utc).isoformat()
                                }
                            }
                        )
                    return {
                        "success": True,
                        "sent": len(formatted_phones),
                        "failed": 0,
                        "batch_id": batch_id,
                        "bulk_id": bulk_record["id"]
                    }
                else:
                    error = result.get("statusDescription", result.get("Message", f"HTTP {response.status_code}"))
                    
                    # If batch fails, try individual sends as fallback
                    logger.warning(f"Batch SMS failed ({error}), falling back to individual sends...")
                    return await self._send_bulk_individual(formatted_phones, message, bulk_record)
                    
        except Exception as e:
            error = str(e)
            logger.error(f"Hubtel Batch SMS exception: {error}")
            # Fallback to individual sends
            return await self._send_bulk_individual(formatted_phones, message, bulk_record)
    
    async def _send_bulk_individual(self, phones: List[str], message: str, bulk_record: dict) -> Dict:
        """Fallback: Send SMS individually when batch API fails"""
        sent_count = 0
        failed_count = 0
        message_ids = []
        errors = []
        
        async with httpx.AsyncClient() as client:
            for phone in phones:
                try:
                    response = await client.post(
                        f"{self.base_url}/send",
                        headers={
                            "Content-Type": "application/json",
                            "Authorization": self._get_auth_header()
                        },
                        json={
                            "From": self.sender_id,
                            "To": phone,
                            "Content": message
                        },
                        timeout=30.0
                    )
                    
                    try:
                        result = response.json()
                    except:
                        result = {}
                    
                    status_code = result.get("status", -1)
                    is_success = response.status_code in [200, 201] and status_code == 0
                    
                    if is_success:
                        sent_count += 1
                        message_ids.append(result.get("messageId", ""))
                    else:
                        failed_count += 1
                        errors.append(f"{phone}: {result.get('statusDescription', 'Failed')}")
                        
                except Exception as e:
                    failed_count += 1
                    errors.append(f"{phone}: {str(e)}")
        
        # Update bulk SMS log
        final_status = "sent" if sent_count > 0 else "failed"
        if self.db is not None:
            await self.db.bulk_sms_logs.update_one(
                {"id": bulk_record["id"]},
                {
                    "$set": {
                        "status": final_status,
                        "sent_count": sent_count,
                        "failed_count": failed_count,
                        "message_ids": message_ids,
                        "errors": errors[:10],
                        "sent_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        
        return {
            "success": sent_count > 0,
            "sent": sent_count,
            "failed": failed_count,
            "message_ids": message_ids,
            "bulk_id": bulk_record["id"],
            "errors": errors[:5] if errors else None
        }
    
    # ============== NOTIFICATION TEMPLATES ==============
    
    async def notify_card_purchase(self, phone: str, card_type: str, amount: float, welcome_bonus: float = 1.0):
        """Notify client of successful card purchase"""
        message = (
            f"SDM Rewards: Votre carte {card_type.capitalize()} (GHS {amount}) est maintenant active! "
            f"Bonus de bienvenue de GHS {welcome_bonus} credite. "
            f"Gagnez du cashback sur chaque achat."
        )
        return await self.send_sms(phone, message, "card_purchase")
    
    async def notify_payment_received(self, phone: str, amount: float, merchant_name: str, cashback: float):
        """Notify client of payment and cashback"""
        message = (
            f"SDM Rewards: Paiement de GHS {amount:.2f} chez {merchant_name} confirme. "
            f"Cashback gagne: +GHS {cashback:.2f}. "
            f"Merci d'utiliser SDM!"
        )
        return await self.send_sms(phone, message, "payment_cashback")
    
    async def notify_merchant_payment(self, phone: str, amount: float, client_name: str):
        """Notify merchant of incoming payment"""
        message = (
            f"SDM Rewards: Vous avez recu GHS {amount:.2f} de {client_name}. "
            f"Les fonds seront transferes sur votre compte."
        )
        return await self.send_sms(phone, message, "merchant_payment")
    
    async def notify_referral_bonus(self, phone: str, bonus: float, referred_name: str):
        """Notify referrer of bonus earned"""
        message = (
            f"SDM Rewards: {referred_name} a rejoint avec votre code! "
            f"Bonus credite: +GHS {bonus:.2f}. Continuez a partager!"
        )
        return await self.send_sms(phone, message, "referral_bonus")
    
    async def notify_welcome_bonus(self, phone: str, bonus: float):
        """Notify new client of welcome bonus"""
        message = (
            f"SDM Rewards: Bienvenue! Votre compte est actif. "
            f"Bonus de bienvenue: +GHS {bonus:.2f}. "
            f"Visitez nos marchands partenaires!"
        )
        return await self.send_sms(phone, message, "welcome_bonus")
    
    async def notify_payment_pending(self, phone: str, amount: float, description: str):
        """Notify client that MoMo prompt was sent"""
        message = (
            f"SDM Rewards: Un paiement MoMo de GHS {amount:.2f} pour {description} est en attente. "
            f"Veuillez approuver sur votre telephone."
        )
        return await self.send_sms(phone, message, "payment_pending")
    
    async def notify_payment_failed(self, phone: str, amount: float, reason: str = ""):
        """Notify client of failed payment"""
        reason_text = f" Raison: {reason}" if reason else ""
        message = (
            f"SDM Rewards: Votre paiement de GHS {amount:.2f} a echoue.{reason_text} "
            f"Veuillez reessayer ou contacter le support."
        )
        return await self.send_sms(phone, message, "payment_failed")
    
    async def notify_card_expiring(self, phone: str, card_type: str, days_remaining: int):
        """Notify client that their card is expiring soon"""
        message = (
            f"SDM Rewards: Votre carte {card_type.capitalize()} expire dans {days_remaining} jour(s)! "
            f"Renouvelez maintenant pour continuer a gagner du cashback."
        )
        return await self.send_sms(phone, message, "card_expiring")
    
    async def notify_card_expired(self, phone: str, card_type: str):
        """Notify client that their card has expired"""
        message = (
            f"SDM Rewards: Votre carte {card_type.capitalize()} a expire. "
            f"Renouvelez votre abonnement pour profiter des recompenses cashback."
        )
        return await self.send_sms(phone, message, "card_expired")
    
    async def send_raw_sms(self, phone: str, message: str):
        """Send a custom SMS message"""
        return await self.send_sms(phone, message, "custom")
    
    async def send_otp(self, phone: str, otp: str):
        """Send OTP verification code"""
        message = f"SDM Rewards: Votre code de verification est {otp}. Valide pendant 10 minutes."
        return await self.send_sms(phone, message, "otp")


# Global SMS service instance
_hubtel_sms_service = None

def get_sms_service(db=None) -> HubtelSMSService:
    """Get or create Hubtel SMS service instance"""
    global _hubtel_sms_service
    if _hubtel_sms_service is None or db is not None:
        _hubtel_sms_service = HubtelSMSService(db)
    return _hubtel_sms_service

# Aliases for backward compatibility
def get_sms(db=None) -> HubtelSMSService:
    """Alias for get_sms_service"""
    return get_sms_service(db)

def get_hubtel_sms(db=None) -> HubtelSMSService:
    """Alias for get_sms_service"""
    return get_sms_service(db)
