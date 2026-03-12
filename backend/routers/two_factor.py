"""
SDM REWARDS - Two-Factor Authentication Router
==============================================
API endpoints for 2FA setup, verification, and management.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter
from slowapi.util import get_remote_address

from routers.auth import get_current_client, get_current_merchant, get_current_admin
from services.two_factor_service import get_2fa_service

# Setup
router = APIRouter()
logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ============== REQUEST MODELS ==============

class Setup2FARequest(BaseModel):
    """Request to initiate 2FA setup."""
    pass  # No additional data needed


class Verify2FARequest(BaseModel):
    """Request to verify 2FA code."""
    code: str


class Disable2FARequest(BaseModel):
    """Request to disable 2FA."""
    code: str  # Requires current 2FA code to disable


class AdminDisable2FARequest(BaseModel):
    """Admin request to disable user's 2FA."""
    user_id: str
    user_type: str  # 'client', 'merchant', 'admin'
    reason: Optional[str] = None


class Login2FAVerifyRequest(BaseModel):
    """Request to verify 2FA during login."""
    user_id: str
    user_type: str
    code: str


# ============== CLIENT 2FA ENDPOINTS ==============

@router.post("/client/setup")
async def setup_client_2fa(
    request: Setup2FARequest,
    current_client: dict = Depends(get_current_client)
):
    """
    Initialize 2FA setup for a client.
    Returns QR code URI and backup codes.
    """
    service = get_2fa_service(db)
    
    # Check if already enabled
    status = await service.get_2fa_status(current_client["id"], "client")
    if status.get("enabled"):
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    
    result = await service.setup_2fa(
        user_id=current_client["id"],
        user_type="client",
        user_identifier=current_client.get("phone", current_client.get("email"))
    )
    
    return {
        "success": True,
        **result
    }


@router.post("/client/verify-setup")
async def verify_client_2fa_setup(
    request: Verify2FARequest,
    current_client: dict = Depends(get_current_client)
):
    """
    Verify and enable 2FA for client after scanning QR code.
    """
    service = get_2fa_service(db)
    
    success, message = await service.verify_and_enable_2fa(
        user_id=current_client["id"],
        user_type="client",
        code=request.code
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}


@router.post("/client/disable")
async def disable_client_2fa(
    request: Disable2FARequest,
    current_client: dict = Depends(get_current_client)
):
    """
    Disable 2FA for client (requires current 2FA code).
    """
    service = get_2fa_service(db)
    
    # Verify current 2FA code first
    verified, _ = await service.verify_2fa_login(
        user_id=current_client["id"],
        user_type="client",
        code=request.code
    )
    
    if not verified:
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
    
    success, message = await service.disable_2fa(
        user_id=current_client["id"],
        user_type="client"
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}


@router.get("/client/status")
async def get_client_2fa_status(current_client: dict = Depends(get_current_client)):
    """Get 2FA status for current client."""
    service = get_2fa_service(db)
    status = await service.get_2fa_status(current_client["id"], "client")
    return {"success": True, **status}


@router.post("/client/backup-codes/regenerate")
async def regenerate_client_backup_codes(
    request: Verify2FARequest,
    current_client: dict = Depends(get_current_client)
):
    """
    Generate new backup codes (requires 2FA verification).
    Old backup codes will be invalidated.
    """
    service = get_2fa_service(db)
    
    # Verify current 2FA code first
    verified, _ = await service.verify_2fa_login(
        user_id=current_client["id"],
        user_type="client",
        code=request.code
    )
    
    if not verified:
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
    
    success, codes, message = await service.regenerate_backup_codes(
        user_id=current_client["id"],
        user_type="client"
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "success": True,
        "backup_codes": codes,
        "message": "Save these codes securely. They can only be viewed once."
    }


# ============== MERCHANT 2FA ENDPOINTS ==============

