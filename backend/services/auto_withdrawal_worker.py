"""
SDM REWARDS - Auto Withdrawal Worker
=====================================
Background worker that processes automatic merchant withdrawals
based on their configured settings (frequency and minimum amount).
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
import os
import uuid

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# Worker state
_worker_running = False
_worker_task = None


def get_db():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")
    client = AsyncIOMotorClient(mongo_url)
    return client[db_name]


async def process_instant_withdrawals():
    """
    Process instant withdrawals - triggered immediately when payments are received.
    This is called after each payment completion.
    """
    db = get_db()
    
    # Find merchants with instant auto-withdraw enabled
    merchants_cursor = db.merchant_auto_withdraw.find(
        {"enabled": True, "frequency": "instant"},
        {"_id": 0}
    )
    
    merchants = await merchants_cursor.to_list(100)
    
    for settings in merchants:
        merchant_id = settings["merchant_id"]
        min_amount = settings.get("min_amount", 50)
        destination = settings.get("destination", "momo")
        
        try:
            # Get merchant balance
            balance = await calculate_merchant_balance(db, merchant_id)
            
            if balance["available"] >= min_amount:
                await process_withdrawal(db, merchant_id, balance["available"], destination)
                logger.info(f"✅ Instant withdrawal processed for merchant {merchant_id[:8]}...: GHS {balance['available']:.2f}")
        except Exception as e:
            logger.error(f"Error processing instant withdrawal for {merchant_id[:8]}...: {e}")


async def process_scheduled_withdrawals():
    """
    Process scheduled withdrawals (daily/weekly).
    Called by the background worker.
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    current_hour = now.hour
    current_weekday = now.weekday()  # 0 = Monday, 6 = Sunday
    
    # Daily withdrawals - process at midnight (hour 0)
    if current_hour == 0:
        await process_withdrawals_by_frequency(db, "daily")
    
    # Weekly withdrawals - process on Sunday at midnight
    if current_hour == 0 and current_weekday == 6:
        await process_withdrawals_by_frequency(db, "weekly")


async def process_withdrawals_by_frequency(db, frequency: str):
    """Process all withdrawals for a given frequency"""
    
    merchants_cursor = db.merchant_auto_withdraw.find(
        {"enabled": True, "frequency": frequency},
        {"_id": 0}
    )
    
    merchants = await merchants_cursor.to_list(100)
    processed = 0
    
    for settings in merchants:
        merchant_id = settings["merchant_id"]
        min_amount = settings.get("min_amount", 50)
        destination = settings.get("destination", "momo")
        
        try:
            balance = await calculate_merchant_balance(db, merchant_id)
            
            if balance["available"] >= min_amount:
                await process_withdrawal(db, merchant_id, balance["available"], destination)
                processed += 1
                logger.info(f"✅ {frequency.capitalize()} withdrawal: merchant {merchant_id[:8]}..., GHS {balance['available']:.2f}")
        except Exception as e:
            logger.error(f"Error processing {frequency} withdrawal for {merchant_id[:8]}...: {e}")
    
    logger.info(f"📊 {frequency.capitalize()} auto-withdrawals: {processed}/{len(merchants)} processed")


async def calculate_merchant_balance(db, merchant_id: str) -> dict:
    """Calculate merchant's available balance"""
    
    # Get total from transactions
    tx_pipeline = [
        {"$match": {"merchant_id": merchant_id, "status": "completed"}},
        {"$group": {
            "_id": None,
            "total": {"$sum": {"$ifNull": ["$merchant_amount", "$amount"]}}
        }}
    ]
    tx_result = await db.transactions.aggregate(tx_pipeline).to_list(1)
    total_received = tx_result[0]["total"] if tx_result else 0
    
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
    
    # Get auto payouts
    payout_pipeline = [
        {"$match": {"merchant_id": merchant_id, "status": "completed"}},
        {"$group": {
            "_id": None,
            "total": {"$sum": "$amount"}
        }}
    ]
    payout_result = await db.merchant_payouts.aggregate(payout_pipeline).to_list(1)
    auto_paid_out = payout_result[0]["total"] if payout_result else 0
    
    available = max(0, total_received - total_withdrawn - auto_paid_out)
    
    return {
        "available": round(available, 2),
        "total_received": round(total_received, 2),
        "total_withdrawn": round(total_withdrawn + auto_paid_out, 2)
    }


