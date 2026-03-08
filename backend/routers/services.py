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

class AirtimeRequest(BaseModel):
    phone: str
    amount: float
    network: str  # MTN, TELECEL, AIRTELTIGO


class DataBundleRequest(BaseModel):
    phone: str
    package_id: str  # BulkClix package ID
    service_id: str  # BulkClix service ID
    network: str  # MTN, TELECEL, AIRTELTIGO
    amount: float  # Price of the bundle
    display_name: str  # e.g. "1.37GB"


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
    """Purchase airtime using cashback balance via BulkClix API"""
    
    if request.amount < MIN_TRANSACTION_AMOUNT:
        raise HTTPException(status_code=400, detail=f"Minimum amount is GHS {MIN_TRANSACTION_AMOUNT}")
    
    # Validate network
    network_upper = request.network.upper()
    if network_upper not in BULKCLIX_NETWORK_IDS:
        raise HTTPException(status_code=400, detail="Invalid network. Supported: MTN, TELECEL, AIRTELTIGO")
    
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
    
    # Format phone number for BulkClix (must start with 0)
    bulkclix_phone = request.phone
    if request.phone.startswith("+233"):
        bulkclix_phone = "0" + request.phone[4:]
    elif request.phone.startswith("233"):
        bulkclix_phone = "0" + request.phone[3:]
    
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
    
    # Call BulkClix airtime API
    api_success = False
    api_message = "Transaction simulated"
    provider_reference = None
    
    if BULKCLIX_API_KEY:
        try:
            async with httpx.AsyncClient(follow_redirects=True) as http_client:
                # Get network ID for BulkClix
                network_id = BULKCLIX_NETWORK_IDS.get(network_upper)
                
                payload = {
                    "amount": request.amount,
                    "network_id": network_id,
                    "phone_number": bulkclix_phone,
                    "transaction_id": transaction_id
                }
                
                logger.info(f"BulkClix Airtime Request: {payload}")
                
                response = await http_client.post(
                    f"{BULKCLIX_BASE_URL}/airtime-api/sendAirtime",
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "x-api-key": BULKCLIX_API_KEY
                    },
                    json=payload,
                    timeout=30.0
                )
                
                logger.info(f"BulkClix Airtime Response: {response.status_code} - {response.text[:500] if response.text else 'EMPTY'}")
                
                result = response.json() if response.text else {}
                
                # Check for success - BulkClix returns success messages
                if response.status_code == 200:
                    message_lower = result.get("message", "").lower()
                    if result.get("status") == "success" or "success" in message_lower or "sent" in message_lower:
                        api_success = True
                        api_message = result.get("message", "Airtime sent successfully")
                        # Get reference from data object if available
                        data = result.get("data", {})
                        provider_reference = data.get("reference") or data.get("transaction_id") or result.get("reference") or transaction_id
                    else:
                        api_message = result.get("message", "Unknown response from provider")
                        logger.warning(f"BulkClix airtime returned non-success: {result}")
                else:
                    api_message = result.get("message", f"Provider returned status {response.status_code}")
                    logger.error(f"BulkClix airtime failed: {response.status_code} - {result}")
                    
        except httpx.RequestError as e:
            logger.error(f"BulkClix airtime network error: {e}")
            api_message = "Network error - please try again"
        except Exception as e:
            logger.error(f"BulkClix airtime error: {e}")
            api_message = str(e)
    else:
        logger.warning("BULKCLIX_API_KEY not configured - simulating airtime purchase")
        api_success = True  # Simulate success in test mode
        api_message = "Airtime sent (simulated - API not configured)"
        provider_reference = f"SIM-{transaction_id}"
    
    if not api_success:
        # Update transaction as failed
        await db.service_transactions.update_one(
            {"id": service_tx["id"]},
            {"$set": {
                "status": "failed",
                "error_message": api_message,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise HTTPException(status_code=400, detail=f"Airtime purchase failed: {api_message}")
    
    # Debit cashback
    debit_result = await debit_cashback(
        current_client["id"],
        total_cost,
        f"Airtime purchase: GHS {request.amount} to {request.phone}",
        "airtime"
    )
    
    # Update service transaction as completed
    await db.service_transactions.update_one(
        {"id": service_tx["id"]},
        {"$set": {
            "status": "completed",
            "provider_reference": provider_reference,
            "provider_message": api_message,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Airtime of GHS {request.amount:.2f} sent to {request.phone}",
        "transaction_id": service_tx["id"],
        "provider_reference": provider_reference,
        "amount": request.amount,
        "fee": fee_info["fee_amount"],
        "total_deducted": total_cost,
        "new_balance": debit_result["balance_after"]
    }


@router.post("/data/purchase")
async def purchase_data(request: DataBundleRequest, current_client: dict = Depends(get_current_client)):
    """Purchase data bundle using cashback balance via BulkClix API"""
    
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
    
    # Format phone number for BulkClix (must start with 0)
    bulkclix_phone = request.phone
    if request.phone.startswith("+233"):
        bulkclix_phone = "0" + request.phone[4:]
    elif request.phone.startswith("233"):
        bulkclix_phone = "0" + request.phone[3:]
    
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
    
    # Call BulkClix data API
    api_success = False
    api_message = "Transaction simulated"
    provider_reference = None
    
    if BULKCLIX_API_KEY:
        try:
            async with httpx.AsyncClient(follow_redirects=True) as http_client:
                payload = {
                    "phone_number": bulkclix_phone,
                    "network": request.network.upper(),
                    "amount": request.amount,
                    "service_id": request.service_id,
                    "type": "momo",
                    "package_id": request.package_id,
                    "name": client_record.get("full_name", "Customer")
                }
                
                logger.info(f"BulkClix Data Request: {payload}")
                
                response = await http_client.post(
                    f"{BULKCLIX_BASE_URL}/databundle-api-v2/buy",
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "x-api-key": BULKCLIX_API_KEY
                    },
                    json=payload,
                    timeout=30.0
                )
                
                logger.info(f"BulkClix Data Response: {response.status_code} - {response.text[:500] if response.text else 'EMPTY'}")
                
                result = response.json() if response.text else {}
                
                # Check for success
                if response.status_code == 200:
                    message_lower = result.get("message", "").lower()
                    if result.get("status") == "success" or "success" in message_lower:
                        api_success = True
                        api_message = result.get("message", "Data bundle sent successfully")
                        data = result.get("data", {})
                        provider_reference = data.get("reference") or data.get("transaction_id") or result.get("reference") or transaction_id
                    else:
                        api_message = result.get("message", "Unknown response from provider")
                        logger.warning(f"BulkClix data returned non-success: {result}")
                else:
                    api_message = result.get("message", f"Provider returned status {response.status_code}")
                    logger.error(f"BulkClix data failed: {response.status_code} - {result}")
                    
        except httpx.RequestError as e:
            logger.error(f"BulkClix data network error: {e}")
            api_message = "Network error - please try again"
        except Exception as e:
            logger.error(f"BulkClix data error: {e}")
            api_message = str(e)
    else:
        logger.warning("BULKCLIX_API_KEY not configured - simulating data purchase")
        api_success = True  # Simulate success in test mode
        api_message = "Data bundle sent (simulated - API not configured)"
        provider_reference = f"SIM-{transaction_id}"
    
    if not api_success:
        # Update transaction as failed
        await db.service_transactions.update_one(
            {"id": service_tx["id"]},
            {"$set": {
                "status": "failed",
                "error_message": api_message,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise HTTPException(status_code=400, detail=f"Data bundle purchase failed: {api_message}")
    
    # Debit cashback
    debit_result = await debit_cashback(
        current_client["id"],
        total_cost,
        f"Data bundle: {request.display_name} to {request.phone}",
        "data_bundle"
    )
    
    # Update service transaction as completed
    await db.service_transactions.update_one(
        {"id": service_tx["id"]},
        {"$set": {
            "status": "completed",
            "provider_reference": provider_reference,
            "provider_message": api_message,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Data bundle {request.display_name} sent to {request.phone}",
        "transaction_id": service_tx["id"],
        "provider_reference": provider_reference,
        "amount": request.amount,
        "fee": fee_info["fee_amount"],
        "total_deducted": total_cost,
        "new_balance": debit_result["balance_after"]
    }


@router.post("/ecg/pay")
async def pay_ecg(request: ECGPaymentRequest, current_client: dict = Depends(get_current_client)):
    """Pay ECG bill using cashback balance via BulkClix API"""
    
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
    
    # Call BulkClix bill payment API
    api_success = False
    api_message = "Transaction simulated"
    provider_reference = None
    ecg_token = None
    
    if BULKCLIX_API_KEY:
        try:
            async with httpx.AsyncClient(follow_redirects=True) as http_client:
                payload = {
                    "provider": "ECG",
                    "account_number": request.meter_number,
                    "amount": request.amount,
                    "reference": f"SDM-ECG-{service_tx['id'][:8].upper()}"
                }
                
                logger.info(f"BulkClix ECG Request: {payload}")
                
                response = await http_client.post(
                    f"{BULKCLIX_BASE_URL}/bill-api/pay",
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "x-api-key": BULKCLIX_API_KEY
                    },
                    json=payload,
                    timeout=60.0  # Longer timeout for bill payments
                )
                
                logger.info(f"BulkClix ECG Response: {response.status_code} - {response.text[:500] if response.text else 'EMPTY'}")
                
                result = response.json() if response.text else {}
                
                # Check for success
                if response.status_code == 200:
                    if result.get("status") == "success" or "success" in result.get("message", "").lower():
                        api_success = True
                        api_message = result.get("message", "ECG payment successful")
                        provider_reference = result.get("reference") or result.get("transaction_id")
                        ecg_token = result.get("token") or result.get("receipt_number") or result.get("data", {}).get("token")
                    else:
                        api_message = result.get("message", "Unknown response from provider")
                        logger.warning(f"BulkClix ECG returned non-success: {result}")
                else:
                    api_message = result.get("message", f"Provider returned status {response.status_code}")
                    logger.error(f"BulkClix ECG failed: {response.status_code} - {result}")
                    
        except httpx.RequestError as e:
            logger.error(f"BulkClix ECG network error: {e}")
            api_message = "Network error - please try again"
        except Exception as e:
            logger.error(f"BulkClix ECG error: {e}")
            api_message = str(e)
    else:
        logger.warning("BULKCLIX_API_KEY not configured - simulating ECG payment")
        api_success = True  # Simulate success in test mode
        api_message = "ECG payment processed (simulated - API not configured)"
        provider_reference = f"SIM-{service_tx['id'][:8].upper()}"
        ecg_token = f"TOKEN-{uuid.uuid4().hex[:12].upper()}"
    
    if not api_success:
        # Update transaction as failed
        await db.service_transactions.update_one(
            {"id": service_tx["id"]},
            {"$set": {
                "status": "failed",
                "error_message": api_message,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise HTTPException(status_code=400, detail=f"ECG payment failed: {api_message}")
    
    # Debit cashback
    debit_result = await debit_cashback(
        current_client["id"],
        total_cost,
        f"ECG payment: GHS {request.amount} to meter {request.meter_number}",
        "ecg_payment"
    )
    
    # Update service transaction as completed
    await db.service_transactions.update_one(
        {"id": service_tx["id"]},
        {"$set": {
            "status": "completed",
            "provider_reference": provider_reference,
            "ecg_token": ecg_token,
            "provider_message": api_message,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"ECG payment of GHS {request.amount:.2f} to meter {request.meter_number}",
        "transaction_id": service_tx["id"],
        "provider_reference": provider_reference,
        "ecg_token": ecg_token,
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
