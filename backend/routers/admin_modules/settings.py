"""
SDM REWARDS - Admin Settings Routes
===================================
Platform settings and configuration endpoints
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Any, Dict

from fastapi import APIRouter, HTTPException, Depends, Body

from routers.auth import get_current_admin
from routers.admin_modules.dependencies import get_db, check_is_super_admin
from routers.admin_modules.models import (
    UpdateCommissionRequest,
    UpdateCardPricesRequest,
    CreateCardTypeRequest,
    UpdateCardTypeRequest,
    UpdateServiceCommissionsRequest,
    UpdateReferralBonusesRequest
)

router = APIRouter()
logger = logging.getLogger(__name__)
db = get_db()


@router.get("/settings")
async def get_platform_settings(current_admin: dict = Depends(get_current_admin)):
    """Get platform configuration"""
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    return {"config": config}


@router.put("/platform-config")
async def update_platform_config(
    updates: Dict[str, Any] = Body(...),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Generic platform config update endpoint.
    Accepts any key-value pairs and maps them to the correct database structure.
    This is the CENTRAL endpoint for all admin dashboard updates.
    """
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    db_updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    # Map frontend keys to database structure
    key_mapping = {
        # Card prices
        "silver_card_price": "card_prices.silver",
        "gold_card_price": "card_prices.gold",
        "platinum_card_price": "card_prices.platinum",
        # Card benefits
        "silver_card_benefits": "card_benefits.silver",
        "gold_card_benefits": "card_benefits.gold",
        "platinum_card_benefits": "card_benefits.platinum",
        # Card durations
        "silver_card_duration": "card_durations.silver",
        "gold_card_duration": "card_durations.gold",
        "platinum_card_duration": "card_durations.platinum",
        # Welcome bonuses
        "silver_welcome_bonus": "welcome_bonuses.silver",
        "gold_welcome_bonus": "welcome_bonuses.gold",
        "platinum_welcome_bonus": "welcome_bonuses.platinum",
        # Referral bonuses
        "referral_welcome_bonus": "referral_bonuses.welcome_bonus",
        "referral_referrer_bonus": "referral_bonuses.referrer_bonus",
        # Service fees (direct mapping)
        "service_fees": "service_fees",
        # Cashback rates
        "silver_cashback_rate": "card_cashback_rates.silver",
        "gold_cashback_rate": "card_cashback_rates.gold",
        "platinum_cashback_rate": "card_cashback_rates.platinum",
    }
    
    for key, value in updates.items():
        if key in key_mapping:
            db_updates[key_mapping[key]] = value
        else:
            # For unmapped keys, store directly
            db_updates[key] = value
    
    # Update the database
    await db.platform_config.update_one(
        {"key": "main"}, 
        {"$set": db_updates},
        upsert=True
    )
    
    # Log the update
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "update_platform_config",
        "changes": list(updates.keys()),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"Platform config updated by admin {current_admin['id']}: {list(updates.keys())}")
    
    return {"success": True, "message": "Configuration updated successfully"}


