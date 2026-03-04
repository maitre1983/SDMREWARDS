"""
SDM REWARDS - Merchants Router
==============================
Merchant dashboard, settings, transactions, QR codes
"""

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from models.schemas import Merchant, MerchantStatus
from routers.auth import get_current_merchant

# Setup
router = APIRouter()
logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ============== REQUEST MODELS ==============

class UpdateCashbackRequest(BaseModel):
    cashback_rate: float  # 1-20%


class UpdatePaymentInfoRequest(BaseModel):
    momo_number: Optional[str] = None
    momo_network: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None


class UpdateBusinessInfoRequest(BaseModel):
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    business_address: Optional[str] = None
    business_description: Optional[str] = None
    logo_url: Optional[str] = None


# ============== DASHBOARD ==============

@router.get("/me")
async def get_merchant_dashboard(current_merchant: dict = Depends(get_current_merchant)):
    """Get merchant dashboard data"""
    merchant_id = current_merchant["id"]
    
    # Get today's stats
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    today_transactions = await db.transactions.find({
        "merchant_id": merchant_id,
        "created_at": {"$gte": today_start.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    today_volume = sum(t.get("amount", 0) for t in today_transactions)
    today_cashback = sum(t.get("cashback_amount", 0) for t in today_transactions)
    
    # Recent transactions
    recent_transactions = await db.transactions.find(
        {"merchant_id": merchant_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "merchant": current_merchant,
        "stats": {
            "total_transactions": current_merchant.get("total_transactions", 0),
            "total_volume": current_merchant.get("total_volume", 0),
            "total_cashback_given": current_merchant.get("total_cashback_given", 0),
            "today_transactions": len(today_transactions),
            "today_volume": today_volume,
            "today_cashback": today_cashback
        },
        "recent_transactions": recent_transactions
    }


# ============== SETTINGS ==============

@router.get("/settings")
async def get_settings(current_merchant: dict = Depends(get_current_merchant)):
    """Get merchant settings"""
    return {
        "cashback_rate": current_merchant.get("cashback_rate", 5),
        "momo_number": current_merchant.get("momo_number"),
        "momo_network": current_merchant.get("momo_network"),
        "bank_name": current_merchant.get("bank_name"),
        "bank_account": current_merchant.get("bank_account"),
        "api_enabled": current_merchant.get("api_enabled", False),
        "api_key": current_merchant.get("api_key") if current_merchant.get("api_enabled") else None
    }


@router.put("/settings/cashback")
async def update_cashback_rate(
    request: UpdateCashbackRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Update cashback rate (1-20%)"""
    if request.cashback_rate < 1 or request.cashback_rate > 20:
        raise HTTPException(status_code=400, detail="Cashback rate must be between 1% and 20%")
    
    await db.merchants.update_one(
        {"id": current_merchant["id"]},
        {"$set": {
            "cashback_rate": request.cashback_rate,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "cashback_rate": request.cashback_rate}


@router.put("/settings/payment")
async def update_payment_info(
    request: UpdatePaymentInfoRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Update payment information (MoMo/Bank)"""
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.momo_number is not None:
        updates["momo_number"] = request.momo_number
    if request.momo_network is not None:
        updates["momo_network"] = request.momo_network
    if request.bank_name is not None:
        updates["bank_name"] = request.bank_name
    if request.bank_account is not None:
        updates["bank_account"] = request.bank_account
    
    await db.merchants.update_one(
        {"id": current_merchant["id"]},
        {"$set": updates}
    )
    
    return {"success": True, "message": "Payment info updated"}


@router.put("/settings/business")
async def update_business_info(
    request: UpdateBusinessInfoRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Update business information"""
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.business_name is not None:
        updates["business_name"] = request.business_name
    if request.business_type is not None:
        updates["business_type"] = request.business_type
    if request.business_address is not None:
        updates["business_address"] = request.business_address
    if request.business_description is not None:
        updates["business_description"] = request.business_description
    if request.logo_url is not None:
        updates["logo_url"] = request.logo_url
    
    await db.merchants.update_one(
        {"id": current_merchant["id"]},
        {"$set": updates}
    )
    
    return {"success": True, "message": "Business info updated"}


# ============== QR CODES ==============

@router.get("/qr-codes")
async def get_qr_codes(current_merchant: dict = Depends(get_current_merchant)):
    """Get merchant QR codes"""
    return {
        "payment_qr_code": current_merchant["payment_qr_code"],
        "recruitment_qr_code": current_merchant["recruitment_qr_code"],
        "business_name": current_merchant["business_name"]
    }


@router.post("/qr-codes/regenerate")
async def regenerate_qr_codes(
    qr_type: str,  # "payment" or "recruitment"
    current_merchant: dict = Depends(get_current_merchant)
):
    """Regenerate QR codes"""
    if qr_type not in ["payment", "recruitment"]:
        raise HTTPException(status_code=400, detail="Invalid QR type")
    
    new_code = f"SDM-{'M' if qr_type == 'payment' else 'R'}-{uuid.uuid4().hex[:8].upper()}"
    field = f"{qr_type}_qr_code"
    
    await db.merchants.update_one(
        {"id": current_merchant["id"]},
        {"$set": {
            field: new_code,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "new_qr_code": new_code}


# ============== TRANSACTIONS ==============

@router.get("/transactions")
async def get_transactions(
    limit: int = 50,
    offset: int = 0,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Get merchant's transaction history"""
    query = {"merchant_id": current_merchant["id"]}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    transactions = await db.transactions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    total = await db.transactions.count_documents(query)
    
    # Calculate totals for this query
    volume = sum(t.get("amount", 0) for t in transactions)
    cashback = sum(t.get("cashback_amount", 0) for t in transactions)
    
    return {
        "transactions": transactions,
        "total": total,
        "volume": volume,
        "cashback": cashback,
        "limit": limit,
        "offset": offset
    }


# ============== API INTEGRATION ==============

@router.post("/api/enable")
async def enable_api(current_merchant: dict = Depends(get_current_merchant)):
    """Enable API access and generate API key"""
    if current_merchant.get("api_enabled"):
        return {
            "success": True,
            "api_key": current_merchant["api_key"],
            "message": "API already enabled"
        }
    
    api_key = f"sdm_live_{uuid.uuid4().hex}"
    
    await db.merchants.update_one(
        {"id": current_merchant["id"]},
        {"$set": {
            "api_enabled": True,
            "api_key": api_key,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "api_key": api_key,
        "message": "API enabled successfully"
    }


@router.post("/api/regenerate-key")
async def regenerate_api_key(current_merchant: dict = Depends(get_current_merchant)):
    """Regenerate API key"""
    if not current_merchant.get("api_enabled"):
        raise HTTPException(status_code=400, detail="API not enabled")
    
    new_api_key = f"sdm_live_{uuid.uuid4().hex}"
    
    await db.merchants.update_one(
        {"id": current_merchant["id"]},
        {"$set": {
            "api_key": new_api_key,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "api_key": new_api_key}


@router.get("/api/docs")
async def get_api_documentation():
    """Get API documentation"""
    return {
        "documentation": {
            "base_url": "/api/merchants/external",
            "authentication": "Bearer token using merchant API key",
            "endpoints": [
                {
                    "method": "POST",
                    "path": "/transaction",
                    "description": "Create a new transaction",
                    "body": {
                        "client_qr_code": "string - Client's QR code",
                        "amount": "number - Transaction amount in GHS"
                    }
                },
                {
                    "method": "GET",
                    "path": "/balance",
                    "description": "Get merchant's current balance and stats"
                }
            ]
        }
    }


# ============== EXTERNAL API (For POS Integration) ==============

@router.post("/external/transaction")
async def create_external_transaction(
    client_qr_code: str,
    amount: float,
    api_key: str
):
    """Create transaction via external API (POS integration)"""
    # Verify API key
    merchant = await db.merchants.find_one({"api_key": api_key, "api_enabled": True})
    if not merchant:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Find client by QR code
    client_doc = await db.clients.find_one({"qr_code": client_qr_code})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client_doc.get("status") != "active":
        raise HTTPException(status_code=400, detail="Client account not active")
    
    # Calculate cashback
    cashback_rate = merchant.get("cashback_rate", 5) / 100
    cashback_amount = round(amount * cashback_rate, 2)
    
    # Get platform commission
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    commission_rate = (config.get("platform_commission_rate", 5) if config else 5) / 100
    commission = round(cashback_amount * commission_rate, 2)
    net_cashback = cashback_amount - commission
    
    # Create transaction
    from models.schemas import Transaction, TransactionType, TransactionStatus, PaymentMethod
    
    transaction = Transaction(
        type=TransactionType.PAYMENT,
        status=TransactionStatus.COMPLETED,
        client_id=client_doc["id"],
        merchant_id=merchant["id"],
        amount=amount,
        cashback_amount=net_cashback,
        commission_amount=commission,
        net_amount=amount,
        payment_method=PaymentMethod.CASH,
        description=f"Purchase at {merchant['business_name']}"
    )
    
    await db.transactions.insert_one(transaction.model_dump())
    
    # Update client cashback
    await db.clients.update_one(
        {"id": client_doc["id"]},
        {"$inc": {
            "cashback_balance": net_cashback,
            "total_earned": net_cashback,
            "total_spent": amount
        }}
    )
    
    # Update merchant stats
    await db.merchants.update_one(
        {"id": merchant["id"]},
        {"$inc": {
            "total_transactions": 1,
            "total_volume": amount,
            "total_cashback_given": net_cashback
        }}
    )
    
    return {
        "success": True,
        "transaction_id": transaction.id,
        "amount": amount,
        "cashback_earned": net_cashback,
        "client_name": client_doc["full_name"]
    }
