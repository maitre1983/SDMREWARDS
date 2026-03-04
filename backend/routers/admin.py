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


class UpdateMerchantRequest(BaseModel):
    business_name: Optional[str] = None
    owner_name: Optional[str] = None
    status: Optional[str] = None
    cashback_rate: Optional[float] = None


class UpdateCommissionRequest(BaseModel):
    platform_commission_rate: Optional[float] = None  # 1-5%
    usage_commission_type: Optional[str] = None  # "percentage" or "fixed"
    usage_commission_rate: Optional[float] = None


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
