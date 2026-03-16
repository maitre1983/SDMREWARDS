"""
SDM REWARDS - Services Router
==============================
Handles cashback-funded services: Airtime, Data, ECG, Withdrawal
"""

import os
import httpx
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from routers.auth import get_current_client

# Setup
router = APIRouter()
logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# BulkClix Config
BULKCLIX_API_KEY = os.environ.get('BULKCLIX_API_KEY', '')
BULKCLIX_BASE_URL = os.environ.get('BULKCLIX_BASE_URL', 'https://api.bulkclix.com/api/v1')

# BulkClix Network IDs for Airtime
BULKCLIX_NETWORK_IDS = {
    "MTN": "eed55cbe-ed76-4200-865b-45a80a7bb8e9",
    "TELECEL": "1f4d8c1a-e5e2-4954-8b2a-6843d33181c7",
    "AIRTELTIGO": "6a2c7586-bf4d-42d4-ace1-2a3386eb4bb2"
}

# BulkClix Service IDs for Data Bundles
BULKCLIX_DATA_SERVICE_IDS = {
    "MTN": "4a1d6ab2-df53-44fd-b42b-97753ba77508",
    "TELECEL": "205cb30a-f67c-4d4d-983a-19c3da2ebeef",
    "TELECEL_BROADBAND": "14e35989-2341-4be8-b5f4-63a2f31fa745",
    "AIRTELTIGO": "442424ef-3eac-4d88-a596-65b5ec7a345f"
}

# Minimum amounts
MIN_CASHBACK_BALANCE = 2.0
MIN_TRANSACTION_AMOUNT = 2.0


# ============== REQUEST MODELS ==============

# Payment method enum
class PaymentMethod:
    CASHBACK = "cashback"      # 100% cashback
    MOMO = "momo"              # 100% mobile money
    HYBRID = "hybrid"          # cashback + momo combined

class AirtimeRequest(BaseModel):
    phone: str
    amount: float
    network: str  # MTN, TELECEL, AIRTELTIGO
    payment_method: str = "cashback"  # cashback, momo, hybrid
    momo_phone: Optional[str] = None  # Required for momo/hybrid


class DataBundleRequest(BaseModel):
    phone: str
    package_id: str  # BulkClix package ID
    service_id: str  # BulkClix service ID
    network: str  # MTN, TELECEL, AIRTELTIGO
    amount: float  # Price of the bundle
    display_name: str  # e.g. "1.37GB"
    payment_method: str = "cashback"  # cashback, momo, hybrid
    momo_phone: Optional[str] = None  # Required for momo/hybrid


class ECGPaymentRequest(BaseModel):
    meter_number: str
    amount: float
    payment_method: str = "cashback"  # cashback, momo, hybrid
    momo_phone: Optional[str] = None  # Required for momo/hybrid