@router.put("/settings/commissions")
async def update_commissions(
    request: UpdateCommissionRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update platform commission settings"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.platform_commission_rate is not None:
        if request.platform_commission_rate < 1 or request.platform_commission_rate > 5:
            raise HTTPException(status_code=400, detail="Commission rate must be 1-5%")
        updates["platform_commission_rate"] = request.platform_commission_rate
    
    if request.usage_commission_type is not None:
        if request.usage_commission_type not in ["percentage", "fixed"]:
            raise HTTPException(status_code=400, detail="Invalid commission type")
        updates["usage_commission_type"] = request.usage_commission_type
    
    if request.usage_commission_rate is not None:
        updates["usage_commission_rate"] = request.usage_commission_rate
    
    await db.platform_config.update_one({"key": "main"}, {"$set": updates})
    
    return {"success": True, "message": "Commission settings updated"}


@router.put("/settings/card-prices")
async def update_card_prices(
    request: UpdateCardPricesRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update membership card prices, benefits, and durations"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.silver_price is not None:
        updates["card_prices.silver"] = request.silver_price
    if request.gold_price is not None:
        updates["card_prices.gold"] = request.gold_price
    if request.platinum_price is not None:
        updates["card_prices.platinum"] = request.platinum_price
    
    if request.silver_benefits is not None:
        updates["card_benefits.silver"] = request.silver_benefits
    if request.gold_benefits is not None:
        updates["card_benefits.gold"] = request.gold_benefits
    if request.platinum_benefits is not None:
        updates["card_benefits.platinum"] = request.platinum_benefits
    
    if request.silver_duration is not None:
        updates["card_durations.silver"] = request.silver_duration
    if request.gold_duration is not None:
        updates["card_durations.gold"] = request.gold_duration
    if request.platinum_duration is not None:
        updates["card_durations.platinum"] = request.platinum_duration
    
    if request.silver_welcome_bonus is not None:
        updates["welcome_bonuses.silver"] = request.silver_welcome_bonus
    if request.gold_welcome_bonus is not None:
        updates["welcome_bonuses.gold"] = request.gold_welcome_bonus
    if request.platinum_welcome_bonus is not None:
        updates["welcome_bonuses.platinum"] = request.platinum_welcome_bonus
    
    await db.platform_config.update_one({"key": "main"}, {"$set": updates})
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "update_card_prices",
        "changes": updates,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Card prices updated"}


@router.get("/settings/card-types")
async def get_card_types(current_admin: dict = Depends(get_current_admin)):
    """Get all card types (both default and custom)"""
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    
    default_cards = []
    if config:
        card_prices = config.get("card_prices", {})
        card_benefits = config.get("card_benefits", {})
        card_durations = config.get("card_durations", {"silver": 365, "gold": 365, "platinum": 730})
        welcome_bonuses = config.get("welcome_bonuses", {"silver": 1, "gold": 2, "platinum": 3})
        
        for card_type in ["silver", "gold", "platinum"]:
            default_cards.append({
                "id": f"default_{card_type}",
                "slug": card_type,
                "name": card_type.capitalize(),
                "price": card_prices.get(card_type, 0),
                "duration_days": card_durations.get(card_type, 365),
                "benefits": card_benefits.get(card_type, ""),
                "welcome_bonus": welcome_bonuses.get(card_type, 1),
                "color": {"silver": "#94a3b8", "gold": "#f59e0b", "platinum": "#6366f1"}.get(card_type, "#6366f1"),
                "icon": "credit-card",
                "is_default": True,
                "is_active": True,
                "sort_order": {"silver": 1, "gold": 2, "platinum": 3}.get(card_type, 0)
            })
    
    custom_cards = await db.card_types.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    for card in custom_cards:
        card["is_default"] = False
    
    all_cards = default_cards + custom_cards
    all_cards.sort(key=lambda x: x.get("sort_order", 99))
    
    return {"card_types": all_cards, "total": len(all_cards)}


@router.post("/settings/card-types")
async def create_card_type(
    request: CreateCardTypeRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Create a new custom card type"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    existing = await db.card_types.find_one({"slug": request.slug.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Card type with this slug already exists")
    
    if request.slug.lower() in ["silver", "gold", "platinum"]:
        raise HTTPException(status_code=400, detail="Cannot use reserved card type names")
    
    card_type = {
        "id": str(uuid.uuid4()),
        "slug": request.slug.lower(),
        "name": request.name,
        "price": request.price,
        "duration_days": request.duration_days,
        "benefits": request.benefits,
        "color": request.color or "#6366f1",
        "icon": request.icon or "credit-card",
        "is_active": request.is_active,
        "sort_order": request.sort_order,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.card_types.insert_one(card_type)
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "create_card_type",
        "details": {"card_name": request.name, "slug": request.slug},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    card_type.pop("_id", None)
    return {"success": True, "card_type": card_type}


@router.put("/settings/card-types/{card_id}")
async def update_card_type(
    card_id: str,
    request: UpdateCardTypeRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update a custom card type"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    if card_id.startswith("default_"):
        raise HTTPException(status_code=400, detail="Cannot update default cards via this endpoint. Use /settings/card-prices instead")
    
    card = await db.card_types.find_one({"id": card_id})
    if not card:
        raise HTTPException(status_code=404, detail="Card type not found")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.name is not None:
        updates["name"] = request.name
    if request.price is not None:
        updates["price"] = request.price
    if request.duration_days is not None:
        updates["duration_days"] = request.duration_days
    if request.benefits is not None:
        updates["benefits"] = request.benefits
    if request.color is not None:
        updates["color"] = request.color
    if request.icon is not None:
        updates["icon"] = request.icon
    if request.is_active is not None:
        updates["is_active"] = request.is_active
    if request.sort_order is not None:
        updates["sort_order"] = request.sort_order
    
    await db.card_types.update_one({"id": card_id}, {"$set": updates})
    
    return {"success": True, "message": "Card type updated"}


@router.delete("/settings/card-types/{card_id}")
async def delete_card_type(
    card_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Delete a custom card type"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    if card_id.startswith("default_"):
        raise HTTPException(status_code=400, detail="Cannot delete default card types")
    
    card = await db.card_types.find_one({"id": card_id})
    if not card:
        raise HTTPException(status_code=404, detail="Card type not found")
    
    clients_with_card = await db.clients.count_documents({"card_type": card["slug"]})
    if clients_with_card > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {clients_with_card} clients have this card type")
    
    await db.card_types.delete_one({"id": card_id})
    
    await db.admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": current_admin["id"],
        "action": "delete_card_type",
        "details": {"card_slug": card["slug"], "card_name": card.get("name")},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "Card type deleted"}


@router.put("/settings/service-commissions")
async def update_service_commissions(
    request: UpdateServiceCommissionsRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update service commissions (airtime, data, ECG, etc.)"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.airtime_commission_type is not None:
        updates["service_commissions.airtime.type"] = request.airtime_commission_type
    if request.airtime_commission_rate is not None:
        updates["service_commissions.airtime.rate"] = request.airtime_commission_rate
    if request.data_commission_type is not None:
        updates["service_commissions.data.type"] = request.data_commission_type
    if request.data_commission_rate is not None:
        updates["service_commissions.data.rate"] = request.data_commission_rate
    if request.ecg_commission_type is not None:
        updates["service_commissions.ecg.type"] = request.ecg_commission_type
    if request.ecg_commission_rate is not None:
        updates["service_commissions.ecg.rate"] = request.ecg_commission_rate
    if request.merchant_payment_commission_type is not None:
        updates["service_commissions.merchant_payment.type"] = request.merchant_payment_commission_type
    if request.merchant_payment_commission_rate is not None:
        updates["service_commissions.merchant_payment.rate"] = request.merchant_payment_commission_rate
    if request.withdrawal_commission_type is not None:
        updates["service_commissions.withdrawal.type"] = request.withdrawal_commission_type
    if request.withdrawal_commission_rate is not None:
        updates["service_commissions.withdrawal.rate"] = request.withdrawal_commission_rate
    
    await db.platform_config.update_one({"key": "main"}, {"$set": updates})
    
    return {"success": True, "message": "Service commissions updated"}


@router.put("/settings/referral-bonuses")
async def update_referral_bonuses(
    request: UpdateReferralBonusesRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Update referral bonus amounts"""
    if not check_is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail="Super admin required")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.welcome_bonus is not None:
        updates["referral_bonuses.welcome"] = request.welcome_bonus
    if request.referrer_bonus is not None:
        updates["referral_bonuses.referrer"] = request.referrer_bonus
    
    await db.platform_config.update_one({"key": "main"}, {"$set": updates})
    
    return {"success": True, "message": "Referral bonuses updated"}
