"""
SDM REWARDS - Admin Router
==========================
Admin dashboard, user management, platform settings
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

# Setup
router = APIRouter()
logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ============== REQUEST MODELS ==============

class CreateAdminRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    is_super_admin: bool = False


class UpdateClientRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None


class UpdateClientLimitsRequest(BaseModel):
    withdrawal_limit: Optional[float] = None
    transaction_limit: Optional[float] = None
    daily_limit: Optional[float] = None


class SendSMSRequest(BaseModel):
    message: str


class UpdateMerchantRequest(BaseModel):
    business_name: Optional[str] = None
    owner_name: Optional[str] = None
    status: Optional[str] = None
    cashback_rate: Optional[float] = None
    address: Optional[str] = None
    google_maps_url: Optional[str] = None
    city: Optional[str] = None


class UpdateCommissionRequest(BaseModel):
    platform_commission_rate: Optional[float] = None  # 1-10%
    usage_commission_type: Optional[str] = None  # "percentage" or "fixed"
    usage_commission_rate: Optional[float] = None


class UpdateCardPricesRequest(BaseModel):
    silver_price: Optional[float] = None
    gold_price: Optional[float] = None
    platinum_price: Optional[float] = None
    silver_benefits: Optional[str] = None
    gold_benefits: Optional[str] = None
    platinum_benefits: Optional[str] = None


class UpdateServiceCommissionsRequest(BaseModel):
    airtime_commission_type: Optional[str] = None  # "percentage" or "fixed"
    airtime_commission_rate: Optional[float] = None
    data_commission_type: Optional[str] = None
    data_commission_rate: Optional[float] = None
    ecg_commission_type: Optional[str] = None
    ecg_commission_rate: Optional[float] = None
    merchant_payment_commission_type: Optional[str] = None
    merchant_payment_commission_rate: Optional[float] = None


class UpdateReferralBonusesRequest(BaseModel):
    welcome_bonus: Optional[float] = None
    referrer_bonus: Optional[float] = None


class CreateClientManualRequest(BaseModel):
    full_name: str
    phone: str
    username: str
    email: Optional[str] = None
    card_type: Optional[str] = None


class CreateMerchantManualRequest(BaseModel):
    business_name: str
    owner_name: str
    phone: str
    email: Optional[str] = None
    cashback_rate: float = 5.0
    city: Optional[str] = None
    address: Optional[str] = None


class BulkSMSRequest(BaseModel):
    message: str
    recipient_filter: str  # "all", "active", "inactive", "silver", "gold", "platinum", "pending", "top"
    recipient_ids: Optional[List[str]] = None  # For custom selection
    scheduled_at: Optional[str] = None  # ISO datetime for scheduled SMS
    template_id: Optional[str] = None


# ============== PHASE 2 & 3: ADVANCED FEATURES ==============

class SMSTemplateRequest(BaseModel):
    name: str
    message: str
    category: str = "general"  # general, promotion, notification, reminder


class SetPINRequest(BaseModel):
    pin: str  # 4-6 digits
    otp_code: Optional[str] = None


class VerifyPINRequest(BaseModel):
    pin: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    otp_code: str
    otp_method: str = "sms"  # sms or email


class CreateAdminRoleRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str  # super_admin, admin_support, admin_merchants, admin_finance, admin_readonly
    permissions: Optional[List[str]] = None


class UpdateAdminRoleRequest(BaseModel):
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None


# Admin role definitions
ADMIN_ROLES = {
    "super_admin": {
        "name": "Super Admin",
        "permissions": ["all"]
    },
    "admin_support": {
        "name": "Admin Support",
        "permissions": ["view_clients", "edit_clients", "send_sms_clients", "view_stats"]
    },
    "admin_merchants": {
        "name": "Admin Merchants", 
        "permissions": ["view_merchants", "edit_merchants", "approve_merchants", "send_sms_merchants", "view_stats"]
    },
    "admin_finance": {
        "name": "Admin Finance",
        "permissions": ["view_stats", "view_transactions", "view_commissions"]
    },
    "admin_readonly": {
        "name": "Read-only Admin",
        "permissions": ["view_clients", "view_merchants", "view_stats"]
    }
}


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
    card_sales = await db.transactions.find(
        {"type": "card_purchase"},
        {"_id": 0}
    ).to_list(100000)
    
    # Count by card type
    silver_cards = sum(1 for c in card_sales if c.get("metadata", {}).get("card_type") == "silver")
    gold_cards = sum(1 for c in card_sales if c.get("metadata", {}).get("card_type") == "gold")
    platinum_cards = sum(1 for c in card_sales if c.get("metadata", {}).get("card_type") == "platinum")
    total_cards = len(card_sales)
    
    # ============== 2. REVENUE FROM MEMBERSHIP CARDS ==============
    card_revenue = sum(t.get("amount", 0) for t in card_sales)
    
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
    
    return {
        "card_stats": {
            "silver": silver_cards,
            "gold": gold_cards,
            "platinum": platinum_cards,
            "total": total_cards,
            "revenue": card_revenue
        },
        "financial_stats": {
            "total_gmv": total_gmv,
            "total_cashback_distributed": total_cashback_all,
            "total_card_revenue": card_revenue,
            "total_referral_bonuses": total_referral_bonuses
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
    """Get client details"""
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0, "password_hash": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    
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
    from services.bulkclix_service import send_sms
    
    result = await send_sms(phone, request.message)
    
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
    from services.bulkclix_service import send_sms
    
    result = await send_sms(phone, request.message)
    
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
    if not current_admin.get("is_super_admin"):
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
    """Update membership card prices and benefits"""
    if not current_admin.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.silver_price is not None:
        updates["card_prices.silver"] = request.silver_price
    if request.gold_price is not None:
        updates["card_prices.gold"] = request.gold_price
    if request.platinum_price is not None:
        updates["card_prices.platinum"] = request.platinum_price
    if request.silver_benefits is not None:
        updates["card_benefits.silver"] = request.silver_benefits
    if request.gold_benefits is not None:
        updates["card_benefits.gold"] = request.gold_benefits
    if request.platinum_benefits is not None:
        updates["card_benefits.platinum"] = request.platinum_benefits
    
    await db.platform_config.update_one({"key": "main"}, {"$set": updates})
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "update_card_prices",
        "changes": updates,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Card prices updated"}


@router.put("/settings/service-commissions")
async def update_service_commissions(
    request: UpdateServiceCommissionsRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update service commissions (airtime, data, ECG, etc.)"""
    if not current_admin.get("is_super_admin"):
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
    
    await db.platform_config.update_one({"key": "main"}, {"$set": updates})
    
    return {"success": True, "message": "Service commissions updated"}


