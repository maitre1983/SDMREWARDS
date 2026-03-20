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
HUBTEL_VERIFY_BASE_URL = "https://rnv.hubtel.com/v2/merchantaccount/merchants"  # For verification

# Prepaid Deposit ID for Send Money
HUBTEL_PREPAID_DEPOSIT_ID = os.environ.get("HUBTEL_PREPAID_DEPOSIT_ID", "2021772")

# Test mode flag
PAYMENT_TEST_MODE = os.environ.get("PAYMENT_TEST_MODE", "false").lower() == "true"

# Connection method cache - tracks which method worked last
# This helps prioritize the working method on subsequent calls
_last_working_method = {"method": "proxy", "timestamp": None, "failures": 0}


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
    Unified service for all Hubtel MoMo operations.
    Handles payment collection and disbursement via Hubtel API.
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
        
        # DETAILED LOGGING
        print("=" * 70)
        print("🔵 [MOMO COLLECT] COLLECTION REQUEST (Customer → Merchant)")
        print("=" * 70)
        print(f"📍 URL: {url}")
        print(f"📦 PAYLOAD: {json.dumps(payload, indent=2)}")
        print(f"🔒 POS Sales ID: {self.pos_sales_id}")
        print(f"🔒 Using Proxy: {'Yes' if FIXIE_PROXY_URL else 'No'}")
        
        # Import required modules
        import subprocess
        import json as json_module
        import asyncio
        
        auth_header = self._get_auth_header()
        payload_json = json_module.dumps(payload)
        
        async def _make_request_via_httpx():
            """Fallback method using httpx with proxy if curl fails."""
            import httpx
            
            # Use Fixie proxy for static IP (CRITICAL for production)
            proxy = FIXIE_PROXY_URL if FIXIE_PROXY_URL else None
            
            async with httpx.AsyncClient(
                proxy=proxy,
                timeout=30.0,
                http2=False,
                verify=True
            ) as client:
                logger.info(f"🔵 [MOMO COLLECT] httpx request to: {url}")
                logger.info(f"🔵 [MOMO COLLECT] Using proxy: {'Yes - ' + proxy[:20] + '...' if proxy else 'No'}")
                
                response = await client.post(
                    url,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": auth_header,
                        "Connection": "close"
                    },
                    json=payload
                )
                
                logger.info(f"🔵 [MOMO COLLECT] Response status: {response.status_code}")
                logger.info(f"🔵 [MOMO COLLECT] Response body: {response.text[:500]}")
                
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
        
        # ========== INTELLIGENT FALLBACK SYSTEM ==========
        # Strategy: Try proxy first, if fails try direct, alternate on retries
        
        def _build_curl_command(use_proxy: bool) -> list:
            """Build curl command with or without proxy"""
            cmd = ["curl", "-s"]
            if use_proxy and FIXIE_PROXY_URL:
                cmd.extend(["--proxy", FIXIE_PROXY_URL])
            cmd.extend([
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
            return cmd
        
        async def _try_httpx_direct():
            """Direct httpx call without proxy"""
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={
                        "Authorization": auth_header,
                        "Content-Type": "application/json"
                    }
                )
                return {
                    "body": response.text,
                    "http_code": response.status_code,
                    "method": "httpx_direct"
                }
        
        async def _try_httpx_with_proxy():
            """httpx call with Fixie proxy"""
            if not FIXIE_PROXY_URL:
                raise Exception("No proxy configured")
            async with httpx.AsyncClient(proxy=FIXIE_PROXY_URL, timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={
                        "Authorization": auth_header,
                        "Content-Type": "application/json"
                    }
                )
                return {
                    "body": response.text,
                    "http_code": response.status_code,
                    "method": "httpx_proxy"
                }
        
        try:
            # Intelligent retry with fallback between proxy and direct
            # Uses cached knowledge of which method worked last
            global _last_working_method
            
            max_retries = 6
            last_error = None
            response_status_code = 0
            response_data = {"body": "", "http_code": 0}
            
            # Start with the method that worked last time
            start_with_proxy = _last_working_method.get("method", "proxy") == "proxy"
            
            for attempt in range(max_retries):
                # Alternate between proxy and direct, starting with last working method
                if attempt == 0:
                    use_proxy = start_with_proxy
                else:
                    # After first attempt, alternate
                    use_proxy = ((attempt + (0 if start_with_proxy else 1)) % 2 == 0)
                
                method_name = "proxy" if use_proxy else "direct"
                
                logger.info(f"🔄 [MOMO COLLECT] Attempt {attempt+1}/{max_retries} using {method_name}")
                
                try:
                    # Try curl first
                    curl_cmd = _build_curl_command(use_proxy)
                    response_data = await asyncio.to_thread(_make_hubtel_request_via_curl, curl_cmd)
                    response_status_code = response_data["http_code"]
                    response_data["method"] = f"curl_{method_name}"
                    
                    # If curl completely failed (http_code=0), try httpx
                    if response_status_code == 0:
                        logger.warning(f"[MOMO] Curl failed, trying httpx {method_name}...")
                        try:
                            if use_proxy:
                                response_data = await _try_httpx_with_proxy()
                            else:
                                response_data = await _try_httpx_direct()
                            response_status_code = response_data["http_code"]
                        except Exception as httpx_err:
                            logger.warning(f"[MOMO] Httpx {method_name} failed: {httpx_err}")
                            last_error = str(httpx_err)
                    
                    # Success! Update cache and break out
                    if response_status_code in [200, 201]:
                        _last_working_method = {
                            "method": method_name,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "failures": 0
                        }
                        logger.info(f"✅ [MOMO COLLECT] Success on attempt {attempt+1} using {response_data.get('method', method_name)}")
                        break
                    
                    # If we got a 403 or other error, log and retry
                    if response_status_code == 403:
                        logger.warning(f"⚠️ [MOMO COLLECT] Got 403 with {method_name}, will try {('direct' if use_proxy else 'proxy')} next...")
                        # Track failures for this method
                        if _last_working_method.get("method") == method_name:
                            _last_working_method["failures"] = _last_working_method.get("failures", 0) + 1
                    elif response_status_code > 0:
                        logger.warning(f"⚠️ [MOMO COLLECT] Got HTTP {response_status_code} with {method_name}")
                    
                except Exception as attempt_error:
                    logger.error(f"[MOMO] Attempt {attempt+1} error: {attempt_error}")
                    last_error = str(attempt_error)
                
                # Wait before next retry (exponential backoff, but shorter)
                if attempt < max_retries - 1:
                    wait_time = min(2 ** attempt, 8)  # Cap at 8 seconds
                    logger.info(f"[MOMO] Waiting {wait_time}s before retry...")
                    await asyncio.sleep(wait_time)
            
            if response_status_code == 0:
                error_msg = f"Payment service temporarily unavailable. Please try again. ({last_error or response_data.get('stderr', 'connection failed')})"
                if self.db is not None:
                    await self.db.hubtel_payments.update_one(
                        {"client_reference": client_reference},
                        {"$set": {"status": "error", "error": error_msg}}
                    )
                return {"success": False, "error": error_msg, "retry_suggested": True}
            
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
                
                # Enhanced error handling for 403
                if response_status_code == 403:
                    error_msg = "Collection API access denied (403). IP may not be whitelisted or account not enabled for Receive Money."
                    print("🔴 [MOMO COLLECT] 403 FORBIDDEN - Check Hubtel account configuration")
                    print(f"🔴 [MOMO COLLECT] POS Sales ID: {self.pos_sales_id}")
                    print("🔴 [MOMO COLLECT] Static IP should be: 52.5.155.132 (Fixie)")
                
                print(f"🔴 [MOMO COLLECT] FAILED - HTTP {response_status_code}")
                print(f"🔴 [MOMO COLLECT] Error: {error_msg}")
                print(f"🔴 [MOMO COLLECT] Full response: {result}")
                
                if self.db is not None:
                    await self.db.hubtel_payments.update_one(
                        {"client_reference": client_reference},
                        {"$set": {"status": "failed", "error": error_msg, "hubtel_response": result}}
                    )
                
                return {"success": False, "error": error_msg, "http_status": response_status_code}
                    
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
                except Exception as json_error:
                    result = {"raw": response.text}
                    print(f"🟢 [MOMO SEND] Raw response (parse error: {json_error}): {response.text}")
            
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
                elif response_code == "5000":
                    error_msg = f"Hubtel server error (5000): {result.get('Errors', 'Service temporarily unavailable')}"
                elif response_status_code == 500:
                    error_msg = f"Hubtel server error (HTTP 500): {result.get('Message', 'Service temporarily unavailable')}"
                elif response_status_code == 403:
                    error_msg = "Access denied. IP may not be whitelisted for Send Money API."
                
                # Log the full response for debugging
                print(f"🔴 [MOMO SEND] FAILED - ResponseCode: {response_code}, HTTP: {response_status_code}")
                print(f"🔴 [MOMO SEND] Error: {error_msg}")
                print(f"🔴 [MOMO SEND] Full response: {result}")
                
                if self.db is not None:
                    await self.db.hubtel_payments.update_one(
                        {"client_reference": client_reference},
                        {"$set": {"status": "failed", "error": error_msg, "hubtel_response": result}}
                    )
                
                return {"success": False, "error": error_msg, "response_code": response_code, "http_status": response_status_code}
                
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
    
    # Ghana Bank Codes for Hubtel Bank Transfer
    GHANA_BANK_CODES = {
        "GCB": "300335",      # GCB Bank
        "ECOBANK": "300330",  # Ecobank Ghana
        "STANBIC": "300331",  # Stanbic Bank
        "ABSA": "300329",     # Absa Bank (formerly Barclays)
        "ZENITH": "300332",   # Zenith Bank
        "FIDELITY": "300323", # Fidelity Bank
        "UBA": "300333",      # United Bank for Africa
        "ACCESS": "300328",   # Access Bank
        "CAL": "300327",      # CAL Bank
        "PRUDENTIAL": "300324", # Prudential Bank
        "ADB": "300322",      # Agricultural Development Bank
        "GTB": "300334",      # GT Bank
        "FBN": "300325",      # First Bank Nigeria
        "REPUBLIC": "300326", # Republic Bank
        "SOCIETE": "300321",  # Societe Generale
        "NIB": "300320",      # National Investment Bank
        "BOA": "300319",      # Bank of Africa
        "FNB": "300336",      # First National Bank
        "STANDARD": "300337", # Standard Chartered
    }
    
    async def send_bank(
        self,
        account_number: str,
        bank_code: str,
        amount: float,
        description: str,
        client_reference: str,
        recipient_name: str = "",
        callback_url: str = None
    ) -> Dict:
        """
        Send/transfer money to a bank account (disbursement)
        Used for merchant payouts via bank transfer.
        
        API: POST https://smp.hubtel.com/api/merchants/{PREPAID_ID}/send/bank/gh/{BankCode}
        
        Args:
            account_number: Bank account number
            bank_code: Hubtel bank code (e.g., "300335" for GCB) or bank name (e.g., "GCB")
            amount: Amount to send in GHS
            description: Transaction description
            client_reference: Unique reference ID
            recipient_name: Name of account holder
            callback_url: Optional callback URL for status updates
            
        Returns:
            Dict with success status and transaction details
        """
        # Resolve bank code if name was provided
        resolved_bank_code = self.GHANA_BANK_CODES.get(bank_code.upper(), bank_code)
        
        if not HUBTEL_CLIENT_ID or not HUBTEL_CLIENT_SECRET:
            logger.error("Hubtel credentials not configured")
            return {"success": False, "error": "Hubtel payment not configured"}
        
        callback_url = callback_url or f"{self.callback_base_url}/api/payments/hubtel/transfer-callback"
        
        payload = {
            "RecipientAccountNumber": account_number,
            "Amount": amount,
            "Description": description,
            "ClientReference": client_reference,
            "RecipientName": recipient_name or "Account Holder",
            "PrimaryCallbackUrl": callback_url
        }
        
        # Use SMP endpoint with bank code
        url = f"{HUBTEL_SEND_BASE_URL}/{self.prepaid_deposit_id}/send/bank/gh/{resolved_bank_code}"
        
        auth_header = self._get_auth_header()
        
        try:
            logger.info("=" * 70)
            logger.info("🏦 [BANK SEND] TRANSFER REQUEST")
            logger.info("=" * 70)
            logger.info(f"📍 URL: {url}")
            logger.info(f"📦 PAYLOAD: {json.dumps(payload, indent=2)}")
            logger.info(f"🔒 Using Proxy: {'Yes' if FIXIE_PROXY_URL else 'No'}")
            
            headers = {
                "Authorization": auth_header,
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient(proxy=FIXIE_PROXY_URL if FIXIE_PROXY_URL else None, timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response_status_code = response.status_code
                
                logger.info(f"🏦 [BANK SEND] HTTP Code: {response_status_code}")
                
                try:
                    result = response.json()
                    logger.info(f"🏦 [BANK SEND] Response: {json.dumps(result, indent=2)}")
                except Exception:
                    result = {"raw": response.text}
                    logger.info(f"🏦 [BANK SEND] Raw response: {response.text}")
            
            response_code = result.get("ResponseCode", result.get("responseCode", ""))
            is_success = response_status_code in [200, 201] and response_code in ["0000", "0001"]
            
            if is_success:
                data = result.get("Data", result.get("data", {}))
                transaction_id = data.get("TransactionId", data.get("transactionId", ""))
                
                logger.info(f"✅ [BANK SEND] SUCCESS - TransactionId: {transaction_id}")
                
                return {
                    "success": True,
                    "transaction_id": transaction_id,
                    "client_reference": client_reference,
                    "message": "Bank transfer initiated successfully"
                }
            else:
                error_msg = result.get("Message", result.get("message", f"Bank transfer failed: {response_status_code}"))
                
                if response_code == "4075":
                    error_msg = "Insufficient balance in Hubtel account"
                elif response_code == "4105":
                    error_msg = "Invalid bank account number"
                elif response_code == "5000":
                    error_msg = f"Hubtel server error: {result.get('Errors', 'Service temporarily unavailable')}"
                elif response_status_code == 403:
                    error_msg = "Access denied. IP may not be whitelisted for Bank Transfer API."
                
                logger.error(f"❌ [BANK SEND] FAILED - {error_msg}")
                
                return {"success": False, "error": error_msg, "response_code": response_code}
                
        except Exception as e:
            error_str = str(e)
            logger.error(f"🏦 [BANK SEND] Exception: {error_str}")
            return {"success": False, "error": error_str}

    # ============== VERIFICATION APIs ==============
    
    async def verify_momo_number(
        self,
        phone: str,
        network: str = "mtn-gh"
    ) -> Dict:
        """
        Verify if a phone number is registered on Mobile Money and get the account name.
        
        API: GET https://rnv.hubtel.com/v2/merchantaccount/merchants/{POS_ID}/mobilemoney/verify
        
        Args:
            phone: Mobile number (will be normalized to 233 format)
            network: Channel - mtn-gh, vodafone-gh, tigo-gh
            
        Returns:
            Dict with success status and account holder name
        """
        if not HUBTEL_CLIENT_ID or not HUBTEL_CLIENT_SECRET:
            return {"success": False, "error": "Hubtel credentials not configured"}
        
        # Normalize phone number
        phone = phone.strip().replace(" ", "").replace("-", "")
        if phone.startswith("0"):
            phone = "233" + phone[1:]
        elif phone.startswith("+"):
            phone = phone[1:]
        elif not phone.startswith("233"):
            phone = "233" + phone
        
        # Normalize network
        network_map = {
            "MTN": "mtn-gh",
            "MTN MOMO": "mtn-gh",
            "VODAFONE": "vodafone-gh",
            "VODAFONE CASH": "vodafone-gh",
            "TELECEL": "tigo-gh",
            "TIGO": "tigo-gh",
            "AIRTELTIGO": "tigo-gh"
        }
        channel = network_map.get(network.upper(), network.lower())
        
        url = f"{HUBTEL_VERIFY_BASE_URL}/{self.pos_sales_id}/mobilemoney/verify"
        params = {
            "channel": channel,
            "customerMsisdn": phone
        }
        
        auth_header = self._get_auth_header()
        
        try:
            logger.info(f"📱 [MOMO VERIFY] Checking {phone} on {channel}")
            
            async with httpx.AsyncClient(proxy=FIXIE_PROXY_URL if FIXIE_PROXY_URL else None, timeout=30.0) as client:
                response = await client.get(
                    url,
                    params=params,
                    headers={
                        "Authorization": auth_header,
                        "Content-Type": "application/json"
                    }
                )
                
                logger.info(f"📱 [MOMO VERIFY] Status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"📱 [MOMO VERIFY] Response: {result}")
                    
                    # Extract account name from response
                    data = result.get("Data", result.get("data", {}))
                    account_name = (
                        data.get("AccountName") or 
                        data.get("accountName") or
                        data.get("CustomerName") or
                        data.get("customerName") or
                        data.get("Name") or
                        data.get("name", "")
                    )
                    is_registered = data.get("IsRegistered", data.get("isRegistered", True))
                    
                    if account_name:
                        return {
                            "success": True,
                            "account_name": account_name,
                            "phone": phone,
                            "network": channel,
                            "is_registered": is_registered
                        }
                    else:
                        return {
                            "success": False,
                            "error": "Account name not found",
                            "is_registered": is_registered
                        }
                else:
                    error_text = response.text
                    logger.error(f"📱 [MOMO VERIFY] Failed: {response.status_code} - {error_text}")
                    return {
                        "success": False,
                        "error": f"Verification failed: {response.status_code}"
                    }
                    
        except Exception as e:
            logger.error(f"📱 [MOMO VERIFY] Exception: {e}")
            return {"success": False, "error": str(e)}

    async def verify_bank_account(
        self,
        bank_code: str,
        account_number: str
    ) -> Dict:
        """
        Verify a bank account and get the account holder name.
        
        API: GET https://rnv.hubtel.com/v2/merchantaccount/merchants/{POS_ID}/bank/verify/{bankcode}/{accountNumber}
        
        Args:
            bank_code: Hubtel bank code (e.g., "300335" for GCB) or bank name
            account_number: Bank account number
            
        Returns:
            Dict with success status and account holder name
        """
        if not HUBTEL_CLIENT_ID or not HUBTEL_CLIENT_SECRET:
            return {"success": False, "error": "Hubtel credentials not configured"}
        
        # Resolve bank code if name was provided
        resolved_bank_code = self.GHANA_BANK_CODES.get(bank_code.upper(), bank_code)
        
        # Clean account number
        account_number = account_number.strip().replace(" ", "").replace("-", "")
        
        url = f"{HUBTEL_VERIFY_BASE_URL}/{self.pos_sales_id}/bank/verify/{resolved_bank_code}/{account_number}"
        
        auth_header = self._get_auth_header()
        
        try:
            logger.info(f"🏦 [BANK VERIFY] Checking {account_number} at bank {resolved_bank_code}")
            
            async with httpx.AsyncClient(proxy=FIXIE_PROXY_URL if FIXIE_PROXY_URL else None, timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": auth_header,
                        "Content-Type": "application/json"
                    }
                )
                
                logger.info(f"🏦 [BANK VERIFY] Status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"🏦 [BANK VERIFY] Response: {result}")
                    
                    # Extract account name from response
                    data = result.get("Data", result.get("data", {}))
                    account_name = (
                        data.get("AccountName") or 
                        data.get("accountName") or
                        data.get("CustomerName") or
                        data.get("customerName") or
                        data.get("Name") or
                        data.get("name", "")
                    )
                    
                    if account_name:
                        return {
                            "success": True,
                            "account_name": account_name,
                            "account_number": account_number,
                            "bank_code": resolved_bank_code
                        }
                    else:
                        return {
                            "success": False,
                            "error": "Account name not found or invalid account"
                        }
                else:
                    error_text = response.text
                    logger.error(f"🏦 [BANK VERIFY] Failed: {response.status_code} - {error_text}")
                    
                    if response.status_code == 404:
                        return {"success": False, "error": "Account not found"}
                    elif response.status_code == 400:
                        return {"success": False, "error": "Invalid account number format"}
                    else:
                        return {"success": False, "error": f"Verification failed: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"🏦 [BANK VERIFY] Exception: {e}")
            return {"success": False, "error": str(e)}

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

    async def query_hubtel_transaction_status(self, client_reference: str = None, transaction_id: str = None) -> Dict:
        """
        Query transaction status - checks both database and Hubtel API.
        
        IMPORTANT: Hubtel's transaction status API often returns 403/404.
        We rely primarily on:
        1. Hubtel webhooks (primary - they POST to us when status changes)
        2. Our database status (set by webhook)
        3. Hubtel API as fallback (often fails with 403)
        
        Args:
            client_reference: The ClientReference used when initiating the payment
            transaction_id: The TransactionId returned by Hubtel
        """
        logger.info(f"🔍 [STATUS CHECK] Starting - client_ref: {client_reference}, tx_id: {transaction_id}")
        
        # STEP 1: Check our database first (most reliable - updated by webhooks)
        if self.db is not None:
            # Check hubtel_payments collection
            hubtel_payment = None
            if client_reference:
                hubtel_payment = await self.db.hubtel_payments.find_one(
                    {"client_reference": client_reference},
                    {"_id": 0}
                )
            elif transaction_id:
                hubtel_payment = await self.db.hubtel_payments.find_one(
                    {"hubtel_transaction_id": transaction_id},
                    {"_id": 0}
                )
            
            if hubtel_payment:
                db_status = hubtel_payment.get("status", "unknown")
                logger.info(f"🔍 [STATUS CHECK] Found in hubtel_payments: status={db_status}")
                
                # If callback already marked it completed or failed, trust that
                if db_status in ["completed", "success", "failed"]:
                    return {
                        "success": True,
                        "status": "completed" if db_status in ["completed", "success"] else "failed",
                        "source": "database_callback",
                        "data": hubtel_payment
                    }
                
                # Get transaction_id from DB if we don't have it
                if not transaction_id:
                    transaction_id = hubtel_payment.get("hubtel_transaction_id")
            
            # Also check momo_payments collection
            momo_payment = None
            if client_reference:
                momo_payment = await self.db.momo_payments.find_one(
                    {"$or": [
                        {"reference": client_reference},
                        {"client_reference": client_reference}
                    ]},
                    {"_id": 0}
                )
            
            if momo_payment:
                db_status = momo_payment.get("status", "unknown")
                logger.info(f"🔍 [STATUS CHECK] Found in momo_payments: status={db_status}")
                
                if db_status in ["completed", "success", "failed"]:
                    return {
                        "success": True,
                        "status": "completed" if db_status in ["completed", "success"] else "failed",
                        "source": "database_momo",
                        "data": momo_payment
                    }
        
        # STEP 2: Try Hubtel API - use the transaction status endpoint
        if not self.is_configured():
            logger.warning("🔍 [STATUS CHECK] Hubtel not configured, returning DB status")
            return {"success": False, "error": "Hubtel not configured", "status": "unknown"}
        
        if not transaction_id and not client_reference:
            logger.warning("🔴 [STATUS CHECK] No reference available for status check")
            return {"success": False, "error": "Transaction reference not available", "status": "unknown"}
        
        # Try the transaction detail endpoint first (more reliable than list)
        # Format: GET /merchantaccount/merchants/{pos_sales_id}/transactions/{transaction_id}
        if transaction_id:
            url = f"{HUBTEL_RMP_BASE_URL}/{self.pos_sales_id}/transactions/{transaction_id}"
            logger.info(f"🔍 [STATUS CHECK] Querying Hubtel transaction detail: {url}")
            
            try:
                async with httpx.AsyncClient(
                    proxy=FIXIE_PROXY_URL if FIXIE_PROXY_URL else None,
                    timeout=30.0
                ) as http_client:
                    response = await http_client.get(
                        url,
                        headers={
                            "Authorization": self._get_auth_header(),
                            "Content-Type": "application/json"
                        }
                    )
                    
                    logger.info(f"🔍 [STATUS CHECK] Hubtel transaction detail response: {response.status_code}")
                    
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            return self._parse_hubtel_status_response(data, client_reference, transaction_id)
                        except Exception as e:
                            logger.error(f"🔴 [STATUS CHECK] Parse error: {e}")
            except Exception as e:
                logger.error(f"🔴 [STATUS CHECK] Transaction detail error: {e}")
        
        # Fallback: Try the transactions list endpoint with clientReference filter
        url = f"{HUBTEL_RMP_BASE_URL}/{self.pos_sales_id}/transactions"
        logger.info(f"🔍 [STATUS CHECK] Querying Hubtel transactions list: {url}")
        
        try:
            async with httpx.AsyncClient(
                proxy=FIXIE_PROXY_URL if FIXIE_PROXY_URL else None,
                timeout=30.0
            ) as http_client:
                params = {}
                if client_reference:
                    params["clientReference"] = client_reference
                if transaction_id:
                    params["transactionId"] = transaction_id
                
                response = await http_client.get(
                    url,
                    headers={
                        "Authorization": self._get_auth_header(),
                        "Content-Type": "application/json"
                    },
                    params=params
                )
                
                logger.info(f"🔍 [STATUS CHECK] Hubtel response: {response.status_code}")
                
                # Handle 403 Forbidden - common issue with Hubtel status API
                if response.status_code == 403:
                    logger.warning("🔴 [STATUS CHECK] Hubtel returned 403 - status check API not authorized")
                    # Return unknown but don't fail - let polling continue
                    return {
                        "success": False,
                        "error": "Hubtel status API returned 403 - awaiting webhook",
                        "status": "processing",  # Keep as processing so polling continues
                        "source": "hubtel_api_403"
                    }
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        return self._parse_hubtel_status_response(data, client_reference, transaction_id)
                    except Exception as e:
                        logger.error(f"🔴 [STATUS CHECK] Parse error: {e}")
                        return {"success": False, "error": f"Failed to parse response: {e}", "status": "unknown"}
                else:
                    error_text = response.text[:200] if response.text else "No response body"
                    logger.warning(f"🔴 [STATUS CHECK] HTTP {response.status_code}: {error_text}")
                    return {
                        "success": False,
                        "error": f"Hubtel returned HTTP {response.status_code}",
                        "status": "processing",  # Keep polling
                        "response": error_text
                    }
                    
        except Exception as e:
            logger.error(f"🔴 [STATUS CHECK] Error: {e}")
            return {"success": False, "error": str(e), "status": "unknown"}
    
    def _parse_hubtel_status_response(self, data: Dict, client_reference: str = None, transaction_id: str = None) -> Dict:
        """Parse Hubtel status response and update database if completed."""
        # Parse Hubtel status - check multiple possible field names
        hubtel_status = (
            data.get("Status") or 
            data.get("status") or 
            data.get("TransactionStatus") or
            data.get("Data", {}).get("Status") or
            "unknown"
        )
        response_code = data.get("ResponseCode", data.get("Code", ""))
        
        # ResponseCode 0000 usually means success
        if response_code == "0000":
            hubtel_status = "completed"
        
        # Map Hubtel status to our status
        status_map = {
            "success": "completed", "successful": "completed", "completed": "completed",
            "paid": "completed", "approved": "completed",
            "failed": "failed", "rejected": "failed", "declined": "failed",
            "cancelled": "failed", "expired": "failed",
            "pending": "processing", "processing": "processing", "awaiting": "processing"
        }
        
        status_lower = hubtel_status.lower() if isinstance(hubtel_status, str) else "unknown"
        mapped_status = status_map.get(status_lower, status_lower)
        
        logger.info(f"🔍 [STATUS CHECK] Hubtel status: {hubtel_status} -> {mapped_status}")
        
        return {
            "success": True,
            "status": mapped_status,
            "hubtel_status": hubtel_status,
            "response_code": response_code,
            "transaction_id": transaction_id,
            "source": "hubtel_api",
            "data": data
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
