"""
SDM REWARDS - Payment Router
============================
Handles MoMo payment collection for VIP cards and merchant payments
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone, timedelta
import uuid
import os
import httpx
import logging

# Import auth dependency
from routers.auth import get_current_client

router = APIRouter()
logger = logging.getLogger(__name__)

# Database reference (set from server.py)
db = None

def set_db(database):
    global db
    db = database

# ============== CONFIG ==============
BULKCLIX_API_KEY = os.environ.get("BULKCLIX_API_KEY", "")
BULKCLIX_BASE_URL = os.environ.get("BULKCLIX_BASE_URL", "https://api.bulkclix.com/api/v1")
CALLBACK_BASE_URL = os.environ.get("CALLBACK_BASE_URL", "")
PAYMENT_TEST_MODE = os.environ.get("PAYMENT_TEST_MODE", "true").lower() == "true"

# Import SMS service (lazy)
_sms_service = None

def get_sms():
    global _sms_service
    if _sms_service is None:
        from services.sms_service import SMSService
        _sms_service = SMSService(db)
    return _sms_service

# Import Gamification service (lazy)
_gamification_service = None

def get_gamification():
    global _gamification_service
    if _gamification_service is None:
        from services.gamification_service import GamificationService
        _gamification_service = GamificationService(db)
    return _gamification_service


# Import Push Notification service (lazy)
_push_service = None

def get_push_service():
    global _push_service
    if _push_service is None:
        from push_notifications import OneSignalService
        _push_service = OneSignalService(db)
    return _push_service


# ============== HELPERS ==============
def detect_network(phone: str) -> Optional[str]:
    """Detect network provider from phone number (Ghana networks)"""
    phone = phone.replace(" ", "").replace("-", "")
    if phone.startswith("+233"):
        phone = "0" + phone[4:]
    elif phone.startswith("233"):
        phone = "0" + phone[3:]
    
    # Ghana Mobile Network Prefixes (2025 updated)
    # MTN Ghana - largest operator
    mtn_prefixes = ["024", "025", "053", "054", "055", "059"]
    # Telecel Ghana (formerly Vodafone Ghana)
    telecel_prefixes = ["020", "050"]
    # AirtelTigo (AT) - merger of Airtel and Tigo
    airteltigo_prefixes = ["026", "027", "056", "057"]
    
    prefix = phone[:3] if len(phone) >= 3 else ""
    
    if prefix in mtn_prefixes:
        return "MTN"
    elif prefix in telecel_prefixes:
        return "TELECEL"
    elif prefix in airteltigo_prefixes:
        return "AIRTELTIGO"
    
    return None


def normalize_network(network: str) -> str:
    """Normalize network name for BulkClix API compatibility"""
    if not network:
        return network
    network_upper = network.upper()
    # Map TELECEL back to VODAFONE for BulkClix API if needed
    # (BulkClix may still use VODAFONE internally)
    network_mapping = {
        "TELECEL": "TELECEL",  # Use TELECEL for BulkClix
        "VODAFONE": "TELECEL",  # Legacy support
        "MTN": "MTN",
        "AIRTELTIGO": "AIRTELTIGO",
        "AT": "AIRTELTIGO"  # Alias support
    }
    return network_mapping.get(network_upper, network_upper)


def is_test_mode() -> bool:
    """Check if running in test mode"""
    return PAYMENT_TEST_MODE or not BULKCLIX_API_KEY


# ============== SCHEMAS ==============
class CardPaymentRequest(BaseModel):
    phone: str
    card_type: str  # silver, gold, platinum
    referrer_code: Optional[str] = None


class MerchantPaymentRequest(BaseModel):
    client_phone: str
    merchant_qr_code: str
    amount: float
    network: Optional[str] = None  # Client can specify network


class ClientCashPaymentRequest(BaseModel):
    """Client-initiated cash payment to merchant"""
    client_phone: str
    merchant_qr_code: str
    amount: float


# ============== ENDPOINTS ==============

@router.post("/card/initiate")
async def initiate_card_payment(request: CardPaymentRequest):
    """
    Initiate MoMo payment for VIP card purchase
    In test mode: returns pending payment ID for manual confirmation
    In production: sends MoMo prompt to phone
    """
    # Validate card type
    card_prices = {"silver": 25, "gold": 50, "platinum": 100}
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
        # Check referrals collection for this client as referred
        existing_referral = await db.referrals.find_one(
            {"referred_id": client["id"], "bonuses_paid": {"$ne": True}},
            {"_id": 0, "referrer_id": 1}
        )
        if existing_referral:
            referrer_id = existing_referral.get("referrer_id")
        
        # Also check client's referred_by field (which stores referral_code)
        if not referrer_id and client.get("referred_by"):
            # referred_by contains the referral_code, find the referrer by code
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


@router.post("/merchant/initiate")
async def initiate_merchant_payment(request: MerchantPaymentRequest):
    """
    Initiate payment to merchant (for earning cashback)
    Client scans merchant QR and pays
    """
    if request.amount < 1:
        raise HTTPException(status_code=400, detail="Minimum payment is GHS 1")
    
    # Find client
    client = await db.clients.find_one({"phone": request.client_phone}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client.get("status") != "active":
        raise HTTPException(status_code=400, detail="Please purchase a membership card first")
    
    # Find merchant by QR code
    merchant = await db.merchants.find_one({"payment_qr_code": request.merchant_qr_code}, {"_id": 0})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    if merchant.get("status") != "active":
        raise HTTPException(status_code=400, detail="Merchant is not active")
    
    # Calculate expected cashback
    cashback_rate = merchant.get("cashback_rate", 5) / 100
    expected_cashback = round(request.amount * cashback_rate, 2)
    
    # Use specified network or detect from phone
    network = request.network.upper() if request.network else detect_network(request.client_phone)
    if not network:
        raise HTTPException(status_code=400, detail="Invalid phone number or network not specified")
    
    # Generate payment reference
    payment_ref = f"SDM-PAY-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Create payment record
    payment_record = {
        "id": str(uuid.uuid4()),
        "reference": payment_ref,
        "type": "merchant_payment",
        "phone": request.client_phone,
        "network": network,
        "amount": request.amount,
        "description": f"Payment at {merchant['business_name']}",
        "client_id": client["id"],
        "merchant_id": merchant["id"],
        "status": "pending",
        "metadata": {
            "merchant_id": merchant["id"],
            "merchant_name": merchant["business_name"],
            "cashback_rate": merchant.get("cashback_rate", 5),
            "expected_cashback": expected_cashback
        },
        "provider_reference": None,
        "test_mode": is_test_mode(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    await db.momo_payments.insert_one(payment_record)
    
    # Test mode response
    if is_test_mode():
        return {
            "success": True,
            "payment_id": payment_record["id"],
            "reference": payment_ref,
            "amount": request.amount,
            "merchant": merchant["business_name"],
            "expected_cashback": expected_cashback,
            "status": "pending",
            "test_mode": True,
            "message": f"Payment initiated. Use /api/payments/test/confirm/{payment_record['id']} to complete."
        }
    
    # Production: Call Hubtel MoMo Collection API
    from services.hubtel_momo_service import get_hubtel_momo_service
    
    hubtel_service = get_hubtel_momo_service(db)
    
    result = await hubtel_service.collect_momo(
        phone=request.client_phone,
        amount=request.amount,
        description=f"Payment to {merchant['business_name']}",
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
        
        return {
            "success": True,
            "payment_id": payment_record["id"],
            "reference": payment_ref,
            "amount": request.amount,
            "merchant": merchant["business_name"],
            "expected_cashback": expected_cashback,
            "status": "processing",
            "test_mode": result.get("test_mode", False),
            "message": "Please approve the MoMo prompt on your phone"
        }
    else:
        # Payment initiation failed
        await db.momo_payments.update_one(
            {"id": payment_record["id"]},
            {"$set": {"status": "failed", "provider_message": result.get("error", "Payment initiation failed")}}
        )
        raise HTTPException(status_code=400, detail=result.get("error", "Payment initiation failed"))


@router.post("/merchant/cash")
async def initiate_cash_payment(request: ClientCashPaymentRequest):
    """
    Client-initiated cash payment to merchant
    - Creates pending transaction requiring merchant confirmation
    - Max 3 pending confirmations per client
    - Expires after 72 hours if not confirmed
    - Cashback only credited after merchant confirms
    """
    if request.amount < 1:
        raise HTTPException(status_code=400, detail="Minimum payment is GHS 1")
    
    # Find client
    client = await db.clients.find_one({"phone": request.client_phone}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client.get("status") != "active":
        raise HTTPException(status_code=400, detail="Please purchase a membership card first")
    
    # Check max pending confirmations per client (limit: 3)
    pending_count = await db.transactions.count_documents({
        "client_id": client["id"],
        "payment_method": "cash",
        "status": "pending_confirmation"
    })
    
    if pending_count >= 3:
        raise HTTPException(
            status_code=400, 
            detail="You have 3 pending cash payments awaiting confirmation. Please wait for merchant to confirm previous payments."
        )
    
    # Find merchant by QR code
    merchant = await db.merchants.find_one({"payment_qr_code": request.merchant_qr_code}, {"_id": 0})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    if merchant.get("status") != "active":
        raise HTTPException(status_code=400, detail="Merchant is not active")
    
    # Check merchant's debit account
    debit_account = merchant.get("debit_account", {})
    current_balance = debit_account.get("balance", 0)
    debit_limit = debit_account.get("limit", 0)
    is_blocked = debit_account.get("is_blocked", False)
    
    # Calculate cashback (using 95% of rate like MoMo payments)
    cashback_rate = merchant.get("cashback_rate", 5) / 100
    cashback_amount = round(request.amount * cashback_rate * 0.95, 2)
    
    # SDM commission (5% of cashback)
    sdm_commission = round(request.amount * cashback_rate * 0.05, 2)
    
    # IMPORTANT: If no debit limit configured, cash payments are not allowed
    if debit_limit <= 0:
        raise HTTPException(
            status_code=400, 
            detail="Cash payments not available. This merchant has no debit limit configured. Please pay with MoMo."
        )
    
    # Check if merchant's debit account is blocked
    if is_blocked:
        raise HTTPException(
            status_code=400, 
            detail="Cash payments blocked. Merchant's debit limit has been reached. Please pay with MoMo."
        )
    
    # Calculate new balance after this transaction (to check if it would exceed limit)
    new_balance = current_balance - cashback_amount
    
    # Check if this transaction would exceed the debit limit
    if abs(new_balance) > debit_limit:
        raise HTTPException(
            status_code=400, 
            detail=f"Cash payment would exceed merchant's debit limit. Please pay with MoMo or use a smaller amount."
        )
    
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=72)  # 72-hour expiration
    transaction_id = str(uuid.uuid4())
    payment_ref = f"SDM-CASH-{now.strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Create main transaction with PENDING_CONFIRMATION status
    transaction = {
        "id": transaction_id,
        "reference": payment_ref,
        "type": "payment",
        "payment_method": "cash",
        "client_id": client["id"],
        "client_phone": client.get("phone"),
        "client_name": client.get("full_name"),
        "merchant_id": merchant["id"],
        "merchant_name": merchant.get("business_name"),
        "amount": request.amount,
        "cashback_rate": merchant.get("cashback_rate", 5),
        "cashback_amount": cashback_amount,
        "sdm_commission": sdm_commission,
        "status": "pending_confirmation",  # PENDING - requires merchant confirmation
        "description": f"Cash payment at {merchant['business_name']}",
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat()
    }
    await db.transactions.insert_one(transaction)
    
    # NOTE: Cashback NOT credited - will be credited when merchant confirms
    # NOTE: Merchant debit NOT debited - will be debited when merchant confirms
    
    # Send push notification to merchant about pending cash payment
    try:
        from push_notifications import PushNotificationPayload
        push_service = get_push_service()
        
        notification_payload = PushNotificationPayload(
            title="💵 Pending Cash Payment",
            message=f"{client.get('full_name', 'A customer')} paid GHS {request.amount:.2f} in cash. Please confirm receipt.",
            url="/merchant",  # Redirect to merchant dashboard
            data={
                "type": "cash_payment_pending",
                "transaction_id": transaction_id,
                "amount": request.amount,
                "client_name": client.get("full_name", "Customer"),
                "cashback_amount": cashback_amount
            }
        )
        
        push_result = await push_service.send_to_user(merchant["id"], notification_payload)
        logger.info(f"Push notification to merchant {merchant['id']}: {push_result}")
    except Exception as e:
        logger.error(f"Failed to send push notification to merchant: {e}")
        # Don't fail the transaction if push fails
    
    logger.info(f"Cash payment pending confirmation: {payment_ref}, amount={request.amount}, cashback={cashback_amount}")
    
    return {
        "success": True,
        "payment_id": transaction_id,
        "reference": payment_ref,
        "amount": request.amount,
        "merchant": merchant["business_name"],
        "cashback_amount": cashback_amount,
        "status": "pending_confirmation",
        "payment_method": "cash",
        "expires_at": expires_at.isoformat(),
        "message": f"Payment recorded! Awaiting merchant confirmation. Cashback will be credited once confirmed."
    }


# ============== CASHBACK PAYMENT ENDPOINT ==============

class CashbackPaymentRequest(BaseModel):
    client_phone: str
    merchant_qr_code: str
    amount: float
    payment_method: str  # "cashback" or "hybrid"
    cashback_to_use: float
    momo_amount: float = 0
    momo_phone: Optional[str] = None


@router.post("/merchant/cashback")
async def process_cashback_merchant_payment(
    request: CashbackPaymentRequest,
    current_user: dict = Depends(get_current_client)
):
    """
    Process payment to merchant using cashback (full or hybrid).
    
    Payment methods:
    - cashback: 100% payment from client's cashback balance
    - hybrid: Part cashback + part MoMo
    
    Flow:
    1. Deduct cashback from client's balance
    2. If hybrid, initiate MoMo payment for remaining
    3. Credit merchant (no debit account impact for cashback)
    4. Award new cashback based on merchant rate (only on MoMo portion)
    """
    if request.amount < 1:
        raise HTTPException(status_code=400, detail="Minimum payment is GHS 1")
    
    # Find client by their authenticated ID
    client = await db.clients.find_one({"id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client.get("status") != "active":
        raise HTTPException(status_code=400, detail="Please purchase a membership card first")
    
    current_cashback = client.get("cashback_balance", 0)
    
    # Validate cashback usage
    if request.cashback_to_use > current_cashback:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient cashback balance. Available: GHS {current_cashback:.2f}"
        )
    
    if request.cashback_to_use + request.momo_amount < request.amount:
        raise HTTPException(
            status_code=400,
            detail="Payment amounts don't add up to the total"
        )
    
    # Find merchant by QR code
    merchant = await db.merchants.find_one({"payment_qr_code": request.merchant_qr_code}, {"_id": 0})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    if merchant.get("status") != "active":
        raise HTTPException(status_code=400, detail="Merchant is not active")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    payment_ref = f"SDM-CB-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Calculate cashback earned (only on MoMo portion, not on cashback portion)
    # When paying with cashback, you don't earn cashback on that portion
    cashback_rate = merchant.get("cashback_rate", 5) / 100
    momo_portion = request.momo_amount if request.payment_method == "hybrid" else 0
    cashback_earned = round(momo_portion * cashback_rate * 0.95, 2)
    sdm_commission = round(momo_portion * cashback_rate * 0.05, 2) if momo_portion > 0 else 0
    
    # 1. Deduct cashback from client's balance
    new_cashback_balance = round(current_cashback - request.cashback_to_use + cashback_earned, 2)
    await db.clients.update_one(
        {"id": client["id"]},
        {"$set": {"cashback_balance": new_cashback_balance, "updated_at": now}}
    )
    
    # 2. Create main transaction (synced for Client, Merchant, Admin)
    transaction = {
        "id": transaction_id,
        "reference": payment_ref,
        "type": "payment",
        "payment_method": request.payment_method,  # "cashback" or "hybrid"
        "client_id": client["id"],
        "client_phone": client.get("phone"),
        "client_name": client.get("full_name"),
        "merchant_id": merchant["id"],
        "merchant_name": merchant.get("business_name"),
        "amount": request.amount,
        "cashback_used": request.cashback_to_use,  # Track cashback spent
        "momo_amount": request.momo_amount,
        "cashback_rate": merchant.get("cashback_rate", 5),
        "cashback_amount": cashback_earned,  # New cashback earned
        "sdm_commission": sdm_commission,
        "status": "completed",
        "description": f"{'Cashback' if request.payment_method == 'cashback' else 'Hybrid'} payment at {merchant['business_name']}",
        "created_at": now
    }
    
    await db.transactions.insert_one(transaction)
    
    # 3. Update merchant stats (payment_volume)
    await db.merchants.update_one(
        {"id": merchant["id"]},
        {
            "$inc": {"stats.total_payments": 1, "stats.total_volume": request.amount},
            "$set": {"updated_at": now}
        }
    )
    
    # 4. Record client wallet transaction for cashback spent
    if request.cashback_to_use > 0:
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "client_id": client["id"],
            "type": "cashback_payment",
            "amount": -request.cashback_to_use,
            "balance_after": new_cashback_balance - cashback_earned,
            "description": f"Cashback used for payment at {merchant['business_name']}",
            "reference": payment_ref,
            "created_at": now
        })
    
    # 5. If earned new cashback, record it
    if cashback_earned > 0:
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "client_id": client["id"],
            "type": "cashback_earned",
            "amount": cashback_earned,
            "balance_after": new_cashback_balance,
            "description": f"Cashback from payment at {merchant['business_name']}",
            "reference": payment_ref,
            "created_at": now
        })
    
    logger.info(f"Cashback payment completed: {payment_ref}, method={request.payment_method}, amount={request.amount}, cashback_used={request.cashback_to_use}, cashback_earned={cashback_earned}")
    
    return {
        "success": True,
        "payment_id": transaction_id,
        "reference": payment_ref,
        "amount": request.amount,
        "merchant": merchant["business_name"],
        "payment_method": request.payment_method,
        "cashback_used": request.cashback_to_use,
        "momo_paid": request.momo_amount,
        "cashback_earned": cashback_earned,
        "new_balance": new_cashback_balance,
        "status": "completed",
        "message": f"Payment successful! {'Cashback used: GHS ' + str(request.cashback_to_use) if request.cashback_to_use > 0 else ''}{' + MoMo: GHS ' + str(request.momo_amount) if request.momo_amount > 0 else ''}."
    }


@router.get("/status/{payment_id}")
async def get_payment_status(payment_id: str):
    """Check payment status"""
    payment = await db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {
        "success": True,
        "payment_id": payment["id"],
        "reference": payment["reference"],
        "type": payment["type"],
        "amount": payment["amount"],
        "status": payment["status"],
        "completed_at": payment.get("completed_at"),
        "test_mode": payment.get("test_mode", False)
    }


@router.get("/cash/status")
async def check_cash_payment_status(
    client_phone: str,
    merchant_id: str
):
    """
    Check the status of a pending cash payment.
    Returns the latest cash payment between this client and merchant.
    """
    # Normalize phone number - try multiple formats
    phone_variants = [client_phone]
    if client_phone.startswith('+'):
        phone_variants.append(client_phone[1:])  # Without +
        phone_variants.append(client_phone[4:])  # Without +233
    elif client_phone.startswith('233'):
        phone_variants.append('+' + client_phone)  # With +
        phone_variants.append(client_phone[3:])  # Without 233
    elif client_phone.startswith('0'):
        phone_variants.append('+233' + client_phone[1:])  # Convert 0 to +233
        phone_variants.append('233' + client_phone[1:])  # Convert 0 to 233
    else:
        phone_variants.append('+233' + client_phone)
        phone_variants.append('233' + client_phone)
        phone_variants.append('0' + client_phone)
    
    # Cash payments are stored in 'transactions' collection
    # They have type="payment" and payment_method="cash"
    payment = await db.transactions.find_one(
        {
            "payment_method": "cash",
            "client_phone": {"$in": phone_variants},
            "merchant_id": merchant_id,
            "status": {"$in": ["pending_confirmation", "confirmed", "completed"]}
        },
        {"_id": 0},
        sort=[("created_at", -1)]  # Most recent first
    )
    
    if not payment:
        # Try with client_id lookup
        client = await db.clients.find_one(
            {"phone": {"$in": phone_variants}}, 
            {"_id": 0, "id": 1}
        )
        if client:
            payment = await db.transactions.find_one(
                {
                    "payment_method": "cash",
                    "client_id": client["id"],
                    "merchant_id": merchant_id,
                    "status": {"$in": ["pending_confirmation", "confirmed", "completed"]}
                },
                {"_id": 0},
                sort=[("created_at", -1)]
            )
    
    if not payment:
        raise HTTPException(status_code=404, detail="No cash payment found")
    
    # Map status for frontend
    status = payment.get("status", "pending_confirmation")
    if status == "pending_confirmation":
        status = "pending"
    
    return {
        "success": True,
        "payment_id": payment.get("id"),
        "status": status,
        "amount": payment.get("amount"),
        "cashback_amount": payment.get("cashback_amount", 0),
        "confirmed_at": payment.get("confirmed_at"),
        "created_at": payment.get("created_at")
    }


@router.post("/callback")
async def payment_callback(request: Request):
    """BulkClix payment callback webhook"""
    try:
        data = await request.json()
    except Exception:
        data = dict(request.query_params)
    
    logger.info(f"Payment callback received: {data}")
    
    # BulkClix sends: transaction_id (our ref), ext_transaction_id (their ref)
    our_ref = data.get("transaction_id")
    ext_ref = data.get("ext_transaction_id")
    status = (data.get("status") or "").lower()
    
    if not our_ref and not ext_ref:
        logger.warning("Callback missing transaction references")
        return {"success": False, "message": "Missing reference"}
    
    # Find payment - try our reference first (exact match)
    payment = None
    if our_ref:
        payment = await db.momo_payments.find_one({"reference": our_ref}, {"_id": 0})
        if payment:
            logger.info(f"Found payment by our reference: {our_ref}")
    
    # If not found by our ref, try provider reference
    if not payment and ext_ref:
        payment = await db.momo_payments.find_one({"provider_reference": ext_ref}, {"_id": 0})
        if payment:
            logger.info(f"Found payment by provider reference: {ext_ref}")
    
    if not payment:
        logger.warning(f"Payment not found for refs: our={our_ref}, ext={ext_ref}")
        return {"success": False, "message": "Payment not found"}
    
    logger.info(f"Processing callback for payment {payment['id']} (ref: {payment.get('reference')}), status: {status}")
    
    if status in ["success", "successful", "completed", "approved"]:
        await complete_payment(payment["id"])
        logger.info(f"Payment {payment['id']} completed successfully")
    elif status in ["failed", "cancelled", "declined", "rejected", "error"]:
        # Get client phone for failure notification
        client = await db.clients.find_one({"id": payment.get("client_id")}, {"_id": 0})
        
        await db.momo_payments.update_one(
            {"id": payment["id"]},
            {
                "$set": {
                    "status": "failed",
                    "provider_message": data.get("message", "Payment failed"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Send failure SMS
        try:
            if client and client.get("phone"):
                sms = get_sms()
                await sms.notify_payment_failed(client["phone"], payment["amount"], data.get("message", ""))
        except Exception as e:
            logger.error(f"Failure SMS error: {e}")
            
        logger.info(f"Payment {payment['id']} marked as failed")
    else:
        logger.info(f"Callback received with status '{status}', no action taken")
    
    return {"success": True, "message": "Callback processed"}


@router.post("/check-status/{payment_id}")
async def check_payment_status(payment_id: str):
    """Check payment status with BulkClix API - 'I have paid' button"""
    payment = await db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # If already completed or failed, return current status
    if payment.get("status") in ["completed", "failed"]:
        return {
            "success": True,
            "status": payment["status"],
            "message": f"Payment is {payment['status']}"
        }
    
    # Use our transaction_id (reference) for checkstatus - NOT ext_transaction_id
    our_ref = payment.get("reference")
    
    if not our_ref:
        raise HTTPException(status_code=400, detail="Payment reference not found. Please wait for payment to process.")
    
    # Check status with BulkClix API using OUR transaction_id
    try:
        async with httpx.AsyncClient(follow_redirects=True) as http_client:
            response = await http_client.get(
                f"{BULKCLIX_BASE_URL}/payment-api/checkstatus/{our_ref}",
                headers={
                    "Accept": "application/json",
                    "x-api-key": BULKCLIX_API_KEY
                },
                timeout=30.0
            )
            
            logger.info(f"BulkClix check status response: ref={our_ref}, status={response.status_code}, body={response.text[:500] if response.text else 'EMPTY'}")
            
            if response.status_code == 200 and response.text:
                result = response.json()
                # Status is inside data object: {"message": "...", "data": {"status": "success", ...}}
                data = result.get("data", {})
                status = (data.get("status") or result.get("status") or "").lower()
                
                if status in ["success", "successful", "completed", "approved"]:
                    # Complete the payment
                    await complete_payment(payment_id)
                    return {
                        "success": True,
                        "status": "completed",
                        "message": "Payment confirmed successfully!"
                    }
                elif status in ["failed", "cancelled", "declined", "rejected"]:
                    await db.momo_payments.update_one(
                        {"id": payment_id},
                        {"$set": {"status": "failed", "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    return {
                        "success": False,
                        "status": "failed",
                        "message": result.get("message", "Payment failed")
                    }
                else:
                    return {
                        "success": True,
                        "status": "pending",
                        "message": "Payment is still processing. Please approve on your phone or wait."
                    }
            else:
                return {
                    "success": True,
                    "status": "pending",
                    "message": "Payment status check pending. Please try again."
                }
                
    except Exception as e:
        logger.error(f"Check status error: {e}")
        raise HTTPException(status_code=500, detail="Failed to check payment status")


# ============== HUBTEL ONLINE CHECKOUT ENDPOINTS ==============

@router.post("/hubtel/callback")
async def hubtel_payment_callback(request: Request):
    """
    Hubtel Online Checkout callback webhook
    Called by Hubtel when a payment is completed/failed
    
    Expected callback data from Hubtel:
    {
        "ResponseCode": "0000",
        "Status": "Success",
        "Data": {
            "CheckoutId": "...",
            "ClientReference": "SDM-CARD-...",
            "Amount": 25.0,
            "CustomerPhoneNumber": "233...",
            ...
        }
    }
    """
    try:
        data = await request.json()
    except Exception:
        data = dict(request.query_params)
    
    logger.info(f"Hubtel callback received: {data}")
    
    from services.hubtel_checkout_service import get_hubtel_checkout_service
    hubtel_service = get_hubtel_checkout_service(db)
    
    # Process the callback
    result = await hubtel_service.handle_callback(data)
    
    if result.get("success"):
        client_reference = result.get("client_reference")
        
        # Find the pending card purchase
        pending_purchase = await db.pending_card_purchases.find_one(
            {"client_reference": client_reference},
            {"_id": 0}
        )
        
        if pending_purchase and pending_purchase.get("status") != "completed":
            # Complete the card purchase
            from routers.clients import _complete_card_purchase
            from models.schemas import CardType, PaymentMethod
            
            config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
            
            try:
                await _complete_card_purchase(
                    client_id=pending_purchase["client_id"],
                    card_type=CardType(pending_purchase["card_type"]),
                    price=pending_purchase["price"],
                    duration_days=pending_purchase["duration_days"],
                    payment_method=PaymentMethod.MOMO,
                    payment_reference=client_reference,
                    payment_phone=pending_purchase["payment_phone"],
                    config=config
                )
                
                # Mark pending purchase as completed
                await db.pending_card_purchases.update_one(
                    {"client_reference": client_reference},
                    {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
                )
                
                logger.info(f"Card purchase completed via Hubtel: {client_reference}")
            except Exception as e:
                logger.error(f"Error completing card purchase: {e}")
                await db.pending_card_purchases.update_one(
                    {"client_reference": client_reference},
                    {"$set": {"status": "error", "error": str(e)}}
                )
        
        return {"success": True, "message": "Callback processed successfully"}
    else:
        # Payment failed - update pending purchase
        client_reference = result.get("client_reference")
        if client_reference:
            await db.pending_card_purchases.update_one(
                {"client_reference": client_reference},
                {"$set": {"status": "failed", "error": result.get("message")}}
            )
        
        return {"success": False, "message": result.get("message", "Payment failed")}


@router.post("/hubtel/transfer-callback")
async def hubtel_transfer_callback(request: Request):
    """
    Hubtel Send Money (Transfer/Disbursement) callback webhook
    Called by Hubtel when a transfer is completed/failed
    """
    try:
        data = await request.json()
    except Exception:
        data = dict(request.query_params)
    
    logger.info(f"Hubtel Transfer callback received: {data}")
    
    from services.hubtel_momo_service import get_hubtel_momo_service
    hubtel_service = get_hubtel_momo_service(db)
    
    result = await hubtel_service.handle_transfer_callback(data)
    
    if result.get("success"):
        client_reference = result.get("client_reference")
        
        # Find and update withdrawal record
        withdrawal = await db.withdrawals.find_one(
            {"reference": client_reference},
            {"_id": 0}
        )
        
        if withdrawal:
            # Mark withdrawal as successful
            await db.withdrawals.update_one(
                {"reference": client_reference},
                {"$set": {
                    "status": "success",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Deduct from client balance
            client = await db.clients.find_one({"id": withdrawal["client_id"]}, {"_id": 0})
            if client:
                new_balance = max(0, client.get("cashback_balance", 0) - withdrawal["amount"])
                await db.clients.update_one(
                    {"id": withdrawal["client_id"]},
                    {"$set": {"cashback_balance": new_balance}}
                )
                
                # Record transaction
                await db.transactions.insert_one({
                    "id": str(uuid.uuid4()),
                    "type": "withdrawal",
                    "client_id": withdrawal["client_id"],
                    "amount": -withdrawal["amount"],
                    "description": f"Cashback withdrawal to {withdrawal['destination_phone']}",
                    "payment_reference": client_reference,
                    "status": "completed",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            
            logger.info(f"Withdrawal completed via Hubtel: {client_reference}")
        
        return {"success": True, "message": "Transfer callback processed"}
    else:
        # Transfer failed
        client_reference = result.get("client_reference")
        if client_reference:
            await db.withdrawals.update_one(
                {"reference": client_reference},
                {"$set": {"status": "failed", "error": result.get("message")}}
            )
        
        return {"success": False, "message": result.get("message", "Transfer failed")}


@router.get("/hubtel/status/{client_reference}")
async def check_hubtel_payment_status(client_reference: str):
    """Check status of a Hubtel payment by client reference"""
    from services.hubtel_receive_service import get_hubtel_receive_service
    hubtel_service = get_hubtel_receive_service(db)
    
    # First check local DB
    local_result = await hubtel_service.verify_payment(client_reference)
    
    # If still pending, check with Hubtel API
    if local_result.get("status") == "pending" or local_result.get("status") == "initiated":
        api_result = await hubtel_service.check_transaction_status(client_reference)
        if api_result.success:
            return {
                "success": True,
                "status": api_result.status,
                "message": api_result.message,
                "data": api_result.data
            }
    
    return local_result


@router.post("/cards/check-status/{client_reference}")
async def check_card_purchase_status(client_reference: str):
    """Check status of a card purchase by client reference"""
    # Check pending purchase
    pending = await db.pending_card_purchases.find_one(
        {"client_reference": client_reference},
        {"_id": 0}
    )
    
    if not pending:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    # If completed, return card info
    if pending["status"] == "completed":
        client = await db.clients.find_one(
            {"id": pending["client_id"]},
            {"_id": 0, "card_number": 1, "card_type": 1, "card_expires_at": 1, "status": 1}
        )
        return {
            "success": True,
            "status": "completed",
            "message": "Card purchase completed!",
            "card": {
                "card_number": client.get("card_number"),
                "card_type": client.get("card_type"),
                "expires_at": client.get("card_expires_at")
            }
        }
    elif pending["status"] == "failed":
        return {
            "success": False,
            "status": "failed",
            "message": pending.get("error", "Payment failed")
        }
    else:
        # Check Hubtel for latest status
        from services.hubtel_checkout_service import get_hubtel_checkout_service
        hubtel_service = get_hubtel_checkout_service(db)
        
        hubtel_status = await hubtel_service.verify_payment(client_reference)
        
        return {
            "success": True,
            "status": "pending",
            "message": "Payment is being processed. Please complete payment on your phone.",
            "hubtel_status": hubtel_status.get("status")
        }


# ============== TEST MODE ENDPOINTS ==============

@router.post("/test/confirm/{payment_id}")
async def test_confirm_payment(payment_id: str):
    """[TEST MODE] Manually confirm a pending payment"""
    payment = await db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if not payment.get("test_mode"):
        raise HTTPException(status_code=400, detail="This endpoint is only for test mode payments")
    
    if payment["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Payment is already {payment['status']}")
    
    # Complete the payment
    await complete_payment(payment_id)
    
    # Reload payment
    payment = await db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
    
    return {
        "success": True,
        "message": "Payment confirmed successfully",
        "payment_id": payment_id,
        "status": "success",
        "type": payment["type"]
    }


@router.post("/test/fail/{payment_id}")
async def test_fail_payment(payment_id: str):
    """[TEST MODE] Manually fail a pending payment"""
    payment = await db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if not payment.get("test_mode"):
        raise HTTPException(status_code=400, detail="This endpoint is only for test mode payments")
    
    if payment["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Payment is already {payment['status']}")
    
    await db.momo_payments.update_one(
        {"id": payment_id},
        {
            "$set": {
                "status": "failed",
                "provider_message": "Simulated failure (test mode)",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Payment marked as failed",
        "payment_id": payment_id,
        "status": "failed"
    }


# ============== PAYMENT COMPLETION LOGIC ==============

async def complete_payment(payment_id: str):
    """Process completed payment - update client/merchant records"""
    payment = await db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
    
    if not payment:
        return
    
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
        await process_card_purchase(payment)
    elif payment["type"] == "merchant_payment":
        await process_merchant_payment(payment)
    elif payment["type"] == "card_upgrade":
        await process_card_upgrade(payment)


async def process_card_purchase(payment: Dict):
    """Process completed card purchase"""
    client_id = payment["client_id"]
    metadata = payment.get("metadata", {})
    card_type = metadata.get("card_type", "silver")
    referrer_id = metadata.get("referrer_id")
    
    # Get client info for SMS
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
    
    # Record card purchase transaction
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
    
    # Get referral bonus config
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    referrer_bonus = 3.0  # Fixed 3 GHS for referrer
    
    if config:
        referrer_bonus = config.get("referrer_bonus", 3.0)
    
    # Welcome bonus based on card type - configurable from admin
    # Default: 25 GHS card (silver) → 1 GHS, 50 GHS (gold) → 2 GHS, 100 GHS (platinum) → 3 GHS
    welcome_bonus_defaults = {"silver": 1.0, "gold": 2.0, "platinum": 3.0}
    
    if config and config.get("welcome_bonuses"):
        welcome_bonuses = config.get("welcome_bonuses")
        welcome_bonus = welcome_bonuses.get(card_type.lower(), welcome_bonus_defaults.get(card_type.lower(), 1.0))
    else:
        welcome_bonus = welcome_bonus_defaults.get(card_type.lower(), 1.0)
    
    logger.info(f"Processing card purchase: client={client_id}, card={card_type}, welcome_bonus={welcome_bonus}, referrer_id={referrer_id}")
    
    # Credit welcome bonus to the new user
    await db.clients.update_one(
        {"id": client_id},
        {"$inc": {"cashback_balance": welcome_bonus}}
    )
    
    # Record welcome bonus transaction
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "type": "welcome_bonus",
        "client_id": client_id,
        "amount": welcome_bonus,
        "description": f"Welcome Bonus - {card_type.capitalize()} Card Activation",
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"Welcome bonus of GHS {welcome_bonus} credited to client {client_id}")
    
    # Send SMS notification for card purchase
    try:
        sms = get_sms()
        if client and client.get("phone"):
            await sms.notify_card_purchase(client["phone"], card_type, payment["amount"], welcome_bonus)
    except Exception as e:
        logger.error(f"Card purchase SMS error: {e}")
    
    # Process referral bonus if referrer exists
    if referrer_id:
        logger.info(f"Processing referral bonus: referrer={referrer_id}, bonus={referrer_bonus}")
        
        # Get referrer info
        referrer = await db.clients.find_one({"id": referrer_id}, {"_id": 0})
        
        if referrer:
            # Credit referrer with 3 GHS
            await db.clients.update_one(
                {"id": referrer_id},
                {"$inc": {"cashback_balance": referrer_bonus}}
            )
            
            # Record referral bonus transaction
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
            
            # Update/create referral record - mark as completed
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
        else:
            logger.warning(f"Referrer not found: {referrer_id}")


async def process_merchant_payment(payment: Dict):
    """Process completed merchant payment - credit cashback and pay merchant"""
    logger.info(f"Processing merchant payment: {payment.get('id')}")
    
    client_id = payment["client_id"]
    metadata = payment.get("metadata", {})
    merchant_id = metadata.get("merchant_id") or payment.get("merchant_id")
    
    if not merchant_id:
        logger.error(f"No merchant_id found in payment {payment.get('id')}")
        return
    
    logger.info(f"Merchant payment: client={client_id}, merchant={merchant_id}, amount={payment.get('amount')}")
    
    # Get client and merchant
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    merchant = await db.merchants.find_one({"id": merchant_id}, {"_id": 0})
    
    if not merchant:
        return
    
    # Calculate cashback
    cashback_rate = merchant.get("cashback_rate", 5) / 100
    gross_cashback = round(payment["amount"] * cashback_rate, 2)
    
    # Get platform commission
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    platform_commission_rate = 0.05  # 5% default
    if config:
        platform_commission_rate = config.get("platform_commission_rate", 5) / 100
    
    commission = round(gross_cashback * platform_commission_rate, 2)
    net_cashback = gross_cashback - commission
    
    # Calculate merchant's share (payment amount minus cashback)
    merchant_share = round(payment["amount"] - gross_cashback, 2)
    
    # Credit cashback to client
    await db.clients.update_one(
        {"id": client_id},
        {"$inc": {"cashback_balance": net_cashback}}
    )
    
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
    
    # Record transaction
    transaction_id = str(uuid.uuid4())
    await db.transactions.insert_one({
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
    })
    
    # ============== GAMIFICATION - UPDATE MISSIONS ==============
    try:
        gamification = get_gamification()
        
        # Update daily/weekly transaction missions
        await gamification.update_mission_progress(client_id, "transaction", 1)
        
        # Update daily/weekly spend missions
        await gamification.update_mission_progress(client_id, "spend", payment["amount"])
        
        # Update unique merchants mission
        await gamification.update_mission_progress(client_id, "unique_merchants", 1)
        
        # Update activity streak
        await gamification.update_activity_streak(client_id)
        
        # Award XP for completing a transaction (5 XP base + 1 XP per 10 GHS spent)
        base_xp = 5
        spend_xp = int(payment["amount"] / 10)
        total_xp = base_xp + spend_xp
        await gamification.add_xp(client_id, total_xp, f"Payment at {merchant.get('business_name', 'Merchant')}")
        
        # Check for badge achievements
        await gamification.check_and_award_badges(client_id)
        
        logger.info(f"Gamification updated for client {client_id}: +{total_xp} XP")
    except Exception as e:
        logger.error(f"Gamification update error: {e}")
    
    # ============== AUTO-PAY MERCHANT ==============
    # If merchant has configured payout method, transfer their share immediately
    preferred_payout_method = merchant.get("preferred_payout_method", "momo")
    merchant_momo = merchant.get("momo_number")
    merchant_network = merchant.get("momo_network", "MTN").upper()
    merchant_bank_id = merchant.get("bank_id")
    merchant_bank_account = merchant.get("bank_account")
    merchant_bank_name = merchant.get("bank_account_name")
    
    logger.info(f"Merchant payout check: method={preferred_payout_method}, momo={merchant_momo}, bank={merchant_bank_account}, share={merchant_share}")
    
    # Determine if we can do a payout
    can_payout_momo = merchant_momo and merchant_share > 0
    can_payout_bank = merchant_bank_id and merchant_bank_account and merchant_bank_name and merchant_share > 0
    
    # Use preferred method if available, otherwise fallback
    use_bank = (preferred_payout_method == "bank" and can_payout_bank) or (not can_payout_momo and can_payout_bank)
    use_momo = (preferred_payout_method == "momo" and can_payout_momo) or (not can_payout_bank and can_payout_momo)
    
    if (use_bank or use_momo) and merchant_share > 0:
        payout_success = False
        payout_ref = f"SDM-PAYOUT-{uuid.uuid4().hex[:8].upper()}"
        payout_method = "bank" if use_bank else "momo"
        
        # Create payout record
        payout_record = {
            "id": str(uuid.uuid4()),
            "type": "merchant_payout",
            "payout_method": payout_method,
            "merchant_id": merchant_id,
            "transaction_id": transaction_id,
            "amount": merchant_share,
            "reference": payout_ref,
            "status": "pending",
            "test_mode": is_test_mode(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if use_bank:
            payout_record["bank_id"] = merchant_bank_id
            payout_record["bank_account"] = merchant_bank_account
            payout_record["bank_account_name"] = merchant_bank_name
            payout_record["bank_name"] = merchant.get("bank_name", "")
        else:
            payout_record["phone"] = merchant_momo
            payout_record["network"] = merchant_network
        
        await db.merchant_payouts.insert_one(payout_record)
        
        if is_test_mode():
            # In test mode, auto-approve payout simulation
            payout_success = True
            logger.info(f"TEST MODE: Simulating merchant payout ({payout_method}) of GHS {merchant_share}")
            await db.merchant_payouts.update_one(
                {"id": payout_record["id"]},
                {"$set": {"status": "completed", "provider_message": "Test mode - simulated"}}
            )
        else:
            # Production: Call BulkClix API
            try:
                async with httpx.AsyncClient(follow_redirects=True) as http_client:
                    if use_bank:
                        # Bank transfer
                        response = await http_client.post(
                            f"{BULKCLIX_BASE_URL}/payment-api/send/bank",
                            headers={
                                "x-api-key": BULKCLIX_API_KEY,
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                            },
                            json={
                                "amount": str(merchant_share),
                                "account_number": merchant_bank_account,
                                "account_name": merchant_bank_name,
                                "bank_id": merchant_bank_id,
                                "client_reference": payout_ref
                            },
                            timeout=60.0
                        )
                        logger.info(f"Merchant BANK payout response: {response.status_code} - {response.text[:500] if response.text else 'EMPTY'}")
                    else:
                        # MoMo transfer
                        bulkclix_phone = merchant_momo
                        if merchant_momo.startswith("+233"):
                            bulkclix_phone = "0" + merchant_momo[4:]
                        elif merchant_momo.startswith("233"):
                            bulkclix_phone = "0" + merchant_momo[3:]
                        
                        response = await http_client.post(
                            f"{BULKCLIX_BASE_URL}/payment-api/send/mobilemoney",
                            headers={
                                "x-api-key": BULKCLIX_API_KEY,
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                            },
                            json={
                                "amount": str(merchant_share),
                                "account_number": bulkclix_phone,
                                "channel": merchant_network,
                                "account_name": merchant.get("business_name", ""),
                                "client_reference": payout_ref
                            },
                            timeout=30.0
                        )
                        logger.info(f"Merchant MOMO payout response: {response.status_code} - {response.text[:500] if response.text else 'EMPTY'}")
                    
                    if response.status_code == 200:
                        data = response.json() if response.text else {}
                        payout_success = True
                        await db.merchant_payouts.update_one(
                            {"id": payout_record["id"]},
                            {"$set": {
                                "status": "completed",
                                "provider_reference": data.get("transactionId") or data.get("transaction_id"),
                                "provider_message": data.get("message", "Success"),
                                "completed_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                    elif response.status_code == 403:
                        # IP not whitelisted - mark as pending for manual processing
                        logger.warning("BulkClix IP not whitelisted - payout marked as pending_manual")
                        await db.merchant_payouts.update_one(
                            {"id": payout_record["id"]},
                            {"$set": {
                                "status": "pending_manual",
                                "provider_message": "IP not whitelisted - requires manual processing or IP whitelist update",
                                "error_details": response.text
                            }}
                        )
                        payout_success = False
                    else:
                        logger.error(f"Merchant payout failed: {response.status_code} - {response.text}")
                        await db.merchant_payouts.update_one(
                            {"id": payout_record["id"]},
                            {"$set": {"status": "failed", "provider_message": response.text}}
                        )
            except Exception as e:
                logger.error(f"Merchant payout error: {e}")
                await db.merchant_payouts.update_one(
                    {"id": payout_record["id"]},
                    {"$set": {"status": "failed", "provider_message": str(e)}}
                )
        
        # Update merchant pending balance if payout was successful
        if payout_success:
            await db.merchants.update_one(
                {"id": merchant_id},
                {
                    "$inc": {"pending_balance": -merchant_share, "total_paid_out": merchant_share}
                }
            )
    
    # Send SMS notifications
    try:
        sms = get_sms()
        
        # Notify client of cashback
        if client and client.get("phone"):
            await sms.notify_payment_received(
                client["phone"], 
                payment["amount"], 
                merchant.get("business_name", "Merchant"),
                net_cashback
            )
        
        # Notify merchant of payment received
        if merchant.get("phone"):
            client_name = client.get("full_name", "A customer") if client else "A customer"
            # Enhanced message with payout info
            if merchant_momo and merchant_share > 0:
                await sms.send_sms(
                    merchant["phone"],
                    f"SDM REWARDS: You received GHS {payment['amount']:.2f} from {client_name}. Your share of GHS {merchant_share:.2f} has been sent to {merchant_momo}."
                )
            else:
                await sms.notify_merchant_payment(merchant["phone"], payment["amount"], client_name)
            
    except Exception as e:
        logger.error(f"Merchant payment SMS error: {e}")


async def process_card_upgrade(payment: Dict):
    """Process completed card upgrade - upgrade client's card and credit welcome bonus"""
    client_id = payment["client_id"]
    from_card = payment.get("from_card_type", "silver")
    to_card = payment.get("to_card_type", "gold")
    new_duration_days = payment.get("new_duration_days", 365)
    welcome_bonus = payment.get("welcome_bonus", 0)
    cashback_used = payment.get("cashback_used", 0)
    
    # Get client
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        logger.error(f"Card upgrade: Client {client_id} not found")
        return
    
    now = datetime.now(timezone.utc)
    
    # Calculate new expiration (extend from now + new duration)
    new_expires_at = now + timedelta(days=new_duration_days)
    
    # Get welcome bonus from config if not in payment
    if welcome_bonus == 0:
        config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
        if config:
            welcome_bonuses = config.get("welcome_bonuses", {})
            default_bonuses = {"silver": 1.0, "gold": 2.0, "platinum": 3.0}
            welcome_bonus = welcome_bonuses.get(to_card, default_bonuses.get(to_card, 1.0))
    
    # Update client card type and add welcome bonus
    update_data = {
        "card_type": to_card,
        "card_purchased_at": now.isoformat(),
        "card_expires_at": new_expires_at.isoformat(),
        "card_duration_days": new_duration_days,
        "updated_at": now.isoformat()
    }
    
    await db.clients.update_one(
        {"id": client_id},
        {
            "$set": update_data,
            "$inc": {"cashback_balance": welcome_bonus}
        }
    )
    
    # Update or create membership card
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
    
    # Record upgrade transaction
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
            "cashback_used": cashback_used,
            "momo_amount": payment.get("momo_amount", payment["amount"])
        },
        "created_at": now.isoformat()
    })
    
    # Record welcome bonus transaction
    if welcome_bonus > 0:
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "type": "welcome_bonus",
            "client_id": client_id,
            "amount": welcome_bonus,
            "description": f"Welcome bonus for {to_card.upper()} upgrade",
            "status": "completed",
            "metadata": {
                "card_type": to_card,
                "upgrade_from": from_card
            },
            "created_at": now.isoformat()
        })
    
    # Send SMS notification
    try:
        if client.get("phone"):
            sms = get_sms()
            message = f"Congratulations! Your SDM card has been upgraded to {to_card.upper()}. Welcome bonus of GHS {welcome_bonus:.2f} credited. Card valid for {new_duration_days} days."
            await sms.send_raw_sms(client["phone"], message)
    except Exception as e:
        logger.error(f"Card upgrade SMS error: {e}")