@router.put("/settings/referral-bonuses")
async def update_referral_bonuses(
    request: UpdateReferralBonusesRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update referral bonus amounts"""
    if not current_admin.get("is_super_admin"):
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
    if not current_admin.get("is_super_admin"):
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
    if not current_admin.get("is_super_admin"):
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
        "address": request.address,
        "qr_code": f"SDM-MERCHANT-{merchant_id.upper()}",
        "total_transactions": 0,
        "total_revenue": 0,
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
    if not current_admin.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    from services.bulkclix_service import send_sms
    
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
        # Get top 10 clients by cashback balance
        query = {"status": "active"}
    
    if request.recipient_ids:
        query["id"] = {"$in": request.recipient_ids}
    
    # Get recipients
    if request.recipient_filter == "top":
        clients = await db.clients.find(query, {"_id": 0, "phone": 1, "id": 1, "full_name": 1}).sort("cashback_balance", -1).limit(10).to_list(10)
    else:
        clients = await db.clients.find(query, {"_id": 0, "phone": 1, "id": 1, "full_name": 1}).to_list(10000)
    
    sent_count = 0
    failed_count = 0
    
    for client in clients:
        if client.get("phone"):
            result = await send_sms(client["phone"], request.message)
            if result.get("success"):
                sent_count += 1
            else:
                failed_count += 1
    
    # Log bulk SMS
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "bulk_sms_clients",
        "filter": request.recipient_filter,
        "total_recipients": len(clients),
        "sent": sent_count,
        "failed": failed_count,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "total_recipients": len(clients),
        "sent": sent_count,
        "failed": failed_count
    }


@router.post("/bulk-sms/merchants")
async def send_bulk_sms_merchants(
    request: BulkSMSRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Send bulk SMS to merchants with filters"""
    if not current_admin.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    from services.bulkclix_service import send_sms
    
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
    
    sent_count = 0
    failed_count = 0
    
    for merchant in merchants:
        if merchant.get("phone"):
            result = await send_sms(merchant["phone"], request.message)
            if result.get("success"):
                sent_count += 1
            else:
                failed_count += 1
    
    # Log bulk SMS
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "bulk_sms_merchants",
        "filter": request.recipient_filter,
        "total_recipients": len(merchants),
        "sent": sent_count,
        "failed": failed_count,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "total_recipients": len(merchants),
        "sent": sent_count,
        "failed": failed_count
    }


# ============== ADMIN MANAGEMENT ==============

