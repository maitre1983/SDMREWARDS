"""
Admin Merchants Router
Handles all merchant management endpoints for admin dashboard
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os

from routers.auth import get_current_admin

# Setup
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/merchants", tags=["Admin - Merchants"])

# Database connection
mongo_client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
db = mongo_client[os.environ.get('DB_NAME', 'sdm_rewards')]


@router.get("")
async def list_merchants(
    page: int = 1,
    limit: int = 20,
    search: str = None,
    status: str = None,
    current_admin: dict = Depends(get_current_admin)
):
    """List all merchants with pagination and filters"""
    skip = (page - 1) * limit
    
    # Build query
    query = {}
    if search:
        query["$or"] = [
            {"business_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"owner_name": {"$regex": search, "$options": "i"}}
        ]
    if status:
        query["status"] = status
    
    # Get merchants
    merchants = await db.merchants.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).skip(skip).limit(limit).sort("created_at", -1).to_list(length=limit)
    
    total = await db.merchants.count_documents(query)
    
    return {
        "merchants": merchants,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/{merchant_id}")
async def get_merchant(
    merchant_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Get detailed merchant info"""
    merchant = await db.merchants.find_one(
        {"id": merchant_id},
        {"_id": 0, "password_hash": 0}
    )
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    return {"merchant": merchant}


@router.put("/{merchant_id}")
async def update_merchant(
    merchant_id: str,
    update_data: dict,
    current_admin: dict = Depends(get_current_admin)
):
    """Update merchant info"""
    # Remove protected fields
    protected = ["id", "password_hash", "created_at", "payment_qr_code", "recruitment_qr_code"]
    for field in protected:
        update_data.pop(field, None)
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.merchants.update_one(
        {"id": merchant_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    updated = await db.merchants.find_one({"id": merchant_id}, {"_id": 0, "password_hash": 0})
    return {"success": True, "merchant": updated}


@router.put("/{merchant_id}/status")
async def update_merchant_status(
    merchant_id: str,
    status: str,
    reason: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    """Update merchant status (active/pending/suspended/rejected)"""
    if status not in ["active", "pending", "suspended", "rejected", "blocked"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if reason:
        update["status_reason"] = reason
        update["status_changed_by"] = current_admin.get("id")
    
    result = await db.merchants.update_one(
        {"id": merchant_id},
        {"$set": update}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    logger.info(f"Admin {current_admin.get('id')} changed merchant {merchant_id} status to {status}")
    
    return {"success": True, "status": status}


@router.post("/{merchant_id}/approve")
async def approve_merchant(
    merchant_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Approve a pending merchant"""
    result = await db.merchants.update_one(
        {"id": merchant_id, "status": "pending"},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Merchant not found or already approved")
    
    return {"success": True, "message": "Merchant approved"}


@router.post("/{merchant_id}/reject")
async def reject_merchant(
    merchant_id: str,
    reason: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    """Reject a pending merchant"""
    update = {
        "status": "rejected",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if reason:
        update["rejection_reason"] = reason
    
    result = await db.merchants.update_one(
        {"id": merchant_id},
        {"$set": update}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    return {"success": True, "message": "Merchant rejected"}


@router.delete("/{merchant_id}")
async def delete_merchant(
    merchant_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Delete a merchant"""
    result = await db.merchants.delete_one({"id": merchant_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    logger.info(f"Admin {current_admin.get('id')} deleted merchant {merchant_id}")
    
    return {"success": True, "message": "Merchant deleted"}


@router.get("/{merchant_id}/transactions")
async def get_merchant_transactions(
    merchant_id: str,
    page: int = 1,
    limit: int = 20,
    current_admin: dict = Depends(get_current_admin)
):
    """Get merchant's transaction history"""
    skip = (page - 1) * limit
    
    transactions = await db.transactions.find(
        {"merchant_id": merchant_id},
        {"_id": 0}
    ).skip(skip).limit(limit).sort("created_at", -1).to_list(length=limit)
    
    total = await db.transactions.count_documents({"merchant_id": merchant_id})
    
    return {
        "transactions": transactions,
        "total": total,
        "page": page,
        "limit": limit
    }


@router.put("/{merchant_id}/location")
async def update_merchant_location(
    merchant_id: str,
    location_url: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Update merchant's Google Maps location"""
    result = await db.merchants.update_one(
        {"id": merchant_id},
        {"$set": {
            "location_url": location_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    return {"success": True, "message": "Location updated"}
