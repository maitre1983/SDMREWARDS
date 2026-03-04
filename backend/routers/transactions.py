"""
SDM REWARDS - Transactions Router
=================================
Handle payments, cashback, QR scans
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from models.schemas import (
    Transaction, TransactionType, TransactionStatus, PaymentMethod
)
from routers.auth import get_current_client, get_current_merchant

# Setup
router = APIRouter()
logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ============== REQUEST MODELS ==============

class ScanMerchantQRRequest(BaseModel):
    """Client scans merchant's QR code"""
    merchant_qr_code: str
    amount: float
    payment_method: PaymentMethod


class ScanClientQRRequest(BaseModel):
    """Merchant scans client's QR code"""
    client_qr_code: str
    amount: float
    payment_method: PaymentMethod


class UseCashbackRequest(BaseModel):
    """Use cashback for payment"""
    merchant_qr_code: str
    amount: float  # Amount to pay with cashback


# ============== QR SCAN TRANSACTIONS ==============

@router.post("/scan/merchant")
async def client_scans_merchant(
    request: ScanMerchantQRRequest,
    current_client: dict = Depends(get_current_client)
):
    """Client scans merchant QR to make a payment"""
    
    # Verify client is active
    if current_client.get("status") != "active":
        raise HTTPException(status_code=400, detail="Please purchase a membership card first")
    
    # Find merchant by QR code
    merchant = await db.merchants.find_one({"payment_qr_code": request.merchant_qr_code})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    if merchant.get("status") != "active":
        raise HTTPException(status_code=400, detail="Merchant is not active")
    
    # Calculate cashback
    cashback_rate = merchant.get("cashback_rate", 5) / 100
    cashback_amount = round(request.amount * cashback_rate, 2)
    
    # Get platform commission
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    commission_rate = (config.get("platform_commission_rate", 5) if config else 5) / 100
    commission = round(cashback_amount * commission_rate, 2)
    net_cashback = cashback_amount - commission
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create payment transaction
    payment_txn = Transaction(
        type=TransactionType.PAYMENT,
        status=TransactionStatus.COMPLETED,
        client_id=current_client["id"],
        merchant_id=merchant["id"],
        amount=request.amount,
        cashback_amount=net_cashback,
        commission_amount=commission,
        net_amount=request.amount,
        payment_method=request.payment_method,
        description=f"Purchase at {merchant['business_name']}"
    )
    await db.transactions.insert_one(payment_txn.model_dump())
    
    # Create cashback earned transaction
    cashback_txn = Transaction(
        type=TransactionType.CASHBACK_EARNED,
        status=TransactionStatus.COMPLETED,
        client_id=current_client["id"],
        merchant_id=merchant["id"],
        amount=net_cashback,
        description=f"Cashback from {merchant['business_name']} ({merchant.get('cashback_rate', 5)}%)"
    )
    await db.transactions.insert_one(cashback_txn.model_dump())
    
    # Update client
    await db.clients.update_one(
        {"id": current_client["id"]},
        {
            "$inc": {
                "cashback_balance": net_cashback,
                "total_earned": net_cashback,
                "total_spent": request.amount
            },
            "$set": {"updated_at": now}
        }
    )
    
    # Update merchant stats
    await db.merchants.update_one(
        {"id": merchant["id"]},
        {
            "$inc": {
                "total_transactions": 1,
                "total_volume": request.amount,
                "total_cashback_given": net_cashback
            },
            "$set": {"updated_at": now}
        }
    )
    
    # Record platform commission
    await db.platform_revenue.insert_one({
        "id": str(uuid.uuid4()),
        "type": "cashback_commission",
        "transaction_id": payment_txn.id,
        "amount": commission,
        "created_at": now
    })
    
    return {
        "success": True,
        "transaction_id": payment_txn.id,
        "merchant_name": merchant["business_name"],
        "amount_paid": request.amount,
        "cashback_earned": net_cashback,
        "new_cashback_balance": current_client.get("cashback_balance", 0) + net_cashback
    }


