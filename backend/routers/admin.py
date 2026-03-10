"""
SDM REWARDS - Admin Router
==========================
Admin dashboard, user management, platform settings

Note: This file is being progressively refactored.
Models are now in routers/admin/models.py
Dependencies are in routers/admin/dependencies.py
"""

import os
import uuid
import bcrypt
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from routers.auth import get_current_admin

# Import refactored models and utilities
from routers.admin_modules import (
    CreateAdminRequest,
    UpdateClientRequest,
    UpdateClientLimitsRequest,
    SendSMSRequest,
    UpdateMerchantRequest,
    UpdateCommissionRequest,
    UpdateCardPricesRequest,
    CreateCardTypeRequest,
    UpdateCardTypeRequest,
    UpdateServiceCommissionsRequest,
    UpdateReferralBonusesRequest,
    CreateClientManualRequest,
    CreateMerchantManualRequest,
    BulkSMSRequest,
    SMSTemplateRequest,
    SetPINRequest,
    VerifyPINRequest,
    ChangePasswordRequest,
    AdminResetPasswordRequest,
    CreateAdminRoleRequest,
    UpdateAdminRoleRequest,
    PaymentLogoRequest,
    ADMIN_ROLES,
    check_is_super_admin
)

# Setup
router = APIRouter()
logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ============== LOCAL REQUEST MODELS (for backwards compatibility) ==============

class StatusActionRequest(BaseModel):
    action: str  # "activate", "suspend", "delete"


class MerchantDebitSettingsRequest(BaseModel):
    debit_limit: float  # Maximum allowed debit in GHS
    settlement_days: int = 0  # Days for settlement (0 = no deadline)


class MerchantDebitAdjustRequest(BaseModel):
    amount: float  # Positive for credit, negative for debit
    description: str


# ============== DASHBOARD ==============

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


# ============== ADVANCED DASHBOARD STATISTICS ==============

@router.get("/dashboard/advanced-stats")
async def get_advanced_dashboard_stats(current_admin: dict = Depends(get_current_admin)):
    """Get advanced dashboard statistics for Overview page"""
    
    # ============== 1. MEMBERSHIP CARD STATISTICS ==============
    # Count active cards directly from clients collection (more accurate)
    silver_cards = await db.clients.count_documents({"status": "active", "card_type": "silver"})
    gold_cards = await db.clients.count_documents({"status": "active", "card_type": "gold"})
    platinum_cards = await db.clients.count_documents({"status": "active", "card_type": "platinum"})
    diamond_cards = await db.clients.count_documents({"status": "active", "card_type": "diamond"})
    total_cards = silver_cards + gold_cards + platinum_cards + diamond_cards
    
    # ============== 2. REVENUE FROM MEMBERSHIP CARDS ==============
    # Get all card purchase transactions for revenue
    card_purchases = await db.transactions.find(
        {"type": "card_purchase"},
        {"_id": 0, "amount": 1}
    ).to_list(100000)
    
    # Also include card upgrades as revenue
    card_upgrades = await db.transactions.find(
        {"type": "card_upgrade"},
        {"_id": 0, "amount": 1}
    ).to_list(100000)
    
    card_revenue = sum(t.get("amount", 0) for t in card_purchases) + sum(t.get("amount", 0) for t in card_upgrades)
    
    # ============== 3. TOTAL TRANSACTION VOLUME (GMV) ==============
    all_payments = await db.transactions.find(
        {"type": "payment"},
        {"_id": 0, "amount": 1, "cashback_amount": 1, "merchant_id": 1, "client_id": 1, "created_at": 1}
    ).to_list(100000)
    
    total_gmv = sum(t.get("amount", 0) for t in all_payments)
    
    # ============== 4. TOTAL CASHBACK DISTRIBUTED ==============
    total_cashback_distributed = sum(t.get("cashback_amount", 0) for t in all_payments)
    
    # Also include referral bonuses as cashback
    referral_transactions = await db.transactions.find(
        {"type": {"$in": ["referral_bonus", "welcome_bonus"]}},
        {"_id": 0, "amount": 1}
    ).to_list(100000)
    total_referral_bonuses = sum(t.get("amount", 0) for t in referral_transactions)
    
    total_cashback_all = total_cashback_distributed + total_referral_bonuses
    
    # ============== 5. TOP PERFORMING MERCHANTS ==============
    merchant_stats = {}
    for payment in all_payments:
        merchant_id = payment.get("merchant_id")
        if merchant_id:
            if merchant_id not in merchant_stats:
                merchant_stats[merchant_id] = {
                    "transactions": 0,
                    "revenue": 0,
                    "cashback_given": 0
                }
            merchant_stats[merchant_id]["transactions"] += 1
            merchant_stats[merchant_id]["revenue"] += payment.get("amount", 0)
            merchant_stats[merchant_id]["cashback_given"] += payment.get("cashback_amount", 0)
    
    # Get merchant details and sort by revenue
    top_merchants = []
    for merchant_id, stats in sorted(merchant_stats.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]:
        merchant_doc = await db.merchants.find_one({"id": merchant_id}, {"_id": 0, "business_name": 1, "owner_name": 1})
        if merchant_doc:
            top_merchants.append({
                "id": merchant_id,
                "business_name": merchant_doc.get("business_name", "Unknown"),
                "owner_name": merchant_doc.get("owner_name", ""),
                "transactions": stats["transactions"],
                "revenue": stats["revenue"],
                "cashback_given": stats["cashback_given"]
            })
    
    # ============== 6. TOP ACTIVE CLIENTS ==============
    client_stats = {}
    for payment in all_payments:
        client_id = payment.get("client_id")
        if client_id:
            if client_id not in client_stats:
                client_stats[client_id] = {
                    "transactions": 0,
                    "total_spent": 0,
                    "cashback_earned": 0
                }
            client_stats[client_id]["transactions"] += 1
            client_stats[client_id]["total_spent"] += payment.get("amount", 0)
            client_stats[client_id]["cashback_earned"] += payment.get("cashback_amount", 0)
    
    # Add referral bonuses to client cashback
    for ref_tx in referral_transactions:
        client_id = ref_tx.get("client_id")
        if client_id and client_id in client_stats:
            client_stats[client_id]["cashback_earned"] += ref_tx.get("amount", 0)
    
    # Get client details and sort by total spent
    top_clients = []
    for client_id, stats in sorted(client_stats.items(), key=lambda x: x[1]["total_spent"], reverse=True)[:10]:
        client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0, "full_name": 1, "username": 1, "phone": 1})
        if client_doc:
            top_clients.append({
                "id": client_id,
                "full_name": client_doc.get("full_name", "Unknown"),
                "username": client_doc.get("username", ""),
                "phone": client_doc.get("phone", ""),
                "transactions": stats["transactions"],
                "total_spent": stats["total_spent"],
                "cashback_earned": stats["cashback_earned"]
            })
    
    # ============== 7. REFERRAL PERFORMANCE ==============
    total_referrals = await db.referrals.count_documents({})
    successful_referrals = await db.referrals.count_documents({"status": "completed"})
    
    # Top referrers
    referral_docs = await db.referrals.find(
        {"status": "completed"},
        {"_id": 0, "referrer_id": 1}
    ).to_list(100000)
    
    referrer_counts = {}
    for ref in referral_docs:
        referrer_id = ref.get("referrer_id")
        if referrer_id:
            referrer_counts[referrer_id] = referrer_counts.get(referrer_id, 0) + 1
    
    top_referrers = []
    for referrer_id, count in sorted(referrer_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
        client_doc = await db.clients.find_one({"id": referrer_id}, {"_id": 0, "full_name": 1, "username": 1})
        if client_doc:
            top_referrers.append({
                "id": referrer_id,
                "full_name": client_doc.get("full_name", "Unknown"),
                "username": client_doc.get("username", ""),
                "referrals": count,
                "bonus_earned": count * 3  # 3 GHS per referral
            })
    
    # ============== 8. MONTHLY GROWTH DATA (Last 6 months) ==============
    monthly_data = []
    now = datetime.now(timezone.utc)
    
    for i in range(5, -1, -1):
        # Calculate month start/end
        month_start = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            next_month = (month_start + timedelta(days=32)).replace(day=1)
        else:
            next_month = now + timedelta(days=1)
        
        # Transactions this month
        month_transactions = [t for t in all_payments 
                             if t.get("created_at") and 
                             month_start.isoformat() <= t.get("created_at", "") < next_month.isoformat()]
        
        month_volume = sum(t.get("amount", 0) for t in month_transactions)
        month_cashback = sum(t.get("cashback_amount", 0) for t in month_transactions)
        
        # New clients this month
        new_clients = await db.clients.count_documents({
            "created_at": {
                "$gte": month_start.isoformat(),
                "$lt": next_month.isoformat()
            }
        })
        
        monthly_data.append({
            "month": month_start.strftime("%b %Y"),
            "month_short": month_start.strftime("%b"),
            "transactions": len(month_transactions),
            "volume": month_volume,
            "cashback": month_cashback,
            "new_clients": new_clients
        })
    
    # ============== 9. SDM CASHBACK COMMISSIONS ==============
    # Commission on cashback (5% default) - already stored in transactions
    all_transactions_with_commission = await db.transactions.find(
        {"type": "payment", "commission_amount": {"$exists": True}},
        {"_id": 0, "commission_amount": 1, "created_at": 1}
    ).to_list(100000)
    
    total_sdm_commissions = sum(t.get("commission_amount", 0) for t in all_transactions_with_commission)
    
    # Commission by period
    sdm_commission_by_period = {
        "day": 0,
        "week": 0,
        "month": 0,
        "year": 0
    }
    
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
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
    
    # ============== 10. SERVICE FEES ANALYTICS ==============
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
    
    monthly_service_fees = {}  # For chart
    
    for t in service_transactions:
        svc_type = t.get("type", "")
        if svc_type in service_fees:
            service_fees[svc_type]["count"] += 1
            service_fees[svc_type]["volume"] += t.get("amount", 0)
            service_fees[svc_type]["fees"] += t.get("service_fee", 0)
        
        # Monthly breakdown
        created_at = t.get("created_at", "")
        if created_at:
            month_key = created_at[:7]  # YYYY-MM
            if month_key not in monthly_service_fees:
                monthly_service_fees[month_key] = 0
            monthly_service_fees[month_key] += t.get("service_fee", 0)
    
    # Top services by usage
    top_services = sorted(
        [{"service": k, **v} for k, v in service_fees.items()],
        key=lambda x: x["count"],
        reverse=True
    )
    
    # Monthly fees chart data (last 6 months)
    monthly_fees_chart = []
    for i in range(5, -1, -1):
        m = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1)
        month_key = m.strftime("%Y-%m")
        monthly_fees_chart.append({
            "month": m.strftime("%b"),
            "fees": monthly_service_fees.get(month_key, 0)
        })
    
    return {
        "card_stats": {
            "silver": silver_cards,
            "gold": gold_cards,
            "platinum": platinum_cards,
            "diamond": diamond_cards,
            "total": total_cards,
            "revenue": card_revenue
        },
        "financial_stats": {
            "total_gmv": total_gmv,
            "total_cashback_distributed": total_cashback_all,
            "total_card_revenue": card_revenue,
            "total_referral_bonuses": total_referral_bonuses,
            "total_sdm_commissions": round(total_sdm_commissions, 2),
            "sdm_commission_by_period": {
                k: round(v, 2) for k, v in sdm_commission_by_period.items()
            }
        },
        "service_fees": {
            "by_service": {
                "airtime": {
                    "label": "Airtime",
                    "count": service_fees["airtime"]["count"],
                    "volume": round(service_fees["airtime"]["volume"], 2),
                    "fees": round(service_fees["airtime"]["fees"], 2)
                },
                "data_bundle": {
                    "label": "Data Bundles",
                    "count": service_fees["data_bundle"]["count"],
                    "volume": round(service_fees["data_bundle"]["volume"], 2),
                    "fees": round(service_fees["data_bundle"]["fees"], 2)
                },
                "ecg_payment": {
                    "label": "ECG / Electricity",
                    "count": service_fees["ecg_payment"]["count"],
                    "volume": round(service_fees["ecg_payment"]["volume"], 2),
                    "fees": round(service_fees["ecg_payment"]["fees"], 2)
                },
                "merchant_payment": {
                    "label": "Merchant Payment",
                    "count": service_fees["merchant_payment"]["count"],
                    "volume": round(service_fees["merchant_payment"]["volume"], 2),
                    "fees": round(service_fees["merchant_payment"]["fees"], 2)
                }
            },
            "top_services": top_services,
            "monthly_chart": monthly_fees_chart,
            "total_fees": round(sum(s["fees"] for s in service_fees.values()), 2)
        },
        "top_merchants": top_merchants[:5],
        "top_clients": top_clients[:5],
        "referral_stats": {
            "total_referrals": total_referrals,
            "successful_referrals": successful_referrals,
            "conversion_rate": round((successful_referrals / total_referrals * 100) if total_referrals > 0 else 0, 1),
            "top_referrers": top_referrers
        },
        "monthly_data": monthly_data
    }


