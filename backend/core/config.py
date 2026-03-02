# /app/backend/core/config.py
"""
Application configuration and settings
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'smart-digital-solutions-secret-key-2024')
JWT_ALGORITHM = "HS256"

# Resend Settings
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'emileparfait2003@gmail.com')

# Hubtel Settings
HUBTEL_CLIENT_ID = os.environ.get('HUBTEL_CLIENT_ID', '')
HUBTEL_CLIENT_SECRET = os.environ.get('HUBTEL_CLIENT_SECRET', '')
HUBTEL_SENDER_ID = os.environ.get('HUBTEL_SENDER_ID', 'SDM')

# SDM Business Settings (defaults - can be overridden by DB config)
SDM_COMMISSION_RATE = float(os.environ.get('SDM_COMMISSION_RATE', '0.02'))  # 2%
CASHBACK_PENDING_DAYS = int(os.environ.get('CASHBACK_PENDING_DAYS', '7'))
WITHDRAWAL_FEE = float(os.environ.get('WITHDRAWAL_FEE', '1.0'))  # GHS

# Referral bonus constants
REFERRAL_BONUS = 3.0  # GHS for referrer when referral buys a card
REFERRAL_WELCOME_BONUS = 1.0  # GHS for new user when buying a card

# Default SDM config (will be loaded from DB)
DEFAULT_SDM_CONFIG = {
    "membership_card_price": 50.0,
    "referral_bonus_bronze": 3.0,
    "referral_bonus_silver": 4.0,
    "referral_bonus_gold": 5.0,
    "welcome_bonus": 1.0,
    "bronze_min_referrals": 0,
    "silver_min_referrals": 5,
    "gold_min_referrals": 15,
    "membership_validity_days": 365,
    "require_membership_for_referral": False,
    "sdm_commission_rate": 0.02,
    "cashback_pending_days": 7,
    "withdrawal_fee": 1.0,
    "float_low_threshold": 5000.0,
    "float_critical_threshold": 1000.0,
    "float_alert_webhook_url": None,
    "float_alert_emails": [],
    "alert_on_low_threshold": True,
    "alert_on_critical_threshold": True,
    "monthly_service_limit": 2500.0,
    "service_commission_rate": 0.001,
}

# Global config cache
sdm_config_cache = None

async def get_sdm_config():
    """Get SDM config from database or return defaults"""
    global sdm_config_cache
    if sdm_config_cache:
        return sdm_config_cache
    
    config = await db.sdm_config.find_one({"type": "main"}, {"_id": 0})
    if config:
        sdm_config_cache = {**DEFAULT_SDM_CONFIG, **config}
    else:
        sdm_config_cache = DEFAULT_SDM_CONFIG.copy()
        await db.sdm_config.insert_one({"type": "main", **sdm_config_cache})
    return sdm_config_cache

async def update_sdm_config(updates: dict):
    """Update SDM config and clear cache"""
    global sdm_config_cache
    await db.sdm_config.update_one(
        {"type": "main"},
        {"$set": updates},
        upsert=True
    )
    sdm_config_cache = None
