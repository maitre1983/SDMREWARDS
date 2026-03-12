"""
SDM REWARDS - Gamification & Referral Growth Router
====================================================
API endpoints for missions, XP, badges, leaderboards, and smart referrals
"""

import os
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from routers.auth import get_current_client
from services.gamification_service import GamificationService, LEVELS, BADGES
from services.referral_growth_service import ReferralGrowthService

router = APIRouter()
logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Services
gamification_service = GamificationService(db)
referral_service = ReferralGrowthService(db)


# ============== REQUEST MODELS ==============

class TrackShareRequest(BaseModel):
    platform: str  # whatsapp, sms, email, telegram, copy
    success: bool = True


class MissionProgressRequest(BaseModel):
    mission_type: str
    increment: float = 1


# ============== GAMIFICATION ENDPOINTS ==============

@router.get("/profile")
async def get_gamification_profile(
    current_client: dict = Depends(get_current_client)
):
    """Get complete gamification profile for current client"""
    data = await gamification_service.get_client_gamification_data(current_client["id"])
    
    # Get rank
    xp_rank = await gamification_service.get_client_rank(current_client["id"], "xp")
    referral_rank = await gamification_service.get_client_rank(current_client["id"], "referrals")
    
    return {
        "success": True,
        **data,
        "xp_rank": xp_rank,
        "referral_rank": referral_rank
    }


@router.get("/levels")
async def get_all_levels():
    """Get all level definitions"""
    return {
        "success": True,
        "levels": [
            {
                "level": level_num,
                **level_data,
                "max_xp": level_data["max_xp"] if level_data["max_xp"] != float('inf') else None
            }
            for level_num, level_data in LEVELS.items()
        ]
    }


@router.get("/badges")
async def get_all_badges():
    """Get all badge definitions"""
    return {
        "success": True,
        "badges": list(BADGES.values())
    }


@router.get("/my-badges")
async def get_my_badges(
    current_client: dict = Depends(get_current_client)
):
    """Get badges earned by current client"""
    data = await gamification_service.get_client_gamification_data(current_client["id"])
    
    earned = data.get("badges", [])
    earned_ids = [b.get("id") for b in earned]
    
    # All badges with earned status
    all_badges = []
    for badge_id, badge in BADGES.items():
        badge_data = {**badge, "earned": badge_id in earned_ids}
        if badge_id in earned_ids:
            earned_badge = next((b for b in earned if b.get("id") == badge_id), None)
            if earned_badge:
                badge_data["earned_at"] = earned_badge.get("earned_at")
        all_badges.append(badge_data)
    
    return {
        "success": True,
        "badges": all_badges,
        "earned_count": len(earned),
        "total_count": len(BADGES)
    }


@router.post("/check-badges")
async def check_and_award_badges(
    current_client: dict = Depends(get_current_client)
):
    """Check and award any newly earned badges"""
    awarded = await gamification_service.check_and_award_badges(current_client["id"])
    
    return {
        "success": True,
        "newly_awarded": awarded,
        "count": len(awarded)
    }


# ============== MISSIONS ENDPOINTS ==============

@router.get("/missions")
async def get_missions(
    language: str = "en",
    current_client: dict = Depends(get_current_client)
):
    """Get all active missions for current client"""
    missions = await gamification_service.get_active_missions(current_client["id"], language)
    
    return {
        "success": True,
        **missions
    }


@router.post("/missions/progress")
async def update_mission_progress(
    request: MissionProgressRequest,
    current_client: dict = Depends(get_current_client)
):
    """Manually update mission progress (for testing)"""
    completed = await gamification_service.update_mission_progress(
        current_client["id"],
        request.mission_type,
        request.increment
    )
    
    return {
        "success": True,
        "completed_missions": completed
    }


# ============== LEADERBOARD ENDPOINTS ==============

