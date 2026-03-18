"""
SDM REWARDS - Hubtel MoMo Payment Service
==========================================
Handles all Mobile Money operations via Hubtel APIs:
1. Collection (Receive Money) - Collect payments from clients
2. Disbursement (Send Money) - Send money to merchants/clients

APIs:
- Receive Money: POST https://rmp.hubtel.com/merchantaccount/merchants/{POS_ID}/receive/mobilemoney
- Send Money: POST https://rmp.hubtel.com/merchantaccount/merchants/{POS_ID}/send/mobilemoney
- Online Checkout: POST https://payproxyapi.hubtel.com/items/initiate
"""

import os
import httpx
import base64
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, List
from pydantic import BaseModel
from enum import Enum

logger = logging.getLogger(__name__)

# Hubtel Payment Configuration
HUBTEL_CLIENT_ID = os.environ.get("HUBTEL_CLIENT_ID", "")
HUBTEL_CLIENT_SECRET = os.environ.get("HUBTEL_CLIENT_SECRET", "")
HUBTEL_POS_SALES_ID = os.environ.get("HUBTEL_POS_SALES_ID", "")
HUBTEL_MERCHANT_ACCOUNT = os.environ.get("HUBTEL_MERCHANT_ACCOUNT", "")
CALLBACK_BASE_URL = os.environ.get("CALLBACK_BASE_URL", "https://sdmrewards.com")

# Fixie Static IP Proxy - Routes Hubtel calls through a static IP
FIXIE_PROXY_URL = os.environ.get("FIXIE_URL", "")

# API Endpoints
HUBTEL_RMP_BASE_URL = "https://rmp.hubtel.com/merchantaccount/merchants"  # For Receive Money
HUBTEL_SEND_BASE_URL = "https://smp.hubtel.com/api/merchants"  # For Send Money
HUBTEL_CHECKOUT_URL = "https://payproxyapi.hubtel.com/items/initiate"

# Prepaid Deposit ID for Send Money
HUBTEL_PREPAID_DEPOSIT_ID = os.environ.get("HUBTEL_PREPAID_DEPOSIT_ID", "2021772")

# Test mode flag
PAYMENT_TEST_MODE = os.environ.get("PAYMENT_TEST_MODE", "false").lower() == "true"


