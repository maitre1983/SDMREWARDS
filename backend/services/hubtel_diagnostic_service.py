"""
SDM REWARDS - Hubtel Diagnostic Service
========================================
Test endpoints to diagnose Hubtel SMP API issues
"""

import os
import httpx
import base64
import json
import logging
from datetime import datetime, timezone
from typing import Dict

logger = logging.getLogger(__name__)

# Hubtel Configuration
HUBTEL_CLIENT_ID = os.environ.get("HUBTEL_CLIENT_ID", "")
HUBTEL_CLIENT_SECRET = os.environ.get("HUBTEL_CLIENT_SECRET", "")
HUBTEL_PREPAID_DEPOSIT_ID = os.environ.get("HUBTEL_PREPAID_DEPOSIT_ID", "")
FIXIE_PROXY_URL = os.environ.get("FIXIE_URL", "")
CALLBACK_BASE_URL = os.environ.get("CALLBACK_BASE_URL", "https://sdmrewards.com")

# API URLs
SMP_BASE_URL = "https://smp.hubtel.com/api"
SMRSC_BASE_URL = "https://smrsc.hubtel.com/api"


class HubtelDiagnosticService:
    """
    Diagnostic service to test Hubtel SMP API configuration
    """
    
    def __init__(self):
        self.client_id = HUBTEL_CLIENT_ID
        self.client_secret = HUBTEL_CLIENT_SECRET
        self.prepaid_id = HUBTEL_PREPAID_DEPOSIT_ID
        self.proxy_url = FIXIE_PROXY_URL
    
    def _get_auth_header(self) -> str:
        """Generate Basic Auth header"""
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"
    
    def get_configuration_summary(self) -> Dict:
        """Get current configuration summary (masked for security)"""
        return {
            "client_id": f"{self.client_id[:6]}...{self.client_id[-4:]}" if len(self.client_id) > 10 else "NOT SET",
            "client_secret": f"{self.client_secret[:4]}...{self.client_secret[-4:]}" if len(self.client_secret) > 8 else "NOT SET",
            "prepaid_deposit_id": self.prepaid_id or "NOT SET",
            "proxy_configured": bool(self.proxy_url),
            "proxy_ip": "52.5.155.132 (Fixie)" if self.proxy_url else "Dynamic IP",
            "is_configured": bool(self.client_id and self.client_secret and self.prepaid_id)
        }
    
    async def check_account_balance(self) -> Dict:
        """
        Check prepaid account balance
        This helps verify if the account is accessible
        """
        url = f"{SMRSC_BASE_URL}/merchants/{self.prepaid_id}/balance"
        
        try:
            async with httpx.AsyncClient(
                proxy=self.proxy_url if self.proxy_url else None,
                timeout=30.0
            ) as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": self._get_auth_header(),
                        "Content-Type": "application/json"
                    }
                )
                
                return {
                    "success": response.status_code == 200,
                    "status_code": response.status_code,
                    "url": url,
                    "response": self._safe_parse_json(response.text),
                    "raw_response": response.text[:500] if response.status_code != 200 else None
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "url": url
            }
    
    async def test_momo_disbursement(self, phone: str, amount: float = 1.0) -> Dict:
        """
        Test MoMo disbursement with detailed diagnostics
        Uses minimum amount for testing
        """
        # Normalize phone
        if phone.startswith("0"):
            phone = "233" + phone[1:]
        elif not phone.startswith("233"):
            phone = "233" + phone
        
        # Detect network
        prefix = phone[3:5] if len(phone) >= 5 else ""
        if prefix in ["24", "25", "53", "54", "55", "59"]:
            channel = "mtn-gh"
        elif prefix in ["20", "50"]:
            channel = "vodafone-gh"
        else:
            channel = "tigo-gh"
        
        url = f"{SMP_BASE_URL}/merchants/{self.prepaid_id}/send/mobilemoney"
        
        payload = {
            "RecipientMsisdn": phone,
            "Amount": amount,
            "Channel": channel,
            "Description": f"SDM Diagnostic Test - {datetime.now().strftime('%H:%M:%S')}",
            "ClientReference": f"DIAG-MOMO-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "PrimaryCallbackUrl": f"{CALLBACK_BASE_URL}/api/payments/hubtel/callback"
        }
        
        diagnostics = {
            "test_type": "MoMo Disbursement",
            "url": url,
            "method": "POST",
            "payload": payload,
            "proxy_used": bool(self.proxy_url),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            async with httpx.AsyncClient(
                proxy=self.proxy_url if self.proxy_url else None,
                timeout=30.0
            ) as client:
                response = await client.post(
                    url,
                    headers={
                        "Authorization": self._get_auth_header(),
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                
                diagnostics["response"] = {
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "body": self._safe_parse_json(response.text),
                    "raw_body": response.text
                }
                
                # Analyze response
                diagnostics["analysis"] = self._analyze_response(response.status_code, response.text)
                
                return diagnostics
                
        except Exception as e:
            diagnostics["error"] = str(e)
            diagnostics["error_type"] = type(e).__name__
            return diagnostics
    
    async def test_momo_collection(self, phone: str, amount: float = 1.0) -> Dict:
        """
        Test MoMo collection (Receive Money) with detailed diagnostics
        This tests if the account can COLLECT payments from customers
        
        ⚠️ This will send a payment prompt to the phone number!
        """
        # Get POS Sales ID for collection
        pos_sales_id = os.environ.get("HUBTEL_POS_SALES_ID", "")
        
        # Normalize phone
        if phone.startswith("0"):
            phone = "233" + phone[1:]
        elif not phone.startswith("233"):
            phone = "233" + phone
        
        # Detect network
        prefix = phone[3:5] if len(phone) >= 5 else ""
        if prefix in ["24", "25", "53", "54", "55", "59"]:
            channel = "mtn-gh"
        elif prefix in ["20", "50"]:
            channel = "vodafone-gh"
        else:
            channel = "tigo-gh"
        
        url = f"https://rmp.hubtel.com/merchantaccount/merchants/{pos_sales_id}/receive/mobilemoney"
        
        payload = {
            "CustomerMsisdn": phone,
            "Amount": amount,
            "Channel": channel,
            "Description": f"SDM Diagnostic Collection Test - {datetime.now().strftime('%H:%M:%S')}",
            "ClientReference": f"DIAG-COL-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "PrimaryCallbackUrl": f"{CALLBACK_BASE_URL}/api/payments/hubtel/callback"
        }
        
        diagnostics = {
            "test_type": "MoMo Collection (Receive Money)",
            "url": url,
            "method": "POST",
            "payload": payload,
            "pos_sales_id": pos_sales_id,
            "proxy_used": bool(self.proxy_url),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            async with httpx.AsyncClient(
                proxy=self.proxy_url if self.proxy_url else None,
                timeout=30.0
            ) as client:
                response = await client.post(
                    url,
                    headers={
                        "Authorization": self._get_auth_header(),
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                
                diagnostics["response"] = {
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "body": self._safe_parse_json(response.text),
                    "raw_body": response.text
                }
                
                # Analyze response
                analysis = self._analyze_response(response.status_code, response.text)
                
                # Add collection-specific analysis
                if response.status_code == 403:
                    analysis["issue"] = "Collection API access denied. POS Sales ID may not be enabled for Receive Money or IP not whitelisted."
                    analysis["recommendation"] = f"Contact Hubtel to enable Receive Money for POS Sales ID: {pos_sales_id} and whitelist IP: 52.5.155.132"
                
                diagnostics["analysis"] = analysis
                
                return diagnostics
                
        except Exception as e:
            diagnostics["error"] = str(e)
            diagnostics["error_type"] = type(e).__name__
            return diagnostics

    async def test_bank_disbursement(self, account_number: str, bank_code: str, 
                                      account_name: str, amount: float = 1.0) -> Dict:
        """
        Test Bank disbursement with detailed diagnostics
        """
        url = f"{SMP_BASE_URL}/merchants/{self.prepaid_id}/send/bank/gh/{bank_code}"
        
        payload = {
            "RecipientAccountNumber": account_number,
            "RecipientName": account_name,
            "Amount": amount,
            "Description": f"SDM Diagnostic Test - {datetime.now().strftime('%H:%M:%S')}",
            "ClientReference": f"DIAG-BANK-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "PrimaryCallbackUrl": f"{CALLBACK_BASE_URL}/api/payments/hubtel/bank-callback"
        }
        
        diagnostics = {
            "test_type": "Bank Disbursement",
            "url": url,
            "method": "POST",
            "payload": payload,
            "proxy_used": bool(self.proxy_url),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            async with httpx.AsyncClient(
                proxy=self.proxy_url if self.proxy_url else None,
                timeout=30.0
            ) as client:
                response = await client.post(
                    url,
                    headers={
                        "Authorization": self._get_auth_header(),
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                
                diagnostics["response"] = {
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "body": self._safe_parse_json(response.text),
                    "raw_body": response.text
                }
                
                diagnostics["analysis"] = self._analyze_response(response.status_code, response.text)
                
                return diagnostics
                
        except Exception as e:
            diagnostics["error"] = str(e)
            diagnostics["error_type"] = type(e).__name__
            return diagnostics
    
    async def get_transaction_history(self, limit: int = 10) -> Dict:
        """
        Get recent transaction history for the prepaid account
        """
        url = f"{SMRSC_BASE_URL}/merchants/{self.prepaid_id}/transactions"
        
        try:
            async with httpx.AsyncClient(
                proxy=self.proxy_url if self.proxy_url else None,
                timeout=30.0
            ) as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": self._get_auth_header(),
                        "Content-Type": "application/json"
                    },
                    params={"pageSize": limit}
                )
                
                return {
                    "success": response.status_code == 200,
                    "status_code": response.status_code,
                    "url": url,
                    "transactions": self._safe_parse_json(response.text)
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "url": url
            }
    
    def _safe_parse_json(self, text: str) -> Dict:
        """Safely parse JSON response"""
        try:
            return json.loads(text)
        except (json.JSONDecodeError, TypeError):
            return {"raw": text}
    
    def _analyze_response(self, status_code: int, response_text: str) -> Dict:
        """Analyze Hubtel response and provide insights"""
        analysis = {
            "status": "unknown",
            "issue": None,
            "recommendation": None
        }
        
        response_lower = response_text.lower()
        
        if status_code == 200:
            analysis["status"] = "success"
        elif status_code == 401:
            analysis["status"] = "auth_failed"
            analysis["issue"] = "Invalid credentials"
            analysis["recommendation"] = "Verify HUBTEL_CLIENT_ID and HUBTEL_CLIENT_SECRET"
        elif status_code == 403:
            analysis["status"] = "forbidden"
            analysis["issue"] = "IP not whitelisted or account not enabled"
            analysis["recommendation"] = "Contact Hubtel to whitelist IP: 52.5.155.132"
        elif status_code == 400:
            if "limit" in response_lower:
                analysis["status"] = "limit_exceeded"
                analysis["issue"] = "Transaction limit exceeded on Hubtel account"
                analysis["recommendation"] = "Contact Hubtel to increase account transaction limits"
            elif "insufficient" in response_lower or "balance" in response_lower:
                analysis["status"] = "insufficient_balance"
                analysis["issue"] = "Insufficient prepaid balance"
                analysis["recommendation"] = "Top up prepaid account balance"
            else:
                analysis["status"] = "bad_request"
                analysis["issue"] = "Invalid request parameters"
        elif status_code == 404:
            analysis["status"] = "not_found"
            analysis["issue"] = "Prepaid Deposit ID not found"
            analysis["recommendation"] = "Verify HUBTEL_PREPAID_DEPOSIT_ID"
        elif status_code >= 500:
            analysis["status"] = "server_error"
            analysis["issue"] = "Hubtel server error"
            analysis["recommendation"] = "Retry later or contact Hubtel support"
        
        return analysis


# Singleton instance
_diagnostic_service = None

def get_diagnostic_service() -> HubtelDiagnosticService:
    global _diagnostic_service
    if _diagnostic_service is None:
        _diagnostic_service = HubtelDiagnosticService()
    return _diagnostic_service