async def process_withdrawal(db, merchant_id: str, amount: float, destination: str):
    """Process a single auto-withdrawal"""
    from services.hubtel_momo_service import get_hubtel_momo_service
    
    # Get merchant details
    merchant = await db.merchants.find_one({"id": merchant_id}, {"_id": 0})
    if not merchant:
        raise ValueError(f"Merchant {merchant_id} not found")
    
    # Create withdrawal record
    withdrawal_id = str(uuid.uuid4())
    withdrawal_ref = f"AW-{uuid.uuid4().hex[:8].upper()}"  # AW = Auto Withdrawal
    
    withdrawal = {
        "id": withdrawal_id,
        "merchant_id": merchant_id,
        "merchant_name": merchant.get("business_name", "Merchant"),
        "amount": amount,
        "payout_method": destination,
        "reference": withdrawal_ref,
        "is_auto": True,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if destination == "momo":
        momo_number = merchant.get("momo_number")
        momo_network = merchant.get("momo_network", "MTN")
        if not momo_number:
            raise ValueError("No MoMo number configured")
        withdrawal["phone"] = momo_number
        withdrawal["network"] = momo_network
    else:
        bank_account = merchant.get("bank_account_number") or merchant.get("bank_account")
        bank_code = merchant.get("bank_code") or merchant.get("bank_id")
        if not bank_account or not bank_code:
            raise ValueError("No bank account configured")
        withdrawal["bank_account"] = bank_account
        withdrawal["bank_code"] = bank_code
        withdrawal["bank_name"] = merchant.get("bank_name", "Bank")
    
    await db.merchant_withdrawals.insert_one(withdrawal)
    
    # Process via Hubtel
    hubtel = get_hubtel_momo_service(db)
    
    if destination == "momo":
        network_map = {
            "MTN": "mtn-gh", "MTN MOMO": "mtn-gh",
            "VODAFONE": "vodafone-gh", "TELECEL": "tigo-gh",
            "TIGO": "tigo-gh", "AIRTELTIGO": "tigo-gh"
        }
        channel = network_map.get(momo_network.upper(), "mtn-gh")
        
        result = await hubtel.send_momo(
            phone=momo_number,
            amount=amount,
            description=f"SDM Auto Withdrawal - {withdrawal_ref}",
            client_reference=withdrawal_ref,
            recipient_name=merchant.get("business_name", "Merchant"),
            channel=channel
        )
    else:
        result = await hubtel.send_bank(
            account_number=bank_account,
            bank_code=bank_code,
            amount=amount,
            description=f"SDM Auto Withdrawal - {withdrawal_ref}",
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
    else:
        await db.merchant_withdrawals.update_one(
            {"id": withdrawal_id},
            {"$set": {
                "status": "failed",
                "error": result.get("error"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise ValueError(result.get("error"))


async def auto_withdrawal_worker():
    """
    Background worker that runs every hour to check for scheduled withdrawals.
    """
    global _worker_running
    
    logger.info("🔄 Auto-withdrawal worker started")
    _worker_running = True
    
    while _worker_running:
        try:
            await process_scheduled_withdrawals()
        except Exception as e:
            logger.error(f"Auto-withdrawal worker error: {e}")
        
        # Sleep for 1 hour
        await asyncio.sleep(3600)
    
    logger.info("🛑 Auto-withdrawal worker stopped")


def start_auto_withdrawal_worker():
    """Start the auto-withdrawal background worker"""
    global _worker_task
    
    if _worker_task is None or _worker_task.done():
        _worker_task = asyncio.create_task(auto_withdrawal_worker())
        logger.info("✅ Auto-withdrawal worker scheduled")


def stop_auto_withdrawal_worker():
    """Stop the auto-withdrawal background worker"""
    global _worker_running, _worker_task
    
    _worker_running = False
    if _worker_task and not _worker_task.done():
        _worker_task.cancel()
