"""
SDM REWARDS - Admin Merchants Routes
====================================
Merchant management endpoints for admin dashboard
"""

import uuid
import bcrypt
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from routers.auth import get_current_admin
from routers.admin_modules.dependencies import get_db, check_is_super_admin
from routers.admin_modules.models import (
    UpdateMerchantRequest,
    SendSMSRequest,
    AdminResetPasswordRequest,
    CreateMerchantManualRequest
)

router = APIRouter()
logger = logging.getLogger(__name__)
db = get_db()


class StatusActionRequest(BaseModel):
    action: str


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
    
    transactions = await db.transactions.find(
        {"merchant_id": merchant_id}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {"merchant": merchant, "transactions": transactions}


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
    action_map = {"activate": "active", "approve": "active", "suspend": "suspended", "delete": "deleted"}
    
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
    
    transactions = await db.transactions.find(
        {"merchant_id": merchant_id, "type": "payment"}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    unique_clients = set()
    for t in transactions:
        if t.get("client_id"):
            unique_clients.add(t["client_id"])
    
    total_volume = sum(t.get("amount", 0) for t in transactions)
    total_cashback = sum(t.get("cashback_amount", 0) for t in transactions)
    
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
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Only super admin can reset passwords")
    
    merchant_doc = await db.merchants.find_one({"id": merchant_id})
    if not merchant_doc:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    password_hash = bcrypt.hashpw(request.new_password.encode(), bcrypt.gensalt()).decode()
    
    await db.merchants.update_one(
        {"id": merchant_id},
        {"$set": {"password_hash": password_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
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
    
    return {"success": True, "message": f"Password reset successfully for {merchant_doc.get('business_name', 'merchant')}"}


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
    
    from services.sms_service import get_sms
    sms = get_sms()
    result = await sms.send_sms(phone, request.message)
    
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


@router.post("/merchants/create-manual")
async def create_merchant_manual(
    request: CreateMerchantManualRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Create merchant manually (admin only)"""
    existing = await db.merchants.find_one({"phone": request.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    import random
    import string
    qr_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
    
    merchant_data = {
        "id": str(uuid.uuid4()),
        "phone": request.phone,
        "business_name": request.business_name,
        "owner_name": request.owner_name,
        "email": request.email.lower() if request.email else None,
        "password_hash": bcrypt.hashpw("000000".encode(), bcrypt.gensalt()).decode(),
        "cashback_rate": request.cashback_rate,
        "city": request.city,
        "address": request.address,
        "google_maps_url": request.google_maps_url,
        "payment_qr_code": qr_code,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "admin"
    }
    
    await db.merchants.insert_one(merchant_data)
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "create_merchant_manual",
        "target_id": merchant_data["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Merchant created", "merchant_id": merchant_data["id"]}
