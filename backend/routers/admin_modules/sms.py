"""
SDM REWARDS - Admin SMS Routes
==============================
SMS management via Hubtel API - Individual, Category & Bulk SMS
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from routers.auth import get_current_admin
from routers.admin_modules.dependencies import get_db, check_is_super_admin

router = APIRouter()
logger = logging.getLogger(__name__)
db = get_db()


# ============== REQUEST MODELS ==============

class SingleSMSRequest(BaseModel):
    """Request model for sending SMS to a single recipient"""
    phone: str
    message: str
    recipient_type: str = "client"  # client or merchant
    recipient_id: Optional[str] = None


class BulkSMSRequest(BaseModel):
    """Request model for bulk SMS"""
    message: str
    recipient_filter: str = "all"  # all, active, inactive, silver, gold, platinum, pending, top
    recipient_ids: Optional[List[str]] = None  # Specific IDs to send to
    scheduled_at: Optional[str] = None


class SMSTemplateRequest(BaseModel):
    """Request model for SMS templates"""
    name: str
    message: str
    category: str = "general"


class PersonalizedRecipient(BaseModel):
    """A single personalized SMS recipient"""
    phone: str
    message: str


class PersonalizedBulkSMSRequest(BaseModel):
    """Request model for personalized bulk SMS"""
    recipients: List[PersonalizedRecipient]


# ============== INDIVIDUAL SMS ==============

@router.post("/sms/send")
async def send_single_sms(
    request: SingleSMSRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Send SMS to a single client or merchant"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    from services.sms_service import get_sms
    sms_service = get_sms(db)
    
    # Validate phone number
    phone = request.phone
    recipient_name = "Unknown"
    
    # If recipient_id is provided, get the phone from database
    if request.recipient_id:
        if request.recipient_type == "client":
            recipient = await db.clients.find_one({"id": request.recipient_id}, {"_id": 0, "phone": 1, "full_name": 1})
            if recipient:
                phone = recipient.get("phone", phone)
                recipient_name = recipient.get("full_name", "Client")
        elif request.recipient_type == "merchant":
            recipient = await db.merchants.find_one({"id": request.recipient_id}, {"_id": 0, "phone": 1, "business_name": 1})
            if recipient:
                phone = recipient.get("phone", phone)
                recipient_name = recipient.get("business_name", "Merchant")
    
    # Send SMS
    result = await sms_service.send_sms(phone, request.message, "admin_single")
    
    # Log the action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "send_single_sms",
        "recipient_phone": phone,
        "recipient_name": recipient_name,
        "recipient_type": request.recipient_type,
        "message_preview": request.message[:100],
        "success": result.get("success", False),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": result.get("success", False),
        "message_id": result.get("message_id"),
        "phone": phone,
        "recipient_name": recipient_name,
        "error": result.get("error")
    }


# ============== BULK SMS TO CLIENTS ==============

@router.post("/sms/bulk/clients")
async def send_bulk_sms_clients(
    request: BulkSMSRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Send bulk SMS to clients with filters
    
    Filters:
    - all: All clients
    - active: Clients with active cards
    - inactive: Clients without cards
    - silver: Silver card holders
    - gold: Gold card holders
    - platinum: Platinum card holders
    - top: Top 10 clients by cashback balance
    """
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    from services.sms_service import get_sms
    sms_service = get_sms(db)
    
    # Build query based on filter
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
        query["status"] = "active"
    
    # If specific IDs are provided, use those
    if request.recipient_ids:
        query["id"] = {"$in": request.recipient_ids}
    
    # Fetch clients
    if request.recipient_filter == "top":
        clients = await db.clients.find(query, {"_id": 0, "phone": 1, "id": 1, "full_name": 1}).sort("cashback_balance", -1).limit(10).to_list(10)
    else:
        clients = await db.clients.find(query, {"_id": 0, "phone": 1, "id": 1, "full_name": 1}).to_list(10000)
    
    # Collect all phone numbers
    phones = [c.get("phone") for c in clients if c.get("phone")]
    
    if not phones:
        return {
            "success": False, 
            "error": "No valid recipients found", 
            "total_recipients": 0, 
            "sent": 0, 
            "failed": 0
        }
    
    # Send bulk SMS
    result = await sms_service.send_bulk_sms(phones, request.message, "bulk_clients")
    
    # Log the action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "bulk_sms_clients",
        "filter": request.recipient_filter,
        "total_recipients": len(phones),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "bulk_id": result.get("bulk_id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": result.get("success", False),
        "total_recipients": len(phones),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "bulk_id": result.get("bulk_id"),
        "error": result.get("error"),
        "errors": result.get("errors")
    }