@router.post("/merchant/setup")
async def setup_merchant_2fa(
    request: Setup2FARequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Initialize 2FA setup for a merchant."""
    service = get_2fa_service(db)
    
    status = await service.get_2fa_status(current_merchant["id"], "merchant")
    if status.get("enabled"):
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    
    result = await service.setup_2fa(
        user_id=current_merchant["id"],
        user_type="merchant",
        user_identifier=current_merchant.get("phone", current_merchant.get("email"))
    )
    
    return {"success": True, **result}


@router.post("/merchant/verify-setup")
async def verify_merchant_2fa_setup(
    request: Verify2FARequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Verify and enable 2FA for merchant."""
    service = get_2fa_service(db)
    
    success, message = await service.verify_and_enable_2fa(
        user_id=current_merchant["id"],
        user_type="merchant",
        code=request.code
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}


@router.post("/merchant/disable")
async def disable_merchant_2fa(
    request: Disable2FARequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Disable 2FA for merchant."""
    service = get_2fa_service(db)
    
    verified, _ = await service.verify_2fa_login(
        user_id=current_merchant["id"],
        user_type="merchant",
        code=request.code
    )
    
    if not verified:
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
    
    success, message = await service.disable_2fa(
        user_id=current_merchant["id"],
        user_type="merchant"
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}


@router.get("/merchant/status")
async def get_merchant_2fa_status(current_merchant: dict = Depends(get_current_merchant)):
    """Get 2FA status for current merchant."""
    service = get_2fa_service(db)
    status = await service.get_2fa_status(current_merchant["id"], "merchant")
    return {"success": True, **status}


# ============== ADMIN 2FA ENDPOINTS ==============

@router.post("/admin/setup")
async def setup_admin_2fa(
    request: Setup2FARequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Initialize 2FA setup for an admin."""
    service = get_2fa_service(db)
    
    status = await service.get_2fa_status(current_admin["id"], "admin")
    if status.get("enabled"):
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    
    result = await service.setup_2fa(
        user_id=current_admin["id"],
        user_type="admin",
        user_identifier=current_admin.get("email")
    )
    
    return {"success": True, **result}


@router.post("/admin/verify-setup")
async def verify_admin_2fa_setup(
    request: Verify2FARequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Verify and enable 2FA for admin."""
    service = get_2fa_service(db)
    
    success, message = await service.verify_and_enable_2fa(
        user_id=current_admin["id"],
        user_type="admin",
        code=request.code
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}


@router.post("/admin/disable")
async def disable_admin_2fa(
    request: Disable2FARequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Disable 2FA for admin."""
    service = get_2fa_service(db)
    
    verified, _ = await service.verify_2fa_login(
        user_id=current_admin["id"],
        user_type="admin",
        code=request.code
    )
    
    if not verified:
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
    
    success, message = await service.disable_2fa(
        user_id=current_admin["id"],
        user_type="admin"
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}


@router.get("/admin/status")
async def get_admin_2fa_status(current_admin: dict = Depends(get_current_admin)):
    """Get 2FA status for current admin."""
    service = get_2fa_service(db)
    status = await service.get_2fa_status(current_admin["id"], "admin")
    return {"success": True, **status}


# ============== ADMIN MANAGEMENT ENDPOINTS ==============

@router.get("/admin/users-list")
async def list_2fa_users(
    user_type: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Admin: List all users with 2FA enabled.
    Optional filter by user_type: 'client', 'merchant', 'admin'
    """
    service = get_2fa_service(db)
    
    # Map user_type to collection name
    type_map = {"client": "clients", "merchant": "merchants", "admin": "admins"}
    collection_type = type_map.get(user_type) if user_type else None
    
    users = await service.admin_list_2fa_users(collection_type)
    
    return {
        "success": True,
        "users": users,
        "total": len(users)
    }


@router.post("/admin/disable-user")
async def admin_disable_user_2fa(
    request: AdminDisable2FARequest,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Admin: Disable 2FA for any user.
    This is an administrative override - no 2FA code required from the user.
    """
    service = get_2fa_service(db)
    
    # Log this action
    logger.warning(
        f"Admin {current_admin['id']} ({current_admin.get('email')}) "
        f"disabling 2FA for {request.user_type} {request.user_id}. "
        f"Reason: {request.reason or 'Not specified'}"
    )
    
    success, message = await service.disable_2fa(
        user_id=request.user_id,
        user_type=request.user_type,
        disabled_by=current_admin["id"]
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    # Log to audit trail
    await db.audit_logs.insert_one({
        "action": "2fa_disabled_by_admin",
        "admin_id": current_admin["id"],
        "admin_email": current_admin.get("email"),
        "target_user_id": request.user_id,
        "target_user_type": request.user_type,
        "reason": request.reason,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": f"2FA disabled for {request.user_type} {request.user_id}"}


# ============== LOGIN VERIFICATION ENDPOINT ==============

@router.post("/verify-login")
@limiter.limit("10/minute")
async def verify_2fa_login(
    request: Request,
    verify_request: Login2FAVerifyRequest
):
    """
    Verify 2FA code during login process.
    This is called after initial password verification if 2FA is enabled.
    """
    service = get_2fa_service(db)
    
    success, message = await service.verify_2fa_login(
        user_id=verify_request.user_id,
        user_type=verify_request.user_type,
        code=verify_request.code
    )
    
    if not success:
        raise HTTPException(status_code=401, detail=message)
    
    return {"success": True, "message": message}


# ============== PUBLIC STATUS CHECK ==============

@router.get("/check/{user_type}/{user_id}")
async def check_2fa_required(user_type: str, user_id: str):
    """
    Check if 2FA is required for a user (called during login).
    Returns only whether 2FA is enabled, not any sensitive data.
    """
    if user_type not in ["client", "merchant", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    service = get_2fa_service(db)
    status = await service.get_2fa_status(user_id, user_type)
    
    return {
        "two_factor_required": status.get("enabled", False)
    }