class WithdrawalRequest(BaseModel):
    phone: str
    amount: float
    network: str


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
    """Get available data bundles for a specific service and phone number"""
    
    # Format phone for BulkClix (must start with 0)
    bulkclix_phone = phone
    if phone.startswith("+233"):
        bulkclix_phone = "0" + phone[4:]
    elif phone.startswith("233"):
        bulkclix_phone = "0" + phone[3:]
    
    if not BULKCLIX_API_KEY:
        raise HTTPException(status_code=500, detail="BulkClix API not configured")
    
    try:
        async with httpx.AsyncClient(follow_redirects=True) as http_client:
            response = await http_client.get(
                f"{BULKCLIX_BASE_URL}/databundle-api-v2/offers/{service_id}/{bulkclix_phone}",
                headers={
                    "Accept": "application/json",
                    "x-api-key": BULKCLIX_API_KEY
                },
                timeout=30.0
            )
            
            logger.info(f"BulkClix Data Bundles Response: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                packages = data.get("data", {}).get("packages", {}).get("data", [])
                user_name = data.get("data", {}).get("user", {}).get("name", "")
                
                # Format packages for frontend
                formatted_packages = []
                for pkg in packages:
                    formatted_packages.append({
                        "id": pkg.get("id"),
                        "display": pkg.get("Display"),
                        "value": pkg.get("Value"),
                        "amount": pkg.get("Amount"),
                        "service_id": service_id
                    })
                
                return {
                    "success": True,
                    "packages": formatted_packages,
                    "user_name": user_name,
                    "phone": bulkclix_phone
                }
            else:
                logger.error(f"BulkClix data bundles error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=400, detail="Failed to fetch data bundles")
                
    except httpx.RequestError as e:
        logger.error(f"BulkClix data bundles network error: {e}")
        raise HTTPException(status_code=500, detail="Network error - please try again")


@router.post("/airtime/purchase")
async def purchase_airtime(request: AirtimeRequest, current_client: dict = Depends(get_current_client)):
    """Purchase airtime using cashback balance via Hubtel VAS API"""
    
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
    """Purchase data bundle using cashback balance via Hubtel VAS API"""
    
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
    """Pay ECG bill using cashback balance via Hubtel VAS API"""
    
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
        bill_type="prepaid",
        client_reference=transaction_id
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
    """Withdraw cashback to MoMo"""
    
    if request.amount < MIN_TRANSACTION_AMOUNT:
        raise HTTPException(status_code=400, detail=f"Minimum withdrawal is GHS {MIN_TRANSACTION_AMOUNT}")
    
    # Calculate fee
    fee_info = await get_service_fee("withdrawal", request.amount)
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
    
    # Create withdrawal record
    withdrawal_tx = {
        "id": str(uuid.uuid4()),
        "type": "withdrawal",
        "client_id": current_client["id"],
        "phone": request.phone,
        "network": request.network.upper(),
        "amount": request.amount,
        "service_fee": fee_info["fee_amount"],
        "total_deducted": total_cost,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.service_transactions.insert_one(withdrawal_tx)
    
    # Debit cashback first
    debit_result = await debit_cashback(
        current_client["id"],
        total_cost,
        f"MoMo withdrawal: GHS {request.amount} to {request.phone}",
        "withdrawal"
    )
    
    # TODO: Call BulkClix disbursement API
    # For now, mark as processing
    
    # If BulkClix API is available, send money
    if BULKCLIX_API_KEY:
        try:
            async with httpx.AsyncClient(follow_redirects=True) as http_client:
                # Format phone
                bulkclix_phone = request.phone
                if request.phone.startswith("+233"):
                    bulkclix_phone = "0" + request.phone[4:]
                elif request.phone.startswith("233"):
                    bulkclix_phone = "0" + request.phone[3:]
                
                response = await http_client.post(
                    f"{BULKCLIX_BASE_URL}/payment-api/send/mobilemoney",
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "x-api-key": BULKCLIX_API_KEY
                    },
                    json={
                        "amount": request.amount,
                        "phone_number": bulkclix_phone,
                        "network": request.network.upper(),
                        "reference": f"SDM-WD-{withdrawal_tx['id'][:8]}",
                        "description": "SDM Rewards Cashback Withdrawal"
                    },
                    timeout=30.0
                )
                
                logger.info(f"Withdrawal API response: {response.status_code} - {response.text[:300] if response.text else 'EMPTY'}")
                
                if response.status_code == 200:
                    await db.service_transactions.update_one(
                        {"id": withdrawal_tx["id"]},
                        {"$set": {"status": "processing", "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
        except Exception as e:
            logger.error(f"Withdrawal API error: {e}")
            # Keep as pending, manual review needed
    
    return {
        "success": True,
        "message": f"Withdrawal of GHS {request.amount:.2f} to {request.phone} initiated",
        "transaction_id": withdrawal_tx["id"],
        "amount": request.amount,
        "fee": fee_info["fee_amount"],
        "total_deducted": total_cost,
        "new_balance": debit_result["balance_after"],
        "status": "processing"
    }


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
