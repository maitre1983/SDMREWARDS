"""
SDM Payment System Routes
Handles MoMo, Card, and Cash payments with automatic splitting
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime, timezone, timedelta
import secrets
import logging

# Create router
payments_router = APIRouter(prefix="/payments", tags=["Payments"])

# ============ SIMULATED BULKCLIX PAYMENT SERVICE ============

class BulkclixPaymentSimulator:
    """
    Simulates Bulkclix payment API for development
    Replace with real API calls when credentials are provided
    """
    
    @staticmethod
    async def initiate_momo_collection(
        phone: str,
        amount: float,
        network: str,
        reference: str,
        callback_url: str
    ) -> Dict:
        """Initiate MoMo collection from customer"""
        # SIMULATED: In production, this calls Bulkclix API
        return {
            "success": True,
            "transaction_id": f"BCMOMO{secrets.token_hex(8).upper()}",
            "status": "pending",
            "message": "Payment request sent to customer"
        }
    
    @staticmethod
    async def initiate_card_payment(
        amount: float,
        card_token: str,
        reference: str,
        callback_url: str
    ) -> Dict:
        """Initiate card payment"""
        # SIMULATED: In production, this calls Bulkclix API
        return {
            "success": True,
            "transaction_id": f"BCCARD{secrets.token_hex(8).upper()}",
            "status": "pending",
            "message": "Card payment initiated"
        }
    
    @staticmethod
    async def transfer_to_momo(
        phone: str,
        amount: float,
        network: str,
        reference: str
    ) -> Dict:
        """Transfer funds to MoMo account (for merchant settlement)"""
        # SIMULATED: In production, this calls Bulkclix API
        return {
            "success": True,
            "transaction_id": f"BCTRF{secrets.token_hex(8).upper()}",
            "status": "completed",
            "message": "Transfer completed"
        }
    
    @staticmethod
    async def transfer_to_bank(
        bank_code: str,
        account_number: str,
        amount: float,
        reference: str
    ) -> Dict:
        """Transfer funds to bank account (for merchant settlement)"""
        # SIMULATED: In production, this calls Bulkclix API
        return {
            "success": True,
            "transaction_id": f"BCBANK{secrets.token_hex(8).upper()}",
            "status": "completed",
            "message": "Bank transfer completed"
        }

# Singleton instance
bulkclix_service = BulkclixPaymentSimulator()

# ============ HELPER FUNCTIONS ============

def calculate_split(amount: float, cashback_rate: float, sdm_commission_rate: float = 0.10) -> Dict:
    """
    Calculate payment split between client cashback, SDM commission, and merchant
    
    Example with 1000 GHS at 10% cashback:
    - Cashback total: 100 GHS (10% of 1000)
    - SDM Commission: 10 GHS (10% of cashback)
    - Client receives: 90 GHS (cashback - SDM commission)
    - Merchant receives: 900 GHS (1000 - 100)
    """
    # Cashback is the percentage the customer gets back
    total_cashback = amount * (cashback_rate / 100)
    
    # SDM takes a commission from the cashback
    sdm_commission = total_cashback * sdm_commission_rate
    
    # Client's actual cashback after SDM commission
    client_cashback = total_cashback - sdm_commission
    
    # Merchant gets the rest
    merchant_amount = amount - total_cashback
    
    return {
        "total_cashback": round(total_cashback, 2),
        "sdm_commission": round(sdm_commission, 2),
        "client_cashback": round(client_cashback, 2),
        "merchant_amount": round(merchant_amount, 2)
    }

# ============ WEBHOOK ENDPOINT ============

@payments_router.post("/webhook/bulkclix")
async def bulkclix_webhook(request_data: Dict):
    """
    Webhook endpoint for Bulkclix payment confirmations
    This is called by Bulkclix when a payment status changes
    """
    logging.info(f"Received Bulkclix webhook: {request_data}")
    
    # Extract transaction reference
    transaction_ref = request_data.get("reference") or request_data.get("transaction_id")
    status = request_data.get("status", "").lower()
    
    if not transaction_ref:
        raise HTTPException(status_code=400, detail="Missing transaction reference")
    
    # In production, this would:
    # 1. Find the SDMPayment record by bulkclix_ref
    # 2. Update status to 'confirmed' if successful
    # 3. Trigger the automatic split
    # 4. Update client wallet with cashback
    # 5. Initiate merchant settlement
    
    return {
        "success": True,
        "message": "Webhook processed",
        "transaction_ref": transaction_ref,
        "status": status
    }

# Export for use in main server
__all__ = ['payments_router', 'bulkclix_service', 'calculate_split']
