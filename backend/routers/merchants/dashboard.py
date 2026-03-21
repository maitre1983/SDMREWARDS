"""
SDM REWARDS - Merchant Dashboard Routes
======================================
Dashboard, statistics and summary endpoints
"""

from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

from .shared import get_db
from routers.auth import get_current_merchant

router = APIRouter()
logger = logging.getLogger(__name__)
db = None

def _get_db():
    global db
    if db is None:
        from .shared import get_db
        db = get_db()
    return db


@router.get("/me")
async def get_merchant_dashboard(current_merchant: dict = Depends(get_current_merchant)):
    """Get merchant dashboard data"""
    db = _get_db()
    merchant_id = current_merchant["id"]
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    today_transactions = await db.transactions.find({
        "merchant_id": merchant_id,
        "created_at": {"$gte": today_start.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    today_volume = sum(t.get("amount", 0) for t in today_transactions)
    today_cashback = sum(t.get("cashback_amount", 0) for t in today_transactions)
    
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
    period: str = "day",
    current_merchant: dict = Depends(get_current_merchant)
):
    """Get advanced dashboard statistics by period"""
    db = _get_db()
    merchant_id = current_merchant["id"]
    now = datetime.now(timezone.utc)
    
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
    
    current_transactions = await db.transactions.find({
        "merchant_id": merchant_id,
        "created_at": {"$gte": current_start.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    previous_transactions = await db.transactions.find({
        "merchant_id": merchant_id,
        "created_at": {"$gte": previous_start.isoformat(), "$lt": previous_end.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    current_volume = sum(t.get("amount", 0) for t in current_transactions)
    current_cashback = sum(t.get("cashback_amount", 0) for t in current_transactions)
    current_count = len(current_transactions)
    
    previous_volume = sum(t.get("amount", 0) for t in previous_transactions)
    previous_cashback = sum(t.get("cashback_amount", 0) for t in previous_transactions)
    previous_count = len(previous_transactions)
    
    def calc_growth(current, previous):
        if previous == 0:
            return 100 if current > 0 else 0
        return round(((current - previous) / previous) * 100, 1)
    
    volume_growth = calc_growth(current_volume, previous_volume)
    cashback_growth = calc_growth(current_cashback, previous_cashback)
    count_growth = calc_growth(current_count, previous_count)
    
    avg_transaction = current_volume / current_count if current_count > 0 else 0
    prev_avg = previous_volume / previous_count if previous_count > 0 else 0
    avg_growth = calc_growth(avg_transaction, prev_avg)
    
    return {
        "period": period,
        "period_label": {"day": "Aujourd'hui", "week": "Cette semaine", "month": "Ce mois", "year": "Cette année"}.get(period, "Aujourd'hui"),
        "current": {"volume": round(current_volume, 2), "cashback": round(current_cashback, 2), "transactions": current_count, "average_transaction": round(avg_transaction, 2)},
        "previous": {"volume": round(previous_volume, 2), "cashback": round(previous_cashback, 2), "transactions": previous_count, "average_transaction": round(prev_avg, 2)},
        "growth": {"volume": volume_growth, "cashback": cashback_growth, "transactions": count_growth, "average_transaction": avg_growth},
        "period_start": current_start.isoformat(),
        "period_end": now.isoformat()
    }


@router.get("/dashboard/summary")
async def get_merchant_summary(current_merchant: dict = Depends(get_current_merchant)):
    """Get merchant accounting summary - aggregates from all payment sources"""
    db = _get_db()
    merchant_id = current_merchant["id"]
    now = datetime.now(timezone.utc)
    
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Aggregate from ALL payment sources
    collections_to_check = ['transactions', 'momo_payments', 'cash_payments']
    
    all_month_transactions = []
    all_transactions = []
    
    for collection_name in collections_to_check:
        collection = db[collection_name]
        
        # Month transactions
        month_txns = await collection.find({
            "merchant_id": merchant_id,
            "status": "completed",
            "created_at": {"$gte": month_start.isoformat()}
        }, {"_id": 0, "amount": 1, "merchant_amount": 1, "cashback_amount": 1}).to_list(10000)
        all_month_transactions.extend(month_txns)
        
        # All-time transactions
        all_txns = await collection.find({
            "merchant_id": merchant_id,
            "status": "completed"
        }, {"_id": 0, "amount": 1, "merchant_amount": 1, "cashback_amount": 1}).to_list(100000)
        all_transactions.extend(all_txns)
    
    # Remove duplicates (by checking if same transaction exists in multiple collections)
    seen_amounts = set()
    unique_month = []
    for t in all_month_transactions:
        key = f"{t.get('amount', 0)}_{t.get('cashback_amount', 0)}"
        if key not in seen_amounts:
            unique_month.append(t)
            seen_amounts.add(key)
    
    month_volume = sum(t.get("merchant_amount", t.get("amount", 0)) for t in all_month_transactions)
    month_cashback = sum(t.get("cashback_amount", 0) for t in all_month_transactions)
    
    total_volume = sum(t.get("merchant_amount", t.get("amount", 0)) for t in all_transactions)
    total_cashback = sum(t.get("cashback_amount", 0) for t in all_transactions)
    total_net = total_volume - total_cashback
    
    # Get payouts
    month_payouts = await db.merchant_payouts.find({
        "merchant_id": merchant_id,
        "status": "completed",
        "created_at": {"$gte": month_start.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    month_paid_out = sum(p.get("amount", 0) for p in month_payouts)
    
    all_payouts = await db.merchant_payouts.find({
        "merchant_id": merchant_id,
        "status": "completed"
    }, {"_id": 0}).to_list(10000)
    
    total_paid_out = sum(p.get("amount", 0) for p in all_payouts)
    
    # Also include manual withdrawals
    all_withdrawals = await db.merchant_withdrawals.find({
        "merchant_id": merchant_id,
        "status": "completed"
    }, {"_id": 0}).to_list(10000)
    total_withdrawn = sum(w.get("amount", 0) for w in all_withdrawals)
    
    # Get unique customers count
    unique_customers = set()
    for collection_name in collections_to_check:
        collection = db[collection_name]
        cursor = collection.find(
            {"merchant_id": merchant_id, "status": "completed"},
            {"_id": 0, "client_id": 1}
        )
        async for doc in cursor:
            if doc.get("client_id"):
                unique_customers.add(doc["client_id"])
    
    return {
        "this_month": {
            "volume": round(month_volume, 2),
            "cashback_given": round(month_cashback, 2),
            "net_earnings": round(month_volume - month_cashback, 2),
            "paid_out": round(month_paid_out, 2),
            "transactions": len(all_month_transactions)
        },
        "all_time": {
            "volume": round(total_volume, 2),
            "cashback_given": round(total_cashback, 2),
            "net_earnings": round(total_net, 2),
            "paid_out": round(total_paid_out + total_withdrawn, 2),
            "transactions": len(all_transactions),
            "unique_customers": len(unique_customers)
        },
        "current_balance": {
            "pending": round(current_merchant.get("pending_balance", 0), 2),
            "available": round(total_net - total_paid_out - total_withdrawn, 2)
        }
    }


@router.get("/dashboard/chart-data")
async def get_chart_data(
    period: str = "week",
    current_merchant: dict = Depends(get_current_merchant)
):
    """Get chart data for dashboard visualization"""
    db = _get_db()
    merchant_id = current_merchant["id"]
    now = datetime.now(timezone.utc)
    
    if period == "week":
        days = 7
        format_key = "%a"
    elif period == "month":
        days = 30
        format_key = "%d"
    else:
        days = 7
        format_key = "%a"
    
    start_date = now - timedelta(days=days)
    
    transactions = await db.transactions.find({
        "merchant_id": merchant_id,
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    daily_data = {}
    for i in range(days):
        day = (now - timedelta(days=days-1-i)).strftime(format_key)
        daily_data[day] = {"volume": 0, "transactions": 0, "cashback": 0}
    
    for t in transactions:
        try:
            created = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
            day_key = created.strftime(format_key)
            if day_key in daily_data:
                daily_data[day_key]["volume"] += t.get("amount", 0)
                daily_data[day_key]["transactions"] += 1
                daily_data[day_key]["cashback"] += t.get("cashback_amount", 0)
        except Exception:
            continue
    
    return {
        "labels": list(daily_data.keys()),
        "datasets": {
            "volume": [round(d["volume"], 2) for d in daily_data.values()],
            "transactions": [d["transactions"] for d in daily_data.values()],
            "cashback": [round(d["cashback"], 2) for d in daily_data.values()]
        }
    }


@router.get("/dashboard/payment-methods")
async def get_payment_methods_breakdown(
    chart_type: str = "daily",
    current_merchant: dict = Depends(get_current_merchant)
):
    """Get payment methods breakdown with chart data for Today's Payments"""
    db = _get_db()
    merchant_id = current_merchant["id"]
    now = datetime.now(timezone.utc)
    
    # Build periods based on chart_type
    periods = []
    if chart_type == "daily":
        # Last 7 days including today
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            periods.append({
                "label": day.strftime("%a"),
                "date": day_start.isoformat(),
                "start": day_start,
                "end": day_end
            })
    elif chart_type == "weekly":
        # Last 4 weeks
        for i in range(3, -1, -1):
            week_start = now - timedelta(weeks=i, days=now.weekday())
            week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
            week_end = week_start + timedelta(weeks=1)
            periods.append({
                "label": f"W{week_start.isocalendar()[1]}",
                "date": week_start.isoformat(),
                "start": week_start,
                "end": week_end
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
            periods.append({
                "label": month_start.strftime("%b"),
                "date": month_start.isoformat(),
                "start": month_start,
                "end": month_end
            })
    
    # Fetch data for each period
    data = []
    for period in periods:
        start_str = period["start"].isoformat()
        end_str = period["end"].isoformat()
        
        # Get MoMo transactions
        momo_txs = await db.transactions.find({
            "merchant_id": merchant_id,
            "status": "completed",
            "created_at": {"$gte": start_str, "$lt": end_str},
            "$or": [
                {"payment_method": "momo"},
                {"payment_method": {"$exists": False}}  # Legacy default to momo
            ]
        }, {"_id": 0, "amount": 1, "cashback_amount": 1, "net_cashback": 1}).to_list(10000)
        
        # Get cash transactions
        cash_txs = await db.transactions.find({
            "merchant_id": merchant_id,
            "status": "completed",
            "created_at": {"$gte": start_str, "$lt": end_str},
            "payment_method": "cash"
        }, {"_id": 0, "amount": 1, "cashback_amount": 1, "net_cashback": 1}).to_list(10000)
        
        momo_volume = sum(t.get("amount", 0) for t in momo_txs)
        momo_count = len(momo_txs)
        momo_cashback = sum(t.get("cashback_amount", 0) or t.get("net_cashback", 0) for t in momo_txs)
        
        cash_volume = sum(t.get("amount", 0) for t in cash_txs)
        cash_count = len(cash_txs)
        cash_cashback = sum(t.get("cashback_amount", 0) or t.get("net_cashback", 0) for t in cash_txs)
        
        data.append({
            "label": period["label"],
            "date": period["date"],
            "momo_volume": round(momo_volume, 2),
            "momo_count": momo_count,
            "momo_cashback": round(momo_cashback, 2),
            "cash_volume": round(cash_volume, 2),
            "cash_count": cash_count,
            "cash_cashback": round(cash_cashback, 2),
            "total_volume": round(momo_volume + cash_volume, 2),
            "total_count": momo_count + cash_count
        })
    
    # Also get overall breakdown
    all_transactions = await db.transactions.find(
        {"merchant_id": merchant_id, "status": "completed"},
        {"_id": 0, "payment_method": 1, "amount": 1}
    ).to_list(100000)
    
    breakdown = {}
    for t in all_transactions:
        method = t.get("payment_method", "momo")
        if method not in breakdown:
            breakdown[method] = {"count": 0, "volume": 0}
        breakdown[method]["count"] += 1
        breakdown[method]["volume"] += t.get("amount", 0)
    
    total = sum(b["count"] for b in breakdown.values())
    for method in breakdown:
        breakdown[method]["percentage"] = round((breakdown[method]["count"] / total * 100), 1) if total > 0 else 0
        breakdown[method]["volume"] = round(breakdown[method]["volume"], 2)
    
    return {
        "data": data,
        "breakdown": breakdown,
        "total_transactions": total,
        "chart_type": chart_type
    }