# ============== BULK SMS TO MERCHANTS ==============

@router.post("/sms/bulk/merchants")
async def send_bulk_sms_merchants(
    request: BulkSMSRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Send bulk SMS to merchants with filters
    
    Filters:
    - all: All merchants
    - active: Active merchants
    - pending: Pending merchants
    - inactive: Merchants with no transactions
    - top: Top 10 merchants by transaction count
    """
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    from services.sms_service import get_sms
    sms_service = get_sms(db)
    
    # Build query based on filter
    query = {"status": {"$ne": "deleted"}}
    
    if request.recipient_filter == "active":
        query["status"] = "active"
    elif request.recipient_filter == "pending":
        query["status"] = "pending"
    elif request.recipient_filter == "inactive":
        query["total_transactions"] = 0
    elif request.recipient_filter == "top":
        query["status"] = "active"
    
    # If specific IDs are provided, use those
    if request.recipient_ids:
        query["id"] = {"$in": request.recipient_ids}
    
    # Fetch merchants
    if request.recipient_filter == "top":
        merchants = await db.merchants.find(query, {"_id": 0, "phone": 1, "id": 1, "business_name": 1}).sort("total_transactions", -1).limit(10).to_list(10)
    else:
        merchants = await db.merchants.find(query, {"_id": 0, "phone": 1, "id": 1, "business_name": 1}).to_list(10000)
    
    # Collect all phone numbers
    phones = [m.get("phone") for m in merchants if m.get("phone")]
    
    if not phones:
        return {
            "success": False, 
            "error": "No valid recipients found", 
            "total_recipients": 0, 
            "sent": 0, 
            "failed": 0
        }
    
    # Send bulk SMS
    result = await sms_service.send_bulk_sms(phones, request.message, "bulk_merchants")
    
    # Log the action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "bulk_sms_merchants",
        "filter": request.recipient_filter,
        "total_recipients": len(phones),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "bulk_id": result.get("bulk_id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": result.get("success", False),
        "total_recipients": len(phones),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "bulk_id": result.get("bulk_id"),
        "error": result.get("error"),
        "errors": result.get("errors")
    }


# ============== PERSONALIZED BULK SMS ==============

@router.post("/sms/bulk/personalized")
async def send_personalized_bulk_sms(
    request: PersonalizedBulkSMSRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Send personalized SMS to multiple recipients (each gets a unique message).
    
    This uses Hubtel's Batch Personalized API:
    POST https://sms.hubtel.com/v1/messages/batch/personalized/send
    
    Request body example:
    {
        "recipients": [
            {"phone": "0241234567", "message": "Bonjour John, votre cashback est de 50 GHS!"},
            {"phone": "0201234567", "message": "Bonjour Mary, votre cashback est de 25 GHS!"}
        ]
    }
    
    Use cases:
    - Cashback notifications with personalized amounts
    - Birthday greetings with customer names
    - Promotional offers with targeted discounts
    """
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    if not request.recipients:
        raise HTTPException(status_code=400, detail="At least one recipient is required")
    
    if len(request.recipients) > 10000:
        raise HTTPException(status_code=400, detail="Maximum 10,000 recipients per request")
    
    from services.sms_service import get_sms
    sms_service = get_sms(db)
    
    # Convert Pydantic models to dicts for the service
    recipients_data = [
        {"phone": r.phone, "message": r.message}
        for r in request.recipients
        if r.phone and r.message
    ]
    
    if not recipients_data:
        return {
            "success": False,
            "error": "No valid recipients after validation",
            "total_recipients": 0,
            "sent": 0,
            "failed": 0
        }
    
    # Send personalized bulk SMS
    result = await sms_service.send_personalized_bulk_sms(recipients_data, "admin_personalized_bulk")
    
    # Log the action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "personalized_bulk_sms",
        "total_recipients": len(recipients_data),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "bulk_id": result.get("bulk_id"),
        "test_mode": result.get("test_mode", False),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": result.get("success", False),
        "total_recipients": len(recipients_data),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "bulk_id": result.get("bulk_id"),
        "batch_id": result.get("batch_id"),
        "test_mode": result.get("test_mode", False),
        "fallback_used": result.get("fallback_used", False),
        "error": result.get("error"),
        "errors": result.get("errors")
    }


