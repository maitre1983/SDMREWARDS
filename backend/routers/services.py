"""
SDM REWARDS - Services Router
==============================
Handles cashback-funded services: Airtime, Data, ECG, Withdrawal

PAYMENT RULES:
- Airtime, Data Bundle, ECG: CASHBACK ONLY
- Withdrawal: Converts cashback to MoMo (Hubtel Send Money)
- Card Upgrade: Cashback, MoMo, or Hybrid (see clients.py)

All services use Hubtel VAS API
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from routers.auth import get_current_client
from services.transaction_service import (
    get_transaction_service, 
    TransactionType, 
    TransactionStatus
)

# Setup
router = APIRouter()
logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Minimum amounts
MIN_CASHBACK_BALANCE = 2.0
MIN_TRANSACTION_AMOUNT = 2.0


# ============== REQUEST MODELS ==============

# ============== PAYMENT RULES ==============
# Airtime, Data Bundle, ECG: CASHBACK ONLY (no MoMo option)
# Card Upgrade: Cashback, MoMo, or Hybrid (see clients.py)

class AirtimeRequest(BaseModel):
    """Airtime purchase request - CASHBACK ONLY"""
    phone: str
    amount: float
    network: str  # MTN, TELECEL, AIRTELTIGO


class DataBundleRequest(BaseModel):
    """Data bundle purchase request - CASHBACK ONLY"""
    phone: str
    package_id: str  # Bundle package ID
    service_id: str  # Network service ID
    network: str  # MTN, TELECEL, AIRTELTIGO
    amount: float  # Price of the bundle
    display_name: str  # e.g. "1.37GB"


class ECGPaymentRequest(BaseModel):
    """ECG bill payment request - CASHBACK ONLY"""
    meter_number: str
    amount: float
    phone: str  # Customer phone number for Hubtel SMS notification


class WithdrawalRequest(BaseModel):
    phone: str
    amount: float
    network: Optional[str] = None  # Made optional - will auto-detect if not provided
    
    class Config:
        # Accept extra fields without error
        extra = "ignore"


# ============== HELPER FUNCTIONS ==============

async def get_platform_config():
    """Get platform configuration including fees"""
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    return config or {}


async def get_service_fee_config(service_type: str) -> dict:
    """Get service fee configuration from settings"""
    config = await get_platform_config()
    
    # Map service types to their settings paths
    service_map = {
        "airtime": "airtime",
        "data_bundle": "data",
        "ecg_payment": "ecg",
        "withdrawal": "withdrawal",
        "merchant_payment": "merchant_payment"
    }
    
    mapped_service = service_map.get(service_type, service_type)
    service_config = config.get("service_commissions", {}).get(mapped_service, {})
    
    # Get type and rate from settings
    fee_type = service_config.get("type", "percentage")  # percentage or fixed
    fee_rate = service_config.get("rate", 2.0)  # default 2% or GHS 2
    
    return {
        "type": fee_type,
        "rate": fee_rate
    }


async def get_service_fee(service_type: str, amount: float) -> dict:
    """Calculate service fee based on config"""
    fee_config = await get_service_fee_config(service_type)
    
    fee_type = fee_config.get("type", "percentage")
    fee_rate = fee_config.get("rate", 2.0)
    
    # Calculate fee based on type
    if fee_type == "fixed":
        fee_amount = fee_rate  # Fixed GHS amount
    else:
        fee_amount = round(amount * fee_rate / 100, 2)  # Percentage
    
    total = round(amount + fee_amount, 2)
    
    return {
        "fee_type": fee_type,
        "fee_rate": fee_rate,
        "fee_amount": fee_amount,
        "total": total
    }


async def debit_cashback(client_id: str, amount: float, description: str, service_type: str) -> dict:
    """Debit amount from client's cashback balance"""
    client_record = await db.clients.find_one({"id": client_id}, {"_id": 0})
    
    if not client_record:
        raise HTTPException(status_code=404, detail="Client not found")
    
    current_balance = client_record.get("cashback_balance", 0)
    
    if current_balance < amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient cashback balance. Available: GHS {current_balance:.2f}, Required: GHS {amount:.2f}"
        )
    
    new_balance = round(current_balance - amount, 2)
    
    # Update client balance
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"cashback_balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create transaction record with cashback_used tracking
    transaction = {
        "id": str(uuid.uuid4()),
        "type": service_type,
        "client_id": client_id,
        "amount": amount,
        "cashback_used": amount,  # Track cashback used
        "description": description,
        "balance_before": current_balance,
        "balance_after": new_balance,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.transactions.insert_one(transaction)
    
    return {
        "balance_before": current_balance,
        "balance_after": new_balance,
        "transaction_id": transaction["id"]
    }


async def process_hybrid_payment(
    client_id: str, 
    total_amount: float, 
    service_type: str,
    description: str,
    momo_phone: str = None,
    payment_method: str = "cashback"
) -> dict:
    """
    Process payment with flexible method (cashback, momo, or hybrid)
    Returns breakdown of how the payment was made
    """
    client_record = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_record:
        raise HTTPException(status_code=404, detail="Client not found")
    
    cashback_balance = client_record.get("cashback_balance", 0)
    
    cashback_used = 0
    momo_amount = 0
    
    if payment_method == "cashback":
        # 100% cashback - must have sufficient balance
        if cashback_balance < total_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient cashback balance. Available: GHS {cashback_balance:.2f}, Required: GHS {total_amount:.2f}"
            )
        cashback_used = total_amount
        
    elif payment_method == "momo":
        # 100% MoMo - no cashback used
        if not momo_phone:
            raise HTTPException(status_code=400, detail="MoMo phone number required")
        momo_amount = total_amount
        
    elif payment_method == "hybrid":
        # Use all available cashback first, rest via MoMo
        if not momo_phone and cashback_balance < total_amount:
            raise HTTPException(status_code=400, detail="MoMo phone number required for hybrid payment")
        
        cashback_used = min(cashback_balance, total_amount)
        momo_amount = round(total_amount - cashback_used, 2)
    
    return {
        "total_amount": total_amount,
        "cashback_used": round(cashback_used, 2),
        "momo_amount": round(momo_amount, 2),
        "cashback_balance_before": cashback_balance,
        "cashback_balance_after": round(cashback_balance - cashback_used, 2),
        "payment_method": payment_method,
        "requires_momo": momo_amount > 0
    }


