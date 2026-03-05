"""
SDM REWARDS - Clients Router
============================
Client dashboard, cards, cashback, history
"""

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from models.schemas import (
    Client, MembershipCard, Transaction, Referral,
    CardType, TransactionType, TransactionStatus, PaymentMethod, ClientStatus
)
from routers.auth import get_current_client

# Setup
router = APIRouter()
logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ============== REQUEST MODELS ==============

class PurchaseCardRequest(BaseModel):
    card_type: CardType
    payment_method: PaymentMethod
    payment_phone: Optional[str] = None  # For MoMo


# ============== DASHBOARD ==============

@router.get("/me")
async def get_client_dashboard(current_client: dict = Depends(get_current_client)):
    """Get client dashboard data"""
    client_id = current_client["id"]
    
    # Get recent transactions
    recent_transactions = await db.transactions.find(
        {"client_id": client_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Get referral stats
    referral_count = await db.referrals.count_documents({
        "referrer_id": client_id,
        "bonuses_paid": True
    })
    
    # Get card info if active
    card = None
    if current_client.get("status") == ClientStatus.ACTIVE.value:
        card = await db.membership_cards.find_one(
            {"client_id": client_id, "is_active": True},
            {"_id": 0}
        )
    
    return {
        "client": current_client,
        "card": card,
        "cashback_balance": current_client.get("cashback_balance", 0),
        "total_earned": current_client.get("total_earned", 0),
        "total_spent": current_client.get("total_spent", 0),
        "referral_count": referral_count,
        "recent_transactions": recent_transactions
    }


# ============== CARDS ==============

@router.get("/cards/available")
async def get_available_cards():
    """Get available membership cards with duration info"""
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    cards = config.get("cards", {}) if config else {}
    card_durations = config.get("card_durations", {"silver": 365, "gold": 365, "platinum": 730}) if config else {}
    
    def format_duration(days):
        if days >= 730:
            return f"{days // 365} ans"
        elif days >= 365:
            return "1 an"
        elif days >= 30:
            return f"{days // 30} mois"
        else:
            return f"{days} jours"
    
    default_cards = [
        {
            "type": "silver",
            "name": cards.get("silver", {}).get("name", "Silver Card"),
            "price": cards.get("silver", {}).get("price", 25),
            "color": cards.get("silver", {}).get("color", "#C0C0C0"),
            "duration_days": cards.get("silver", {}).get("duration_days") or card_durations.get("silver", 365),
            "duration_label": format_duration(cards.get("silver", {}).get("duration_days") or card_durations.get("silver", 365)),
            "benefits": [
                "Access to all partner merchants",
                "Earn cashback on every purchase",
                "Digital membership card with QR code",
                "Referral bonus program"
            ]
        },
        {
            "type": "gold",
            "name": cards.get("gold", {}).get("name", "Gold Card"),
            "price": cards.get("gold", {}).get("price", 50),
            "color": cards.get("gold", {}).get("color", "#FFD700"),
            "duration_days": cards.get("gold", {}).get("duration_days") or card_durations.get("gold", 365),
            "duration_label": format_duration(cards.get("gold", {}).get("duration_days") or card_durations.get("gold", 365)),
            "benefits": [
                "All Silver benefits",
                "Priority customer support",
                "Exclusive merchant offers",
                "Higher cashback limits"
            ]
        },
        {
            "type": "platinum",
            "name": cards.get("platinum", {}).get("name", "Platinum Card"),
            "price": cards.get("platinum", {}).get("price", 100),
            "color": cards.get("platinum", {}).get("color", "#E5E4E2"),
            "duration_days": cards.get("platinum", {}).get("duration_days") or card_durations.get("platinum", 730),
            "duration_label": format_duration(cards.get("platinum", {}).get("duration_days") or card_durations.get("platinum", 730)),
            "benefits": [
                "All Gold benefits",
                "VIP merchant access",
                "Birthday bonus rewards",
                "Premium support hotline"
            ]
        }
    ]
    
    # Add custom card types
    custom_cards = await db.card_types.find({"is_active": True}, {"_id": 0}).to_list(50)
    for card in custom_cards:
        default_cards.append({
            "type": card["slug"],
            "name": card["name"],
            "price": card["price"],
            "color": card.get("color", "#6366f1"),
            "duration_days": card.get("duration_days", 365),
            "duration_label": format_duration(card.get("duration_days", 365)),
            "benefits": card.get("benefits", "").split(", ") if card.get("benefits") else []
        })
    
    return {"cards": default_cards}


@router.post("/cards/purchase")
async def purchase_card(
    request: PurchaseCardRequest,
    current_client: dict = Depends(get_current_client)
):
    """Purchase membership card"""
    client_id = current_client["id"]
    
    # Check if already has active card
    if current_client.get("status") == ClientStatus.ACTIVE.value:
        # Check if card is expired - allow re-purchase if expired
        card_expires_at = current_client.get("card_expires_at")
        if card_expires_at:
            expiry_date = datetime.fromisoformat(card_expires_at.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) < expiry_date:
                raise HTTPException(status_code=400, detail="You already have an active membership card")
        else:
            raise HTTPException(status_code=400, detail="You already have an active membership card")
    
    # Get card price and duration from config
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    cards = config.get("cards", {}) if config else {}
    card_durations = config.get("card_durations", {"silver": 365, "gold": 365, "platinum": 730}) if config else {}
    
    card_info = cards.get(request.card_type.value, {})
    price = card_info.get("price", 25)
    
    # Get duration - first check cards config, then card_durations, then default
    duration_days = card_info.get("duration_days") or card_durations.get(request.card_type.value, 365)
    
    # Check for custom card types
    custom_card = await db.card_types.find_one({"slug": request.card_type.value, "is_active": True})
    if custom_card:
        price = custom_card.get("price", price)
        duration_days = custom_card.get("duration_days", duration_days)
    
    # Calculate dates
    now = datetime.now(timezone.utc)
    start_date = now
    end_date = now + timedelta(days=duration_days)
    
    # Create card
    card = MembershipCard(
        client_id=client_id,
        card_type=request.card_type,
        price=price,
        payment_method=request.payment_method,
        expires_at=end_date.isoformat()
    )
    
    # For MoMo payment, initiate collection
    if request.payment_method == PaymentMethod.MOMO:
        # TODO: Integrate BulkClix MoMo collection
        # For now, simulate success
        card.payment_reference = f"MOMO_{uuid.uuid4().hex[:10].upper()}"
    
    # Create transaction
    transaction = Transaction(
        type=TransactionType.CARD_PURCHASE,
        status=TransactionStatus.COMPLETED,
        client_id=client_id,
        amount=price,
        payment_method=request.payment_method,
        payment_reference=card.payment_reference,
        payment_phone=request.payment_phone,
        description=f"Purchase {request.card_type.value.title()} Card ({duration_days} days)"
    )
    
    # Save card and transaction
    await db.membership_cards.insert_one(card.model_dump())
    await db.transactions.insert_one(transaction.model_dump())
    
    # Update client status with card dates
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {
            "status": ClientStatus.ACTIVE.value,
            "card_type": request.card_type.value,
            "card_number": card.card_number,
            "card_purchased_at": start_date.isoformat(),
            "card_expires_at": end_date.isoformat(),
            "card_duration_days": duration_days,
            "updated_at": now.isoformat()
        }}
    )
    
    # Process welcome bonus (1 GHS)
    welcome_bonus = config.get("welcome_bonus", 1) if config else 1
    await db.clients.update_one(
        {"id": client_id},
        {"$inc": {
            "cashback_balance": welcome_bonus,
            "total_earned": welcome_bonus
        }}
    )
    
    # Record welcome bonus transaction
    bonus_transaction = Transaction(
        type=TransactionType.WELCOME_BONUS,
        status=TransactionStatus.COMPLETED,
        client_id=client_id,
        amount=welcome_bonus,
        description="Welcome bonus for card purchase"
    )
    await db.transactions.insert_one(bonus_transaction.model_dump())
    
    # Process referral bonus if referred
    if current_client.get("referred_by"):
        referral = await db.referrals.find_one({
            "referred_id": client_id,
            "bonuses_paid": False
        })
        
        if referral:
            referrer_bonus = config.get("referrer_bonus", 3) if config else 3
            
            # Credit referrer
            await db.clients.update_one(
                {"id": referral["referrer_id"]},
                {"$inc": {
                    "cashback_balance": referrer_bonus,
                    "total_earned": referrer_bonus,
                    "referral_count": 1
                }}
            )
            
            # Record referrer bonus transaction
            referrer_txn = Transaction(
                type=TransactionType.REFERRAL_BONUS,
                status=TransactionStatus.COMPLETED,
                client_id=referral["referrer_id"],
                amount=referrer_bonus,
                description=f"Referral bonus for inviting {current_client['full_name']}"
            )
            await db.transactions.insert_one(referrer_txn.model_dump())
            
            # Mark referral as paid
            await db.referrals.update_one(
                {"id": referral["id"]},
                {"$set": {
                    "bonuses_paid": True,
                    "card_purchased": True,
                    "bonus_paid_at": now
                }}
            )
    
    return {
        "success": True,
        "message": "Card purchased successfully! Your account is now active.",
        "card": {
            "card_number": card.card_number,
            "card_type": card.card_type.value,
            "qr_code": card.qr_code
        },
        "welcome_bonus": welcome_bonus
    }


