"""
SDM REWARDS - AI Router
========================
AI-powered endpoints for recommendations, analysis, and fraud detection
"""

import os
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from routers.auth import get_current_client
from services.ai_service import AIService

router = APIRouter()
logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# AI Service instance
ai_service = AIService(db)


# ============== REQUEST MODELS ==============

class AnalysisRequest(BaseModel):
    language: Optional[str] = None  # "en" or "fr", auto-detect if not provided


class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = None


# ============== CLIENT ENDPOINTS ==============

@router.get("/spending-analysis")
async def get_spending_analysis(
    language: str = "en",
    current_client: dict = Depends(get_current_client)
):
    """
    Get AI-powered spending analysis for the current client
    Returns patterns, insights, and savings tips
    """
    try:
        result = await ai_service.analyze_spending_patterns(
            client_id=current_client["id"],
            language=language
        )
        return result
    except Exception as e:
        logger.error(f"Spending analysis error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")


@router.get("/recommendations")
async def get_merchant_recommendations(
    language: str = "en",
    current_client: dict = Depends(get_current_client)
):
    """
    Get personalized merchant recommendations based on spending history
    """
    try:
        result = await ai_service.get_merchant_recommendations(
            client_id=current_client["id"],
            language=language
        )
        return result
    except Exception as e:
        logger.error(f"Recommendations error: {e}")
        raise HTTPException(status_code=500, detail="Recommendations failed")


@router.get("/cashback-tips")
async def get_cashback_tips(
    language: str = "en",
    current_client: dict = Depends(get_current_client)
):
    """
    Get personalized tips to maximize cashback earnings
    """
    try:
        result = await ai_service.get_cashback_tips(
            client_id=current_client["id"],
            language=language
        )
        return result
    except Exception as e:
        logger.error(f"Cashback tips error: {e}")
        raise HTTPException(status_code=500, detail="Tips generation failed")


@router.get("/fraud-check")
async def check_fraud_patterns(
    current_client: dict = Depends(get_current_client)
):
    """
    Check for suspicious transaction patterns
    Returns risk score and alerts
    """
    try:
        result = await ai_service.detect_fraud_patterns(
            client_id=current_client["id"]
        )
        return result
    except Exception as e:
        logger.error(f"Fraud check error: {e}")
        raise HTTPException(status_code=500, detail="Fraud check failed")


@router.get("/dashboard")
async def get_ai_dashboard(
    language: str = "en",
    current_client: dict = Depends(get_current_client)
):
    """
    Get complete AI dashboard data for client
    Combines spending analysis, recommendations, tips, and security status
    """
    client_id = current_client["id"]
    
    try:
        # Fetch all data in parallel
        import asyncio
        
        spending_task = ai_service.analyze_spending_patterns(client_id, language)
        recommendations_task = ai_service.get_merchant_recommendations(client_id, language)
        tips_task = ai_service.get_cashback_tips(client_id, language)
        fraud_task = ai_service.detect_fraud_patterns(client_id)
        
        spending, recommendations, tips, fraud = await asyncio.gather(
            spending_task,
            recommendations_task,
            tips_task,
            fraud_task
        )
        
        return {
            "success": True,
            "client_id": client_id,
            "language": language,
            "spending_analysis": spending,
            "recommendations": recommendations,
            "cashback_tips": tips,
            "security_status": fraud
        }
        
    except Exception as e:
        logger.error(f"AI dashboard error: {e}")
        raise HTTPException(status_code=500, detail="Dashboard generation failed")


@router.post("/chat")
async def ai_chat(
    request: ChatRequest,
    current_client: dict = Depends(get_current_client)
):
    """
    Chat with AI assistant about spending, cashback, and recommendations
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=503, detail="AI service not configured")
        
        # Detect language if not provided
        language = request.language
        if not language:
            language = await ai_service.detect_language(request.message)
        
        # Get client context
        client_name = current_client.get("full_name", "User")
        cashback = current_client.get("cashback_balance", 0)
        card_type = current_client.get("card_type", "none")
        
        # Get spending summary for context
        summary = await ai_service.get_client_transaction_summary(current_client["id"], 30)
        
        system_message = f"""You are the AI assistant for SDM REWARDS, a cashback app in Ghana.

Current user: {client_name}
Card type: {card_type}
Cashback balance: GHS {cashback:.2f}
Recent spending (30 days): GHS {summary.get('total_spent', 0):.2f}
Transactions: {summary.get('total_transactions', 0)}

Help the user with:
- Understanding their spending
- Finding cashback opportunities
- Tips to save money
- Questions about SDM REWARDS

Respond in {'French' if language == 'fr' else 'English'}.
Be helpful, concise, and friendly. Keep responses under 200 words."""

        # Create chat instance for this request
        chat = LlmChat(
            api_key=api_key,
            session_id=f"client-{current_client['id']}-chat",
            system_message=system_message
        ).with_model("gemini", "gemini-3-flash-preview")
        
        response = await chat.send_message(UserMessage(text=request.message))
        
        return {
            "success": True,
            "response": response,
            "language": language
        }
        
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail="Chat failed")


@router.get("/detect-language")
async def detect_language(text: str):
    """
    Detect language from text (helper endpoint)
    """
    language = await ai_service.detect_language(text)
    return {
        "detected_language": language,
        "language_name": "French" if language == "fr" else "English"
    }


# ============== NOTIFICATION GENERATION ==============

class NotificationRequest(BaseModel):
    notification_type: str  # welcome, cashback_earned, inactive_reminder, high_cashback_offer, custom
    context: Optional[dict] = None
    language: Optional[str] = "en"


@router.post("/generate-notification")
async def generate_notification(
    request: NotificationRequest,
    current_client: dict = Depends(get_current_client)
):
    """
    Generate personalized notification content
    Used by the platform to send smart notifications
    """
    try:
        result = await ai_service.generate_smart_notification(
            client_id=current_client["id"],
            notification_type=request.notification_type,
            context=request.context,
            language=request.language
        )
        return result
    except Exception as e:
        logger.error(f"Notification generation error: {e}")
        raise HTTPException(status_code=500, detail="Notification generation failed")
