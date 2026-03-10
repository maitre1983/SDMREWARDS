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
    bank_id: Optional[str] = None  # BulkClix bank ID
    bank_account_name: Optional[str] = None  # Verified account holder name
    preferred_payout_method: Optional[str] = None  # 'momo' or 'bank'


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


# ============== CASH PAYMENT & DEBIT ACCOUNT MODELS ==============

class SearchCustomerRequest(BaseModel):
    query: str  # Customer ID or phone number


class CashTransactionRequest(BaseModel):
    customer_id: Optional[str] = None  # SDM Customer ID
    customer_phone: Optional[str] = None  # Customer phone number
    amount: float  # Transaction amount in GHS
    description: Optional[str] = None


class TopUpDebitAccountRequest(BaseModel):
    amount: float
    payment_method: str  # "momo"
    momo_phone: str
    momo_network: str  # MTN, Telecel, AirtelTigo


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


# ============== TRANSACTION HISTORY ==============

@router.get("/transactions/history")
async def get_transaction_history(
    page: int = 1,
    limit: int = 20,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    search: Optional[str] = None,
    sort_by: str = "date",  # date, amount, cashback
    sort_order: str = "desc",  # asc, desc
    current_merchant: dict = Depends(get_current_merchant)
):
    """
    Get paginated transaction history with filters
    """
    merchant_id = current_merchant["id"]
    
    # Build query
    query = {"merchant_id": merchant_id}
    
    # Date filter
    if date_from:
        try:
            from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query["created_at"] = query.get("created_at", {})
            query["created_at"]["$gte"] = from_date.isoformat()
        except ValueError:
            pass
    
    if date_to:
        try:
            to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            # Add 1 day to include the full end date
            to_date = to_date + timedelta(days=1)
            query["created_at"] = query.get("created_at", {})
            query["created_at"]["$lt"] = to_date.isoformat()
        except ValueError:
            pass
    
    # Amount filter
    if min_amount is not None:
        query["amount"] = query.get("amount", {})
        query["amount"]["$gte"] = min_amount
    
    if max_amount is not None:
        query["amount"] = query.get("amount", {})
        query["amount"]["$lte"] = max_amount
    
    # Search filter (client name or reference)
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"payment_reference": {"$regex": search, "$options": "i"}}
        ]
    
    # Sorting
    sort_field = {
        "date": "created_at",
        "amount": "amount",
        "cashback": "cashback_amount"
    }.get(sort_by, "created_at")
    
    sort_direction = -1 if sort_order == "desc" else 1
    
    # Pagination
    skip = (page - 1) * limit
    
    # Get total count
    total_count = await db.transactions.count_documents(query)
    
    # Get transactions
    transactions = await db.transactions.find(
        query,
        {"_id": 0}
    ).sort(sort_field, sort_direction).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with client names
    enriched_transactions = []
    for txn in transactions:
        client_id = txn.get("client_id")
        client_name = "Client"
        if client_id:
            client = await db.clients.find_one({"id": client_id}, {"_id": 0, "full_name": 1, "phone": 1})
            if client:
                client_name = client.get("full_name", "Client")
        
        enriched_transactions.append({
            "id": txn.get("id"),
            "date": txn.get("created_at"),
            "amount": txn.get("amount", 0),
            "cashback": txn.get("cashback_amount", 0),
            "client_name": client_name,
            "description": txn.get("description", ""),
            "reference": txn.get("payment_reference", ""),
            "status": txn.get("status", "completed"),
            "type": txn.get("type", "merchant_payment")
        })
    
    # Calculate summary stats
    all_matching = await db.transactions.find(query, {"_id": 0, "amount": 1, "cashback_amount": 1}).to_list(10000)
    total_volume = sum(t.get("amount", 0) for t in all_matching)
    total_cashback = sum(t.get("cashback_amount", 0) for t in all_matching)
    
    return {
        "transactions": enriched_transactions,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": (total_count + limit - 1) // limit
        },
        "summary": {
            "total_volume": round(total_volume, 2),
            "total_cashback": round(total_cashback, 2),
            "transaction_count": total_count
        }
    }


