"""
SDM REWARDS - Hubtel Bank Transfer Service
===========================================
Handles bank transfers via Hubtel Send Money API

Bank Withdrawal: POST https://smp.hubtel.com/api/merchants/{Prepaid_Deposit_ID}/send/bank/gh/{BankCode}
Status Check: GET https://smrsc.hubtel.com/api/merchants/{Prepaid_Deposit_ID}/transactions/status?clientReference={ref}
"""

import os
import httpx
import json
import uuid
import base64
import logging
from datetime import datetime, timezone
from typing import Dict, Optional, List

logger = logging.getLogger(__name__)

# Hubtel Configuration
HUBTEL_CLIENT_ID = os.environ.get("HUBTEL_CLIENT_ID", "")
HUBTEL_CLIENT_SECRET = os.environ.get("HUBTEL_CLIENT_SECRET", "")
HUBTEL_PREPAID_DEPOSIT_ID = os.environ.get("HUBTEL_PREPAID_DEPOSIT_ID", "")
CALLBACK_BASE_URL = os.environ.get("CALLBACK_BASE_URL", "https://sdmrewards.com")

# Fixie Static IP Proxy
FIXIE_PROXY_URL = os.environ.get("FIXIE_URL", "")

# Hubtel API URLs
HUBTEL_BANK_BASE_URL = "https://smp.hubtel.com/api/merchants"
HUBTEL_STATUS_BASE_URL = "https://smrsc.hubtel.com/api/merchants"

# Ghana Bank Codes for Hubtel
GHANA_BANK_CODES = {
    "GCB": {"code": "300335", "name": "GCB Bank"},
    "ECOBANK": {"code": "130100", "name": "Ecobank Ghana"},
    "STANBIC": {"code": "190100", "name": "Stanbic Bank"},
    "STANDARD_CHARTERED": {"code": "020100", "name": "Standard Chartered"},
    "FIDELITY": {"code": "240100", "name": "Fidelity Bank"},
    "ACCESS": {"code": "280100", "name": "Access Bank"},
    "UBA": {"code": "060100", "name": "United Bank for Africa"},
    "ZENITH": {"code": "120100", "name": "Zenith Bank"},
    "GT_BANK": {"code": "230100", "name": "GT Bank"},
    "CAL_BANK": {"code": "140100", "name": "CAL Bank"},
    "ABSA": {"code": "030100", "name": "Absa Bank Ghana"},
    "FIRST_ATLANTIC": {"code": "170100", "name": "First Atlantic Bank"},
    "SOCIETE_GENERALE": {"code": "090100", "name": "Societe Generale"},
    "PRUDENTIAL": {"code": "180100", "name": "Prudential Bank"},
    "REPUBLIC": {"code": "500335", "name": "Republic Bank"},
    "NATIONAL_INVESTMENT": {"code": "360100", "name": "National Investment Bank"},
    "AGRICULTURAL_DEV": {"code": "080100", "name": "Agricultural Development Bank"},
    "FIRST_NATIONAL": {"code": "330100", "name": "First National Bank"},
    "BANK_OF_AFRICA": {"code": "210100", "name": "Bank of Africa"},
    "CONSOLIDATED": {"code": "400100", "name": "Consolidated Bank"},
    "ARB_APEX": {"code": "070100", "name": "ARB Apex Bank"},
    "HERITAGE": {"code": "370100", "name": "Heritage Bank"},
    "PREMIUM": {"code": "380100", "name": "Premium Bank"},
    "UNIVERSAL_MERCHANT": {"code": "100100", "name": "Universal Merchant Bank"},
    "OMNI_BSIC": {"code": "460100", "name": "OmniBank (BSIC)"}
}