# ============== MONTHLY ANALYTICS ENDPOINT ==============

@router.get("/analytics/monthly")
async def get_monthly_analytics(
    month: str,  # Format: YYYY-MM
    current_admin: dict = Depends(get_current_admin)
):
    """Get analytics for a specific month"""
    try:
        # Parse the month parameter
        year, month_num = month.split('-')
        year = int(year)
        month_num = int(month_num)
        
        # Create date range for the month
        start_date = datetime(year, month_num, 1, tzinfo=timezone.utc)
        if month_num == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(year, month_num + 1, 1, tzinfo=timezone.utc)
        
        start_iso = start_date.isoformat()
        end_iso = end_date.isoformat()
        
        # Count transactions in this month
        transactions = await db.transactions.count_documents({
            "created_at": {"$gte": start_iso, "$lt": end_iso}
        })
        
        # Calculate volume
        all_txns = await db.transactions.find({
            "created_at": {"$gte": start_iso, "$lt": end_iso}
        }, {"_id": 0, "amount": 1, "type": 1}).to_list(100000)
        
        volume = sum(t.get("amount", 0) for t in all_txns)
        
        # Count new clients
        new_clients = await db.clients.count_documents({
            "created_at": {"$gte": start_iso, "$lt": end_iso}
        })
        
        # Count new merchants
        new_merchants = await db.merchants.count_documents({
            "created_at": {"$gte": start_iso, "$lt": end_iso}
        })
        
        # Calculate cashback distributed
        cashback_txns = [t for t in all_txns if t.get("type") in ["cashback", "cashback_credit"]]
        cashback_distributed = sum(t.get("amount", 0) for t in cashback_txns)
        
        # Count card sales
        card_sales = sum(1 for t in all_txns if t.get("type") == "card_purchase")
        
        return {
            "month": month,
            "month_name": start_date.strftime("%B %Y"),
            "transactions": transactions,
            "volume": round(volume, 2),
            "new_clients": new_clients,
            "new_merchants": new_merchants,
            "cashback_distributed": round(cashback_distributed, 2),
            "card_sales": card_sales
        }
    except Exception as e:
        logger.error(f"Monthly analytics error: {e}")
        return {
            "month": month,
            "transactions": 0,
            "volume": 0,
            "new_clients": 0,
            "new_merchants": 0,
            "cashback_distributed": 0,
            "card_sales": 0
        }


# ============== CLIENTS MANAGEMENT ==============

