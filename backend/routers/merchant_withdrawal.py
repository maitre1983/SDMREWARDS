"""
SDM REWARDS - Merchant Withdrawal Router
========================================
Endpoints for merchant withdrawals and auto-withdraw settings.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging
import os

from motor.motor_asyncio import AsyncIOMotorClient
from routers.auth import get_current_merchant
from services.hubtel_momo_service import get_hubtel_momo_service

logger = logging.getLogger(__name__)
router = APIRouter()


def get_db():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")
    client = AsyncIOMotorClient(mongo_url)
    return client[db_name]


class WithdrawRequest(BaseModel):
    amount: float


class AutoWithdrawSettings(BaseModel):
    enabled: bool = False
    min_amount: float = 50
    frequency: str = "daily"  # instant, daily, weekly
    destination: str = "momo"  # momo or bank


@router.get("/balance")
async def get_merchant_balance(current_merchant: dict = Depends(get_current_merchant)):
    """
    Get merchant's available balance for withdrawal.
    
    Balance sources:
    - Cash payments from customers
    - MoMo payments from customers
    - Hybrid payments from customers
    - Cashback payments
    
    Returns available, pending, and total amounts.
    """
    db = get_db()
    merchant_id = current_merchant["id"]
    
    # Get merchant record with balance
    merchant = await db.merchants.find_one(
        {"id": merchant_id},
        {"_id": 0, "pending_balance": 1, "available_balance": 1, "total_received": 1, "total_paid_out": 1}
    )
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # Calculate balances from transactions if not stored
    # Available = completed payments not yet withdrawn
    # Pending = processing payments
    
    # Get completed payments sum (merchant share)
    pipeline = [
        {"$match": {"merchant_id": merchant_id, "status": "completed"}},
        {"$group": {
            "_id": None,
            "total": {"$sum": "$merchant_amount"}
        }}
    ]
    total_result = await db.transactions.aggregate(pipeline).to_list(1)
    total_received = total_result[0]["total"] if total_result else 0
    
    # Get pending payments sum
    pending_pipeline = [
        {"$match": {"merchant_id": merchant_id, "status": {"$in": ["pending", "processing"]}}},
        {"$group": {
            "_id": None,
            "total": {"$sum": "$merchant_amount"}
        }}
    ]
    pending_result = await db.transactions.aggregate(pending_pipeline).to_list(1)
    pending = pending_result[0]["total"] if pending_result else 0
    
    # Get total withdrawn
    withdrawn_pipeline = [
        {"$match": {"merchant_id": merchant_id, "status": "completed"}},
        {"$group": {
            "_id": None,
            "total": {"$sum": "$amount"}
        }}
    ]
    withdrawn_result = await db.merchant_withdrawals.aggregate(withdrawn_pipeline).to_list(1)
    total_withdrawn = withdrawn_result[0]["total"] if withdrawn_result else 0
    
    # Also count merchant_payouts (automatic payouts)
    payout_pipeline = [
        {"$match": {"merchant_id": merchant_id, "status": "completed"}},
        {"$group": {
            "_id": None,
            "total": {"$sum": "$amount"}
        }}
    ]
    payout_result = await db.merchant_payouts.aggregate(payout_pipeline).to_list(1)
    auto_paid_out = payout_result[0]["total"] if payout_result else 0
    
    # Available = total received - total withdrawn - auto paid out
    available = max(0, total_received - total_withdrawn - auto_paid_out)
    
    return {
        "available": round(available, 2),
        "pending": round(pending, 2),
        "total_received": round(total_received, 2),
        "total_withdrawn": round(total_withdrawn + auto_paid_out, 2)
    }


@router.post("/withdraw")
async def initiate_merchant_withdrawal(
    request: WithdrawRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """
    Initiate a manual withdrawal for merchant.
    
    Withdraws to the merchant's configured payout method (MoMo or Bank).
    """
    db = get_db()
    merchant_id = current_merchant["id"]
    amount = request.amount
    
    if amount < 5:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is GHS 5")
    
    # Get merchant with payout settings
    merchant = await db.merchants.find_one({"id": merchant_id}, {"_id": 0})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # Check available balance
    balance_res = await get_merchant_balance(current_merchant)
    if amount > balance_res["available"]:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: GHS {balance_res['available']:.2f}")
    
    # Determine payout method
    payout_method = merchant.get("preferred_payout_method", "momo")
    
    if payout_method == "momo":
        momo_number = merchant.get("momo_number")
        momo_network = merchant.get("momo_network", "MTN")
        if not momo_number:
            raise HTTPException(status_code=400, detail="No MoMo number configured. Please add in Settings > Payment")
    else:
        bank_account = merchant.get("bank_account_number") or merchant.get("bank_account")
        bank_code = merchant.get("bank_code") or merchant.get("bank_id")
        if not bank_account or not bank_code:
            raise HTTPException(status_code=400, detail="No bank account configured. Please add in Settings > Payment")
    
    # Create withdrawal record
    withdrawal_id = str(uuid.uuid4())
    withdrawal_ref = f"MW-{uuid.uuid4().hex[:8].upper()}"
    
    withdrawal = {
        "id": withdrawal_id,
        "merchant_id": merchant_id,
        "merchant_name": merchant.get("business_name", "Merchant"),
        "amount": amount,
        "payout_method": payout_method,
        "reference": withdrawal_ref,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if payout_method == "momo":
        withdrawal["phone"] = momo_number
        withdrawal["network"] = momo_network
    else:
        withdrawal["bank_account"] = bank_account
        withdrawal["bank_code"] = bank_code
        withdrawal["bank_name"] = merchant.get("bank_name", "Bank")
    
    await db.merchant_withdrawals.insert_one(withdrawal)
    
    # Process withdrawal via Hubtel
    try:
        hubtel = get_hubtel_momo_service(db)
        
        if payout_method == "momo":
            # Normalize network
            network_map = {
                "MTN": "mtn-gh", "MTN MOMO": "mtn-gh",
                "VODAFONE": "vodafone-gh", "VODAFONE CASH": "vodafone-gh",
                "TELECEL": "tigo-gh", "TIGO": "tigo-gh", "AIRTELTIGO": "tigo-gh"
            }
            channel = network_map.get(momo_network.upper(), "mtn-gh")
            
            result = await hubtel.send_momo(
                phone=momo_number,
                amount=amount,
                description=f"SDM Merchant Withdrawal - {withdrawal_ref}",
                client_reference=withdrawal_ref,
                recipient_name=merchant.get("business_name", "Merchant"),
                channel=channel
            )
        else:
            result = await hubtel.send_bank(
                account_number=bank_account,
                bank_code=bank_code,
                amount=amount,
                description=f"SDM Merchant Withdrawal - {withdrawal_ref}",
                client_reference=withdrawal_ref,
                recipient_name=merchant.get("bank_account_name", merchant.get("business_name", "Merchant"))
            )
        
        if result.get("success"):
            await db.merchant_withdrawals.update_one(
                {"id": withdrawal_id},
                {"$set": {
                    "status": "processing",
                    "provider_reference": result.get("transaction_id"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"✅ Merchant withdrawal initiated: {withdrawal_ref}, amount: GHS {amount}")
            
            return {
                "success": True,
                "withdrawal_id": withdrawal_id,
                "reference": withdrawal_ref,
                "amount": amount,
                "status": "processing",
                "message": "Withdrawal initiated. You will receive funds shortly."
            }
        else:
            await db.merchant_withdrawals.update_one(
                {"id": withdrawal_id},
                {"$set": {
                    "status": "failed",
                    "error": result.get("error"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.error(f"❌ Merchant withdrawal failed: {withdrawal_ref}, error: {result.get('error')}")
            
            return {
                "success": False,
                "error": result.get("error", "Withdrawal failed")
            }
            
    except Exception as e:
        logger.error(f"❌ Merchant withdrawal exception: {e}")
        await db.merchant_withdrawals.update_one(
            {"id": withdrawal_id},
            {"$set": {"status": "failed", "error": str(e)}}
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/withdrawals")
async def get_merchant_withdrawals(
    limit: int = 10,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Get merchant's withdrawal history"""
    db = get_db()
    merchant_id = current_merchant["id"]
    
    withdrawals = await db.merchant_withdrawals.find(
        {"merchant_id": merchant_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"withdrawals": withdrawals}


@router.get("/auto-withdraw/settings")
async def get_auto_withdraw_settings(current_merchant: dict = Depends(get_current_merchant)):
    """Get merchant's auto-withdraw settings"""
    db = get_db()
    merchant_id = current_merchant["id"]
    
    settings = await db.merchant_auto_withdraw.find_one(
        {"merchant_id": merchant_id},
        {"_id": 0}
    )
    
    if not settings:
        # Return defaults
        return {
            "enabled": False,
            "min_amount": 50,
            "frequency": "daily",
            "destination": "momo"
        }
    
    return settings


@router.post("/auto-withdraw/settings")
async def save_auto_withdraw_settings(
    settings: AutoWithdrawSettings,
    current_merchant: dict = Depends(get_current_merchant)
):
    """Save merchant's auto-withdraw settings"""
    db = get_db()
    merchant_id = current_merchant["id"]
    
    await db.merchant_auto_withdraw.update_one(
        {"merchant_id": merchant_id},
        {"$set": {
            "merchant_id": merchant_id,
            "enabled": settings.enabled,
            "min_amount": settings.min_amount,
            "frequency": settings.frequency,
            "destination": settings.destination,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    logger.info(f"Auto-withdraw settings saved for merchant {merchant_id[:8]}...: enabled={settings.enabled}, frequency={settings.frequency}")
    
    return {"success": True, "message": "Auto-withdraw settings saved"}
