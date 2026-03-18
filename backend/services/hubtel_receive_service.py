"""
SDM REWARDS - Hubtel Direct Receive Money Service
==================================================
Handles card purchases via Hubtel Direct Receive Money API
API: https://rmp.hubtel.com/merchantaccount/merchants/{POS_Sales_ID}/receive/mobilemoney
Status: https://api-txnstatus.hubtel.com/transactions/{POS_Sales_ID}/status
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
HUBTEL_CLIENT_ID = os.environ.get("HUBTEL_CLIENT_ID", "")
HUBTEL_CLIENT_SECRET = os.environ.get("HUBTEL_CLIENT_SECRET", "")
HUBTEL_POS_SALES_ID = os.environ.get("HUBTEL_POS_SALES_ID", "")
CALLBACK_BASE_URL = os.environ.get("CALLBACK_BASE_URL", "https://sdmrewards.com")

# Fixie Static IP Proxy
FIXIE_PROXY_URL = os.environ.get("FIXIE_URL", "")

# API Endpoints
RECEIVE_MONEY_URL = "https://rmp.hubtel.com/merchantaccount/merchants"
TRANSACTION_STATUS_URL = "https://api-txnstatus.hubtel.com/transactions"


class HubtelReceiveMoneyRequest(BaseModel):
    """Request model for Hubtel Direct Receive Money"""
    amount: float
    description: str
    customer_phone: str
    client_reference: str
    callback_url: Optional[str] = None


class HubtelPaymentResponse(BaseModel):
    """Response model from Hubtel"""
    success: bool
    response_code: Optional[str] = None
    message: Optional[str] = None
    transaction_id: Optional[str] = None
    client_reference: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None
    data: Optional[Dict] = None


class HubtelDirectReceiveService:
    """
    Hubtel Direct Receive Money Service for Card Purchases
    
    API: POST https://rmp.hubtel.com/merchantaccount/merchants/{POS_Sales_ID}/receive/mobilemoney
    Auth: Basic Auth (base64 encoded client_id:client_secret)
    """
    
    def __init__(self, db=None):
        self.db = db
        self.client_id = HUBTEL_CLIENT_ID
        self.client_secret = HUBTEL_CLIENT_SECRET
        self.pos_sales_id = HUBTEL_POS_SALES_ID
        
    def is_configured(self) -> bool:
        """Check if Hubtel credentials are configured"""
        return bool(self.client_id and self.client_secret and self.pos_sales_id)
    
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
    
    async def receive_money(self, request: HubtelReceiveMoneyRequest) -> HubtelPaymentResponse:
        """
        Initiate a mobile money payment collection via Hubtel Direct Receive Money API
        
        Args:
            request: HubtelReceiveMoneyRequest with payment details
            
        Returns:
            HubtelPaymentResponse with transaction status
        """
        if not self.is_configured():
            logger.warning("Hubtel not configured")
            return HubtelPaymentResponse(
                success=False,
                error="Hubtel payment not configured. Please contact support.",
                message="Payment service unavailable"
            )
        
        # Normalize phone number
        customer_phone = self._normalize_phone(request.customer_phone)
        
        # Prepare callback URL
        callback_url = request.callback_url or f"{CALLBACK_BASE_URL}/api/payments/hubtel/callback"
        
        # Prepare request payload per Hubtel Direct Receive Money API spec
        payload = {
            "CustomerMsisdn": customer_phone,
            "Amount": request.amount,
            "PrimaryCallbackUrl": callback_url,
            "Description": request.description,
            "ClientReference": request.client_reference
        }
        
        # Log payment record before API call
        payment_record = {
            "id": str(uuid.uuid4()),
            "client_reference": request.client_reference,
            "amount": request.amount,
            "phone": customer_phone,
            "description": request.description,
            "status": "pending",
            "provider": "hubtel_receive_money",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.hubtel_payments.insert_one(payment_record)
        
        try:
            # Build the API URL
            api_url = f"{RECEIVE_MONEY_URL}/{self.pos_sales_id}/receive/mobilemoney"
            
            # Use curl with Fixie proxy for static IP
            import subprocess
            import json as json_module
            import asyncio
            
            payload_json = json_module.dumps(payload)
            auth_header = self._get_auth_header()
            
            def _make_request_via_curl():
                tmp_path = f"/tmp/hubtel_receive_{uuid.uuid4().hex[:8]}.json"
                
                try:
                    # Build curl command with proxy
                    cmd = ["curl", "-s"]
                    
                    # Add Fixie proxy for static IP
                    if FIXIE_PROXY_URL:
                        cmd.extend(["--proxy", FIXIE_PROXY_URL])
                        logger.info("🔒 [RECEIVE MONEY] Using Fixie static IP proxy")
                    
                    cmd.extend([
                        "-X", "POST", api_url,
                        "--http1.1",
                        "-H", "Content-Type: application/json",
                        "-H", f"Authorization: {auth_header}",
                        "-d", payload_json,
                        "--max-time", "60",
                        "-o", tmp_path,
                        "-w", "%{http_code}"
                    ])
                    
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=65)
                    http_code = int(result.stdout.strip()) if result.stdout.strip().isdigit() else 0
                    
                    body = ""
                    if os.path.exists(tmp_path):
                        with open(tmp_path, 'r') as f:
                            body = f.read()
                        os.unlink(tmp_path)
                    
                    return {"body": body, "http_code": http_code, "stderr": result.stderr}
                except Exception as e:
                    logger.error(f"Curl error: {e}")
                    return {"body": "", "http_code": 0, "stderr": str(e)}
            
            response_data = await asyncio.to_thread(_make_request_via_curl)
            http_code = response_data["http_code"]
            
            logger.info(f"Hubtel Receive Money response: status={http_code}")
            
            try:
                result = json_module.loads(response_data["body"]) if response_data["body"] else {}
                logger.info(f"Hubtel Receive Money result: {result}")
            except:
                result = {"raw": response_data["body"]}
            
            # Parse response - Hubtel returns ResponseCode "0000" for success
            response_code = result.get("ResponseCode", result.get("responseCode", ""))
            message = result.get("Message", result.get("message", ""))
            data = result.get("Data", result.get("data", {}))
            
            # Success codes: "0000" = success, "0001" = pending
            is_success = http_code == 200 and response_code in ["0000", "0001"]
            
            # Get transaction ID from response
            transaction_id = (
                data.get("TransactionId") or 
                data.get("transactionId") or
                data.get("HubtelTransactionId")
            )
            
            # Update payment record
            update_data = {
                "status": "initiated" if is_success else "failed",
                "hubtel_response_code": response_code,
                "hubtel_message": message,
                "hubtel_transaction_id": transaction_id,
                "hubtel_response": result,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if self.db is not None:
                await self.db.hubtel_payments.update_one(
                    {"client_reference": request.client_reference},
                    {"$set": update_data}
                )
            
            if is_success:
                return HubtelPaymentResponse(
                    success=True,
                    response_code=response_code,
                    message=message or "Payment prompt sent to customer",
                    transaction_id=transaction_id,
                    client_reference=request.client_reference,
                    status="pending",
                    data=data
                )
            else:
                return HubtelPaymentResponse(
                    success=False,
                    response_code=response_code,
                    message=message,
                    error=message or f"Payment failed (code: {response_code})"
                )
                    
        except Exception as e:
            logger.error(f"Hubtel receive money error: {e}")
            if self.db is not None:
                await self.db.hubtel_payments.update_one(
                    {"client_reference": request.client_reference},
                    {"$set": {"status": "error", "error": str(e)}}
                )
            return HubtelPaymentResponse(
                success=False,
                error=f"Payment error: {str(e)}"
            )
    
    async def check_transaction_status(self, client_reference: str) -> HubtelPaymentResponse:
        """
        Check transaction status via Hubtel API
        
        API: GET https://api-txnstatus.hubtel.com/transactions/{POS_Sales_ID}/status?clientReference={ref}
        
        Args:
            client_reference: The unique reference used when initiating payment
            
        Returns:
            HubtelPaymentResponse with transaction status
        """
        if not self.is_configured():
            return HubtelPaymentResponse(
                success=False,
                error="Hubtel not configured"
            )
        
        try:
            api_url = f"{TRANSACTION_STATUS_URL}/{self.pos_sales_id}/status"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    api_url,
                    params={"clientReference": client_reference},
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": self._get_auth_header()
                    },
                    timeout=30.0
                )
                
                result = response.json()
                logger.info(f"Hubtel status check result: {result}")
                
                response_code = result.get("ResponseCode", result.get("responseCode", ""))
                message = result.get("Message", result.get("message", ""))
                data = result.get("Data", result.get("data", {}))
                
                # Parse transaction status
                txn_status = data.get("Status") or data.get("status") or ""
                is_completed = txn_status.lower() in ["success", "successful", "completed", "approved"]
                is_failed = txn_status.lower() in ["failed", "declined", "rejected", "cancelled"]
                
                # Update local record if we have the status
                if self.db is not None and (is_completed or is_failed):
                    await self.db.hubtel_payments.update_one(
                        {"client_reference": client_reference},
                        {
                            "$set": {
                                "status": "completed" if is_completed else "failed",
                                "hubtel_final_status": txn_status,
                                "completed_at": datetime.now(timezone.utc).isoformat() if is_completed else None
                            }
                        }
                    )
                
                return HubtelPaymentResponse(
                    success=True,
                    response_code=response_code,
                    message=message,
                    status="completed" if is_completed else ("failed" if is_failed else "pending"),
                    client_reference=client_reference,
                    data=data
                )
                
        except Exception as e:
            logger.error(f"Hubtel status check error: {e}")
            return HubtelPaymentResponse(
                success=False,
                error=f"Status check error: {str(e)}"
            )
    
    async def verify_payment(self, client_reference: str) -> Dict:
        """
        Verify payment status by client reference (from local DB)
        
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
            "hubtel_transaction_id": payment.get("hubtel_transaction_id"),
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
        
        # Extract relevant fields - Hubtel uses various field names
        client_reference = (
            callback_data.get("ClientReference") or 
            callback_data.get("clientReference") or
            callback_data.get("Data", {}).get("ClientReference") or
            ""
        )
        
        response_code = (
            callback_data.get("ResponseCode") or 
            callback_data.get("responseCode") or
            callback_data.get("Data", {}).get("ResponseCode") or
            ""
        )
        
        status = (
            callback_data.get("Status") or 
            callback_data.get("status") or
            callback_data.get("Data", {}).get("Status") or
            ""
        )
        
        message = (
            callback_data.get("Message") or 
            callback_data.get("message") or
            ""
        )
        
        transaction_id = (
            callback_data.get("TransactionId") or
            callback_data.get("Data", {}).get("TransactionId") or
            ""
        )
        
        # Determine if payment was successful
        is_approved = (
            response_code in ["0000", "0001"] or 
            status.lower() in ["success", "successful", "completed", "approved"]
        )
        
        # Update payment record
        if self.db is not None and client_reference:
            update_data = {
                "status": "completed" if is_approved else "failed",
                "hubtel_callback_response": callback_data,
                "hubtel_final_status": status,
                "hubtel_transaction_id": transaction_id or None,
                "completed_at": datetime.now(timezone.utc).isoformat() if is_approved else None
            }
            
            await self.db.hubtel_payments.update_one(
                {"client_reference": client_reference},
                {"$set": update_data}
            )
        
        return {
            "success": is_approved,
            "client_reference": client_reference,
            "transaction_id": transaction_id,
            "status": "completed" if is_approved else "failed",
            "message": message
        }


# Singleton instance
_hubtel_receive_service = None

def get_hubtel_receive_service(db=None) -> HubtelDirectReceiveService:
    """Get or create Hubtel receive service instance"""
    global _hubtel_receive_service
    if _hubtel_receive_service is None:
        _hubtel_receive_service = HubtelDirectReceiveService(db)
    elif db is not None:
        _hubtel_receive_service.db = db
    return _hubtel_receive_service
