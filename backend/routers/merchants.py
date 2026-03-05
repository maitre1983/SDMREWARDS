"""
SDM REWARDS - Merchants Router
==============================
Merchant dashboard, settings, transactions, QR codes
"""

import os
import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

from models.schemas import Merchant, MerchantStatus
from routers.auth import get_current_merchant

# Password/PIN hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
    city: Optional[str] = None
    gps_coordinates: Optional[str] = None
    google_maps_url: Optional[str] = None


# ============== PIN MANAGEMENT MODELS ==============

class SetPinRequest(BaseModel):
    pin: str  # 4-6 digits


class VerifyPinRequest(BaseModel):
    pin: str


class ForgotPinRequest(BaseModel):
    method: str  # "sms" or "email"


class ResetPinRequest(BaseModel):
    otp: str
    new_pin: str


# ============== CASHIER MANAGEMENT MODELS ==============

class CreateCashierRequest(BaseModel):
    name: str
    code: str  # Unique cashier code (e.g., "CAISSE1")
    register_number: Optional[str] = None  # Cash register number


class UpdateCashierRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    register_number: Optional[str] = None
    is_active: Optional[bool] = None


# ============== PUBLIC ENDPOINTS ==============

@router.get("/partners")
async def get_partner_merchants():
    """
    Public endpoint to list active partner merchants
    Used by clients to browse merchants and their cashback rates
    """
    merchants = await db.merchants.find(
        {"status": "active"},
        {
            "_id": 0,
            "id": 1,
            "business_name": 1,
            "business_type": 1,
            "business_address": 1,
            "business_description": 1,
            "cashback_rate": 1,
            "payment_qr_code": 1,
            "logo_url": 1
        }
    ).to_list(500)
    
    return {
        "merchants": merchants,
        "total": len(merchants)
    }


@router.get("/by-qr/{qr_code}")
async def get_merchant_by_qr(qr_code: str):
    """
    Get merchant details by QR code
    Used when client scans merchant QR
    """
    # Try payment QR code first
    merchant = await db.merchants.find_one(
        {"payment_qr_code": qr_code},
        {
            "_id": 0,
            "id": 1,
            "business_name": 1,
            "business_type": 1,
            "business_address": 1,
            "cashback_rate": 1,
            "payment_qr_code": 1,
            "status": 1
        }
    )
    
    # Try recruitment QR code if not found
    if not merchant:
        merchant = await db.merchants.find_one(
            {"recruitment_qr_code": qr_code},
            {
                "_id": 0,
                "id": 1,
                "business_name": 1,
                "business_type": 1,
                "business_address": 1,
                "cashback_rate": 1,
                "payment_qr_code": 1,
                "recruitment_qr_code": 1,
                "status": 1
            }
        )
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    if merchant.get("status") != "active":
        raise HTTPException(status_code=400, detail="Merchant is not active")
    
    return {"merchant": merchant}


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


