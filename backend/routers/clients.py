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

from fastapi import APIRouter, HTTPException, Depends, Request
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


class UpgradeCardRequest(BaseModel):
    new_card_type: str
    payment_phone: Optional[str] = None  # For MoMo payment
    use_cashback: bool = False  # Use cashback balance
    cashback_amount: Optional[float] = None  # Specific cashback amount to use


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
            years = days // 365
            return f"{years} year{'s' if years > 1 else ''}"
        elif days >= 365:
            return "1 year"
        elif days >= 30:
            months = days // 30
            return f"{months} month{'s' if months > 1 else ''}"
        else:
            return f"{days} day{'s' if days > 1 else ''}"
    
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
    """Purchase membership card via Hubtel Online Checkout"""
    from services.hubtel_checkout_service import get_hubtel_checkout_service, HubtelCheckoutRequest
    
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
    
    # Generate unique reference
    client_reference = f"SDM-CARD-{uuid.uuid4().hex[:12].upper()}"
    
    # For cashback payment - process immediately
    if request.payment_method == PaymentMethod.CASHBACK:
        cashback_balance = current_client.get("cashback_balance", 0)
        if cashback_balance < price:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient cashback balance. You have GHS {cashback_balance:.2f}, card costs GHS {price:.2f}"
            )
        # Deduct cashback from balance
        await db.clients.update_one(
            {"id": client_id},
            {"$inc": {"cashback_balance": -price}}
        )
        
        # Create and activate card immediately for cashback payment
        return await _complete_card_purchase(
            client_id=client_id,
            card_type=request.card_type,
            price=price,
            duration_days=duration_days,
            payment_method=request.payment_method,
            payment_reference=f"CASHBACK_{client_reference}",
            payment_phone=request.payment_phone,
            config=config
        )
    
    # For MoMo payment - use Hubtel Online Checkout API
    if request.payment_method == PaymentMethod.MOMO:
        # Initialize Hubtel Online Checkout service
        hubtel_service = get_hubtel_checkout_service(db)
        
        # Store pending purchase info for callback processing
        pending_purchase = {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "client_reference": client_reference,
            "card_type": request.card_type.value,
            "price": price,
            "duration_days": duration_days,
            "payment_phone": request.payment_phone or current_client.get("phone"),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.pending_card_purchases.insert_one(pending_purchase)
        
        # Initiate Hubtel Online Checkout
        checkout_request = HubtelCheckoutRequest(
            amount=price,
            description=f"SDM Rewards {request.card_type.value.title()} Card ({duration_days} days)",
            customer_phone=request.payment_phone or current_client.get("phone", ""),
            client_reference=client_reference
        )
        
        result = await hubtel_service.initiate_checkout(checkout_request)
        
        if not result.success:
            # Clean up pending purchase
            await db.pending_card_purchases.delete_one({"client_reference": client_reference})
            raise HTTPException(
                status_code=400, 
                detail=result.error or "Payment initiation failed. Please try again."
            )
        
        return {
            "success": True,
            "status": "pending",
            "message": "Redirecting to Hubtel payment page...",
            "client_reference": client_reference,
            "checkout_url": result.checkout_url,
            "checkout_id": result.request_id,
            "amount": price,
            "card_type": request.card_type.value
        }
    
    # For other payment methods (card, etc.) - not yet implemented
    raise HTTPException(status_code=400, detail="Payment method not supported")


async def _complete_card_purchase(
    client_id: str,
    card_type,
    price: float,
    duration_days: int,
    payment_method,
    payment_reference: str,
    payment_phone: Optional[str],
    config: dict
) -> dict:
    """Complete card purchase after successful payment"""
    now = datetime.now(timezone.utc)
    start_date = now
    end_date = now + timedelta(days=duration_days)
    
    # Create card
    card = MembershipCard(
        client_id=client_id,
        card_type=card_type,
        price=price,
        payment_method=payment_method,
        expires_at=end_date.isoformat(),
        payment_reference=payment_reference
    )
    
    # Create transaction
    transaction = Transaction(
        type=TransactionType.CARD_PURCHASE,
        status=TransactionStatus.COMPLETED,
        client_id=client_id,
        amount=price,
        payment_method=payment_method,
        payment_reference=payment_reference,
        payment_phone=payment_phone,
        description=f"Purchase {card_type.value.title()} Card ({duration_days} days)"
    )
    
    # Save card and transaction
    await db.membership_cards.insert_one(card.model_dump())
    await db.transactions.insert_one(transaction.model_dump())
    
    # Update client status with card dates
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {
            "status": ClientStatus.ACTIVE.value,
            "card_type": card_type.value,
            "card_number": card.card_number,
            "card_purchased_at": start_date.isoformat(),
            "card_expires_at": end_date.isoformat(),
            "card_duration_days": duration_days,
            "updated_at": now.isoformat()
        }}
    )
    
    # Process welcome bonus
    welcome_bonus = config.get("welcome_bonus", 1) if config else 1
    await db.clients.update_one(
        {"id": client_id},
        {"$inc": {
            "cashback_balance": welcome_bonus,
            "total_earned": welcome_bonus
        }}
    )
    
    # Record welcome bonus transaction
    bonus_txn = Transaction(
        type=TransactionType.CASHBACK,
        status=TransactionStatus.COMPLETED,
        client_id=client_id,
        amount=welcome_bonus,
        description="Welcome bonus for card purchase"
    )
    await db.transactions.insert_one(bonus_txn.model_dump())
    
    # Update gamification
    try:
        from services.gamification_service import gamification_service
        await gamification_service.process_event(
            db, client_id, "card_purchased",
            {"card_type": card_type.value, "amount": price}
        )
    except Exception as e:
        logger.warning(f"Gamification update failed: {e}")
    
    return {
        "success": True,
        "status": "completed",
        "message": f"Congratulations! Your {card_type.value.title()} card is now active.",
        "card": {
            "card_number": card.card_number,
            "card_type": card_type.value,
            "expires_at": end_date.isoformat(),
            "duration_days": duration_days,
            "qr_code": card.qr_code
        },
        "welcome_bonus": welcome_bonus,
        "transaction_id": transaction.id
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
            "message": "No active card"
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


# ============== CARD UPGRADE ==============

@router.post("/cards/upgrade")
async def upgrade_card(
    request: UpgradeCardRequest,
    current_client: dict = Depends(get_current_client)
):
    """
    Upgrade membership card to a higher tier.
    
    Payment options:
    - Full MoMo payment (payment_phone required)
    - Full cashback payment (use_cashback=True)
    - Combination: cashback_amount + MoMo for remainder
    
    The client pays the FULL PRICE of the new card (not the difference).
    Upon completion:
    - Card type is upgraded
    - Welcome bonus for new card is credited
    - Transaction is recorded
    """
    client_id = current_client["id"]
    
    # Check if client has an active card
    if current_client.get("status") != ClientStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="You must have an active card to upgrade")
    
    current_card_type = current_client.get("card_type")
    if not current_card_type:
        raise HTTPException(status_code=400, detail="No current card found")
    
    # Check if card is expired
    card_expires_at = current_client.get("card_expires_at")
    if card_expires_at:
        try:
            expiry_date = datetime.fromisoformat(card_expires_at.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) >= expiry_date:
                raise HTTPException(status_code=400, detail="Your card is expired. Please renew instead of upgrading")
        except ValueError:
            pass
    
    # Define card hierarchy
    card_order = ['silver', 'gold', 'platinum', 'diamond', 'business']
    current_index = card_order.index(current_card_type) if current_card_type in card_order else -1
    new_index = card_order.index(request.new_card_type) if request.new_card_type in card_order else -1
    
    if new_index == -1:
        # Check custom card types
        custom_card = await db.card_types.find_one({"slug": request.new_card_type, "is_active": True})
        if not custom_card:
            raise HTTPException(status_code=400, detail="Invalid card type")
    
    if new_index != -1 and new_index <= current_index:
        raise HTTPException(status_code=400, detail="You can only upgrade to a higher tier card")
    
    # Get prices and bonuses from config
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    cards = config.get("cards", {}) if config else {}
    welcome_bonuses = config.get("welcome_bonuses", {}) if config else {}
    
    # Get new card price and duration (client pays FULL price)
    new_card_info = cards.get(request.new_card_type, {})
    new_price = new_card_info.get("price", 50)
    new_duration_days = new_card_info.get("duration_days", 365)
    
    # Check for custom card types
    if not new_card_info:
        custom_card = await db.card_types.find_one({"slug": request.new_card_type, "is_active": True})
        if custom_card:
            new_price = custom_card.get("price", 50)
            new_duration_days = custom_card.get("duration_days", 365)
    
    # Get welcome bonus for new card
    default_bonuses = {"silver": 1.0, "gold": 2.0, "platinum": 3.0}
    welcome_bonus = welcome_bonuses.get(request.new_card_type, default_bonuses.get(request.new_card_type, 1.0))
    
    # Calculate payment breakdown
    cashback_balance = current_client.get("cashback_balance", 0)
    cashback_to_use = 0
    momo_amount = new_price
    
    if request.use_cashback:
        if request.cashback_amount is not None:
            # Use specific amount
            cashback_to_use = min(request.cashback_amount, cashback_balance, new_price)
        else:
            # Use full balance up to price
            cashback_to_use = min(cashback_balance, new_price)
        
        momo_amount = new_price - cashback_to_use
    
    # Validate payment method
    if momo_amount > 0 and not request.payment_phone:
        raise HTTPException(
            status_code=400, 
            detail=f"MoMo phone number required. Remaining amount to pay: GHS {momo_amount:.2f}"
        )
    
    if cashback_to_use > cashback_balance:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient cashback balance. Available: GHS {cashback_balance:.2f}"
        )
    
    # Create payment record
    payment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    test_mode = os.environ.get("PAYMENT_TEST_MODE", "true").lower() == "true"
    
    payment_record = {
        "id": payment_id,
        "type": "card_upgrade",
        "client_id": client_id,
        "from_card_type": current_card_type,
        "to_card_type": request.new_card_type,
        "amount": new_price,  # Full price
        "cashback_used": cashback_to_use,
        "momo_amount": momo_amount,
        "welcome_bonus": welcome_bonus,
        "payment_phone": request.payment_phone,
        "status": "pending",
        "new_duration_days": new_duration_days,
        "test_mode": test_mode,
        "reference": f"UPGRADE-{uuid.uuid4().hex[:8].upper()}",
        "created_at": now.isoformat()
    }
    
    await db.momo_payments.insert_one(payment_record)
    
    # If paying fully with cashback (no MoMo needed)
    if momo_amount == 0:
        # Deduct cashback immediately
        await db.clients.update_one(
            {"id": client_id},
            {"$inc": {"cashback_balance": -cashback_to_use}}
        )
        
        # Record cashback deduction transaction
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "type": "upgrade_payment",
            "client_id": client_id,
            "amount": -cashback_to_use,
            "description": f"Card upgrade payment ({current_card_type.upper()} → {request.new_card_type.upper()})",
            "status": "completed",
            "created_at": now.isoformat()
        })
        
        # Process upgrade immediately
        from routers.payments import complete_payment
        await complete_payment(payment_id)
        
        return {
            "success": True,
            "payment_id": payment_id,
            "amount": new_price,
            "cashback_used": cashback_to_use,
            "momo_amount": 0,
            "from_card": current_card_type,
            "to_card": request.new_card_type,
            "welcome_bonus": welcome_bonus,
            "status": "completed",
            "message": f"Upgrade completed using GHS {cashback_to_use:.2f} cashback. Welcome bonus of GHS {welcome_bonus:.2f} credited!"
        }
    
    # If cashback is used partially, deduct it now
    if cashback_to_use > 0:
        await db.clients.update_one(
            {"id": client_id},
            {"$inc": {"cashback_balance": -cashback_to_use}}
        )
        
        # Record partial cashback payment
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "type": "upgrade_payment_partial",
            "client_id": client_id,
            "amount": -cashback_to_use,
            "description": f"Partial upgrade payment (cashback) - {current_card_type.upper()} → {request.new_card_type.upper()}",
            "status": "completed",
            "created_at": now.isoformat()
        })
    
    # Initiate MoMo payment for remaining amount
    if not test_mode:
        # Use Hubtel Online Checkout API (no IP whitelisting required)
        from services.hubtel_checkout_service import get_hubtel_checkout_service, HubtelCheckoutRequest
        
        hubtel_service = get_hubtel_checkout_service(db)
        
        try:
            checkout_request = HubtelCheckoutRequest(
                amount=momo_amount,
                description=f"SDM Rewards Card Upgrade ({current_card_type.upper()} to {request.new_card_type.upper()})",
                customer_phone=request.payment_phone or current_client.get("phone", ""),
                client_reference=payment_record["reference"]
            )
            
            result = await hubtel_service.initiate_checkout(checkout_request)
            
            if result.success:
                await db.momo_payments.update_one(
                    {"id": payment_id},
                    {"$set": {
                        "status": "checkout_initiated",
                        "provider": "hubtel_checkout",
                        "checkout_url": result.checkout_url,
                        "checkout_id": result.request_id,
                        "provider_message": result.message
                    }}
                )
                
                return {
                    "success": True,
                    "status": "pending",
                    "payment_id": payment_id,
                    "amount": new_price,
                    "cashback_used": cashback_to_use,
                    "momo_amount": momo_amount,
                    "from_card": current_card_type,
                    "to_card": request.new_card_type,
                    "welcome_bonus": welcome_bonus,
                    "checkout_url": result.checkout_url,
                    "checkout_id": result.request_id,
                    "message": f"Redirecting to payment page for GHS {momo_amount:.2f}" + (f" (GHS {cashback_to_use:.2f} paid with cashback)" if cashback_to_use > 0 else "")
                }
            else:
                # Refund cashback if checkout initiation failed
                if cashback_to_use > 0:
                    await db.clients.update_one(
                        {"id": client_id},
                        {"$inc": {"cashback_balance": cashback_to_use}}
                    )
                error_msg = result.error or "Payment initiation failed"
                raise HTTPException(status_code=400, detail=error_msg)
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Hubtel checkout error: {e}")
            # Refund cashback on error
            if cashback_to_use > 0:
                await db.clients.update_one(
                    {"id": client_id},
                    {"$inc": {"cashback_balance": cashback_to_use}}
                )
            raise HTTPException(status_code=400, detail=f"Payment service error: {str(e)}")
    
    # Test mode response
    return {
        "success": True,
        "status": "pending",
        "payment_id": payment_id,
        "amount": new_price,
        "cashback_used": cashback_to_use,
        "momo_amount": momo_amount,
        "from_card": current_card_type,
        "to_card": request.new_card_type,
        "welcome_bonus": welcome_bonus,
        "test_mode": test_mode,
        "message": f"Test mode: MoMo payment of GHS {momo_amount:.2f} required for upgrade"
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
    
    # Enrich with referred client info and sync status
    for ref in referrals:
        referred = await db.clients.find_one(
            {"id": ref["referred_id"]},
            {"_id": 0, "full_name": 1, "phone": 1, "status": 1, "card_type": 1, "created_at": 1}
        )
        if referred:
            ref["referred_client"] = referred
            
            # Sync card_purchased status with actual client status
            # A client is "active" if they have a card_type
            client_is_active = referred.get("status") == "active" and referred.get("card_type") is not None
            
            # If client bought card but referral record not updated, update it now
            if client_is_active and not ref.get("card_purchased"):
                await db.referrals.update_one(
                    {"id": ref["id"]},
                    {"$set": {"card_purchased": True}}
                )
                ref["card_purchased"] = True
            
            # Determine display status
            ref["display_status"] = "active" if client_is_active else "pending"
    
    # Stats
    total_referrals = len(referrals)
    active_referrals = sum(1 for r in referrals if r.get("card_purchased") or r.get("display_status") == "active")
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


@router.put("/payment-settings")
async def update_payment_settings(
    request: Request,
    current_client: dict = Depends(get_current_client)
):
    """Update client payment settings (MoMo and Bank account)"""
    data = await request.json()
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    # MoMo settings
    if "momo_number" in data:
        updates["momo_number"] = data["momo_number"]
    if "momo_network" in data:
        updates["momo_network"] = data["momo_network"]
    
    # Bank settings
    if "bank_name" in data:
        updates["bank_name"] = data["bank_name"]
    if "bank_account" in data:
        updates["bank_account"] = data["bank_account"]
    if "bank_branch" in data:
        updates["bank_branch"] = data["bank_branch"]
    
    # Preferred withdrawal method
    if "preferred_withdrawal_method" in data:
        if data["preferred_withdrawal_method"] in ["momo", "bank"]:
            updates["preferred_withdrawal_method"] = data["preferred_withdrawal_method"]
    
    await db.clients.update_one(
        {"id": current_client["id"]},
        {"$set": updates}
    )
    
    return {"success": True, "message": "Payment settings updated"}


@router.get("/payment-settings")
async def get_payment_settings(current_client: dict = Depends(get_current_client)):
    """Get client payment settings"""
    client = await db.clients.find_one(
        {"id": current_client["id"]},
        {"_id": 0, "momo_number": 1, "momo_network": 1, "bank_name": 1, "bank_account": 1, "bank_branch": 1, "preferred_withdrawal_method": 1}
    )
    
    return {
        "momo_number": client.get("momo_number", ""),
        "momo_network": client.get("momo_network", ""),
        "bank_name": client.get("bank_name", ""),
        "bank_account": client.get("bank_account", ""),
        "bank_branch": client.get("bank_branch", ""),
        "preferred_withdrawal_method": client.get("preferred_withdrawal_method", "momo")
    }


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



# ============== PUSH NOTIFICATIONS ==============

class PushRegisterRequest(BaseModel):
    player_id: str
    platform: str = "web"
    device_model: Optional[str] = None

class PushUnregisterRequest(BaseModel):
    player_id: str

@router.post("/push/register")
async def register_push_notification(
    request: PushRegisterRequest,
    current_client: dict = Depends(get_current_client)
):
    """Register client for push notifications"""
    # Update client with OneSignal player_id
    await db.clients.update_one(
        {"id": current_client["id"]},
        {
            "$set": {
                "onesignal_player_id": request.player_id,
                "push_platform": request.platform,
                "push_device_model": request.device_model,
                "push_registered_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    logger.info(f"Push registered for client {current_client['id']}: {request.player_id}")
    
    return {
        "success": True,
        "message": "Push notifications enabled",
        "player_id": request.player_id
    }

@router.post("/push/unregister")
async def unregister_push_notification(
    request: PushUnregisterRequest,
    current_client: dict = Depends(get_current_client)
):
    """Unregister client from push notifications"""
    await db.clients.update_one(
        {"id": current_client["id"]},
        {
            "$unset": {
                "onesignal_player_id": "",
                "push_platform": "",
                "push_device_model": ""
            },
            "$set": {
                "push_unregistered_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    logger.info(f"Push unregistered for client {current_client['id']}")
    
    return {
        "success": True,
        "message": "Push notifications disabled"
    }
