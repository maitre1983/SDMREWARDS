"""
SDM REWARDS - Admin SMS Routes
==============================
Bulk SMS, templates, and scheduling endpoints
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends

from routers.auth import get_current_admin
from routers.admin_modules.dependencies import get_db, check_is_super_admin
from routers.admin_modules.models import BulkSMSRequest, SMSTemplateRequest

router = APIRouter()
logger = logging.getLogger(__name__)
db = get_db()


@router.post("/bulk-sms/clients")
async def send_bulk_sms_clients(
    request: BulkSMSRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Send bulk SMS to clients with filters"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    from services.sms_service import get_sms
    sms_service = get_sms()
    
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
        query = {"status": "active"}
    
    if request.recipient_ids:
        query["id"] = {"$in": request.recipient_ids}
    
    if request.recipient_filter == "top":
        clients = await db.clients.find(query, {"_id": 0, "phone": 1, "id": 1, "full_name": 1}).sort("cashback_balance", -1).limit(10).to_list(10)
    else:
        clients = await db.clients.find(query, {"_id": 0, "phone": 1, "id": 1, "full_name": 1}).to_list(10000)
    
    sent_count = 0
    failed_count = 0
    
    for client in clients:
        if client.get("phone"):
            result = await sms_service.send_sms(client["phone"], request.message)
            if result.get("success"):
                sent_count += 1
            else:
                failed_count += 1
    
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
    
    return {"success": True, "total_recipients": len(clients), "sent": sent_count, "failed": failed_count}


@router.post("/bulk-sms/merchants")
async def send_bulk_sms_merchants(
    request: BulkSMSRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Send bulk SMS to merchants with filters"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    from services.sms_service import get_sms
    sms_service = get_sms()
    
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
    
    if request.recipient_filter == "top":
        merchants = await db.merchants.find(query, {"_id": 0, "phone": 1, "id": 1, "business_name": 1}).sort("total_transactions", -1).limit(10).to_list(10)
    else:
        merchants = await db.merchants.find(query, {"_id": 0, "phone": 1, "id": 1, "business_name": 1}).to_list(10000)
    
    sent_count = 0
    failed_count = 0
    
    for merchant in merchants:
        if merchant.get("phone"):
            result = await sms_service.send_sms(merchant["phone"], request.message)
            if result.get("success"):
                sent_count += 1
            else:
                failed_count += 1
    
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
    
    return {"success": True, "total_recipients": len(merchants), "sent": sent_count, "failed": failed_count}


@router.get("/sms/history")
async def get_sms_history(
    limit: int = 50,
    current_admin: dict = Depends(get_current_admin)
):
    """Get SMS sending history"""
    logs = await db.sms_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"logs": logs, "total": len(logs)}


@router.get("/sms/templates")
async def get_sms_templates(current_admin: dict = Depends(get_current_admin)):
    """Get all SMS templates"""
    templates = await db.sms_templates.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
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
        "recipient_type": "clients",
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
    scheduled = await db.scheduled_sms.find({"status": "pending"}, {"_id": 0}).sort("scheduled_at", 1).to_list(100)
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