@router.get("/leaderboard/xp")
async def get_xp_leaderboard(
    limit: int = 20,
    current_client: dict = Depends(get_current_client)
):
    """Get XP leaderboard"""
    leaderboard = await gamification_service.get_leaderboard("xp", limit)
    my_rank = await gamification_service.get_client_rank(current_client["id"], "xp")
    
    return {
        "success": True,
        "leaderboard": leaderboard,
        "my_rank": my_rank
    }


@router.get("/leaderboard/referrals")
async def get_referral_leaderboard(
    limit: int = 20,
    current_client: dict = Depends(get_current_client)
):
    """Get referral leaderboard"""
    leaderboard = await gamification_service.get_leaderboard("referrals", limit)
    my_rank = await gamification_service.get_client_rank(current_client["id"], "referrals")
    
    return {
        "success": True,
        "leaderboard": leaderboard,
        "my_rank": my_rank
    }


@router.get("/leaderboard/ambassadors")
async def get_ambassador_leaderboard(limit: int = 20):
    """Get ambassador leaderboard (public)"""
    ambassadors = await referral_service.get_ambassador_leaderboard(limit)
    
    return {
        "success": True,
        "ambassadors": ambassadors
    }


# ============== STREAK ENDPOINTS ==============

@router.post("/streak/update")
async def update_streak(
    current_client: dict = Depends(get_current_client)
):
    """Update activity streak (called on app open)"""
    streak_data = await gamification_service.update_activity_streak(current_client["id"])
    
    return {
        "success": True,
        **streak_data
    }


# ============== REFERRAL GROWTH ENDPOINTS ==============

@router.get("/referral/prompt")
async def get_referral_prompt(
    language: str = "en",
    current_client: dict = Depends(get_current_client)
):
    """Get smart referral prompt data"""
    data = await referral_service.get_referral_prompt_data(current_client["id"], language)
    
    return {
        "success": True,
        **data
    }


@router.get("/referral/messages")
async def get_referral_messages(
    language: str = "en",
    current_client: dict = Depends(get_current_client)
):
    """Get AI-generated referral messages"""
    messages = await referral_service.generate_referral_messages(current_client["id"], language)
    
    return messages


@router.post("/referral/track-share")
async def track_referral_share(
    request: TrackShareRequest,
    current_client: dict = Depends(get_current_client)
):
    """Track when user shares referral"""
    result = await referral_service.track_share(
        current_client["id"],
        request.platform,
        request.success
    )
    
    # Record the prompt
    await referral_service.record_referral_prompt(current_client["id"])
    
    return result


@router.get("/referral/ambassador-status")
async def get_ambassador_status(
    current_client: dict = Depends(get_current_client)
):
    """Get ambassador status and progress"""
    status = await referral_service.check_ambassador_status(current_client["id"])
    
    return {
        "success": True,
        **status
    }


@router.get("/referral/share-stats")
async def get_share_statistics(
    current_client: dict = Depends(get_current_client)
):
    """Get sharing statistics"""
    stats = await referral_service.get_share_stats(current_client["id"])
    
    return {
        "success": True,
        **stats
    }


# ============== COMBINED DASHBOARD ==============

@router.get("/dashboard")
async def get_growth_dashboard(
    language: str = "en",
    current_client: dict = Depends(get_current_client)
):
    """
    Get complete growth dashboard data
    Combines gamification, missions, and referral data
    """
    client_id = current_client["id"]
    
    # Fetch all data
    import asyncio
    
    gam_task = gamification_service.get_client_gamification_data(client_id)
    missions_task = gamification_service.get_active_missions(client_id, language)
    referral_task = referral_service.get_referral_prompt_data(client_id, language)
    xp_rank_task = gamification_service.get_client_rank(client_id, "xp")
    
    gam_data, missions, referral_data, xp_rank = await asyncio.gather(
        gam_task, missions_task, referral_task, xp_rank_task
    )
    
    # Check for surprise gift (Ambassador only)
    surprise_gift = await gamification_service.check_and_award_surprise_gift(client_id)
    
    return {
        "success": True,
        "gamification": gam_data,
        "missions": missions,
        "referral": referral_data,
        "rank": xp_rank,
        "surprise_gift": surprise_gift
    }
