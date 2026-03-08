"""
Admin Clients Router
Handles all client management endpoints for admin dashboard
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
router = APIRouter(prefix="/admin/clients", tags=["Admin - Clients"])

# Database connection
mongo_client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
db = mongo_client[os.environ.get('DB_NAME', 'sdm_rewards')]


@router.get("")
async def list_clients(
    page: int = 1,
    limit: int = 20,
    search: str = None,
    status: str = None,
    card_type: str = None,
    current_admin: dict = Depends(get_current_admin)
):
    """List all clients with pagination and filters"""
    skip = (page - 1) * limit
    
    # Build query
    query = {}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    if status:
        query["status"] = status
    if card_type:
        query["card_type"] = card_type
    
    # Get clients
    clients = await db.clients.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).skip(skip).limit(limit).sort("created_at", -1).to_list(length=limit)
    
    total = await db.clients.count_documents(query)
    
    return {
        "clients": clients,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/{client_id}")
async def get_client(
    client_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Get detailed client info"""
    client = await db.clients.find_one(
        {"id": client_id},
        {"_id": 0, "password_hash": 0}
    )
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get transaction stats
    transactions = await db.transactions.find(
        {"client_id": client_id}
    ).to_list(length=1000)
    
    stats = {
        "total_transactions": len(transactions),
        "total_spent": sum(t.get("amount", 0) for t in transactions),
        "total_cashback": sum(t.get("cashback_earned", 0) for t in transactions)
    }
    
    return {"client": client, "stats": stats}


@router.put("/{client_id}")
async def update_client(
    client_id: str,
    update_data: dict,
    current_admin: dict = Depends(get_current_admin)
):
    """Update client info"""
    # Remove protected fields
    protected = ["id", "password_hash", "created_at"]
    for field in protected:
        update_data.pop(field, None)
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.clients.update_one(
        {"id": client_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    updated = await db.clients.find_one({"id": client_id}, {"_id": 0, "password_hash": 0})
    return {"success": True, "client": updated}


@router.put("/{client_id}/status")
async def update_client_status(
    client_id: str,
    status: str,
    reason: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    """Update client status (active/suspended/blocked)"""
    if status not in ["active", "suspended", "blocked"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if reason:
        update["status_reason"] = reason
        update["status_changed_by"] = current_admin.get("id")
    
    result = await db.clients.update_one(
        {"id": client_id},
        {"$set": update}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    logger.info(f"Admin {current_admin.get('id')} changed client {client_id} status to {status}")
    
    return {"success": True, "status": status}


@router.delete("/{client_id}")
async def delete_client(
    client_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Delete a client"""
    result = await db.clients.delete_one({"id": client_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    logger.info(f"Admin {current_admin.get('id')} deleted client {client_id}")
    
    return {"success": True, "message": "Client deleted"}


@router.get("/{client_id}/transactions")
async def get_client_transactions(
    client_id: str,
    page: int = 1,
    limit: int = 20,
    current_admin: dict = Depends(get_current_admin)
):
    """Get client's transaction history"""
    skip = (page - 1) * limit
    
    transactions = await db.transactions.find(
        {"client_id": client_id},
        {"_id": 0}
    ).skip(skip).limit(limit).sort("created_at", -1).to_list(length=limit)
    
    total = await db.transactions.count_documents({"client_id": client_id})
    
    return {
        "transactions": transactions,
        "total": total,
        "page": page,
        "limit": limit
    }