# ============== SERVICE ENDPOINTS ==============

@router.get("/balance")
async def get_service_balance(current_client: dict = Depends(get_current_client)):
    """Get client's cashback balance for services"""
    client_record = await db.clients.find_one({"id": current_client["id"]}, {"_id": 0})
    
    if not client_record:
        raise HTTPException(status_code=404, detail="Client not found")
    
    balance = client_record.get("cashback_balance", 0)
    
    return {
        "success": True,
        "balance": balance,
        "min_required": MIN_CASHBACK_BALANCE,
        "can_use_services": balance >= MIN_CASHBACK_BALANCE
    }


@router.get("/fees")
async def get_service_fees():
    """Get current service fees from admin settings"""
    # Get fee configs for each service
    airtime_config = await get_service_fee_config("airtime")
    data_config = await get_service_fee_config("data_bundle")
    ecg_config = await get_service_fee_config("ecg_payment")
    withdrawal_config = await get_service_fee_config("withdrawal")
    
    return {
        "success": True,
        "fees": {
            "airtime": {
                "type": airtime_config.get("type", "percentage"),
                "rate": airtime_config.get("rate", 2.0)
            },
            "data_bundle": {
                "type": data_config.get("type", "percentage"),
                "rate": data_config.get("rate", 3.0)
            },
            "ecg_payment": {
                "type": ecg_config.get("type", "percentage"),
                "rate": ecg_config.get("rate", 1.5)
            },
            "withdrawal": {
                "type": withdrawal_config.get("type", "percentage"),
                "rate": withdrawal_config.get("rate", 1.0)
            }
        },
        "min_transaction": MIN_TRANSACTION_AMOUNT,
        "min_balance": MIN_CASHBACK_BALANCE
    }


@router.get("/data/services")
async def get_data_services():
    """Get available data bundle services/networks"""
    return {
        "success": True,
        "services": [
            {"id": "4a1d6ab2-df53-44fd-b42b-97753ba77508", "name": "MTN Data", "network": "MTN"},
            {"id": "205cb30a-f67c-4d4d-983a-19c3da2ebeef", "name": "Telecel Data", "network": "TELECEL"},
            {"id": "442424ef-3eac-4d88-a596-65b5ec7a345f", "name": "AirtelTigo Data", "network": "AIRTELTIGO"}
        ]
    }


