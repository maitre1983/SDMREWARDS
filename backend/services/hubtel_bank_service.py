"""
SDM REWARDS - Hubtel Bank Transfer Service
===========================================
Handles bank transfers via Hubtel Send Money API

API Endpoint: https://smp.hubtel.com/api/merchants/{Prepaid_Deposit_ID}/send/bank/gh/{BankCode}
Request Type: POST
Content Type: JSON
"""

import os
import subprocess
import json
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Hubtel Configuration
HUBTEL_CLIENT_ID = os.environ.get("HUBTEL_CLIENT_ID", "")
HUBTEL_CLIENT_SECRET = os.environ.get("HUBTEL_CLIENT_SECRET", "")
HUBTEL_PREPAID_DEPOSIT_ID = os.environ.get("HUBTEL_PREPAID_DEPOSIT_ID", "")
CALLBACK_BASE_URL = os.environ.get("CALLBACK_BASE_URL", "https://sdmrewards.com")

# Fixie Static IP Proxy
FIXIE_PROXY_URL = os.environ.get("FIXIE_URL", "")

# Hubtel Bank Transfer Base URL
HUBTEL_BANK_BASE_URL = "https://smp.hubtel.com/api/merchants"

# Ghana Bank Codes for Hubtel
GHANA_BANK_CODES = {
    "GCB": "300335",
    "ECOBANK": "130100",
    "STANBIC": "190100",
    "STANDARD_CHARTERED": "020100",
    "FIDELITY": "240100",
    "ACCESS": "280100",
    "UBA": "060100",
    "ZENITH": "120100",
    "GT_BANK": "230100",
    "CAL_BANK": "140100",
    "ABSA": "030100",
    "FIRST_ATLANTIC": "170100",
    "SOCIETE_GENERALE": "090100",
    "PRUDENTIAL": "180100",
    "REPUBLIC": "500335",
    "NATIONAL_INVESTMENT": "360100",
    "AGRICULTURAL_DEV": "080100",
    "FIRST_NATIONAL": "330100",
    "BANK_OF_AFRICA": "210100",
    "CONSOLIDATED": "400100",
    "HERITAGE": "370100",
    "PREMIUM": "380100",
    "UNIVERSAL_MERCHANT": "100100",
    "OMNI_BSIC": "460100"
}


