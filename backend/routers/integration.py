"""
SDM REWARDS - External Integration API
======================================
API endpoints for POS systems and third-party integrations.
Supports API Key and OAuth 2.0 authentication.
"""

import os
import uuid
import secrets
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header, Depends, Request, Query
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integration", tags=["Integration API"])

# Database connection (will be set from server.py)
db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database


def normalize_phone(phone: str) -> str:
    """Normalize phone number to +233 format"""
    phone = phone.replace(" ", "").replace("-", "")
    
    if phone.startswith("+233") and len(phone) == 13:
        return phone
    
    if phone.startswith("+"):
        phone = phone[1:]
    
    if phone.startswith("00"):
        phone = phone[2:]
    
    if phone.startswith("0") and len(phone) == 10:
        return "+233" + phone[1:]
    
    if phone.startswith("233") and len(phone) == 12:
        return "+" + phone
    
    if len(phone) == 9 and phone[0] in "235":
        return "+233" + phone
    
    return "+233" + phone if not phone.startswith("233") else "+" + phone


# ============== MODELS ==============

class APIKeyCreate(BaseModel):
    name: str = Field(..., description="Friendly name for this API key")
    description: Optional[str] = Field(None, description="Optional description")
    allowed_ips: Optional[List[str]] = Field(None, description="IP whitelist (optional)")
    rate_limit: Optional[int] = Field(100, description="Requests per minute limit")


class APIKeyResponse(BaseModel):
    key_id: str
    name: str
    api_key: str
    created_at: str
    expires_at: Optional[str]
    is_active: bool


class AwardPointsRequest(BaseModel):
    customer_phone: str = Field(..., description="Customer phone number (e.g., +233551234567)")
    points: int = Field(..., gt=0, description="Number of points to award")
    transaction_amount: Optional[float] = Field(None, description="Transaction amount in GHS")
    reference: Optional[str] = Field(None, description="External transaction reference")
    description: Optional[str] = Field(None, description="Transaction description")


class RedeemPointsRequest(BaseModel):
    customer_phone: str = Field(..., description="Customer phone number")
    points: int = Field(..., gt=0, description="Number of points to redeem")
    reference: Optional[str] = Field(None, description="External transaction reference")
    description: Optional[str] = Field(None, description="Redemption description")


# ============== AUTHENTICATION ==============

async def verify_api_key(
    x_api_key: str = Header(..., description="API Key for authentication"),
    x_merchant_id: str = Header(..., description="Merchant ID"),
    request: Request = None
) -> dict:
    """Verify API key and return merchant info"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    api_key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()
    
    key_doc = await db.api_keys.find_one({
        "merchant_id": x_merchant_id,
        "key_hash": api_key_hash,
        "is_active": True
    })
    
    if not key_doc:
        logger.warning(f"Invalid API key attempt for merchant {x_merchant_id}")
        raise HTTPException(
            status_code=401,
            detail={"error": True, "code": "INVALID_API_KEY", "message": "Invalid or inactive API key"}
        )
    
    if key_doc.get("expires_at"):
        expires = datetime.fromisoformat(key_doc["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(
                status_code=401,
                detail={"error": True, "code": "API_KEY_EXPIRED", "message": "API key has expired"}
            )
    
    if key_doc.get("allowed_ips") and request:
        client_ip = request.client.host if request.client else None
        if client_ip and client_ip not in key_doc["allowed_ips"]:
            raise HTTPException(
                status_code=403,
                detail={"error": True, "code": "IP_NOT_ALLOWED", "message": "Request from unauthorized IP"}
            )
    
    await db.api_keys.update_one(
        {"_id": key_doc["_id"]},
        {"$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}, "$inc": {"request_count": 1}}
    )
    
    merchant = await db.merchants.find_one({"id": x_merchant_id})
    if not merchant:
        raise HTTPException(status_code=404, detail={"error": True, "code": "MERCHANT_NOT_FOUND", "message": "Merchant not found"})
    
    return {
        "merchant_id": x_merchant_id,
        "merchant_name": merchant.get("business_name"),
        "key_id": key_doc["key_id"],
        "key_name": key_doc["name"]
    }


# ============== API KEY MANAGEMENT ==============

@router.post("/keys/create", response_model=APIKeyResponse)
async def create_api_key(request: APIKeyCreate, authorization: str = Header(...)):
    """Create a new API key for integration. The API key is only shown once!"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    from routers.auth import decode_token
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if payload.get("type") != "merchant":
        raise HTTPException(status_code=403, detail="Only merchants can create API keys")
    
    merchant_id = payload.get("sub")
    
    api_key = f"sdm_live_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    key_id = f"key_{uuid.uuid4().hex[:12]}"
    
    key_doc = {
        "key_id": key_id,
        "merchant_id": merchant_id,
        "name": request.name,
        "description": request.description,
        "key_hash": key_hash,
        "key_prefix": api_key[:15] + "...",
        "allowed_ips": request.allowed_ips,
        "rate_limit": request.rate_limit or 100,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": None,
        "last_used_at": None,
        "request_count": 0
    }
    
    await db.api_keys.insert_one(key_doc)
    logger.info(f"Created API key {key_id} for merchant {merchant_id}")
    
    return {"key_id": key_id, "name": request.name, "api_key": api_key, "created_at": key_doc["created_at"], "expires_at": None, "is_active": True}