@router.get("/clients")
async def list_clients(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    """List all clients"""
    query = {}
    
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}}
        ]
    
    clients = await db.clients.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    total = await db.clients.count_documents(query)
    
    return {
        "clients": clients,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/clients/{client_id}")
async def get_client(client_id: str, current_admin: dict = Depends(get_current_admin)):
    """Get client details with card validity status"""
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0, "password_hash": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Calculate card validity
    card_validity = None
    if client_doc.get("card_type"):
        now = datetime.now(timezone.utc)
        expires_at = client_doc.get("card_expires_at")
        purchased_at = client_doc.get("card_purchased_at")
        
        if expires_at:
            expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            delta = expiry_date - now
            days_remaining = max(0, delta.days)
            is_expired = now >= expiry_date
            
            card_validity = {
                "status": "expired" if is_expired else ("expiring_soon" if days_remaining <= 30 else "active"),
                "is_active": not is_expired,
                "purchased_at": purchased_at,
                "expires_at": expires_at,
                "days_remaining": days_remaining,
                "duration_days": client_doc.get("card_duration_days", 365)
            }
        else:
            # Legacy card without expiry
            card_validity = {
                "status": "active",
                "is_active": True,
                "purchased_at": purchased_at,
                "expires_at": None,
                "days_remaining": None,
                "duration_days": None
            }
    
    # Get client's transactions
    transactions = await db.transactions.find(
        {"client_id": client_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Get referrals
    referrals = await db.referrals.find(
        {"referrer_id": client_id},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "client": client_doc,
        "card_validity": card_validity,
        "transactions": transactions,
        "referrals": referrals
    }


@router.put("/clients/{client_id}")
async def update_client(
    client_id: str,
    request: UpdateClientRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update client"""
    client_doc = await db.clients.find_one({"id": client_id})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.full_name:
        updates["full_name"] = request.full_name
    if request.email:
        updates["email"] = request.email.lower()
    if request.status:
        updates["status"] = request.status
    
    await db.clients.update_one({"id": client_id}, {"$set": updates})
    
    # Log admin action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "update_client",
        "target_id": client_id,
        "changes": updates,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Client updated"}


@router.post("/clients/{client_id}/suspend")
async def suspend_client(client_id: str, current_admin: dict = Depends(get_current_admin)):
    """Suspend client"""
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"status": "suspended", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "suspend_client",
        "target_id": client_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Client suspended"}


@router.post("/clients/{client_id}/activate")
async def activate_client(client_id: str, current_admin: dict = Depends(get_current_admin)):
    """Activate/reactivate client"""
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Client activated"}


class StatusActionRequest(BaseModel):
    action: str  # "activate", "suspend", "delete"


@router.put("/clients/{client_id}/status")
async def update_client_status(
    client_id: str,
    request: StatusActionRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update client status via action"""
    action_map = {
        "activate": "active",
        "suspend": "suspended",
        "delete": "deleted"
    }
    
    if request.action not in action_map:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    new_status = action_map[request.action]
    
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": f"{request.action}_client",
        "target_id": client_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": f"Client {request.action}d"}


@router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_admin: dict = Depends(get_current_admin)):
    """Soft delete client"""
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"status": "deleted", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "delete_client",
        "target_id": client_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Client deleted"}


# ============== ENHANCED CLIENT MANAGEMENT ==============

@router.get("/clients/{client_id}/transactions")
async def get_client_transactions(
    client_id: str,
    limit: int = 100,
    current_admin: dict = Depends(get_current_admin)
):
    """Get detailed transaction history for a client"""
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0, "password_hash": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get all transactions
    transactions = await db.transactions.find(
        {"client_id": client_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Calculate summaries
    cashback_received = sum(t.get("cashback_amount", 0) for t in transactions if t.get("type") == "payment")
    cashback_received += sum(t.get("amount", 0) for t in transactions if t.get("type") in ["referral_bonus", "welcome_bonus"])
    cashback_spent = sum(t.get("amount", 0) for t in transactions if t.get("type") in ["airtime", "data", "withdrawal"])
    payments_made = sum(t.get("amount", 0) for t in transactions if t.get("type") == "payment")
    
    # Get referrals
    referrals = await db.referrals.find(
        {"referrer_id": client_id},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "client": client_doc,
        "transactions": transactions,
        "summary": {
            "cashback_received": cashback_received,
            "cashback_spent": cashback_spent,
            "payments_made": payments_made,
            "total_transactions": len(transactions),
            "referrals_count": len(referrals)
        },
        "referrals": referrals
    }


@router.post("/clients/{client_id}/block")
async def block_client(client_id: str, current_admin: dict = Depends(get_current_admin)):
    """Block client account"""
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"status": "blocked", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "block_client",
        "target_id": client_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Client blocked"}


@router.put("/clients/{client_id}/limits")
async def update_client_limits(
    client_id: str,
    request: UpdateClientLimitsRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update client account limits"""
    client_doc = await db.clients.find_one({"id": client_id})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.withdrawal_limit is not None:
        updates["withdrawal_limit"] = request.withdrawal_limit
    if request.transaction_limit is not None:
        updates["transaction_limit"] = request.transaction_limit
    if request.daily_limit is not None:
        updates["daily_limit"] = request.daily_limit
    
    await db.clients.update_one({"id": client_id}, {"$set": updates})
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "update_client_limits",
        "target_id": client_id,
        "changes": updates,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Client limits updated"}


@router.post("/clients/{client_id}/reset-password")
async def admin_reset_client_password(
    client_id: str,
    request: AdminResetPasswordRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Admin: Reset client password (Super Admin only)"""
    # Only super admin can reset passwords
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Only super admin can reset passwords")
    
    client_doc = await db.clients.find_one({"id": client_id})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Hash and update password
    password_hash = bcrypt.hashpw(request.new_password.encode(), bcrypt.gensalt()).decode()
    
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {
            "password_hash": password_hash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log the action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "admin_email": current_admin.get("email"),
        "action": "reset_client_password",
        "target_id": client_id,
        "target_phone": client_doc.get("phone"),
        "target_name": client_doc.get("full_name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Password reset successfully for {client_doc.get('full_name', 'client')}"
    }


@router.post("/clients/{client_id}/send-sms")
async def send_sms_to_client(
    client_id: str,
    request: SendSMSRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Send SMS to client"""
    client_doc = await db.clients.find_one({"id": client_id})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    
    phone = client_doc.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="Client has no phone number")
    
    # Import SMS service
    from services.sms_service import get_sms
    sms = get_sms()
    result = await sms.send_sms(phone, request.message)
    
    # Log the SMS
    await db.sms_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "recipient_type": "client",
        "recipient_id": client_id,
        "phone": phone,
        "message": request.message,
        "status": "sent" if result.get("success") else "failed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": result.get("success", False), "message": "SMS sent" if result.get("success") else "SMS failed"}


# ============== MERCHANTS MANAGEMENT ==============

# NOTE: Static routes must come BEFORE parameterized routes to avoid routing conflicts

@router.get("/merchants/debit-overview")
async def get_merchants_debit_overview(
    current_admin: dict = Depends(get_current_admin)
):
    """Get overview of all merchant debit accounts"""
    
    # Get all debit accounts
    debit_accounts = await db.merchant_debit_accounts.find({}, {"_id": 0}).to_list(10000)
    
    # Enrich with merchant info
    enriched = []
    for account in debit_accounts:
        merchant = await db.merchants.find_one(
            {"id": account.get("merchant_id")},
            {"_id": 0, "business_name": 1, "owner_name": 1, "phone": 1, "status": 1}
        )
        if merchant:
            balance = account.get("balance", 0)
            debit_limit = account.get("debit_limit", 0)
            usage_percentage = 0
            if debit_limit > 0 and balance < 0:
                usage_percentage = min(100, abs(balance) / debit_limit * 100)
            
            enriched.append({
                **account,
                "merchant": merchant,
                "usage_percentage": round(usage_percentage, 1)
            })
    
    # Sort by balance (most negative first)
    enriched.sort(key=lambda x: x.get("balance", 0))
    
    # Calculate totals
    total_debt = sum(abs(a.get("balance", 0)) for a in enriched if a.get("balance", 0) < 0)
    total_credit = sum(a.get("balance", 0) for a in enriched if a.get("balance", 0) > 0)
    blocked_count = sum(1 for a in enriched if a.get("status") == "blocked")
    warning_count = sum(1 for a in enriched if a.get("status") == "warning")
    
    return {
        "accounts": enriched,
        "summary": {
            "total_merchants": len(enriched),
            "total_debt": round(total_debt, 2),
            "total_credit": round(total_credit, 2),
            "blocked_count": blocked_count,
            "warning_count": warning_count
        }
    }


@router.get("/merchants")
async def list_merchants(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    """List all merchants"""
    query = {}
    
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"business_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"owner_name": {"$regex": search, "$options": "i"}}
        ]
    
    merchants = await db.merchants.find(
        query,
        {"_id": 0, "password_hash": 0, "api_key": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    total = await db.merchants.count_documents(query)
    
    return {
        "merchants": merchants,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/merchants/{merchant_id}")
async def get_merchant(merchant_id: str, current_admin: dict = Depends(get_current_admin)):
    """Get merchant details"""
    merchant = await db.merchants.find_one(
        {"id": merchant_id},
        {"_id": 0, "password_hash": 0}
    )
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # Get transactions
    transactions = await db.transactions.find(
        {"merchant_id": merchant_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "merchant": merchant,
        "transactions": transactions
    }


@router.put("/merchants/{merchant_id}")
async def update_merchant(
    merchant_id: str,
    request: UpdateMerchantRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update merchant"""
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.business_name:
        updates["business_name"] = request.business_name
    if request.owner_name:
        updates["owner_name"] = request.owner_name
    if request.status:
        updates["status"] = request.status
    if request.cashback_rate is not None:
        if request.cashback_rate < 1 or request.cashback_rate > 20:
            raise HTTPException(status_code=400, detail="Cashback rate must be 1-20%")
        updates["cashback_rate"] = request.cashback_rate
    
    await db.merchants.update_one({"id": merchant_id}, {"$set": updates})
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "update_merchant",
        "target_id": merchant_id,
        "changes": updates,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Merchant updated"}


@router.post("/merchants/{merchant_id}/approve")
async def approve_merchant(merchant_id: str, current_admin: dict = Depends(get_current_admin)):
    """Approve pending merchant"""
    await db.merchants.update_one(
        {"id": merchant_id},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Merchant approved"}


@router.post("/merchants/{merchant_id}/suspend")
async def suspend_merchant(merchant_id: str, current_admin: dict = Depends(get_current_admin)):
    """Suspend merchant"""
    await db.merchants.update_one(
        {"id": merchant_id},
        {"$set": {"status": "suspended", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Merchant suspended"}


@router.put("/merchants/{merchant_id}/status")
async def update_merchant_status(
    merchant_id: str,
    request: StatusActionRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update merchant status via action"""
    action_map = {
        "activate": "active",
        "approve": "active",
        "suspend": "suspended",
        "delete": "deleted"
    }
    
    if request.action not in action_map:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    new_status = action_map[request.action]
    
    await db.merchants.update_one(
        {"id": merchant_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": f"{request.action}_merchant",
        "target_id": merchant_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": f"Merchant {request.action}d"}


@router.delete("/merchants/{merchant_id}")
async def delete_merchant(merchant_id: str, current_admin: dict = Depends(get_current_admin)):
    """Soft delete merchant"""
    await db.merchants.update_one(
        {"id": merchant_id},
        {"$set": {"status": "deleted", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Merchant deleted"}


# ============== ENHANCED MERCHANT MANAGEMENT ==============

@router.get("/merchants/{merchant_id}/transactions")
async def get_merchant_transactions(
    merchant_id: str,
    limit: int = 100,
    current_admin: dict = Depends(get_current_admin)
):
    """Get detailed transaction history for a merchant"""
    merchant_doc = await db.merchants.find_one({"id": merchant_id}, {"_id": 0, "password_hash": 0})
    if not merchant_doc:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # Get all transactions
    transactions = await db.transactions.find(
        {"merchant_id": merchant_id, "type": "payment"},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Get unique clients served
    unique_clients = set()
    for t in transactions:
        if t.get("client_id"):
            unique_clients.add(t["client_id"])
    
    # Calculate summaries
    total_volume = sum(t.get("amount", 0) for t in transactions)
    total_cashback = sum(t.get("cashback_amount", 0) for t in transactions)
    
    # Enrich transactions with client info
    for t in transactions:
        client_id = t.get("client_id")
        if client_id:
            client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0, "full_name": 1, "username": 1})
            if client_doc:
                t["client_name"] = client_doc.get("full_name", "Unknown")
                t["client_username"] = client_doc.get("username", "")
    
    return {
        "merchant": merchant_doc,
        "transactions": transactions,
        "summary": {
            "total_transactions": len(transactions),
            "total_volume": total_volume,
            "total_cashback": total_cashback,
            "unique_clients": len(unique_clients)
        }
    }


@router.post("/merchants/{merchant_id}/reject")
async def reject_merchant(merchant_id: str, current_admin: dict = Depends(get_current_admin)):
    """Reject pending merchant"""
    await db.merchants.update_one(
        {"id": merchant_id},
        {"$set": {"status": "rejected", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "reject_merchant",
        "target_id": merchant_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Merchant rejected"}


@router.post("/merchants/{merchant_id}/block")
async def block_merchant(merchant_id: str, current_admin: dict = Depends(get_current_admin)):
    """Block merchant account"""
    await db.merchants.update_one(
        {"id": merchant_id},
        {"$set": {"status": "blocked", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "block_merchant",
        "target_id": merchant_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Merchant blocked"}


@router.put("/merchants/{merchant_id}/location")
async def update_merchant_location(
    merchant_id: str,
    request: UpdateMerchantRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update merchant location details"""
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.address:
        updates["address"] = request.address
    if request.google_maps_url:
        updates["google_maps_url"] = request.google_maps_url
    if request.city:
        updates["city"] = request.city
    
    await db.merchants.update_one({"id": merchant_id}, {"$set": updates})
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "update_merchant_location",
        "target_id": merchant_id,
        "changes": updates,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Merchant location updated"}


@router.post("/merchants/{merchant_id}/reset-password")
async def admin_reset_merchant_password(
    merchant_id: str,
    request: AdminResetPasswordRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Admin: Reset merchant password (Super Admin only)"""
    # Only super admin can reset passwords
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Only super admin can reset passwords")
    
    merchant_doc = await db.merchants.find_one({"id": merchant_id})
    if not merchant_doc:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Hash and update password
    password_hash = bcrypt.hashpw(request.new_password.encode(), bcrypt.gensalt()).decode()
    
    await db.merchants.update_one(
        {"id": merchant_id},
        {"$set": {
            "password_hash": password_hash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log the action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "admin_email": current_admin.get("email"),
        "action": "reset_merchant_password",
        "target_id": merchant_id,
        "target_phone": merchant_doc.get("phone"),
        "target_name": merchant_doc.get("business_name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Password reset successfully for {merchant_doc.get('business_name', 'merchant')}"
    }


@router.post("/merchants/{merchant_id}/send-sms")
async def send_sms_to_merchant(
    merchant_id: str,
    request: SendSMSRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Send SMS to merchant"""
    merchant_doc = await db.merchants.find_one({"id": merchant_id})
    if not merchant_doc:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    phone = merchant_doc.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="Merchant has no phone number")
    
    # Import SMS service
    from services.sms_service import get_sms
    sms = get_sms()
    result = await sms.send_sms(phone, request.message)
    
    # Log the SMS
    await db.sms_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "recipient_type": "merchant",
        "recipient_id": merchant_id,
        "phone": phone,
        "message": request.message,
        "status": "sent" if result.get("success") else "failed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": result.get("success", False), "message": "SMS sent" if result.get("success") else "SMS failed"}


# ============== MERCHANT DEBIT ACCOUNTS (Parameterized routes) ==============

@router.get("/merchants/{merchant_id}/debit-account")
async def get_merchant_debit_account(
    merchant_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Get detailed debit account info for a specific merchant"""
    
    merchant = await db.merchants.find_one({"id": merchant_id}, {"_id": 0, "password_hash": 0})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    debit_account = await db.merchant_debit_accounts.find_one(
        {"merchant_id": merchant_id},
        {"_id": 0}
    )
    
    if not debit_account:
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
        debit_account.pop("_id", None)
    
    # Get ledger history
    ledger = await db.merchant_debit_ledger.find(
        {"merchant_id": merchant_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # Calculate stats
    balance = debit_account.get("balance", 0)
    debit_limit = debit_account.get("debit_limit", 0)
    usage_percentage = 0
    if debit_limit > 0 and balance < 0:
        usage_percentage = min(100, abs(balance) / debit_limit * 100)
    
    return {
        "merchant": merchant,
        "debit_account": debit_account,
        "ledger": ledger,
        "stats": {
            "current_balance": round(balance, 2),
            "debit_limit": round(debit_limit, 2),
            "usage_percentage": round(usage_percentage, 1),
            "available_credit": round(max(0, debit_limit + balance), 2) if debit_limit > 0 else None
        }
    }


@router.put("/merchants/{merchant_id}/debit-settings")
async def update_merchant_debit_settings(
    merchant_id: str,
    request: MerchantDebitSettingsRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update merchant's debit limit and settlement period (Super Admin only)"""
    
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    merchant = await db.merchants.find_one({"id": merchant_id})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    if request.debit_limit < 0:
        raise HTTPException(status_code=400, detail="Debit limit cannot be negative")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update or create debit account
    result = await db.merchant_debit_accounts.update_one(
        {"merchant_id": merchant_id},
        {
            "$set": {
                "debit_limit": request.debit_limit,
                "settlement_days": request.settlement_days,
                "updated_at": now
            },
            "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "merchant_id": merchant_id,
                "balance": 0.0,
                "status": "active",
                "created_at": now
            }
        },
        upsert=True
    )
    
    # Log action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "update_merchant_debit_settings",
        "target_id": merchant_id,
        "changes": {
            "debit_limit": request.debit_limit,
            "settlement_days": request.settlement_days
        },
        "created_at": now
    })
    
    # Send notification to merchant
    try:
        from services.sms_service import get_sms
        sms_service = get_sms()
        if merchant.get("phone"):
            message = f"SDM REWARDS: Your debit limit has been set to GHS {request.debit_limit:.2f}. You can now process cash transactions with cashback."
            await sms_service.send_sms(merchant["phone"], message)
    except Exception as e:
        logger.error(f"Failed to send debit settings SMS: {e}")
    
    return {"success": True, "message": "Debit settings updated"}


@router.post("/merchants/{merchant_id}/debit-adjust")
async def adjust_merchant_debit_balance(
    merchant_id: str,
    request: MerchantDebitAdjustRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Manually adjust merchant's debit balance (Super Admin only)"""
    
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    merchant = await db.merchants.find_one({"id": merchant_id})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Get current account
    debit_account = await db.merchant_debit_accounts.find_one({"merchant_id": merchant_id})
    if not debit_account:
        raise HTTPException(status_code=404, detail="Debit account not found. Please set debit limit first.")
    
    current_balance = debit_account.get("balance", 0)
    new_balance = current_balance + request.amount
    
    # Update balance
    await db.merchant_debit_accounts.update_one(
        {"merchant_id": merchant_id},
        {
            "$inc": {"balance": request.amount},
            "$set": {"updated_at": now}
        }
    )
    
    # Create ledger entry
    ledger_entry = {
        "id": str(uuid.uuid4()),
        "merchant_id": merchant_id,
        "type": "credit" if request.amount > 0 else "debit",
        "amount": abs(request.amount),
        "balance_after": new_balance,
        "reference_type": "admin_adjustment",
        "reference_id": current_admin["id"],
        "description": f"Admin adjustment: {request.description}",
        "created_at": now
    }
    await db.merchant_debit_ledger.insert_one(ledger_entry)
    
    # Log action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "adjust_merchant_debit_balance",
        "target_id": merchant_id,
        "changes": {
            "amount": request.amount,
            "description": request.description,
            "new_balance": new_balance
        },
        "created_at": now
    })
    
    return {
        "success": True,
        "message": f"Balance adjusted by GHS {request.amount:.2f}",
        "new_balance": round(new_balance, 2)
    }


@router.post("/merchants/{merchant_id}/unblock-debit")
async def unblock_merchant_debit_account(
    merchant_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Manually unblock a merchant's debit account (Super Admin only)"""
    
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    merchant = await db.merchants.find_one({"id": merchant_id})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.merchant_debit_accounts.update_one(
        {"merchant_id": merchant_id},
        {"$set": {"status": "active", "updated_at": now}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Debit account not found or already active")
    
    # Log action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "unblock_merchant_debit_account",
        "target_id": merchant_id,
        "created_at": now
    })
    
    # Notify merchant
    try:
        from services.sms_service import get_sms
        sms_service = get_sms()
        if merchant.get("phone"):
            message = f"SDM REWARDS: Your debit account has been unblocked by admin. You can now process cash transactions again."
            await sms_service.send_sms(merchant["phone"], message)
    except Exception as e:
        logger.error(f"Failed to send unblock notification SMS: {e}")
    
    return {"success": True, "message": "Merchant debit account unblocked"}


# ============== TRANSACTIONS ==============

@router.get("/transactions")
async def list_all_transactions(
    limit: int = 50,
    offset: int = 0,
    type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    """List all transactions"""
    query = {}
    
    if type:
        query["type"] = type
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
    
    return {
        "transactions": transactions,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/merchant-payouts")
async def list_merchant_payouts(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    merchant_id: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    """List all merchant payouts (auto-payments to merchants)"""
    query = {}
    
    if status:
        query["status"] = status
    if merchant_id:
        query["merchant_id"] = merchant_id
    
    payouts = await db.merchant_payouts.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    # Enrich with merchant names
    enriched = []
    for payout in payouts:
        merchant = await db.merchants.find_one(
            {"id": payout.get("merchant_id")},
            {"_id": 0, "business_name": 1}
        )
        payout["merchant_name"] = merchant.get("business_name", "Unknown") if merchant else "Unknown"
        enriched.append(payout)
    
    total = await db.merchant_payouts.count_documents(query)
    
    # Calculate totals
    completed_payouts = await db.merchant_payouts.find(
        {"status": "completed"},
        {"_id": 0, "amount": 1}
    ).to_list(100000)
    total_paid = sum(p.get("amount", 0) for p in completed_payouts)
    
    pending_payouts = await db.merchant_payouts.find(
        {"status": "pending"},
        {"_id": 0, "amount": 1}
    ).to_list(100000)
    total_pending = sum(p.get("amount", 0) for p in pending_payouts)
    
    return {
        "payouts": enriched,
        "total": total,
        "limit": limit,
        "offset": offset,
        "summary": {
            "total_paid": round(total_paid, 2),
            "total_pending": round(total_pending, 2)
        }
    }


# ============== PLATFORM SETTINGS ==============

@router.get("/settings")
async def get_platform_settings(current_admin: dict = Depends(get_current_admin)):
    """Get platform configuration"""
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    return {"config": config}


@router.put("/settings/commissions")
async def update_commissions(
    request: UpdateCommissionRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update platform commission settings"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.platform_commission_rate is not None:
        if request.platform_commission_rate < 1 or request.platform_commission_rate > 5:
            raise HTTPException(status_code=400, detail="Commission rate must be 1-5%")
        updates["platform_commission_rate"] = request.platform_commission_rate
    
    if request.usage_commission_type is not None:
        if request.usage_commission_type not in ["percentage", "fixed"]:
            raise HTTPException(status_code=400, detail="Invalid commission type")
        updates["usage_commission_type"] = request.usage_commission_type
    
    if request.usage_commission_rate is not None:
        updates["usage_commission_rate"] = request.usage_commission_rate
    
    await db.platform_config.update_one({"key": "main"}, {"$set": updates})
    
    return {"success": True, "message": "Commission settings updated"}


# ============== DYNAMIC PLATFORM SETTINGS ==============

@router.put("/settings/card-prices")
async def update_card_prices(
    request: UpdateCardPricesRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update membership card prices, benefits, and durations"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    # Prices
    if request.silver_price is not None:
        updates["card_prices.silver"] = request.silver_price
    if request.gold_price is not None:
        updates["card_prices.gold"] = request.gold_price
    if request.platinum_price is not None:
        updates["card_prices.platinum"] = request.platinum_price
    
    # Benefits
    if request.silver_benefits is not None:
        updates["card_benefits.silver"] = request.silver_benefits
    if request.gold_benefits is not None:
        updates["card_benefits.gold"] = request.gold_benefits
    if request.platinum_benefits is not None:
        updates["card_benefits.platinum"] = request.platinum_benefits
    
    # Durations (in days)
    if request.silver_duration is not None:
        updates["card_durations.silver"] = request.silver_duration
    if request.gold_duration is not None:
        updates["card_durations.gold"] = request.gold_duration
    if request.platinum_duration is not None:
        updates["card_durations.platinum"] = request.platinum_duration
    
    # Welcome Bonuses
    if request.silver_welcome_bonus is not None:
        updates["welcome_bonuses.silver"] = request.silver_welcome_bonus
    if request.gold_welcome_bonus is not None:
        updates["welcome_bonuses.gold"] = request.gold_welcome_bonus
    if request.platinum_welcome_bonus is not None:
        updates["welcome_bonuses.platinum"] = request.platinum_welcome_bonus
    
    await db.platform_config.update_one({"key": "main"}, {"$set": updates})
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "update_card_prices",
        "changes": updates,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Card prices updated"}


# ============== DYNAMIC CARD TYPES MANAGEMENT ==============

@router.get("/settings/card-types")
async def get_card_types(current_admin: dict = Depends(get_current_admin)):
    """Get all card types (both default and custom)"""
    
    # Get platform config for default cards
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    
    default_cards = []
    if config:
        card_prices = config.get("card_prices", {})
        card_benefits = config.get("card_benefits", {})
        card_durations = config.get("card_durations", {"silver": 365, "gold": 365, "platinum": 730})
        welcome_bonuses = config.get("welcome_bonuses", {"silver": 1, "gold": 2, "platinum": 3})
        
        for card_type in ["silver", "gold", "platinum"]:
            default_cards.append({
                "id": f"default_{card_type}",
                "slug": card_type,
                "name": card_type.capitalize(),
                "price": card_prices.get(card_type, 0),
                "duration_days": card_durations.get(card_type, 365),
                "benefits": card_benefits.get(card_type, ""),
                "welcome_bonus": welcome_bonuses.get(card_type, 1),
                "color": {"silver": "#94a3b8", "gold": "#f59e0b", "platinum": "#6366f1"}.get(card_type, "#6366f1"),
                "icon": "credit-card",
                "is_default": True,
                "is_active": True,
                "sort_order": {"silver": 1, "gold": 2, "platinum": 3}.get(card_type, 0)
            })
    
    # Get custom card types
    custom_cards = await db.card_types.find(
        {},
        {"_id": 0}
    ).sort("sort_order", 1).to_list(100)
    
    # Mark custom cards
    for card in custom_cards:
        card["is_default"] = False
    
    all_cards = default_cards + custom_cards
    all_cards.sort(key=lambda x: x.get("sort_order", 99))
    
    return {"card_types": all_cards, "total": len(all_cards)}


@router.post("/settings/card-types")
async def create_card_type(
    request: CreateCardTypeRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Create a new custom card type"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    # Check if slug already exists
    existing = await db.card_types.find_one({"slug": request.slug.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Card type with this slug already exists")
    
    # Also check default slugs
    if request.slug.lower() in ["silver", "gold", "platinum"]:
        raise HTTPException(status_code=400, detail="Cannot use reserved card type names")
    
    card_type = {
        "id": str(uuid.uuid4()),
        "slug": request.slug.lower(),
        "name": request.name,
        "price": request.price,
        "duration_days": request.duration_days,
        "benefits": request.benefits,
        "color": request.color or "#6366f1",
        "icon": request.icon or "credit-card",
        "is_active": request.is_active,
        "sort_order": request.sort_order,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.card_types.insert_one(card_type)
    
    # Log action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "create_card_type",
        "details": {"card_name": request.name, "slug": request.slug},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    card_type.pop("_id", None)
    return {"success": True, "card_type": card_type}


@router.put("/settings/card-types/{card_id}")
async def update_card_type(
    card_id: str,
    request: UpdateCardTypeRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update a custom card type"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    # Check if it's a default card
    if card_id.startswith("default_"):
        raise HTTPException(status_code=400, detail="Cannot update default cards via this endpoint. Use /settings/card-prices instead")
    
    card = await db.card_types.find_one({"id": card_id})
    if not card:
        raise HTTPException(status_code=404, detail="Card type not found")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.name is not None:
        updates["name"] = request.name
    if request.price is not None:
        updates["price"] = request.price
    if request.duration_days is not None:
        updates["duration_days"] = request.duration_days
    if request.benefits is not None:
        updates["benefits"] = request.benefits
    if request.color is not None:
        updates["color"] = request.color
    if request.icon is not None:
        updates["icon"] = request.icon
    if request.is_active is not None:
        updates["is_active"] = request.is_active
    if request.sort_order is not None:
        updates["sort_order"] = request.sort_order
    
    await db.card_types.update_one({"id": card_id}, {"$set": updates})
    
    return {"success": True, "message": "Card type updated"}


@router.delete("/settings/card-types/{card_id}")
async def delete_card_type(
    card_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Delete a custom card type"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    if card_id.startswith("default_"):
        raise HTTPException(status_code=400, detail="Cannot delete default card types")
    
    # Check if any clients have this card
    card = await db.card_types.find_one({"id": card_id})
    if not card:
        raise HTTPException(status_code=404, detail="Card type not found")
    
    clients_with_card = await db.clients.count_documents({"card_type": card["slug"]})
    if clients_with_card > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete: {clients_with_card} clients have this card type"
        )
    
    await db.card_types.delete_one({"id": card_id})
    
    # Log action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "delete_card_type",
        "details": {"card_slug": card["slug"], "card_name": card.get("name")},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Card type deleted"}


@router.put("/settings/service-commissions")
async def update_service_commissions(
    request: UpdateServiceCommissionsRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update service commissions (airtime, data, ECG, etc.)"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.airtime_commission_type is not None:
        updates["service_commissions.airtime.type"] = request.airtime_commission_type
    if request.airtime_commission_rate is not None:
        updates["service_commissions.airtime.rate"] = request.airtime_commission_rate
    if request.data_commission_type is not None:
        updates["service_commissions.data.type"] = request.data_commission_type
    if request.data_commission_rate is not None:
        updates["service_commissions.data.rate"] = request.data_commission_rate
    if request.ecg_commission_type is not None:
        updates["service_commissions.ecg.type"] = request.ecg_commission_type
    if request.ecg_commission_rate is not None:
        updates["service_commissions.ecg.rate"] = request.ecg_commission_rate
    if request.merchant_payment_commission_type is not None:
        updates["service_commissions.merchant_payment.type"] = request.merchant_payment_commission_type
    if request.merchant_payment_commission_rate is not None:
        updates["service_commissions.merchant_payment.rate"] = request.merchant_payment_commission_rate
    if request.withdrawal_commission_type is not None:
        updates["service_commissions.withdrawal.type"] = request.withdrawal_commission_type
    if request.withdrawal_commission_rate is not None:
        updates["service_commissions.withdrawal.rate"] = request.withdrawal_commission_rate
    
    await db.platform_config.update_one({"key": "main"}, {"$set": updates})
    
    return {"success": True, "message": "Service commissions updated"}


@router.put("/settings/referral-bonuses")
async def update_referral_bonuses(
    request: UpdateReferralBonusesRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update referral bonus amounts"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.welcome_bonus is not None:
        updates["referral_bonuses.welcome"] = request.welcome_bonus
    if request.referrer_bonus is not None:
        updates["referral_bonuses.referrer"] = request.referrer_bonus
    
    await db.platform_config.update_one({"key": "main"}, {"$set": updates})
    
    return {"success": True, "message": "Referral bonuses updated"}


# ============== MANUAL CLIENT/MERCHANT CREATION ==============

@router.post("/clients/create-manual")
async def create_client_manual(
    request: CreateClientManualRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Manually create a client account"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    # Check for duplicate phone
    existing = await db.clients.find_one({"phone": request.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Check for duplicate username
    existing_username = await db.clients.find_one({"username": request.username.lower()})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Generate temporary password
    temp_password = f"SDM{request.phone[-4:]}"
    password_hash = bcrypt.hashpw(temp_password.encode(), bcrypt.gensalt()).decode()
    
    client_id = str(uuid.uuid4())[:8]
    client_data = {
        "id": client_id,
        "full_name": request.full_name,
        "phone": request.phone,
        "username": request.username.lower(),
        "email": request.email.lower() if request.email else None,
        "password_hash": password_hash,
        "status": "active",
        "card_type": request.card_type,
        "cashback_balance": 0.0,
        "referral_code": f"SDM{client_id.upper()}",
        "created_by_admin": current_admin["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.clients.insert_one(client_data)
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "create_client_manual",
        "target_id": client_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": "Client created successfully",
        "client_id": client_id,
        "temp_password": temp_password
    }


@router.post("/merchants/create-manual")
async def create_merchant_manual(
    request: CreateMerchantManualRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Manually create a merchant account"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    # Check for duplicate phone
    existing = await db.merchants.find_one({"phone": request.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Generate temporary password
    temp_password = f"SDMM{request.phone[-4:]}"
    password_hash = bcrypt.hashpw(temp_password.encode(), bcrypt.gensalt()).decode()
    
    merchant_id = str(uuid.uuid4())[:8]
    merchant_data = {
        "id": merchant_id,
        "business_name": request.business_name,
        "owner_name": request.owner_name,
        "phone": request.phone,
        "email": request.email.lower() if request.email else None,
        "password_hash": password_hash,
        "status": "active",  # Pre-approved by admin
        "cashback_rate": request.cashback_rate,
        "city": request.city,
        "business_address": request.address,
        "google_maps_url": request.google_maps_url,
        "qr_code": f"SDM-MERCHANT-{merchant_id.upper()}",
        "total_transactions": 0,
        "total_revenue": 0,
        "debit_account": {
            "balance": 0,
            "limit": 0,
            "settlement_period_days": 30,
            "is_blocked": False
        },
        "created_by_admin": current_admin["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.merchants.insert_one(merchant_data)
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "create_merchant_manual",
        "target_id": merchant_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": "Merchant created successfully",
        "merchant_id": merchant_id,
        "temp_password": temp_password
    }


# ============== BULK SMS ==============

@router.post("/bulk-sms/clients")
async def send_bulk_sms_clients(
    request: BulkSMSRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Send bulk SMS to clients with filters"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    from services.sms_service import get_sms
    sms_service = get_sms()
    
    # Build query based on filter
    query = {"status": {"$ne": "deleted"}}
    
    if request.recipient_filter == "active":
        query["card_type"] = {"$ne": None}
    elif request.recipient_filter == "inactive":
        query["card_type"] = None
    elif request.recipient_filter == "silver":
        query["card_type"] = "silver"
    elif request.recipient_filter == "gold":
        query["card_type"] = "gold"
    elif request.recipient_filter == "platinum":
        query["card_type"] = "platinum"
    elif request.recipient_filter == "top":
        query = {"status": "active"}
    
    if request.recipient_ids:
        query["id"] = {"$in": request.recipient_ids}
    
    # Get recipients
    if request.recipient_filter == "top":
        clients = await db.clients.find(query, {"_id": 0, "phone": 1, "id": 1, "full_name": 1}).sort("cashback_balance", -1).limit(10).to_list(10)
    else:
        clients = await db.clients.find(query, {"_id": 0, "phone": 1, "id": 1, "full_name": 1}).to_list(10000)
    
    # Collect all phone numbers
    phones = [c.get("phone") for c in clients if c.get("phone")]
    
    if not phones:
        return {"success": False, "error": "No valid recipients found", "total_recipients": 0, "sent": 0, "failed": 0}
    
    # Send bulk SMS in a single API call
    result = await sms_service.send_bulk_sms(phones, request.message, "bulk_clients")
    
    # Log bulk SMS
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "bulk_sms_clients",
        "filter": request.recipient_filter,
        "total_recipients": len(phones),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "campaign_id": result.get("campaign_id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": result.get("success", False),
        "total_recipients": len(phones),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "campaign_id": result.get("campaign_id"),
        "error": result.get("error")
    }


@router.post("/bulk-sms/merchants")
async def send_bulk_sms_merchants(
    request: BulkSMSRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Send bulk SMS to merchants with filters"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    from services.sms_service import get_sms
    sms_service = get_sms()
    
    # Build query based on filter
    query = {"status": {"$ne": "deleted"}}
    
    if request.recipient_filter == "active":
        query["status"] = "active"
    elif request.recipient_filter == "pending":
        query["status"] = "pending"
    elif request.recipient_filter == "inactive":
        query["total_transactions"] = 0
    elif request.recipient_filter == "top":
        query["status"] = "active"
    
    if request.recipient_ids:
        query["id"] = {"$in": request.recipient_ids}
    
    # Get recipients
    if request.recipient_filter == "top":
        merchants = await db.merchants.find(query, {"_id": 0, "phone": 1, "id": 1, "business_name": 1}).sort("total_transactions", -1).limit(10).to_list(10)
    else:
        merchants = await db.merchants.find(query, {"_id": 0, "phone": 1, "id": 1, "business_name": 1}).to_list(10000)
    
    # Collect all phone numbers
    phones = [m.get("phone") for m in merchants if m.get("phone")]
    
    if not phones:
        return {"success": False, "error": "No valid recipients found", "total_recipients": 0, "sent": 0, "failed": 0}
    
    # Send bulk SMS in a single API call
    result = await sms_service.send_bulk_sms(phones, request.message, "bulk_merchants")
    
    # Log bulk SMS
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "bulk_sms_merchants",
        "filter": request.recipient_filter,
        "total_recipients": len(phones),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "campaign_id": result.get("campaign_id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": result.get("success", False),
        "total_recipients": len(phones),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "campaign_id": result.get("campaign_id"),
        "error": result.get("error")
    }


# ============== ADMIN MANAGEMENT ==============

@router.get("/admins")
async def list_admins(current_admin: dict = Depends(get_current_admin)):
    """List all admins (super admin only)"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    admins = await db.admins.find(
        {},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    
    return {"admins": admins}


@router.post("/admins")
async def create_admin(
    request: CreateAdminRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Create new admin (super admin only)"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    # Check duplicate email
    existing = await db.admins.find_one({"email": request.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")
    
    password_hash = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
    
    admin = {
        "id": str(uuid.uuid4()),
        "email": request.email.lower(),
        "password_hash": password_hash,
        "name": request.name,
        "is_super_admin": request.is_super_admin,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.admins.insert_one(admin)
    
    return {
        "success": True,
        "admin": {
            "id": admin["id"],
            "email": admin["email"],
            "name": admin["name"]
        }
    }


# ============== PUSH NOTIFICATIONS ==============

class PushNotificationRequest(BaseModel):
    title: str
    message: str
    segment: str = "All"
    url: Optional[str] = None


@router.post("/push-notifications/send")
async def send_push_notification(
    request: PushNotificationRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Send push notification to all users or a segment"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    from services.push_notification_service import get_push_service
    push_service = get_push_service(db)
    
    if request.segment == "All":
        result = await push_service.send_to_all(request.title, request.message, request.url)
    else:
        result = await push_service.send_to_segment(request.title, request.message, request.segment, request.url)
    
    # Log the action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "send_push_notification",
        "details": {
            "title": request.title,
            "message": request.message,
            "segment": request.segment,
            "recipients": result.get("recipients", 0)
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    if result.get("success"):
        return {
            "success": True,
            "notification_id": result.get("notification_id"),
            "recipients": result.get("recipients", 0),
            "message": f"Push notification sent to {result.get('recipients', 0)} subscribers"
        }
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to send notification"))


@router.get("/push-notifications/history")
async def get_push_notification_history(
    limit: int = 50,
    current_admin: dict = Depends(get_current_admin)
):
    """Get push notification history"""
    from services.push_notification_service import get_push_service
    push_service = get_push_service(db)
    
    history = await push_service.get_notification_history(limit)
    return {"notifications": history, "total": len(history)}


@router.get("/push-notifications/stats")
async def get_push_notification_stats(
    current_admin: dict = Depends(get_current_admin)
):
    """Get OneSignal app statistics"""
    from services.push_notification_service import get_push_service
    push_service = get_push_service(db)
    
    stats = await push_service.get_app_stats()
    return stats


# ============== REVENUE REPORTS ==============

@router.get("/revenue")
async def get_revenue_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    """Get platform revenue report"""
    query = {}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    revenues = await db.platform_revenue.find(query, {"_id": 0}).to_list(10000)
    
    # By type
    by_type = {}
    for r in revenues:
        t = r.get("type", "unknown")
        by_type[t] = by_type.get(t, 0) + r.get("amount", 0)
    
    total = sum(r.get("amount", 0) for r in revenues)
    
    # Card sales revenue
    card_query = {"type": "card_purchase"}
    if start_date:
        card_query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in card_query:
            card_query["created_at"]["$lte"] = end_date
        else:
            card_query["created_at"] = {"$lte": end_date}
    
    card_sales = await db.transactions.find(card_query, {"_id": 0}).to_list(10000)
    card_revenue = sum(t.get("amount", 0) for t in card_sales)
    
    return {
        "total_commission_revenue": total,
        "total_card_revenue": card_revenue,
        "total_revenue": total + card_revenue,
        "by_type": by_type,
        "card_sales_count": len(card_sales)
    }


# ============== PAYMENT LOGOS MANAGEMENT ==============

class PaymentLogoRequest(BaseModel):
    name: str  # e.g., "Visa", "MTN MoMo"
    logo_url: str
    display_order: int = 0
    is_active: bool = True


@router.get("/payment-logos")
async def get_payment_logos(current_admin: dict = Depends(get_current_admin)):
    """Get all payment logos"""
    logos = await db.payment_logos.find({}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return {"logos": logos}


@router.post("/payment-logos")
async def add_payment_logo(request: PaymentLogoRequest, current_admin: dict = Depends(get_current_admin)):
    """Add a new payment logo"""
    logo_data = {
        "id": str(uuid.uuid4()),
        "name": request.name,
        "logo_url": request.logo_url,
        "display_order": request.display_order,
        "is_active": request.is_active,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_admin["id"]
    }
    
    await db.payment_logos.insert_one(logo_data)
    
    return {
        "success": True,
        "message": f"Payment logo '{request.name}' added",
        "logo": {k: v for k, v in logo_data.items() if k != "_id"}
    }


@router.put("/payment-logos/{logo_id}")
async def update_payment_logo(
    logo_id: str,
    request: PaymentLogoRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update a payment logo"""
    logo = await db.payment_logos.find_one({"id": logo_id})
    if not logo:
        raise HTTPException(status_code=404, detail="Logo not found")
    
    await db.payment_logos.update_one(
        {"id": logo_id},
        {"$set": {
            "name": request.name,
            "logo_url": request.logo_url,
            "display_order": request.display_order,
            "is_active": request.is_active,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Payment logo updated"}


@router.delete("/payment-logos/{logo_id}")
async def delete_payment_logo(logo_id: str, current_admin: dict = Depends(get_current_admin)):
    """Delete a payment logo"""
    result = await db.payment_logos.delete_one({"id": logo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Logo not found")
    
    return {"success": True, "message": "Payment logo deleted"}


# Public endpoint - no auth required
@router.get("/payment-logos/public")
async def get_public_payment_logos():
    """Get active payment logos for public display"""
    logos = await db.payment_logos.find(
        {"is_active": True},
        {"_id": 0, "created_by": 0}
    ).sort("display_order", 1).to_list(100)
    return {"logos": logos}



# ============== PHASE 2: SMS ADVANCED FEATURES ==============

@router.get("/sms/history")
async def get_sms_history(
    limit: int = 50,
    current_admin: dict = Depends(get_current_admin)
):
    """Get SMS sending history"""
    logs = await db.sms_logs.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"logs": logs, "total": len(logs)}


@router.get("/sms/templates")
async def get_sms_templates(current_admin: dict = Depends(get_current_admin)):
    """Get all SMS templates"""
    templates = await db.sms_templates.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"templates": templates}


@router.post("/sms/templates")
async def create_sms_template(
    request: SMSTemplateRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Create a new SMS template"""
    template_id = str(uuid.uuid4())[:8]
    
    template_data = {
        "id": template_id,
        "name": request.name,
        "message": request.message,
        "category": request.category,
        "created_by": current_admin["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sms_templates.insert_one(template_data)
    
    return {"success": True, "template_id": template_id}


@router.delete("/sms/templates/{template_id}")
async def delete_sms_template(
    template_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Delete an SMS template"""
    result = await db.sms_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"success": True, "message": "Template deleted"}


@router.post("/sms/schedule")
async def schedule_sms(
    request: BulkSMSRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Schedule SMS for later sending"""
    if not request.scheduled_at:
        raise HTTPException(status_code=400, detail="scheduled_at is required")
    
    schedule_id = str(uuid.uuid4())[:8]
    
    schedule_data = {
        "id": schedule_id,
        "message": request.message,
        "recipient_filter": request.recipient_filter,
        "recipient_type": "clients",  # or merchants
        "recipient_ids": request.recipient_ids,
        "scheduled_at": request.scheduled_at,
        "status": "pending",
        "created_by": current_admin["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.scheduled_sms.insert_one(schedule_data)
    
    return {"success": True, "schedule_id": schedule_id, "scheduled_at": request.scheduled_at}


@router.get("/sms/scheduled")
async def get_scheduled_sms(current_admin: dict = Depends(get_current_admin)):
    """Get all scheduled SMS"""
    scheduled = await db.scheduled_sms.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("scheduled_at", 1).to_list(100)
    
    return {"scheduled": scheduled}


@router.delete("/sms/scheduled/{schedule_id}")
async def cancel_scheduled_sms(
    schedule_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Cancel a scheduled SMS"""
    result = await db.scheduled_sms.update_one(
        {"id": schedule_id, "status": "pending"},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Scheduled SMS not found or already sent")
    
    return {"success": True, "message": "Scheduled SMS cancelled"}


# ============== PHASE 3: SECURITY & ADMIN MANAGEMENT ==============

@router.get("/settings/pin-status")
async def get_pin_status(current_admin: dict = Depends(get_current_admin)):
    """Check if Settings PIN is enabled and if locked"""
    security = await db.settings_security.find_one({"key": "settings_pin"})
    
    is_locked = False
    if security and security.get("locked_until"):
        locked_until = security["locked_until"]
        if isinstance(locked_until, str):
            locked_until = datetime.fromisoformat(locked_until.replace('Z', '+00:00'))
        # Ensure locked_until is timezone-aware
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) < locked_until:
            is_locked = True
    
    return {
        "pin_enabled": security.get("enabled", True) if security else True,
        "is_locked": is_locked
    }


@router.post("/settings/verify-pin")
async def verify_settings_pin(
    request: VerifyPINRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Verify PIN to access Settings (global PIN for all admins)"""
    security = await db.settings_security.find_one({"key": "settings_pin"})
    
    if not security:
        raise HTTPException(status_code=500, detail="Settings PIN not configured")
    
    # Check if locked
    if security.get("locked_until"):
        locked_until = security["locked_until"]
        if isinstance(locked_until, str):
            locked_until = datetime.fromisoformat(locked_until.replace('Z', '+00:00'))
        # Ensure locked_until is timezone-aware
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) < locked_until:
            remaining = int((locked_until - datetime.now(timezone.utc)).total_seconds())
            raise HTTPException(status_code=423, detail=f"Locked. Try again in {remaining} seconds")
    
    # Verify PIN using bcrypt
    try:
        if not bcrypt.checkpw(request.pin.encode(), security["pin_hash"].encode()):
            # Increment failed attempts
            failed = security.get("failed_attempts", 0) + 1
            updates = {"failed_attempts": failed}
            
            if failed >= 3:
                # Lock for 5 minutes
                updates["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=5)
                await db.settings_security.update_one({"key": "settings_pin"}, {"$set": updates})
                raise HTTPException(status_code=423, detail="Too many failed attempts. Locked for 5 minutes")
            
            await db.settings_security.update_one({"key": "settings_pin"}, {"$set": updates})
            raise HTTPException(status_code=401, detail=f"Invalid PIN. {3 - failed} attempts remaining")
    except ValueError:
        # Fallback for passlib hashes
        from passlib.context import CryptContext
        pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        if not pwd_ctx.verify(request.pin, security["pin_hash"]):
            failed = security.get("failed_attempts", 0) + 1
            updates = {"failed_attempts": failed}
            if failed >= 3:
                updates["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=5)
                await db.settings_security.update_one({"key": "settings_pin"}, {"$set": updates})
                raise HTTPException(status_code=423, detail="Too many failed attempts. Locked for 5 minutes")
            await db.settings_security.update_one({"key": "settings_pin"}, {"$set": updates})
            raise HTTPException(status_code=401, detail=f"Invalid PIN. {3 - failed} attempts remaining")
    
    # Reset failed attempts on success
    await db.settings_security.update_one(
        {"key": "settings_pin"},
        {"$set": {"failed_attempts": 0, "locked_until": None}}
    )
    
    return {"success": True, "message": "PIN verified"}


@router.post("/settings/change-pin")
async def change_settings_pin(
    request: SetPINRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Change Settings PIN (Super Admin only - emileparfait2003@gmail.com)"""
    # Only super admin with specific email can change PIN
    admin_email = current_admin.get("email", "").lower()
    is_super = check_is_super_admin(current_admin)
    
    if not is_super or admin_email != "emileparfait2003@gmail.com":
        logger.warning(f"PIN change denied: is_super={is_super}, email={admin_email}, role={current_admin.get('role')}")
        raise HTTPException(status_code=403, detail="Only the Super Admin (emileparfait2003@gmail.com) can change the PIN")
    
    # Validate PIN format
    if not request.pin.isdigit() or len(request.pin) < 4 or len(request.pin) > 6:
        raise HTTPException(status_code=400, detail="PIN must be 4-6 digits")
    
    # Hash the new PIN
    pin_hash = bcrypt.hashpw(request.pin.encode(), bcrypt.gensalt()).decode()
    
    # Update PIN
    await db.settings_security.update_one(
        {"key": "settings_pin"},
        {"$set": {
            "pin_hash": pin_hash,
            "failed_attempts": 0,
            "locked_until": None,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Log action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "settings_pin_changed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Settings PIN changed successfully"}


@router.post("/settings/request-otp")
async def request_password_change_otp(
    current_admin: dict = Depends(get_current_admin)
):
    """Request OTP for password change"""
    from services.sms_service import get_sms
    import random
    
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    
    # Store OTP
    await db.otp_records.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "code": otp_code,
        "purpose": "password_change",
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Get admin phone (if exists)
    admin_doc = await db.admins.find_one({"id": current_admin["id"]})
    phone = admin_doc.get("phone")
    
    if phone:
        # Send via SMS
        sms_service = get_sms()
        message = f"SDM REWARDS: Your password change OTP is {otp_code}. Valid for 10 minutes."
        await sms_service.send_sms(phone, message)
    
    return {
        "success": True,
        "message": "OTP sent",
        "method": "sms" if phone else "displayed",
        "otp_preview": otp_code if not phone else None  # Show OTP if no phone (test mode)
    }


@router.post("/settings/change-password")
async def change_admin_password(
    request: ChangePasswordRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Change admin password with OTP verification"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    # Verify current password
    admin_doc = await db.admins.find_one({"id": current_admin["id"]})
    if not bcrypt.checkpw(request.current_password.encode(), admin_doc["password"].encode()):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Verify OTP
    otp_record = await db.otp_records.find_one({
        "admin_id": current_admin["id"],
        "code": request.otp_code,
        "purpose": "password_change",
        "used": False
    })
    
    if not otp_record:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Check expiry
    if datetime.now(timezone.utc) > datetime.fromisoformat(otp_record["expires_at"]):
        raise HTTPException(status_code=401, detail="OTP expired")
    
    # Mark OTP as used
    await db.otp_records.update_one({"id": otp_record["id"]}, {"$set": {"used": True}})
    
    # Update password
    new_password_hash = bcrypt.hashpw(request.new_password.encode(), bcrypt.gensalt()).decode()
    await db.admins.update_one(
        {"id": current_admin["id"]},
        {"$set": {
            "password": new_password_hash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "password_changed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Password changed successfully"}


# ============== ADMIN ROLE MANAGEMENT ==============

@router.get("/admins")
async def get_all_admins(current_admin: dict = Depends(get_current_admin)):
    """Get all admin accounts (Super Admin only)"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    admins = await db.admins.find(
        {},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    return {"admins": admins, "roles": ADMIN_ROLES}


@router.post("/admins/create")
async def create_admin_with_role(
    request: CreateAdminRoleRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Create a new admin account"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    # Check if email exists
    existing = await db.admins.find_one({"email": request.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    if request.role not in ADMIN_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Create admin
    admin_id = str(uuid.uuid4())[:8]
    password_hash = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
    
    admin_data = {
        "id": admin_id,
        "email": request.email.lower(),
        "password": password_hash,
        "name": request.name,
        "role": request.role,
        "is_super_admin": request.role == "super_admin",
        "is_active": True,
        "permissions": request.permissions or ADMIN_ROLES[request.role]["permissions"],
        "created_by": current_admin["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.admins.insert_one(admin_data)
    
    return {"success": True, "admin_id": admin_id, "message": f"Admin '{request.name}' created"}


@router.put("/admins/{admin_id}")
async def update_admin(
    admin_id: str,
    request: UpdateAdminRoleRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update admin role and permissions"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    # Can't modify own account this way
    if admin_id == current_admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot modify own account")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.role:
        if request.role not in ADMIN_ROLES:
            raise HTTPException(status_code=400, detail="Invalid role")
        updates["role"] = request.role
        updates["is_super_admin"] = request.role == "super_admin"
        updates["permissions"] = ADMIN_ROLES[request.role]["permissions"]
    
    if request.permissions:
        updates["permissions"] = request.permissions
    
    if request.is_active is not None:
        updates["is_active"] = request.is_active
    
    await db.admins.update_one({"id": admin_id}, {"$set": updates})
    
    return {"success": True, "message": "Admin updated"}


@router.delete("/admins/{admin_id}")
async def delete_admin(
    admin_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Delete an admin account"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    # Can't delete own account
    if admin_id == current_admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete own account")
    
    result = await db.admins.delete_one({"id": admin_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    return {"success": True, "message": "Admin deleted"}