@router.get("/transactions/export")
async def export_transactions(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    format: str = "json",  # json or csv
    current_merchant: dict = Depends(get_current_merchant)
):
    """
    Export all transactions for a date range (for accounting)
    """
    merchant_id = current_merchant["id"]
    
    # Build query
    query = {"merchant_id": merchant_id}
    
    if date_from:
        try:
            from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query["created_at"] = query.get("created_at", {})
            query["created_at"]["$gte"] = from_date.isoformat()
        except ValueError:
            pass
    
    if date_to:
        try:
            to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            to_date = to_date + timedelta(days=1)
            query["created_at"] = query.get("created_at", {})
            query["created_at"]["$lt"] = to_date.isoformat()
        except ValueError:
            pass
    
    # Get all transactions
    transactions = await db.transactions.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(50000)
    
    # Enrich with client names
    enriched = []
    for txn in transactions:
        client_id = txn.get("client_id")
        client_name = "Client"
        if client_id:
            client = await db.clients.find_one({"id": client_id}, {"_id": 0, "full_name": 1})
            if client:
                client_name = client.get("full_name", "Client")
        
        enriched.append({
            "date": txn.get("created_at", ""),
            "amount": txn.get("amount", 0),
            "cashback": txn.get("cashback_amount", 0),
            "client": client_name,
            "reference": txn.get("payment_reference", ""),
            "status": txn.get("status", "completed")
        })
    
    # Calculate totals
    total_volume = sum(t["amount"] for t in enriched)
    total_cashback = sum(t["cashback"] for t in enriched)
    
    if format == "csv":
        # Return CSV formatted string
        csv_lines = ["Date,Amount (GHS),Cashback (GHS),Client,Reference,Status"]
        for t in enriched:
            csv_lines.append(f"{t['date']},{t['amount']},{t['cashback']},{t['client']},{t['reference']},{t['status']}")
        csv_lines.append(f"\nTotal,{total_volume},{total_cashback},,,")
        
        return {
            "format": "csv",
            "data": "\n".join(csv_lines),
            "filename": f"sdm_transactions_{date_from or 'all'}_{date_to or 'now'}.csv"
        }
    
    return {
        "format": "json",
        "transactions": enriched,
        "totals": {
            "volume": round(total_volume, 2),
            "cashback": round(total_cashback, 2),
            "count": len(enriched)
        }
    }