@router.get("/keys/list")
async def list_api_keys(authorization: str = Header(...)):
    """List all API keys for the authenticated merchant"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    from routers.auth import decode_token
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    merchant_id = payload.get("sub")
    
    keys = await db.api_keys.find({"merchant_id": merchant_id}, {"_id": 0, "key_hash": 0}).to_list(length=50)
    return {"success": True, "keys": keys, "count": len(keys)}


@router.delete("/keys/{key_id}")
async def revoke_api_key(key_id: str, authorization: str = Header(...)):
    """Revoke an API key"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    from routers.auth import decode_token
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    merchant_id = payload.get("sub")
    
    result = await db.api_keys.update_one(
        {"key_id": key_id, "merchant_id": merchant_id},
        {"$set": {"is_active": False, "revoked_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="API key not found")
    
    return {"success": True, "message": "API key revoked"}


# ============== POINTS OPERATIONS ==============

@router.post("/points/award")
async def award_points(request: AwardPointsRequest, auth: dict = Depends(verify_api_key)):
    """Award points to a customer when they make a purchase."""
    phone = normalize_phone(request.customer_phone)
    
    customer = await db.clients.find_one({"phone": phone})
    if not customer:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "CUSTOMER_NOT_FOUND", "message": f"No customer found with phone {phone}"}
        )
    
    current_points = customer.get("points", 0)
    new_balance = current_points + request.points
    lifetime_points = customer.get("lifetime_points", 0) + request.points
    
    transaction_id = f"txn_{uuid.uuid4().hex[:16]}"
    transaction = {
        "id": transaction_id,
        "client_id": customer["id"],
        "merchant_id": auth["merchant_id"],
        "type": "earn",
        "source": "api_integration",
        "points": request.points,
        "balance_before": current_points,
        "balance_after": new_balance,
        "transaction_amount": request.transaction_amount,
        "external_reference": request.reference,
        "description": request.description or f"Points earned via {auth['merchant_name']}",
        "api_key_id": auth["key_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.clients.update_one(
        {"id": customer["id"]},
        {"$set": {"points": new_balance, "lifetime_points": lifetime_points, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.transactions.insert_one(transaction)
    logger.info(f"Awarded {request.points} points to {phone} via API (merchant: {auth['merchant_id']})")
    
    return {
        "success": True,
        "transaction_id": transaction_id,
        "customer_phone": phone,
        "points_awarded": request.points,
        "new_balance": new_balance,
        "timestamp": transaction["created_at"],
        "reference": request.reference
    }


@router.post("/points/redeem")
async def redeem_points(request: RedeemPointsRequest, auth: dict = Depends(verify_api_key)):
    """Redeem points from a customer's account."""
    phone = normalize_phone(request.customer_phone)
    
    customer = await db.clients.find_one({"phone": phone})
    if not customer:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "CUSTOMER_NOT_FOUND", "message": f"No customer found with phone {phone}"}
        )
    
    current_points = customer.get("points", 0)
    
    if current_points < request.points:
        raise HTTPException(
            status_code=400,
            detail={"error": True, "code": "INSUFFICIENT_POINTS", "message": f"Customer has {current_points} points, cannot redeem {request.points}", "available_points": current_points}
        )
    
    new_balance = current_points - request.points
    
    transaction_id = f"txn_{uuid.uuid4().hex[:16]}"
    transaction = {
        "id": transaction_id,
        "client_id": customer["id"],
        "merchant_id": auth["merchant_id"],
        "type": "redeem",
        "source": "api_integration",
        "points": -request.points,
        "balance_before": current_points,
        "balance_after": new_balance,
        "external_reference": request.reference,
        "description": request.description or f"Points redeemed at {auth['merchant_name']}",
        "api_key_id": auth["key_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.clients.update_one(
        {"id": customer["id"]},
        {"$set": {"points": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.transactions.insert_one(transaction)
    logger.info(f"Redeemed {request.points} points from {phone} via API (merchant: {auth['merchant_id']})")
    
    return {
        "success": True,
        "transaction_id": transaction_id,
        "customer_phone": phone,
        "points_redeemed": request.points,
        "new_balance": new_balance,
        "timestamp": transaction["created_at"],
        "reference": request.reference
    }


@router.get("/customer/balance")
async def get_customer_balance(phone: str = Query(..., description="Customer phone number"), auth: dict = Depends(verify_api_key)):
    """Get customer's current points balance."""
    phone = normalize_phone(phone)
    
    customer = await db.clients.find_one({"phone": phone})
    if not customer:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "CUSTOMER_NOT_FOUND", "message": f"No customer found with phone {phone}"}
        )
    
    return {
        "success": True,
        "customer": {
            "phone": customer["phone"],
            "full_name": customer.get("full_name", ""),
            "current_points": customer.get("points", 0),
            "lifetime_points": customer.get("lifetime_points", 0),
            "tier": customer.get("tier", "Bronze"),
            "member_since": customer.get("created_at", ""),
            "status": customer.get("status", "active")
        }
    }


@router.get("/customer/transactions")
async def get_customer_transactions(
    phone: str = Query(..., description="Customer phone number"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    auth: dict = Depends(verify_api_key)
):
    """Get customer's transaction history."""
    phone = normalize_phone(phone)
    
    customer = await db.clients.find_one({"phone": phone})
    if not customer:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "CUSTOMER_NOT_FOUND", "message": f"No customer found with phone {phone}"}
        )
    
    transactions = await db.transactions.find(
        {"client_id": customer["id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
    
    total = await db.transactions.count_documents({"client_id": customer["id"]})
    
    return {
        "success": True,
        "customer_phone": phone,
        "transactions": transactions,
        "pagination": {"total": total, "limit": limit, "offset": offset, "has_more": offset + limit < total}
    }


@router.get("/merchant/info")
async def get_merchant_info(auth: dict = Depends(verify_api_key)):
    """Get information about the authenticated merchant"""
    merchant = await db.merchants.find_one({"id": auth["merchant_id"]}, {"_id": 0, "password_hash": 0})
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    return {
        "success": True,
        "merchant": {
            "id": merchant.get("id"),
            "business_name": merchant.get("business_name"),
            "business_type": merchant.get("business_type"),
            "phone": merchant.get("phone"),
            "email": merchant.get("email"),
            "status": merchant.get("status"),
            "created_at": merchant.get("created_at")
        }
    }


@router.get("/health")
async def health_check():
    """API health check - no authentication required."""
    return {
        "status": "healthy",
        "service": "SDM Rewards Integration API",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
