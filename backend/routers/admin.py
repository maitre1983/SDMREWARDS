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
