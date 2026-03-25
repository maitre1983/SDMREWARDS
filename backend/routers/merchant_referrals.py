"""
SDM REWARDS - Merchant Referral Stats Router
=============================================
Dashboard de performance parrainage pour les marchands.
Les marchands reçoivent 3 GHS par client recruté via leur QR code.
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import logging

from motor.motor_asyncio import AsyncIOMotorClient
from routers.auth import get_current_merchant

logger = logging.getLogger(__name__)
router = APIRouter()

# Constants
MERCHANT_REFERRAL_BONUS = 3.0  # GHS per referred client

def get_db():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")
    client = AsyncIOMotorClient(mongo_url)
    return client[db_name]


@router.get("/referral-stats")
async def get_merchant_referral_stats(current_merchant: dict = Depends(get_current_merchant)):
    """
    Get merchant's referral performance statistics.
    
    Tracks clients recruited via the merchant's recruitment_qr_code.
    Commission: 3 GHS per successful referral.
    
    Returns:
    - total_referrals: Number of clients referred
    - total_earned: Total commission earned (3 GHS x referrals)
    - earnings_today: Commission earned today
    - earnings_this_month: Commission earned this month
    - earnings_last_6_months: Monthly breakdown for last 6 months
    - recent_referrals: List of recent referred clients
    """
    db = get_db()
    merchant_id = current_merchant["id"]
    
    # Get merchant's recruitment QR code
    merchant = await db.merchants.find_one(
        {"id": merchant_id},
        {"_id": 0, "recruitment_qr_code": 1, "business_name": 1}
    )
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    recruitment_qr = merchant.get("recruitment_qr_code", "")
    
    # Time boundaries
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Query clients referred by this merchant
    # Method 1: Via referred_by_merchant_id field
    # Method 2: Via recruitment_qr_code stored in referred_by
    query = {
        "$or": [
            {"referred_by_merchant_id": merchant_id},
            {"referred_by": recruitment_qr}
        ]
    }
    
    # Total referrals count
    total_referrals = await db.clients.count_documents(query)
    
    # Today's referrals
    today_query = {
        **query,
        "created_at": {"$gte": today_start.isoformat()}
    }
    referrals_today = await db.clients.count_documents(today_query)
    
    # This month's referrals
    month_query = {
        **query,
        "created_at": {"$gte": month_start.isoformat()}
    }
    referrals_this_month = await db.clients.count_documents(month_query)
    
    # Last 6 months breakdown
    monthly_breakdown = []
    for i in range(6):
        month_date = now - timedelta(days=30 * i)
        month_start_i = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Calculate next month start
        if month_start_i.month == 12:
            next_month = month_start_i.replace(year=month_start_i.year + 1, month=1)
        else:
            next_month = month_start_i.replace(month=month_start_i.month + 1)
        
        month_query_i = {
            **query,
            "created_at": {
                "$gte": month_start_i.isoformat(),
                "$lt": next_month.isoformat()
            }
        }
        count = await db.clients.count_documents(month_query_i)
        
        monthly_breakdown.append({
            "month": month_start_i.strftime("%B %Y"),
            "month_short": month_start_i.strftime("%b"),
            "year": month_start_i.year,
            "referrals": count,
            "earnings": round(count * MERCHANT_REFERRAL_BONUS, 2)
        })
    
    # Recent referrals (last 10)
    recent_referrals = await db.clients.find(
        query,
        {
            "_id": 0,
            "id": 1,
            "full_name": 1,
            "username": 1,
            "created_at": 1,
            "status": 1
        }
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Format recent referrals
    formatted_referrals = []
    for ref in recent_referrals:
        formatted_referrals.append({
            "id": ref.get("id"),
            "name": ref.get("full_name", "Unknown"),
            "username": ref.get("username"),
            "joined_at": ref.get("created_at"),
            "status": ref.get("status", "pending"),
            "bonus_earned": MERCHANT_REFERRAL_BONUS
        })
    
    # Calculate totals
    total_earned = round(total_referrals * MERCHANT_REFERRAL_BONUS, 2)
    earnings_today = round(referrals_today * MERCHANT_REFERRAL_BONUS, 2)
    earnings_this_month = round(referrals_this_month * MERCHANT_REFERRAL_BONUS, 2)
    
    # Get payout history for referral commissions
    referral_payouts = await db.merchant_referral_payouts.find(
        {"merchant_id": merchant_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "success": True,
        "recruitment_qr_code": recruitment_qr,
        "bonus_per_referral": MERCHANT_REFERRAL_BONUS,
        
        # Totals
        "total_referrals": total_referrals,
        "total_earned": total_earned,
        
        # Time-based stats
        "referrals_today": referrals_today,
        "earnings_today": earnings_today,
        "referrals_this_month": referrals_this_month,
        "earnings_this_month": earnings_this_month,
        
        # Breakdown
        "monthly_breakdown": monthly_breakdown,
        
        # Recent activity
        "recent_referrals": formatted_referrals,
        
        # Payout history
        "referral_payouts": referral_payouts
    }


@router.get("/referral-link")
async def get_merchant_referral_link(current_merchant: dict = Depends(get_current_merchant)):
    """Get merchant's referral/recruitment link and QR code"""
    db = get_db()
    merchant_id = current_merchant["id"]
    
    merchant = await db.merchants.find_one(
        {"id": merchant_id},
        {"_id": 0, "recruitment_qr_code": 1, "business_name": 1}
    )
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    recruitment_qr = merchant.get("recruitment_qr_code", "")
    
    # Generate shareable link
    base_url = os.environ.get("FRONTEND_URL", "https://sdmrewards.com")
    referral_link = f"{base_url}/join?ref={recruitment_qr}"
    
    return {
        "success": True,
        "recruitment_qr_code": recruitment_qr,
        "referral_link": referral_link,
        "bonus_per_referral": MERCHANT_REFERRAL_BONUS,
        "share_messages": {
            "whatsapp": f"Rejoins SDM REWARDS et gagne du cashback sur tous tes achats! Utilise mon code: {recruitment_qr} ou clique ici: {referral_link}",
            "sms": f"Gagne du cashback avec SDM REWARDS! Code: {recruitment_qr}. {referral_link}"
        }
    }


