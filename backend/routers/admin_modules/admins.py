"""
SDM REWARDS - Admin Management Routes
=====================================
Admin user accounts and role management endpoints
"""

import uuid
import bcrypt
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends

from routers.auth import get_current_admin
from routers.admin_modules.dependencies import get_db, check_is_super_admin
from routers.admin_modules.models import (
    CreateAdminRequest,
    CreateAdminRoleRequest,
    UpdateAdminRoleRequest,
    SetPINRequest,
    VerifyPINRequest,
    ChangePasswordRequest,
    ADMIN_ROLES
)

router = APIRouter()
logger = logging.getLogger(__name__)
db = get_db()


@router.get("/admins")
async def get_all_admins(current_admin: dict = Depends(get_current_admin)):
    """Get all admin accounts (Super Admin only)"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    admins = await db.admins.find({}, {"_id": 0, "password": 0, "password_hash": 0}).to_list(100)
    return {"admins": admins, "roles": ADMIN_ROLES}


@router.post("/admins")
async def create_admin(
    request: CreateAdminRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Create new admin (super admin only)"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    existing = await db.admins.find_one({"email": request.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")
    
    password_hash = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
    
    admin = {
        "id": str(uuid.uuid4()),
        "email": request.email.lower(),
        "password_hash": password_hash,
        "password": password_hash,
        "name": request.name,
        "is_super_admin": request.is_super_admin,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.admins.insert_one(admin)
    
    return {"success": True, "admin": {"id": admin["id"], "email": admin["email"], "name": admin["name"]}}


@router.post("/admins/create")
async def create_admin_with_role(
    request: CreateAdminRoleRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Create a new admin account with role"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    existing = await db.admins.find_one({"email": request.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if request.role not in ADMIN_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    admin_id = str(uuid.uuid4())[:8]
    password_hash = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
    
    admin_data = {
        "id": admin_id,
        "email": request.email.lower(),
        "password": password_hash,
        "password_hash": password_hash,
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
    
    if admin_id == current_admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete own account")
    
    result = await db.admins.delete_one({"id": admin_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    return {"success": True, "message": "Admin deleted"}


# ============== SECURITY: PIN & PASSWORD ==============

@router.get("/settings/pin-status")
async def get_pin_status(current_admin: dict = Depends(get_current_admin)):
    """Check if Settings PIN is enabled and if locked"""
    security = await db.settings_security.find_one({"key": "settings_pin"})
    
    is_locked = False
    if security and security.get("locked_until"):
        locked_until = security["locked_until"]
        if isinstance(locked_until, str):
            locked_until = datetime.fromisoformat(locked_until.replace('Z', '+00:00'))
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) < locked_until:
            is_locked = True
    
    return {"pin_enabled": security.get("enabled", True) if security else True, "is_locked": is_locked}


@router.post("/settings/verify-pin")
async def verify_settings_pin(
    request: VerifyPINRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Verify PIN to access Settings"""
    security = await db.settings_security.find_one({"key": "settings_pin"})
    
    if not security:
        raise HTTPException(status_code=500, detail="Settings PIN not configured")
    
    if security.get("locked_until"):
        locked_until = security["locked_until"]
        if isinstance(locked_until, str):
            locked_until = datetime.fromisoformat(locked_until.replace('Z', '+00:00'))
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) < locked_until:
            remaining = int((locked_until - datetime.now(timezone.utc)).total_seconds())
            raise HTTPException(status_code=423, detail=f"Locked. Try again in {remaining} seconds")
    
    try:
        if not bcrypt.checkpw(request.pin.encode(), security["pin_hash"].encode()):
            failed = security.get("failed_attempts", 0) + 1
            updates = {"failed_attempts": failed}
            
            if failed >= 3:
                updates["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=5)
                await db.settings_security.update_one({"key": "settings_pin"}, {"$set": updates})
                raise HTTPException(status_code=423, detail="Too many failed attempts. Locked for 5 minutes")
            
            await db.settings_security.update_one({"key": "settings_pin"}, {"$set": updates})
            raise HTTPException(status_code=401, detail=f"Invalid PIN. {3 - failed} attempts remaining")
    except ValueError:
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
    """Change Settings PIN (Super Admin only)"""
    admin_email = current_admin.get("email", "").lower()
    is_super = check_is_super_admin(current_admin)
    
    if not is_super or admin_email != "emileparfait2003@gmail.com":
        raise HTTPException(status_code=403, detail="Only the Super Admin (emileparfait2003@gmail.com) can change the PIN")
    
    if not request.pin.isdigit() or len(request.pin) < 4 or len(request.pin) > 6:
        raise HTTPException(status_code=400, detail="PIN must be 4-6 digits")
    
    pin_hash = bcrypt.hashpw(request.pin.encode(), bcrypt.gensalt()).decode()
    
    await db.settings_security.update_one(
        {"key": "settings_pin"},
        {"$set": {
            "pin_hash": pin_hash,
            "failed_attempts": 0,
            "locked_until": None,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "settings_pin_changed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Settings PIN changed successfully"}


@router.post("/settings/request-otp")
async def request_password_change_otp(current_admin: dict = Depends(get_current_admin)):
    """Request OTP for password change"""
    from services.sms_service import get_sms
    import random
    
    otp_code = str(random.randint(100000, 999999))
    
    await db.otp_records.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "code": otp_code,
        "purpose": "password_change",
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    admin_doc = await db.admins.find_one({"id": current_admin["id"]})
    phone = admin_doc.get("phone")
    
    if phone:
        sms_service = get_sms()
        message = f"SDM REWARDS: Your password change OTP is {otp_code}. Valid for 10 minutes."
        await sms_service.send_sms(phone, message)
    
    return {"success": True, "message": "OTP sent", "method": "sms" if phone else "displayed", "otp_preview": otp_code if not phone else None}


@router.post("/settings/change-password")
async def change_admin_password(
    request: ChangePasswordRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Change admin password with OTP verification"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    admin_doc = await db.admins.find_one({"id": current_admin["id"]})
    password_field = admin_doc.get("password") or admin_doc.get("password_hash")
    
    if not bcrypt.checkpw(request.current_password.encode(), password_field.encode()):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    otp_record = await db.otp_records.find_one({
        "admin_id": current_admin["id"],
        "code": request.otp_code,
        "purpose": "password_change",
        "used": False
    })
    
    if not otp_record:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    if datetime.now(timezone.utc) > datetime.fromisoformat(otp_record["expires_at"]):
        raise HTTPException(status_code=401, detail="OTP expired")
    
    await db.otp_records.update_one({"id": otp_record["id"]}, {"$set": {"used": True}})
    
    new_password_hash = bcrypt.hashpw(request.new_password.encode(), bcrypt.gensalt()).decode()
    await db.admins.update_one(
        {"id": current_admin["id"]},
        {"$set": {
            "password": new_password_hash,
            "password_hash": new_password_hash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "password_changed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Password changed successfully"}