# ============== CASHBACK WITHDRAWAL ==============

class WithdrawalRequest(BaseModel):
    phone: str  # Destination MoMo number
    amount: float
    network: Optional[str] = None  # MTN, VODAFONE, AIRTELTIGO



@router.get("/withdrawal/fee")
async def get_withdrawal_fee():
    """
    Get current withdrawal fee configuration
    """
    config = await db.platform_config.find_one({}, {"_id": 0, "service_commissions": 1})
    withdrawal_config = {"type": "fixed", "rate": 0}
    
    if config and config.get("service_commissions", {}).get("withdrawal"):
        withdrawal_config = config["service_commissions"]["withdrawal"]
    
    return {
        "success": True,
        "fee": {
            "type": withdrawal_config.get("type", "fixed"),
            "rate": withdrawal_config.get("rate", 0)
        }
    }


@router.post("/withdrawal/initiate")
async def initiate_withdrawal(request: WithdrawalRequest, req: Request):
    """
    Initiate cashback withdrawal to Mobile Money
    """
    # Get client from token
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = auth_header.split(" ")[1]
    
    # Decode token (simple validation)
    from routers.auth import decode_token
    payload = decode_token(token)
    if not payload or payload.get("type") != "client":
        raise HTTPException(status_code=401, detail="Invalid token")
    
    client = await db.clients.find_one({"id": payload["sub"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Validate amount
    min_withdrawal = 5.0
    max_withdrawal = 1000.0
    
    if request.amount < min_withdrawal:
        raise HTTPException(status_code=400, detail=f"Minimum withdrawal amount is GHS {min_withdrawal}")
    
    if request.amount > max_withdrawal:
        raise HTTPException(status_code=400, detail=f"Maximum withdrawal amount is GHS {max_withdrawal}")
    
    # Check balance
    current_balance = client.get("cashback_balance", 0)
    if current_balance < request.amount:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: GHS {current_balance:.2f}")
    
    # Detect network
    network = request.network or detect_network(request.phone)
    if not network:
        raise HTTPException(status_code=400, detail="Invalid phone number or unsupported network. Please specify network.")
    
    # Get withdrawal fee from platform config
    config = await db.platform_config.find_one({}, {"_id": 0, "service_commissions": 1})
    withdrawal_fee = 0.0
    withdrawal_fee_type = "fixed"
    if config and config.get("service_commissions", {}).get("withdrawal"):
        withdrawal_config = config["service_commissions"]["withdrawal"]
        withdrawal_fee_type = withdrawal_config.get("type", "fixed")
        withdrawal_fee_rate = withdrawal_config.get("rate", 0)
        if withdrawal_fee_type == "percentage":
            withdrawal_fee = request.amount * (withdrawal_fee_rate / 100)
        else:
            withdrawal_fee = withdrawal_fee_rate
    
    # Calculate net amount (what client receives)
    net_amount = request.amount - withdrawal_fee
    
    # Check if balance covers amount + fee (client pays from their balance)
    if current_balance < request.amount:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: GHS {current_balance:.2f}")
    
    # Generate withdrawal reference
    withdrawal_ref = f"SDM-WD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Create withdrawal record
    withdrawal_record = {
        "id": str(uuid.uuid4()),
        "reference": withdrawal_ref,
        "type": "withdrawal",
        "client_id": client["id"],
        "client_phone": client["phone"],
        "destination_phone": request.phone,
        "network": network,
        "amount": request.amount,
        "fee": withdrawal_fee,
        "fee_type": withdrawal_fee_type,
        "net_amount": net_amount,
        "status": "pending",
        "test_mode": is_test_mode(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "provider_reference": None,
        "provider_message": None
    }
    
    await db.withdrawals.insert_one(withdrawal_record)
    
    # In test mode, return for manual confirmation
    if is_test_mode():
        return {
            "success": True,
            "withdrawal_id": withdrawal_record["id"],
            "reference": withdrawal_ref,
            "amount": request.amount,
            "fee": withdrawal_fee,
            "net_amount": net_amount,
            "destination": request.phone,
            "network": network,
            "status": "pending",
            "test_mode": True,
            "message": "Test mode: Use /api/payments/withdrawal/test/confirm/{id} to simulate payout"
        }
    
    # Production mode: Call Hubtel Send Money API
    from services.hubtel_momo_service import get_hubtel_momo_service
    
    hubtel_service = get_hubtel_momo_service(db)
    
    result = await hubtel_service.send_momo(
        phone=request.phone,
        amount=net_amount,  # Send net amount (after fee deduction)
        description=f"SDM Rewards Cashback Withdrawal",
        client_reference=withdrawal_ref,
        recipient_name=client.get("full_name", "SDM Client")
    )
    
    if result.get("success"):
        # Update record with provider reference
        await db.withdrawals.update_one(
            {"id": withdrawal_record["id"]},
            {"$set": {
                "status": "processing",
                "provider": "hubtel",
                "provider_reference": result.get("transaction_id"),
                "provider_message": result.get("message"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Send SMS notification with net amount
        try:
            sms = get_sms()
            await sms.send_sms(
                client["phone"],
                f"SDM Rewards: Your withdrawal of GHS {net_amount:.2f} to {request.phone} is being processed. You will receive funds shortly."
            )
        except Exception as e:
            logger.error(f"Withdrawal SMS error: {e}")
        
        return {
            "success": True,
            "withdrawal_id": withdrawal_record["id"],
            "reference": withdrawal_ref,
            "amount": request.amount,
            "fee": withdrawal_fee,
            "net_amount": net_amount,
            "destination": request.phone,
            "network": network,
            "status": "processing",
            "test_mode": result.get("test_mode", False),
            "message": "Withdrawal is being processed. You will receive funds shortly."
        }
    else:
        logger.error(f"Hubtel Send Money error: {result.get('error')}")
        await db.withdrawals.update_one(
            {"id": withdrawal_record["id"]},
            {"$set": {"status": "failed", "provider_message": result.get("error")}}
        )
        raise HTTPException(status_code=500, detail=result.get("error", "Withdrawal request failed. Please try again."))


@router.post("/withdrawal/test/confirm/{withdrawal_id}")
async def confirm_test_withdrawal(withdrawal_id: str, req: Request):
    """
    Test mode: Manually confirm a withdrawal to simulate successful payout
    """
    # Get client from token
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = auth_header.split(" ")[1]
    from routers.auth import decode_token
    payload = decode_token(token)
    if not payload or payload.get("type") != "client":
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Find withdrawal
    withdrawal = await db.withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    # Verify ownership
    if withdrawal["client_id"] != payload["sub"]:
        raise HTTPException(status_code=403, detail="Not your withdrawal")
    
    if withdrawal["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Withdrawal already {withdrawal['status']}")
    
    if not withdrawal.get("test_mode"):
        raise HTTPException(status_code=400, detail="This endpoint is only for test mode withdrawals")
    
    # Get client
    client = await db.clients.find_one({"id": withdrawal["client_id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check balance again
    if client.get("cashback_balance", 0) < withdrawal["amount"]:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Deduct from balance
    new_balance = client["cashback_balance"] - withdrawal["amount"]
    await db.clients.update_one(
        {"id": client["id"]},
        {"$set": {
            "cashback_balance": new_balance,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update withdrawal status
    await db.withdrawals.update_one(
        {"id": withdrawal_id},
        {"$set": {
            "status": "success",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Record transaction
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "type": "withdrawal",
        "client_id": client["id"],
        "amount": -withdrawal["amount"],
        "description": f"Cashback withdrawal to {withdrawal['destination_phone']}",
        "payment_reference": withdrawal["reference"],
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send SMS notification with net amount
    try:
        sms = get_sms()
        net_amount = withdrawal.get('net_amount', withdrawal['amount'])
        await sms.send_sms(
            client["phone"],
            f"SDM Rewards: Your withdrawal of GHS {net_amount:.2f} to {withdrawal['destination_phone']} was successful. New balance: GHS {new_balance:.2f}"
        )
    except Exception as e:
        logger.error(f"Withdrawal SMS error: {e}")
    
    return {
        "success": True,
        "message": "Withdrawal confirmed successfully",
        "amount": withdrawal["amount"],
        "destination": withdrawal["destination_phone"],
        "new_balance": new_balance
    }


@router.get("/withdrawal/status/{withdrawal_id}")
async def get_withdrawal_status(withdrawal_id: str, req: Request):
    """
    Get withdrawal status
    """
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = auth_header.split(" ")[1]
    from routers.auth import decode_token
    payload = decode_token(token)
    if not payload or payload.get("type") != "client":
        raise HTTPException(status_code=401, detail="Invalid token")
    
    withdrawal = await db.withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal["client_id"] != payload["sub"]:
        raise HTTPException(status_code=403, detail="Not your withdrawal")
    
    return {
        "id": withdrawal["id"],
        "reference": withdrawal["reference"],
        "amount": withdrawal["amount"],
        "destination": withdrawal["destination_phone"],
        "network": withdrawal["network"],
        "status": withdrawal["status"],
        "created_at": withdrawal["created_at"],
        "completed_at": withdrawal.get("completed_at")
    }


@router.post("/withdrawal/callback")
async def withdrawal_callback(request: Request):
    """
    BulkClix callback for withdrawal status updates
    """
    try:
        body = await request.json()
        logger.info(f"Withdrawal callback received: {body}")
        
        reference = body.get("reference")
        status = body.get("status", "").lower()
        
        if not reference:
            return {"success": False, "message": "Missing reference"}
        
        withdrawal = await db.withdrawals.find_one({"reference": reference}, {"_id": 0})
        if not withdrawal:
            return {"success": False, "message": "Withdrawal not found"}
        
        if status in ["success", "successful", "completed"]:
            # Get client and deduct balance
            client = await db.clients.find_one({"id": withdrawal["client_id"]}, {"_id": 0})
            if client:
                new_balance = max(0, client.get("cashback_balance", 0) - withdrawal["amount"])
                await db.clients.update_one(
                    {"id": client["id"]},
                    {"$set": {
                        "cashback_balance": new_balance,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Record transaction
                await db.transactions.insert_one({
                    "id": str(uuid.uuid4()),
                    "type": "withdrawal",
                    "client_id": client["id"],
                    "amount": -withdrawal["amount"],
                    "description": f"Cashback withdrawal to {withdrawal['destination_phone']}",
                    "payment_reference": withdrawal["reference"],
                    "status": "completed",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                # Send SMS
                try:
                    sms = get_sms()
                    await sms.send_sms(
                        client["phone"],
                        f"SDM Rewards: Your withdrawal of GHS {withdrawal['amount']:.2f} to {withdrawal['destination_phone']} was successful."
                    )
                except Exception as e:
                    logger.error(f"Withdrawal SMS error: {e}")
            
            await db.withdrawals.update_one(
                {"id": withdrawal["id"]},
                {"$set": {
                    "status": "success",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
        elif status in ["failed", "error", "declined"]:
            await db.withdrawals.update_one(
                {"id": withdrawal["id"]},
                {"$set": {
                    "status": "failed",
                    "provider_message": body.get("message", "Withdrawal failed"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Notify client of failure
            client = await db.clients.find_one({"id": withdrawal["client_id"]}, {"_id": 0})
            if client:
                try:
                    sms = get_sms()
                    await sms.send_sms(
                        client["phone"],
                        f"SDM Rewards: Your withdrawal of GHS {withdrawal['amount']:.2f} could not be processed. Please try again."
                    )
                except Exception as e:
                    logger.error(f"Failed withdrawal SMS error: {e}")
        
        return {"success": True, "message": "Callback processed"}
        
    except Exception as e:
        logger.error(f"Withdrawal callback error: {e}")
        return {"success": False, "message": str(e)}