@router.get("/data/bundles/{service_id}/{phone}")
async def get_data_bundles(service_id: str, phone: str):
    """Get available data bundles for a specific service and phone number via Hubtel VAS"""
    
    from services.hubtel_vas_service import get_hubtel_vas_service
    
    # Normalize phone number
    normalized_phone = phone
    if phone.startswith("+233"):
        normalized_phone = "0" + phone[4:]
    elif phone.startswith("233"):
        normalized_phone = "0" + phone[3:]
    elif not phone.startswith("0"):
        normalized_phone = "0" + phone
    
    # Detect network from phone
    prefix = normalized_phone[1:3] if len(normalized_phone) >= 3 else ""
    
    network = "MTN"  # Default
    if prefix in ["24", "25", "53", "54", "55", "59"]:
        network = "MTN"
    elif prefix in ["20", "50"]:
        network = "VODAFONE"
    elif prefix in ["27", "26", "56", "57"]:
        network = "TELECEL"
    elif prefix in ["23"]:
        network = "GLO"
    
    # Get bundles from Hubtel VAS
    hubtel_vas = get_hubtel_vas_service(db)
    result = await hubtel_vas.get_data_bundles(phone=normalized_phone, network=network)
    
    if result.get("success"):
        # Format packages for frontend compatibility
        formatted_packages = []
        for bundle in result.get("bundles", []):
            formatted_packages.append({
                "id": bundle.get("id", str(len(formatted_packages) + 1)),
                "display": bundle.get("name", bundle.get("display", "")),
                "value": bundle.get("validity", bundle.get("value", "")),
                "amount": bundle.get("price", bundle.get("amount", 0)),
                "service_id": service_id
            })
        
        return {
            "success": True,
            "packages": formatted_packages,
            "user_name": "",
            "phone": normalized_phone,
            "network": network
        }
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to fetch data bundles"))