# ============== SMS BY CATEGORY ==============

@router.post("/sms/category/{category}")
async def send_sms_by_category(
    category: str,
    request: BulkSMSRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Send SMS to users by card category
    
    Categories: silver, gold, platinum
    """
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    if category not in ["silver", "gold", "platinum"]:
        raise HTTPException(status_code=400, detail="Invalid category. Use: silver, gold, platinum")
    
    from services.sms_service import get_sms
    sms_service = get_sms(db)
    
    # Get clients by card type
    clients = await db.clients.find(
        {"card_type": category, "status": {"$ne": "deleted"}},
        {"_id": 0, "phone": 1, "full_name": 1}
    ).to_list(10000)
    
    phones = [c.get("phone") for c in clients if c.get("phone")]
    
    if not phones:
        return {
            "success": False,
            "error": f"No {category} card holders found",
            "category": category,
            "total_recipients": 0,
            "sent": 0,
            "failed": 0
        }
    
    # Send bulk SMS
    result = await sms_service.send_bulk_sms(phones, request.message, f"category_{category}")
    
    # Log the action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "sms_by_category",
        "category": category,
        "total_recipients": len(phones),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": result.get("success", False),
        "category": category,
        "total_recipients": len(phones),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "bulk_id": result.get("bulk_id"),
        "error": result.get("error")
    }


# ============== SMS HISTORY & TEMPLATES ==============

@router.get("/sms/history")
async def get_sms_history(
    limit: int = 50,
    sms_type: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    """Get SMS sending history"""
    query = {}
    if sms_type:
        query["type"] = sms_type
    
    logs = await db.sms_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    bulk_logs = await db.bulk_sms_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "individual_sms": logs,
        "bulk_sms": bulk_logs,
        "total_individual": len(logs),
        "total_bulk": len(bulk_logs)
    }


@router.get("/sms/stats")
async def get_sms_stats(current_admin: dict = Depends(get_current_admin)):
    """Get SMS statistics"""
    # Count total SMS sent
    total_sent = await db.sms_logs.count_documents({"status": "sent"})
    total_failed = await db.sms_logs.count_documents({"status": "failed"})
    total_test = await db.sms_logs.count_documents({"status": "sent_test"})
    
    # Bulk SMS stats
    bulk_campaigns = await db.bulk_sms_logs.count_documents({})
    
    # Today's stats
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_sent = await db.sms_logs.count_documents({"status": "sent", "created_at": {"$gte": today}})
    
    return {
        "total_sent": total_sent,
        "total_failed": total_failed,
        "total_test": total_test,
        "bulk_campaigns": bulk_campaigns,
        "today_sent": today_sent,
        "provider": "Hubtel"
    }


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


# ============== SCHEDULED SMS ==============

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


# ============== PUSH NOTIFICATIONS (Keep existing) ==============

@router.post("/push/send")
async def send_push_notification(
    title: str,
    message: str,
    segment: str = "All",
    url: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    """Send push notification to all users or a segment"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    from services.push_notification_service import get_push_service
    push_service = get_push_service(db)
    
    if segment == "All":
        result = await push_service.send_to_all(title, message, url)
    else:
        result = await push_service.send_to_segment(title, message, segment, url)
    
    # Log the action
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "send_push_notification",
        "details": {
            "title": title,
            "message": message,
            "segment": segment,
            "recipients": result.get("recipients", 0)
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    if result.get("success"):
        return {
            "success": True,
            "notification_id": result.get("notification_id"),
            "recipients": result.get("recipients", 0),
            "message": f"Push notification sent to {result.get('recipients', 0)} subscribers"
        }
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to send notification"))


@router.get("/push/history")
async def get_push_notification_history(
    limit: int = 50,
    current_admin: dict = Depends(get_current_admin)
):
    """Get push notification history"""
    from services.push_notification_service import get_push_service
    push_service = get_push_service(db)
    
    history = await push_service.get_notification_history(limit)
    return {"notifications": history, "total": len(history)}


@router.get("/push/stats")
async def get_push_notification_stats(
    current_admin: dict = Depends(get_current_admin)
):
    """Get OneSignal app statistics"""
    from services.push_notification_service import get_push_service
    push_service = get_push_service(db)
    
    stats = await push_service.get_app_stats()
    return stats
