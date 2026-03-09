"""
SDM REWARDS - Admin Clients Routes
==================================
Client management endpoints for admin dashboard
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
    UpdateClientRequest,
    UpdateClientLimitsRequest,
    SendSMSRequest,
    AdminResetPasswordRequest,
    CreateClientManualRequest
)

router = APIRouter()
logger = logging.getLogger(__name__)
db = get_db()


class StatusActionRequest(BaseModel):
    action: str  # "activate", "suspend", "delete"


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
            card_validity = {
                "status": "active",
                "is_active": True,
                "purchased_at": purchased_at,
                "expires_at": None,
                "days_remaining": None,
                "duration_days": None
            }
    
    transactions = await db.transactions.find(
        {"client_id": client_id}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    referrals = await db.referrals.find(
        {"referrer_id": client_id}, {"_id": 0}
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


@router.put("/clients/{client_id}/status")
async def update_client_status(
    client_id: str,
    request: StatusActionRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update client status via action"""
    action_map = {"activate": "active", "suspend": "suspended", "delete": "deleted"}
    
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
    
    transactions = await db.transactions.find(
        {"client_id": client_id}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    cashback_received = sum(t.get("cashback_amount", 0) for t in transactions if t.get("type") == "payment")
    cashback_received += sum(t.get("amount", 0) for t in transactions if t.get("type") in ["referral_bonus", "welcome_bonus"])
    cashback_spent = sum(t.get("amount", 0) for t in transactions if t.get("type") in ["airtime", "data", "withdrawal"])
    payments_made = sum(t.get("amount", 0) for t in transactions if t.get("type") == "payment")
    
    referrals = await db.referrals.find({"referrer_id": client_id}, {"_id": 0}).to_list(100)
    
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
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Only super admin can reset passwords")
    
    client_doc = await db.clients.find_one({"id": client_id})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    password_hash = bcrypt.hashpw(request.new_password.encode(), bcrypt.gensalt()).decode()
    
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"password_hash": password_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
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
    
    return {"success": True, "message": f"Password reset successfully for {client_doc.get('full_name', 'client')}"}


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
    
    from services.sms_service import get_sms
    sms = get_sms()
    result = await sms.send_sms(phone, request.message)
    
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


@router.post("/clients/create-manual")
async def create_client_manual(
    request: CreateClientManualRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Create client manually (admin only)"""
    # Check if phone already exists
    existing = await db.clients.find_one({"phone": request.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Check username
    existing_username = await db.clients.find_one({"username": request.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Generate referral code
    import random
    import string
    referral_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    client_data = {
        "id": str(uuid.uuid4()),
        "phone": request.phone,
        "username": request.username,
        "full_name": request.full_name,
        "email": request.email.lower() if request.email else None,
        "password_hash": bcrypt.hashpw("000000".encode(), bcrypt.gensalt()).decode(),
        "referral_code": referral_code,
        "cashback_balance": 0,
        "status": "active",
        "card_type": request.card_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "admin"
    }
    
    await db.clients.insert_one(client_data)
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "create_client_manual",
        "target_id": client_data["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Client created", "client_id": client_data["id"]}
