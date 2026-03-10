"""
SDM REWARDS - SMS Notification Service
======================================
Sends SMS notifications for payments, cashback, and alerts via BulkClix
"""

import os
import httpx
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)

# Configuration
BULKCLIX_API_KEY = os.environ.get("BULKCLIX_API_KEY", "")
BULKCLIX_BASE_URL = os.environ.get("BULKCLIX_BASE_URL", "https://api.bulkclix.com/api/v1")
BULKCLIX_SENDER_ID = os.environ.get("BULKCLIX_OTP_SENDER_ID", "")  # Must be UUID from BulkClix
SMS_TEST_MODE = os.environ.get("SMS_TEST_MODE", "false").lower() == "true"


class SMSService:
    """Service for sending SMS notifications via BulkClix API"""
    
    def __init__(self, db=None):
        self.db = db
        self.api_key = BULKCLIX_API_KEY
        self.base_url = BULKCLIX_BASE_URL
        self.sender_id = BULKCLIX_SENDER_ID
    
    def is_configured(self) -> bool:
        """Check if BulkClix is properly configured"""
        return bool(self.api_key and self.sender_id)
    
    def _format_phone_local(self, phone: str) -> str:
        """
        Format phone number to local Ghana format (0XXXXXXXXX)
        BulkClix expects local format without country code
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
        Send SMS via BulkClix API
        
        API Endpoint: POST https://api.bulkclix.com/api/v1/sms-api/send
        Headers:
            - Accept: application/json
            - Content-Type: application/json
            - x-api-key: <api_key>
        Body:
            - sender_id: UUID from BulkClix
            - message: SMS content
            - recipients: array of phone numbers (local format 0XXXXXXXXX)
        
        Returns: {"success": bool, "message_id": str, "error": str}
        """
        local_phone = self._format_phone_local(phone)
        
        # Log the SMS attempt
        sms_record = {
            "id": str(__import__('uuid').uuid4()),
            "phone": local_phone,
            "original_phone": phone,
            "message": message,
            "type": sms_type,
            "status": "pending",
            "test_mode": SMS_TEST_MODE or not self.is_configured(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.sms_logs.insert_one(sms_record)
        
        # Test mode - don't actually send
        if SMS_TEST_MODE:
            logger.info(f"[TEST SMS] To: {local_phone} | Message: {message}")
            if self.db is not None:
                await self.db.sms_logs.update_one(
                    {"id": sms_record["id"]},
                    {"$set": {"status": "sent_test", "sent_at": datetime.now(timezone.utc).isoformat()}}
                )
            return {"success": True, "message_id": sms_record["id"], "test_mode": True}
        
        # Check configuration
        if not self.is_configured():
            error = "BulkClix not configured - missing API key or sender_id"
            logger.error(error)
            if self.db is not None:
                await self.db.sms_logs.update_one(
                    {"id": sms_record["id"]},
                    {"$set": {"status": "failed", "error": error}}
                )
            return {"success": False, "error": error}
        
        # Production - send via BulkClix
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/sms-api/send",
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "x-api-key": self.api_key
                    },
                    json={
                        "sender_id": self.sender_id,
                        "message": message,
                        "recipients": [local_phone]
                    },
                    timeout=30.0
                )
                
                result = response.json()
                logger.info(f"BulkClix SMS response for {local_phone}: {result}")
                
                # Check for success - BulkClix returns campaignId on success
                data = result.get("data", {})
                is_success = (
                    response.status_code == 200 and 
                    result.get("message") == "Request Sent" and
                    data.get("campaignId") is not None
                )
                
                if is_success:
                    if self.db is not None:
                        await self.db.sms_logs.update_one(
                            {"id": sms_record["id"]},
                            {
                                "$set": {
                                    "status": "sent",
                                    "campaign_id": data.get("campaignId"),
                                    "provider_response": result,
                                    "sent_at": datetime.now(timezone.utc).isoformat()
                                }
                            }
                        )
                    return {
                        "success": True,
                        "message_id": data.get("campaignId", sms_record["id"]),
                        "campaign_id": data.get("campaignId")
                    }
                else:
                    error = result.get("message", data.get("sms_status", "SMS sending failed"))
                    logger.error(f"BulkClix SMS failed: {error} | Full response: {result}")
                    if self.db is not None:
                        await self.db.sms_logs.update_one(
                            {"id": sms_record["id"]},
                            {"$set": {"status": "failed", "error": error, "provider_response": result}}
                        )
                    return {"success": False, "error": error}
                    
        except Exception as e:
            error = str(e)
            logger.error(f"SMS send exception: {error}")
            if self.db is not None:
                await self.db.sms_logs.update_one(
                    {"id": sms_record["id"]},
                    {"$set": {"status": "failed", "error": error}}
                )
            return {"success": False, "error": error}
    
    async def send_bulk_sms(self, phones: List[str], message: str, sms_type: str = "bulk") -> Dict:
        """
        Send SMS to multiple recipients in a single API call
        
        Returns: {"success": bool, "sent": int, "failed": int, "campaign_id": str}
        """
        # Format all phone numbers to local format
        local_phones = [self._format_phone_local(p) for p in phones if p]
        local_phones = list(set(local_phones))  # Remove duplicates
        
        if not local_phones:
            return {"success": False, "error": "No valid phone numbers provided"}
        
        # Log the bulk SMS attempt
        sms_record = {
            "id": str(__import__('uuid').uuid4()),
            "phones": local_phones,
            "recipient_count": len(local_phones),
            "message": message,
            "type": sms_type,
            "status": "pending",
            "test_mode": SMS_TEST_MODE or not self.is_configured(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.bulk_sms_logs.insert_one(sms_record)
        
        # Test mode
        if SMS_TEST_MODE:
            logger.info(f"[TEST BULK SMS] To: {len(local_phones)} recipients | Message: {message[:50]}...")
            if self.db is not None:
                await self.db.bulk_sms_logs.update_one(
                    {"id": sms_record["id"]},
                    {"$set": {"status": "sent_test", "sent_at": datetime.now(timezone.utc).isoformat()}}
                )
            return {"success": True, "sent": len(local_phones), "failed": 0, "test_mode": True}
        
        # Check configuration
        if not self.is_configured():
            error = "BulkClix not configured"
            if self.db is not None:
                await self.db.bulk_sms_logs.update_one(
                    {"id": sms_record["id"]},
                    {"$set": {"status": "failed", "error": error}}
                )
            return {"success": False, "error": error, "sent": 0, "failed": len(local_phones)}
        
        # Send via BulkClix
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/sms-api/send",
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "x-api-key": self.api_key
                    },
                    json={
                        "sender_id": self.sender_id,
                        "message": message,
                        "recipients": local_phones
                    },
                    timeout=60.0
                )
                
                result = response.json()
                logger.info(f"BulkClix Bulk SMS response: {result}")
                
                data = result.get("data", {})
                is_success = (
                    response.status_code == 200 and 
                    result.get("message") == "Request Sent" and
                    data.get("campaignId") is not None
                )
                
                if is_success:
                    if self.db is not None:
                        await self.db.bulk_sms_logs.update_one(
                            {"id": sms_record["id"]},
                            {
                                "$set": {
                                    "status": "sent",
                                    "campaign_id": data.get("campaignId"),
                                    "provider_response": result,
                                    "sent_at": datetime.now(timezone.utc).isoformat()
                                }
                            }
                        )
                    return {
                        "success": True,
                        "sent": len(local_phones),
                        "failed": 0,
                        "campaign_id": data.get("campaignId")
                    }
                else:
                    error = result.get("message", "Bulk SMS failed")
                    if self.db is not None:
                        await self.db.bulk_sms_logs.update_one(
                            {"id": sms_record["id"]},
                            {"$set": {"status": "failed", "error": error, "provider_response": result}}
                        )
                    return {"success": False, "error": error, "sent": 0, "failed": len(local_phones)}
                    
        except Exception as e:
            error = str(e)
            logger.error(f"Bulk SMS exception: {error}")
            if self.db is not None:
                await self.db.bulk_sms_logs.update_one(
                    {"id": sms_record["id"]},
                    {"$set": {"status": "failed", "error": error}}
                )
            return {"success": False, "error": error, "sent": 0, "failed": len(local_phones)}
    
    # ============== NOTIFICATION TEMPLATES ==============
    
    async def notify_card_purchase(self, phone: str, card_type: str, amount: float, welcome_bonus: float = 1.0):
        """Notify client of successful card purchase"""
        message = (
            f"SDM Rewards: Your {card_type.capitalize()} Card (GHS {amount}) is now active! "
            f"Welcome bonus of GHS {welcome_bonus} credited. "
            f"Earn cashback on every purchase at partner merchants."
        )
        return await self.send_sms(phone, message, "card_purchase")
    
    async def notify_payment_received(self, phone: str, amount: float, merchant_name: str, cashback: float):
        """Notify client of payment and cashback"""
        message = (
            f"SDM Rewards: Payment of GHS {amount:.2f} at {merchant_name} confirmed. "
            f"Cashback earned: +GHS {cashback:.2f}. "
            f"Thank you for using SDM!"
        )
        return await self.send_sms(phone, message, "payment_cashback")
    
    async def notify_merchant_payment(self, phone: str, amount: float, client_name: str):
        """Notify merchant of incoming payment"""
        message = (
            f"SDM Rewards: You received GHS {amount:.2f} from {client_name}. "
            f"Funds will be transferred to your account."
        )
        return await self.send_sms(phone, message, "merchant_payment")
    
    async def notify_referral_bonus(self, phone: str, bonus: float, referred_name: str):
        """Notify referrer of bonus earned"""
        message = (
            f"SDM Rewards: {referred_name} joined using your referral! "
            f"Bonus credited: +GHS {bonus:.2f}. Keep sharing your code!"
        )
        return await self.send_sms(phone, message, "referral_bonus")
    
    async def notify_welcome_bonus(self, phone: str, bonus: float):
        """Notify new client of welcome bonus"""
        message = (
            f"SDM Rewards: Welcome! Your account is now active. "
            f"Welcome bonus: +GHS {bonus:.2f}. "
            f"Visit partner merchants to earn cashback!"
        )
        return await self.send_sms(phone, message, "welcome_bonus")
    
    async def notify_payment_pending(self, phone: str, amount: float, description: str):
        """Notify client that MoMo prompt was sent"""
        message = (
            f"SDM Rewards: A MoMo payment of GHS {amount:.2f} for {description} is pending. "
            f"Please check your phone and approve the prompt."
        )
        return await self.send_sms(phone, message, "payment_pending")
    
    async def notify_payment_failed(self, phone: str, amount: float, reason: str = ""):
        """Notify client of failed payment"""
        reason_text = f" Reason: {reason}" if reason else ""
        message = (
            f"SDM Rewards: Your payment of GHS {amount:.2f} could not be completed.{reason_text} "
            f"Please try again or contact support."
        )
        return await self.send_sms(phone, message, "payment_failed")
    
    async def notify_card_expiring(self, phone: str, card_type: str, days_remaining: int):
        """Notify client that their card is expiring soon"""
        message = (
            f"SDM Rewards: Your {card_type.capitalize()} card expires in {days_remaining} day(s)! "
            f"Renew now to keep earning cashback. "
            f"Login to your SDM account."
        )
        return await self.send_sms(phone, message, "card_expiring")
    
    async def notify_card_expired(self, phone: str, card_type: str):
        """Notify client that their card has expired"""
        message = (
            f"SDM Rewards: Your {card_type.capitalize()} card has expired. "
            f"Renew your membership to continue enjoying cashback rewards. "
            f"Login at SDM Rewards."
        )
        return await self.send_sms(phone, message, "card_expired")
    
    async def send_raw_sms(self, phone: str, message: str):
        """Send a custom SMS message"""
        return await self.send_sms(phone, message, "custom")


# Global SMS service instance
_sms_service = None

def get_sms_service(db=None) -> SMSService:
    """Get or create SMS service instance"""
    global _sms_service
    if _sms_service is None or db is not None:
        _sms_service = SMSService(db)
    return _sms_service

# Alias for backward compatibility
def get_sms(db=None) -> SMSService:
    """Alias for get_sms_service"""
    return get_sms_service(db)
