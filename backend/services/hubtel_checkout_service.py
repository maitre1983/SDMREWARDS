"""
SDM REWARDS - Hubtel Online Checkout Payment Service
=====================================================
Handles card purchases via Hubtel PayProxy API
API: https://payproxyapi.hubtel.com/items/initiate
"""

import os
import httpx
import base64
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Dict
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Hubtel API Configuration
HUBTEL_BASE_URL = "https://payproxyapi.hubtel.com"
HUBTEL_CLIENT_ID = os.environ.get("HUBTEL_CLIENT_ID", "")
HUBTEL_CLIENT_SECRET = os.environ.get("HUBTEL_CLIENT_SECRET", "")
HUBTEL_MERCHANT_ACCOUNT = os.environ.get("HUBTEL_MERCHANT_ACCOUNT", "")
CALLBACK_BASE_URL = os.environ.get("CALLBACK_BASE_URL", "https://sdmrewards.com")


class HubtelCheckoutRequest(BaseModel):
    """Request model for Hubtel Online Checkout"""
    amount: float
    description: str
    customer_phone: str
    client_reference: str
    callback_url: Optional[str] = None
    cancellation_url: Optional[str] = None


class HubtelCheckoutResponse(BaseModel):
    """Response model from Hubtel"""
    success: bool
    response_code: Optional[str] = None
    message: Optional[str] = None
    request_id: Optional[str] = None
    checkout_url: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None