@router.get("/cards/my-card")
async def get_my_card(current_client: dict = Depends(get_current_client)):
    """Get client's membership card with validity status"""
    if current_client.get("status") != ClientStatus.ACTIVE.value:
        return {"card": None, "message": "No active card. Purchase a card to activate your account."}
    
    card = await db.membership_cards.find_one(
        {"client_id": current_client["id"], "is_active": True},
        {"_id": 0}
    )
    
    if not card:
        return {"card": None, "message": "No card found"}
    
    # Calculate validity status
    now = datetime.now(timezone.utc)
    purchased_at = current_client.get("card_purchased_at")
    expires_at = current_client.get("card_expires_at") or card.get("expires_at")
    duration_days = current_client.get("card_duration_days", 365)
    
    # Calculate days remaining
    is_expired = False
    days_remaining = 0
    expiry_date = None
    
    if expires_at:
        expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        delta = expiry_date - now
        days_remaining = max(0, delta.days)
        is_expired = now >= expiry_date
    
    # Format dates for display
    start_date_formatted = None
    end_date_formatted = None
    if purchased_at:
        start_date_formatted = datetime.fromisoformat(purchased_at.replace('Z', '+00:00')).strftime("%d/%m/%Y")
    if expiry_date:
        end_date_formatted = expiry_date.strftime("%d/%m/%Y")
    
    return {
        "card": card,
        "validity": {
            "is_active": not is_expired,
            "is_expired": is_expired,
            "purchased_at": purchased_at,
            "expires_at": expires_at,
            "start_date": start_date_formatted,
            "end_date": end_date_formatted,
            "duration_days": duration_days,
            "days_remaining": days_remaining,
            "days_used": duration_days - days_remaining if duration_days else 0
        }
    }


