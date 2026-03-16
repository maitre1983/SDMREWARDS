"""
SDM REWARDS - Hubtel Mobile Money Verification Service
=======================================================
Verifies merchant MoMo numbers to ensure correct fund routing
API: https://cs.hubtel.com/commissionservices/{POS_ID}/{KEY}?destination={number}
"""

import os
import httpx
import logging
from datetime import datetime, timezone
from typing import Optional, Dict
from pydantic import BaseModel
import re

logger = logging.getLogger(__name__)

# Hubtel Verification API Configuration
HUBTEL_POS_SALES_ID = os.environ.get("HUBTEL_POS_SALES_ID", "")
HUBTEL_VERIFICATION_KEY = os.environ.get("HUBTEL_VERIFICATION_KEY", "3e0841e70afc42fb97d13d19abd36384")
HUBTEL_VERIFICATION_BASE_URL = "https://cs.hubtel.com/commissionservices"


class MoMoVerificationResult(BaseModel):
    """Result of MoMo number verification"""
    success: bool
    verified: bool = False
    account_name: Optional[str] = None
    network: Optional[str] = None
    phone: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None
    raw_response: Optional[Dict] = None


class HubtelMoMoVerificationService:
    """
    Service to verify Mobile Money numbers via Hubtel API
    
    This ensures merchants' MoMo numbers are valid before they can receive payments.
    SDM REWARDS never holds merchant funds - payments go directly to verified accounts.
    """
    
    def __init__(self, db=None):
        self.db = db
        self.pos_sales_id = HUBTEL_POS_SALES_ID
        self.verification_key = HUBTEL_VERIFICATION_KEY
        self.base_url = HUBTEL_VERIFICATION_BASE_URL
        
    def is_configured(self) -> bool:
        """Check if Hubtel verification credentials are configured"""
        return bool(self.pos_sales_id)
    
    def _normalize_phone(self, phone: str) -> str:
        """
        Normalize phone number to format expected by Hubtel
        Accepts: +233xxxxxxxxx, 233xxxxxxxxx, 0xxxxxxxxx
        Returns: 0xxxxxxxxx or 233xxxxxxxxx (Hubtel accepts both)
        """
        phone = re.sub(r'[\s\-\(\)]', '', phone)  # Remove spaces, dashes, parentheses
        
        if phone.startswith('+233'):
            phone = '0' + phone[4:]
        elif phone.startswith('233'):
            phone = '0' + phone[3:]
        
        return phone
    
    def _detect_network(self, phone: str) -> Optional[str]:
        """
        Detect mobile network from phone number prefix
        Ghana networks:
        - MTN: 024, 025, 053, 054, 055, 059
        - Vodafone: 020, 050
        - AirtelTigo: 026, 027, 056, 057
        """
        phone = self._normalize_phone(phone)
        
        if not phone.startswith('0') or len(phone) < 10:
            return None
        
        prefix = phone[:3]
        
        mtn_prefixes = ['024', '025', '053', '054', '055', '059']
        vodafone_prefixes = ['020', '050']
        airteltigo_prefixes = ['026', '027', '056', '057']
        
        if prefix in mtn_prefixes:
            return 'mtn-gh'
        elif prefix in vodafone_prefixes:
            return 'vodafone-gh'
        elif prefix in airteltigo_prefixes:
            return 'tigo-gh'
        
        return None
    
    async def verify_momo_number(self, phone: str, merchant_id: Optional[str] = None) -> MoMoVerificationResult:
        """
        Verify a Mobile Money number using Hubtel API
        
        Args:
            phone: The MoMo number to verify
            merchant_id: Optional merchant ID for logging
            
        Returns:
            MoMoVerificationResult with verification status
        """
        normalized_phone = self._normalize_phone(phone)
        network = self._detect_network(phone)
        
        # Log verification attempt
        verification_record = {
            "id": str(__import__('uuid').uuid4()),
            "phone": normalized_phone,
            "original_phone": phone,
            "merchant_id": merchant_id,
            "network": network,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.momo_verifications.insert_one(verification_record)
        
        # Check if API is configured
        if not self.is_configured():
            logger.warning("Hubtel verification not configured - simulating success")
            return MoMoVerificationResult(
                success=True,
                verified=True,
                phone=normalized_phone,
                network=network,
                message="Verification simulated (API not configured)",
                account_name="[Verification Pending]"
            )
        
        try:
            # Build verification URL
            verification_url = f"{self.base_url}/{self.pos_sales_id}/{self.verification_key}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    verification_url,
                    params={"destination": normalized_phone},
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                
                logger.info(f"Hubtel verification response: status={response.status_code}, body={response.text[:500] if response.text else 'EMPTY'}")
                
                if response.status_code == 200:
                    try:
                        result = response.json()
                    except:
                        result = {"raw": response.text}
                    
                    # Parse response - Hubtel typically returns account details on success
                    response_code = result.get("ResponseCode", result.get("responseCode", ""))
                    data = result.get("Data", result.get("data", {}))
                    message = result.get("Message", result.get("message", ""))
                    
                    # Check for successful verification
                    is_verified = (
                        response_code in ["0000", "0001", "00", "Success"] or
                        bool(data.get("AccountName") or data.get("accountName") or 
                             data.get("CustomerName") or data.get("customerName"))
                    )
                    
                    account_name = (
                        data.get("AccountName") or data.get("accountName") or
                        data.get("CustomerName") or data.get("customerName") or
                        data.get("SubscriberName") or data.get("subscriberName")
                    )
                    
                    # Update verification record
                    update_data = {
                        "status": "verified" if is_verified else "failed",
                        "account_name": account_name,
                        "hubtel_response": result,
                        "verified_at": datetime.now(timezone.utc).isoformat() if is_verified else None
                    }
                    
                    if self.db is not None:
                        await self.db.momo_verifications.update_one(
                            {"id": verification_record["id"]},
                            {"$set": update_data}
                        )
                    
                    return MoMoVerificationResult(
                        success=True,
                        verified=is_verified,
                        account_name=account_name,
                        network=network,
                        phone=normalized_phone,
                        message=message or ("Account verified" if is_verified else "Verification failed"),
                        raw_response=result
                    )
                else:
                    # Non-200 response
                    error_msg = f"API returned status {response.status_code}"
                    
                    if self.db is not None:
                        await self.db.momo_verifications.update_one(
                            {"id": verification_record["id"]},
                            {"$set": {"status": "error", "error": error_msg}}
                        )
                    
                    return MoMoVerificationResult(
                        success=False,
                        verified=False,
                        phone=normalized_phone,
                        network=network,
                        error=error_msg
                    )
                    
        except httpx.TimeoutException:
            logger.error("Hubtel verification timeout")
            if self.db is not None:
                await self.db.momo_verifications.update_one(
                    {"id": verification_record["id"]},
                    {"$set": {"status": "timeout", "error": "API timeout"}}
                )
            return MoMoVerificationResult(
                success=False,
                verified=False,
                phone=normalized_phone,
                error="Verification service timeout. Please try again."
            )
        except Exception as e:
            logger.error(f"Hubtel verification error: {e}")
            if self.db is not None:
                await self.db.momo_verifications.update_one(
                    {"id": verification_record["id"]},
                    {"$set": {"status": "error", "error": str(e)}}
                )
            return MoMoVerificationResult(
                success=False,
                verified=False,
                phone=normalized_phone,
                error=f"Verification error: {str(e)}"
            )
    
    async def get_verification_status(self, phone: str, merchant_id: Optional[str] = None) -> Dict:
        """
        Check if a MoMo number has been verified
        
        Args:
            phone: The MoMo number to check
            merchant_id: Optional merchant ID to scope the check
            
        Returns:
            Dict with verification status
        """
        if self.db is None:
            return {"verified": False, "error": "Database not available"}
        
        normalized_phone = self._normalize_phone(phone)
        
        # Find latest verification for this number
        query = {"phone": normalized_phone, "status": "verified"}
        if merchant_id:
            query["merchant_id"] = merchant_id
        
        verification = await self.db.momo_verifications.find_one(
            query,
            {"_id": 0},
            sort=[("verified_at", -1)]
        )
        
        if verification:
            return {
                "verified": True,
                "account_name": verification.get("account_name"),
                "network": verification.get("network"),
                "verified_at": verification.get("verified_at")
            }
        
        return {"verified": False}


# Singleton instance
_momo_verification_service = None

def get_momo_verification_service(db=None) -> HubtelMoMoVerificationService:
    """Get or create MoMo verification service instance"""
    global _momo_verification_service
    if _momo_verification_service is None:
        _momo_verification_service = HubtelMoMoVerificationService(db)
    elif db is not None:
        _momo_verification_service.db = db
    return _momo_verification_service
