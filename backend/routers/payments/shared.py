"""
SDM REWARDS - Payments Shared Module
====================================
Configuration, helpers and schemas for payment routes
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone, timedelta
import uuid
import os
import httpx
import logging

logger = logging.getLogger(__name__)

# Database reference (set from server.py)
db = None

def set_db(database):
    global db
    db = database

def get_db():
    return db


# ============== CONFIG ==============
# Legacy BulkClix variables (DEPRECATED - kept for backward compatibility)
BULKCLIX_API_KEY = os.environ.get("BULKCLIX_API_KEY", "")  # DEPRECATED
BULKCLIX_BASE_URL = os.environ.get("BULKCLIX_BASE_URL", "https://api.bulkclix.com/api/v1")  # DEPRECATED
CALLBACK_BASE_URL = os.environ.get("CALLBACK_BASE_URL", "")
PAYMENT_TEST_MODE = os.environ.get("PAYMENT_TEST_MODE", "true").lower() == "true"

# Hubtel is now the primary payment provider
HUBTEL_CLIENT_ID = os.environ.get("HUBTEL_CLIENT_ID", "")
HUBTEL_CLIENT_SECRET = os.environ.get("HUBTEL_CLIENT_SECRET", "")


# ============== LAZY SERVICE IMPORTS ==============
_sms_service = None
_gamification_service = None
_push_service = None

def get_sms():
    global _sms_service
    if _sms_service is None:
        from services.sms_service import SMSService
        _sms_service = SMSService(db)
    return _sms_service

def get_gamification():
    global _gamification_service
    if _gamification_service is None:
        from services.gamification_service import GamificationService
        _gamification_service = GamificationService(db)
    return _gamification_service

def get_push_service():
    global _push_service
    if _push_service is None:
        from push_notifications import OneSignalService
        _push_service = OneSignalService(db)
    return _push_service


# ============== HELPERS ==============
def detect_network(phone: str) -> Optional[str]:
    """Detect network provider from phone number (Ghana networks)"""
    phone = phone.replace(" ", "").replace("-", "")
    if phone.startswith("+233"):
        phone = "0" + phone[4:]
    elif phone.startswith("233"):
        phone = "0" + phone[3:]
    
    # Ghana Mobile Network Prefixes (2025 updated)
    mtn_prefixes = ["024", "025", "053", "054", "055", "059"]
    telecel_prefixes = ["020", "050"]
    airteltigo_prefixes = ["026", "027", "056", "057"]
    
    prefix = phone[:3] if len(phone) >= 3 else ""
    
    if prefix in mtn_prefixes:
        return "MTN"
    elif prefix in telecel_prefixes:
        return "TELECEL"
    elif prefix in airteltigo_prefixes:
        return "AIRTELTIGO"
    
    return None


def normalize_network(network: str) -> str:
    """Normalize network name for API compatibility"""
    if not network:
        return network
    network_upper = network.upper()
    network_mapping = {
        "TELECEL": "TELECEL",
        "VODAFONE": "TELECEL",
        "MTN": "MTN",
        "AIRTELTIGO": "AIRTELTIGO",
        "AT": "AIRTELTIGO"
    }
    return network_mapping.get(network_upper, network_upper)


def is_test_mode() -> bool:
    """Check if running in test mode - now checks Hubtel config"""
    return PAYMENT_TEST_MODE or not HUBTEL_CLIENT_ID


# ============== SCHEMAS ==============
class CardPaymentRequest(BaseModel):
    phone: str
    card_type: str  # silver, gold, platinum
    referrer_code: Optional[str] = None


class MerchantPaymentRequest(BaseModel):
    client_phone: str
    merchant_qr_code: str
    amount: float
    network: Optional[str] = None


class ClientCashPaymentRequest(BaseModel):
    """Client-initiated cash payment to merchant"""
    client_phone: str
    merchant_qr_code: str
    amount: float


class WithdrawalRequest(BaseModel):
    phone: str
    amount: float
    network: Optional[str] = None