@router.get("/cards/status")
async def get_card_status(current_client: dict = Depends(get_current_client)):
    """Get card status summary (quick check)"""
    now = datetime.now(timezone.utc)
    
    if current_client.get("status") != ClientStatus.ACTIVE.value:
        return {
            "has_card": False,
            "card_type": None,
            "status": "no_card",
            "message": "Aucune carte active"
        }
    
    expires_at = current_client.get("card_expires_at")
    card_type = current_client.get("card_type")
    
    if not expires_at:
        # Legacy card without expiry - assume valid
        return {
            "has_card": True,
            "card_type": card_type,
            "status": "active",
            "days_remaining": None,
            "message": "Carte active (validité illimitée)"
        }
    
    expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
    delta = expiry_date - now
    days_remaining = max(0, delta.days)
    is_expired = now >= expiry_date
    
    if is_expired:
        return {
            "has_card": True,
            "card_type": card_type,
            "status": "expired",
            "days_remaining": 0,
            "expires_at": expires_at,
            "message": "Carte expirée - Renouvelez votre abonnement"
        }
    elif days_remaining <= 30:
        return {
            "has_card": True,
            "card_type": card_type,
            "status": "expiring_soon",
            "days_remaining": days_remaining,
            "expires_at": expires_at,
            "message": f"Carte expire dans {days_remaining} jours"
        }
    else:
        return {
            "has_card": True,
            "card_type": card_type,
            "status": "active",
            "days_remaining": days_remaining,
            "expires_at": expires_at,
            "message": f"Carte active - {days_remaining} jours restants"
        }