@router.post("/airtime/purchase")
async def purchase_airtime(request: AirtimeRequest, current_client: dict = Depends(get_current_client)):
    """
    Purchase airtime using CASHBACK BALANCE ONLY.
    MoMo payment is not available for this service.
    """
    
    from services.hubtel_vas_service import get_hubtel_vas_service
    
    if request.amount < MIN_TRANSACTION_AMOUNT:
        raise HTTPException(status_code=400, detail=f"Minimum amount is GHS {MIN_TRANSACTION_AMOUNT}")
    
    # Validate network
    network_upper = request.network.upper()
    valid_networks = ["MTN", "VODAFONE", "TELECEL", "AIRTELTIGO", "GLO"]
    if network_upper not in valid_networks:
        raise HTTPException(status_code=400, detail="Invalid network. Supported: MTN, TELECEL, VODAFONE, GLO")
    
    # Calculate fee
    fee_info = await get_service_fee("airtime", request.amount)
    total_cost = fee_info["total"]
    
    # Check balance
    client_record = await db.clients.find_one({"id": current_client["id"]}, {"_id": 0})
    if not client_record:
        raise HTTPException(status_code=404, detail="Client not found")
    
    balance = client_record.get("cashback_balance", 0)
    if balance < total_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Required: GHS {total_cost:.2f} (GHS {request.amount:.2f} + GHS {fee_info['fee_amount']:.2f} fee)"
        )
    
    # Generate unique transaction ID
    transaction_id = f"SDM-AIR-{uuid.uuid4().hex[:12].upper()}"
    
    # Create service transaction record
    service_tx = {
        "id": str(uuid.uuid4()),
        "type": "airtime",
        "client_id": current_client["id"],
        "phone": request.phone,
        "network": network_upper,
        "amount": request.amount,
        "service_fee": fee_info["fee_amount"],
        "total_deducted": total_cost,
        "transaction_id": transaction_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.service_transactions.insert_one(service_tx)
    
    # Call Hubtel VAS API for airtime
    hubtel_vas = get_hubtel_vas_service(db)
    result = await hubtel_vas.buy_airtime(
        phone=request.phone,
        amount=request.amount,
        network=network_upper,
        client_reference=transaction_id
    )
    
    # CRITICAL SAFEGUARD: Double-check for test mode - NEVER deduct in test mode
    if result.get("test_mode"):
        logger.error("🚨 TEST MODE DETECTED IN VAS RESPONSE - BLOCKING BALANCE DEDUCTION")
        await db.service_transactions.update_one(
            {"id": service_tx["id"]},
            {"$set": {
                "status": "blocked_test_mode",
                "error": "Transaction blocked - system in test mode",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise HTTPException(
            status_code=503,
            detail="Service temporarily unavailable - system in test mode. No charges applied."
        )
    
    if result.get("success"):
        # Deduct balance
        await db.clients.update_one(
            {"id": current_client["id"]},
            {"$inc": {"cashback_balance": -total_cost}}
        )
        
        # Update transaction as success
        await db.service_transactions.update_one(
            {"id": service_tx["id"]},
            {"$set": {
                "status": "success",
                "provider_reference": result.get("transaction_id"),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "provider_reference": result.get("transaction_id"),
            "amount": request.amount,
            "fee": fee_info["fee_amount"],
            "total_deducted": total_cost,
            "new_balance": balance - total_cost,
            "message": result.get("message", "Airtime sent successfully")
        }
    else:
        # Update transaction as failed
        await db.service_transactions.update_one(
            {"id": service_tx["id"]},
            {"$set": {
                "status": "failed",
                "error": result.get("error"),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Airtime purchase failed")
        )


@router.post("/data/purchase")
async def purchase_data(request: DataBundleRequest, current_client: dict = Depends(get_current_client)):
    """
    Purchase data bundle using CASHBACK BALANCE ONLY.
    MoMo payment is not available for this service.
    """
    
    from services.hubtel_vas_service import get_hubtel_vas_service
    
    # Calculate fee based on the bundle price
    fee_info = await get_service_fee("data_bundle", request.amount)
    total_cost = fee_info["total"]
    
    # Check balance
    client_record = await db.clients.find_one({"id": current_client["id"]}, {"_id": 0})
    if not client_record:
        raise HTTPException(status_code=404, detail="Client not found")
    
    balance = client_record.get("cashback_balance", 0)
    if balance < total_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Required: GHS {total_cost:.2f} (GHS {request.amount:.2f} + GHS {fee_info['fee_amount']:.2f} fee)"
        )
    
    # Generate unique transaction ID
    transaction_id = f"SDM-DATA-{uuid.uuid4().hex[:12].upper()}"
    
    # Create service transaction record
    service_tx = {
        "id": str(uuid.uuid4()),
        "type": "data_bundle",
        "client_id": current_client["id"],
        "phone": request.phone,
        "network": request.network.upper(),
        "package_id": request.package_id,
        "service_id": request.service_id,
        "display_name": request.display_name,
        "amount": request.amount,
        "service_fee": fee_info["fee_amount"],
        "total_deducted": total_cost,
        "transaction_id": transaction_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.service_transactions.insert_one(service_tx)
    
    # Call Hubtel VAS API for data bundle
    hubtel_vas = get_hubtel_vas_service(db)
    result = await hubtel_vas.buy_data_bundle(
        phone=request.phone,
        bundle_id=request.package_id,
        amount=request.amount,
        network=request.network.upper(),
        client_reference=transaction_id
    )
    
    # CRITICAL SAFEGUARD: Double-check for test mode - NEVER deduct in test mode
    if result.get("test_mode"):
        logger.error("🚨 TEST MODE DETECTED IN DATA BUNDLE VAS RESPONSE - BLOCKING BALANCE DEDUCTION")
        await db.service_transactions.update_one(
            {"id": service_tx["id"]},
            {"$set": {
                "status": "blocked_test_mode",
                "error": "Transaction blocked - system in test mode",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise HTTPException(
            status_code=503,
            detail="Service temporarily unavailable - system in test mode. No charges applied."
        )
    
    if result.get("success"):
        # Deduct balance
        await db.clients.update_one(
            {"id": current_client["id"]},
            {"$inc": {"cashback_balance": -total_cost}}
        )
        
        # Update transaction as success
        await db.service_transactions.update_one(
            {"id": service_tx["id"]},
            {"$set": {
                "status": "success",
                "provider_reference": result.get("transaction_id"),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": f"Data bundle {request.display_name} sent to {request.phone}",
            "transaction_id": transaction_id,
            "provider_reference": result.get("transaction_id"),
            "amount": request.amount,
            "fee": fee_info["fee_amount"],
            "total_deducted": total_cost,
            "new_balance": balance - total_cost
        }
    else:
        # Update transaction as failed
        await db.service_transactions.update_one(
            {"id": service_tx["id"]},
            {"$set": {
                "status": "failed",
                "error": result.get("error"),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Data bundle purchase failed")
        )


@router.post("/ecg/pay")
async def pay_ecg(request: ECGPaymentRequest, current_client: dict = Depends(get_current_client)):
    """
    Pay ECG bill using CASHBACK BALANCE ONLY.
    MoMo payment is not available for this service.
    """
    
    from services.hubtel_vas_service import get_hubtel_vas_service
    
    if request.amount < MIN_TRANSACTION_AMOUNT:
        raise HTTPException(status_code=400, detail=f"Minimum amount is GHS {MIN_TRANSACTION_AMOUNT}")
    
    # Calculate fee
    fee_info = await get_service_fee("ecg_payment", request.amount)
    total_cost = fee_info["total"]
    
    # Check balance
    client_record = await db.clients.find_one({"id": current_client["id"]}, {"_id": 0})
    if not client_record:
        raise HTTPException(status_code=404, detail="Client not found")
    
    balance = client_record.get("cashback_balance", 0)
    if balance < total_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Required: GHS {total_cost:.2f}"
        )
    
    # Generate unique transaction ID
    transaction_id = f"SDM-ECG-{uuid.uuid4().hex[:12].upper()}"
    
    # Create service transaction record
    service_tx = {
        "id": str(uuid.uuid4()),
        "type": "ecg_payment",
        "client_id": current_client["id"],
        "meter_number": request.meter_number,
        "amount": request.amount,
        "service_fee": fee_info["fee_amount"],
        "total_deducted": total_cost,
        "transaction_id": transaction_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.service_transactions.insert_one(service_tx)
    
    # Call Hubtel VAS API for ECG payment
    hubtel_vas = get_hubtel_vas_service(db)
    result = await hubtel_vas.pay_ecg_bill(
        meter_number=request.meter_number,
        amount=request.amount,
        phone=request.phone,
        bill_type="prepaid",
        client_reference=transaction_id
    )
    
    # CRITICAL SAFEGUARD: Double-check for test mode - NEVER deduct in test mode
    if result.get("test_mode"):
        logger.error("🚨 TEST MODE DETECTED IN ECG VAS RESPONSE - BLOCKING BALANCE DEDUCTION")
        await db.service_transactions.update_one(
            {"id": service_tx["id"]},
            {"$set": {
                "status": "blocked_test_mode",
                "error": "Transaction blocked - system in test mode",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise HTTPException(
            status_code=503,
            detail="Service temporarily unavailable - system in test mode. No charges applied."
        )
    
    if result.get("success"):
        # Deduct balance
        await db.clients.update_one(
            {"id": current_client["id"]},
            {"$inc": {"cashback_balance": -total_cost}}
        )
        
        # Update transaction as success
        await db.service_transactions.update_one(
            {"id": service_tx["id"]},
            {"$set": {
                "status": "success",
                "provider_reference": result.get("transaction_id"),
                "ecg_token": result.get("token"),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": f"ECG payment of GHS {request.amount:.2f} to meter {request.meter_number}",
            "transaction_id": transaction_id,
            "provider_reference": result.get("transaction_id"),
            "ecg_token": result.get("token"),
            "amount": request.amount,
            "fee": fee_info["fee_amount"],
            "total_deducted": total_cost,
            "new_balance": balance - total_cost
        }
    else:
        # Update transaction as failed
        await db.service_transactions.update_one(
            {"id": service_tx["id"]},
            {"$set": {
                "status": "failed",
                "error": result.get("error"),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "ECG payment failed")
        )


@router.post("/withdrawal/initiate")
async def initiate_withdrawal(request: WithdrawalRequest, current_client: dict = Depends(get_current_client)):
    """Withdraw cashback to MoMo via Hubtel Send Money API"""
    
    from services.hubtel_momo_service import get_hubtel_momo_service
    
    # DETAILED LOGGING - Log everything for debugging
    logger.info("=" * 50)
    logger.info("WITHDRAWAL REQUEST RECEIVED")
    logger.info(f"Raw request data:")
    logger.info(f"  - phone: {repr(request.phone)}")
    logger.info(f"  - amount: {repr(request.amount)}")
    logger.info(f"  - network: {repr(request.network)}")
    logger.info(f"  - client_id: {current_client.get('id', 'unknown')}")
    logger.info("=" * 50)
    
    # Validate phone is not empty
    if not request.phone or not request.phone.strip():
        error_msg = "Phone number is required"
        logger.error(f"VALIDATION ERROR: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Validate amount is a valid number
    try:
        amount = float(request.amount)
    except (TypeError, ValueError):
        error_msg = f"Invalid amount: {request.amount}"
        logger.error(f"VALIDATION ERROR: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    min_withdrawal = 5.0
    max_withdrawal = 1000.0
    
    # Validate amount
    if amount < min_withdrawal:
        error_msg = f"Minimum withdrawal is GHS {min_withdrawal}. You requested GHS {amount}"
        logger.warning(f"VALIDATION ERROR: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    if amount > max_withdrawal:
        error_msg = f"Maximum withdrawal is GHS {max_withdrawal}. You requested GHS {amount}"
        logger.warning(f"VALIDATION ERROR: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    # NORMALIZE PHONE NUMBER - Accept all formats
    phone = request.phone.strip() if request.phone else ""
    phone = phone.replace(" ", "").replace("-", "")  # Remove spaces and dashes
    
    # Normalize to 233XXXXXXXXX format
    if phone.startswith("+"):
        phone = phone[1:]  # Remove +
    if phone.startswith("00"):
        phone = phone[2:]  # Remove 00
    if phone.startswith("0"):
        phone = "233" + phone[1:]  # 0XX -> 233XX
    if not phone.startswith("233"):
        phone = "233" + phone  # Add 233 prefix
    
    # Validate phone length
    if len(phone) != 12:
        logger.warning(f"Withdrawal rejected: invalid phone format {request.phone} -> normalized {phone}")
        raise HTTPException(status_code=400, detail=f"Invalid phone number format. Please enter a valid Ghana phone number.")
    
    logger.info(f"Phone normalized: {request.phone} -> {phone}")
    
    # NORMALIZE NETWORK - Map frontend values to Hubtel channel codes
    network_input = (request.network or "").strip().upper()
    
    # Network mapping: Frontend value -> Hubtel channel code
    network_map = {
        "MTN": "mtn-gh",
        "MTN MOMO": "mtn-gh",
        "MTN-MOMO": "mtn-gh",
        "MTNMOMO": "mtn-gh",
        "MTN MOBILE MONEY": "mtn-gh",
        "MTN-GH": "mtn-gh",
        "VODAFONE": "vodafone-gh",
        "VODAFONE CASH": "vodafone-gh",
        "VODAFONE-GH": "vodafone-gh",
        "TELECEL": "tigo-gh",
        "TELECEL CASH": "tigo-gh",
        "TIGO": "tigo-gh",
        "AIRTEL": "tigo-gh",
        "AIRTELTIGO": "tigo-gh",
        "AIRTEL-TIGO": "tigo-gh",
    }
    
    hubtel_channel = network_map.get(network_input, None)
    
    # Auto-detect network from phone if not mapped
    if not hubtel_channel:
        prefix = phone[3:5] if len(phone) >= 5 else ""  # Get prefix after 233
        if prefix in ["24", "25", "53", "54", "55", "59"]:
            hubtel_channel = "mtn-gh"
        elif prefix in ["20", "50"]:
            hubtel_channel = "vodafone-gh"
        elif prefix in ["27", "26", "56", "57"]:
            hubtel_channel = "tigo-gh"
        else:
            hubtel_channel = "mtn-gh"  # Default to MTN
    
    logger.info(f"Network normalized: {request.network} -> {hubtel_channel}")
    
    # Calculate fee
    fee_info = await get_service_fee("withdrawal", request.amount)
    total_deducted = request.amount  # Deduct full amount from balance
    net_amount = request.amount - fee_info["fee_amount"]  # Client receives this
    
    # Check balance
    client_record = await db.clients.find_one({"id": current_client["id"]}, {"_id": 0})
    if not client_record:
        logger.warning(f"Withdrawal rejected: client {current_client['id']} not found")
        raise HTTPException(status_code=404, detail="Client not found")
    
    balance = client_record.get("cashback_balance", 0)
    if balance < total_deducted:
        logger.warning(f"Withdrawal rejected: balance {balance} < required {total_deducted}")
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient cashback balance. Available: GHS {balance:.2f}, Required: GHS {total_deducted:.2f}"
        )
    
    # Generate unique transaction ID
    transaction_id = f"SDM-WD-{uuid.uuid4().hex[:12].upper()}"
    
    logger.info(f"Processing withdrawal: {transaction_id}, amount={request.amount}, net={net_amount}, fee={fee_info['fee_amount']}")
    
    # Create withdrawal record (PENDING status BEFORE API call)
    withdrawal_tx = {
        "id": str(uuid.uuid4()),
        "type": "withdrawal",
        "client_id": current_client["id"],
        "client_name": client_record.get("full_name", client_record.get("name", "")),
        "phone": phone,  # Use normalized phone
        "network": hubtel_channel,  # Use Hubtel channel code
        "amount": request.amount,
        "service_fee": fee_info["fee_amount"],
        "net_amount": net_amount,
        "total_deducted": total_deducted,
        "transaction_id": transaction_id,
        "status": "pending",
        "provider": "hubtel",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.service_transactions.insert_one(withdrawal_tx)
    
    logger.info(f"Calling Hubtel Send Money API for {transaction_id}")
    
    # Call Hubtel Send Money API with NORMALIZED phone and channel
    hubtel_service = get_hubtel_momo_service(db)
    
    try:
        result = await hubtel_service.send_momo(
            phone=phone,  # Use normalized phone (233XXXXXXXXX)
            amount=net_amount,  # Send net amount after fee
            description=f"SDM Rewards Cashback Withdrawal - {transaction_id}",
            client_reference=transaction_id,
            recipient_name=client_record.get("full_name", client_record.get("name", "SDM Client")),
            channel=hubtel_channel  # Use normalized channel (mtn-gh, vodafone-gh, tigo-gh)
        )
        
        logger.info(f"Hubtel response for {transaction_id}: {result}")
        
    except Exception as e:
        logger.error(f"Hubtel API error for {transaction_id}: {str(e)}")
        # Update transaction as failed
        await db.service_transactions.update_one(
            {"id": withdrawal_tx["id"]},
            {"$set": {
                "status": "failed",
                "error": f"API Error: {str(e)}",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise HTTPException(
            status_code=500,
            detail=f"Payment service error: {str(e)}"
        )
    
    if result.get("success"):
        # Deduct balance
        await db.clients.update_one(
            {"id": current_client["id"]},
            {"$inc": {"cashback_balance": -total_deducted}}
        )
        
        # Update transaction as processing
        await db.service_transactions.update_one(
            {"id": withdrawal_tx["id"]},
            {"$set": {
                "status": "processing",
                "provider_reference": result.get("transaction_id"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": f"Withdrawal of GHS {net_amount:.2f} to {request.phone} initiated",
            "transaction_id": transaction_id,
            "provider_reference": result.get("transaction_id"),
            "amount": request.amount,
            "fee": fee_info["fee_amount"],
            "net_amount": net_amount,
            "total_deducted": total_deducted,
            "new_balance": balance - total_deducted,
            "status": "processing"
        }
    else:
        # Update transaction as failed
        await db.service_transactions.update_one(
            {"id": withdrawal_tx["id"]},
            {"$set": {
                "status": "failed",
                "error": result.get("error"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Withdrawal failed. Please try again.")
        )


@router.post("/withdraw-momo")
async def withdraw_momo(request: WithdrawalRequest, current_client: dict = Depends(get_current_client)):
    """
    Withdraw CASHBACK to MoMo.
    Alias for /withdrawal/initiate.
    
    IMPORTANT: This withdraws from CASHBACK BALANCE ONLY.
    This is NOT a wallet or deposit system.
    
    Business Rules:
    - Minimum: 5 GHS
    - Fee: 3% (configurable from Admin Dashboard)
    - Balance deducted BEFORE Hubtel API call
    
    Hubtel Send Money API: https://smp.hubtel.com/api/merchants/2021772/send/mobilemoney
    """
    return await initiate_withdrawal(request, current_client)


@router.get("/history")
async def get_service_history(
    limit: int = 20,
    current_client: dict = Depends(get_current_client)
):
    """Get client's service transaction history"""
    
    transactions = await db.service_transactions.find(
        {"client_id": current_client["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    return {
        "success": True,
        "transactions": transactions,
        "count": len(transactions)
    }



# ===========================================
# BANK WITHDRAWAL ENDPOINTS
# ===========================================

from services.hubtel_bank_service import get_hubtel_bank_service, GHANA_BANK_CODES

class BankWithdrawalRequest(BaseModel):
    """Bank withdrawal request"""
    account_number: str
    bank_id: str  # e.g., "GCB", "ECOBANK"
    account_name: str
    amount: float


@router.get("/banks")
async def get_supported_banks():
    """Get list of supported banks for withdrawal"""
    bank_service = get_hubtel_bank_service()
    banks = bank_service.get_bank_list()
    return {"success": True, "banks": banks}


@router.post("/withdrawal/bank")
async def initiate_bank_withdrawal(
    request: BankWithdrawalRequest,
    current_client: dict = Depends(get_current_client)
):
    """
    Initiate bank withdrawal (cashback to bank account)
    
    Flow:
    1. Validate client has sufficient balance
    2. Deduct cashback
    3. Send to bank via Hubtel
    4. Return transaction reference for status tracking
    """
    client_id = current_client["id"]
    
    # Get current balance
    client_record = await db.clients.find_one({"id": client_id})
    if not client_record:
        raise HTTPException(status_code=404, detail="Client not found")
    
    current_balance = client_record.get("cashback_balance", 0)
    
    # Get withdrawal fee from config
    config = await db.platform_config.find_one({"key": "main"})
    withdrawal_config = config.get("withdrawal_config", {}) if config else {}
    fee_rate = withdrawal_config.get("fee_rate", 3.0)  # Default 3%
    min_amount = withdrawal_config.get("min_amount", 10.0)
    
    # Calculate fee
    fee = request.amount * (fee_rate / 100)
    total_deduction = request.amount + fee
    
    # Validations
    if request.amount < min_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum withdrawal amount is GHS {min_amount}"
        )
    
    if total_deduction > current_balance:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Required: GHS {total_deduction:.2f}, Available: GHS {current_balance:.2f}"
        )
    
    # Generate transaction ID
    transaction_id = f"BWITHDRAW-{uuid.uuid4().hex[:12].upper()}"
    
    # Create service transaction record
    service_tx = {
        "id": transaction_id,
        "type": "bank_withdrawal",
        "client_id": client_id,
        "account_number": request.account_number[-4:].rjust(len(request.account_number), '*'),
        "account_name": request.account_name,
        "bank_id": request.bank_id,
        "amount": request.amount,
        "fee": fee,
        "total_deducted": total_deduction,
        "balance_before": current_balance,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.service_transactions.insert_one(service_tx)
    
    # Call Hubtel Bank Transfer API
    bank_service = get_hubtel_bank_service(db)
    result = await bank_service.send_to_bank(
        account_number=request.account_number,
        bank_id=request.bank_id,
        amount=request.amount,
        account_name=request.account_name,
        description=f"SDM Cashback Withdrawal - {client_record.get('name', 'User')}",
        client_reference=transaction_id,
        user_id=client_id
    )
    
    if result.get("success"):
        # Deduct balance
        new_balance = current_balance - total_deduction
        await db.clients.update_one(
            {"id": client_id},
            {
                "$set": {"cashback_balance": new_balance},
                "$inc": {"total_withdrawn": request.amount}
            }
        )
        
        # Update service transaction
        await db.service_transactions.update_one(
            {"id": transaction_id},
            {"$set": {
                "status": result.get("status", "processing"),
                "balance_after": new_balance,
                "provider_reference": result.get("transaction_id"),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": "Bank withdrawal initiated successfully",
            "transaction_id": transaction_id,
            "hubtel_reference": result.get("transaction_id"),
            "amount": request.amount,
            "fee": fee,
            "total_deducted": total_deduction,
            "new_balance": new_balance,
            "status": result.get("status", "processing")
        }
    else:
        # Update service transaction as failed
        await db.service_transactions.update_one(
            {"id": transaction_id},
            {"$set": {
                "status": "failed",
                "error": result.get("error"),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Bank withdrawal failed")
        )


@router.get("/transaction/status/{reference}")
async def check_transaction_status(
    reference: str,
    current_client: dict = Depends(get_current_client)
):
    """
    Check transaction status via Hubtel API
    
    Returns current status: pending, processing, success, failed
    """
    client_id = current_client["id"]
    
    # Find the transaction
    transaction = await db.service_transactions.find_one({
        "id": reference,
        "client_id": client_id
    })
    
    if not transaction:
        # Also check bank_transfers collection
        transaction = await db.bank_transfers.find_one({
            "client_reference": reference,
            "user_id": client_id
        })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If already completed, return cached status
    if transaction.get("status") in ["success", "failed", "cancelled"]:
        return {
            "success": True,
            "status": transaction.get("status"),
            "transaction_id": reference,
            "message": f"Transaction {transaction.get('status')}"
        }
    
    # Check status via Hubtel API
    bank_service = get_hubtel_bank_service(db)
    status_result = await bank_service.check_transaction_status(reference)
    
    if status_result.get("success"):
        new_status = status_result.get("status", "unknown")
        
        # Update our records
        await db.service_transactions.update_one(
            {"id": reference},
            {"$set": {
                "status": new_status,
                "status_checked_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "status": new_status,
            "transaction_id": reference,
            "hubtel_status": status_result.get("hubtel_status"),
            "message": f"Transaction {new_status}"
        }
    else:
        return {
            "success": False,
            "status": transaction.get("status", "unknown"),
            "transaction_id": reference,
            "error": status_result.get("error", "Could not check status")
        }


@router.get("/withdrawal/bank/history")
async def get_bank_withdrawal_history(
    limit: int = 20,
    current_client: dict = Depends(get_current_client)
):
    """Get user's bank withdrawal history"""
    client_id = current_client["id"]
    
    # Get from service_transactions
    transactions = await db.service_transactions.find(
        {"client_id": client_id, "type": "bank_withdrawal"},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    return {
        "success": True,
        "transactions": transactions,
        "count": len(transactions)
    }