@router.get("/payouts")
async def get_merchant_payouts(
    page: int = 1,
    limit: int = 20,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Get merchant payout history - money received from customer payments"""
    merchant_id = current_merchant["id"]
    
    skip = (page - 1) * limit
    
    # Get payouts
    payouts = await db.merchant_payouts.find(
        {"merchant_id": merchant_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get total count
    total_count = await db.merchant_payouts.count_documents({"merchant_id": merchant_id})
    
    # Calculate totals
    all_payouts = await db.merchant_payouts.find(
        {"merchant_id": merchant_id, "status": "completed"},
        {"_id": 0, "amount": 1}
    ).to_list(100000)
    
    total_received = sum(p.get("amount", 0) for p in all_payouts)
    
    return {
        "payouts": payouts,
        "total_received": round(total_received, 2),
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit
        }
    }


# ============== CASH PAYMENT & DEBIT ACCOUNT SYSTEM ==============

@router.get("/search-customer")
async def search_customer(
    query: str,
    current_merchant: dict = Depends(get_current_merchant)
):
    """
    Search for a customer by SDM ID or phone number
    Used for cash payment transactions
    """
    if not query or len(query) < 3:
        raise HTTPException(status_code=400, detail="Query must be at least 3 characters")
    
    # Search by ID, phone, or username
    customer = await db.clients.find_one(
        {
            "$or": [
                {"id": query},
                {"phone": query},
                {"phone": {"$regex": query, "$options": "i"}},
                {"username": {"$regex": query, "$options": "i"}}
            ],
            "status": "active"
        },
        {
            "_id": 0,
            "id": 1,
            "full_name": 1,
            "phone": 1,
            "username": 1,
            "card_type": 1,
            "card_status": 1
        }
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check if customer has active card
    if customer.get("card_status") != "active" and not customer.get("card_type"):
        raise HTTPException(status_code=400, detail="Customer does not have an active SDM card")
    
    return {
        "customer": customer,
        "message": "Customer found"
    }


@router.get("/debit-account")
async def get_debit_account(current_merchant: dict = Depends(get_current_merchant)):
    """
    Get merchant's debit account information
    Shows current balance, limit, and status
    """
    merchant_id = current_merchant["id"]
    
    # Get or create debit account
    debit_account = await db.merchant_debit_accounts.find_one(
        {"merchant_id": merchant_id},
        {"_id": 0}
    )
    
    if not debit_account:
        # Create default debit account
        debit_account = {
            "id": str(uuid.uuid4()),
            "merchant_id": merchant_id,
            "balance": 0.0,  # Positive = credit, Negative = debit
            "debit_limit": 0.0,  # Set by admin, 0 = no limit configured
            "settlement_days": 0,  # Set by admin, 0 = no deadline
            "status": "active",  # active, blocked, warning
            "last_alert_sent": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.merchant_debit_accounts.insert_one(debit_account)
        debit_account.pop("_id", None)
    
    # Calculate usage percentage
    debit_limit = debit_account.get("debit_limit", 0)
    balance = debit_account.get("balance", 0)
    
    usage_percentage = 0
    if debit_limit > 0 and balance < 0:
        usage_percentage = min(100, abs(balance) / debit_limit * 100)
    
    return {
        "debit_account": debit_account,
        "stats": {
            "current_balance": round(balance, 2),
            "debit_limit": round(debit_limit, 2),
            "available_credit": round(max(0, debit_limit + balance), 2) if debit_limit > 0 else None,
            "usage_percentage": round(usage_percentage, 1),
            "status": debit_account.get("status", "active"),
            "is_blocked": debit_account.get("status") == "blocked"
        }
    }


@router.get("/debit-history")
async def get_debit_history(
    page: int = 1,
    limit: int = 20,
    current_merchant: dict = Depends(get_current_merchant)
):
    """
    Get merchant's debit account transaction history
    """
    merchant_id = current_merchant["id"]
    
    skip = (page - 1) * limit
    
    # Get debit transactions (ledger entries)
    transactions = await db.merchant_debit_ledger.find(
        {"merchant_id": merchant_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total_count = await db.merchant_debit_ledger.count_documents({"merchant_id": merchant_id})
    
    return {
        "transactions": transactions,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit
        }
    }


@router.post("/cash-transaction")
async def record_cash_transaction(
    request: CashTransactionRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """
    Record a cash payment transaction
    - Customer pays cash directly to merchant
    - Cashback is credited to customer's wallet
    - Merchant's debit account is debited by cashback amount
    """
    merchant_id = current_merchant["id"]
    
    # Validate input
    if not request.customer_id and not request.customer_phone:
        raise HTTPException(status_code=400, detail="Customer ID or phone number is required")
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # Find customer
    query = {}
    if request.customer_id:
        query["id"] = request.customer_id
    elif request.customer_phone:
        phone = request.customer_phone.replace(" ", "").replace("-", "")
        query["$or"] = [
            {"phone": phone},
            {"phone": {"$regex": phone.replace("+", "\\+"), "$options": "i"}}
        ]
    
    customer = await db.clients.find_one(query)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check customer has active card
    if customer.get("status") != "active":
        raise HTTPException(status_code=400, detail="Customer account is not active")
    
    # Get merchant's debit account
    debit_account = await db.merchant_debit_accounts.find_one({"merchant_id": merchant_id})
    
    if not debit_account:
        # Create default debit account
        debit_account = {
            "id": str(uuid.uuid4()),
            "merchant_id": merchant_id,
            "balance": 0.0,
            "debit_limit": 0.0,
            "settlement_days": 0,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.merchant_debit_accounts.insert_one(debit_account)
    
    # Check if merchant account is blocked
    if debit_account.get("status") == "blocked":
        raise HTTPException(
            status_code=403, 
            detail="Your debit account is blocked. Please top up your account or contact support."
        )
    
    # Calculate cashback
    cashback_rate = current_merchant.get("cashback_rate", 5)
    cashback_amount = round(request.amount * cashback_rate / 100, 2)
    
    # Check if this would exceed debit limit
    debit_limit = debit_account.get("debit_limit", 0)
    current_balance = debit_account.get("balance", 0)
    new_balance = current_balance - cashback_amount
    
    if debit_limit > 0 and abs(new_balance) > debit_limit:
        raise HTTPException(
            status_code=403,
            detail=f"This transaction would exceed your debit limit. Available: GHS {max(0, debit_limit + current_balance):.2f}"
        )
    
    # Create transaction record
    transaction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    transaction = {
        "id": transaction_id,
        "type": "cash_payment",
        "payment_method": "cash",
        "merchant_id": merchant_id,
        "client_id": customer["id"],
        "amount": request.amount,
        "cashback_amount": cashback_amount,
        "cashback_rate": cashback_rate,
        "description": request.description or f"Cash payment at {current_merchant.get('business_name', 'merchant')}",
        "status": "completed",
        "created_at": now
    }
    
    await db.transactions.insert_one(transaction)
    
    # Credit customer's cashback balance
    await db.clients.update_one(
        {"id": customer["id"]},
        {
            "$inc": {"cashback_balance": cashback_amount},
            "$set": {"updated_at": now}
        }
    )
    
    # Debit merchant's account
    await db.merchant_debit_accounts.update_one(
        {"merchant_id": merchant_id},
        {
            "$inc": {"balance": -cashback_amount},
            "$set": {"updated_at": now}
        }
    )
    
    # Create ledger entry
    ledger_entry = {
        "id": str(uuid.uuid4()),
        "merchant_id": merchant_id,
        "type": "debit",
        "amount": cashback_amount,
        "balance_after": new_balance,
        "reference_type": "cash_transaction",
        "reference_id": transaction_id,
        "description": f"Cashback for cash payment - Customer: {customer.get('full_name', 'Unknown')}",
        "created_at": now
    }
    await db.merchant_debit_ledger.insert_one(ledger_entry)
    
    # Update merchant stats
    await db.merchants.update_one(
        {"id": merchant_id},
        {
            "$inc": {
                "total_transactions": 1,
                "total_sales": request.amount,
                "total_cashback_given": cashback_amount
            },
            "$set": {"updated_at": now}
        }
    )
    
    # Check if alert should be sent (75% threshold)
    updated_account = await db.merchant_debit_accounts.find_one({"merchant_id": merchant_id})
    new_balance = updated_account.get("balance", 0)
    debit_limit = updated_account.get("debit_limit", 0)
    
    if debit_limit > 0:
        usage_percentage = abs(new_balance) / debit_limit * 100 if new_balance < 0 else 0
        
        # Send alert at 75%
        if usage_percentage >= 75 and usage_percentage < 100:
            last_alert = updated_account.get("last_alert_sent")
            should_send_alert = True
            
            if last_alert:
                last_alert_time = datetime.fromisoformat(last_alert.replace('Z', '+00:00'))
                if (datetime.now(timezone.utc) - last_alert_time).days < 1:
                    should_send_alert = False
            
            if should_send_alert:
                # Send SMS alert
                try:
                    from services.sms_service import get_sms
                    sms_service = get_sms()
                    merchant_phone = current_merchant.get("phone")
                    if merchant_phone:
                        message = f"SDM REWARDS ALERT: Your debit account is at {usage_percentage:.0f}% of your limit. Please top up to continue processing transactions."
                        await sms_service.send_sms(merchant_phone, message)
                        
                        await db.merchant_debit_accounts.update_one(
                            {"merchant_id": merchant_id},
                            {"$set": {"last_alert_sent": now, "status": "warning"}}
                        )
                except Exception as e:
                    logger.error(f"Failed to send debit alert SMS: {e}")
        
        # Block at 100%
        if usage_percentage >= 100:
            await db.merchant_debit_accounts.update_one(
                {"merchant_id": merchant_id},
                {"$set": {"status": "blocked"}}
            )
            
            # Send block notification
            try:
                from services.sms_service import get_sms
                sms_service = get_sms()
                merchant_phone = current_merchant.get("phone")
                if merchant_phone:
                    message = f"SDM REWARDS: Your debit account has reached its limit and is now BLOCKED. Please top up immediately to continue accepting cash payments."
                    await sms_service.send_sms(merchant_phone, message)
            except Exception as e:
                logger.error(f"Failed to send block notification SMS: {e}")
    
    return {
        "success": True,
        "transaction": {
            "id": transaction_id,
            "amount": request.amount,
            "cashback_amount": cashback_amount,
            "customer_name": customer.get("full_name", "Customer"),
            "created_at": now
        },
        "debit_account": {
            "new_balance": round(new_balance, 2),
            "debit_limit": round(debit_limit, 2)
        },
        "message": f"Cash transaction recorded. GHS {cashback_amount:.2f} cashback credited to customer."
    }


@router.post("/topup-debit-account")
async def topup_debit_account(
    request: TopUpDebitAccountRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """
    Top up merchant's debit account using Mobile Money
    """
    merchant_id = current_merchant["id"]
    
    if request.amount < 10:
        raise HTTPException(status_code=400, detail="Minimum top-up amount is GHS 10")
    
    if request.payment_method != "momo":
        raise HTTPException(status_code=400, detail="Only Mobile Money payments are supported")
    
    if request.momo_network not in ["MTN", "Telecel", "AirtelTigo"]:
        raise HTTPException(status_code=400, detail="Invalid mobile network")
    
    # Create payment record
    payment_id = str(uuid.uuid4())[:8].upper()
    now = datetime.now(timezone.utc).isoformat()
    
    payment = {
        "id": payment_id,
        "type": "debit_topup",
        "merchant_id": merchant_id,
        "amount": request.amount,
        "payment_method": "momo",
        "momo_phone": request.momo_phone,
        "momo_network": request.momo_network,
        "status": "pending",
        "created_at": now
    }
    
    await db.payments.insert_one(payment)
    
    # Initiate MoMo collection via BulkClix
    try:
        from services.bulkclix_service import get_bulkclix_service
        bulkclix = get_bulkclix_service()
        
        momo_result = await bulkclix.collect_momo(
            phone=request.momo_phone,
            amount=request.amount,
            network=request.momo_network,
            reference=f"TOPUP-{payment_id}",
            description=f"SDM Debit Account Top-up"
        )
        
        if momo_result.get("success"):
            await db.payments.update_one(
                {"id": payment_id},
                {"$set": {
                    "provider_reference": momo_result.get("reference"),
                    "status": "processing"
                }}
            )
            
            return {
                "success": True,
                "payment_id": payment_id,
                "amount": request.amount,
                "status": "processing",
                "message": "Please approve the payment prompt on your phone"
            }
        else:
            await db.payments.update_one(
                {"id": payment_id},
                {"$set": {"status": "failed", "error": momo_result.get("error")}}
            )
            raise HTTPException(status_code=400, detail=momo_result.get("error", "Payment initiation failed"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Debit top-up error: {e}")
        await db.payments.update_one(
            {"id": payment_id},
            {"$set": {"status": "failed", "error": str(e)}}
        )
        raise HTTPException(status_code=500, detail="Payment service error")


@router.post("/topup-callback/{payment_id}")
async def topup_callback(payment_id: str, status: str):
    """
    Callback endpoint for debit account top-up payment confirmation
    Called by payment processor or admin
    """
    payment = await db.payments.find_one({"id": payment_id, "type": "debit_topup"})
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.get("status") == "completed":
        return {"success": True, "message": "Payment already processed"}
    
    now = datetime.now(timezone.utc).isoformat()
    
    if status == "success":
        merchant_id = payment.get("merchant_id")
        amount = payment.get("amount", 0)
        
        # Update payment status
        await db.payments.update_one(
            {"id": payment_id},
            {"$set": {"status": "completed", "completed_at": now}}
        )
        
        # Credit merchant's debit account
        await db.merchant_debit_accounts.update_one(
            {"merchant_id": merchant_id},
            {
                "$inc": {"balance": amount},
                "$set": {"updated_at": now}
            }
        )
        
        # Get updated balance
        debit_account = await db.merchant_debit_accounts.find_one({"merchant_id": merchant_id})
        new_balance = debit_account.get("balance", 0) if debit_account else amount
        
        # Create ledger entry
        ledger_entry = {
            "id": str(uuid.uuid4()),
            "merchant_id": merchant_id,
            "type": "credit",
            "amount": amount,
            "balance_after": new_balance,
            "reference_type": "topup",
            "reference_id": payment_id,
            "description": f"Debit account top-up via MoMo",
            "created_at": now
        }
        await db.merchant_debit_ledger.insert_one(ledger_entry)
        
        # Unblock account if it was blocked
        if debit_account and debit_account.get("status") == "blocked" and new_balance >= 0:
            await db.merchant_debit_accounts.update_one(
                {"merchant_id": merchant_id},
                {"$set": {"status": "active"}}
            )
        
        # Send confirmation SMS
        try:
            merchant = await db.merchants.find_one({"id": merchant_id})
            if merchant and merchant.get("phone"):
                from services.sms_service import get_sms
                sms_service = get_sms()
                message = f"SDM REWARDS: Your debit account has been topped up with GHS {amount:.2f}. New balance: GHS {new_balance:.2f}"
                await sms_service.send_sms(merchant["phone"], message)
        except Exception as e:
            logger.error(f"Failed to send top-up confirmation SMS: {e}")
        
        return {"success": True, "message": "Top-up completed", "new_balance": new_balance}
    else:
        await db.payments.update_one(
            {"id": payment_id},
            {"$set": {"status": "failed", "updated_at": now}}
        )
        return {"success": False, "message": "Payment failed"}


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


# ============== BANK SERVICES FOR MERCHANTS ==============

@router.get("/banks/list")
async def get_bank_list():
    """Get list of supported banks for transfers"""
    from services.bulkclix_service import bank_transfer_service
    
    result = await bank_transfer_service.get_bank_list()
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to fetch banks"))
    
    return {
        "success": True,
        "banks": result["banks"]
    }


@router.post("/banks/verify-account")
async def verify_bank_account(
    account_number: str,
    bank_id: str,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Verify bank account and get account holder name"""
    from services.bulkclix_service import bank_transfer_service
    
    result = await bank_transfer_service.verify_bank_account(account_number, bank_id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to verify account"))
    
    return {
        "success": True,
        "account_name": result["account_name"],
        "account_number": account_number,
        "bank_id": bank_id
    }


@router.put("/settings/bank-info")
async def update_bank_info(
    bank_name: str,
    bank_id: str,
    bank_account: str,
    bank_account_name: str,
    preferred_payout_method: str = "bank",
    current_merchant: dict = Depends(get_current_merchant)
):
    """Update merchant bank information for payouts"""
    
    # Validate preferred method
    if preferred_payout_method not in ["momo", "bank"]:
        raise HTTPException(status_code=400, detail="Invalid payout method. Must be 'momo' or 'bank'")
    
    updates = {
        "bank_name": bank_name,
        "bank_id": bank_id,
        "bank_account": bank_account,
        "bank_account_name": bank_account_name,
        "preferred_payout_method": preferred_payout_method,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.merchants.update_one(
        {"id": current_merchant["id"]},
        {"$set": updates}
    )
    
    logger.info(f"Merchant {current_merchant['id']} updated bank info: {bank_name} - {bank_account}")
    
    return {
        "success": True,
        "message": "Bank information updated successfully",
        "bank_name": bank_name,
        "bank_account": bank_account,
        "bank_account_name": bank_account_name,
        "preferred_payout_method": preferred_payout_method
    }


@router.get("/settings/payout-info")
async def get_payout_info(current_merchant: dict = Depends(get_current_merchant)):
    """Get merchant's payout configuration (MoMo and Bank)"""
    
    merchant = await db.merchants.find_one(
        {"id": current_merchant["id"]},
        {
            "_id": 0,
            "momo_number": 1,
            "momo_network": 1,
            "bank_name": 1,
            "bank_id": 1,
            "bank_account": 1,
            "bank_account_name": 1,
            "preferred_payout_method": 1
        }
    )
    
    return {
        "success": True,
        "payout_info": {
            "momo": {
                "number": merchant.get("momo_number"),
                "network": merchant.get("momo_network")
            },
            "bank": {
                "name": merchant.get("bank_name"),
                "bank_id": merchant.get("bank_id"),
                "account_number": merchant.get("bank_account"),
                "account_name": merchant.get("bank_account_name")
            },
            "preferred_method": merchant.get("preferred_payout_method", "momo")
        }
    }