class HubtelBankTransferService:
    """
    Hubtel Bank Transfer Service
    Routes requests through Fixie proxy for static IP compliance
    """
    
    def __init__(self, db=None):
        self.db = db
        self.client_id = HUBTEL_CLIENT_ID
        self.client_secret = HUBTEL_CLIENT_SECRET
        self.prepaid_deposit_id = HUBTEL_PREPAID_DEPOSIT_ID
        self.callback_base_url = CALLBACK_BASE_URL
    
    def _get_auth_header(self) -> str:
        """Generate Basic Auth header"""
        import base64
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"
    
    def is_configured(self) -> bool:
        """Check if service is properly configured"""
        return bool(self.client_id and self.client_secret and self.prepaid_deposit_id)
    
    def get_bank_list(self) -> Dict:
        """Get list of supported banks"""
        banks = [
            {"code": code, "name": name.replace("_", " ").title()}
            for name, code in GHANA_BANK_CODES.items()
        ]
        return {
            "success": True,
            "banks": sorted(banks, key=lambda x: x["name"])
        }
    
    async def send_to_bank(
        self,
        account_number: str,
        bank_code: str,
        amount: float,
        account_name: str,
        description: str = "SDM Transfer",
        client_reference: str = None
    ) -> Dict:
        """
        Send money to a bank account via Hubtel
        
        API: POST https://smp.hubtel.com/api/merchants/{Prepaid_Deposit_ID}/send/bank/gh/{BankCode}
        
        Args:
            account_number: Recipient bank account number
            bank_code: Hubtel bank code (e.g., "300335" for GCB)
            amount: Amount in GHS
            account_name: Name on the bank account
            description: Transfer description
            client_reference: Unique reference for tracking
        """
        client_reference = client_reference or f"BANK-{uuid.uuid4().hex[:12].upper()}"
        
        if not self.is_configured():
            return {"success": False, "error": "Bank transfer service not configured"}
        
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
        
        # Log transaction
        if self.db is not None:
            await self.db.bank_transfers.insert_one({
                "id": str(uuid.uuid4()),
                "type": "bank_transfer",
                "account_number": account_number,
                "bank_code": bank_code,
                "account_name": account_name,
                "amount": amount,
                "client_reference": client_reference,
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        # Make request via curl with proxy
        def _execute_curl():
            tmp_path = f"/tmp/hubtel_bank_{uuid.uuid4().hex[:8]}.json"
            
            try:
                auth_header = self._get_auth_header()
                payload_json = json.dumps(payload)
                
                # Build curl command with proxy
                cmd = ["curl", "-s"]
                
                # Add Fixie proxy for static IP
                if FIXIE_PROXY_URL:
                    cmd.extend(["--proxy", FIXIE_PROXY_URL])
                    logger.info("🔒 [BANK TRANSFER] Using Fixie static IP proxy")
                
                cmd.extend([
                    "-X", "POST", url,
                    "--http1.1",
                    "-H", "Content-Type: application/json",
                    "-H", f"Authorization: {auth_header}",
                    "-d", payload_json,
                    "--max-time", "30",
                    "-o", tmp_path,
                    "-w", "%{http_code}"
                ])
                
                # Log request
                logger.info(f"🔵 [BANK TRANSFER] URL: {url}")
                logger.info(f"🔵 [BANK TRANSFER] Payload: {payload}")
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=35)
                http_code = int(result.stdout.strip()) if result.stdout.strip().isdigit() else 0
                
                body = ""
                if os.path.exists(tmp_path):
                    with open(tmp_path, 'r') as f:
                        body = f.read()
                    os.unlink(tmp_path)
                
                logger.info(f"🟢 [BANK TRANSFER] HTTP {http_code}: {body}")
                
                return {"body": body, "http_code": http_code}
            
            except Exception as e:
                logger.error(f"Bank transfer curl error: {e}")
                return {"body": "", "http_code": 0, "error": str(e)}
        
        try:
            response = await asyncio.to_thread(_execute_curl)
            http_code = response.get("http_code", 0)
            
            try:
                result = json.loads(response["body"]) if response["body"] else {}
            except:
                result = {"raw": response["body"]}
            
            response_code = result.get("ResponseCode", result.get("responseCode", ""))
            message = result.get("Message", result.get("message", ""))
            data = result.get("Data", result.get("data", {}))
            
            # Success check
            is_success = http_code in [200, 201] and response_code in ["0000", "0001"]
            
            # Update database
            if self.db is not None:
                status = "success" if response_code == "0000" else "pending" if response_code == "0001" else "failed"
                await self.db.bank_transfers.update_one(
                    {"client_reference": client_reference},
                    {"$set": {
                        "status": status,
                        "hubtel_response": result,
                        "http_code": http_code,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
            
            if is_success:
                return {
                    "success": True,
                    "pending": response_code == "0001",
                    "transaction_id": data.get("TransactionId", client_reference),
                    "client_reference": client_reference,
                    "message": message or "Bank transfer initiated"
                }
            else:
                error_msg = message or f"Bank transfer failed (HTTP {http_code})"
                return {"success": False, "error": error_msg}
        
        except Exception as e:
            logger.error(f"Bank transfer error: {e}")
            return {"success": False, "error": str(e)}


# Singleton instance
_bank_service = None

def get_hubtel_bank_service(db=None) -> HubtelBankTransferService:
    """Get singleton instance"""
    global _bank_service
    if _bank_service is None:
        _bank_service = HubtelBankTransferService(db)
    elif db is not None and _bank_service.db is None:
        _bank_service.db = db
    return _bank_service
