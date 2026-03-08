"""
Admin Settings Router
Handles all settings management endpoints for admin dashboard
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import logging
import uuid
from typing import Optional
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
import os

from routers.auth import get_current_admin

# Setup
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/settings", tags=["Admin - Settings"])

# Database connection
mongo_client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
db = mongo_client[os.environ.get('DB_NAME', 'sdm_rewards')]


# ============== MODELS ==============
class CardTypeCreate(BaseModel):
    name: str
    price: float
    benefits: list = []
    color: str = "#FFD700"
    welcome_bonus: float = 1.0


class CardTypeUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    benefits: Optional[list] = None
    color: Optional[str] = None
    welcome_bonus: Optional[float] = None
    is_active: Optional[bool] = None


class CommissionsUpdate(BaseModel):
    platform_commission: Optional[float] = None
    referral_bonus_referrer: Optional[float] = None
    referral_bonus_referred: Optional[float] = None


class ServiceCommissionsUpdate(BaseModel):
    airtime_fee: Optional[float] = None
    data_bundle_fee: Optional[float] = None
    ecg_fee: Optional[float] = None
    withdrawal_fee: Optional[float] = None


# ============== SETTINGS ENDPOINTS ==============

@router.get("")
async def get_settings(current_admin: dict = Depends(get_current_admin)):
    """Get all admin settings"""
    settings = await db.settings.find_one({"type": "global"}, {"_id": 0})
    
    if not settings:
        # Return defaults
        settings = {
            "type": "global",
            "platform_commission": 5,
            "referral_bonus_referrer": 1,
            "referral_bonus_referred": 0.5,
            "airtime_fee": 2,
            "data_bundle_fee": 3,
            "ecg_fee": 2,
            "withdrawal_fee": 1,
            "min_withdrawal": 5,
            "max_withdrawal": 1000
        }
    
    return {"settings": settings}


@router.put("/commissions")
async def update_commissions(
    data: CommissionsUpdate,
    current_admin: dict = Depends(get_current_admin)
):
    """Update commission settings"""
    update = {k: v for k, v in data.dict().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["updated_by"] = current_admin.get("id")
    
    await db.settings.update_one(
        {"type": "global"},
        {"$set": update},
        upsert=True
    )
    
    return {"success": True, "message": "Commissions updated"}


@router.put("/service-commissions")
async def update_service_commissions(
    data: ServiceCommissionsUpdate,
    current_admin: dict = Depends(get_current_admin)
):
    """Update service fee settings"""
    update = {k: v for k, v in data.dict().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["updated_by"] = current_admin.get("id")
    
    await db.settings.update_one(
        {"type": "global"},
        {"$set": update},
        upsert=True
    )
    
    return {"success": True, "message": "Service commissions updated"}


# ============== CARD TYPES ENDPOINTS ==============

@router.get("/card-types")
async def get_card_types(current_admin: dict = Depends(get_current_admin)):
    """Get all card types"""
    cards = await db.card_types.find(
        {},
        {"_id": 0}
    ).sort("price", 1).to_list(length=100)
    
    return {"card_types": cards}


@router.post("/card-types")
async def create_card_type(
    data: CardTypeCreate,
    current_admin: dict = Depends(get_current_admin)
):
    """Create a new card type"""
    # Check for duplicate name
    existing = await db.card_types.find_one({"name": {"$regex": f"^{data.name}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Card type with this name already exists")
    
    card = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "price": data.price,
        "benefits": data.benefits,
        "color": data.color,
        "welcome_bonus": data.welcome_bonus,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.card_types.insert_one(card)
    card.pop("_id", None)
    
    logger.info(f"Admin {current_admin.get('id')} created card type: {data.name}")
    
    return {"success": True, "card_type": card}


@router.put("/card-types/{card_id}")
async def update_card_type(
    card_id: str,
    data: CardTypeUpdate,
    current_admin: dict = Depends(get_current_admin)
):
    """Update a card type"""
    update = {k: v for k, v in data.dict().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.card_types.update_one(
        {"id": card_id},
        {"$set": update}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Card type not found")
    
    updated = await db.card_types.find_one({"id": card_id}, {"_id": 0})
    return {"success": True, "card_type": updated}


@router.delete("/card-types/{card_id}")
async def delete_card_type(
    card_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Delete a card type"""
    # Check if any clients use this card type
    card = await db.card_types.find_one({"id": card_id})
    if not card:
        raise HTTPException(status_code=404, detail="Card type not found")
    
    clients_count = await db.clients.count_documents({"card_type": card.get("name", "").lower()})
    if clients_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete: {clients_count} clients have this card type"
        )
    
    await db.card_types.delete_one({"id": card_id})
    
    logger.info(f"Admin {current_admin.get('id')} deleted card type: {card.get('name')}")
    
    return {"success": True, "message": "Card type deleted"}


# ============== REFERRAL BONUSES ==============

@router.put("/referral-bonuses")
async def update_referral_bonuses(
    referrer_bonus: float,
    referred_bonus: float,
    current_admin: dict = Depends(get_current_admin)
):
    """Update referral bonus settings"""
    await db.settings.update_one(
        {"type": "global"},
        {"$set": {
            "referral_bonus_referrer": referrer_bonus,
            "referral_bonus_referred": referred_bonus,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_admin.get("id")
        }},
        upsert=True
    )
    
    return {
        "success": True,
        "referrer_bonus": referrer_bonus,
        "referred_bonus": referred_bonus
    }
