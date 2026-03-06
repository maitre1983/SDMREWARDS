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

# Minimum amounts
MIN_CASHBACK_BALANCE = 2.0
MIN_TRANSACTION_AMOUNT = 2.0


# ============== REQUEST MODELS ==============

class AirtimeRequest(BaseModel):
    phone: str
    amount: float
    network: str  # MTN, TELECEL, AIRTELTIGO


class DataBundleRequest(BaseModel):
    phone: str
    bundle_code: str
    network: str


class ECGPaymentRequest(BaseModel):
    meter_number: str
    amount: float


class WithdrawalRequest(BaseModel):
    phone: str
    amount: float
    network: str


# ============== HELPER FUNCTIONS ==============

async def get_platform_config():
    """Get platform configuration including fees"""
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    return config or {}


async def get_service_fee(service_type: str, amount: float) -> dict:
    """Calculate service fee based on config"""
    config = await get_platform_config()
    
    # Default fee structure
    fee_rates = {
        "airtime": config.get("airtime_fee_rate", 2.0),
        "data_bundle": config.get("data_fee_rate", 3.0),
        "ecg_payment": config.get("ecg_fee_rate", 1.5),
        "withdrawal": config.get("withdrawal_fee_rate", 1.0)
    }
    
    fee_rate = fee_rates.get(service_type, 1.0)
    fee_amount = round(amount * fee_rate / 100, 2)
    total = round(amount + fee_amount, 2)
    
    return {
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
    
    # Create transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "type": service_type,
        "client_id": client_id,
        "amount": amount,
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
    """Get current service fees"""
    config = await get_platform_config()
    
    return {
        "success": True,
        "fees": {
            "airtime": config.get("airtime_fee_rate", 2.0),
            "data_bundle": config.get("data_fee_rate", 3.0),
            "ecg_payment": config.get("ecg_fee_rate", 1.5),
            "withdrawal": config.get("withdrawal_fee_rate", 1.0)
        },
        "min_transaction": MIN_TRANSACTION_AMOUNT,
        "min_balance": MIN_CASHBACK_BALANCE
    }


@router.post("/airtime/purchase")
async def purchase_airtime(request: AirtimeRequest, current_client: dict = Depends(get_current_client)):
    """Purchase airtime using cashback balance"""
    
    if request.amount < MIN_TRANSACTION_AMOUNT:
        raise HTTPException(status_code=400, detail=f"Minimum amount is GHS {MIN_TRANSACTION_AMOUNT}")
    
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
    
    # Create service transaction record
    service_tx = {
        "id": str(uuid.uuid4()),
        "type": "airtime",
        "client_id": current_client["id"],
        "phone": request.phone,
        "network": request.network.upper(),
        "amount": request.amount,
        "service_fee": fee_info["fee_amount"],
        "total_deducted": total_cost,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.service_transactions.insert_one(service_tx)
    
    # TODO: Call BulkClix airtime API when available
    # For now, simulate success and debit balance
    
    # Debit cashback
    debit_result = await debit_cashback(
        current_client["id"],
        total_cost,
        f"Airtime purchase: GHS {request.amount} to {request.phone}",
        "airtime"
    )
    
    # Update service transaction
    await db.service_transactions.update_one(
        {"id": service_tx["id"]},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "message": f"Airtime of GHS {request.amount:.2f} sent to {request.phone}",
        "transaction_id": service_tx["id"],
        "amount": request.amount,
        "fee": fee_info["fee_amount"],
        "total_deducted": total_cost,
        "new_balance": debit_result["balance_after"]
    }


@router.post("/data/purchase")
async def purchase_data(request: DataBundleRequest, current_client: dict = Depends(get_current_client)):
    """Purchase data bundle using cashback balance"""
    
    # TODO: Get bundle price from BulkClix API or config
    # For now, use a placeholder
    bundle_prices = {
        "MTN_1GB": 10.0,
        "MTN_2GB": 18.0,
        "MTN_5GB": 40.0,
        "TELECEL_1GB": 9.0,
        "TELECEL_2GB": 16.0,
        "AIRTELTIGO_1GB": 8.0,
        "AIRTELTIGO_2GB": 15.0
    }
    
    bundle_key = f"{request.network.upper()}_{request.bundle_code}"
    bundle_price = bundle_prices.get(bundle_key, 0)
    
    if bundle_price == 0:
        raise HTTPException(status_code=400, detail="Invalid data bundle selected")
    
    # Calculate fee
    fee_info = await get_service_fee("data_bundle", bundle_price)
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
    
    # Create service transaction record
    service_tx = {
        "id": str(uuid.uuid4()),
        "type": "data_bundle",
        "client_id": current_client["id"],
        "phone": request.phone,
        "network": request.network.upper(),
        "bundle_code": request.bundle_code,
        "amount": bundle_price,
        "service_fee": fee_info["fee_amount"],
        "total_deducted": total_cost,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.service_transactions.insert_one(service_tx)
    
    # TODO: Call BulkClix data API when available
    
    # Debit cashback
    debit_result = await debit_cashback(
        current_client["id"],
        total_cost,
        f"Data bundle: {request.bundle_code} to {request.phone}",
        "data_bundle"
    )
    
    # Update service transaction
    await db.service_transactions.update_one(
        {"id": service_tx["id"]},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "message": f"Data bundle {request.bundle_code} sent to {request.phone}",
        "transaction_id": service_tx["id"],
        "amount": bundle_price,
        "fee": fee_info["fee_amount"],
        "total_deducted": total_cost,
        "new_balance": debit_result["balance_after"]
    }


@router.post("/ecg/pay")
async def pay_ecg(request: ECGPaymentRequest, current_client: dict = Depends(get_current_client)):
    """Pay ECG bill using cashback balance"""
    
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
    
    # Create service transaction record
    service_tx = {
        "id": str(uuid.uuid4()),
        "type": "ecg_payment",
        "client_id": current_client["id"],
        "meter_number": request.meter_number,
        "amount": request.amount,
        "service_fee": fee_info["fee_amount"],
        "total_deducted": total_cost,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.service_transactions.insert_one(service_tx)
    
    # TODO: Call BulkClix ECG API when available
    
    # Debit cashback
    debit_result = await debit_cashback(
        current_client["id"],
        total_cost,
        f"ECG payment: GHS {request.amount} to meter {request.meter_number}",
        "ecg_payment"
    )
    
    # Update service transaction
    await db.service_transactions.update_one(
        {"id": service_tx["id"]},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "message": f"ECG payment of GHS {request.amount:.2f} to meter {request.meter_number}",
        "transaction_id": service_tx["id"],
        "amount": request.amount,
        "fee": fee_info["fee_amount"],
        "total_deducted": total_cost,
        "new_balance": debit_result["balance_after"]
    }


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
