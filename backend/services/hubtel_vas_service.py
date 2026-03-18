"""
Hubtel Value Added Services (VAS) - Airtime, Data Bundles, Bill Payments

API Documentation: https://cs.hubtel.com/commissionservices
Replaces BulkClix for VAS services
"""

import os
import logging
import uuid
import subprocess
import json
import httpx
from datetime import datetime, timezone
from typing import Dict, Optional
import asyncio

logger = logging.getLogger(__name__)

# Hubtel Commission Services Configuration
HUBTEL_CS_BASE_URL = "https://cs.hubtel.com/commissionservices"
HUBTEL_PREPAID_ID = os.environ.get("HUBTEL_PREPAID_DEPOSIT_ID", "")
HUBTEL_API_ID = os.environ.get("HUBTEL_CLIENT_ID", "")
HUBTEL_API_KEY = os.environ.get("HUBTEL_CLIENT_SECRET", "")
CALLBACK_BASE_URL = os.environ.get("CALLBACK_BASE_URL", "https://sdmrewards.com")

# Fixie Static IP Proxy - Routes Hubtel calls through a static IP
FIXIE_PROXY_URL = os.environ.get("FIXIE_URL", "")

def is_vas_test_mode() -> bool:
    """
    PRODUCTION OVERRIDE: Always returns False to ensure real API calls.
    Test mode is DISABLED permanently.
    
    If you need to enable test mode for development:
    1. Comment out the 'return False' line below
    2. Uncomment the environment check
    """
    # FORCED PRODUCTION MODE - ALWAYS REAL API
    return False
    
    # Original code (disabled for production safety):
    # env_value = os.environ.get("VAS_TEST_MODE", "false").lower()
    # print(f"🚨 ACTIVE FILE: {__file__}")
    # print(f"🚨 VAS_TEST_MODE env value: '{env_value}'")
    # return env_value == "true"

# Hubtel Commission Services - CORRECT Service IDs (from Hubtel documentation)
# Airtime Service IDs
HUBTEL_AIRTIME_SERVICE_IDS = {
    "MTN": "fdd76c884e614b1c8f669a3207b09a98",
    "TELECEL": "f4be83ad74c742e185224fdae1304800",
    "VODAFONE": "f4be83ad74c742e185224fdae1304800",  # Telecel/Vodafone same
    "AT": "dae2142eb5a14c298eace60240c09e4b",
    "AIRTELTIGO": "dae2142eb5a14c298eace60240c09e4b"
}

# Data Bundle Service IDs
HUBTEL_DATA_SERVICE_IDS = {
    "MTN": "b230733cd56b4a0fad820e39f66bc27c",
    "TELECEL": "fa27127ba039455da04a2ac8a1613e00",
    "VODAFONE": "fa27127ba039455da04a2ac8a1613e00",  # Telecel/Vodafone same
    "AT": "06abd92da459428496967612463575ca",
    "AIRTELTIGO": "06abd92da459428496967612463575ca"
}

# ECG/Bill Payment Service IDs
HUBTEL_BILL_SERVICE_IDS = {
    "ECG_PREPAID": "e6d6bac062b5499cb1ece1ac3d742a84",
    "ECG_POSTPAID": "e6d6bac062b5499cb1ece1ac3d742a84"
}


