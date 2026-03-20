"""
SDM REWARDS - Payment Processing Logic
======================================
Core payment completion and processing functions
Uses Hubtel for all payment operations
"""

from datetime import datetime, timezone, timedelta
from typing import Dict
import uuid
import httpx
import os
import logging

from .shared import (
    get_db, get_sms, get_gamification, is_test_mode,
    HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, logger
)

# ============== MAIN COMPLETION ==============

async def complete_payment(payment_id: str):
    """
    Process completed payment - update client/merchant records.
    
    This is the CORE function that:
    1. Updates payment status to 'success'
    2. Credits cashback to client
    3. Records transaction in transactions collection
    4. Triggers gamification, SMS notifications, etc.
    
    MUST be called when a payment is confirmed (via webhook or status check).
    """
    db = get_db()
    logger.info(f"🎯 [COMPLETE_PAYMENT] Starting for payment_id: {payment_id}")
    
    payment = await db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
    
    if not payment:
        logger.error(f"❌ [COMPLETE_PAYMENT] Payment not found: {payment_id}")
        return
    
    # Check if already processed to avoid double-crediting
    if payment.get("status") == "success" and payment.get("completed_at"):
        # Check if transaction already exists
        existing_txn = await db.transactions.find_one(
            {"payment_reference": payment.get("reference")},
            {"_id": 0, "id": 1}
        )
        if existing_txn:
            logger.info(f"⚠️ [COMPLETE_PAYMENT] Payment {payment_id} already processed - transaction exists")
            return
    
    logger.info(f"🎯 [COMPLETE_PAYMENT] Payment found - type: {payment.get('type')}, amount: {payment.get('amount')}")
    
    # Update payment status
    await db.momo_payments.update_one(
        {"id": payment_id},
        {
            "$set": {
                "status": "success",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Handle based on payment type
    if payment["type"] == "card_purchase":
        logger.info("🎯 [COMPLETE_PAYMENT] Processing card_purchase")
        await process_card_purchase(payment)
    elif payment["type"] == "merchant_payment":
        logger.info("🎯 [COMPLETE_PAYMENT] Processing merchant_payment")
        await process_merchant_payment(payment)
    elif payment["type"] == "card_upgrade":
        logger.info("🎯 [COMPLETE_PAYMENT] Processing card_upgrade")
        await process_card_upgrade(payment)
    else:
        logger.warning(f"⚠️ [COMPLETE_PAYMENT] Unknown payment type: {payment.get('type')}")
    
    logger.info(f"✅ [COMPLETE_PAYMENT] Completed for payment_id: {payment_id}")


# ============== CARD PURCHASE ==============

async def process_card_purchase(payment: Dict):
    """Process completed card purchase"""
    db = get_db()
    client_id = payment["client_id"]
    metadata = payment.get("metadata", {})
    card_type = metadata.get("card_type", "silver")
    referrer_id = metadata.get("referrer_id")
    
    # Get client info
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    
    # Update client with card
    await db.clients.update_one(
        {"id": client_id},
        {
            "$set": {
                "status": "active",
                "card_type": card_type,
                "card_purchased_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Create membership card record
    card_number = f"SDM-{card_type.upper()[:1]}-{str(uuid.uuid4())[:8].upper()}"
    await db.membership_cards.insert_one({
        "id": str(uuid.uuid4()),
        "card_number": card_number,
        "client_id": client_id,
        "card_type": card_type,
        "purchase_amount": payment["amount"],
        "payment_id": payment["id"],
        "payment_reference": payment["reference"],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Record transaction
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "type": "card_purchase",
        "client_id": client_id,
        "amount": payment["amount"],
        "description": f"{card_type.capitalize()} Card Purchase",
        "payment_method": "momo",
        "payment_reference": payment["reference"],
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Get bonuses config
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    referrer_bonus = config.get("referrer_bonus", 3.0) if config else 3.0
    
    welcome_bonus_defaults = {"silver": 1.0, "gold": 2.0, "platinum": 3.0}
    if config and config.get("welcome_bonuses"):
        welcome_bonus = config.get("welcome_bonuses").get(card_type.lower(), welcome_bonus_defaults.get(card_type.lower(), 1.0))
    else:
        welcome_bonus = welcome_bonus_defaults.get(card_type.lower(), 1.0)
    
    logger.info(f"Processing card purchase: client={client_id}, card={card_type}, welcome_bonus={welcome_bonus}")
    
    # Credit welcome bonus
    await db.clients.update_one(
        {"id": client_id},
        {"$inc": {"cashback_balance": welcome_bonus}}
    )
    
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "type": "welcome_bonus",
        "client_id": client_id,
        "amount": welcome_bonus,
        "description": f"Welcome Bonus - {card_type.capitalize()} Card Activation",
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send SMS
    try:
        sms = get_sms()
        if client and client.get("phone"):
            await sms.notify_card_purchase(client["phone"], card_type, payment["amount"], welcome_bonus)
    except Exception as e:
        logger.error(f"Card purchase SMS error: {e}")
    
    # Process referral bonus
    if referrer_id:
        await _process_referral_bonus(client_id, referrer_id, referrer_bonus, client)


async def _process_referral_bonus(client_id: str, referrer_id: str, referrer_bonus: float, client: Dict):
    """Process referral bonus for referrer"""
    db = get_db()
    referrer = await db.clients.find_one({"id": referrer_id}, {"_id": 0})
    
    if not referrer:
        logger.warning(f"Referrer not found: {referrer_id}")
        return
    
    # Credit referrer
    await db.clients.update_one(
        {"id": referrer_id},
        {"$inc": {"cashback_balance": referrer_bonus}}
    )
    
    referred_name = client.get("full_name", "New User") if client else "New User"
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "type": "referral_bonus",
        "client_id": referrer_id,
        "referred_id": client_id,
        "amount": referrer_bonus,
        "description": f"Referral Bonus - {referred_name} joined",
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Update referral record
    await db.referrals.update_one(
        {"referrer_id": referrer_id, "referred_id": client_id},
        {
            "$set": {
                "card_purchased": True,
                "bonuses_paid": True,
                "referrer_bonus": referrer_bonus,
                "bonus_paid_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    logger.info(f"Referral bonus of GHS {referrer_bonus} credited to referrer {referrer_id}")
    
    # Send SMS to referrer
    try:
        sms = get_sms()
        if referrer.get("phone"):
            await sms.notify_referral_bonus(referrer["phone"], referrer_bonus, referred_name)
    except Exception as e:
        logger.error(f"Referral SMS error: {e}")


# ============== MERCHANT PAYMENT ==============

async def process_merchant_payment(payment: Dict):
    """Process completed merchant payment - credit cashback and pay merchant"""
    db = get_db()
    logger.info(f"💰 [MERCHANT_PAYMENT] Processing: {payment.get('id')}")
    
    client_id = payment["client_id"]
    metadata = payment.get("metadata", {})
    merchant_id = metadata.get("merchant_id") or payment.get("merchant_id")
    
    if not merchant_id:
        logger.error(f"❌ [MERCHANT_PAYMENT] No merchant_id found in payment {payment.get('id')}")
        return
    
    logger.info(f"💰 [MERCHANT_PAYMENT] client_id: {client_id}, merchant_id: {merchant_id}")
    
    # Get client and merchant
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    merchant = await db.merchants.find_one({"id": merchant_id}, {"_id": 0})
    
    if not merchant:
        logger.error(f"❌ [MERCHANT_PAYMENT] Merchant not found: {merchant_id}")
        return
    
    if not client:
        logger.warning(f"⚠️ [MERCHANT_PAYMENT] Client not found: {client_id}")
    
    # Calculate cashback
    cashback_rate = merchant.get("cashback_rate", 5) / 100
    gross_cashback = round(payment["amount"] * cashback_rate, 2)
    
    # Get platform commission
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    platform_commission_rate = config.get("platform_commission_rate", 5) / 100 if config else 0.05
    
    commission = round(gross_cashback * platform_commission_rate, 2)
    net_cashback = gross_cashback - commission
    merchant_share = round(payment["amount"] - gross_cashback, 2)
    
    logger.info(f"💰 [MERCHANT_PAYMENT] Cashback: gross={gross_cashback}, net={net_cashback}, commission={commission}")
    
    # Credit cashback to client
    result = await db.clients.update_one(
        {"id": client_id},
        {"$inc": {"cashback_balance": net_cashback}}
    )
    logger.info(f"💰 [MERCHANT_PAYMENT] Credited cashback to client: modified={result.modified_count}")
    
    # Update merchant stats
    await db.merchants.update_one(
        {"id": merchant_id},
        {
            "$inc": {
                "total_volume": payment["amount"],
                "total_transactions": 1,
                "total_cashback_given": gross_cashback,
                "pending_balance": merchant_share
            }
        }
    )
    
    # Record transaction - THIS IS CRITICAL FOR "RECENT ACTIVITY"
    transaction_id = str(uuid.uuid4())
    transaction_doc = {
        "id": transaction_id,
        "type": "merchant_payment",
        "client_id": client_id,
        "merchant_id": merchant_id,
        "amount": payment["amount"],
        "cashback_amount": gross_cashback,
        "commission_amount": commission,
        "net_cashback": net_cashback,
        "merchant_share": merchant_share,
        "description": f"Payment at {merchant.get('business_name', 'Merchant')}",
        "payment_method": "momo",
        "payment_reference": payment["reference"],
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    insert_result = await db.transactions.insert_one(transaction_doc)
    logger.info(f"✅ [MERCHANT_PAYMENT] Transaction recorded: {transaction_id}, inserted={insert_result.inserted_id is not None}")
    
    # Gamification
    try:
        gamification = get_gamification()
        await gamification.update_mission_progress(client_id, "transaction", 1)
        await gamification.update_mission_progress(client_id, "spend", payment["amount"])
        await gamification.update_mission_progress(client_id, "unique_merchants", 1)
        await gamification.update_activity_streak(client_id)
        
        base_xp = 5
        spend_xp = int(payment["amount"] / 10)
        await gamification.add_xp(client_id, base_xp + spend_xp, f"Payment at {merchant.get('business_name', 'Merchant')}")
        await gamification.check_and_award_badges(client_id)
    except Exception as e:
        logger.error(f"Gamification update error: {e}")
    
    # Auto-pay merchant
    await _process_merchant_payout(merchant, merchant_share, transaction_id)
    
    # SMS notifications
    try:
        sms = get_sms()
        if client and client.get("phone"):
            await sms.notify_payment_received(
                client["phone"], 
                payment["amount"], 
                merchant.get("business_name", "Merchant"),
                net_cashback
            )
        if merchant.get("phone"):
            client_name = client.get("full_name", "A customer") if client else "A customer"
            await sms.notify_merchant_payment(merchant["phone"], payment["amount"], client_name)
    except Exception as e:
        logger.error(f"Merchant payment SMS error: {e}")
    
    # Real-time push notification to merchant via SSE
    try:
        from routers.notifications_sse import notify_merchant_payment
        client_name = client.get("full_name", "Customer") if client else "Customer"
        await notify_merchant_payment(
            merchant_id=merchant_id,
            payment_data={
                "amount": payment["amount"],
                "cashback": gross_cashback,
                "client_name": client_name,
                "payment_method": "momo",
                "transaction_id": transaction_id
            }
        )
        logger.info(f"📢 [MERCHANT_PAYMENT] SSE notification sent to merchant {merchant_id[:8]}...")
    except Exception as e:
        logger.error(f"SSE notification error: {e}")


async def _process_merchant_payout(merchant: Dict, merchant_share: float, transaction_id: str):
    """
    Process automatic payout to merchant after a successful payment.
    
    This function:
    1. Checks if merchant has MoMo configured for payouts
    2. Creates a payout record
    3. Sends funds to merchant via Hubtel Send Money API
    4. Updates merchant balance
    
    SDM does not hold merchant funds - payments are forwarded instantly.
    """
    db = get_db()
    merchant_id = merchant.get("id", "unknown")
    
    logger.info(f"💸 [MERCHANT_PAYOUT] Starting for merchant {merchant_id[:8]}..., amount: GHS {merchant_share:.2f}")
    
    if merchant_share <= 0:
        logger.info("💸 [MERCHANT_PAYOUT] Skipping - amount is zero or negative")
        return
    
    # Get payout configuration
    preferred_method = merchant.get("preferred_payout_method", "momo")
    merchant_momo = merchant.get("momo_number")
    merchant_network = merchant.get("momo_network", "MTN MoMo").upper()
    
    logger.info(f"💸 [MERCHANT_PAYOUT] Payout method: {preferred_method}, MoMo: {merchant_momo}, Network: {merchant_network}")
    
    # For now, only MoMo payouts are supported
    if preferred_method == "bank":
        logger.warning(f"💸 [MERCHANT_PAYOUT] Bank payouts not yet implemented for {merchant_id[:8]}...")
        # Store in pending balance for manual processing
        return
    
    if not merchant_momo:
        logger.warning(f"💸 [MERCHANT_PAYOUT] No MoMo number configured for merchant {merchant_id[:8]}... - funds stored in pending_balance")
        return
    
    payout_ref = f"SDM-PAYOUT-{uuid.uuid4().hex[:8].upper()}"
    
    payout_record = {
        "id": str(uuid.uuid4()),
        "type": "merchant_payout",
        "payout_method": "momo",
        "merchant_id": merchant["id"],
        "transaction_id": transaction_id,
        "amount": merchant_share,
        "phone": merchant_momo,
        "network": merchant_network,
        "reference": payout_ref,
        "status": "pending",
        "test_mode": is_test_mode(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.merchant_payouts.insert_one(payout_record)
    
    if is_test_mode():
        logger.info(f"TEST MODE: Simulating merchant payout of GHS {merchant_share}")
        await db.merchant_payouts.update_one(
            {"id": payout_record["id"]},
            {"$set": {"status": "completed", "provider_message": "Test mode - simulated"}}
        )
        await db.merchants.update_one(
            {"id": merchant["id"]},
            {"$inc": {"pending_balance": -merchant_share, "total_paid_out": merchant_share}}
        )
        return
    
    # Production: Use Hubtel Send Money
    try:
        from services.hubtel_momo_service import get_hubtel_momo_service
        hubtel_service = get_hubtel_momo_service(db)
        
        # Normalize network to Hubtel channel format
        network_map = {
            "MTN": "mtn-gh",
            "MTN MOMO": "mtn-gh",
            "VODAFONE": "vodafone-gh",
            "VODAFONE CASH": "vodafone-gh",
            "TELECEL": "tigo-gh",
            "TIGO": "tigo-gh",
            "AIRTELTIGO": "tigo-gh"
        }
        hubtel_channel = network_map.get(merchant_network, "mtn-gh")
        
        result = await hubtel_service.send_momo(
            phone=merchant_momo,
            amount=merchant_share,
            description=f"SDM Rewards payment - {payout_ref}",
            client_reference=payout_ref,
            recipient_name=merchant.get("business_name", "Merchant"),
            channel=hubtel_channel
        )
        
        if result.get("success"):
            logger.info(f"✅ [MERCHANT_PAYOUT] SUCCESS - Sent GHS {merchant_share:.2f} to {merchant_momo}, ref: {result.get('transaction_id')}")
            await db.merchant_payouts.update_one(
                {"id": payout_record["id"]},
                {"$set": {
                    "status": "completed",
                    "provider_reference": result.get("transaction_id"),
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            await db.merchants.update_one(
                {"id": merchant["id"]},
                {"$inc": {"pending_balance": -merchant_share, "total_paid_out": merchant_share}}
            )
            
            # Send SMS notification to merchant about payout
            try:
                sms = get_sms()
                if merchant.get("phone"):
                    await sms.send_sms(
                        merchant["phone"],
                        f"SDM Rewards: GHS {merchant_share:.2f} has been sent to your MoMo {merchant_momo}. Ref: {payout_ref}"
                    )
            except Exception as sms_error:
                logger.error(f"Payout SMS error: {sms_error}")
        else:
            logger.error(f"❌ [MERCHANT_PAYOUT] FAILED - {result.get('error')}")
            await db.merchant_payouts.update_one(
                {"id": payout_record["id"]},
                {"$set": {"status": "failed", "provider_message": result.get("error")}}
            )
    except Exception as e:
        logger.error(f"Merchant payout error: {e}")
        await db.merchant_payouts.update_one(
            {"id": payout_record["id"]},
            {"$set": {"status": "failed", "provider_message": str(e)}}
        )


# ============== CARD UPGRADE ==============

async def process_card_upgrade(payment: Dict):
    """Process completed card upgrade"""
    db = get_db()
    client_id = payment["client_id"]
    from_card = payment.get("from_card_type", "silver")
    to_card = payment.get("to_card_type", "gold")
    new_duration_days = payment.get("new_duration_days", 365)
    welcome_bonus = payment.get("welcome_bonus", 0)
    cashback_used = payment.get("cashback_used", 0)
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        logger.error(f"Card upgrade: Client {client_id} not found")
        return
    
    now = datetime.now(timezone.utc)
    new_expires_at = now + timedelta(days=new_duration_days)
    
    # Get welcome bonus from config if not in payment
    if welcome_bonus == 0:
        config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
        if config:
            welcome_bonuses = config.get("welcome_bonuses", {})
            default_bonuses = {"silver": 1.0, "gold": 2.0, "platinum": 3.0}
            welcome_bonus = welcome_bonuses.get(to_card, default_bonuses.get(to_card, 1.0))
    
    # Update client
    await db.clients.update_one(
        {"id": client_id},
        {
            "$set": {
                "card_type": to_card,
                "card_purchased_at": now.isoformat(),
                "card_expires_at": new_expires_at.isoformat(),
                "card_duration_days": new_duration_days,
                "updated_at": now.isoformat()
            },
            "$inc": {"cashback_balance": welcome_bonus}
        }
    )
    
    # Update membership card
    await db.membership_cards.update_one(
        {"client_id": client_id, "is_active": True},
        {
            "$set": {
                "card_type": to_card,
                "expires_at": new_expires_at.isoformat(),
                "upgraded_at": now.isoformat(),
                "upgraded_from": from_card,
                "upgrade_amount": payment["amount"],
                "welcome_bonus_credited": welcome_bonus
            }
        }
    )
    
    # Record transactions
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "type": "card_upgrade",
        "client_id": client_id,
        "amount": payment["amount"],
        "description": f"Upgrade {from_card.upper()} → {to_card.upper()}",
        "payment_method": "momo" if payment.get("momo_amount", 0) > 0 else "cashback",
        "payment_reference": payment.get("reference", payment["id"]),
        "status": "completed",
        "metadata": {
            "from_card": from_card,
            "to_card": to_card,
            "new_duration_days": new_duration_days,
            "cashback_used": cashback_used
        },
        "created_at": now.isoformat()
    })
    
    if welcome_bonus > 0:
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "type": "welcome_bonus",
            "client_id": client_id,
            "amount": welcome_bonus,
            "description": f"Welcome bonus for {to_card.upper()} upgrade",
            "status": "completed",
            "created_at": now.isoformat()
        })
    
    # Send SMS
    try:
        if client.get("phone"):
            sms = get_sms()
            message = f"Congratulations! Your SDM card has been upgraded to {to_card.upper()}. Welcome bonus of GHS {welcome_bonus:.2f} credited. Card valid for {new_duration_days} days."
            await sms.send_raw_sms(client["phone"], message)
    except Exception as e:
        logger.error(f"Card upgrade SMS error: {e}")