class HubtelOnlineCheckoutService:
    """
    Hubtel Online Checkout Service for Card Purchases
    
    API: POST https://payproxyapi.hubtel.com/items/initiate
    Auth: Basic Auth (base64 encoded client_id:client_secret)
    """
    
    def __init__(self, db=None):
        self.db = db
        self.base_url = HUBTEL_BASE_URL
        self.client_id = HUBTEL_CLIENT_ID
        self.client_secret = HUBTEL_CLIENT_SECRET
        self.merchant_account = HUBTEL_MERCHANT_ACCOUNT
        
    def is_configured(self) -> bool:
        """Check if Hubtel credentials are configured"""
        return bool(self.client_id and self.client_secret and self.merchant_account)
    
    def _get_auth_header(self) -> str:
        """Generate Basic Auth header"""
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number to format expected by Hubtel (0xxxxxxxxx)"""
        phone = phone.strip().replace(" ", "").replace("-", "")
        if phone.startswith("+233"):
            phone = "0" + phone[4:]
        elif phone.startswith("233"):
            phone = "0" + phone[3:]
        return phone
    
    async def initiate_checkout(self, request: HubtelCheckoutRequest) -> HubtelCheckoutResponse:
        """
        Initiate a payment checkout via Hubtel PayProxy API
        
        Args:
            request: HubtelCheckoutRequest with payment details
            
        Returns:
            HubtelCheckoutResponse with transaction status
        """
        if not self.is_configured():
            logger.warning("Hubtel not configured - returning simulated success")
            return HubtelCheckoutResponse(
                success=False,
                error="Hubtel payment not configured. Please contact support.",
                message="Payment service unavailable"
            )
        
        # Normalize phone number
        customer_phone = self._normalize_phone(request.customer_phone)
        
        # Prepare callback URL
        callback_url = request.callback_url or f"{CALLBACK_BASE_URL}/api/payments/hubtel/callback"
        cancellation_url = request.cancellation_url or f"{CALLBACK_BASE_URL}/payment-cancelled"
        
        # Prepare request payload
        payload = {
            "merchantAccountNumber": self.merchant_account,
            "customerMsisdn": customer_phone,
            "amount": str(request.amount),
            "description": request.description,
            "clientReference": request.client_reference,
            "callbackUrl": callback_url,
            "cancellationUrl": cancellation_url
        }
        
        # Log payment record before API call
        payment_record = {
            "id": str(uuid.uuid4()),
            "client_reference": request.client_reference,
            "amount": request.amount,
            "phone": customer_phone,
            "description": request.description,
            "status": "pending",
            "provider": "hubtel_checkout",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.hubtel_payments.insert_one(payment_record)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/items/initiate",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": self._get_auth_header()
                    },
                    json=payload,
                    timeout=60.0
                )
                
                result = response.json()
                logger.info(f"Hubtel checkout response: {result}")
                
                # Parse response
                response_code = result.get("responseCode", result.get("ResponseCode", ""))
                message = result.get("message", result.get("Message", ""))
                data = result.get("data", result.get("Data", {}))
                
                # Check for success (responseCode "0000" or "0001" typically indicates success)
                is_success = response.status_code == 200 and response_code in ["0000", "0001", "Success"]
                
                # Update payment record
                update_data = {
                    "status": "initiated" if is_success else "failed",
                    "hubtel_response_code": response_code,
                    "hubtel_message": message,
                    "hubtel_request_id": data.get("requestId", data.get("checkoutId")),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                if self.db is not None:
                    await self.db.hubtel_payments.update_one(
                        {"client_reference": request.client_reference},
                        {"$set": update_data}
                    )
                
                if is_success:
                    return HubtelCheckoutResponse(
                        success=True,
                        response_code=response_code,
                        message=message or "Payment initiated successfully",
                        request_id=data.get("requestId", data.get("checkoutId")),
                        checkout_url=data.get("checkoutUrl"),
                        status="pending"
                    )
                else:
                    return HubtelCheckoutResponse(
                        success=False,
                        response_code=response_code,
                        message=message,
                        error=message or "Payment initiation failed"
                    )
                    
        except httpx.TimeoutException:
            logger.error("Hubtel API timeout")
            if self.db is not None:
                await self.db.hubtel_payments.update_one(
                    {"client_reference": request.client_reference},
                    {"$set": {"status": "timeout", "error": "API timeout"}}
                )
            return HubtelCheckoutResponse(
                success=False,
                error="Payment service timeout. Please try again."
            )
        except Exception as e:
            logger.error(f"Hubtel checkout error: {e}")
            if self.db is not None:
                await self.db.hubtel_payments.update_one(
                    {"client_reference": request.client_reference},
                    {"$set": {"status": "error", "error": str(e)}}
                )
            return HubtelCheckoutResponse(
                success=False,
                error=f"Payment error: {str(e)}"
            )
    
    async def verify_payment(self, client_reference: str) -> Dict:
        """
        Verify payment status by client reference
        
        Args:
            client_reference: The unique reference used when initiating payment
            
        Returns:
            Dict with payment status
        """
        if self.db is None:
            return {"success": False, "error": "Database not available"}
        
        payment = await self.db.hubtel_payments.find_one(
            {"client_reference": client_reference},
            {"_id": 0}
        )
        
        if not payment:
            return {"success": False, "error": "Payment not found"}
        
        return {
            "success": True,
            "status": payment.get("status"),
            "amount": payment.get("amount"),
            "phone": payment.get("phone"),
            "hubtel_response_code": payment.get("hubtel_response_code"),
            "created_at": payment.get("created_at"),
            "completed_at": payment.get("completed_at")
        }
    
    async def handle_callback(self, callback_data: Dict) -> Dict:
        """
        Handle callback from Hubtel after payment completion
        
        Args:
            callback_data: Data received from Hubtel callback
            
        Returns:
            Dict with processing result
        """
        logger.info(f"Hubtel callback received: {callback_data}")
        
        # Extract relevant fields
        client_reference = callback_data.get("clientReference", callback_data.get("ClientReference", ""))
        response_code = callback_data.get("responseCode", callback_data.get("ResponseCode", ""))
        status = callback_data.get("status", callback_data.get("Status", ""))
        message = callback_data.get("message", callback_data.get("Message", ""))
        
        # Determine if payment was successful
        is_approved = (
            response_code in ["0000", "0001", "Success"] or 
            status.lower() in ["approved", "success", "successful", "completed"]
        )
        
        # Update payment record
        if self.db is not None and client_reference:
            update_data = {
                "status": "completed" if is_approved else "failed",
                "hubtel_callback_response": callback_data,
                "hubtel_final_status": status,
                "completed_at": datetime.now(timezone.utc).isoformat() if is_approved else None
            }
            
            await self.db.hubtel_payments.update_one(
                {"client_reference": client_reference},
                {"$set": update_data}
            )
        
        return {
            "success": is_approved,
            "client_reference": client_reference,
            "status": "completed" if is_approved else "failed",
            "message": message
        }


# Singleton instance
_hubtel_service = None

def get_hubtel_checkout_service(db=None) -> HubtelOnlineCheckoutService:
    """Get or create Hubtel checkout service instance"""
    global _hubtel_service
    if _hubtel_service is None:
        _hubtel_service = HubtelOnlineCheckoutService(db)
    elif db is not None:
        _hubtel_service.db = db
    return _hubtel_service
