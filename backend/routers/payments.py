"""
SDM REWARDS - Payment Router
============================
Handles MoMo payment collection for VIP cards and merchant payments
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone
import uuid
import os
import httpx

router = APIRouter()

# Database reference (set from server.py)
db = None

def set_db(database):
    global db
    db = database

# ============== CONFIG ==============
BULKCLIX_API_KEY = os.environ.get("BULKCLIX_API_KEY", "")
BULKCLIX_BASE_URL = os.environ.get("BULKCLIX_BASE_URL", "https://api.bulkclix.com/api/v1")
PAYMENT_TEST_MODE = os.environ.get("PAYMENT_TEST_MODE", "true").lower() == "true"


# ============== HELPERS ==============
def detect_network(phone: str) -> Optional[str]:
    """Detect network provider from phone number"""
    phone = phone.replace(" ", "").replace("-", "")
    if phone.startswith("+233"):
        phone = "0" + phone[4:]
    elif phone.startswith("233"):
        phone = "0" + phone[3:]
    
    mtn_prefixes = ["024", "054", "055", "059"]
    vodafone_prefixes = ["020", "050"]
    airteltigo_prefixes = ["026", "027", "056", "057"]
    
    prefix = phone[:3] if len(phone) >= 3 else ""
    
    if prefix in mtn_prefixes:
        return "MTN"
    elif prefix in vodafone_prefixes:
        return "VODAFONE"
    elif prefix in airteltigo_prefixes:
        return "AIRTELTIGO"
    
    return None


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
    
    # Handle referrer
    referrer_id = None
    if request.referrer_code:
        referrer = await db.clients.find_one({"referral_code": request.referrer_code}, {"_id": 0})
        if referrer and referrer["id"] != client["id"]:
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
    
    # Production: Call BulkClix API
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                f"{BULKCLIX_BASE_URL}/payment-api/momocollection",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {BULKCLIX_API_KEY}"
                },
                json={
                    "phone": request.phone,
                    "amount": amount,
                    "network": network,
                    "reference": payment_ref,
                    "description": f"SDM {card_name} Purchase"
                },
                timeout=30.0
            )
            
            result = response.json()
            
            if response.status_code == 200 and result.get("status") in ["success", "pending"]:
                await db.momo_payments.update_one(
                    {"id": payment_record["id"]},
                    {
                        "$set": {
                            "status": "processing",
                            "provider_reference": result.get("reference") or result.get("transactionId"),
                            "provider_message": result.get("message"),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                return {
                    "success": True,
                    "payment_id": payment_record["id"],
                    "reference": payment_ref,
                    "amount": amount,
                    "status": "processing",
                    "message": "MoMo prompt sent to your phone. Please approve the payment."
                }
            else:
                error_msg = result.get("message", "Payment initiation failed")
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
                
    except httpx.RequestError as e:
        await db.momo_payments.update_one(
            {"id": payment_record["id"]},
            {
                "$set": {
                    "status": "failed",
                    "provider_message": f"Network error: {str(e)}",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        raise HTTPException(status_code=503, detail="Payment service temporarily unavailable")


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
    
    # Detect network
    network = detect_network(request.client_phone)
    if not network:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
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
    
    # Production: Call BulkClix (similar to card payment)
    # ... same API call logic as above
    return {
        "success": True,
        "payment_id": payment_record["id"],
        "reference": payment_ref,
        "status": "processing"
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


@router.post("/callback")
async def payment_callback(request: Request):
    """BulkClix payment callback webhook"""
    try:
        data = await request.json()
    except:
        data = dict(request.query_params)
    
    reference = data.get("reference") or data.get("transactionId")
    status = (data.get("status") or "").lower()
    
    if not reference:
        return {"success": False, "message": "Missing reference"}
    
    # Find payment
    payment = await db.momo_payments.find_one(
        {"$or": [
            {"provider_reference": reference},
            {"reference": reference}
        ]},
        {"_id": 0}
    )
    
    if not payment:
        return {"success": False, "message": "Payment not found"}
    
    if status in ["success", "successful", "completed"]:
        await complete_payment(payment["id"])
    elif status in ["failed", "cancelled", "declined"]:
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
    
    return {"success": True, "message": "Callback processed"}


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


async def process_card_purchase(payment: Dict):
    """Process completed card purchase"""
    client_id = payment["client_id"]
    metadata = payment.get("metadata", {})
    card_type = metadata.get("card_type", "silver")
    referrer_id = metadata.get("referrer_id")
    
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
    
    # Get bonus config
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    welcome_bonus = 1.0
    referrer_bonus = 3.0
    
    if config:
        welcome_bonus = config.get("welcome_bonus", 1.0)
        referrer_bonus = config.get("referrer_bonus", 3.0)
    
    # Credit welcome bonus
    await db.clients.update_one(
        {"id": client_id},
        {"$inc": {"cashback_balance": welcome_bonus}}
    )
    
    # Record welcome bonus
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "type": "welcome_bonus",
        "client_id": client_id,
        "amount": welcome_bonus,
        "description": "Welcome Bonus - Card Activation",
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Process referral if exists
    if referrer_id:
        # Credit referrer
        await db.clients.update_one(
            {"id": referrer_id},
            {"$inc": {"cashback_balance": referrer_bonus}}
        )
        
        # Record referral bonus
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "type": "referral_bonus",
            "client_id": referrer_id,
            "referred_id": client_id,
            "amount": referrer_bonus,
            "description": "Referral Bonus",
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Update/create referral record
        await db.referrals.update_one(
            {"referrer_id": referrer_id, "referred_id": client_id},
            {
                "$set": {
                    "status": "completed",
                    "bonus_paid": True,
                    "bonus_amount": referrer_bonus,
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )


async def process_merchant_payment(payment: Dict):
    """Process completed merchant payment - credit cashback"""
    client_id = payment["client_id"]
    metadata = payment.get("metadata", {})
    merchant_id = metadata.get("merchant_id")
    
    if not merchant_id:
        return
    
    # Get merchant
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
                "total_cashback_given": gross_cashback
            }
        }
    )
    
    # Record transaction
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "type": "merchant_payment",
        "client_id": client_id,
        "merchant_id": merchant_id,
        "amount": payment["amount"],
        "cashback_amount": gross_cashback,
        "commission_amount": commission,
        "net_cashback": net_cashback,
        "description": f"Payment at {merchant.get('business_name', 'Merchant')}",
        "payment_method": "momo",
        "payment_reference": payment["reference"],
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