@router.get("/referral-leaderboard")
async def get_merchant_referral_leaderboard(
    limit: int = 10,
    current_merchant: dict = Depends(get_current_merchant)
):
    """
    Get merchant referral leaderboard.
    
    Returns top merchants by referral count with the current merchant's rank.
    """
    db = get_db()
    current_merchant_id = current_merchant["id"]
    
    # Get all merchants with their referral counts
    # Using aggregation to count clients referred by each merchant
    pipeline = [
        # Get all merchants
        {"$match": {"status": "active"}},
        {"$project": {
            "_id": 0,
            "id": 1,
            "business_name": 1,
            "recruitment_qr_code": 1,
            "logo_url": 1
        }}
    ]
    
    merchants = await db.merchants.aggregate(pipeline).to_list(1000)
    
    # For each merchant, count their referrals
    leaderboard = []
    for merchant in merchants:
        merchant_id = merchant["id"]
        recruitment_qr = merchant.get("recruitment_qr_code", "")
        
        # Count clients referred by this merchant
        query = {
            "$or": [
                {"referred_by_merchant_id": merchant_id},
                {"referred_by": recruitment_qr}
            ]
        }
        referral_count = await db.clients.count_documents(query)
        
        if referral_count > 0:  # Only include merchants with referrals
            leaderboard.append({
                "merchant_id": merchant_id,
                "business_name": merchant.get("business_name", "Unknown"),
                "logo_url": merchant.get("logo_url"),
                "referral_count": referral_count,
                "total_earned": round(referral_count * MERCHANT_REFERRAL_BONUS, 2)
            })
    
    # Sort by referral count descending
    leaderboard.sort(key=lambda x: x["referral_count"], reverse=True)
    
    # Find current merchant's rank
    current_merchant_rank = None
    current_merchant_data = None
    for idx, entry in enumerate(leaderboard, 1):
        if entry["merchant_id"] == current_merchant_id:
            current_merchant_rank = idx
            current_merchant_data = entry
            break
    
    # If current merchant not in leaderboard (0 referrals), add them
    if current_merchant_rank is None:
        current_merchant_doc = await db.merchants.find_one(
            {"id": current_merchant_id},
            {"_id": 0, "business_name": 1, "logo_url": 1}
        )
        current_merchant_rank = len(leaderboard) + 1
        current_merchant_data = {
            "merchant_id": current_merchant_id,
            "business_name": current_merchant_doc.get("business_name", "Unknown") if current_merchant_doc else "Unknown",
            "logo_url": current_merchant_doc.get("logo_url") if current_merchant_doc else None,
            "referral_count": 0,
            "total_earned": 0
        }
    
    # Add rank to top entries
    top_leaderboard = []
    for idx, entry in enumerate(leaderboard[:limit], 1):
        entry["rank"] = idx
        entry["is_current_merchant"] = entry["merchant_id"] == current_merchant_id
        top_leaderboard.append(entry)
    
    return {
        "success": True,
        "leaderboard": top_leaderboard,
        "total_participants": len(leaderboard),
        "current_merchant": {
            "rank": current_merchant_rank,
            **current_merchant_data
        }
    }

