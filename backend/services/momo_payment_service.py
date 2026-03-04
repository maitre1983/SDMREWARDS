"""
MoMo Payment Service for SDM Rewards
====================================
Handles Mobile Money payment collections using BulkClix API
For VIP card purchases and merchant payments
"""

import os
import httpx
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from enum import Enum

# Configuration
BULKCLIX_API_KEY = os.environ.get("BULKCLIX_API_KEY", "")
BULKCLIX_BASE_URL = os.environ.get("BULKCLIX_BASE_URL", "https://api.bulkclix.com/api/v1")
PAYMENT_TEST_MODE = os.environ.get("PAYMENT_TEST_MODE", "true").lower() == "true"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class NetworkProvider(str, Enum):
    MTN = "MTN"
    VODAFONE = "VODAFONE"
    AIRTELTIGO = "AIRTELTIGO"


def detect_network(phone: str) -> Optional[NetworkProvider]:
    """Detect network provider from phone number prefix"""
    phone = phone.replace(" ", "").replace("-", "")
    if phone.startswith("+233"):
        phone = "0" + phone[4:]
    elif phone.startswith("233"):
        phone = "0" + phone[3:]
    
    mtn_prefixes = ["024", "054", "055", "059"]
    vodafone_prefixes = ["020", "050"]
    airteltigo_prefixes = ["026", "027", "056", "057"]
    
    prefix = phone[:3]
    
    if prefix in mtn_prefixes:
        return NetworkProvider.MTN
    elif prefix in vodafone_prefixes:
        return NetworkProvider.VODAFONE
    elif prefix in airteltigo_prefixes:
        return NetworkProvider.AIRTELTIGO
    
    return None