class HubtelBankService:
    """
    Hubtel Bank Transfer Service with status tracking.
    Uses httpx with Fixie proxy for static IP compliance.
    """
    
    def __init__(self, db=None):
        self.db = db
        self.client_id = HUBTEL_CLIENT_ID
        self.client_secret = HUBTEL_CLIENT_SECRET
        self.prepaid_deposit_id = HUBTEL_PREPAID_DEPOSIT_ID
        self.callback_base_url = CALLBACK_BASE_URL
    
    def _get_auth_header(self) -> str:
        """Generate Basic Auth header"""
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"
    
    def is_configured(self) -> bool:
        """Check if service is properly configured"""
        return bool(self.client_id and self.client_secret and self.prepaid_deposit_id)
    
    def get_bank_list(self) -> List[Dict]:
        """Get list of supported banks"""
        banks = [
            {"id": key, "code": value["code"], "name": value["name"]}
            for key, value in GHANA_BANK_CODES.items()
        ]
        return sorted(banks, key=lambda x: x["name"])
    
    async def send_to_bank(
        self,
        account_number: str,
        bank_id: str,
        amount: float,
        account_name: str,
        description: str = "SDM Cashback Withdrawal",
        client_reference: str = None,
        user_id: str = None
    ) -> Dict:
        """
        Send money to a bank account via Hubtel
        
        API: POST https://smp.hubtel.com/api/merchants/{Prepaid_Deposit_ID}/send/bank/gh/{BankCode}
        
        Args:
            account_number: Recipient bank account number
            bank_id: Bank identifier (e.g., "GCB", "ECOBANK")
            amount: Amount in GHS
            account_name: Name on the bank account
            description: Transfer description
            client_reference: Unique reference for tracking
            user_id: ID of the user making the withdrawal
        """
        client_reference = client_reference or f"BANK-{uuid.uuid4().hex[:12].upper()}"
        
        if not self.is_configured():
            return {"success": False, "error": "Bank transfer service not configured"}
        
        # Get bank code
        bank_info = GHANA_BANK_CODES.get(bank_id.upper())
        if not bank_info:
            return {"success": False, "error": f"Unknown bank: {bank_id}"}
        
        bank_code = bank_info["code"]
        bank_name = bank_info["name"]
        
        # Build URL
        url = f"{HUBTEL_BANK_BASE_URL}/{self.prepaid_deposit_id}/send/bank/gh/{bank_code}"
        
        # Build payload
        payload = {
            "RecipientAccountNumber": account_number,
            "RecipientName": account_name,
            "Amount": amount,
            "Description": description,
            "ClientReference": client_reference,
            "PrimaryCallbackUrl": f"{self.callback_base_url}/api/payments/hubtel/bank-callback"
        }
        
        # Log transaction to database
        transaction_record = {
            "id": str(uuid.uuid4()),
            "type": "bank_withdrawal",
            "user_id": user_id,
            "client_reference": client_reference,
            "account_number": account_number[-4:].rjust(len(account_number), '*'),  # Masked
            "account_number_full": account_number,  # Full for processing
            "account_name": account_name,
            "bank_id": bank_id,
            "bank_code": bank_code,
            "bank_name": bank_name,
            "amount": amount,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.db is not None:
            await self.db.bank_transfers.insert_one(transaction_record)
        
        # Make request via httpx with proxy
        try:
            headers = {
                "Authorization": self._get_auth_header(),
                "Content-Type": "application/json"
            }
            
            print("=" * 70)
            print("🏦 [BANK TRANSFER] REQUEST")
            print("=" * 70)
            print(f"📍 URL: {url}")
            print(f"📦 PAYLOAD: {json.dumps(payload, indent=2)}")
            print(f"🔒 Using Proxy: {'Yes' if FIXIE_PROXY_URL else 'No'}")
            
            async with httpx.AsyncClient(proxy=FIXIE_PROXY_URL if FIXIE_PROXY_URL else None, timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                http_code = response.status_code
                
                print(f"🟢 [BANK TRANSFER] HTTP Code: {http_code}")
                
                try:
                    result = response.json()
                    print(f"🟢 [BANK TRANSFER] Response: {json.dumps(result, indent=2)}")
                except:
                    result = {"raw": response.text}
                    print(f"🟢 [BANK TRANSFER] Raw: {response.text}")
            
            logger.info(f"Bank transfer response: {result}")
            
            response_code = result.get("ResponseCode", result.get("responseCode", ""))
            message = result.get("Message", result.get("message", ""))
            data = result.get("Data", result.get("data", {}))
            
            # Success check: 0000 = immediate success, 0001 = pending
            is_success = http_code in [200, 201] and response_code in ["0000", "0001"]
            
            # Get transaction ID from response
            hubtel_transaction_id = data.get("TransactionId", data.get("transactionId", ""))
            
            # Update database record
            update_data = {
                "status": "processing" if response_code == "0001" else ("success" if response_code == "0000" else "failed"),
                "hubtel_transaction_id": hubtel_transaction_id,
                "hubtel_response_code": response_code,
                "hubtel_message": message,
                "hubtel_response": result,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if self.db is not None:
                await self.db.bank_transfers.update_one(
                    {"client_reference": client_reference},
                    {"$set": update_data}
                )
            
            if is_success:
                return {
                    "success": True,
                    "pending": response_code == "0001",
                    "transaction_id": hubtel_transaction_id,
                    "client_reference": client_reference,
                    "message": message or "Bank transfer initiated",
                    "status": "processing" if response_code == "0001" else "success"
                }
            else:
                error_msg = message or f"Bank transfer failed (HTTP {http_code})"
                
                # Specific error handling
                if response_code == "4075":
                    error_msg = "Insufficient balance in merchant account"
                elif response_code == "4105":
                    error_msg = "Invalid account number"
                elif http_code == 403:
                    error_msg = "Access denied - IP not whitelisted"
                
                return {"success": False, "error": error_msg, "client_reference": client_reference}
        
        except httpx.TimeoutException:
            logger.error("Bank transfer timeout")
            if self.db is not None:
                await self.db.bank_transfers.update_one(
                    {"client_reference": client_reference},
                    {"$set": {"status": "timeout", "error": "Request timeout"}}
                )
            return {"success": False, "error": "Request timeout. Please try again.", "client_reference": client_reference}
        
        except Exception as e:
            logger.error(f"Bank transfer error: {e}")
            if self.db is not None:
                await self.db.bank_transfers.update_one(
                    {"client_reference": client_reference},
                    {"$set": {"status": "error", "error": str(e)}}
                )
            return {"success": False, "error": str(e), "client_reference": client_reference}
    
    async def check_transaction_status(self, client_reference: str) -> Dict:
        """
        Check transaction status via Hubtel Status API
        
        API: GET https://smrsc.hubtel.com/api/merchants/{Prepaid_Deposit_ID}/transactions/status?clientReference={ref}
        """
        if not self.is_configured():
            return {"success": False, "error": "Service not configured"}
        
        url = f"{HUBTEL_STATUS_BASE_URL}/{self.prepaid_deposit_id}/transactions/status"
        params = {"clientReference": client_reference}
        
        try:
            headers = {
                "Authorization": self._get_auth_header(),
                "Content-Type": "application/json"
            }
            
            print("=" * 70)
            print("🔍 [STATUS CHECK] REQUEST")
            print("=" * 70)
            print(f"📍 URL: {url}")
            print(f"📦 Params: {params}")
            
            async with httpx.AsyncClient(proxy=FIXIE_PROXY_URL if FIXIE_PROXY_URL else None, timeout=30.0) as client:
                response = await client.get(url, headers=headers, params=params)
                http_code = response.status_code
                
                print(f"🟢 [STATUS CHECK] HTTP Code: {http_code}")
                
                try:
                    result = response.json()
                    print(f"🟢 [STATUS CHECK] Response: {json.dumps(result, indent=2)}")
                except:
                    result = {"raw": response.text}
            
            logger.info(f"Status check response: {result}")
            
            if http_code == 200:
                data = result.get("Data", result.get("data", {}))
                status = data.get("Status", data.get("status", "unknown"))
                
                # Map Hubtel status to our status
                status_map = {
                    "Success": "success",
                    "Successful": "success",
                    "Completed": "success",
                    "Pending": "processing",
                    "Processing": "processing",
                    "Failed": "failed",
                    "Rejected": "failed",
                    "Cancelled": "cancelled"
                }
                
                normalized_status = status_map.get(status, "unknown")
                
                # Update database
                if self.db is not None:
                    await self.db.bank_transfers.update_one(
                        {"client_reference": client_reference},
                        {"$set": {
                            "status": normalized_status,
                            "hubtel_status": status,
                            "status_checked_at": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                
                return {
                    "success": True,
                    "status": normalized_status,
                    "hubtel_status": status,
                    "client_reference": client_reference,
                    "data": data
                }
            else:
                return {
                    "success": False,
                    "error": f"Status check failed (HTTP {http_code})",
                    "client_reference": client_reference
                }
        
        except Exception as e:
            logger.error(f"Status check error: {e}")
            return {"success": False, "error": str(e), "client_reference": client_reference}
    
    async def get_user_bank_transfers(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get user's bank transfer history"""
        if self.db is None:
            return []
        
        transfers = await self.db.bank_transfers.find(
            {"user_id": user_id},
            {"_id": 0, "account_number_full": 0}  # Exclude sensitive data
        ).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        return transfers


# Singleton instance
_bank_service = None

def get_hubtel_bank_service(db=None) -> HubtelBankService:
    """Get singleton instance"""
    global _bank_service
    if _bank_service is None:
        _bank_service = HubtelBankService(db)
    elif db is not None and _bank_service.db is None:
        _bank_service.db = db
    return _bank_service
