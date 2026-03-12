"""
SDM REWARDS - Language Router
==============================
Endpoints for language detection and preferences
"""

import os
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from routers.auth import get_current_client
from services.language_service import LanguageService

router = APIRouter()
logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Language Service
language_service = LanguageService(db)


# ============== REQUEST MODELS ==============

class SetLanguageRequest(BaseModel):
    language: str  # "en" or "fr"


class AutoDetectRequest(BaseModel):
    browser_languages: Optional[List[str]] = None


# ============== PUBLIC ENDPOINTS ==============

@router.get("/supported")
async def get_supported_languages():
    """Get list of supported languages"""
    return language_service.get_supported_languages()


@router.get("/translations/{language}")
async def get_translations(language: str):
    """Get UI translations for a specific language"""
    translations = language_service.get_ui_translations(language)
    return {
        "success": True,
        "language": language,
        "translations": translations
    }


@router.post("/detect")
async def detect_language(
    request: Request,
    body: AutoDetectRequest = None
):
    """
    Detect language from request headers or browser languages
    Does NOT require authentication - used before login
    """
    # Get Accept-Language header
    accept_language = request.headers.get("Accept-Language", "")
    
    # Use browser languages if provided
    browser_languages = body.browser_languages if body else None
    
    # Detect language
    if browser_languages:
        detected = language_service.detect_from_browser_languages(browser_languages)
        source = "browser_languages"
    elif accept_language:
        detected = language_service.detect_from_accept_language(accept_language)
        source = "accept_language_header"
    else:
        detected = "en"
        source = "default"
    
    return {
        "success": True,
        "detected_language": detected,
        "source": source,
        "accept_language_header": accept_language
    }


# ============== CLIENT ENDPOINTS ==============

@router.get("/preference")
async def get_language_preference(
    current_client: dict = Depends(get_current_client)
):
    """Get current client's language preference"""
    language = await language_service.get_client_language(current_client["id"])
    
    return {
        "success": True,
        "language": language,
        "translations": language_service.get_ui_translations(language)
    }


@router.put("/preference")
async def set_language_preference(
    request: SetLanguageRequest,
    current_client: dict = Depends(get_current_client)
):
    """Set client's language preference"""
    result = await language_service.set_client_language(
        current_client["id"],
        request.language
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    # Also mark as not auto-detected (user chose manually)
    await db.clients.update_one(
        {"id": current_client["id"]},
        {"$set": {"language_auto_detected": False}}
    )
    
    return {
        **result,
        "translations": language_service.get_ui_translations(request.language)
    }


@router.post("/auto-detect")
async def auto_detect_language(
    request: Request,
    body: AutoDetectRequest = None,
    current_client: dict = Depends(get_current_client)
):
    """
    Auto-detect and set language for authenticated client
    Only sets if no manual preference exists
    """
    accept_language = request.headers.get("Accept-Language", "")
    browser_languages = body.browser_languages if body else None
    
    result = await language_service.auto_detect_and_set(
        client_id=current_client["id"],
        accept_language=accept_language,
        browser_languages=browser_languages
    )
    
    return {
        "success": True,
        **result,
        "translations": language_service.get_ui_translations(result["language"])
    }