class MoMoPaymentService:
    """Service for Mobile Money payment collections"""
    
    def __init__(self, db):
        self.db = db
        self.api_key = BULKCLIX_API_KEY
        self.base_url = BULKCLIX_BASE_URL
        self.test_mode = PAYMENT_TEST_MODE or not self.api_key
    
    def is_configured(self) -> bool:
        """Check if BulkClix API is configured"""
        return bool(self.api_key) and not self.test_mode
    
    def _get_headers(self) -> Dict[str, str]:
        """Get API headers"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }
    
    async def initiate_payment(
        self,
        phone: str,
        amount: float,
        description: str,
        payment_type: str,  # "card_purchase", "merchant_payment", etc.
        reference_id: str,  # card_id, transaction_id, etc.
        user_id: str,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Initiate a MoMo payment collection
        Returns payment reference for tracking
        """
        # Detect network
        network = detect_network(phone)
        if not network:
            raise ValueError("Invalid phone number or unsupported network")
        
        # Generate unique reference
        payment_ref = f"SDM-{payment_type.upper()[:3]}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
        
        # Create payment record
        payment_record = {
            "id": str(uuid.uuid4()),
            "reference": payment_ref,
            "phone": phone,
            "network": network.value,
            "amount": amount,
            "description": description,
            "payment_type": payment_type,
            "reference_id": reference_id,
            "user_id": user_id,
            "status": PaymentStatus.PENDING.value,
            "provider_reference": None,
            "provider_message": None,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "test_mode": self.test_mode
        }
        
        await self.db.momo_payments.insert_one(payment_record)
        
        # If test mode, simulate success
        if self.test_mode:
            return {
                "success": True,
                "payment_id": payment_record["id"],
                "reference": payment_ref,
                "status": PaymentStatus.PENDING.value,
                "test_mode": True,
                "message": "Payment initiated in test mode. Use /api/payments/test/confirm to simulate completion."
            }
        
        # Call BulkClix API for real payment
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/payment-api/momocollection",
                    headers=self._get_headers(),
                    json={
                        "phone": phone,
                        "amount": amount,
                        "network": network.value,
                        "reference": payment_ref,
                        "description": description,
                        "callback_url": f"{os.environ.get('CALLBACK_BASE_URL', '')}/api/payments/callback"
                    },
                    timeout=30.0
                )
                
                result = response.json()
                
                if response.status_code == 200 and result.get("status") in ["success", "pending"]:
                    # Update payment record with provider info
                    await self.db.momo_payments.update_one(
                        {"id": payment_record["id"]},
                        {
                            "$set": {
                                "status": PaymentStatus.PROCESSING.value,
                                "provider_reference": result.get("reference") or result.get("transactionId"),
                                "provider_message": result.get("message"),
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
                    
                    return {
                        "success": True,
                        "payment_id": payment_record["id"],
                        "reference": payment_ref,
                        "status": PaymentStatus.PROCESSING.value,
                        "provider_reference": result.get("reference") or result.get("transactionId"),
                        "message": result.get("message", "Payment prompt sent to phone")
                    }
                else:
                    # API error
                    error_msg = result.get("message", "Payment initiation failed")
                    await self.db.momo_payments.update_one(
                        {"id": payment_record["id"]},
                        {
                            "$set": {
                                "status": PaymentStatus.FAILED.value,
                                "provider_message": error_msg,
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
                    
                    return {
                        "success": False,
                        "payment_id": payment_record["id"],
                        "reference": payment_ref,
                        "status": PaymentStatus.FAILED.value,
                        "message": error_msg
                    }
                    
        except httpx.RequestError as e:
            # Network error - mark as failed
            await self.db.momo_payments.update_one(
                {"id": payment_record["id"]},
                {
                    "$set": {
                        "status": PaymentStatus.FAILED.value,
                        "provider_message": f"Network error: {str(e)}",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            return {
                "success": False,
                "payment_id": payment_record["id"],
                "reference": payment_ref,
                "status": PaymentStatus.FAILED.value,
                "message": "Payment service temporarily unavailable"
            }
    
    async def check_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """Check status of a payment"""
        payment = await self.db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
        
        if not payment:
            return {"success": False, "message": "Payment not found"}
        
        # If in test mode, return current status
        if payment.get("test_mode"):
            return {
                "success": True,
                "payment_id": payment["id"],
                "reference": payment["reference"],
                "status": payment["status"],
                "amount": payment["amount"],
                "test_mode": True
            }
        
        # If processing, check with provider
        if payment["status"] == PaymentStatus.PROCESSING.value and payment.get("provider_reference"):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.base_url}/payment-api/status/{payment['provider_reference']}",
                        headers=self._get_headers(),
                        timeout=15.0
                    )
                    
                    result = response.json()
                    
                    if result.get("status") == "success":
                        await self._complete_payment(payment["id"])
                        payment["status"] = PaymentStatus.SUCCESS.value
                    elif result.get("status") == "failed":
                        await self.db.momo_payments.update_one(
                            {"id": payment["id"]},
                            {
                                "$set": {
                                    "status": PaymentStatus.FAILED.value,
                                    "provider_message": result.get("message", "Payment failed"),
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                }
                            }
                        )
                        payment["status"] = PaymentStatus.FAILED.value
                        
            except Exception:
                pass  # Keep current status if check fails
        
        return {
            "success": True,
            "payment_id": payment["id"],
            "reference": payment["reference"],
            "status": payment["status"],
            "amount": payment["amount"],
            "completed_at": payment.get("completed_at")
        }
    
    async def handle_callback(self, data: Dict) -> Dict[str, Any]:
        """Handle payment callback from BulkClix"""
        reference = data.get("reference") or data.get("transactionId")
        status = data.get("status", "").lower()
        
        if not reference:
            return {"success": False, "message": "Missing reference"}
        
        # Find payment by provider reference or our reference
        payment = await self.db.momo_payments.find_one(
            {"$or": [
                {"provider_reference": reference},
                {"reference": reference}
            ]},
            {"_id": 0}
        )
        
        if not payment:
            return {"success": False, "message": "Payment not found"}
        
        if status == "success" or status == "successful":
            await self._complete_payment(payment["id"])
            return {"success": True, "message": "Payment completed"}
        elif status in ["failed", "cancelled", "declined"]:
            await self.db.momo_payments.update_one(
                {"id": payment["id"]},
                {
                    "$set": {
                        "status": PaymentStatus.FAILED.value,
                        "provider_message": data.get("message", "Payment failed"),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            return {"success": True, "message": "Payment marked as failed"}
        
        return {"success": True, "message": "Callback received"}
    
    async def _complete_payment(self, payment_id: str) -> bool:
        """Mark payment as completed and trigger related actions"""
        payment = await self.db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
        
        if not payment:
            return False
        
        # Update payment status
        await self.db.momo_payments.update_one(
            {"id": payment_id},
            {
                "$set": {
                    "status": PaymentStatus.SUCCESS.value,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Handle different payment types
        if payment["payment_type"] == "card_purchase":
            await self._process_card_purchase(payment)
        elif payment["payment_type"] == "merchant_payment":
            await self._process_merchant_payment(payment)
        
        return True
    
    async def _process_card_purchase(self, payment: Dict) -> None:
        """Process completed card purchase"""
        client_id = payment["user_id"]
        card_type = payment["metadata"].get("card_type", "silver")
        referrer_id = payment["metadata"].get("referrer_id")
        
        # Get card config
        config = await self.db.platform_config.find_one({"type": "cards"}, {"_id": 0})
        card_info = None
        if config and "cards" in config:
            for card in config["cards"]:
                if card["type"] == card_type:
                    card_info = card
                    break
        
        # Update client with card
        await self.db.clients.update_one(
            {"id": client_id},
            {
                "$set": {
                    "status": "active",
                    "card_type": card_type,
                    "card_purchased_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Create membership card record
        card_record = {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "card_type": card_type,
            "purchase_amount": payment["amount"],
            "payment_id": payment["id"],
            "payment_reference": payment["reference"],
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.db.membership_cards.insert_one(card_record)
        
        # Record transaction
        await self.db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "type": "card_purchase",
            "client_id": client_id,
            "amount": payment["amount"],
            "description": f"{card_type.capitalize()} Card Purchase",
            "payment_method": "momo",
            "payment_reference": payment["reference"],
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Get platform config for bonuses
        bonus_config = await self.db.platform_config.find_one({"type": "bonuses"}, {"_id": 0})
        welcome_bonus = 1.0
        referrer_bonus = 3.0
        
        if bonus_config:
            welcome_bonus = bonus_config.get("welcome_bonus", 1.0)
            referrer_bonus = bonus_config.get("referrer_bonus", 3.0)
        
        # Credit welcome bonus
        await self.db.clients.update_one(
            {"id": client_id},
            {"$inc": {"cashback_balance": welcome_bonus}}
        )
        
        # Record welcome bonus transaction
        await self.db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "type": "welcome_bonus",
            "client_id": client_id,
            "amount": welcome_bonus,
            "description": "Welcome Bonus - Card Activation",
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Process referral bonus if applicable
        if referrer_id:
            # Credit referrer
            await self.db.clients.update_one(
                {"id": referrer_id},
                {"$inc": {"cashback_balance": referrer_bonus}}
            )
            
            # Record referral bonus
            await self.db.transactions.insert_one({
                "id": str(uuid.uuid4()),
                "type": "referral_bonus",
                "client_id": referrer_id,
                "referred_id": client_id,
                "amount": referrer_bonus,
                "description": "Referral Bonus",
                "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            # Update referral record
            await self.db.referrals.update_one(
                {"referrer_id": referrer_id, "referred_id": client_id},
                {
                    "$set": {
                        "status": "completed",
                        "bonus_paid": True,
                        "bonus_amount": referrer_bonus,
                        "completed_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
    
    async def _process_merchant_payment(self, payment: Dict) -> None:
        """Process completed merchant payment (cashback transaction)"""
        client_id = payment["user_id"]
        merchant_id = payment["metadata"].get("merchant_id")
        
        if not merchant_id:
            return
        
        # Get merchant for cashback rate
        merchant = await self.db.merchants.find_one({"id": merchant_id}, {"_id": 0})
        if not merchant:
            return
        
        cashback_rate = merchant.get("cashback_rate", 5) / 100
        cashback_amount = round(payment["amount"] * cashback_rate, 2)
        
        # Get platform commission
        config = await self.db.platform_config.find_one({"type": "commissions"}, {"_id": 0})
        platform_commission_rate = 0.05  # 5% default
        if config:
            platform_commission_rate = config.get("platform_commission", 5) / 100
        
        commission_amount = round(cashback_amount * platform_commission_rate, 2)
        net_cashback = cashback_amount - commission_amount
        
        # Credit cashback to client
        await self.db.clients.update_one(
            {"id": client_id},
            {"$inc": {"cashback_balance": net_cashback}}
        )
        
        # Update merchant stats
        await self.db.merchants.update_one(
            {"id": merchant_id},
            {
                "$inc": {
                    "total_volume": payment["amount"],
                    "total_transactions": 1,
                    "total_cashback_given": cashback_amount
                }
            }
        )
        
        # Record transaction
        await self.db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "type": "merchant_payment",
            "client_id": client_id,
            "merchant_id": merchant_id,
            "amount": payment["amount"],
            "cashback_amount": cashback_amount,
            "commission_amount": commission_amount,
            "net_cashback": net_cashback,
            "description": f"Payment at {merchant.get('business_name', 'Merchant')}",
            "payment_method": "momo",
            "payment_reference": payment["reference"],
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    async def test_confirm_payment(self, payment_id: str) -> Dict[str, Any]:
        """For test mode: manually confirm a payment"""
        payment = await self.db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
        
        if not payment:
            return {"success": False, "message": "Payment not found"}
        
        if not payment.get("test_mode"):
            return {"success": False, "message": "This is not a test mode payment"}
        
        if payment["status"] != PaymentStatus.PENDING.value:
            return {"success": False, "message": f"Payment is already {payment['status']}"}
        
        # Complete the payment
        await self._complete_payment(payment_id)
        
        return {
            "success": True,
            "message": "Payment confirmed in test mode",
            "payment_id": payment_id,
            "status": PaymentStatus.SUCCESS.value
        }
    
    async def test_fail_payment(self, payment_id: str) -> Dict[str, Any]:
        """For test mode: manually fail a payment"""
        payment = await self.db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
        
        if not payment:
            return {"success": False, "message": "Payment not found"}
        
        if not payment.get("test_mode"):
            return {"success": False, "message": "This is not a test mode payment"}
        
        if payment["status"] != PaymentStatus.PENDING.value:
            return {"success": False, "message": f"Payment is already {payment['status']}"}
        
        await self.db.momo_payments.update_one(
            {"id": payment_id},
            {
                "$set": {
                    "status": PaymentStatus.FAILED.value,
                    "provider_message": "Simulated failure in test mode",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Payment failed in test mode",
            "payment_id": payment_id,
            "status": PaymentStatus.FAILED.value
        }
