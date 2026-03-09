"""
SDM REWARDS - Admin Dashboard Routes
====================================
Dashboard and analytics endpoints
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends

from routers.auth import get_current_admin
from routers.admin.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)
db = get_db()


@router.get("/dashboard")
async def get_admin_dashboard(current_admin: dict = Depends(get_current_admin)):
    """Get admin dashboard with platform statistics"""
    
    # Counts
    total_clients = await db.clients.count_documents({})
    active_clients = await db.clients.count_documents({"status": "active"})
    total_merchants = await db.merchants.count_documents({})
    active_merchants = await db.merchants.count_documents({"status": "active"})
    total_transactions = await db.transactions.count_documents({})
    
    # Today's stats
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_transactions = await db.transactions.find({
        "created_at": {"$gte": today_start.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    today_volume = sum(t.get("amount", 0) for t in today_transactions if t.get("type") == "payment")
    today_cashback = sum(t.get("cashback_amount", 0) for t in today_transactions)
    
    # Revenue stats
    revenue_docs = await db.platform_revenue.find({}, {"_id": 0}).to_list(10000)
    total_revenue = sum(r.get("amount", 0) for r in revenue_docs)
    
    # Card sales
    card_sales = await db.transactions.find({"type": "card_purchase"}, {"_id": 0}).to_list(10000)
    total_card_revenue = sum(t.get("amount", 0) for t in card_sales)
    
    # By card type
    card_type_stats = {}
    for card in card_sales:
        card_type = card.get("metadata", {}).get("card_type", "unknown")
        card_type_stats[card_type] = card_type_stats.get(card_type, 0) + 1
    
    return {
        "stats": {
            "total_clients": total_clients,
            "active_clients": active_clients,
            "total_merchants": total_merchants,
            "active_merchants": active_merchants,
            "total_transactions": total_transactions,
            "today_transactions": len(today_transactions),
            "today_volume": today_volume,
            "today_cashback": today_cashback,
            "total_revenue": total_revenue,
            "total_card_revenue": total_card_revenue,
            "card_type_stats": card_type_stats
        },
        "admin": {
            "email": current_admin["email"],
            "name": current_admin.get("name"),
            "is_super_admin": current_admin.get("is_super_admin", False)
        }
    }


@router.get("/dashboard/advanced-stats")
async def get_advanced_dashboard_stats(current_admin: dict = Depends(get_current_admin)):
    """Get advanced dashboard statistics for Overview page"""
    
    now = datetime.now(timezone.utc)
    
    # Card statistics from clients collection
    silver_cards = await db.clients.count_documents({"status": "active", "card_type": "silver"})
    gold_cards = await db.clients.count_documents({"status": "active", "card_type": "gold"})
    platinum_cards = await db.clients.count_documents({"status": "active", "card_type": "platinum"})
    diamond_cards = await db.clients.count_documents({"status": "active", "card_type": "diamond"})
    total_cards = silver_cards + gold_cards + platinum_cards + diamond_cards
    
    # Revenue from cards
    card_purchases = await db.transactions.find(
        {"type": "card_purchase"}, {"_id": 0, "amount": 1}
    ).to_list(100000)
    card_upgrades = await db.transactions.find(
        {"type": "card_upgrade"}, {"_id": 0, "amount": 1}
    ).to_list(100000)
    card_revenue = sum(t.get("amount", 0) for t in card_purchases) + sum(t.get("amount", 0) for t in card_upgrades)
    
    # Payment transactions
    all_payments = await db.transactions.find(
        {"type": "payment"},
        {"_id": 0, "amount": 1, "cashback_amount": 1, "merchant_id": 1, "client_id": 1, "created_at": 1}
    ).to_list(100000)
    
    total_gmv = sum(t.get("amount", 0) for t in all_payments)
    total_cashback_distributed = sum(t.get("cashback_amount", 0) for t in all_payments)
    
    # Referral bonuses
    referral_transactions = await db.transactions.find(
        {"type": {"$in": ["referral_bonus", "welcome_bonus"]}},
        {"_id": 0, "amount": 1}
    ).to_list(100000)
    total_referral_bonuses = sum(t.get("amount", 0) for t in referral_transactions)
    total_cashback_all = total_cashback_distributed + total_referral_bonuses
    
    # Top merchants
    merchant_stats = {}
    for payment in all_payments:
        merchant_id = payment.get("merchant_id")
        if merchant_id:
            if merchant_id not in merchant_stats:
                merchant_stats[merchant_id] = {"transactions": 0, "revenue": 0, "cashback_given": 0}
            merchant_stats[merchant_id]["transactions"] += 1
            merchant_stats[merchant_id]["revenue"] += payment.get("amount", 0)
            merchant_stats[merchant_id]["cashback_given"] += payment.get("cashback_amount", 0)
    
    top_merchants = []
    for merchant_id, stats in sorted(merchant_stats.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]:
        merchant_doc = await db.merchants.find_one({"id": merchant_id}, {"_id": 0, "business_name": 1, "owner_name": 1})
        if merchant_doc:
            top_merchants.append({
                "id": merchant_id,
                "business_name": merchant_doc.get("business_name", "Unknown"),
                "owner_name": merchant_doc.get("owner_name", ""),
                **stats
            })
    
    # Top clients
    client_stats = {}
    for payment in all_payments:
        client_id = payment.get("client_id")
        if client_id:
            if client_id not in client_stats:
                client_stats[client_id] = {"transactions": 0, "total_spent": 0, "cashback_earned": 0}
            client_stats[client_id]["transactions"] += 1
            client_stats[client_id]["total_spent"] += payment.get("amount", 0)
            client_stats[client_id]["cashback_earned"] += payment.get("cashback_amount", 0)
    
    top_clients = []
    for client_id, stats in sorted(client_stats.items(), key=lambda x: x[1]["total_spent"], reverse=True)[:10]:
        client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0, "full_name": 1, "username": 1, "phone": 1})
        if client_doc:
            top_clients.append({"id": client_id, **client_doc, **stats})
    
    # Referral stats
    total_referrals = await db.referrals.count_documents({})
    successful_referrals = await db.referrals.count_documents({"status": "completed"})
    
    # Monthly data (last 6 months)
    monthly_data = []
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (month_start + timedelta(days=32)).replace(day=1) if i > 0 else now + timedelta(days=1)
        
        month_transactions = [t for t in all_payments 
                             if t.get("created_at") and 
                             month_start.isoformat() <= t.get("created_at", "") < next_month.isoformat()]
        
        new_clients = await db.clients.count_documents({
            "created_at": {"$gte": month_start.isoformat(), "$lt": next_month.isoformat()}
        })
        
        monthly_data.append({
            "month": month_start.strftime("%b %Y"),
            "month_short": month_start.strftime("%b"),
            "transactions": len(month_transactions),
            "volume": sum(t.get("amount", 0) for t in month_transactions),
            "cashback": sum(t.get("cashback_amount", 0) for t in month_transactions),
            "new_clients": new_clients
        })
    
    # SDM Commissions
    all_transactions_with_commission = await db.transactions.find(
        {"type": "payment", "commission_amount": {"$exists": True}},
        {"_id": 0, "commission_amount": 1, "created_at": 1}
    ).to_list(100000)
    
    total_sdm_commissions = sum(t.get("commission_amount", 0) for t in all_transactions_with_commission)
    
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    sdm_commission_by_period = {"day": 0, "week": 0, "month": 0, "year": 0}
    for t in all_transactions_with_commission:
        created_at = t.get("created_at", "")
        commission = t.get("commission_amount", 0)
        if created_at >= day_start.isoformat():
            sdm_commission_by_period["day"] += commission
        if created_at >= week_start.isoformat():
            sdm_commission_by_period["week"] += commission
        if created_at >= month_start.isoformat():
            sdm_commission_by_period["month"] += commission
        if created_at >= year_start.isoformat():
            sdm_commission_by_period["year"] += commission
    
    # Service fees
    service_transactions = await db.transactions.find(
        {"type": {"$in": ["airtime", "data_bundle", "ecg_payment", "merchant_payment"]}},
        {"_id": 0, "type": 1, "amount": 1, "service_fee": 1, "created_at": 1}
    ).to_list(100000)
    
    service_fees = {
        "airtime": {"count": 0, "volume": 0, "fees": 0},
        "data_bundle": {"count": 0, "volume": 0, "fees": 0},
        "ecg_payment": {"count": 0, "volume": 0, "fees": 0},
        "merchant_payment": {"count": 0, "volume": 0, "fees": 0}
    }
    
    for t in service_transactions:
        svc_type = t.get("type", "")
        if svc_type in service_fees:
            service_fees[svc_type]["count"] += 1
            service_fees[svc_type]["volume"] += t.get("amount", 0)
            service_fees[svc_type]["fees"] += t.get("service_fee", 0)
    
    return {
        "card_stats": {
            "silver": silver_cards, "gold": gold_cards, "platinum": platinum_cards,
            "diamond": diamond_cards, "total": total_cards, "revenue": card_revenue
        },
        "financial_stats": {
            "total_gmv": total_gmv,
            "total_cashback_distributed": total_cashback_all,
            "total_card_revenue": card_revenue,
            "total_referral_bonuses": total_referral_bonuses,
            "total_sdm_commissions": round(total_sdm_commissions, 2),
            "sdm_commission_by_period": {k: round(v, 2) for k, v in sdm_commission_by_period.items()}
        },
        "service_fees": {
            "by_service": {k: {"label": k.replace("_", " ").title(), **{kk: round(vv, 2) if isinstance(vv, float) else vv for kk, vv in v.items()}} for k, v in service_fees.items()},
            "total_fees": round(sum(s["fees"] for s in service_fees.values()), 2)
        },
        "top_merchants": top_merchants[:5],
        "top_clients": top_clients[:5],
        "referral_stats": {
            "total_referrals": total_referrals,
            "successful_referrals": successful_referrals,
            "conversion_rate": round((successful_referrals / total_referrals * 100) if total_referrals > 0 else 0, 1)
        },
        "monthly_data": monthly_data
    }


@router.get("/analytics/monthly")
async def get_monthly_analytics(
    month: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Get analytics for a specific month (format: YYYY-MM)"""
    try:
        year, month_num = month.split('-')
        year, month_num = int(year), int(month_num)
        
        start_date = datetime(year, month_num, 1, tzinfo=timezone.utc)
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc) if month_num == 12 else datetime(year, month_num + 1, 1, tzinfo=timezone.utc)
        
        start_iso, end_iso = start_date.isoformat(), end_date.isoformat()
        
        transactions = await db.transactions.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})
        all_txns = await db.transactions.find({"created_at": {"$gte": start_iso, "$lt": end_iso}}, {"_id": 0, "amount": 1, "type": 1}).to_list(100000)
        
        volume = sum(t.get("amount", 0) for t in all_txns)
        new_clients = await db.clients.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})
        new_merchants = await db.merchants.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})
        cashback_distributed = sum(t.get("amount", 0) for t in all_txns if t.get("type") in ["cashback", "cashback_credit"])
        card_sales = sum(1 for t in all_txns if t.get("type") == "card_purchase")
        
        return {
            "month": month, "month_name": start_date.strftime("%B %Y"),
            "transactions": transactions, "volume": round(volume, 2),
            "new_clients": new_clients, "new_merchants": new_merchants,
            "cashback_distributed": round(cashback_distributed, 2), "card_sales": card_sales
        }
    except Exception as e:
        logger.error(f"Monthly analytics error: {e}")
        return {"month": month, "transactions": 0, "volume": 0, "new_clients": 0, "new_merchants": 0, "cashback_distributed": 0, "card_sales": 0}
