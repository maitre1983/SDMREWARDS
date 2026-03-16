# /app/backend/services/bulkclix_payment.py
"""
BulkClix Payment Service
Handles MoMo Collection, Transfer, and KYC verification
"""

import os
import httpx
import logging
import uuid
from typing import Optional, Dict, Any
from enum import Enum
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
BULKCLIX_API_KEY = os.environ.get('BULKCLIX_API_KEY', '')
BULKCLIX_BASE_URL = os.environ.get('BULKCLIX_BASE_URL', 'https://api.bulkclix.com/api/v1')
# Test mode - set to True to simulate payments for development
PAYMENT_TEST_MODE = os.environ.get('PAYMENT_TEST_MODE', 'true').lower() == 'true'


class MoMoNetwork(str, Enum):
    MTN = "MTN"
    TELECEL = "TELECEL"  # Vodafone is now Telecel
    AIRTELTIGO = "AIRTELTIGO"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BulkClixPaymentService:
    """Service for handling BulkClix payment operations"""
    
    def __init__(self):
        self.api_key = BULKCLIX_API_KEY
        self.base_url = BULKCLIX_BASE_URL
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "x-api-key": self.api_key
        }
    
    def _normalize_network(self, network: str) -> str:
        """Normalize network name to BulkClix format"""
        network_map = {
            "MTN": "MTN",
            "VODAFONE": "TELECEL",
            "TELECEL": "TELECEL",
            "AIRTELTIGO": "AIRTELTIGO",
            "AIRTEL": "AIRTELTIGO",
            "TIGO": "AIRTELTIGO"
        }
        return network_map.get(network.upper(), network.upper())
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number to local format (0XXXXXXXXX)"""
        phone = phone.replace(" ", "").replace("-", "")
        # Remove country code if present
        if phone.startswith("+233"):
            phone = "0" + phone[4:]
        elif phone.startswith("233"):
            phone = "0" + phone[3:]
        return phone
    
    async def collect_momo_payment(
        self,
        amount: float,
        phone_number: str,
        network: str,
        transaction_id: str,
        callback_url: str,
        reference: str = ""
    ) -> Dict[str, Any]:
        """
        Initiate MoMo collection (receive payment from customer)
        
        Args:
            amount: Amount to collect in GHS
            phone_number: Customer's phone number
            network: MoMo network (MTN, TELECEL, AIRTELTIGO)
            transaction_id: Unique transaction ID for tracking
            callback_url: Webhook URL for payment status updates
            reference: Optional reference/description
            
        Returns:
            API response with transaction status
        """
        normalized_phone = self._normalize_phone(phone_number)
        normalized_network = self._normalize_network(network)
        
        # TEST MODE - Simulate successful payment for development
        if PAYMENT_TEST_MODE:
            logging.info(f"[TEST MODE] MoMo Collection simulated: {amount} GHS from {normalized_phone}")
            return {
                "success": True,
                "data": {
                    "message": "TEST MODE - Payment simulated",
                    "transaction_id": transaction_id,
                    "amount": str(amount),
                    "phone_number": normalized_phone,
                    "network": normalized_network,
                    "status": "pending"
                },
                "transaction_id": transaction_id,
                "status": "pending",
                "test_mode": True
            }
        
        # PRODUCTION MODE - Real BulkClix API call
        try:
            payload = {
                "amount": float(amount),
                "phone_number": normalized_phone,
                "network": normalized_network,
                "transaction_id": transaction_id,
                "callback_url": callback_url,
                "reference": reference or f"SDM Payment {transaction_id}"
            }
            
            logging.info(f"BulkClix MoMo Collection: {payload}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/payment-api/momopay",
                    headers=self.headers,
                    json=payload
                )
                
                response_data = response.json()
                logging.info(f"BulkClix MoMo Collection response: {response_data}")
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "data": response_data,
                        "transaction_id": transaction_id,
                        "status": "pending"
                    }
                else:
                    return {
                        "success": False,
                        "error": response_data.get("message", "Payment initiation failed"),
                        "status_code": response.status_code,
                        "data": response_data
                    }
                    
        except httpx.TimeoutException:
            logging.error("BulkClix MoMo Collection timeout")
            return {
                "success": False,
                "error": "Payment service timeout. Please try again.",
                "status": "timeout"
            }
        except Exception as e:
            logging.error(f"BulkClix MoMo Collection error: {e}")
            return {
                "success": False,
                "error": str(e),
                "status": "error"
            }
    
    async def transfer_momo(
        self,
        amount: float,
        account_number: str,
        network: str,
        account_name: str,
        client_reference: str
    ) -> Dict[str, Any]:
        """
        Transfer money to MoMo account (send payment to merchant/user)
        
        Args:
            amount: Amount to transfer in GHS
            account_number: Recipient's phone number
            network: MoMo network (MTN, TELECEL, AIRTELTIGO)
            account_name: Recipient's name
            client_reference: Unique reference for tracking
            
        Returns:
            API response with transfer status
        """
        normalized_phone = self._normalize_phone(account_number)
        normalized_network = self._normalize_network(network)
        
        # TEST MODE - Simulate successful transfer
        if PAYMENT_TEST_MODE:
            logging.info(f"[TEST MODE] MoMo Transfer simulated: {amount} GHS to {normalized_phone}")
            return {
                "success": True,
                "data": {
                    "message": "TEST MODE - Transfer simulated",
                    "amount": str(amount),
                    "account_number": normalized_phone,
                    "account_name": account_name,
                    "channel": normalized_network,
                    "client_reference": client_reference,
                    "status": "processing"
                },
                "client_reference": client_reference,
                "status": "processing",
                "test_mode": True
            }
        
        # PRODUCTION MODE
        try:
            payload = {
                "amount": str(float(amount)),
                "account_number": normalized_phone,
                "channel": normalized_network,
                "account_name": account_name,
                "client_reference": client_reference
            }
            
            logging.info(f"BulkClix MoMo Transfer: {payload}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/payment-api/send/mobilemoney",
                    headers=self.headers,
                    json=payload
                )
                
                response_data = response.json()
                logging.info(f"BulkClix MoMo Transfer response: {response_data}")
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "data": response_data,
                        "client_reference": client_reference,
                        "status": "processing"
                    }
                else:
                    return {
                        "success": False,
                        "error": response_data.get("message", "Transfer failed"),
                        "status_code": response.status_code,
                        "data": response_data
                    }
                    
        except httpx.TimeoutException:
            logging.error("BulkClix MoMo Transfer timeout")
            return {
                "success": False,
                "error": "Transfer service timeout",
                "status": "timeout"
            }
        except Exception as e:
            logging.error(f"BulkClix MoMo Transfer error: {e}")
            return {
                "success": False,
                "error": str(e),
                "status": "error"
            }
    
    async def verify_account_name(self, phone_number: str) -> Dict[str, Any]:
        """
        Verify the name associated with a phone number (KYC)
        
        Args:
            phone_number: Phone number to verify
            
        Returns:
            Account holder name and verification status
        """
        try:
            normalized_phone = self._normalize_phone(phone_number)
            
            logging.info(f"BulkClix KYC verification for: {normalized_phone}")
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/kyc-api/msisdNameQuery",
                    headers=self.headers,
                    params={"phone_number": normalized_phone}
                )
                
                response_data = response.json()
                logging.info(f"BulkClix KYC response: {response_data}")
                
                if response.status_code == 200:
                    # Extract name from response
                    account_name = response_data.get("name") or response_data.get("account_name") or response_data.get("data", {}).get("name")
                    
                    if account_name:
                        return {
                            "success": True,
                            "verified": True,
                            "account_name": account_name,
                            "phone_number": normalized_phone,
                            "data": response_data
                        }
                    else:
                        return {
                            "success": True,
                            "verified": False,
                            "message": "Could not retrieve account name",
                            "data": response_data
                        }
                else:
                    return {
                        "success": False,
                        "verified": False,
                        "error": response_data.get("message", "Verification failed"),
                        "status_code": response.status_code
                    }
                    
        except httpx.TimeoutException:
            logging.error("BulkClix KYC verification timeout")
            return {
                "success": False,
                "verified": False,
                "error": "Verification service timeout"
            }
        except Exception as e:
            logging.error(f"BulkClix KYC error: {e}")
            return {
                "success": False,
                "verified": False,
                "error": str(e)
            }


# Singleton instance
bulkclix_payment_service = BulkClixPaymentService()
