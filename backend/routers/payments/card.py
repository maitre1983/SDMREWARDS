"""
SDM REWARDS - Card Payment Routes
=================================
Handles card purchase payment initiation
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid
import logging

from .shared import (
    CardPaymentRequest, get_db, detect_network, is_test_mode,
    get_sms, logger
)

router = APIRouter()


@router.post("/card/initiate")
async def initiate_card_payment(request: CardPaymentRequest):
    """
    Initiate MoMo payment for VIP card purchase
    In test mode: returns pending payment ID for manual confirmation
    In production: sends MoMo prompt to phone
    """
    db = get_db()
    
    # Get card prices from platform config (single source of truth)
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    card_prices_config = config.get("card_prices", {}) if config else {}
    
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
    
    # Find client by phone
    client = await db.clients.find_one({"phone": request.phone}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found. Please register first.")
    
    # Check if already has an active card
    if client.get("card_type") and client.get("status") == "active":
        raise HTTPException(status_code=400, detail="You already have an active membership card")
    
    # Detect network
    network = detect_network(request.phone)
    if not network:
        raise HTTPException(status_code=400, detail="Invalid phone number or unsupported network")
    
    # Handle referrer - check both request and client record
    referrer_id = None
    
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
            referrer = await db.clients.find_one(
                {"referral_code": client.get("referred_by")},
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
            "referrer_id": referrer_id
        },
        "provider_reference": None,
        "provider_message": None,
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
            "amount": amount,
            "card_type": card_type,
            "status": "pending",
            "test_mode": True,
            "message": f"Payment of GHS {amount} initiated for {card_name}. Use /api/payments/test/confirm/{payment_record['id']} to complete."
        }
    
    # Production: Call Hubtel MoMo Collection API
    from services.hubtel_momo_service import get_hubtel_momo_service
    
    hubtel_service = get_hubtel_momo_service(db)
    
    result = await hubtel_service.collect_momo(
        phone=request.phone,
        amount=amount,
        description=f"SDM Rewards {card_name} Card",
        client_reference=payment_ref
    )
    
    if result.get("success"):
        await db.momo_payments.update_one(
            {"id": payment_record["id"]},
            {
                "$set": {
                    "status": "processing",
                    "provider": "hubtel",
                    "provider_reference": result.get("transaction_id"),
                    "provider_message": result.get("message"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Send SMS notification
        try:
            sms = get_sms()
            await sms.notify_payment_pending(request.phone, amount, card_name)
        except Exception as e:
            logger.error(f"SMS notification error: {e}")
        
        return {
            "success": True,
            "payment_id": payment_record["id"],
            "reference": payment_ref,
            "amount": amount,
            "status": "processing",
            "test_mode": result.get("test_mode", False),
            "message": "MoMo prompt sent to your phone. Please approve the payment."
        }
    else:
        error_msg = result.get("error", "Payment initiation failed")
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