@router.get("/dashboard/advanced-stats")
async def get_advanced_stats(
    period: str = "day",  # day, week, month, year
    current_merchant: dict = Depends(get_current_merchant)
):
    """Get advanced dashboard statistics by period"""
    merchant_id = current_merchant["id"]
    now = datetime.now(timezone.utc)
    
    # Calculate date ranges
    if period == "day":
        current_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        previous_start = current_start - timedelta(days=1)
        previous_end = current_start
    elif period == "week":
        current_start = now - timedelta(days=now.weekday())
        current_start = current_start.replace(hour=0, minute=0, second=0, microsecond=0)
        previous_start = current_start - timedelta(weeks=1)
        previous_end = current_start
    elif period == "month":
        current_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Previous month
        if now.month == 1:
            previous_start = now.replace(year=now.year-1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            previous_start = now.replace(month=now.month-1, day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_end = current_start
    elif period == "year":
        current_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_start = now.replace(year=now.year-1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_end = current_start
    else:
        current_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        previous_start = current_start - timedelta(days=1)
        previous_end = current_start
    
    # Get current period transactions
    current_transactions = await db.transactions.find({
        "merchant_id": merchant_id,
        "created_at": {"$gte": current_start.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Get previous period transactions
    previous_transactions = await db.transactions.find({
        "merchant_id": merchant_id,
        "created_at": {
            "$gte": previous_start.isoformat(),
            "$lt": previous_end.isoformat()
        }
    }, {"_id": 0}).to_list(10000)
    
    # Calculate current stats
    current_volume = sum(t.get("amount", 0) for t in current_transactions)
    current_cashback = sum(t.get("cashback_amount", 0) for t in current_transactions)
    current_count = len(current_transactions)
    
    # Calculate previous stats
    previous_volume = sum(t.get("amount", 0) for t in previous_transactions)
    previous_cashback = sum(t.get("cashback_amount", 0) for t in previous_transactions)
    previous_count = len(previous_transactions)
    
    # Calculate growth percentages
    def calc_growth(current, previous):
        if previous == 0:
            return 100 if current > 0 else 0
        return round(((current - previous) / previous) * 100, 1)
    
    volume_growth = calc_growth(current_volume, previous_volume)
    cashback_growth = calc_growth(current_cashback, previous_cashback)
    count_growth = calc_growth(current_count, previous_count)
    
    # Calculate average transaction
    avg_transaction = current_volume / current_count if current_count > 0 else 0
    prev_avg = previous_volume / previous_count if previous_count > 0 else 0
    avg_growth = calc_growth(avg_transaction, prev_avg)
    
    return {
        "period": period,
        "period_label": {
            "day": "Aujourd'hui",
            "week": "Cette semaine",
            "month": "Ce mois",
            "year": "Cette année"
        }.get(period, "Aujourd'hui"),
        "current": {
            "volume": round(current_volume, 2),
            "cashback": round(current_cashback, 2),
            "transactions": current_count,
            "average_transaction": round(avg_transaction, 2)
        },
        "previous": {
            "volume": round(previous_volume, 2),
            "cashback": round(previous_cashback, 2),
            "transactions": previous_count,
            "average_transaction": round(prev_avg, 2)
        },
        "growth": {
            "volume": volume_growth,
            "cashback": cashback_growth,
            "transactions": count_growth,
            "average_transaction": avg_growth
        },
        "period_start": current_start.isoformat(),
        "period_end": now.isoformat()
    }


@router.get("/dashboard/summary")
async def get_merchant_summary(current_merchant: dict = Depends(get_current_merchant)):
    """Get merchant accounting summary (mini comptabilité)"""
    merchant_id = current_merchant["id"]
    now = datetime.now(timezone.utc)
    
    # Get all-time totals from merchant document
    total_volume = current_merchant.get("total_volume", 0)
    total_transactions = current_merchant.get("total_transactions", 0)
    total_cashback = current_merchant.get("total_cashback_given", 0)
    
    # Calculate average
    avg_transaction = total_volume / total_transactions if total_transactions > 0 else 0
    
    # Get stats by period
    periods = {
        "day": now.replace(hour=0, minute=0, second=0, microsecond=0),
        "week": (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0),
        "month": now.replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        "year": now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    }
    
    period_stats = {}
    for period_name, start_date in periods.items():
        transactions = await db.transactions.find({
            "merchant_id": merchant_id,
            "created_at": {"$gte": start_date.isoformat()}
        }, {"_id": 0, "amount": 1, "cashback_amount": 1}).to_list(10000)
        
        volume = sum(t.get("amount", 0) for t in transactions)
        cashback = sum(t.get("cashback_amount", 0) for t in transactions)
        
        period_stats[period_name] = {
            "volume": round(volume, 2),
            "cashback": round(cashback, 2),
            "transactions": len(transactions)
        }
    
    # Get unique clients served (count unique client_ids)
    pipeline = [
        {"$match": {"merchant_id": merchant_id}},
        {"$group": {"_id": "$client_id"}},
        {"$count": "unique_clients"}
    ]
    result = await db.transactions.aggregate(pipeline).to_list(1)
    unique_clients = result[0]["unique_clients"] if result else 0
    
    return {
        "all_time": {
            "total_volume": round(total_volume, 2),
            "total_cashback": round(total_cashback, 2),
            "total_transactions": total_transactions,
            "average_transaction": round(avg_transaction, 2),
            "unique_clients": unique_clients
        },
        "by_period": period_stats,
        "cashback_rate": current_merchant.get("cashback_rate", 5),
        "member_since": current_merchant.get("created_at")
    }


@router.get("/dashboard/chart-data")
async def get_chart_data(
    chart_type: str = "daily",  # daily, weekly, monthly
    current_merchant: dict = Depends(get_current_merchant)
):
    """Get chart data for sales and cashback evolution"""
    merchant_id = current_merchant["id"]
    now = datetime.now(timezone.utc)
    
    data_points = []
    
    if chart_type == "daily":
        # Last 7 days
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            transactions = await db.transactions.find({
                "merchant_id": merchant_id,
                "created_at": {
                    "$gte": day_start.isoformat(),
                    "$lt": day_end.isoformat()
                }
            }, {"_id": 0, "amount": 1, "cashback_amount": 1}).to_list(1000)
            
            volume = sum(t.get("amount", 0) for t in transactions)
            cashback = sum(t.get("cashback_amount", 0) for t in transactions)
            
            data_points.append({
                "label": day.strftime("%a"),  # Mon, Tue, etc.
                "date": day_start.isoformat(),
                "volume": round(volume, 2),
                "cashback": round(cashback, 2),
                "transactions": len(transactions)
            })
    
    elif chart_type == "weekly":
        # Last 4 weeks
        for i in range(3, -1, -1):
            week_start = now - timedelta(weeks=i, days=now.weekday())
            week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
            week_end = week_start + timedelta(weeks=1)
            
            transactions = await db.transactions.find({
                "merchant_id": merchant_id,
                "created_at": {
                    "$gte": week_start.isoformat(),
                    "$lt": week_end.isoformat()
                }
            }, {"_id": 0, "amount": 1, "cashback_amount": 1}).to_list(5000)
            
            volume = sum(t.get("amount", 0) for t in transactions)
            cashback = sum(t.get("cashback_amount", 0) for t in transactions)
            
            data_points.append({
                "label": f"S{week_start.isocalendar()[1]}",  # Week number
                "date": week_start.isoformat(),
                "volume": round(volume, 2),
                "cashback": round(cashback, 2),
                "transactions": len(transactions)
            })
    
    elif chart_type == "monthly":
        # Last 6 months
        for i in range(5, -1, -1):
            month = now.month - i
            year = now.year
            if month <= 0:
                month += 12
                year -= 1
            
            month_start = datetime(year, month, 1, tzinfo=timezone.utc)
            if month == 12:
                month_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                month_end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
            
            transactions = await db.transactions.find({
                "merchant_id": merchant_id,
                "created_at": {
                    "$gte": month_start.isoformat(),
                    "$lt": month_end.isoformat()
                }
            }, {"_id": 0, "amount": 1, "cashback_amount": 1}).to_list(10000)
            
            volume = sum(t.get("amount", 0) for t in transactions)
            cashback = sum(t.get("cashback_amount", 0) for t in transactions)
            
            data_points.append({
                "label": month_start.strftime("%b"),  # Jan, Feb, etc.
                "date": month_start.isoformat(),
                "volume": round(volume, 2),
                "cashback": round(cashback, 2),
                "transactions": len(transactions)
            })
    
    return {
        "chart_type": chart_type,
        "data": data_points,
        "totals": {
            "volume": sum(p["volume"] for p in data_points),
            "cashback": sum(p["cashback"] for p in data_points),
            "transactions": sum(p["transactions"] for p in data_points)
        }
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


# ============== MERCHANT PIN MANAGEMENT ==============

@router.get("/settings/pin-status")
async def get_pin_status(current_merchant: dict = Depends(get_current_merchant)):
    """Check if PIN protection is enabled for this merchant"""
    pin_data = await db.merchant_pins.find_one({"merchant_id": current_merchant["id"]}, {"_id": 0})
    
    return {
        "pin_enabled": pin_data.get("enabled", False) if pin_data else False,
        "has_pin": pin_data is not None and pin_data.get("pin_hash") is not None
    }


@router.post("/settings/pin/enable")
async def enable_pin(
    request: SetPinRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Enable PIN protection and set PIN"""
    if len(request.pin) < 4 or len(request.pin) > 6 or not request.pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be 4-6 digits")
    
    pin_hash = pwd_context.hash(request.pin)
    
    await db.merchant_pins.update_one(
        {"merchant_id": current_merchant["id"]},
        {"$set": {
            "merchant_id": current_merchant["id"],
            "pin_hash": pin_hash,
            "enabled": True,
            "failed_attempts": 0,
            "locked_until": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "message": "PIN enabled successfully"}


@router.post("/settings/pin/disable")
async def disable_pin(
    request: VerifyPinRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Disable PIN protection (requires current PIN verification)"""
    pin_data = await db.merchant_pins.find_one({"merchant_id": current_merchant["id"]})
    
    if not pin_data or not pin_data.get("pin_hash"):
        raise HTTPException(status_code=400, detail="No PIN configured")
    
    if not pwd_context.verify(request.pin, pin_data["pin_hash"]):
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    await db.merchant_pins.update_one(
        {"merchant_id": current_merchant["id"]},
        {"$set": {
            "enabled": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "PIN protection disabled"}


@router.post("/settings/pin/verify")
async def verify_pin(
    request: VerifyPinRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Verify PIN to access Settings"""
    pin_data = await db.merchant_pins.find_one({"merchant_id": current_merchant["id"]})
    
    if not pin_data or not pin_data.get("enabled"):
        return {"success": True, "message": "PIN not required"}
    
    if not pin_data.get("pin_hash"):
        raise HTTPException(status_code=400, detail="PIN not configured")
    
    # Check if locked
    if pin_data.get("locked_until"):
        locked_until = datetime.fromisoformat(pin_data["locked_until"])
        if datetime.now(timezone.utc) < locked_until:
            remaining = (locked_until - datetime.now(timezone.utc)).seconds // 60
            raise HTTPException(status_code=423, detail=f"Account locked. Try again in {remaining} minutes")
        else:
            # Reset lock
            await db.merchant_pins.update_one(
                {"merchant_id": current_merchant["id"]},
                {"$set": {"failed_attempts": 0, "locked_until": None}}
            )
    
    if not pwd_context.verify(request.pin, pin_data["pin_hash"]):
        # Increment failed attempts
        failed = pin_data.get("failed_attempts", 0) + 1
        updates = {"failed_attempts": failed}
        
        if failed >= 3:
            updates["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        
        await db.merchant_pins.update_one(
            {"merchant_id": current_merchant["id"]},
            {"$set": updates}
        )
        
        remaining = 3 - failed
        if remaining > 0:
            raise HTTPException(status_code=401, detail=f"Invalid PIN. {remaining} attempts remaining")
        else:
            raise HTTPException(status_code=423, detail="Too many attempts. Account locked for 5 minutes")
    
    # Reset failed attempts on success
    await db.merchant_pins.update_one(
        {"merchant_id": current_merchant["id"]},
        {"$set": {"failed_attempts": 0, "locked_until": None}}
    )
    
    return {"success": True, "message": "PIN verified"}


@router.post("/settings/pin/change")
async def change_pin(
    current_pin: str,
    new_pin: str,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Change PIN (requires current PIN)"""
    pin_data = await db.merchant_pins.find_one({"merchant_id": current_merchant["id"]})
    
    if not pin_data or not pin_data.get("pin_hash"):
        raise HTTPException(status_code=400, detail="No PIN configured")
    
    if not pwd_context.verify(current_pin, pin_data["pin_hash"]):
        raise HTTPException(status_code=401, detail="Current PIN is incorrect")
    
    if len(new_pin) < 4 or len(new_pin) > 6 or not new_pin.isdigit():
        raise HTTPException(status_code=400, detail="New PIN must be 4-6 digits")
    
    await db.merchant_pins.update_one(
        {"merchant_id": current_merchant["id"]},
        {"$set": {
            "pin_hash": pwd_context.hash(new_pin),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "PIN changed successfully"}


@router.post("/settings/pin/forgot")
async def forgot_pin(
    request: ForgotPinRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Request OTP to reset PIN"""
    if request.method not in ["sms", "email"]:
        raise HTTPException(status_code=400, detail="Method must be 'sms' or 'email'")
    
    # Generate OTP
    otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store OTP
    await db.merchant_pin_otps.update_one(
        {"merchant_id": current_merchant["id"]},
        {"$set": {
            "merchant_id": current_merchant["id"],
            "otp_hash": pwd_context.hash(otp),
            "expires_at": otp_expiry.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # In test mode, return OTP directly
    # In production, send via SMS or email
    SMS_TEST_MODE = os.environ.get('SMS_TEST_MODE', 'true').lower() == 'true'
    
    if SMS_TEST_MODE:
        return {
            "success": True,
            "message": f"OTP sent via {request.method}",
            "test_mode": True,
            "otp": otp  # Only in test mode
        }
    
    # TODO: Send OTP via BulkClix SMS or email
    destination = current_merchant.get("phone") if request.method == "sms" else current_merchant.get("email")
    
    return {
        "success": True,
        "message": f"OTP sent to {request.method}",
        "destination_hint": destination[-4:] if destination else None
    }


@router.post("/settings/pin/reset")
async def reset_pin(
    request: ResetPinRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Reset PIN using OTP"""
    otp_data = await db.merchant_pin_otps.find_one({"merchant_id": current_merchant["id"]})
    
    if not otp_data:
        raise HTTPException(status_code=400, detail="No OTP request found. Please request a new OTP")
    
    # Check expiry
    if datetime.now(timezone.utc) > datetime.fromisoformat(otp_data["expires_at"]):
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one")
    
    # Verify OTP
    if not pwd_context.verify(request.otp, otp_data["otp_hash"]):
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Validate new PIN
    if len(request.new_pin) < 4 or len(request.new_pin) > 6 or not request.new_pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be 4-6 digits")
    
    # Set new PIN
    await db.merchant_pins.update_one(
        {"merchant_id": current_merchant["id"]},
        {"$set": {
            "pin_hash": pwd_context.hash(request.new_pin),
            "enabled": True,
            "failed_attempts": 0,
            "locked_until": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Delete OTP
    await db.merchant_pin_otps.delete_one({"merchant_id": current_merchant["id"]})
    
    return {"success": True, "message": "PIN reset successfully"}


# ============== CASHIER MANAGEMENT ==============

@router.get("/cashiers")
async def get_cashiers(current_merchant: dict = Depends(get_current_merchant)):
    """Get all cashiers for this merchant"""
    cashiers = await db.merchant_cashiers.find(
        {"merchant_id": current_merchant["id"]},
        {"_id": 0}
    ).to_list(100)
    
    return {"cashiers": cashiers, "total": len(cashiers)}


@router.post("/cashiers")
async def create_cashier(
    request: CreateCashierRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Create a new cashier"""
    # Check if code already exists
    existing = await db.merchant_cashiers.find_one({
        "merchant_id": current_merchant["id"],
        "code": request.code.upper()
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Cashier code already exists")
    
    cashier = {
        "id": str(uuid.uuid4()),
        "merchant_id": current_merchant["id"],
        "name": request.name,
        "code": request.code.upper(),
        "register_number": request.register_number or request.code.upper(),
        "is_active": True,
        "total_transactions": 0,
        "total_volume": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.merchant_cashiers.insert_one(cashier)
    
    # Remove _id for response
    cashier.pop("_id", None)
    
    return {"success": True, "cashier": cashier}


@router.put("/cashiers/{cashier_id}")
async def update_cashier(
    cashier_id: str,
    request: UpdateCashierRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Update a cashier"""
    cashier = await db.merchant_cashiers.find_one({
        "id": cashier_id,
        "merchant_id": current_merchant["id"]
    })
    
    if not cashier:
        raise HTTPException(status_code=404, detail="Cashier not found")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.name is not None:
        updates["name"] = request.name
    if request.code is not None:
        # Check if new code already exists
        existing = await db.merchant_cashiers.find_one({
            "merchant_id": current_merchant["id"],
            "code": request.code.upper(),
            "id": {"$ne": cashier_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Cashier code already exists")
        updates["code"] = request.code.upper()
    if request.register_number is not None:
        updates["register_number"] = request.register_number
    if request.is_active is not None:
        updates["is_active"] = request.is_active
    
    await db.merchant_cashiers.update_one(
        {"id": cashier_id},
        {"$set": updates}
    )
    
    return {"success": True, "message": "Cashier updated"}


@router.delete("/cashiers/{cashier_id}")
async def delete_cashier(
    cashier_id: str,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Delete a cashier"""
    result = await db.merchant_cashiers.delete_one({
        "id": cashier_id,
        "merchant_id": current_merchant["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cashier not found")
    
    return {"success": True, "message": "Cashier deleted"}


@router.get("/cashiers/{cashier_id}/transactions")
async def get_cashier_transactions(
    cashier_id: str,
    period: str = "day",  # day, week, month, year
    current_merchant: dict = Depends(get_current_merchant)
):
    """Get transactions for a specific cashier"""
    # Verify cashier belongs to merchant
    cashier = await db.merchant_cashiers.find_one({
        "id": cashier_id,
        "merchant_id": current_merchant["id"]
    })
    
    if not cashier:
        raise HTTPException(status_code=404, detail="Cashier not found")
    
    # Calculate date range
    now = datetime.now(timezone.utc)
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    transactions = await db.transactions.find({
        "merchant_id": current_merchant["id"],
        "cashier_id": cashier_id,
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    total_volume = sum(t.get("amount", 0) for t in transactions)
    total_cashback = sum(t.get("cashback_amount", 0) for t in transactions)
    
    return {
        "cashier": cashier,
        "period": period,
        "transactions": transactions,
        "summary": {
            "total_transactions": len(transactions),
            "total_volume": total_volume,
            "total_cashback": total_cashback
        }
    }


# ============== TRANSACTIONS BY CASHIER/REGISTER ==============

@router.get("/transactions/by-cashier")
async def get_transactions_by_cashier(
    cashier_id: Optional[str] = None,
    register_number: Optional[str] = None,
    period: str = "day",
    limit: int = 100,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Get transactions filtered by cashier or register"""
    now = datetime.now(timezone.utc)
    
    # Calculate date range
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    query = {
        "merchant_id": current_merchant["id"],
        "created_at": {"$gte": start_date.isoformat()}
    }
    
    if cashier_id:
        query["cashier_id"] = cashier_id
    if register_number:
        query["register_number"] = register_number
    
    transactions = await db.transactions.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    total_volume = sum(t.get("amount", 0) for t in transactions)
    total_cashback = sum(t.get("cashback_amount", 0) for t in transactions)
    
    return {
        "period": period,
        "transactions": transactions,
        "summary": {
            "total_transactions": len(transactions),
            "total_volume": total_volume,
            "total_cashback": total_cashback
        }
    }


# ============== BUSINESS INFO UPDATE (Extended) ==============

@router.put("/settings/business-info")
async def update_business_info_extended(
    request: UpdateBusinessInfoRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Update business information (extended with location)"""
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    # Note: Phone number cannot be changed by merchant
    if request.business_name is not None:
        updates["business_name"] = request.business_name
    if request.business_type is not None:
        updates["business_type"] = request.business_type
    if request.business_address is not None:
        updates["business_address"] = request.business_address
    if request.business_description is not None:
        updates["business_description"] = request.business_description
    if request.city is not None:
        updates["city"] = request.city
    if request.gps_coordinates is not None:
        updates["gps_coordinates"] = request.gps_coordinates
    if request.google_maps_url is not None:
        updates["google_maps_url"] = request.google_maps_url
    if request.logo_url is not None:
        updates["logo_url"] = request.logo_url
    
    await db.merchants.update_one(
        {"id": current_merchant["id"]},
        {"$set": updates}
    )
    
    # Fetch updated merchant
    updated = await db.merchants.find_one(
        {"id": current_merchant["id"]},
        {"_id": 0, "hashed_password": 0}
    )
    
    return {"success": True, "message": "Business info updated", "merchant": updated}