@router.post("/scan/client")
async def merchant_scans_client(
    request: ScanClientQRRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Merchant scans client QR to record a transaction"""
    
    # Verify merchant is active
    if current_merchant.get("status") != "active":
        raise HTTPException(status_code=400, detail="Your merchant account is not active")
    
    # Find client by QR code
    client_doc = await db.clients.find_one({"qr_code": request.client_qr_code})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client_doc.get("status") != "active":
        raise HTTPException(status_code=400, detail="Client account is not active")
    
    # Calculate cashback
    cashback_rate = current_merchant.get("cashback_rate", 5) / 100
    cashback_amount = round(request.amount * cashback_rate, 2)
    
    # Get platform commission
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    commission_rate = (config.get("platform_commission_rate", 5) if config else 5) / 100
    commission = round(cashback_amount * commission_rate, 2)
    net_cashback = cashback_amount - commission
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create payment transaction
    payment_txn = Transaction(
        type=TransactionType.PAYMENT,
        status=TransactionStatus.COMPLETED,
        client_id=client_doc["id"],
        merchant_id=current_merchant["id"],
        amount=request.amount,
        cashback_amount=net_cashback,
        commission_amount=commission,
        net_amount=request.amount,
        payment_method=request.payment_method,
        description=f"Purchase at {current_merchant['business_name']}"
    )
    await db.transactions.insert_one(payment_txn.model_dump())
    
    # Create cashback earned transaction
    cashback_txn = Transaction(
        type=TransactionType.CASHBACK_EARNED,
        status=TransactionStatus.COMPLETED,
        client_id=client_doc["id"],
        merchant_id=current_merchant["id"],
        amount=net_cashback,
        description=f"Cashback from {current_merchant['business_name']} ({current_merchant.get('cashback_rate', 5)}%)"
    )
    await db.transactions.insert_one(cashback_txn.model_dump())
    
    # Update client
    await db.clients.update_one(
        {"id": client_doc["id"]},
        {
            "$inc": {
                "cashback_balance": net_cashback,
                "total_earned": net_cashback,
                "total_spent": request.amount
            },
            "$set": {"updated_at": now}
        }
    )
    
    # Update merchant stats
    await db.merchants.update_one(
        {"id": current_merchant["id"]},
        {
            "$inc": {
                "total_transactions": 1,
                "total_volume": request.amount,
                "total_cashback_given": net_cashback
            },
            "$set": {"updated_at": now}
        }
    )
    
    # Record platform commission
    await db.platform_revenue.insert_one({
        "id": str(uuid.uuid4()),
        "type": "cashback_commission",
        "transaction_id": payment_txn.id,
        "amount": commission,
        "created_at": now
    })
    
    return {
        "success": True,
        "transaction_id": payment_txn.id,
        "client_name": client_doc["full_name"],
        "amount": request.amount,
        "cashback_given": net_cashback
    }


# ============== USE CASHBACK ==============

@router.post("/use-cashback")
async def use_cashback_for_payment(
    request: UseCashbackRequest,
    current_client: dict = Depends(get_current_client)
):
    """Use cashback balance to pay at merchant"""
    
    # Verify client is active
    if current_client.get("status") != "active":
        raise HTTPException(status_code=400, detail="Please purchase a membership card first")
    
    # Check cashback balance
    balance = current_client.get("cashback_balance", 0)
    if balance < request.amount:
        raise HTTPException(status_code=400, detail=f"Insufficient cashback balance. Available: GHS {balance}")
    
    # Find merchant
    merchant = await db.merchants.find_one({"payment_qr_code": request.merchant_qr_code})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    if merchant.get("status") != "active":
        raise HTTPException(status_code=400, detail="Merchant is not active")
    
    # Get usage commission
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    usage_type = config.get("usage_commission_type", "percentage") if config else "percentage"
    usage_rate = config.get("usage_commission_rate", 1) if config else 1
    
    if usage_type == "percentage":
        commission = round(request.amount * (usage_rate / 100), 2)
    else:
        commission = usage_rate
    
    net_amount = request.amount - commission
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create cashback usage transaction
    usage_txn = Transaction(
        type=TransactionType.CASHBACK_USED,
        status=TransactionStatus.COMPLETED,
        client_id=current_client["id"],
        merchant_id=merchant["id"],
        amount=request.amount,
        commission_amount=commission,
        net_amount=net_amount,
        payment_method=PaymentMethod.CASHBACK,
        description=f"Cashback payment at {merchant['business_name']}"
    )
    await db.transactions.insert_one(usage_txn.model_dump())
    
    # Deduct from client cashback
    await db.clients.update_one(
        {"id": current_client["id"]},
        {
            "$inc": {
                "cashback_balance": -request.amount,
                "total_spent": request.amount
            },
            "$set": {"updated_at": now}
        }
    )
    
    # Update merchant stats
    await db.merchants.update_one(
        {"id": merchant["id"]},
        {
            "$inc": {
                "total_transactions": 1,
                "total_volume": net_amount
            },
            "$set": {"updated_at": now}
        }
    )
    
    # Record platform commission
    if commission > 0:
        await db.platform_revenue.insert_one({
            "id": str(uuid.uuid4()),
            "type": "usage_commission",
            "transaction_id": usage_txn.id,
            "amount": commission,
            "created_at": now
        })
    
    return {
        "success": True,
        "transaction_id": usage_txn.id,
        "merchant_name": merchant["business_name"],
        "amount_paid": request.amount,
        "commission": commission,
        "merchant_receives": net_amount,
        "new_cashback_balance": balance - request.amount
    }


# ============== LOOKUP ==============

@router.get("/lookup/merchant/{qr_code}")
async def lookup_merchant(qr_code: str):
    """Lookup merchant by QR code (for client app)"""
    merchant = await db.merchants.find_one(
        {"payment_qr_code": qr_code},
        {"_id": 0, "password_hash": 0, "api_key": 0}
    )
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    return {
        "merchant": {
            "id": merchant["id"],
            "business_name": merchant["business_name"],
            "business_type": merchant.get("business_type"),
            "logo_url": merchant.get("logo_url"),
            "cashback_rate": merchant.get("cashback_rate", 5),
            "status": merchant["status"]
        }
    }


@router.get("/lookup/client/{qr_code}")
async def lookup_client(
    qr_code: str,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Lookup client by QR code (for merchant app)"""
    client_doc = await db.clients.find_one(
        {"qr_code": qr_code},
        {"_id": 0, "password_hash": 0}
    )
    
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {
        "client": {
            "id": client_doc["id"],
            "full_name": client_doc["full_name"],
            "card_type": client_doc.get("card_type"),
            "status": client_doc["status"]
        }
    }
