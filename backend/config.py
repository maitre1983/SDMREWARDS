# /app/backend/config.py
"""
SDM Fintech Platform - Configuration Constants
Centralized configuration for the application
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ============== JWT Configuration ==============
JWT_SECRET = os.environ.get('JWT_SECRET', 'smart-digital-solutions-secret-key-2024')
JWT_ALGORITHM = "HS256"

# ============== Email Configuration ==============
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'emileparfait2003@gmail.com')

# ============== SMS Configuration (Hubtel) ==============
HUBTEL_CLIENT_ID = os.environ.get('HUBTEL_CLIENT_ID', '')
HUBTEL_CLIENT_SECRET = os.environ.get('HUBTEL_CLIENT_SECRET', '')
HUBTEL_SENDER_ID = os.environ.get('HUBTEL_SENDER_ID', 'SDM')

# ============== BulkClix Configuration ==============
BULKCLIX_API_KEY = os.environ.get('BULKCLIX_API_KEY', '')
BULKCLIX_OTP_SENDER_ID = os.environ.get('BULKCLIX_OTP_SENDER_ID', '')
BULKCLIX_BASE_URL = os.environ.get('BULKCLIX_BASE_URL', 'https://api.bulkclix.com/api/v1')

# ============== SDM Business Configuration ==============
SDM_COMMISSION_RATE = float(os.environ.get('SDM_COMMISSION_RATE', '0.02'))  # 2%
CASHBACK_PENDING_DAYS = int(os.environ.get('CASHBACK_PENDING_DAYS', '7'))
WITHDRAWAL_FEE = float(os.environ.get('WITHDRAWAL_FEE', '1.0'))  # GHS

# ============== Cash Payment Limits ==============
DEFAULT_CASH_DEBIT_LIMIT = float(os.environ.get('DEFAULT_CASH_DEBIT_LIMIT', '5000.0'))  # GHS
DEFAULT_GRACE_PERIOD_DAYS = int(os.environ.get('DEFAULT_GRACE_PERIOD_DAYS', '3'))
MAX_CASH_CASHBACK_RATE = float(os.environ.get('MAX_CASH_CASHBACK_RATE', '15.0'))  # 15% max

# ============== Referral Configuration ==============
REFERRAL_BONUS = 3.0  # GHS for referrer when referral buys a card
REFERRAL_WELCOME_BONUS = 1.0  # GHS for new user when buying a card

# ============== Test Account Configuration ==============
TEST_PHONE = "+233000000000"
TEST_OTP = "0000"

# ============== Admin Roles ==============
ADMIN_ROLES = {
    "super_admin": {
        "name": "Super Admin",
        "description": "Full access to all admin features including managing other admins",
        "permissions": ["*"]
    },
    "admin": {
        "name": "Admin",
        "description": "Can manage users & merchants but not other admins",
        "permissions": ["users", "merchants", "config", "messages", "stats"]
    },
    "viewer": {
        "name": "Viewer",
        "description": "Read-only access to dashboard",
        "permissions": ["stats", "messages"]
    }
}

# ============== Default VIP Cards ==============
DEFAULT_VIP_CARDS = [
    {
        "id": "silver-card",
        "name": "Silver Card",
        "tier": "SILVER",
        "price": 50.0,
        "monthly_withdrawal_limit": 1000.0,
        "cashback_bonus": 0.0,
        "lottery_multiplier": 1,
        "validity_days": 365,
        "description": "Basic membership with standard benefits",
        "benefits": [
            "Earn cashback on all purchases",
            "Monthly withdrawal limit: GHS 1,000",
            "1x lottery tickets"
        ],
        "is_active": True
    },
    {
        "id": "gold-card",
        "name": "Gold Card",
        "tier": "GOLD",
        "price": 200.0,
        "monthly_withdrawal_limit": 5000.0,
        "cashback_bonus": 2.0,
        "lottery_multiplier": 3,
        "validity_days": 365,
        "description": "Premium membership with enhanced benefits",
        "benefits": [
            "2% extra cashback on all purchases",
            "Monthly withdrawal limit: GHS 5,000",
            "3x lottery tickets",
            "Priority support"
        ],
        "is_active": True
    },
    {
        "id": "platinum-card",
        "name": "Platinum Card",
        "tier": "PLATINUM",
        "price": 500.0,
        "monthly_withdrawal_limit": 20000.0,
        "cashback_bonus": 5.0,
        "lottery_multiplier": 5,
        "validity_days": 365,
        "description": "Elite membership with maximum benefits",
        "benefits": [
            "5% extra cashback on all purchases",
            "Monthly withdrawal limit: GHS 20,000",
            "5x lottery tickets",
            "VIP support",
            "Exclusive offers"
        ],
        "is_active": True
    }
]

# ============== Default SDM Configuration ==============
DEFAULT_SDM_CONFIG = {
    "maintenance_mode": False,
    "allow_registrations": True,
    "min_cashback_rate": 1.0,
    "max_cashback_rate": 30.0,
    "min_withdrawal": 10.0,
    "max_withdrawal": 5000.0,
    "withdrawal_fee": 1.0,
    "referral_bonus": REFERRAL_BONUS,
    "welcome_bonus": REFERRAL_WELCOME_BONUS,
    "sms_provider": "bulkclix",
    "lottery_enabled": True,
    "birthday_bonus_enabled": True,
    "birthday_bonus_amount": 5.0
}