@router.get("/admins")
async def list_admins(current_admin: dict = Depends(get_current_admin)):
    """List all admins (super admin only)"""
    if not current_admin.get("is_super_admin"):
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
    if not current_admin.get("is_super_admin"):
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

@router.post("/settings/set-pin")
async def set_settings_pin(
    request: SetPINRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Set or update PIN for Settings access"""
    if not current_admin.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    # Validate PIN format
    if not request.pin.isdigit() or len(request.pin) < 4 or len(request.pin) > 6:
        raise HTTPException(status_code=400, detail="PIN must be 4-6 digits")
    
    # Hash the PIN
    pin_hash = bcrypt.hashpw(request.pin.encode(), bcrypt.gensalt()).decode()
    
    # Store PIN config
    await db.admin_security.update_one(
        {"admin_id": current_admin["id"]},
        {"$set": {
            "admin_id": current_admin["id"],
            "pin_hash": pin_hash,
            "pin_enabled": True,
            "failed_attempts": 0,
            "locked_until": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "message": "PIN set successfully"}


@router.post("/settings/verify-pin")
async def verify_settings_pin(
    request: VerifyPINRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Verify PIN to access Settings"""
    security = await db.admin_security.find_one({"admin_id": current_admin["id"]})
    
    if not security or not security.get("pin_enabled"):
        return {"success": True, "message": "PIN not enabled"}
    
    # Check if locked
    if security.get("locked_until"):
        locked_until = datetime.fromisoformat(security["locked_until"])
        if datetime.now(timezone.utc) < locked_until:
            remaining = (locked_until - datetime.now(timezone.utc)).seconds
            raise HTTPException(status_code=423, detail=f"Account locked. Try again in {remaining} seconds")
    
    # Verify PIN
    if not bcrypt.checkpw(request.pin.encode(), security["pin_hash"].encode()):
        # Increment failed attempts
        failed = security.get("failed_attempts", 0) + 1
        updates = {"failed_attempts": failed}
        
        if failed >= 3:
            # Lock for 5 minutes
            updates["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
            await db.admin_security.update_one({"admin_id": current_admin["id"]}, {"$set": updates})
            raise HTTPException(status_code=423, detail="Too many failed attempts. Locked for 5 minutes")
        
        await db.admin_security.update_one({"admin_id": current_admin["id"]}, {"$set": updates})
        raise HTTPException(status_code=401, detail=f"Invalid PIN. {3 - failed} attempts remaining")
    
    # Reset failed attempts on success
    await db.admin_security.update_one(
        {"admin_id": current_admin["id"]},
        {"$set": {"failed_attempts": 0, "locked_until": None}}
    )
    
    return {"success": True, "message": "PIN verified"}


@router.get("/settings/pin-status")
async def get_pin_status(current_admin: dict = Depends(get_current_admin)):
    """Check if PIN is enabled for Settings"""
    security = await db.admin_security.find_one({"admin_id": current_admin["id"]})
    
    return {
        "pin_enabled": security.get("pin_enabled", False) if security else False,
        "is_locked": bool(security.get("locked_until")) if security else False
    }


@router.post("/settings/disable-pin")
async def disable_settings_pin(
    request: VerifyPINRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Disable PIN protection (requires current PIN)"""
    if not current_admin.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    security = await db.admin_security.find_one({"admin_id": current_admin["id"]})
    
    if not security or not security.get("pin_enabled"):
        return {"success": True, "message": "PIN already disabled"}
    
    # Verify current PIN
    if not bcrypt.checkpw(request.pin.encode(), security["pin_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    await db.admin_security.update_one(
        {"admin_id": current_admin["id"]},
        {"$set": {"pin_enabled": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "PIN disabled"}


@router.post("/settings/request-otp")
async def request_password_change_otp(
    current_admin: dict = Depends(get_current_admin)
):
    """Request OTP for password change"""
    from services.bulkclix_service import send_sms
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
        message = f"SDM REWARDS: Your password change OTP is {otp_code}. Valid for 10 minutes."
        await send_sms(phone, message)
    
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
    if not current_admin.get("is_super_admin"):
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
    if not current_admin.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    admins = await db.admins.find(
        {},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    return {"admins": admins, "roles": ADMIN_ROLES}


@router.post("/admins/create")
async def create_admin(
    request: CreateAdminRoleRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Create a new admin account"""
    if not current_admin.get("is_super_admin"):
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
    if not current_admin.get("is_super_admin"):
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
    if not current_admin.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    # Can't delete own account
    if admin_id == current_admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete own account")
    
    result = await db.admins.delete_one({"id": admin_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    return {"success": True, "message": "Admin deleted"}