class HubtelVASService:
    """
    Hubtel Value Added Services for Airtime, Data Bundles, and Bill Payments
    """
    
    def __init__(self, db=None):
        self.db = db
        self.api_id = HUBTEL_API_ID
        self.api_key = HUBTEL_API_KEY
        self.prepaid_id = HUBTEL_PREPAID_ID
        self.base_url = HUBTEL_CS_BASE_URL
        self.callback_base_url = CALLBACK_BASE_URL
    
    def is_configured(self) -> bool:
        """Check if Hubtel VAS is properly configured"""
        return bool(self.api_id and self.api_key and self.prepaid_id)
    
    def _get_auth_header(self) -> str:
        """Generate Basic Auth header for Hubtel API"""
        import base64
        credentials = f"{self.api_id}:{self.api_key}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number to 0XXXXXXXXX format for Hubtel"""
        phone = phone.strip().replace(" ", "").replace("-", "")
        if phone.startswith("+233"):
            return "0" + phone[4:]
        elif phone.startswith("233"):
            return "0" + phone[3:]
        elif not phone.startswith("0"):
            return "0" + phone
        return phone
    
    def _detect_network(self, phone: str) -> str:
        """Detect mobile network from phone number"""
        normalized = self._normalize_phone(phone)
        prefix = normalized[1:3] if len(normalized) >= 3 else ""
        
        mtn_prefixes = ["24", "25", "53", "54", "55", "59"]
        vodafone_prefixes = ["20", "50"]
        tigo_prefixes = ["27", "26", "56", "57"]
        glo_prefixes = ["23"]
        
        if prefix in mtn_prefixes:
            return "MTN"
        elif prefix in vodafone_prefixes:
            return "VODAFONE"
        elif prefix in tigo_prefixes:
            return "TELECEL"
        elif prefix in glo_prefixes:
            return "GLO"
        return "MTN"  # Default to MTN
    
    async def _make_hubtel_request(self, method: str, url: str, payload: dict = None) -> Dict:
        """
        Make HTTP request to Hubtel API using httpx with Fixie proxy.
        This routes all requests through a static IP for Hubtel whitelist compliance.
        
        Uses httpx instead of curl for better compatibility with Render/cloud environments.
        """
        auth_header = self._get_auth_header()
        proxy_url = FIXIE_PROXY_URL
        
        try:
            # Configure proxy for httpx
            proxies = None
            if proxy_url:
                proxies = proxy_url
                print(f"🔒 [HTTPX] Using Fixie static IP proxy")
                logger.info(f"Using Fixie proxy for Hubtel request")
            else:
                print(f"⚠️ [HTTPX] No proxy configured - using direct connection")
            
            # Log request details
            print(f"🔵 [HTTPX] {method} {url}")
            if payload:
                print(f"🔵 [HTTPX] Payload: {json.dumps(payload)}")
            
            headers = {
                "Authorization": auth_header,
                "Content-Type": "application/json"
            }
            
            # Make the request with httpx
            async with httpx.AsyncClient(proxy=proxies, timeout=30.0) as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers)
                else:
                    response = await client.post(url, headers=headers, json=payload)
                
                http_code = response.status_code
                print(f"🟢 [HTTPX] HTTP Code: {http_code}")
                
                try:
                    body = response.text
                    result = response.json()
                    print(f"🟢 [HTTPX] Response: {body[:500]}")
                except:
                    result = {"raw": response.text}
                    print(f"🟢 [HTTPX] Raw response: {response.text[:500]}")
                
                return {"data": result, "http_code": http_code}
                
        except httpx.TimeoutException as e:
            print(f"🚨 [HTTPX] Timeout: {str(e)}")
            logger.error(f"HTTPX timeout: {e}")
            return {"data": {"error": "Request timeout"}, "http_code": 0}
        except httpx.ProxyError as e:
            print(f"🚨 [HTTPX] Proxy error: {str(e)}")
            logger.error(f"HTTPX proxy error: {e}")
            return {"data": {"error": f"Proxy error: {str(e)}"}, "http_code": 0}
        except Exception as e:
            print(f"🚨 [HTTPX] Exception: {str(e)}")
            logger.error(f"HTTPX error: {e}")
            return {"data": {"error": str(e)}, "http_code": 0}
    
    # ============== AIRTIME SERVICES ==============
    
    async def buy_airtime(
        self,
        phone: str,
        amount: float,
        network: str = None,
        client_reference: str = None
    ) -> Dict:
        """
        Purchase airtime for a phone number via Hubtel Commission Services
        
        Args:
            phone: Destination phone number
            amount: Airtime amount in GHS
            network: Network provider (auto-detected if not provided)
            client_reference: Unique reference for this transaction
        """
        normalized_phone = self._normalize_phone(phone)
        detected_network = network.upper() if network else self._detect_network(phone)
        client_reference = client_reference or f"AIRTIME-{uuid.uuid4().hex[:12].upper()}"
        
        # DEBUG: Print test mode status at RUNTIME
        current_test_mode = is_vas_test_mode()
        print(f"🔍 [DEBUG] VAS_TEST_MODE at runtime: {current_test_mode}")
        print(f"🔍 [DEBUG] ENV VAS_TEST_MODE value: {os.environ.get('VAS_TEST_MODE', 'NOT SET')}")
        
        # Log the transaction
        transaction_log = {
            "id": str(uuid.uuid4()),
            "type": "airtime_purchase",
            "phone": normalized_phone,
            "amount": amount,
            "network": detected_network,
            "client_reference": client_reference,
            "status": "pending",
            "provider": "hubtel_vas",
            "test_mode": is_vas_test_mode(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.vas_transactions.insert_one(transaction_log)
        
        # CRITICAL SAFEGUARD: Test mode must NEVER deduct balance
        if is_vas_test_mode():
            logger.warning(f"[TEST MODE BLOCKED] VAS test mode is active - refusing to process")
            print("🚨🚨🚨 TEST MODE ACTIVE - BLOCKING TRANSACTION TO PREVENT BALANCE DEDUCTION 🚨🚨🚨")
            if self.db is not None:
                await self.db.vas_transactions.update_one(
                    {"client_reference": client_reference},
                    {"$set": {"status": "blocked_test_mode"}}
                )
            # Return success: FALSE to prevent balance deduction
            return {
                "success": False,
                "test_mode": True,
                "error": "Service unavailable - system in test mode. No charges applied."
            }
        
        if not self.is_configured():
            return {"success": False, "error": "Hubtel VAS not configured"}
        
        # Get service ID for the network
        service_id = HUBTEL_AIRTIME_SERVICE_IDS.get(detected_network)
        if not service_id:
            return {"success": False, "error": f"Network {detected_network} not supported"}
        
        url = f"{self.base_url}/{self.prepaid_id}/{service_id}"
        
        payload = {
            "Destination": normalized_phone,
            "Amount": amount,
            "ClientReference": client_reference,
            "CallbackURL": f"{self.callback_base_url}/api/vas/callback"
        }
        
        try:
            # DEBUG LOGGING - FULL REQUEST DETAILS
            print("=" * 70)
            print("🔵 [VAS REQUEST] AIRTIME PURCHASE")
            print("=" * 70)
            print(f"📍 URL: {url}")
            print(f"📦 PAYLOAD: {json.dumps(payload, indent=2)}")
            print(f"🔑 PrepaidID: {self.prepaid_id}")
            print(f"🔑 API ID: {self.api_id[:4]}***")
            logger.info(f"[AIRTIME] Calling Hubtel: {url} with payload: {payload}")
            
            response = await self._make_hubtel_request("POST", url, payload)
            result = response.get("data", {})
            http_code = response.get("http_code", 0)
            
            print("=" * 70)
            print("🟢 [VAS RESPONSE] AIRTIME")
            print("=" * 70)
            print(f"📊 HTTP STATUS: {http_code}")
            print(f"📋 RESPONSE BODY: {json.dumps(result, indent=2) if isinstance(result, dict) else result}")
            logger.info(f"Hubtel Airtime response (HTTP {http_code}): {result}")
            
            # Handle HTTP 0 (connection failed)
            if http_code == 0:
                error_detail = result.get("raw", "") or result.get("error", "Connection failed - no response from Hubtel")
                print(f"🚨 [ERROR] HTTP 0 - Connection failed: {error_detail}")
                if self.db is not None:
                    await self.db.vas_transactions.update_one(
                        {"client_reference": client_reference},
                        {"$set": {"status": "failed", "error": f"Connection failed: {error_detail}"}}
                    )
                return {"success": False, "error": f"Connection to Hubtel failed. Please try again. Details: {error_detail}"}
            
            response_code = result.get("ResponseCode", result.get("responseCode", ""))
            
            # 0000 = immediate success, 0001 = pending (awaiting callback)
            if http_code in [200, 201] and response_code == "0000":
                # Immediate success
                if self.db is not None:
                    await self.db.vas_transactions.update_one(
                        {"client_reference": client_reference},
                        {"$set": {
                            "status": "success",
                            "hubtel_response": result
                        }}
                    )
                return {
                    "success": True,
                    "transaction_id": result.get("Data", {}).get("TransactionId", client_reference),
                    "message": "Airtime sent successfully"
                }
            elif http_code in [200, 201] and response_code == "0001":
                # Pending - transaction submitted, awaiting callback
                transaction_id = result.get("Data", {}).get("TransactionId", client_reference)
                if self.db is not None:
                    await self.db.vas_transactions.update_one(
                        {"client_reference": client_reference},
                        {"$set": {
                            "status": "pending",
                            "transaction_id": transaction_id,
                            "hubtel_response": result
                        }}
                    )
                return {
                    "success": True,
                    "pending": True,
                    "transaction_id": transaction_id,
                    "message": "Airtime request submitted. Processing..."
                }
            else:
                # Build detailed error message
                hubtel_message = result.get("Message", result.get("message", ""))
                hubtel_errors = result.get("Errors", [])
                response_code = result.get("ResponseCode", "")
                
                if hubtel_message:
                    error_msg = f"Hubtel: {hubtel_message}"
                elif hubtel_errors:
                    error_msg = f"Hubtel errors: {hubtel_errors}"
                elif http_code == 401:
                    error_msg = "Authentication failed - invalid API credentials"
                elif http_code == 403:
                    error_msg = "Access denied - IP not whitelisted or insufficient permissions"
                elif http_code >= 500:
                    error_msg = f"Hubtel server error (HTTP {http_code})"
                else:
                    error_msg = f"Airtime failed (HTTP {http_code}, ResponseCode: {response_code})"
                
                print(f"🚨 [ERROR] {error_msg}")
                if self.db is not None:
                    await self.db.vas_transactions.update_one(
                        {"client_reference": client_reference},
                        {"$set": {"status": "failed", "error": error_msg, "http_code": http_code, "hubtel_response": result}}
                    )
                return {"success": False, "error": error_msg}
                
        except Exception as e:
            print(f"🚨 [EXCEPTION] {str(e)}")
            logger.error(f"Hubtel Airtime error: {e}", exc_info=True)
            return {"success": False, "error": f"System error: {str(e)}"}
    
    # ============== DATA BUNDLE SERVICES ==============
    
    async def get_data_bundles(self, phone: str, network: str = None) -> Dict:
        """
        Get available data bundles for a phone number
        
        Args:
            phone: Destination phone number
            network: Network provider (auto-detected if not provided)
        """
        normalized_phone = self._normalize_phone(phone)
        detected_network = network.upper() if network else self._detect_network(phone)
        
        if is_vas_test_mode() or not self.is_configured():
            # Return mock bundles for test mode
            return {
                "success": True,
                "bundles": [
                    {"id": "1", "name": "50MB Daily", "price": 1.0, "validity": "24 hours"},
                    {"id": "2", "name": "200MB Daily", "price": 2.0, "validity": "24 hours"},
                    {"id": "3", "name": "1GB Weekly", "price": 5.0, "validity": "7 days"},
                    {"id": "4", "name": "2GB Weekly", "price": 10.0, "validity": "7 days"},
                    {"id": "5", "name": "5GB Monthly", "price": 25.0, "validity": "30 days"},
                    {"id": "6", "name": "10GB Monthly", "price": 50.0, "validity": "30 days"}
                ],
                "network": detected_network,
                "phone": normalized_phone
            }
        
        service_id = HUBTEL_DATA_SERVICE_IDS.get(detected_network)
        if not service_id:
            return {"success": False, "error": f"Network {detected_network} not supported"}
        
        url = f"{self.base_url}/{self.prepaid_id}/{service_id}?destination={normalized_phone}"
        
        try:
            response = await self._make_hubtel_request("GET", url)
            result = response.get("data", {})
            http_code = response.get("http_code", 0)
            
            if http_code == 200:
                bundles = result.get("Data", result.get("data", []))
                return {
                    "success": True,
                    "bundles": bundles,
                    "network": detected_network,
                    "phone": normalized_phone
                }
            else:
                return {"success": False, "error": result.get("Message", "Failed to fetch bundles")}
                
        except Exception as e:
            logger.error(f"Hubtel Data Bundles error: {e}")
            return {"success": False, "error": str(e)}
    
    async def buy_data_bundle(
        self,
        phone: str,
        bundle_id: str,
        amount: float,
        network: str = None,
        client_reference: str = None
    ) -> Dict:
        """
        Purchase data bundle for a phone number
        
        Args:
            phone: Destination phone number
            bundle_id: Bundle package ID
            amount: Bundle price in GHS
            network: Network provider
            client_reference: Unique reference
        """
        normalized_phone = self._normalize_phone(phone)
        detected_network = network.upper() if network else self._detect_network(phone)
        client_reference = client_reference or f"DATA-{uuid.uuid4().hex[:12].upper()}"
        
        transaction_log = {
            "id": str(uuid.uuid4()),
            "type": "data_bundle_purchase",
            "phone": normalized_phone,
            "bundle_id": bundle_id,
            "amount": amount,
            "network": detected_network,
            "client_reference": client_reference,
            "status": "pending",
            "provider": "hubtel_vas",
            "test_mode": is_vas_test_mode(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.vas_transactions.insert_one(transaction_log)
        
        # CRITICAL SAFEGUARD: Test mode must NEVER deduct balance
        if is_vas_test_mode():
            logger.warning(f"[TEST MODE BLOCKED] VAS test mode is active - refusing to process data bundle")
            print("🚨🚨🚨 TEST MODE ACTIVE - BLOCKING DATA BUNDLE TO PREVENT BALANCE DEDUCTION 🚨🚨🚨")
            if self.db is not None:
                await self.db.vas_transactions.update_one(
                    {"client_reference": client_reference},
                    {"$set": {"status": "blocked_test_mode"}}
                )
            return {
                "success": False,
                "test_mode": True,
                "error": "Service unavailable - system in test mode. No charges applied."
            }
        
        if not self.is_configured():
            return {"success": False, "error": "Hubtel VAS not configured"}
        
        service_id = HUBTEL_DATA_SERVICE_IDS.get(detected_network)
        if not service_id:
            return {"success": False, "error": f"Network {detected_network} not supported"}
        
        url = f"{self.base_url}/{self.prepaid_id}/{service_id}"
        
        payload = {
            "Destination": normalized_phone,
            "Amount": amount,
            "PackageId": bundle_id,
            "ClientReference": client_reference,
            "CallbackURL": f"{self.callback_base_url}/api/vas/callback"
        }
        
        try:
            # DEBUG LOGGING - as requested
            print(f"🔵 [DATA] Calling Hubtel VAS endpoint: {url}")
            print(f"🔵 [DATA] Payload: {payload}")
            logger.info(f"[DATA] Calling Hubtel: {url} with payload: {payload}")
            
            response = await self._make_hubtel_request("POST", url, payload)
            result = response.get("data", {})
            http_code = response.get("http_code", 0)
            
            print(f"🟢 [DATA] Response (HTTP {http_code}): {result}")
            logger.info(f"Hubtel Data Bundle response: {result}")
            
            response_code = result.get("ResponseCode", "")
            
            # 0000 = immediate success, 0001 = pending (awaiting callback)
            if http_code in [200, 201] and response_code == "0000":
                if self.db is not None:
                    await self.db.vas_transactions.update_one(
                        {"client_reference": client_reference},
                        {"$set": {"status": "success", "hubtel_response": result}}
                    )
                return {
                    "success": True,
                    "transaction_id": result.get("Data", {}).get("TransactionId", client_reference),
                    "message": "Data bundle purchased successfully"
                }
            elif http_code in [200, 201] and response_code == "0001":
                # Pending - transaction submitted, awaiting callback
                transaction_id = result.get("Data", {}).get("TransactionId", client_reference)
                if self.db is not None:
                    await self.db.vas_transactions.update_one(
                        {"client_reference": client_reference},
                        {"$set": {
                            "status": "pending",
                            "transaction_id": transaction_id,
                            "hubtel_response": result
                        }}
                    )
                return {
                    "success": True,
                    "pending": True,
                    "transaction_id": transaction_id,
                    "message": "Data bundle request submitted. Processing..."
                }
            else:
                error_msg = result.get("Message", f"Data bundle failed: {http_code}")
                if self.db is not None:
                    await self.db.vas_transactions.update_one(
                        {"client_reference": client_reference},
                        {"$set": {"status": "failed", "error": error_msg}}
                    )
                return {"success": False, "error": error_msg}
                
        except Exception as e:
            logger.error(f"Hubtel Data Bundle error: {e}")
            return {"success": False, "error": str(e)}
    
    # ============== BILL PAYMENT SERVICES ==============
    
    async def pay_ecg_bill(
        self,
        meter_number: str,
        amount: float,
        phone: str = None,
        bill_type: str = "prepaid",
        client_reference: str = None
    ) -> Dict:
        """
        Pay ECG electricity bill
        
        Args:
            meter_number: ECG meter number
            amount: Payment amount in GHS
            phone: Customer phone number (required by Hubtel for SMS notification)
            bill_type: "prepaid" or "postpaid"
            client_reference: Unique reference
        """
        client_reference = client_reference or f"ECG-{uuid.uuid4().hex[:12].upper()}"
        
        # Normalize phone if provided
        normalized_phone = self._normalize_phone(phone) if phone else ""
        
        transaction_log = {
            "id": str(uuid.uuid4()),
            "type": "ecg_payment",
            "meter_number": meter_number,
            "phone": normalized_phone,
            "amount": amount,
            "bill_type": bill_type,
            "client_reference": client_reference,
            "status": "pending",
            "provider": "hubtel_vas",
            "test_mode": is_vas_test_mode(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.vas_transactions.insert_one(transaction_log)
        
        # CRITICAL SAFEGUARD: Test mode must NEVER deduct balance
        if is_vas_test_mode():
            logger.warning(f"[TEST MODE BLOCKED] VAS test mode is active - refusing to process ECG")
            print("🚨🚨🚨 TEST MODE ACTIVE - BLOCKING ECG PAYMENT TO PREVENT BALANCE DEDUCTION 🚨🚨🚨")
            if self.db is not None:
                await self.db.vas_transactions.update_one(
                    {"client_reference": client_reference},
                    {"$set": {"status": "blocked_test_mode"}}
                )
            return {
                "success": False,
                "test_mode": True,
                "error": "Service unavailable - system in test mode. No charges applied."
            }
        
        if not self.is_configured():
            return {"success": False, "error": "Hubtel VAS not configured"}
        
        service_key = "ECG_PREPAID" if bill_type == "prepaid" else "ECG_POSTPAID"
        service_id = HUBTEL_BILL_SERVICE_IDS.get(service_key)
        
        url = f"{self.base_url}/{self.prepaid_id}/{service_id}"
        
        # ECG requires both Destination (phone) and MeterNumber
        payload = {
            "Destination": normalized_phone,
            "MeterNumber": meter_number,
            "Amount": amount,
            "ClientReference": client_reference,
            "CallbackURL": f"{self.callback_base_url}/api/vas/callback"
        }
        
        try:
            # DEBUG LOGGING - as requested
            print(f"🔵 [ECG] Calling Hubtel VAS endpoint: {url}")
            print(f"🔵 [ECG] Payload: {payload}")
            logger.info(f"[ECG] Calling Hubtel: {url} with payload: {payload}")
            
            response = await self._make_hubtel_request("POST", url, payload)
            result = response.get("data", {})
            http_code = response.get("http_code", 0)
            
            print(f"🟢 [ECG] Response (HTTP {http_code}): {result}")
            logger.info(f"Hubtel ECG response: {result}")
            
            response_code = result.get("ResponseCode", "")
            
            # CRITICAL: Only 0000 is SUCCESS for ECG (token received)
            # 0001 = PENDING (no token yet, awaiting callback)
            if http_code in [200, 201] and response_code == "0000":
                token = result.get("Data", {}).get("Token", "")
                if self.db is not None:
                    await self.db.vas_transactions.update_one(
                        {"client_reference": client_reference},
                        {"$set": {"status": "success", "token": token, "hubtel_response": result}}
                    )
                return {
                    "success": True,
                    "transaction_id": result.get("Data", {}).get("TransactionId", client_reference),
                    "token": token,
                    "message": "ECG payment successful - token generated"
                }
            elif http_code in [200, 201] and response_code == "0001":
                # PENDING - Transaction submitted but NO token yet
                # User balance was deducted, awaiting callback for token
                transaction_id = result.get("Data", {}).get("TransactionId", client_reference)
                if self.db is not None:
                    await self.db.vas_transactions.update_one(
                        {"client_reference": client_reference},
                        {"$set": {
                            "status": "pending",
                            "transaction_id": transaction_id,
                            "hubtel_response": result
                        }}
                    )
                return {
                    "success": True,
                    "pending": True,
                    "transaction_id": transaction_id,
                    "message": "ECG payment submitted. Token will be delivered shortly via callback."
                }
            else:
                error_msg = result.get("Message", f"ECG payment failed: {http_code}")
                if self.db is not None:
                    await self.db.vas_transactions.update_one(
                        {"client_reference": client_reference},
                        {"$set": {"status": "failed", "error": error_msg}}
                    )
                return {"success": False, "error": error_msg}
                
        except Exception as e:
            logger.error(f"Hubtel ECG error: {e}")
            return {"success": False, "error": str(e)}


# Singleton instance
_hubtel_vas_service = None

def get_hubtel_vas_service(db=None) -> HubtelVASService:
    """Get or create singleton instance of Hubtel VAS service"""
    global _hubtel_vas_service
    if _hubtel_vas_service is None:
        _hubtel_vas_service = HubtelVASService(db)
    elif db is not None and _hubtel_vas_service.db is None:
        _hubtel_vas_service.db = db
    return _hubtel_vas_service
