"""
SDM REWARDS - Hubtel Verification Services
==========================================
Verifies MoMo numbers and Bank accounts for merchants

APIs:
1. MSISDN Name Query: https://cs.hubtel.com/commissionservices/{POS_ID}/{KEY}?destination={number}
2. MoMo Registration: https://rnv.hubtel.com/v2/merchantaccount/merchants/{POS_ID}/mobilemoney/verify
"""

import os
import httpx
import logging
import re
from datetime import datetime, timezone
from typing import Optional, Dict
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Hubtel Verification Configuration
HUBTEL_POS_SALES_ID = os.environ.get("HUBTEL_POS_SALES_ID", "2038129")
HUBTEL_VERIFICATION_KEY = os.environ.get("HUBTEL_VERIFICATION_KEY", "3e0841e70afc42fb97d13d19abd36384")


class VerificationResult(BaseModel):
    """Result of number/account verification"""
    success: bool
    verified: bool = False
    account_name: Optional[str] = None
    network: Optional[str] = None
    phone: Optional[str] = None
    is_registered: Optional[bool] = None
    message: Optional[str] = None
    error: Optional[str] = None


class MerchantVerificationService:
    """
    Service to verify merchant payment details via Hubtel APIs
    
    Ensures merchants' MoMo numbers and bank accounts are valid
    before they can receive payments.
    """
    
    def __init__(self, db=None):
        self.db = db
        self.pos_sales_id = HUBTEL_POS_SALES_ID
        self.verification_key = HUBTEL_VERIFICATION_KEY
        
    def is_configured(self) -> bool:
        """Check if verification is configured"""
        return bool(self.pos_sales_id and self.verification_key)
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone to local format (0XXXXXXXXX)"""
        phone = re.sub(r'[\s\-\(\)\+]', '', phone)
        
        if phone.startswith('233'):
            phone = '0' + phone[3:]
        elif not phone.startswith('0'):
            phone = '0' + phone
        
        return phone
    
    def _detect_network(self, phone: str) -> str:
        """Detect mobile network from phone prefix"""
        phone = self._normalize_phone(phone)
        prefix = phone[1:4] if len(phone) >= 4 else ""
        
        mtn_prefixes = ['24', '25', '53', '54', '55', '59']
        vodafone_prefixes = ['20', '50']
        airteltigo_prefixes = ['26', '27', '56', '57']
        
        if any(phone[1:3] == p for p in mtn_prefixes):
            return "mtn-gh"
        elif any(phone[1:3] == p for p in vodafone_prefixes):
            return "vodafone-gh"
        elif any(phone[1:3] == p for p in airteltigo_prefixes):
            return "tigo-gh"
        
        return "mtn-gh"  # Default
    
    async def verify_msisdn_name(self, phone: str) -> VerificationResult:
        """
        Query the name registered to a SIM card
        
        API: GET https://cs.hubtel.com/commissionservices/{POS_ID}/{KEY}?destination={number}
        """
        normalized_phone = self._normalize_phone(phone)
        network = self._detect_network(phone)
        
        # Log verification attempt
        log_entry = {
            "phone": normalized_phone,
            "type": "msisdn_name",
            "network": network,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.verification_logs.insert_one(log_entry)
        
        if not self.is_configured():
            return VerificationResult(
                success=False,
                phone=normalized_phone,
                network=network,
                error="Verification service not configured"
            )
        
        try:
            url = f"https://cs.hubtel.com/commissionservices/{self.pos_sales_id}/{self.verification_key}"
            params = {"destination": normalized_phone}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=30.0)
                
                try:
                    data = response.json()
                except:
                    data = {"raw": response.text}
                
                logger.info(f"MSISDN verification response: {data}")
                
                # Check for success (ResponseCode 0000 or 0001)
                response_code = data.get("ResponseCode", "")
                
                if response_code in ["0000", "0001"]:
                    account_name = data.get("Data", {}).get("AccountName") or data.get("AccountName")
                    
                    if self.db is not None:
                        await self.db.verification_logs.update_one(
                            {"phone": normalized_phone, "status": "pending"},
                            {"$set": {"status": "verified", "account_name": account_name, "response": data}}
                        )
                    
                    return VerificationResult(
                        success=True,
                        verified=True,
                        phone=normalized_phone,
                        network=network,
                        account_name=account_name,
                        message="Number verified successfully"
                    )
                else:
                    error_msg = data.get("Message", f"Verification failed (code: {response_code})")
                    
                    if self.db is not None:
                        await self.db.verification_logs.update_one(
                            {"phone": normalized_phone, "status": "pending"},
                            {"$set": {"status": "failed", "error": error_msg, "response": data}}
                        )
                    
                    return VerificationResult(
                        success=False,
                        verified=False,
                        phone=normalized_phone,
                        network=network,
                        error=error_msg
                    )
                    
        except Exception as e:
            logger.error(f"MSISDN verification error: {e}")
            return VerificationResult(
                success=False,
                phone=normalized_phone,
                network=network,
                error=str(e)
            )
    
    async def verify_momo_registration(self, phone: str) -> VerificationResult:
        """
        Check if number is registered for Mobile Money and get username
        
        API: GET https://rnv.hubtel.com/v2/merchantaccount/merchants/{POS_ID}/mobilemoney/verify
        """
        normalized_phone = self._normalize_phone(phone)
        network = self._detect_network(phone)
        
        log_entry = {
            "phone": normalized_phone,
            "type": "momo_registration",
            "network": network,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.verification_logs.insert_one(log_entry)
        
        if not self.is_configured():
            return VerificationResult(
                success=False,
                phone=normalized_phone,
                network=network,
                error="Verification service not configured"
            )
        
        try:
            url = f"https://rnv.hubtel.com/v2/merchantaccount/merchants/{self.pos_sales_id}/mobilemoney/verify"
            params = {
                "channel": network,
                "customerMsisdn": normalized_phone
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=30.0)
                
                try:
                    data = response.json()
                except:
                    data = {"raw": response.text, "status_code": response.status_code}
                
                logger.info(f"MoMo registration verification response: {data}")
                
                if response.status_code == 200:
                    is_registered = data.get("Data", {}).get("IsRegistered", False)
                    account_name = data.get("Data", {}).get("CustomerName") or data.get("Data", {}).get("AccountName")
                    
                    if self.db is not None:
                        await self.db.verification_logs.update_one(
                            {"phone": normalized_phone, "type": "momo_registration", "status": "pending"},
                            {"$set": {
                                "status": "verified" if is_registered else "not_registered",
                                "account_name": account_name,
                                "is_registered": is_registered,
                                "response": data
                            }}
                        )
                    
                    return VerificationResult(
                        success=True,
                        verified=is_registered,
                        is_registered=is_registered,
                        phone=normalized_phone,
                        network=network,
                        account_name=account_name,
                        message="MoMo registered" if is_registered else "Not registered for MoMo"
                    )
                else:
                    error_msg = data.get("Message", f"API returned status {response.status_code}")
                    
                    if self.db is not None:
                        await self.db.verification_logs.update_one(
                            {"phone": normalized_phone, "type": "momo_registration", "status": "pending"},
                            {"$set": {"status": "failed", "error": error_msg, "response": data}}
                        )
                    
                    return VerificationResult(
                        success=False,
                        phone=normalized_phone,
                        network=network,
                        error=error_msg
                    )
                    
        except Exception as e:
            logger.error(f"MoMo registration verification error: {e}")
            return VerificationResult(
                success=False,
                phone=normalized_phone,
                network=network,
                error=str(e)
            )
    
    async def verify_merchant_momo(self, merchant_id: str, phone: str = None) -> VerificationResult:
        """
        Verify a merchant's MoMo number
        Uses both MSISDN and MoMo registration APIs
        """
        if self.db is not None and not phone:
            merchant = await self.db.merchants.find_one({"id": merchant_id}, {"_id": 0, "phone": 1, "momo_number": 1})
            if merchant:
                phone = merchant.get("momo_number") or merchant.get("phone")
        
        if not phone:
            return VerificationResult(success=False, error="No phone number provided")
        
        # Try MoMo registration first (more reliable)
        result = await self.verify_momo_registration(phone)
        
        # If that fails, try MSISDN name query
        if not result.success:
            result = await self.verify_msisdn_name(phone)
        
        # Update merchant verification status
        if self.db is not None and result.verified:
            await self.db.merchants.update_one(
                {"id": merchant_id},
                {"$set": {
                    "momo_verified": True,
                    "momo_verified_name": result.account_name,
                    "momo_verified_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return result


# Global service instance
_verification_service = None

def get_verification_service(db=None) -> MerchantVerificationService:
    """Get or create verification service instance"""
    global _verification_service
    if _verification_service is None or db is not None:
        _verification_service = MerchantVerificationService(db)
    return _verification_service