class MoMoNetwork(str, Enum):
    MTN = "mtn-gh"
    VODAFONE = "vodafone-gh"
    TELECEL = "vodafone-gh"  # Telecel was Vodafone
    AIRTELTIGO = "tigo-gh"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class HubtelMoMoService:
    """
    Unified service for all Hubtel MoMo operations
    Replaces BulkClix for payment collection and disbursement
    """
    
    def __init__(self, db=None):
        self.db = db
        self.client_id = HUBTEL_CLIENT_ID
        self.client_secret = HUBTEL_CLIENT_SECRET
        self.pos_sales_id = HUBTEL_POS_SALES_ID
        self.prepaid_deposit_id = HUBTEL_PREPAID_DEPOSIT_ID
        self.merchant_account = HUBTEL_MERCHANT_ACCOUNT or HUBTEL_POS_SALES_ID
        self.callback_base_url = CALLBACK_BASE_URL
    
    def is_configured(self) -> bool:
        """Check if Hubtel payment is properly configured"""
        return bool(self.client_id and self.client_secret and self.pos_sales_id)
    
    def _get_auth_header(self) -> str:
        """Generate Basic Auth header"""
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone to local format (0XXXXXXXXX)"""
        phone = phone.replace(" ", "").replace("-", "").replace("+", "")
        
        if phone.startswith("233"):
            phone = "0" + phone[3:]
        elif not phone.startswith("0"):
            phone = "0" + phone
        
        return phone
    
    def _detect_network(self, phone: str) -> str:
        """Detect mobile network from phone prefix"""
        phone = self._normalize_phone(phone)
        prefix = phone[1:3] if len(phone) >= 3 else ""
        
        mtn_prefixes = ["24", "25", "53", "54", "55", "59"]
        vodafone_prefixes = ["20", "50"]
        airteltigo_prefixes = ["26", "27", "56", "57"]
        
        if prefix in mtn_prefixes:
            return "mtn-gh"
        elif prefix in vodafone_prefixes:
            return "vodafone-gh"
        elif prefix in airteltigo_prefixes:
            return "tigo-gh"
        
        return "mtn-gh"  # Default to MTN
    
    # ============== ONLINE CHECKOUT (For Card Purchases) ==============
    
    async def initiate_checkout(
        self,
        amount: float,
        description: str,
        client_reference: str,
        return_url: str = None,
        callback_url: str = None
    ) -> Dict:
        """
        Initiate Hubtel Online Checkout - redirects user to Hubtel payment page
        Used for card purchases where user selects payment method on Hubtel's page
        
        API: POST https://payproxyapi.hubtel.com/items/initiate
        """
        if PAYMENT_TEST_MODE:
            return {
                "success": True,
                "test_mode": True,
                "checkout_url": f"https://pay.hubtel.com/test/{client_reference}",
                "checkout_id": f"TEST-{client_reference}",
                "client_reference": client_reference
            }
        
        if not self.is_configured():
            return {"success": False, "error": "Hubtel payment not configured"}
        
        callback_url = callback_url or f"{self.callback_base_url}/api/payments/hubtel/callback"
        return_url = return_url or f"{self.callback_base_url}/payment/success?ref={client_reference}"
        
        payload = {
            "totalAmount": amount,
            "description": description,
            "callbackUrl": callback_url,
            "returnUrl": return_url,
            "cancellationUrl": f"{self.callback_base_url}/payment/cancelled",
            "merchantAccountNumber": self.pos_sales_id,
            "clientReference": client_reference
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    HUBTEL_CHECKOUT_URL,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": self._get_auth_header()
                    },
                    json=payload,
                    timeout=30.0
                )
                
                result = response.json() if response.text else {}
                logger.info(f"Hubtel Checkout response: {result}")
                
                if response.status_code in [200, 201] and result.get("responseCode") == "0000":
                    data = result.get("data", {})
                    return {
                        "success": True,
                        "checkout_url": data.get("checkoutUrl"),
                        "checkout_id": data.get("checkoutId"),
                        "client_reference": client_reference
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("message", f"Checkout failed: {response.status_code}")
                    }
                    
        except Exception as e:
            logger.error(f"Hubtel Checkout error: {e}")
            return {"success": False, "error": str(e)}
    
    # ============== DIRECT RECEIVE MONEY (MoMo Collection) ==============
    
    async def collect_momo(
        self,
        phone: str,
        amount: float,
        description: str,
        client_reference: str,
        callback_url: str = None
    ) -> Dict:
        """
        Collect payment from customer via MoMo prompt
        Sends payment request directly to customer's phone
        
        API: POST https://rmp.hubtel.com/merchantaccount/merchants/{POS_ID}/receive/mobilemoney
        
        Uses synchronous requests library via run_in_threadpool to avoid
        FastAPI async context connection issues with Hubtel API.
        """
        normalized_phone = self._normalize_phone(phone)
        network = self._detect_network(phone)
        
        # Log the collection attempt
        collection_log = {
            "id": str(uuid.uuid4()),
            "type": "momo_collection",
            "phone": normalized_phone,
            "amount": amount,
            "description": description,
            "client_reference": client_reference,
            "network": network,
            "status": "pending",
            "provider": "hubtel",
            "test_mode": PAYMENT_TEST_MODE,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.hubtel_payments.insert_one(collection_log)
        
        if PAYMENT_TEST_MODE:
            logger.info(f"[TEST] Hubtel MoMo Collection: {normalized_phone} - GHS {amount}")
            if self.db is not None:
                await self.db.hubtel_payments.update_one(
                    {"client_reference": client_reference},
                    {"$set": {"status": "test_pending"}}
                )
            return {
                "success": True,
                "test_mode": True,
                "transaction_id": f"TEST-COL-{client_reference[:8]}",
                "client_reference": client_reference,
                "message": "Test mode - payment prompt simulated"
            }
        
        if not self.is_configured():
            return {"success": False, "error": "Hubtel payment not configured"}
        
        callback_url = callback_url or f"{self.callback_base_url}/api/payments/hubtel/callback"
        
        payload = {
            "CustomerMsisdn": normalized_phone,
            "Amount": amount,
            "Channel": network,  # mtn-gh, vodafone-gh, tigo-gh
            "PrimaryCallbackUrl": callback_url,
            "Description": description,
            "ClientReference": client_reference
        }
        
        url = f"{HUBTEL_RMP_BASE_URL}/{self.pos_sales_id}/receive/mobilemoney"
        
        # Import required modules
        import subprocess
        import json as json_module
        import asyncio
        
        auth_header = self._get_auth_header()
        payload_json = json_module.dumps(payload)
        
        async def _make_request_via_httpx():
            """Fallback method using httpx if curl fails."""
            import httpx
            
            async with httpx.AsyncClient(
                timeout=30.0,
                http2=False,
                verify=True
            ) as client:
                response = await client.post(
                    url,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": auth_header,
                        "Connection": "close"
                    },
                    json=payload
                )
                return {
                    "body": response.text,
                    "http_code": response.status_code,
                    "stderr": ""
                }
        
        def _make_hubtel_request_via_curl(cmd):
            """
            Use curl subprocess to call Hubtel API.
            This bypasses all Python HTTP library issues with Hubtel's Content-Length.
            """
            import os as os_module
            
            # Use a fixed path for response
            tmp_path = "/tmp/hubtel_response.json"
            
            try:
                # Modify command to write output to file
                file_cmd = cmd[:-2] + ["-o", tmp_path, "-w", "%{http_code}"]
                
                result = subprocess.run(
                    file_cmd,
                    capture_output=True,
                    text=True,
                    timeout=35
                )
                
                http_code = int(result.stdout.strip()) if result.stdout.strip().isdigit() else 0
                
                # Read response from file
                body = ""
                if os_module.path.exists(tmp_path):
                    try:
                        with open(tmp_path, 'r') as f:
                            body = f.read()
                    except Exception as read_err:
                        logger.warning(f"Failed to read response file: {read_err}")
                
                return {
                    "body": body,
                    "http_code": http_code,
                    "stderr": result.stderr,
                    "returncode": result.returncode
                }
            except subprocess.TimeoutExpired:
                logger.error("Curl subprocess timed out")
                return {"body": "", "http_code": 0, "stderr": "Request timed out", "returncode": -1}
            except FileNotFoundError:
                logger.error("Curl not found on system")
                return {"body": "", "http_code": 0, "stderr": "curl not found", "returncode": -2}
            except Exception as e:
                logger.error(f"Curl subprocess exception: {e}")
                return {"body": "", "http_code": 0, "stderr": str(e), "returncode": -3}
        
        # Create command list for curl WITH PROXY
        curl_cmd = ["curl", "-s"]
        
        # Add Fixie proxy for static IP (CRITICAL for production)
        if FIXIE_PROXY_URL:
            curl_cmd.extend(["--proxy", FIXIE_PROXY_URL])
            logger.info("🔒 [MOMO] Using Fixie static IP proxy")
        
        curl_cmd.extend([
            "-X", "POST", url,
            "--http1.1",
            "--ignore-content-length",
            "-H", "Content-Type: application/json",
            "-H", f"Authorization: {auth_header}",
            "-H", "Connection: close",
            "-d", payload_json,
            "--max-time", "30",
            "-w", "\n---HTTP_CODE:%{http_code}---"
        ])
        
        try:
            # Try curl first in a separate thread
            response_data = await asyncio.to_thread(_make_hubtel_request_via_curl, curl_cmd)
            
            response_status_code = response_data["http_code"]
            
            # If curl failed (http_code=0), try httpx as fallback
            if response_status_code == 0:
                logger.warning(f"Curl failed (returncode={response_data.get('returncode')}, stderr={response_data.get('stderr')}), trying httpx fallback...")
                try:
                    response_data = await _make_request_via_httpx()
                    response_status_code = response_data["http_code"]
                    logger.info(f"Httpx fallback result: http_code={response_status_code}")
                except Exception as httpx_error:
                    logger.error(f"Httpx fallback also failed: {httpx_error}")
                    # Return the original curl error with more details
                    error_msg = f"Payment service unavailable. Please try again later. (curl: {response_data.get('stderr', 'unknown error')})"
                    if self.db is not None:
                        await self.db.hubtel_payments.update_one(
                            {"client_reference": client_reference},
                            {"$set": {"status": "error", "error": error_msg}}
                        )
                    return {"success": False, "error": error_msg}
            
            try:
                result = json_module.loads(response_data["body"]) if response_data["body"] else {}
            except Exception as parse_error:
                logger.warning(f"JSON parse error: {parse_error}")
                result = {"raw": response_data["body"], "status_code": response_status_code}
            
            logger.info(f"Hubtel MoMo Collection: status={response_status_code}, response_code={result.get('ResponseCode', 'N/A')}")
            
            # Check for success
            response_code = result.get("ResponseCode", result.get("responseCode", ""))
            is_success = response_status_code in [200, 201] and response_code in ["0000", "0001"]
            
            if is_success:
                data = result.get("Data", result.get("data", {}))
                transaction_id = data.get("TransactionId", data.get("transactionId", ""))
                
                if self.db is not None:
                    await self.db.hubtel_payments.update_one(
                        {"client_reference": client_reference},
                        {"$set": {
                            "status": "prompt_sent",
                            "hubtel_transaction_id": transaction_id,
                            "hubtel_response": result
                        }}
                    )
                
                return {
                    "success": True,
                    "transaction_id": transaction_id,
                    "client_reference": client_reference,
                    "message": "Payment prompt sent to customer's phone"
                }
            else:
                error_msg = result.get("Message", result.get("message", f"Collection failed: {response_status_code}"))
                
                if self.db is not None:
                    await self.db.hubtel_payments.update_one(
                        {"client_reference": client_reference},
                        {"$set": {"status": "failed", "error": error_msg, "hubtel_response": result}}
                    )
                
                return {"success": False, "error": error_msg}
                    
        except Exception as e:
            error_str = str(e)
            logger.error(f"Hubtel MoMo Collection error: {e}")
            
            if self.db is not None:
                await self.db.hubtel_payments.update_one(
                    {"client_reference": client_reference},
                    {"$set": {"status": "error", "error": error_str}}
                )
            return {"success": False, "error": error_str}
    
    # ============== SEND MONEY (MoMo Disbursement/Transfer) ==============
    
    async def send_momo(
        self,
        phone: str,
        amount: float,
        description: str,
        client_reference: str,
        recipient_name: str = "",
        callback_url: str = None,
        channel: str = None  # Optional: pre-determined channel (mtn-gh, vodafone-gh, tigo-gh)
    ) -> Dict:
        """
        Send/transfer money to a MoMo wallet (disbursement)
        Used for merchant payouts, cashback withdrawals, etc.
        
        API: POST https://smp.hubtel.com/api/merchants/{PREPAID_ID}/send/mobilemoney
        
        Uses curl subprocess to avoid HTTP library issues with Hubtel API.
        
        Args:
            phone: Phone number (any format, will be normalized to 233XXXXXXXXX)
            amount: Amount to send in GHS
            description: Transaction description
            client_reference: Unique reference ID
            recipient_name: Name of recipient
            callback_url: Optional callback URL for status updates
            channel: Optional Hubtel channel (mtn-gh, vodafone-gh, tigo-gh). Auto-detected if not provided.
        """
        normalized_phone = self._normalize_phone(phone)
        
        # Use provided channel or auto-detect
        network = channel if channel else self._detect_network(phone)
        
        # Log the transfer attempt
        transfer_log = {
            "id": str(uuid.uuid4()),
            "type": "momo_transfer",
            "phone": normalized_phone,
            "amount": amount,
            "description": description,
            "client_reference": client_reference,
            "recipient_name": recipient_name,
            "network": network,
            "status": "pending",
            "provider": "hubtel",
            "test_mode": PAYMENT_TEST_MODE,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.hubtel_payments.insert_one(transfer_log)
        
        if PAYMENT_TEST_MODE:
            logger.info(f"[TEST] Hubtel MoMo Transfer: {normalized_phone} - GHS {amount}")
            if self.db is not None:
                await self.db.hubtel_payments.update_one(
                    {"client_reference": client_reference},
                    {"$set": {"status": "test_success"}}
                )
            return {
                "success": True,
                "test_mode": True,
                "transaction_id": f"TEST-TRF-{client_reference[:8]}",
                "client_reference": client_reference,
                "message": "Test mode - transfer simulated"
            }
        
        if not self.is_configured():
            return {"success": False, "error": "Hubtel payment not configured"}
        
        callback_url = callback_url or f"{self.callback_base_url}/api/payments/hubtel/transfer-callback"
        
        payload = {
            "RecipientMsisdn": normalized_phone,
            "Amount": amount,
            "Channel": network,
            "PrimaryCallbackUrl": callback_url,
            "Description": description,
            "ClientReference": client_reference,
            "RecipientName": recipient_name or "SDM Client"
        }
        
        # Use SMP endpoint with Prepaid Deposit ID for Send Money
        url = f"{HUBTEL_SEND_BASE_URL}/{self.prepaid_deposit_id}/send/mobilemoney"
        
        auth_header = self._get_auth_header()
        
        # Use httpx with Fixie proxy (same as VAS service)
        try:
            print("=" * 70)
            print("🔵 [MOMO SEND] WITHDRAWAL REQUEST")
            print("=" * 70)
            print(f"📍 URL: {url}")
            print(f"📦 PAYLOAD: {json.dumps(payload, indent=2)}")
            print(f"🔒 Using Proxy: {'Yes' if FIXIE_PROXY_URL else 'No'}")
            
            headers = {
                "Authorization": auth_header,
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient(proxy=FIXIE_PROXY_URL if FIXIE_PROXY_URL else None, timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response_status_code = response.status_code
                
                print(f"🟢 [MOMO SEND] HTTP Code: {response_status_code}")
                
                try:
                    result = response.json()
                    print(f"🟢 [MOMO SEND] Response: {json.dumps(result, indent=2)}")
                except:
                    result = {"raw": response.text}
                    print(f"🟢 [MOMO SEND] Raw response: {response.text}")
            
            logger.info(f"Hubtel MoMo Transfer: status={response_status_code}, response={result}")
            
            response_code = result.get("ResponseCode", result.get("responseCode", ""))
            is_success = response_status_code in [200, 201] and response_code in ["0000", "0001"]
            
            if is_success:
                data = result.get("Data", result.get("data", {}))
                transaction_id = data.get("TransactionId", data.get("transactionId", ""))
                
                if self.db is not None:
                    await self.db.hubtel_payments.update_one(
                        {"client_reference": client_reference},
                        {"$set": {
                            "status": "processing",
                            "hubtel_transaction_id": transaction_id,
                            "hubtel_response": result
                        }}
                    )
                
                return {
                    "success": True,
                    "transaction_id": transaction_id,
                    "client_reference": client_reference,
                    "message": "Transfer initiated successfully"
                }
            else:
                error_msg = result.get("Message", result.get("message", f"Transfer failed: {response_status_code}"))
                
                # Check for specific error codes
                if response_code == "4075":
                    error_msg = "Insufficient balance in Hubtel account"
                elif response_code == "4105":
                    error_msg = "Invalid recipient phone number"
                elif response_status_code == 403:
                    error_msg = "Access denied. IP may not be whitelisted for Send Money API."
                
                if self.db is not None:
                    await self.db.hubtel_payments.update_one(
                        {"client_reference": client_reference},
                        {"$set": {"status": "failed", "error": error_msg, "hubtel_response": result}}
                    )
                
                return {"success": False, "error": error_msg}
                
        except Exception as e:
            error_str = str(e)
            logger.error(f"Hubtel MoMo Transfer error: {e}")
            
            if self.db is not None:
                await self.db.hubtel_payments.update_one(
                    {"client_reference": client_reference},
                    {"$set": {"status": "error", "error": error_str}}
                )
            return {"success": False, "error": error_str}
    
    # ============== CALLBACK HANDLERS ==============
    
    async def handle_collection_callback(self, callback_data: Dict) -> Dict:
        """
        Handle callback from Hubtel after collection payment
        
        Expected format:
        {
            "ResponseCode": "0000",
            "Status": "Success",
            "Data": {
                "TransactionId": "...",
                "ClientReference": "...",
                "Amount": 25.0,
                ...
            }
        }
        """
        logger.info(f"Hubtel Collection Callback: {callback_data}")
        
        data = callback_data.get("Data", callback_data.get("data", {}))
        client_reference = (
            data.get("ClientReference") or 
            data.get("clientReference") or
            callback_data.get("ClientReference") or
            callback_data.get("clientReference", "")
        )
        
        response_code = callback_data.get("ResponseCode", callback_data.get("responseCode", ""))
        status = callback_data.get("Status", callback_data.get("status", ""))
        
        is_success = response_code in ["0000", "0001"] or status.lower() in ["success", "successful", "paid"]
        
        if self.db is not None and client_reference:
            await self.db.hubtel_payments.update_one(
                {"client_reference": client_reference},
                {"$set": {
                    "status": "success" if is_success else "failed",
                    "callback_received": True,
                    "callback_data": callback_data,
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {
            "success": is_success,
            "client_reference": client_reference,
            "status": "success" if is_success else "failed",
            "amount": data.get("Amount", data.get("amount", 0)),
            "transaction_id": data.get("TransactionId", data.get("transactionId", ""))
        }
    
    async def handle_transfer_callback(self, callback_data: Dict) -> Dict:
        """Handle callback from Hubtel after transfer/disbursement"""
        logger.info(f"Hubtel Transfer Callback: {callback_data}")
        
        data = callback_data.get("Data", callback_data.get("data", {}))
        client_reference = (
            data.get("ClientReference") or 
            data.get("clientReference") or
            callback_data.get("ClientReference", "")
        )
        
        response_code = callback_data.get("ResponseCode", callback_data.get("responseCode", ""))
        status = callback_data.get("Status", callback_data.get("status", ""))
        
        is_success = response_code in ["0000", "0001"] or status.lower() in ["success", "successful"]
        
        if self.db is not None and client_reference:
            await self.db.hubtel_payments.update_one(
                {"client_reference": client_reference},
                {"$set": {
                    "status": "success" if is_success else "failed",
                    "callback_received": True,
                    "callback_data": callback_data,
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {
            "success": is_success,
            "client_reference": client_reference,
            "status": "success" if is_success else "failed"
        }
    
    # ============== STATUS CHECK ==============
    
    async def check_payment_status(self, client_reference: str) -> Dict:
        """Check payment status from database"""
        if self.db is None:
            return {"success": False, "error": "Database not available"}
        
        payment = await self.db.hubtel_payments.find_one(
            {"client_reference": client_reference},
            {"_id": 0}
        )
        
        if not payment:
            return {"success": False, "error": "Payment not found", "status": "not_found"}
        
        return {
            "success": True,
            "status": payment.get("status", "unknown"),
            "amount": payment.get("amount"),
            "phone": payment.get("phone"),
            "transaction_id": payment.get("hubtel_transaction_id"),
            "created_at": payment.get("created_at"),
            "completed_at": payment.get("completed_at")
        }


# Global service instance
_hubtel_momo_service = None

def get_hubtel_momo_service(db=None) -> HubtelMoMoService:
    """Get or create Hubtel MoMo service instance"""
    global _hubtel_momo_service
    if _hubtel_momo_service is None or db is not None:
        _hubtel_momo_service = HubtelMoMoService(db)
    return _hubtel_momo_service


# Backward compatibility aliases
def get_momo_service(db=None) -> HubtelMoMoService:
    return get_hubtel_momo_service(db)
