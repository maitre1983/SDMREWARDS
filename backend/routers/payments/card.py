"""
SDM REWARDS - Card Payment Routes
=================================
Handles card purchase payment initiation using Hubtel Online Checkout
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid
import logging
import os

from .shared import (
    CardPaymentRequest, get_db, detect_network, is_test_mode,
    get_sms, logger
)

router = APIRouter()


@router.post("/card/initiate")
async def initiate_card_payment(request: CardPaymentRequest):
    """
    Initiate payment for VIP card purchase using Hubtel Online Checkout.
    
    This redirects the user to Hubtel's checkout page where they can pay via:
    - Mobile Money (MTN, Vodafone, AirtelTigo)
    - Bank Card (Visa/Mastercard)
    
    Returns a checkout_url that the frontend should redirect to.
    """
    db = get_db()
    
    # Get card prices from platform config (single source of truth)
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    card_prices_config = config.get("card_prices", {}) if config else {}
    card_durations = config.get("card_durations", {"silver": 365, "gold": 365, "platinum": 730}) if config else {}
    
    # Use config values or defaults
    card_prices = {
        "silver": card_prices_config.get("silver", 25),
        "gold": card_prices_config.get("gold", 50),
        "platinum": card_prices_config.get("platinum", 100)
    }
    card_names = {"silver": "Silver Card", "gold": "Gold Card", "platinum": "Platinum Card"}
    
    if request.card_type.lower() not in card_prices:
        raise HTTPException(status_code=400, detail="Invalid card type. Choose: silver, gold, platinum")
    
    card_type = request.card_type.lower()
    amount = card_prices[card_type]
    card_name = card_names[card_type]
    duration_days = card_durations.get(card_type, 365)
    
    # Find client by phone
    client = await db.clients.find_one({"phone": request.phone}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found. Please register first.")
    
    # Check if already has an active card
    if client.get("card_type") and client.get("status") == "active":
        # Check if card is expired
        card_expires_at = client.get("card_expires_at")
        if card_expires_at:
            try:
                expiry_date = datetime.fromisoformat(card_expires_at.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) < expiry_date:
                    raise HTTPException(status_code=400, detail="You already have an active membership card")
            except ValueError:
                pass
        else:
            raise HTTPException(status_code=400, detail="You already have an active membership card")
    
    # Detect network (for callback processing)
    network = detect_network(request.phone)
    
    # Handle referrer - check both request and client record
    referrer_id = None
    referred_by_merchant_id = client.get("referred_by_merchant_id")
    
    # First check if referrer_code provided in request
    if request.referrer_code:
        referrer = await db.clients.find_one({"referral_code": request.referrer_code}, {"_id": 0})
        if referrer and referrer["id"] != client["id"]:
            referrer_id = referrer["id"]
    
    # If no referrer from request, check if client was referred during registration
    if not referrer_id:
        existing_referral = await db.referrals.find_one(
            {"referred_id": client["id"], "bonuses_paid": {"$ne": True}},
            {"_id": 0, "referrer_id": 1}
        )
        if existing_referral:
            referrer_id = existing_referral.get("referrer_id")
        
        if not referrer_id and client.get("referred_by"):
            ref_code = client.get("referred_by")
            # Check if it's a merchant referral code (SDM-R-xxx)
            if ref_code and ref_code.startswith("SDM-R-"):
                merchant = await db.merchants.find_one(
                    {"recruitment_qr_code": ref_code},
                    {"_id": 0, "id": 1}
                )
                if merchant:
                    referred_by_merchant_id = merchant["id"]
            else:
                referrer = await db.clients.find_one(
                    {"referral_code": ref_code},
                    {"_id": 0, "id": 1}
                )
                if referrer:
                    referrer_id = referrer["id"]
    
    # Generate payment reference
    payment_ref = f"SDM-CARD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Create payment record
    payment_record = {
        "id": str(uuid.uuid4()),
        "reference": payment_ref,
        "type": "card_purchase",
        "phone": request.phone,
        "network": network,
        "amount": amount,
        "description": f"SDM {card_name} Purchase",
        "client_id": client["id"],
        "status": "pending",
        "metadata": {
            "card_type": card_type,
            "card_name": card_name,
            "duration_days": duration_days,
            "referrer_id": referrer_id,
            "referred_by_merchant_id": referred_by_merchant_id
        },
        "provider": "hubtel_checkout",
        "provider_reference": None,
        "provider_message": None,
        "checkout_url": None,
        "test_mode": is_test_mode(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    await db.momo_payments.insert_one(payment_record)
    
    # In test mode, return for manual confirmation (no real Hubtel call)
    if is_test_mode():
        return {
            "success": True,
            "payment_id": payment_record["id"],
            "reference": payment_ref,
            "amount": amount,
            "card_type": card_type,
            "status": "pending",
            "test_mode": True,
            "use_checkout": False,  # In test mode, use direct confirmation
            "message": f"Test Mode: Payment of GHS {amount} initiated for {card_name}. Click 'Confirm Payment' to complete."
        }
    
    # Production: Use Hubtel Online Checkout API
    from services.hubtel_checkout_service import get_hubtel_checkout_service, HubtelCheckoutRequest
    
    hubtel_service = get_hubtel_checkout_service(db)
    
    # Build callback URLs
    frontend_url = os.environ.get("FRONTEND_URL", "https://sdmrewards.com")
    
    checkout_request = HubtelCheckoutRequest(
        amount=amount,
        description=f"SDM Rewards {card_name} ({duration_days} days)",
        customer_phone=request.phone,
        client_reference=payment_ref,
        return_url=f"{frontend_url}/payment/success?ref={payment_ref}",
        cancellation_url=f"{frontend_url}/payment/cancelled?ref={payment_ref}"
    )
    
    result = await hubtel_service.initiate_checkout(checkout_request)
    
    if result.success and result.checkout_url:
        await db.momo_payments.update_one(
            {"id": payment_record["id"]},
            {
                "$set": {
                    "status": "checkout_initiated",
                    "checkout_url": result.checkout_url,
                    "provider_reference": result.request_id,
                    "provider_message": result.message,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "payment_id": payment_record["id"],
            "reference": payment_ref,
            "amount": amount,
            "card_type": card_type,
            "status": "checkout_initiated",
            "use_checkout": True,
            "checkout_url": result.checkout_url,
            "message": "Redirecting to Hubtel Checkout..."
        }
    else:
        error_msg = result.error or result.message or "Failed to initiate checkout"
        await db.momo_payments.update_one(
            {"id": payment_record["id"]},
            {
                "$set": {
                    "status": "failed",
                    "provider_message": error_msg,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        raise HTTPException(status_code=400, detail=error_msg)


@router.post("/card/upgrade")
async def initiate_card_upgrade(request: CardPaymentRequest):
    """
    Initiate payment for VIP card upgrade using Hubtel Online Checkout.
    
    Client must have an active card to upgrade.
    Upgrade price = difference between new card price and current card price.
    """
    db = get_db()
    
    # Get card prices from platform config
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    card_prices_config = config.get("card_prices", {}) if config else {}
    card_durations = config.get("card_durations", {"silver": 365, "gold": 365, "platinum": 730}) if config else {}
    
    card_prices = {
        "silver": card_prices_config.get("silver", 25),
        "gold": card_prices_config.get("gold", 50),
        "platinum": card_prices_config.get("platinum", 100)
    }
    card_names = {"silver": "Silver Card", "gold": "Gold Card", "platinum": "Platinum Card"}
    card_tiers = {"silver": 1, "gold": 2, "platinum": 3}
    
    new_card_type = request.card_type.lower()
    if new_card_type not in card_prices:
        raise HTTPException(status_code=400, detail="Invalid card type. Choose: silver, gold, platinum")
    
    # Find client by phone
    client = await db.clients.find_one({"phone": request.phone}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found. Please register first.")
    
    # Check if client has an active card
    current_card_type = client.get("card_type")
    if not current_card_type or client.get("status") != "active":
        raise HTTPException(status_code=400, detail="You need an active card to upgrade. Please purchase a card first.")
    
    # Check if upgrade is valid (new tier must be higher)
    current_tier = card_tiers.get(current_card_type.lower(), 0)
    new_tier = card_tiers.get(new_card_type, 0)
    
    if new_tier <= current_tier:
        raise HTTPException(status_code=400, detail=f"Cannot upgrade from {current_card_type} to {new_card_type}. Choose a higher tier.")
    
    # Calculate upgrade price
    current_price = card_prices.get(current_card_type.lower(), 0)
    new_price = card_prices[new_card_type]
    upgrade_price = new_price - current_price
    
    if upgrade_price <= 0:
        raise HTTPException(status_code=400, detail="Invalid upgrade price")
    
    duration_days = card_durations.get(new_card_type, 365)
    
    # Generate payment reference
    payment_ref = f"SDM-UPGRADE-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Create payment record
    payment_record = {
        "id": str(uuid.uuid4()),
        "reference": payment_ref,
        "type": "card_upgrade",
        "phone": request.phone,
        "network": detect_network(request.phone),
        "amount": upgrade_price,
        "description": f"Upgrade to SDM {card_names[new_card_type]}",
        "client_id": client["id"],
        "status": "pending",
        "metadata": {
            "previous_card_type": current_card_type,
            "new_card_type": new_card_type,
            "card_name": card_names[new_card_type],
            "duration_days": duration_days,
            "is_upgrade": True
        },
        "provider": "hubtel_checkout",
        "provider_reference": None,
        "checkout_url": None,
        "test_mode": is_test_mode(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    await db.momo_payments.insert_one(payment_record)
    
    # In test mode, return for manual confirmation
    if is_test_mode():
        return {
            "success": True,
            "payment_id": payment_record["id"],
            "reference": payment_ref,
            "amount": upgrade_price,
            "previous_card": current_card_type,
            "new_card": new_card_type,
            "status": "pending",
            "test_mode": True,
            "use_checkout": False,
            "message": f"Test Mode: Upgrade payment of GHS {upgrade_price} initiated. Click 'Confirm Payment' to complete."
        }
    
    # Production: Use Hubtel Online Checkout API
    from services.hubtel_checkout_service import get_hubtel_checkout_service, HubtelCheckoutRequest
    
    hubtel_service = get_hubtel_checkout_service(db)
    
    frontend_url = os.environ.get("FRONTEND_URL", "https://sdmrewards.com")
    
    checkout_request = HubtelCheckoutRequest(
        amount=upgrade_price,
        description=f"Upgrade to SDM {card_names[new_card_type]} ({duration_days} days)",
        customer_phone=request.phone,
        client_reference=payment_ref,
        return_url=f"{frontend_url}/payment/success?ref={payment_ref}&upgrade=true",
        cancellation_url=f"{frontend_url}/payment/cancelled?ref={payment_ref}"
    )
    
    result = await hubtel_service.initiate_checkout(checkout_request)
    
    if result.success and result.checkout_url:
        await db.momo_payments.update_one(
            {"id": payment_record["id"]},
            {
                "$set": {
                    "status": "checkout_initiated",
                    "checkout_url": result.checkout_url,
                    "provider_reference": result.request_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "payment_id": payment_record["id"],
            "reference": payment_ref,
            "amount": upgrade_price,
            "previous_card": current_card_type,
            "new_card": new_card_type,
            "status": "checkout_initiated",
            "use_checkout": True,
            "checkout_url": result.checkout_url,
            "message": "Redirecting to Hubtel Checkout..."
        }
    else:
        error_msg = result.error or "Failed to initiate checkout"
        await db.momo_payments.update_one(
            {"id": payment_record["id"]},
            {
                "$set": {
                    "status": "failed",
                    "provider_message": error_msg,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        raise HTTPException(status_code=400, detail=error_msg)