# ============== TRANSACTIONS ==============

@router.get("/transactions")
async def get_transactions(
    limit: int = 50,
    offset: int = 0,
    type: Optional[str] = None,
    current_client: dict = Depends(get_current_client)
):
    """Get client's transaction history"""
    query = {"client_id": current_client["id"]}
    
    if type:
        query["type"] = type
    
    transactions = await db.transactions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    total = await db.transactions.count_documents(query)
    
    return {
        "transactions": transactions,
        "total": total,
        "limit": limit,
        "offset": offset
    }


# ============== REFERRALS ==============

@router.get("/referrals")
async def get_referrals(current_client: dict = Depends(get_current_client)):
    """Get client's referral information"""
    client_id = current_client["id"]
    
    # Get referrals made by this client
    referrals = await db.referrals.find(
        {"referrer_id": client_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich with referred client info
    for ref in referrals:
        referred = await db.clients.find_one(
            {"id": ref["referred_id"]},
            {"_id": 0, "full_name": 1, "phone": 1, "status": 1, "created_at": 1}
        )
        if referred:
            ref["referred_client"] = referred
    
    # Stats
    total_referrals = len(referrals)
    active_referrals = sum(1 for r in referrals if r.get("card_purchased"))
    total_bonus_earned = sum(r.get("referrer_bonus", 0) for r in referrals if r.get("bonuses_paid"))
    
    return {
        "referral_code": current_client["referral_code"],
        "qr_code": current_client["qr_code"],
        "total_referrals": total_referrals,
        "active_referrals": active_referrals,
        "total_bonus_earned": total_bonus_earned,
        "referrals": referrals
    }


# ============== QR CODE ==============

@router.get("/qr-code")
async def get_qr_code(current_client: dict = Depends(get_current_client)):
    """Get client's QR code for payments and referrals"""
    return {
        "client_id": current_client["id"],
        "qr_code": current_client["qr_code"],
        "referral_code": current_client["referral_code"],
        "full_name": current_client["full_name"]
    }


# ============== PROFILE ==============

@router.put("/profile")
async def update_profile(
    full_name: Optional[str] = None,
    email: Optional[str] = None,
    birthday: Optional[str] = None,
    language: Optional[str] = None,
    current_client: dict = Depends(get_current_client)
):
    """Update client profile"""
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if full_name:
        updates["full_name"] = full_name
    if email:
        # Check for duplicate
        existing = await db.clients.find_one({
            "email": email.lower(),
            "id": {"$ne": current_client["id"]}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        updates["email"] = email.lower()
    if birthday:
        updates["birthday"] = birthday
    if language:
        updates["language"] = language
    
    await db.clients.update_one(
        {"id": current_client["id"]},
        {"$set": updates}
    )
    
    return {"success": True, "message": "Profile updated"}


# ============== WITHDRAWALS ==============

@router.get("/withdrawals")
async def get_client_withdrawals(
    limit: int = 20,
    current_client: dict = Depends(get_current_client)
):
    """Get client withdrawal history"""
    withdrawals = await db.withdrawals.find(
        {"client_id": current_client["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "withdrawals": withdrawals,
        "total": len(withdrawals)
    }
