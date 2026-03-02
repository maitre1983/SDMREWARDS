from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import httpx
import base64
import secrets
import qrcode
import io
import base64 as b64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from enum import Enum
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import resend
import phonenumbers
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# Import Ledger Service
from ledger import LedgerService, EntityType, TransactionType, WithdrawalStatus

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Ledger Service
ledger_service = LedgerService(db)

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

# BulkClix OTP Settings
BULKCLIX_API_KEY = os.environ.get('BULKCLIX_API_KEY', '')
BULKCLIX_OTP_SENDER_ID = os.environ.get('BULKCLIX_OTP_SENDER_ID', '')
BULKCLIX_BASE_URL = os.environ.get('BULKCLIX_BASE_URL', 'https://api.bulkclix.com/api/v1')

# SDM Business Settings (defaults - can be overridden by DB config)
SDM_COMMISSION_RATE = float(os.environ.get('SDM_COMMISSION_RATE', '0.02'))  # 2%
CASHBACK_PENDING_DAYS = int(os.environ.get('CASHBACK_PENDING_DAYS', '7'))
WITHDRAWAL_FEE = float(os.environ.get('WITHDRAWAL_FEE', '1.0'))  # GHS

# Referral bonus constants (used before membership system)
REFERRAL_BONUS = 3.0  # GHS for referrer when referral buys a card
REFERRAL_WELCOME_BONUS = 1.0  # GHS for new user when buying a card

# Default config (will be loaded from DB)
DEFAULT_SDM_CONFIG = {
    "membership_card_price": 50.0,  # GHS - Default for platform cards
    "referral_bonus_bronze": 3.0,   # GHS per referral at Bronze level
    "referral_bonus_silver": 4.0,   # GHS per referral at Silver level  
    "referral_bonus_gold": 5.0,     # GHS per referral at Gold level
    "welcome_bonus": 1.0,           # GHS for new member
    "bronze_min_referrals": 0,
    "silver_min_referrals": 5,
    "gold_min_referrals": 15,
    "membership_validity_days": 365,
    "require_membership_for_referral": False,  # If true, only members can refer
    # Fintech configuration
    "sdm_commission_rate": 0.02,    # 2% SDM commission on cashback
    "cashback_pending_days": 7,     # Days before cashback becomes available
    "withdrawal_fee": 1.0,          # GHS fee for withdrawals
    "float_low_threshold": 5000.0,  # Alert when float below this
    "float_critical_threshold": 1000.0,  # Critical alert threshold
    # Alert configuration
    "float_alert_webhook_url": None,  # Webhook URL for float alerts
    "float_alert_emails": [],  # Email addresses for float alerts
    "alert_on_low_threshold": True,  # Send alert on low threshold
    "alert_on_critical_threshold": True,  # Send alert on critical threshold
    # Service configuration (Airtime, Data, Bills)
    "monthly_service_limit": 2500.0,  # Monthly limit for services
    "service_commission_rate": 0.001,  # 0.1% commission on services
}

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

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
    sdm_config_cache = None  # Clear cache

# Create the main app
app = FastAPI(title="Smart Digital Solutions & SDM API")

# Create routers
api_router = APIRouter(prefix="/api")
sdm_router = APIRouter(prefix="/api/sdm")

security = HTTPBearer()

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== SMART DIGITAL MODELS (Original) ==============

class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    service_type: Optional[str] = None
    message: str
    status: str = "unread"
    admin_reply: Optional[str] = None
    replied_at: Optional[str] = None
    email_sent: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    service_type: Optional[str] = None
    message: str

class AdminReply(BaseModel):
    reply: str

class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    email: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AdminLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class VisitLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    page: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    device_type: str = "unknown"
    browser: Optional[str] = None
    os: Optional[str] = None
    referrer: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VisitCreate(BaseModel):
    page: str
    referrer: Optional[str] = None

# ============== SDM MODELS ==============

class SDMUser(BaseModel):
    """SDM Client User"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    phone_verified: bool = False
    password_hash: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    qr_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:12].upper())
    referral_code: str = Field(default_factory=lambda: f"SDM{secrets.token_hex(3).upper()}")
    referred_by: Optional[str] = None  # User ID who referred this user
    referral_bonus_earned: float = 0.0
    referral_count: int = 0  # Active members referred
    referral_level: str = "bronze"  # bronze, silver, gold
    has_membership: bool = False
    membership_expires: Optional[str] = None
    membership_card_id: Optional[str] = None
    wallet_pending: float = 0.0
    wallet_available: float = 0.0
    total_earned: float = 0.0
    total_withdrawn: float = 0.0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MerchantMembershipCardType(BaseModel):
    """Merchant-specific membership card type"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    merchant_id: str
    merchant_name: str
    name: str  # "Gold Card", "VIP Card", etc.
    description: Optional[str] = None
    price: float
    validity_days: int = 365
    cashback_bonus: float = 0.0  # Extra cashback % for cardholders
    referral_bonus: float = 5.0  # Bonus for referrer when cardholder refers someone
    welcome_bonus: float = 2.0  # Bonus for new cardholder
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MembershipCard(BaseModel):
    """SDM Membership Card - linked to merchant"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_phone: str
    merchant_id: str
    merchant_name: str
    card_type_id: str
    card_type_name: str
    card_number: str = Field(default_factory=lambda: f"SDM{datetime.now().strftime('%Y%m%d')}{secrets.token_hex(4).upper()}")
    price_paid: float
    payment_method: str = "wallet"  # "wallet", "mobile_money"
    payment_reference: Optional[str] = None
    status: str = "active"  # active, expired, cancelled
    purchased_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str = ""
    referrer_bonus_paid: bool = False  # Track if referrer got bonus

# ==================== VIP MEMBERSHIP CARDS (Admin-Managed) ====================

class VIPCardTier(str, Enum):
    SILVER = "SILVER"
    GOLD = "GOLD"
    PLATINUM = "PLATINUM"

class VIPCardType(BaseModel):
    """VIP Membership Card Type - Admin managed"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tier: str  # SILVER, GOLD, PLATINUM
    name: str  # "VIP Silver Member", etc.
    price: float
    validity_days: int = 365
    # Benefits
    cashback_boost: float = 0.0  # Extra % on cashback (0.2 for Gold, 0.5 for Platinum)
    monthly_withdrawal_limit: float = 2500.0  # 5000 for Platinum
    lottery_multiplier: int = 1  # 1 for Silver, 2 for Gold, 3 for Platinum
    has_priority_withdrawal: bool = False
    has_gold_merchants_access: bool = False
    has_ambassador_program: bool = False
    has_business_opportunities: bool = False
    has_investment_access: bool = False
    # Display
    badge_color: str = "#C0C0C0"  # Silver by default
    description: str = ""
    benefits_list: List[str] = Field(default_factory=list)
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VIPMembership(BaseModel):
    """User's VIP Membership"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_phone: str
    card_type_id: str
    tier: str  # SILVER, GOLD, PLATINUM
    card_name: str
    card_number: str = Field(default_factory=lambda: f"VIP{datetime.now().strftime('%Y%m%d')}{secrets.token_hex(4).upper()}")
    price_paid: float
    payment_method: str = "cashback"  # "cashback", "mobile_money"
    status: str = "active"  # active, expired, upgraded
    purchased_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str = ""
    upgraded_from: Optional[str] = None  # Previous tier if upgraded
    referrer_bonus_paid: bool = False

# ==================== PARTNERS (Admin-Managed) ====================

class PartnerCategory(str, Enum):
    RESTAURANT = "RESTAURANT"
    SHOP = "SHOP"
    HOTEL = "HOTEL"
    SCHOOL = "SCHOOL"
    SALON = "SALON"
    PHARMACY = "PHARMACY"
    SUPERMARKET = "SUPERMARKET"
    GAS_STATION = "GAS_STATION"
    OTHER = "OTHER"

class SDMPartner(BaseModel):
    """SDM Partner Business - for display purposes"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str  # RESTAURANT, SHOP, HOTEL, SCHOOL, etc.
    description: Optional[str] = None
    address: str
    city: str = "Accra"
    region: str = "Greater Accra"
    phone: Optional[str] = None
    cashback_rate: float = 5.0  # Display rate
    logo_url: Optional[str] = None
    is_gold_exclusive: bool = False  # Only for Gold/Platinum members
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== LOTTERY SYSTEM ====================

class LotteryStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    DRAWING = "DRAWING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class LotteryFundingSource(str, Enum):
    FIXED = "FIXED"  # Admin sets fixed amount
    COMMISSION = "COMMISSION"  # % of SDM commissions
    MIXED = "MIXED"  # Both

class SDMLottery(BaseModel):
    """Monthly VIP Lottery Draw"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "Tirage Mars 2026"
    description: Optional[str] = None
    month: str  # e.g., "2026-03"
    status: str = "DRAFT"  # DRAFT, ACTIVE, DRAWING, COMPLETED, CANCELLED
    
    # Prize Pool
    funding_source: str = "FIXED"  # FIXED, COMMISSION, MIXED
    fixed_amount: float = 0.0  # Fixed prize pool
    commission_percentage: float = 0.0  # % of SDM commissions to add
    total_prize_pool: float = 0.0  # Calculated total
    
    # Prize Distribution (5 winners)
    prize_distribution: List[float] = Field(default_factory=lambda: [40, 25, 15, 12, 8])  # Percentages
    
    # Participants
    total_participants: int = 0
    total_entries: int = 0  # With multipliers
    
    # Dates
    start_date: str = ""
    end_date: str = ""
    draw_date: Optional[str] = None
    
    # Results
    winners: List[Dict] = Field(default_factory=list)  # [{user_id, name, phone, tier, prize_amount, rank}]
    is_announced: bool = False
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None

class LotteryParticipant(BaseModel):
    """Lottery participant entry"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lottery_id: str
    user_id: str
    user_phone: str
    user_name: str
    vip_tier: str  # SILVER, GOLD, PLATINUM
    entries: int  # 1 for Silver, 2 for Gold, 3 for Platinum
    is_winner: bool = False
    prize_rank: Optional[int] = None  # 1-5 if winner
    prize_amount: float = 0.0
    registered_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SDMMerchant(BaseModel):
    """SDM Merchant/Business"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_name: str
    business_type: str  # restaurant, salon, spa, hotel, etc.
    phone: str
    phone_verified: bool = False
    password_hash: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gps_address: Optional[str] = None  # GPS coordinates or Plus Code
    city: str = "Accra"
    cashback_rate: float = 0.05  # 5% default
    api_key: str = Field(default_factory=lambda: f"sdk_{secrets.token_hex(16)}")
    api_secret: str = Field(default_factory=lambda: secrets.token_hex(32))
    is_active: bool = True
    is_verified: bool = False
    subscription_plan: str = "basic"  # basic, pro, enterprise
    subscription_expires: Optional[str] = None
    total_transactions: int = 0
    total_cashback_given: float = 0.0
    balance: float = 0.0  # Merchant balance for cashback pool
    staff: List[Dict] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SDMTransaction(BaseModel):
    """SDM Transaction Record (Ledger)"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: str = Field(default_factory=lambda: f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}{secrets.token_hex(4).upper()}")
    user_id: str
    merchant_id: str
    merchant_name: str
    amount: float  # Transaction amount
    cashback_rate: float
    cashback_amount: float
    sdm_commission: float
    net_cashback: float  # After SDM commission
    status: str = "pending"  # pending, available, claimed
    available_date: str = ""  # When cashback becomes available
    staff_id: Optional[str] = None
    staff_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SDMWithdrawal(BaseModel):
    """SDM Withdrawal Request"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    fee: float
    net_amount: float
    mobile_money_number: str
    mobile_money_provider: str  # MTN, Vodafone, AirtelTigo
    status: str = "pending"  # pending, processing, completed, failed
    reference: Optional[str] = None
    processed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OTPRecord(BaseModel):
    """OTP for phone verification"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    otp_code: str
    referral_code: Optional[str] = None  # Referral code used during registration
    attempts: int = 0
    is_verified: bool = False
    expires_at: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReferralBonus(BaseModel):
    """Referral bonus record"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    referrer_id: str
    referred_id: str
    referred_phone: str
    bonus_type: str  # "referrer_bonus", "welcome_bonus"
    amount: float
    status: str = "credited"  # credited, pending
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Notification(BaseModel):
    """User/Client Notification"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    recipient_type: str  # "all", "clients", "merchants", "specific"
    recipient_ids: List[str] = Field(default_factory=list)  # Specific user/merchant IDs
    title: str
    message: str
    notification_type: str = "system"  # system, promo, transaction, alert, info
    priority: str = "normal"  # low, normal, high, urgent
    action_url: Optional[str] = None  # Deep link or URL to open
    image_url: Optional[str] = None
    is_read: Dict[str, bool] = Field(default_factory=dict)  # {user_id: True/False}
    is_active: bool = True
    expires_at: Optional[str] = None
    sent_by: str = "admin"
    sent_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FloatAlert(BaseModel):
    """Float threshold alert record"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    alert_type: str  # "low", "critical"
    float_balance: float
    threshold: float
    message: str
    is_acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    webhook_sent: bool = False
    webhook_response: Optional[str] = None
    email_sent: bool = False
    email_recipients: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============== REQUEST/RESPONSE MODELS ==============

class SendOTPRequest(BaseModel):
    phone: str
    referral_code: Optional[str] = None
    user_type: str = "client"  # "client" or "merchant"

class VerifyOTPRequest(BaseModel):
    phone: str
    otp_code: str
    request_id: str  # BulkClix request ID

class ClientRegisterRequest(BaseModel):
    phone: str
    full_name: str
    password: str
    referral_code: Optional[str] = None
    otp_code: str
    request_id: str

class ClientLoginRequest(BaseModel):
    phone: str
    password: str

class MerchantRegisterRequest(BaseModel):
    business_name: str
    business_type: str
    phone: str
    password: str
    otp_code: str
    request_id: str
    email: Optional[str] = None
    address: Optional[str] = None
    gps_address: Optional[str] = None
    city: str = "Accra"
    cashback_rate: float = 0.05

class MerchantLoginRequest(BaseModel):
    phone: str
    password: str

class UserRegisterRequest(BaseModel):
    phone: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None

class CreateTransactionRequest(BaseModel):
    user_qr_code: str
    amount: float
    notes: Optional[str] = None
    staff_id: Optional[str] = None

class WithdrawalRequest(BaseModel):
    amount: float
    mobile_money_number: str
    mobile_money_provider: str

class AddStaffRequest(BaseModel):
    name: str
    phone: str
    role: str = "cashier"

class PurchaseMembershipRequest(BaseModel):
    card_type_id: str  # The merchant's card type to purchase
    payment_method: str = "wallet"  # wallet, mobile_money
    mobile_money_number: Optional[str] = None
    mobile_money_provider: Optional[str] = None

class CreateCardTypeRequest(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    validity_days: int = 365
    cashback_bonus: float = 0.0
    referral_bonus: float = 5.0
    welcome_bonus: float = 2.0

class UpdateSDMConfigRequest(BaseModel):
    membership_card_price: Optional[float] = None
    referral_bonus_bronze: Optional[float] = None
    referral_bonus_silver: Optional[float] = None
    referral_bonus_gold: Optional[float] = None
    welcome_bonus: Optional[float] = None
    bronze_min_referrals: Optional[int] = None
    silver_min_referrals: Optional[int] = None
    gold_min_referrals: Optional[int] = None
    membership_validity_days: Optional[int] = None
    require_membership_for_referral: Optional[bool] = None
    # Fintech configuration
    sdm_commission_rate: Optional[float] = None  # SDM commission on cashback (default 2%)
    cashback_pending_days: Optional[int] = None  # Days before cashback becomes available
    withdrawal_fee: Optional[float] = None  # Fee for withdrawals in GHS
    float_low_threshold: Optional[float] = None  # Alert when float below this
    float_critical_threshold: Optional[float] = None  # Critical alert threshold
    # Alert configuration
    float_alert_webhook_url: Optional[str] = None  # Webhook URL for float alerts
    float_alert_emails: Optional[List[str]] = None  # Email addresses for float alerts
    alert_on_low_threshold: Optional[bool] = None  # Send alert on low threshold
    alert_on_critical_threshold: Optional[bool] = None  # Send alert on critical threshold
    # Service configuration (Airtime, Data, Bills)
    monthly_service_limit: Optional[float] = None  # Monthly limit for services
    service_commission_rate: Optional[float] = None  # Commission rate on services

class CreateNotificationRequest(BaseModel):
    recipient_type: str  # "all", "clients", "merchants", "specific"
    recipient_ids: Optional[List[str]] = None  # For "specific" type
    title: str
    message: str
    notification_type: str = "system"  # system, promo, transaction, alert, info
    priority: str = "normal"  # low, normal, high, urgent
    action_url: Optional[str] = None
    image_url: Optional[str] = None
    expires_at: Optional[str] = None

class UpdateNotificationRequest(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    notification_type: Optional[str] = None
    priority: Optional[str] = None
    action_url: Optional[str] = None
    is_active: Optional[bool] = None
    expires_at: Optional[str] = None

# ============== HELPER FUNCTIONS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(data: dict, expires_hours: int = 24) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)

def normalize_phone(phone: str) -> str:
    """Normalize phone to E.164 format for Ghana"""
    try:
        parsed = phonenumbers.parse(phone, "GH")
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except:
        pass
    # Fallback: basic normalization
    phone = phone.replace(" ", "").replace("-", "")
    if phone.startswith("0"):
        phone = "+233" + phone[1:]
    elif phone.startswith("233"):
        phone = "+" + phone
    elif not phone.startswith("+"):
        phone = "+233" + phone
    return phone

def generate_qr_code_base64(data: str) -> str:
    """Generate QR code as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return b64.b64encode(buffer.getvalue()).decode()

def parse_user_agent(user_agent: str) -> dict:
    ua_lower = user_agent.lower() if user_agent else ""
    device_type = "desktop"
    if "mobile" in ua_lower or "android" in ua_lower and "mobile" in ua_lower:
        device_type = "mobile"
    elif "tablet" in ua_lower or "ipad" in ua_lower:
        device_type = "tablet"
    browser = "unknown"
    if "edg" in ua_lower: browser = "Edge"
    elif "chrome" in ua_lower: browser = "Chrome"
    elif "firefox" in ua_lower: browser = "Firefox"
    elif "safari" in ua_lower: browser = "Safari"
    os_name = "unknown"
    if "windows" in ua_lower: os_name = "Windows"
    elif "mac" in ua_lower: os_name = "MacOS"
    elif "linux" in ua_lower: os_name = "Linux"
    elif "android" in ua_lower: os_name = "Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower: os_name = "iOS"
    return {"device_type": device_type, "browser": browser, "os": os_name}

async def send_sms_hubtel(phone: str, message: str) -> bool:
    """Send SMS via Hubtel API"""
    if not HUBTEL_CLIENT_ID or not HUBTEL_CLIENT_SECRET:
        logger.warning("Hubtel credentials not configured")
        return False
    
    credentials = f"{HUBTEL_CLIENT_ID}:{HUBTEL_CLIENT_SECRET}"
    encoded = base64.b64encode(credentials.encode()).decode()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://smsc.hubtel.com/v1/messages/send",
                json={
                    "From": HUBTEL_SENDER_ID,
                    "To": phone,
                    "Content": message
                },
                headers={
                    "Authorization": f"Basic {encoded}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            if response.status_code in [200, 201]:
                logger.info(f"SMS sent to {phone}")
                return True
            else:
                logger.error(f"Hubtel SMS error: {response.text}")
                return False
    except Exception as e:
        logger.error(f"SMS error: {str(e)}")
        return False

# ============== BULKCLIX OTP SERVICE ==============

async def send_otp_bulkclix(phone: str) -> dict:
    """Send OTP via BulkClix API"""
    if not BULKCLIX_API_KEY or not BULKCLIX_OTP_SENDER_ID:
        logger.warning("BulkClix OTP credentials not configured")
        return {"success": False, "error": "OTP service not configured"}
    
    # Normalize phone for BulkClix (remove + prefix)
    phone_clean = phone.replace("+", "").replace(" ", "")
    if phone_clean.startswith("233"):
        phone_clean = "0" + phone_clean[3:]  # Convert to local format
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BULKCLIX_BASE_URL}/sms-api/otp/send",
                json={
                    "phoneNumber": phone_clean,
                    "senderId": BULKCLIX_OTP_SENDER_ID,
                    "message": "Your SDMrewards access code is <%otp_code%>",
                    "expiry": 5,  # 5 minutes
                    "length": 4   # 4-digit OTP
                },
                headers={
                    "x-api-key": BULKCLIX_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                logger.info(f"BulkClix OTP sent to {phone_clean}")
                otp_data = data.get("data", {}).get("otp", {})
                return {
                    "success": True,
                    "request_id": otp_data.get("requestId"),
                    "prefix": otp_data.get("prefix"),
                    "ussd_code": otp_data.get("ussd_code"),
                    "phone": phone_clean
                }
            else:
                logger.error(f"BulkClix OTP error: {response.text}")
                return {"success": False, "error": response.text}
    except Exception as e:
        logger.error(f"BulkClix OTP error: {str(e)}")
        return {"success": False, "error": str(e)}

async def verify_otp_bulkclix(phone: str, code: str, request_id: str) -> dict:
    """Verify OTP via BulkClix API"""
    if not BULKCLIX_API_KEY:
        logger.warning("BulkClix API key not configured")
        return {"success": False, "error": "OTP service not configured"}
    
    # Normalize phone for BulkClix
    phone_clean = phone.replace("+", "").replace(" ", "")
    if phone_clean.startswith("233"):
        phone_clean = "0" + phone_clean[3:]
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BULKCLIX_BASE_URL}/sms-api/otp/verify",
                json={
                    "requestId": request_id,
                    "phoneNumber": phone_clean,
                    "code": code
                },
                headers={
                    "x-api-key": BULKCLIX_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            logger.info(f"BulkClix verify response: {response.status_code} - {response.text}")
            
            try:
                data = response.json()
            except:
                data = {}
            
            if response.status_code in [200, 201]:
                if "successful" in data.get("message", "").lower():
                    logger.info(f"BulkClix OTP verified for {phone_clean}")
                    return {"success": True, "phone": phone_clean}
                else:
                    return {"success": False, "error": data.get("message", "Verification failed")}
            elif response.status_code == 401:
                return {"success": False, "error": "OTP expired or invalid request. Please request a new code."}
            elif response.status_code == 422:
                return {"success": False, "error": data.get("message", "Invalid OTP code")}
            else:
                logger.error(f"BulkClix OTP verify error: {response.text}")
                return {"success": False, "error": data.get("message", "Verification failed")}
    except Exception as e:
        logger.error(f"BulkClix OTP verify error: {str(e)}")
        return {"success": False, "error": str(e)}

# ============== AUTH DEPENDENCIES ==============

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if payload.get("type") != "admin":
            raise HTTPException(status_code=401, detail="Invalid token type")
        admin = await db.admins.find_one({"username": username}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if payload.get("type") != "user":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.sdm_users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_merchant(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        merchant_id = payload.get("sub")
        if payload.get("type") != "merchant":
            raise HTTPException(status_code=401, detail="Invalid token type")
        merchant = await db.sdm_merchants.find_one({"id": merchant_id}, {"_id": 0})
        if not merchant:
            raise HTTPException(status_code=401, detail="Merchant not found")
        return merchant
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== EMAIL FUNCTIONS ==============

async def send_admin_notification(message: ContactMessage):
    if not RESEND_API_KEY:
        return False
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0056D2;">New Contact Request</h2>
        <p><strong>Name:</strong> {message.name}</p>
        <p><strong>Email:</strong> {message.email}</p>
        <p><strong>Phone:</strong> {message.phone or 'N/A'}</p>
        <p><strong>Company:</strong> {message.company or 'N/A'}</p>
        <p><strong>Service:</strong> {message.service_type or 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <p style="background: #f5f5f5; padding: 15px; border-radius: 8px;">{message.message}</p>
    </div>
    """
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [ADMIN_EMAIL],
            "subject": f"New Contact: {message.name}",
            "html": html_content
        })
        return True
    except Exception as e:
        logger.error(f"Email error: {str(e)}")
        return False

# ============== SMART DIGITAL ROUTES (Original) ==============

@api_router.get("/")
async def root():
    return {"message": "Smart Digital Solutions API"}

@api_router.post("/contact", response_model=ContactMessage)
async def create_contact_message(input_data: ContactMessageCreate):
    message_obj = ContactMessage(**input_data.model_dump())
    await db.contact_messages.insert_one(message_obj.model_dump())
    asyncio.create_task(send_admin_notification(message_obj))
    return message_obj

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Smart Digital Solutions & SDM"}

@api_router.post("/track")
async def track_visit(visit_data: VisitCreate, request: Request):
    user_agent = request.headers.get("user-agent", "")
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    if ip and "," in ip:
        ip = ip.split(",")[0].strip()
    ua_info = parse_user_agent(user_agent)
    visit = VisitLog(
        page=visit_data.page,
        user_agent=user_agent,
        ip_address=ip,
        device_type=ua_info["device_type"],
        browser=ua_info["browser"],
        os=ua_info["os"],
        referrer=visit_data.referrer
    )
    await db.visits.insert_one(visit.model_dump())
    return {"status": "tracked"}

@api_router.post("/admin/login", response_model=TokenResponse)
async def admin_login(credentials: AdminLogin):
    # Allow login with email or username
    admin = await db.admins.find_one(
        {"$or": [{"username": credentials.username}, {"email": credentials.username}]}, 
        {"_id": 0}
    )
    if not admin or not verify_password(credentials.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": admin.get("email", admin["username"]), "type": "admin"})
    return TokenResponse(access_token=token)

@api_router.post("/admin/setup")
async def setup_admin():
    # Check by email (primary identifier)
    existing = await db.admins.find_one({"email": "emileparfait2003@gmail.com"}, {"_id": 0})
    if existing:
        new_hash = hash_password("Gerard0103@")
        await db.admins.update_one(
            {"email": "emileparfait2003@gmail.com"},
            {"$set": {"password_hash": new_hash, "username": "emileparfait2003@gmail.com"}}
        )
        return {"message": "Admin password updated"}
    
    # Also check old admin account and update it
    old_admin = await db.admins.find_one({"username": "admin"}, {"_id": 0})
    if old_admin:
        new_hash = hash_password("Gerard0103@")
        await db.admins.update_one(
            {"username": "admin"},
            {"$set": {"password_hash": new_hash, "email": "emileparfait2003@gmail.com", "username": "emileparfait2003@gmail.com"}}
        )
        return {"message": "Admin updated to use email"}
    
    admin = AdminUser(username="emileparfait2003@gmail.com", password_hash=hash_password("Gerard0103@"))
    doc = admin.model_dump()
    doc["email"] = "emileparfait2003@gmail.com"
    await db.admins.insert_one(doc)
    return {"message": "Admin created", "email": "emileparfait2003@gmail.com"}

@api_router.get("/admin/messages", response_model=List[ContactMessage])
async def get_all_messages(admin: dict = Depends(get_current_admin)):
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return messages

@api_router.put("/admin/messages/{message_id}/read")
async def mark_as_read(message_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.contact_messages.update_one({"id": message_id}, {"$set": {"status": "read"}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Marked as read"}

@api_router.put("/admin/messages/{message_id}/reply")
async def reply_to_message(message_id: str, reply_data: AdminReply, admin: dict = Depends(get_current_admin)):
    result = await db.contact_messages.update_one(
        {"id": message_id},
        {"$set": {"status": "replied", "admin_reply": reply_data.reply, "replied_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Reply saved"}

@api_router.delete("/admin/messages/{message_id}")
async def delete_message(message_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.contact_messages.delete_one({"id": message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Message deleted"}

@api_router.get("/admin/stats")
async def get_stats(admin: dict = Depends(get_current_admin)):
    total = await db.contact_messages.count_documents({})
    unread = await db.contact_messages.count_documents({"status": "unread"})
    replied = await db.contact_messages.count_documents({"status": "replied"})
    total_visits = await db.visits.count_documents({})
    # SDM Stats
    sdm_users = await db.sdm_users.count_documents({})
    sdm_merchants = await db.sdm_merchants.count_documents({})
    sdm_transactions = await db.sdm_transactions.count_documents({})
    return {
        "total_messages": total,
        "unread_messages": unread,
        "replied_messages": replied,
        "read_messages": total - unread - replied,
        "total_visits": total_visits,
        "sdm_users": sdm_users,
        "sdm_merchants": sdm_merchants,
        "sdm_transactions": sdm_transactions
    }

@api_router.get("/admin/analytics")
async def get_analytics(admin: dict = Depends(get_current_admin)):
    total_visits = await db.visits.count_documents({})
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_visits = await db.visits.count_documents({"timestamp": {"$gte": today.isoformat()}})
    device_pipeline = [{"$group": {"_id": "$device_type", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    devices = await db.visits.aggregate(device_pipeline).to_list(10)
    browser_pipeline = [{"$group": {"_id": "$browser", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    browsers = await db.visits.aggregate(browser_pipeline).to_list(10)
    os_pipeline = [{"$group": {"_id": "$os", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    os_stats = await db.visits.aggregate(os_pipeline).to_list(10)
    page_pipeline = [{"$group": {"_id": "$page", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    pages = await db.visits.aggregate(page_pipeline).to_list(10)
    recent_visits = await db.visits.find({}, {"_id": 0}).sort("timestamp", -1).to_list(20)
    return {
        "total_visits": total_visits,
        "today_visits": today_visits,
        "devices": [{"name": d["_id"], "count": d["count"]} for d in devices],
        "browsers": [{"name": b["_id"], "count": b["count"]} for b in browsers],
        "os_stats": [{"name": o["_id"], "count": o["count"]} for o in os_stats],
        "pages": [{"name": p["_id"], "count": p["count"]} for p in pages],
        "recent_visits": recent_visits
    }

# ============== SDM USER ROUTES ==============

# Test account credentials (for development/testing only)
TEST_PHONE = "+233000000000"
TEST_OTP = "0000"

@sdm_router.post("/auth/send-otp")
async def send_otp(request: SendOTPRequest):
    """Send OTP to phone number via BulkClix"""
    phone = normalize_phone(request.phone)
    
    # Test account - return mock request_id
    if phone == normalize_phone(TEST_PHONE):
        return {
            "message": "OTP sent (test account)",
            "phone": phone,
            "request_id": "test_request_id",
            "is_test_account": True
        }
    
    # Send real OTP via BulkClix
    result = await send_otp_bulkclix(phone)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send OTP"))
    
    # Store referral code temporarily if provided
    if request.referral_code:
        referrer = await db.sdm_users.find_one({"referral_code": request.referral_code.upper()}, {"_id": 0})
        if referrer:
            await db.otp_temp.update_one(
                {"phone": phone},
                {"$set": {"referral_code": request.referral_code.upper(), "request_id": result["request_id"]}},
                upsert=True
            )
    
    return {
        "message": "OTP sent",
        "phone": phone,
        "request_id": result["request_id"],
        "ussd_code": result.get("ussd_code"),
        "is_test_account": False
    }

@sdm_router.post("/auth/register")
async def register_client(request: ClientRegisterRequest):
    """Register new client with OTP verification"""
    phone = normalize_phone(request.phone)
    
    # Check if user already exists
    existing = await db.sdm_users.find_one({"phone": phone}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered. Please login instead.")
    
    # Verify OTP
    if phone == normalize_phone(TEST_PHONE):
        if request.otp_code != TEST_OTP:
            raise HTTPException(status_code=400, detail="Invalid OTP")
    else:
        verify_result = await verify_otp_bulkclix(phone, request.otp_code, request.request_id)
        if not verify_result["success"]:
            raise HTTPException(status_code=400, detail=verify_result.get("error", "OTP verification failed"))
    
    # Create new user
    new_user = SDMUser(
        phone=phone,
        phone_verified=True,
        password_hash=hash_password(request.password),
        full_name=request.full_name
    )
    
    # Handle referral
    referral_code = request.referral_code
    if not referral_code:
        # Check temp storage
        temp = await db.otp_temp.find_one({"phone": phone}, {"_id": 0})
        if temp:
            referral_code = temp.get("referral_code")
    
    if referral_code:
        referrer = await db.sdm_users.find_one({"referral_code": referral_code.upper()}, {"_id": 0})
        if referrer and referrer["phone"] != phone:
            new_user.referred_by = referrer["id"]
            
            # Give welcome bonus to new user
            new_user.wallet_available = REFERRAL_WELCOME_BONUS
            new_user.total_earned = REFERRAL_WELCOME_BONUS
            
            # Record welcome bonus
            welcome_bonus = ReferralBonus(
                referrer_id=referrer["id"],
                referred_id=new_user.id,
                referred_phone=phone,
                bonus_type="welcome_bonus",
                amount=REFERRAL_WELCOME_BONUS
            )
            await db.referral_bonuses.insert_one(welcome_bonus.model_dump())
            
            # Give bonus to referrer
            await db.sdm_users.update_one(
                {"id": referrer["id"]},
                {
                    "$inc": {
                        "wallet_available": REFERRAL_BONUS,
                        "total_earned": REFERRAL_BONUS,
                        "referral_bonus_earned": REFERRAL_BONUS,
                        "referral_count": 1
                    }
                }
            )
            
            # Record referrer bonus
            referrer_bonus = ReferralBonus(
                referrer_id=referrer["id"],
                referred_id=new_user.id,
                referred_phone=phone,
                bonus_type="referrer_bonus",
                amount=REFERRAL_BONUS
            )
            await db.referral_bonuses.insert_one(referrer_bonus.model_dump())
    
    await db.sdm_users.insert_one(new_user.model_dump())
    
    # Automatically create client wallet in ledger
    try:
        await ledger_service.create_wallet(EntityType.CLIENT, new_user.id)
    except Exception as e:
        print(f"Warning: Failed to create client wallet: {e}")
    
    # Clean up temp storage
    await db.otp_temp.delete_many({"phone": phone})
    
    # Generate token
    token = create_token({"sub": new_user.id, "type": "user", "phone": phone}, expires_hours=168)
    
    user_data = new_user.model_dump()
    del user_data["password_hash"]
    
    return {
        "message": "Registration successful",
        "access_token": token,
        "token_type": "bearer",
        "user": user_data,
        "welcome_bonus": REFERRAL_WELCOME_BONUS if new_user.referred_by else 0
    }

@sdm_router.post("/auth/login")
async def login_client(request: ClientLoginRequest):
    """Login client with phone and password"""
    phone = normalize_phone(request.phone)
    
    user = await db.sdm_users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Phone number not registered")
    
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Please set up a password first")
    
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Generate token
    token = create_token({"sub": user["id"], "type": "user", "phone": phone}, expires_hours=168)
    
    # Remove password hash from response
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_response
    }

@sdm_router.post("/auth/forgot-password")
async def forgot_password(request: SendOTPRequest):
    """Send OTP for password reset"""
    phone = normalize_phone(request.phone)
    
    # Check if user exists
    user = await db.sdm_users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Phone number not registered")
    
    # Test account
    if phone == normalize_phone(TEST_PHONE):
        return {
            "message": "OTP sent (test account)",
            "phone": phone,
            "request_id": "test_request_id",
            "is_test_account": True
        }
    
    # Send OTP
    result = await send_otp_bulkclix(phone)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send OTP"))
    
    return {
        "message": "OTP sent for password reset",
        "phone": phone,
        "request_id": result["request_id"]
    }

class ResetPasswordRequest(BaseModel):
    phone: str
    otp_code: str
    request_id: str
    new_password: str

@sdm_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password after OTP verification"""
    phone = normalize_phone(request.phone)
    
    # Verify OTP
    if phone == normalize_phone(TEST_PHONE):
        if request.otp_code != TEST_OTP:
            raise HTTPException(status_code=400, detail="Invalid OTP")
    else:
        verify_result = await verify_otp_bulkclix(phone, request.otp_code, request.request_id)
        if not verify_result["success"]:
            raise HTTPException(status_code=400, detail=verify_result.get("error", "OTP verification failed"))
    
    # Update password
    result = await db.sdm_users.update_one(
        {"phone": phone},
        {"$set": {"password_hash": hash_password(request.new_password)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Password reset successful"}

# Legacy endpoint for backward compatibility
@sdm_router.post("/auth/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP (legacy - for compatibility)"""
    phone = normalize_phone(request.phone)
    
    # Test account
    if phone == normalize_phone(TEST_PHONE):
        if request.otp_code != TEST_OTP:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        user = await db.sdm_users.find_one({"phone": phone}, {"_id": 0})
        if user:
            token = create_token({"sub": user["id"], "type": "user", "phone": phone}, expires_hours=168)
            user_response = {k: v for k, v in user.items() if k != "password_hash"}
            return {
                "message": "Verification successful",
                "access_token": token,
                "token_type": "bearer",
                "user": user_response,
                "is_new_user": False
            }
        else:
            return {
                "message": "OTP verified - please complete registration",
                "phone": phone,
                "verified": True,
                "is_new_user": True
            }
    
    # Verify via BulkClix
    verify_result = await verify_otp_bulkclix(phone, request.otp_code, request.request_id)
    if not verify_result["success"]:
        raise HTTPException(status_code=400, detail=verify_result.get("error", "OTP verification failed"))
    
    # Check if user exists
    user = await db.sdm_users.find_one({"phone": phone}, {"_id": 0})
    if user:
        token = create_token({"sub": user["id"], "type": "user", "phone": phone}, expires_hours=168)
        user_response = {k: v for k, v in user.items() if k != "password_hash"}
        return {
            "message": "Verification successful",
            "access_token": token,
            "token_type": "bearer",
            "user": user_response,
            "is_new_user": False
        }
    
    return {
        "message": "OTP verified - please complete registration",
        "phone": phone,
        "verified": True,
        "is_new_user": True
    }

@sdm_router.get("/user/profile")
async def get_user_profile(user: dict = Depends(get_current_user)):
    """Get user profile with QR code"""
    qr_data = f"SDM:{user['qr_code']}"
    qr_base64 = generate_qr_code_base64(qr_data)
    return {
        **user,
        "qr_code_image": f"data:image/png;base64,{qr_base64}"
    }

@sdm_router.get("/user/referral")
async def get_user_referral(user: dict = Depends(get_current_user)):
    """Get user referral info and stats"""
    # Get referrals made by this user
    referrals = await db.sdm_users.find(
        {"referred_by": user["id"]},
        {"_id": 0, "id": 1, "phone": 1, "first_name": 1, "last_name": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(100)
    
    # Get referral bonuses earned
    bonuses = await db.referral_bonuses.find(
        {"referrer_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get who referred this user
    referrer = None
    if user.get("referred_by"):
        referrer_data = await db.sdm_users.find_one(
            {"id": user["referred_by"]},
            {"_id": 0, "first_name": 1, "last_name": 1}
        )
        if referrer_data:
            referrer = f"{referrer_data.get('first_name', '')} {referrer_data.get('last_name', '')}".strip() or "SDM User"
    
    return {
        "referral_code": user.get("referral_code"),
        "referral_link": f"https://smartdigitalsolutions.com/sdm/client?ref={user.get('referral_code')}",
        "total_referrals": user.get("referral_count", 0),
        "total_bonus_earned": user.get("referral_bonus_earned", 0),
        "bonus_per_referral": REFERRAL_BONUS,
        "welcome_bonus_amount": REFERRAL_WELCOME_BONUS,
        "referrals": referrals,
        "bonus_history": bonuses,
        "referred_by": referrer
    }

@sdm_router.put("/user/profile")
async def update_user_profile(first_name: Optional[str] = None, last_name: Optional[str] = None, email: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Update user profile"""
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if first_name: updates["first_name"] = first_name
    if last_name: updates["last_name"] = last_name
    if email: updates["email"] = email
    await db.sdm_users.update_one({"id": user["id"]}, {"$set": updates})
    return {"message": "Profile updated"}

@sdm_router.get("/user/wallet")
async def get_user_wallet(user: dict = Depends(get_current_user)):
    """Get user wallet balance"""
    # Check for newly available cashback
    now = datetime.now(timezone.utc)
    pending_txns = await db.sdm_transactions.find({
        "user_id": user["id"],
        "status": "pending",
        "available_date": {"$lte": now.isoformat()}
    }, {"_id": 0}).to_list(100)
    
    total_newly_available = 0
    for txn in pending_txns:
        await db.sdm_transactions.update_one({"id": txn["id"]}, {"$set": {"status": "available"}})
        total_newly_available += txn["net_cashback"]
    
    if total_newly_available > 0:
        await db.sdm_users.update_one(
            {"id": user["id"]},
            {"$inc": {"wallet_available": total_newly_available, "wallet_pending": -total_newly_available}}
        )
    
    # Get updated user
    updated_user = await db.sdm_users.find_one({"id": user["id"]}, {"_id": 0})
    
    return {
        "wallet_pending": updated_user["wallet_pending"],
        "wallet_available": updated_user["wallet_available"],
        "total_earned": updated_user["total_earned"],
        "total_withdrawn": updated_user["total_withdrawn"]
    }

@sdm_router.get("/user/transactions")
async def get_user_transactions(user: dict = Depends(get_current_user), limit: int = 50):
    """Get user transaction history"""
    transactions = await db.sdm_transactions.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return transactions

@sdm_router.post("/user/withdraw")
async def request_withdrawal(request: WithdrawalRequest, user: dict = Depends(get_current_user)):
    """Request withdrawal to Mobile Money"""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    
    if request.amount > user["wallet_available"]:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    fee = WITHDRAWAL_FEE
    net_amount = request.amount - fee
    
    if net_amount <= 0:
        raise HTTPException(status_code=400, detail="Amount too small after fee")
    
    # Create withdrawal request
    withdrawal = SDMWithdrawal(
        user_id=user["id"],
        amount=request.amount,
        fee=fee,
        net_amount=net_amount,
        mobile_money_number=normalize_phone(request.mobile_money_number),
        mobile_money_provider=request.mobile_money_provider
    )
    await db.sdm_withdrawals.insert_one(withdrawal.model_dump())
    
    # Deduct from wallet
    await db.sdm_users.update_one(
        {"id": user["id"]},
        {"$inc": {"wallet_available": -request.amount}}
    )
    
    return {
        "message": "Withdrawal request submitted",
        "withdrawal_id": withdrawal.id,
        "amount": request.amount,
        "fee": fee,
        "net_amount": net_amount,
        "status": "pending"
    }

# ============== SDM MERCHANT ROUTES ==============

@sdm_router.post("/merchant/send-otp")
async def send_merchant_otp(request: SendOTPRequest):
    """Send OTP to merchant phone number"""
    phone = normalize_phone(request.phone)
    
    # Test account
    if phone == normalize_phone(TEST_PHONE):
        return {
            "message": "OTP sent (test account)",
            "phone": phone,
            "request_id": "test_request_id",
            "is_test_account": True
        }
    
    # Send real OTP
    result = await send_otp_bulkclix(phone)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send OTP"))
    
    return {
        "message": "OTP sent",
        "phone": phone,
        "request_id": result["request_id"],
        "ussd_code": result.get("ussd_code")
    }

@sdm_router.post("/merchant/register")
async def register_merchant(request: MerchantRegisterRequest):
    """Register new merchant with OTP verification"""
    phone = normalize_phone(request.phone)
    
    # Check if exists
    existing = await db.sdm_merchants.find_one({"phone": phone}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered. Please login instead.")
    
    # Verify OTP
    if phone == normalize_phone(TEST_PHONE):
        if request.otp_code != TEST_OTP:
            raise HTTPException(status_code=400, detail="Invalid OTP")
    else:
        verify_result = await verify_otp_bulkclix(phone, request.otp_code, request.request_id)
        if not verify_result["success"]:
            raise HTTPException(status_code=400, detail=verify_result.get("error", "OTP verification failed"))
    
    merchant = SDMMerchant(
        business_name=request.business_name,
        business_type=request.business_type,
        phone=phone,
        phone_verified=True,
        password_hash=hash_password(request.password),
        email=request.email,
        address=request.address,
        gps_address=request.gps_address,
        city=request.city,
        cashback_rate=request.cashback_rate
    )
    await db.sdm_merchants.insert_one(merchant.model_dump())
    
    # Automatically create merchant wallet
    try:
        await ledger_service.create_wallet(EntityType.MERCHANT, merchant.id)
    except Exception as e:
        print(f"Warning: Failed to create merchant wallet: {e}")
    
    # Generate token
    token = create_token({"sub": merchant.id, "type": "merchant"}, expires_hours=720)
    
    # Remove sensitive data from response
    merchant_data = merchant.model_dump()
    del merchant_data["password_hash"]
    
    return {
        "message": "Merchant registered successfully",
        "merchant_id": merchant.id,
        "access_token": token,
        "token_type": "bearer",
        "merchant": merchant_data
    }

@sdm_router.post("/merchant/login")
async def merchant_login(request: MerchantLoginRequest):
    """Merchant login with phone and password"""
    phone = normalize_phone(request.phone)
    merchant = await db.sdm_merchants.find_one({"phone": phone}, {"_id": 0})
    
    if not merchant:
        raise HTTPException(status_code=401, detail="Phone number not registered")
    
    if not merchant.get("password_hash"):
        # Legacy merchants without password - allow API key login
        raise HTTPException(status_code=401, detail="Please contact support to set up your password")
    
    if not verify_password(request.password, merchant["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    token = create_token({"sub": merchant["id"], "type": "merchant"}, expires_hours=720)
    
    # Remove sensitive data
    merchant_response = {k: v for k, v in merchant.items() if k != "password_hash"}
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "merchant": merchant_response
    }

@sdm_router.get("/merchant/profile")
async def get_merchant_profile(merchant: dict = Depends(get_current_merchant)):
    """Get merchant profile"""
    return merchant

@sdm_router.put("/merchant/settings")
async def update_merchant_settings(cashback_rate: Optional[float] = None, merchant: dict = Depends(get_current_merchant)):
    """Update merchant settings"""
    updates = {}
    if cashback_rate is not None:
        if cashback_rate < 0.01 or cashback_rate > 0.20:
            raise HTTPException(status_code=400, detail="Cashback rate must be between 1% and 20%")
        updates["cashback_rate"] = cashback_rate
    
    if updates:
        await db.sdm_merchants.update_one({"id": merchant["id"]}, {"$set": updates})
    
    return {"message": "Settings updated"}

@sdm_router.post("/merchant/staff")
async def add_staff(request: AddStaffRequest, merchant: dict = Depends(get_current_merchant)):
    """Add staff member"""
    staff_member = {
        "id": str(uuid.uuid4()),
        "name": request.name,
        "phone": normalize_phone(request.phone),
        "role": request.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sdm_merchants.update_one(
        {"id": merchant["id"]},
        {"$push": {"staff": staff_member}}
    )
    return {"message": "Staff added", "staff": staff_member}

@sdm_router.get("/merchant/staff")
async def get_staff(merchant: dict = Depends(get_current_merchant)):
    """Get merchant staff list"""
    return merchant.get("staff", [])

@sdm_router.delete("/merchant/staff/{staff_id}")
async def remove_staff(staff_id: str, merchant: dict = Depends(get_current_merchant)):
    """Remove staff member"""
    await db.sdm_merchants.update_one(
        {"id": merchant["id"]},
        {"$pull": {"staff": {"id": staff_id}}}
    )
    return {"message": "Staff removed"}

@sdm_router.post("/merchant/transaction")
async def create_transaction(request: CreateTransactionRequest, merchant: dict = Depends(get_current_merchant)):
    """Create cashback transaction (scan QR + amount) - Direct Payment Flow
    
    The client pays directly and the system automatically splits:
    - Merchant receives: payment - cashback
    - Client receives: cashback - SDM commission (pending)
    - SDM receives: commission
    """
    # Get dynamic config
    config = await get_sdm_config()
    commission_rate = config.get("sdm_commission_rate", SDM_COMMISSION_RATE)
    pending_days = config.get("cashback_pending_days", CASHBACK_PENDING_DAYS)
    
    # Find user by QR code
    user = await db.sdm_users.find_one({"qr_code": request.user_qr_code}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user["is_active"]:
        raise HTTPException(status_code=400, detail="User account inactive")
    
    # Get staff info
    staff_name = None
    if request.staff_id:
        for s in merchant.get("staff", []):
            if s["id"] == request.staff_id:
                staff_name = s["name"]
                break
    
    try:
        # Use the new direct payment flow via ledger service
        result = await ledger_service.process_direct_payment_transaction(
            merchant_id=merchant["id"],
            client_id=user["id"],
            payment_amount=request.amount,
            cashback_rate=merchant["cashback_rate"],
            commission_rate=commission_rate,
            pending_days=pending_days,
            payment_method="QR_SCAN",
            metadata={
                "staff_id": request.staff_id,
                "staff_name": staff_name,
                "notes": request.notes,
                "merchant_name": merchant["business_name"]
            },
            created_by=f"merchant:{merchant['id']}"
        )
        
        # Also record in sdm_transactions for backward compatibility
        transaction = SDMTransaction(
            user_id=user["id"],
            merchant_id=merchant["id"],
            merchant_name=merchant["business_name"],
            amount=request.amount,
            cashback_rate=merchant["cashback_rate"],
            cashback_amount=result["splits"]["client_cashback"] + result["splits"]["sdm_commission"],
            sdm_commission=result["splits"]["sdm_commission"],
            net_cashback=result["splits"]["client_cashback"],
            available_date=result["available_date"],
            staff_id=request.staff_id,
            staff_name=staff_name,
            notes=request.notes
        )
        transaction.transaction_id = result["reference"]
        await db.sdm_transactions.insert_one(transaction.model_dump())
        
        # Update user wallet (pending) - sync with ledger
        await db.sdm_users.update_one(
            {"id": user["id"]},
            {"$inc": {"wallet_pending": result["splits"]["client_cashback"], "total_earned": result["splits"]["client_cashback"]}}
        )
        
        # Update merchant stats
        await db.sdm_merchants.update_one(
            {"id": merchant["id"]},
            {"$inc": {"total_transactions": 1, "total_cashback_given": result["splits"]["client_cashback"]}}
        )
        
        return {
            "message": "Transaction created - Direct Payment Flow",
            "transaction_id": result["reference"],
            "ledger_transaction_id": result["transaction_id"],
            "amount": request.amount,
            "splits": result["splits"],
            "cashback_amount": round(result["splits"]["client_cashback"], 2),
            "merchant_receives": round(result["splits"]["merchant_receives"], 2),
            "sdm_commission": round(result["splits"]["sdm_commission"], 2),
            "available_date": result["available_date"],
            "user_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or "SDM User"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@sdm_router.get("/merchant/transactions")
async def get_merchant_transactions(merchant: dict = Depends(get_current_merchant), limit: int = 100):
    """Get merchant transaction history"""
    transactions = await db.sdm_transactions.find(
        {"merchant_id": merchant["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return transactions

@sdm_router.get("/merchant/report")
async def get_merchant_report(merchant: dict = Depends(get_current_merchant), days: int = 30):
    """Get merchant report/analytics"""
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Get transactions in period
    transactions = await db.sdm_transactions.find(
        {"merchant_id": merchant["id"], "created_at": {"$gte": start_date}},
        {"_id": 0}
    ).to_list(1000)
    
    total_amount = sum(t["amount"] for t in transactions)
    total_cashback = sum(t["net_cashback"] for t in transactions)
    transaction_count = len(transactions)
    
    # Daily breakdown
    daily_stats = {}
    for t in transactions:
        date = t["created_at"][:10]
        if date not in daily_stats:
            daily_stats[date] = {"amount": 0, "cashback": 0, "count": 0}
        daily_stats[date]["amount"] += t["amount"]
        daily_stats[date]["cashback"] += t["net_cashback"]
        daily_stats[date]["count"] += 1
    
    return {
        "period_days": days,
        "total_transactions": transaction_count,
        "total_amount": round(total_amount, 2),
        "total_cashback": round(total_cashback, 2),
        "average_transaction": round(total_amount / transaction_count, 2) if transaction_count > 0 else 0,
        "daily_breakdown": [{"date": k, **v} for k, v in sorted(daily_stats.items())]
    }

# ============== MERCHANT MEMBERSHIP CARD TYPES ==============

@sdm_router.post("/merchant/card-types")
async def create_card_type(request: CreateCardTypeRequest, merchant: dict = Depends(get_current_merchant)):
    """Create a membership card type for this merchant"""
    card_type = MerchantMembershipCardType(
        merchant_id=merchant["id"],
        merchant_name=merchant["business_name"],
        name=request.name,
        description=request.description,
        price=request.price,
        validity_days=request.validity_days,
        cashback_bonus=request.cashback_bonus,
        referral_bonus=request.referral_bonus,
        welcome_bonus=request.welcome_bonus
    )
    await db.merchant_card_types.insert_one(card_type.model_dump())
    return {"message": "Card type created", "card_type": card_type.model_dump()}

@sdm_router.get("/merchant/card-types")
async def get_merchant_card_types(merchant: dict = Depends(get_current_merchant)):
    """Get all card types for this merchant"""
    card_types = await db.merchant_card_types.find(
        {"merchant_id": merchant["id"], "is_active": True},
        {"_id": 0}
    ).to_list(100)
    return card_types

@sdm_router.put("/merchant/card-types/{card_type_id}")
async def update_card_type(
    card_type_id: str,
    request: CreateCardTypeRequest,
    merchant: dict = Depends(get_current_merchant)
):
    """Update a card type"""
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    result = await db.merchant_card_types.update_one(
        {"id": card_type_id, "merchant_id": merchant["id"]},
        {"$set": updates}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Card type not found")
    return {"message": "Card type updated"}

@sdm_router.delete("/merchant/card-types/{card_type_id}")
async def delete_card_type(card_type_id: str, merchant: dict = Depends(get_current_merchant)):
    """Deactivate a card type (soft delete)"""
    result = await db.merchant_card_types.update_one(
        {"id": card_type_id, "merchant_id": merchant["id"]},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Card type not found")
    return {"message": "Card type deactivated"}

@sdm_router.get("/merchant/memberships")
async def get_merchant_memberships(merchant: dict = Depends(get_current_merchant)):
    """Get all active memberships for this merchant"""
    memberships = await db.membership_cards.find(
        {"merchant_id": merchant["id"], "status": "active"},
        {"_id": 0}
    ).sort("purchased_at", -1).to_list(500)
    return memberships

# ============== USER MEMBERSHIP ENDPOINTS ==============

@sdm_router.get("/user/available-cards")
async def get_available_cards(user: dict = Depends(get_current_user)):
    """Get all available membership cards from all merchants"""
    # Get all active card types from verified merchants
    pipeline = [
        {"$match": {"is_active": True}},
        {"$lookup": {
            "from": "sdm_merchants",
            "localField": "merchant_id",
            "foreignField": "id",
            "as": "merchant"
        }},
        {"$unwind": "$merchant"},
        {"$match": {"merchant.is_verified": True, "merchant.is_active": True}},
        {"$project": {
            "_id": 0,
            "id": 1,
            "merchant_id": 1,
            "merchant_name": 1,
            "name": 1,
            "description": 1,
            "price": 1,
            "validity_days": 1,
            "cashback_bonus": 1,
            "referral_bonus": 1,
            "welcome_bonus": 1,
            "merchant_type": "$merchant.business_type",
            "merchant_city": "$merchant.city"
        }}
    ]
    card_types = await db.merchant_card_types.aggregate(pipeline).to_list(100)
    return card_types

@sdm_router.get("/user/memberships")
async def get_user_memberships(user: dict = Depends(get_current_user)):
    """Get all user's membership cards"""
    memberships = await db.membership_cards.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("purchased_at", -1).to_list(100)
    
    # Check and update expired cards
    now = datetime.now(timezone.utc)
    active_memberships = []
    for card in memberships:
        if card["status"] == "active" and card.get("expires_at"):
            expires = datetime.fromisoformat(card["expires_at"].replace("Z", "+00:00"))
            if expires < now:
                await db.membership_cards.update_one(
                    {"id": card["id"]},
                    {"$set": {"status": "expired"}}
                )
                card["status"] = "expired"
        active_memberships.append(card)
    
    return active_memberships

@sdm_router.post("/user/purchase-membership")
async def purchase_membership(request: PurchaseMembershipRequest, user: dict = Depends(get_current_user)):
    """Purchase a membership card from a merchant"""
    config = await get_sdm_config()
    
    # Get the card type
    card_type = await db.merchant_card_types.find_one(
        {"id": request.card_type_id, "is_active": True},
        {"_id": 0}
    )
    if not card_type:
        raise HTTPException(status_code=404, detail="Card type not found")
    
    # Check if user already has active membership for this merchant
    existing = await db.membership_cards.find_one({
        "user_id": user["id"],
        "merchant_id": card_type["merchant_id"],
        "status": "active"
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active membership with this merchant")
    
    # Process payment
    if request.payment_method == "wallet":
        if user["wallet_available"] < card_type["price"]:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        
        # Deduct from wallet
        await db.sdm_users.update_one(
            {"id": user["id"]},
            {"$inc": {"wallet_available": -card_type["price"]}}
        )
    elif request.payment_method == "mobile_money":
        # For now, simulate mobile money payment (to be integrated with Hubtel later)
        pass
    
    # Create membership card
    expires_at = (datetime.now(timezone.utc) + timedelta(days=card_type["validity_days"])).isoformat()
    
    membership = MembershipCard(
        user_id=user["id"],
        user_phone=user["phone"],
        merchant_id=card_type["merchant_id"],
        merchant_name=card_type["merchant_name"],
        card_type_id=card_type["id"],
        card_type_name=card_type["name"],
        price_paid=card_type["price"],
        payment_method=request.payment_method,
        expires_at=expires_at
    )
    await db.membership_cards.insert_one(membership.model_dump())
    
    # Update user membership status
    await db.sdm_users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "has_membership": True,
                "membership_card_id": membership.id,
                "membership_expires": expires_at
            }
        }
    )
    
    # Give welcome bonus to new member
    if card_type.get("welcome_bonus", 0) > 0:
        await db.sdm_users.update_one(
            {"id": user["id"]},
            {
                "$inc": {
                    "wallet_available": card_type["welcome_bonus"],
                    "total_earned": card_type["welcome_bonus"]
                }
            }
        )
        
        # Record welcome bonus
        welcome_bonus_record = ReferralBonus(
            referrer_id=card_type["merchant_id"],
            referred_id=user["id"],
            referred_phone=user["phone"],
            bonus_type="membership_welcome_bonus",
            amount=card_type["welcome_bonus"]
        )
        await db.referral_bonuses.insert_one(welcome_bonus_record.model_dump())
    
    # Process referrer bonus if applicable
    if user.get("referred_by") and not membership.referrer_bonus_paid:
        referrer = await db.sdm_users.find_one({"id": user["referred_by"]}, {"_id": 0})
        if referrer:
            # Check if referrer needs membership (based on config)
            can_receive_bonus = True
            if config.get("require_membership_for_referral", False):
                can_receive_bonus = referrer.get("has_membership", False)
            
            if can_receive_bonus:
                # Get referrer's level bonus
                level = referrer.get("referral_level", "bronze")
                bonus_key = f"referral_bonus_{level}"
                referral_bonus = card_type.get("referral_bonus", config.get(bonus_key, 5.0))
                
                # Credit referrer
                await db.sdm_users.update_one(
                    {"id": referrer["id"]},
                    {
                        "$inc": {
                            "wallet_available": referral_bonus,
                            "total_earned": referral_bonus,
                            "referral_bonus_earned": referral_bonus,
                            "referral_count": 1
                        }
                    }
                )
                
                # Record referrer bonus
                referrer_bonus_record = ReferralBonus(
                    referrer_id=referrer["id"],
                    referred_id=user["id"],
                    referred_phone=user["phone"],
                    bonus_type="membership_referral_bonus",
                    amount=referral_bonus
                )
                await db.referral_bonuses.insert_one(referrer_bonus_record.model_dump())
                
                # Mark bonus as paid
                await db.membership_cards.update_one(
                    {"id": membership.id},
                    {"$set": {"referrer_bonus_paid": True}}
                )
                
                # Update referrer level if needed
                await update_referral_level(referrer["id"])
    
    return {
        "message": "Membership purchased successfully",
        "membership": membership.model_dump(),
        "welcome_bonus": card_type.get("welcome_bonus", 0)
    }

async def update_referral_level(user_id: str):
    """Update user's referral level based on referral count"""
    config = await get_sdm_config()
    user = await db.sdm_users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return
    
    referral_count = user.get("referral_count", 0)
    new_level = "bronze"
    
    if referral_count >= config.get("gold_min_referrals", 15):
        new_level = "gold"
    elif referral_count >= config.get("silver_min_referrals", 5):
        new_level = "silver"
    
    if user.get("referral_level") != new_level:
        await db.sdm_users.update_one(
            {"id": user_id},
            {"$set": {"referral_level": new_level}}
        )

# ============== SDM ADMIN ROUTES ==============

@sdm_router.get("/admin/config")
async def admin_get_sdm_config(admin: dict = Depends(get_current_admin)):
    """Admin: Get SDM platform configuration"""
    config = await get_sdm_config()
    return config

@sdm_router.put("/admin/config")
async def admin_update_sdm_config(request: UpdateSDMConfigRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Update SDM platform configuration"""
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    if updates:
        await update_sdm_config(updates)
    return {"message": "Configuration updated", "updates": updates}

@sdm_router.get("/admin/users")
async def admin_get_users(admin: dict = Depends(get_current_admin), limit: int = 100):
    """Admin: Get all SDM users"""
    users = await db.sdm_users.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return users

@sdm_router.get("/admin/merchants")
async def admin_get_merchants(admin: dict = Depends(get_current_admin), limit: int = 100):
    """Admin: Get all merchants"""
    merchants = await db.sdm_merchants.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return merchants

@sdm_router.put("/admin/merchants/{merchant_id}/verify")
async def admin_verify_merchant(merchant_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Verify merchant"""
    result = await db.sdm_merchants.update_one(
        {"id": merchant_id},
        {"$set": {"is_verified": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return {"message": "Merchant verified"}

@sdm_router.get("/admin/transactions")
async def admin_get_transactions(admin: dict = Depends(get_current_admin), limit: int = 100):
    """Admin: Get all transactions"""
    transactions = await db.sdm_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return transactions

@sdm_router.get("/admin/withdrawals")
async def admin_get_withdrawals(admin: dict = Depends(get_current_admin), status: Optional[str] = None):
    """Admin: Get withdrawal requests"""
    query = {} if not status else {"status": status}
    withdrawals = await db.sdm_withdrawals.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return withdrawals

@sdm_router.put("/admin/withdrawals/{withdrawal_id}/process")
async def admin_process_withdrawal(withdrawal_id: str, status: str, reference: Optional[str] = None, admin: dict = Depends(get_current_admin)):
    """Admin: Process withdrawal (manual)"""
    if status not in ["processing", "completed", "failed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    updates = {"status": status}
    if status == "completed":
        updates["processed_at"] = datetime.now(timezone.utc).isoformat()
        if reference:
            updates["reference"] = reference
    
    result = await db.sdm_withdrawals.update_one({"id": withdrawal_id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    # If failed, refund user
    if status == "failed":
        withdrawal = await db.sdm_withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
        await db.sdm_users.update_one(
            {"id": withdrawal["user_id"]},
            {"$inc": {"wallet_available": withdrawal["amount"]}}
        )
    elif status == "completed":
        withdrawal = await db.sdm_withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
        await db.sdm_users.update_one(
            {"id": withdrawal["user_id"]},
            {"$inc": {"total_withdrawn": withdrawal["net_amount"]}}
        )
    
    return {"message": f"Withdrawal {status}"}

@sdm_router.get("/admin/sdm-stats")
async def admin_get_sdm_stats(admin: dict = Depends(get_current_admin)):
    """Admin: Get SDM platform statistics"""
    total_users = await db.sdm_users.count_documents({})
    total_merchants = await db.sdm_merchants.count_documents({})
    verified_merchants = await db.sdm_merchants.count_documents({"is_verified": True})
    total_transactions = await db.sdm_transactions.count_documents({})
    
    # Membership stats
    total_memberships = await db.membership_cards.count_documents({})
    active_memberships = await db.membership_cards.count_documents({"status": "active"})
    total_card_types = await db.merchant_card_types.count_documents({"is_active": True})
    
    # Total cashback given
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$net_cashback"}}}]
    cashback_result = await db.sdm_transactions.aggregate(pipeline).to_list(1)
    total_cashback = cashback_result[0]["total"] if cashback_result else 0
    
    # Total commission earned
    commission_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$sdm_commission"}}}]
    commission_result = await db.sdm_transactions.aggregate(commission_pipeline).to_list(1)
    total_commission = commission_result[0]["total"] if commission_result else 0
    
    # Total membership revenue
    membership_pipeline = [{"$match": {"status": {"$ne": "cancelled"}}}, {"$group": {"_id": None, "total": {"$sum": "$price_paid"}}}]
    membership_revenue_result = await db.membership_cards.aggregate(membership_pipeline).to_list(1)
    total_membership_revenue = membership_revenue_result[0]["total"] if membership_revenue_result else 0
    
    # Total referral bonuses paid
    referral_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    referral_result = await db.referral_bonuses.aggregate(referral_pipeline).to_list(1)
    total_referral_bonuses = referral_result[0]["total"] if referral_result else 0
    
    # Pending withdrawals
    pending_withdrawals = await db.sdm_withdrawals.count_documents({"status": "pending"})
    
    # Users by referral level
    level_stats = await db.sdm_users.aggregate([
        {"$group": {"_id": "$referral_level", "count": {"$sum": 1}}}
    ]).to_list(10)
    
    return {
        "total_users": total_users,
        "total_merchants": total_merchants,
        "verified_merchants": verified_merchants,
        "total_transactions": total_transactions,
        "total_memberships": total_memberships,
        "active_memberships": active_memberships,
        "total_card_types": total_card_types,
        "total_cashback_given": round(total_cashback, 2),
        "total_commission_earned": round(total_commission, 2),
        "total_membership_revenue": round(total_membership_revenue, 2),
        "total_referral_bonuses": round(total_referral_bonuses, 2),
        "pending_withdrawals": pending_withdrawals,
        "users_by_level": {level["_id"]: level["count"] for level in level_stats if level["_id"]}
    }

@sdm_router.get("/admin/memberships")
async def admin_get_memberships(admin: dict = Depends(get_current_admin), status: Optional[str] = None, limit: int = 100):
    """Admin: Get all membership cards"""
    query = {} if not status else {"status": status}
    memberships = await db.membership_cards.find(query, {"_id": 0}).sort("purchased_at", -1).to_list(limit)
    return memberships

@sdm_router.get("/admin/card-types")
async def admin_get_all_card_types(admin: dict = Depends(get_current_admin)):
    """Admin: Get all card types from all merchants"""
    card_types = await db.merchant_card_types.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return card_types

# ============== EXTERNAL API (For merchant website integration) ==============

@sdm_router.post("/external/transaction")
async def external_create_transaction(
    request: Request,
    user_phone: str,
    amount: float,
    reference: Optional[str] = None
):
    """External API: Create transaction from merchant website"""
    # Authenticate via API key in header
    api_key = request.headers.get("X-API-Key")
    api_secret = request.headers.get("X-API-Secret")
    
    if not api_key or not api_secret:
        raise HTTPException(status_code=401, detail="Missing API credentials")
    
    merchant = await db.sdm_merchants.find_one(
        {"api_key": api_key, "api_secret": api_secret, "is_active": True},
        {"_id": 0}
    )
    if not merchant:
        raise HTTPException(status_code=401, detail="Invalid API credentials")
    
    # Find user by phone
    phone = normalize_phone(user_phone)
    user = await db.sdm_users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate cashback
    cashback_amount = amount * merchant["cashback_rate"]
    sdm_commission = cashback_amount * SDM_COMMISSION_RATE
    net_cashback = cashback_amount - sdm_commission
    available_date = (datetime.now(timezone.utc) + timedelta(days=CASHBACK_PENDING_DAYS)).isoformat()
    
    # Create transaction
    transaction = SDMTransaction(
        user_id=user["id"],
        merchant_id=merchant["id"],
        merchant_name=merchant["business_name"],
        amount=amount,
        cashback_rate=merchant["cashback_rate"],
        cashback_amount=cashback_amount,
        sdm_commission=sdm_commission,
        net_cashback=net_cashback,
        available_date=available_date,
        notes=reference
    )
    await db.sdm_transactions.insert_one(transaction.model_dump())
    
    # Update user wallet
    await db.sdm_users.update_one(
        {"id": user["id"]},
        {"$inc": {"wallet_pending": net_cashback, "total_earned": net_cashback}}
    )
    
    # Update merchant stats
    await db.sdm_merchants.update_one(
        {"id": merchant["id"]},
        {"$inc": {"total_transactions": 1, "total_cashback_given": net_cashback}}
    )
    
    return {
        "success": True,
        "transaction_id": transaction.transaction_id,
        "cashback_amount": round(net_cashback, 2),
        "available_date": available_date
    }

@sdm_router.get("/external/user/{phone}")
async def external_get_user(phone: str, request: Request):
    """External API: Check if user exists"""
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing API key")
    
    merchant = await db.sdm_merchants.find_one({"api_key": api_key, "is_active": True}, {"_id": 0})
    if not merchant:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    phone = normalize_phone(phone)
    user = await db.sdm_users.find_one({"phone": phone}, {"_id": 0, "id": 1, "first_name": 1, "last_name": 1})
    
    if not user:
        return {"exists": False}
    
    return {
        "exists": True,
        "user_id": user["id"],
        "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or "SDM User"
    }


# ============== FINTECH LEDGER API ==============

class CreateDepositRequest(BaseModel):
    amount: float
    deposit_method: str  # MOBILE_MONEY, BANK_TRANSFER, CASH
    provider: Optional[str] = None
    provider_reference: Optional[str] = None
    notes: Optional[str] = None

class ApproveWithdrawalRequest(BaseModel):
    admin_notes: Optional[str] = None

class RejectWithdrawalRequest(BaseModel):
    rejection_reason: str

class CreateWithdrawalRequest(BaseModel):
    amount: float
    provider: str  # MTN, VODAFONE, AIRTELTIGO
    phone_number: str
    account_name: Optional[str] = None

# ----- Admin Fintech Endpoints -----

@sdm_router.get("/admin/fintech/summary")
async def admin_get_fintech_summary(admin: dict = Depends(get_current_admin)):
    """Admin: Get complete financial summary of the platform"""
    summary = await ledger_service.get_financial_summary()
    return summary

@sdm_router.get("/admin/fintech/wallets")
async def admin_get_all_wallets(
    admin: dict = Depends(get_current_admin),
    entity_type: Optional[str] = None,
    limit: int = 100
):
    """Admin: Get all wallets with balances"""
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    
    wallets = await db.wallets.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return wallets

@sdm_router.get("/admin/fintech/transactions")
async def admin_get_ledger_transactions(
    admin: dict = Depends(get_current_admin),
    transaction_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100
):
    """Admin: Get ledger transactions"""
    query = {}
    if transaction_type:
        query["transaction_type"] = transaction_type
    if status:
        query["status"] = status
    
    transactions = await db.ledger_transactions.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return transactions

@sdm_router.get("/admin/fintech/withdrawals")
async def admin_get_withdrawals(
    admin: dict = Depends(get_current_admin),
    status: Optional[str] = None,
    limit: int = 100
):
    """Admin: Get withdrawal requests"""
    query = {}
    if status:
        query["status"] = status
    
    withdrawals = await db.withdrawal_requests.find(query, {"_id": 0}).sort("requested_at", -1).limit(limit).to_list(limit)
    return withdrawals

@sdm_router.post("/admin/fintech/withdrawals/{withdrawal_id}/approve")
async def admin_approve_withdrawal(
    withdrawal_id: str,
    request: ApproveWithdrawalRequest,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Approve a withdrawal request with float balance verification"""
    try:
        # Use the new method with float check
        result = await ledger_service.approve_withdrawal_with_float_check(
            withdrawal_id,
            approved_by=admin["username"],
            admin_notes=request.admin_notes
        )
        return {
            "message": "Withdrawal approved",
            "withdrawal_id": result["withdrawal_id"],
            "status": result["status"],
            "amount": result["amount"],
            "net_amount": result["net_amount"],
            "float_reserved": result["float_reserved"],
            "float_balance_remaining": result["float_balance_remaining"]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@sdm_router.post("/admin/fintech/withdrawals/{withdrawal_id}/reject")
async def admin_reject_withdrawal(
    withdrawal_id: str,
    request: RejectWithdrawalRequest,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Reject a withdrawal request"""
    try:
        withdrawal = await ledger_service.reject_withdrawal(
            withdrawal_id,
            rejected_by=admin["username"],
            rejection_reason=request.rejection_reason
        )
        return {"message": "Withdrawal rejected", "withdrawal": withdrawal.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@sdm_router.post("/admin/fintech/withdrawals/{withdrawal_id}/complete")
async def admin_complete_withdrawal(
    withdrawal_id: str,
    provider_reference: str,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Mark withdrawal as paid (after Mobile Money confirmation)"""
    try:
        result = await ledger_service.complete_withdrawal_with_momo(
            withdrawal_id,
            provider_reference=provider_reference
        )
        return {
            "message": "Withdrawal completed and paid via Mobile Money",
            "withdrawal_id": result["withdrawal_id"],
            "transaction_id": result["transaction_id"],
            "reference": result["reference"],
            "status": result["status"],
            "amount": result["amount"],
            "fee": result["fee"],
            "net_amount": result["net_amount"],
            "provider": result["provider"],
            "provider_reference": result["provider_reference"]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@sdm_router.get("/admin/fintech/deposits")
async def admin_get_deposits(
    admin: dict = Depends(get_current_admin),
    status: Optional[str] = None,
    limit: int = 100
):
    """Admin: Get merchant deposits"""
    query = {}
    if status:
        query["status"] = status
    
    deposits = await db.merchant_deposits.find(query, {"_id": 0}).sort("requested_at", -1).limit(limit).to_list(limit)
    return deposits

@sdm_router.post("/admin/fintech/deposits/{deposit_id}/confirm")
async def admin_confirm_deposit(
    deposit_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Confirm a merchant deposit"""
    try:
        result = await ledger_service.confirm_merchant_deposit(
            deposit_id,
            confirmed_by=admin["username"]
        )
        return {"message": "Deposit confirmed", **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@sdm_router.get("/admin/fintech/audit-logs")
async def admin_get_audit_logs(
    admin: dict = Depends(get_current_admin),
    action: Optional[str] = None,
    limit: int = 100
):
    """Admin: Get audit logs"""
    query = {}
    if action:
        query["action"] = action
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("performed_at", -1).limit(limit).to_list(limit)
    return logs

@sdm_router.post("/admin/fintech/process-pending")
async def admin_process_pending_cashback(admin: dict = Depends(get_current_admin)):
    """Admin: Process pending cashback to available (manual trigger)"""
    result = await ledger_service.process_pending_to_available()
    return {"message": "Pending cashback processed", **result}

# ----- Merchant Fintech Endpoints -----

@sdm_router.get("/merchant/fintech/wallet")
async def merchant_get_wallet(merchant: dict = Depends(get_current_merchant)):
    """Merchant: Get wallet details"""
    wallet = await ledger_service.get_or_create_wallet(
        EntityType.MERCHANT,
        merchant["id"],
        merchant.get("business_name")
    )
    return wallet.model_dump()

@sdm_router.post("/merchant/fintech/deposit")
async def merchant_create_deposit(
    request: CreateDepositRequest,
    merchant: dict = Depends(get_current_merchant)
):
    """Merchant: Request a deposit (pre-funding)"""
    try:
        # Ensure wallet exists
        await ledger_service.get_or_create_wallet(
            EntityType.MERCHANT,
            merchant["id"],
            merchant.get("business_name")
        )
        
        deposit = await ledger_service.create_merchant_deposit(
            merchant_id=merchant["id"],
            amount=request.amount,
            deposit_method=request.deposit_method,
            provider=request.provider,
            provider_reference=request.provider_reference,
            notes=request.notes,
            created_by=merchant["id"]
        )
        return {"message": "Deposit request created", "deposit": deposit.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@sdm_router.get("/merchant/fintech/deposits")
async def merchant_get_deposits(merchant: dict = Depends(get_current_merchant)):
    """Merchant: Get deposit history"""
    deposits = await db.merchant_deposits.find(
        {"merchant_id": merchant["id"]},
        {"_id": 0}
    ).sort("requested_at", -1).to_list(100)
    return deposits

@sdm_router.post("/merchant/fintech/withdraw")
async def merchant_create_withdrawal(
    request: CreateWithdrawalRequest,
    merchant: dict = Depends(get_current_merchant)
):
    """Merchant: Request a withdrawal"""
    try:
        withdrawal = await ledger_service.create_withdrawal_request(
            entity_type=EntityType.MERCHANT,
            entity_id=merchant["id"],
            amount=request.amount,
            provider=request.provider,
            phone_number=request.phone_number,
            account_name=request.account_name
        )
        return {"message": "Withdrawal request created", "withdrawal": withdrawal.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@sdm_router.get("/merchant/fintech/withdrawals")
async def merchant_get_withdrawals(merchant: dict = Depends(get_current_merchant)):
    """Merchant: Get withdrawal history"""
    withdrawals = await db.withdrawal_requests.find(
        {"entity_id": merchant["id"], "entity_type": EntityType.MERCHANT.value},
        {"_id": 0}
    ).sort("requested_at", -1).to_list(100)
    return withdrawals

@sdm_router.get("/merchant/fintech/ledger")
async def merchant_get_ledger(merchant: dict = Depends(get_current_merchant), limit: int = 50):
    """Merchant: Get ledger entries"""
    wallet = await ledger_service.get_wallet_by_entity(EntityType.MERCHANT, merchant["id"])
    if not wallet:
        return []
    
    entries = await db.ledger_entries.find(
        {"wallet_id": wallet.id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return entries

# ----- Client Fintech Endpoints -----

@sdm_router.get("/user/fintech/wallet")
async def user_get_wallet(user: dict = Depends(get_current_user)):
    """User: Get wallet details from ledger"""
    wallet = await ledger_service.get_or_create_wallet(
        EntityType.CLIENT,
        user["id"],
        f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    )
    return wallet.model_dump()

@sdm_router.post("/user/fintech/withdraw")
async def user_create_withdrawal(
    request: CreateWithdrawalRequest,
    user: dict = Depends(get_current_user)
):
    """User: Request a withdrawal"""
    try:
        withdrawal = await ledger_service.create_withdrawal_request(
            entity_type=EntityType.CLIENT,
            entity_id=user["id"],
            amount=request.amount,
            provider=request.provider,
            phone_number=request.phone_number,
            account_name=request.account_name
        )
        return {"message": "Withdrawal request created", "withdrawal": withdrawal.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@sdm_router.get("/user/fintech/withdrawals")
async def user_get_withdrawals(user: dict = Depends(get_current_user)):
    """User: Get withdrawal history"""
    withdrawals = await db.withdrawal_requests.find(
        {"entity_id": user["id"], "entity_type": EntityType.CLIENT.value},
        {"_id": 0}
    ).sort("requested_at", -1).to_list(100)
    return withdrawals

@sdm_router.get("/user/fintech/ledger")
async def user_get_ledger(user: dict = Depends(get_current_user), limit: int = 50):
    """User: Get ledger entries"""
    wallet = await ledger_service.get_wallet_by_entity(EntityType.CLIENT, user["id"])
    if not wallet:
        return []
    
    entries = await db.ledger_entries.find(
        {"wallet_id": wallet.id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return entries


# ============== ADMIN DATA MANAGEMENT ==============

@sdm_router.post("/admin/fintech/purge-test-data")
async def admin_purge_test_data(admin: dict = Depends(get_current_admin), confirm: bool = False):
    """Admin: Purge all test data (USE WITH CAUTION)"""
    if not confirm:
        return {
            "warning": "This will DELETE all fintech data. Set confirm=true to proceed.",
            "affected_collections": ["wallets", "ledger_entries", "ledger_transactions", 
                                     "withdrawal_requests", "merchant_deposits", "audit_logs"]
        }
    
    # Delete all fintech data
    results = {
        "wallets_deleted": (await db.wallets.delete_many({})).deleted_count,
        "ledger_entries_deleted": (await db.ledger_entries.delete_many({})).deleted_count,
        "ledger_transactions_deleted": (await db.ledger_transactions.delete_many({})).deleted_count,
        "withdrawal_requests_deleted": (await db.withdrawal_requests.delete_many({})).deleted_count,
        "merchant_deposits_deleted": (await db.merchant_deposits.delete_many({})).deleted_count,
        "audit_logs_deleted": (await db.audit_logs.delete_many({})).deleted_count
    }
    
    return {"message": "Test data purged successfully", "results": results}


# ============== EXPORT ENDPOINTS ==============

@sdm_router.get("/admin/fintech/export/transactions")
async def admin_export_transactions(
    admin: dict = Depends(get_current_admin),
    format: str = "json",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Admin: Export ledger transactions (JSON or CSV format)"""
    query = {}
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        query.setdefault("created_at", {})["$lte"] = end_date
    
    transactions = await db.ledger_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    
    if format == "csv":
        import csv
        import io
        output = io.StringIO()
        if transactions:
            writer = csv.DictWriter(output, fieldnames=transactions[0].keys())
            writer.writeheader()
            writer.writerows(transactions)
        return {
            "format": "csv",
            "data": output.getvalue(),
            "count": len(transactions)
        }
    
    return {"format": "json", "data": transactions, "count": len(transactions)}

@sdm_router.get("/admin/fintech/export/audit-logs")
async def admin_export_audit_logs(
    admin: dict = Depends(get_current_admin),
    format: str = "json",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Admin: Export audit logs (JSON or CSV format)"""
    query = {}
    if start_date:
        query["performed_at"] = {"$gte": start_date}
    if end_date:
        query.setdefault("performed_at", {})["$lte"] = end_date
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("performed_at", -1).to_list(10000)
    
    if format == "csv":
        import csv
        import io
        output = io.StringIO()
        if logs:
            # Flatten nested dicts for CSV
            flat_logs = []
            for log in logs:
                flat_log = {**log}
                flat_log["old_values"] = str(log.get("old_values", ""))
                flat_log["new_values"] = str(log.get("new_values", ""))
                flat_logs.append(flat_log)
            writer = csv.DictWriter(output, fieldnames=flat_logs[0].keys())
            writer.writeheader()
            writer.writerows(flat_logs)
        return {
            "format": "csv",
            "data": output.getvalue(),
            "count": len(logs)
        }
    
    return {"format": "json", "data": logs, "count": len(logs)}


# ============== INVESTOR DASHBOARD / GMV STATS ==============

@sdm_router.get("/admin/fintech/investor-dashboard")
async def admin_get_investor_dashboard(
    admin: dict = Depends(get_current_admin),
    period_days: int = 30
):
    """Admin: Get investor-grade dashboard with GMV, commissions, growth metrics"""
    
    now = datetime.now(timezone.utc)
    period_start = (now - timedelta(days=period_days)).isoformat()
    prev_period_start = (now - timedelta(days=period_days * 2)).isoformat()
    
    # Current period transactions
    current_txns = await db.sdm_transactions.find(
        {"created_at": {"$gte": period_start}},
        {"_id": 0}
    ).to_list(10000)
    
    # Previous period transactions (for growth comparison)
    prev_txns = await db.sdm_transactions.find(
        {"created_at": {"$gte": prev_period_start, "$lt": period_start}},
        {"_id": 0}
    ).to_list(10000)
    
    # Calculate current period metrics
    current_gmv = sum(t.get("amount", 0) for t in current_txns)
    current_cashback = sum(t.get("net_cashback", 0) for t in current_txns)
    current_commission = sum(t.get("sdm_commission", 0) for t in current_txns)
    current_txn_count = len(current_txns)
    
    # Calculate previous period metrics
    prev_gmv = sum(t.get("amount", 0) for t in prev_txns)
    prev_commission = sum(t.get("sdm_commission", 0) for t in prev_txns)
    prev_txn_count = len(prev_txns)
    
    # Growth rates
    def calc_growth(current, previous):
        if previous == 0:
            return 100 if current > 0 else 0
        return round(((current - previous) / previous) * 100, 1)
    
    # Total users and merchants
    total_users = await db.sdm_users.count_documents({})
    total_merchants = await db.sdm_merchants.count_documents({})
    active_merchants = await db.sdm_merchants.count_documents({"is_verified": True, "is_active": True})
    
    # Membership stats
    total_memberships = await db.membership_cards.count_documents({})
    active_memberships = await db.membership_cards.count_documents({"status": "active"})
    membership_revenue = 0
    membership_pipeline = [{"$match": {"status": {"$ne": "cancelled"}}}, {"$group": {"_id": None, "total": {"$sum": "$price_paid"}}}]
    membership_result = await db.membership_cards.aggregate(membership_pipeline).to_list(1)
    if membership_result:
        membership_revenue = membership_result[0].get("total", 0)
    
    # Wallet balances
    wallet_pipeline = [
        {"$group": {
            "_id": "$entity_type",
            "total_available": {"$sum": "$available_balance"},
            "total_pending": {"$sum": "$pending_balance"},
            "count": {"$sum": 1}
        }}
    ]
    wallet_stats = await db.wallets.aggregate(wallet_pipeline).to_list(10)
    wallet_by_type = {w["_id"]: w for w in wallet_stats}
    
    # Withdrawals stats
    withdrawal_pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total": {"$sum": "$amount"}
        }}
    ]
    withdrawal_stats = await db.withdrawal_requests.aggregate(withdrawal_pipeline).to_list(10)
    
    # Deposit stats
    deposit_pipeline = [
        {"$match": {"status": "CONFIRMED"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    deposit_result = await db.merchant_deposits.aggregate(deposit_pipeline).to_list(1)
    total_deposits = deposit_result[0] if deposit_result else {"total": 0, "count": 0}
    
    # Daily breakdown for charts
    daily_stats = {}
    for txn in current_txns:
        date = txn["created_at"][:10]
        if date not in daily_stats:
            daily_stats[date] = {"gmv": 0, "commission": 0, "cashback": 0, "count": 0}
        daily_stats[date]["gmv"] += txn.get("amount", 0)
        daily_stats[date]["commission"] += txn.get("sdm_commission", 0)
        daily_stats[date]["cashback"] += txn.get("net_cashback", 0)
        daily_stats[date]["count"] += 1
    
    return {
        "period_days": period_days,
        "generated_at": now.isoformat(),
        
        # Key Metrics
        "gmv": {
            "current": round(current_gmv, 2),
            "previous": round(prev_gmv, 2),
            "growth_percent": calc_growth(current_gmv, prev_gmv)
        },
        "commission_earned": {
            "current": round(current_commission, 2),
            "previous": round(prev_commission, 2),
            "growth_percent": calc_growth(current_commission, prev_commission)
        },
        "total_cashback_given": round(current_cashback, 2),
        "transaction_count": {
            "current": current_txn_count,
            "previous": prev_txn_count,
            "growth_percent": calc_growth(current_txn_count, prev_txn_count)
        },
        "average_transaction": round(current_gmv / current_txn_count, 2) if current_txn_count > 0 else 0,
        
        # Users & Merchants
        "total_users": total_users,
        "total_merchants": total_merchants,
        "active_merchants": active_merchants,
        
        # Memberships
        "memberships": {
            "total": total_memberships,
            "active": active_memberships,
            "revenue": round(membership_revenue, 2)
        },
        
        # Wallets
        "wallets": {
            "client": wallet_by_type.get("CLIENT", {"total_available": 0, "total_pending": 0, "count": 0}),
            "merchant": wallet_by_type.get("MERCHANT", {"total_available": 0, "count": 0}),
            "sdm_commission": wallet_by_type.get("SDM_COMMISSION", {"total_available": 0}),
            "sdm_float": wallet_by_type.get("SDM_FLOAT", {"total_available": 0})
        },
        
        # Deposits & Withdrawals
        "deposits": {
            "total_amount": round(total_deposits.get("total", 0), 2),
            "count": total_deposits.get("count", 0)
        },
        "withdrawals_by_status": {w["_id"]: {"count": w["count"], "total": round(w["total"], 2)} for w in withdrawal_stats},
        
        # Daily breakdown for charts
        "daily_breakdown": [{"date": k, **{kk: round(vv, 2) if isinstance(vv, float) else vv for kk, vv in v.items()}} 
                          for k, v in sorted(daily_stats.items())]
    }


# ============== FLOAT MANAGEMENT ==============

class TopUpFloatRequest(BaseModel):
    amount: float
    source: str = "BANK_TRANSFER"
    reference: Optional[str] = None
    notes: Optional[str] = None

@sdm_router.post("/admin/fintech/float/topup")
async def admin_topup_float(
    request: TopUpFloatRequest,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Top up SDM Float wallet (for Mobile Money payouts)"""
    float_wallet = await ledger_service.get_sdm_float_wallet()
    
    # Create transaction
    reference = ledger_service.generate_reference("FLT")
    balance_before = float_wallet.available_balance
    
    # Credit float wallet
    float_wallet = await ledger_service.update_wallet_balance(
        float_wallet.id,
        available_delta=request.amount
    )
    
    # Create ledger transaction
    transaction = LedgerTransaction(
        reference_id=reference,
        transaction_type=TransactionType.DEPOSIT,
        status=TransactionStatus.COMPLETED,
        destination_wallet_id=float_wallet.id,
        amount=request.amount,
        fee_amount=0,
        net_amount=request.amount,
        metadata={
            "source": request.source,
            "external_reference": request.reference,
            "notes": request.notes,
            "topped_up_by": admin["username"]
        },
        created_by=admin["username"],
        completed_at=datetime.now(timezone.utc).isoformat()
    )
    
    # Create ledger entry
    entry = LedgerEntry(
        transaction_id=transaction.id,
        wallet_id=float_wallet.id,
        wallet_entity_type=EntityType.SDM_FLOAT,
        wallet_entity_id="SDM_FLOAT",
        entry_type=EntryType.CREDIT,
        amount=request.amount,
        balance_before=balance_before,
        balance_after=float_wallet.available_balance,
        description=f"Float top-up {reference}"
    )
    
    await db.ledger_transactions.insert_one(transaction.model_dump())
    await db.ledger_entries.insert_one(entry.model_dump())
    
    # Audit log
    await ledger_service._audit_log(
        action="TOPUP_FLOAT",
        entity_type="sdm_float",
        entity_id=float_wallet.id,
        new_values={"amount": request.amount, "source": request.source},
        performed_by=admin["username"]
    )
    
    return {
        "message": "Float topped up successfully",
        "reference": reference,
        "amount": request.amount,
        "new_balance": float_wallet.available_balance
    }

@sdm_router.get("/admin/fintech/float/status")
async def admin_get_float_status(admin: dict = Depends(get_current_admin)):
    """Admin: Get float wallet status and alert thresholds"""
    float_wallet = await ledger_service.get_sdm_float_wallet()
    
    # Get pending withdrawals total
    pending_withdrawals = await db.withdrawal_requests.aggregate([
        {"$match": {"status": {"$in": ["PENDING", "APPROVED", "PROCESSING"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]).to_list(1)
    
    pending_total = pending_withdrawals[0] if pending_withdrawals else {"total": 0, "count": 0}
    
    # Calculate coverage
    coverage_ratio = float_wallet.available_balance / pending_total["total"] if pending_total["total"] > 0 else float("inf")
    
    # Alert thresholds
    LOW_BALANCE_THRESHOLD = 1000  # GHS
    CRITICAL_THRESHOLD = 500  # GHS
    
    alert_level = "OK"
    if float_wallet.available_balance < CRITICAL_THRESHOLD:
        alert_level = "CRITICAL"
    elif float_wallet.available_balance < LOW_BALANCE_THRESHOLD:
        alert_level = "LOW"
    
    return {
        "float_balance": float_wallet.available_balance,
        "pending_withdrawals": {
            "count": pending_total["count"],
            "total_amount": round(pending_total["total"], 2)
        },
        "coverage_ratio": round(coverage_ratio, 2) if coverage_ratio != float("inf") else "∞",
        "alert_level": alert_level,
        "thresholds": {
            "low": LOW_BALANCE_THRESHOLD,
            "critical": CRITICAL_THRESHOLD
        },
        "recommendation": "Top up float immediately" if alert_level == "CRITICAL" else 
                         "Consider topping up float" if alert_level == "LOW" else 
                         "Float balance is healthy"
    }


@sdm_router.post("/admin/fintech/credit-user")
async def admin_credit_user_wallet(
    user_id: str,
    amount: float,
    reason: str = "Admin credit",
    admin: dict = Depends(get_current_admin)
):
    """Admin: Credit a user's wallet directly (for testing/adjustments)"""
    from ledger import EntityType
    
    wallet = await ledger_service.get_wallet_by_entity(EntityType.CLIENT, user_id)
    if not wallet:
        # Create wallet if doesn't exist
        wallet = await ledger_service.create_wallet(EntityType.CLIENT, user_id)
    
    # Credit available balance
    await ledger_service.update_wallet_balance(
        wallet.id,
        available_delta=amount
    )
    
    # Audit log
    await db.audit_logs.insert_one({
        "action": "ADMIN_CREDIT_USER",
        "entity_type": "wallet",
        "entity_id": wallet.id,
        "user_id": user_id,
        "amount": amount,
        "reason": reason,
        "performed_by": admin["username"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "message": "User wallet credited",
        "user_id": user_id,
        "amount_credited": amount,
        "new_balance": wallet.available_balance + amount,
        "reason": reason
    }


# ============== NOTIFICATION SYSTEM ==============

async def send_float_alert(alert_type: str, float_balance: float, threshold: float):
    """Send float alert via webhook and/or email"""
    config = await get_sdm_config()
    
    # Check if alerts are enabled for this type
    if alert_type == "low" and not config.get("alert_on_low_threshold", True):
        return None
    if alert_type == "critical" and not config.get("alert_on_critical_threshold", True):
        return None
    
    # Create alert record
    alert = FloatAlert(
        alert_type=alert_type,
        float_balance=float_balance,
        threshold=threshold,
        message=f"Float balance ({float_balance} GHS) has dropped below {alert_type} threshold ({threshold} GHS)"
    )
    
    webhook_url = config.get("float_alert_webhook_url")
    alert_emails = config.get("float_alert_emails", [])
    
    # Send webhook if configured
    if webhook_url:
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_url,
                    json={
                        "alert_type": alert_type,
                        "float_balance": float_balance,
                        "threshold": threshold,
                        "message": alert.message,
                        "timestamp": alert.created_at,
                        "platform": "SDM Fintech"
                    },
                    timeout=10.0
                )
                alert.webhook_sent = True
                alert.webhook_response = f"Status: {response.status_code}"
        except Exception as e:
            alert.webhook_response = f"Error: {str(e)}"
    
    # Send email if configured
    if alert_emails:
        try:
            # Using Resend (if configured)
            resend_api_key = os.environ.get("RESEND_API_KEY")
            if resend_api_key:
                import resend
                resend.api_key = resend_api_key
                
                for email in alert_emails:
                    try:
                        resend.Emails.send({
                            "from": "SDM Fintech <alerts@sdm.com>",
                            "to": [email],
                            "subject": f"🚨 Float {alert_type.upper()} Alert - SDM Fintech",
                            "html": f"""
                            <h2>Float Balance Alert</h2>
                            <p><strong>Alert Type:</strong> {alert_type.upper()}</p>
                            <p><strong>Current Balance:</strong> GHS {float_balance:,.2f}</p>
                            <p><strong>Threshold:</strong> GHS {threshold:,.2f}</p>
                            <p><strong>Message:</strong> {alert.message}</p>
                            <p><strong>Time:</strong> {alert.created_at}</p>
                            <hr>
                            <p>Please top up the float wallet to ensure withdrawal processing.</p>
                            """
                        })
                    except:
                        pass
                alert.email_sent = True
                alert.email_recipients = alert_emails
        except Exception as e:
            print(f"Email alert error: {e}")
    
    # Save alert record
    await db.float_alerts.insert_one(alert.model_dump())
    
    return alert

async def check_float_and_alert():
    """Check float balance and send alerts if needed"""
    config = await get_sdm_config()
    float_status = await ledger_service.get_float_status()
    
    float_balance = float_status.get("float_balance", 0)
    LOW_THRESHOLD = config.get("float_low_threshold", 5000)
    CRITICAL_THRESHOLD = config.get("float_critical_threshold", 1000)
    
    # Check if we already sent an alert recently (within 1 hour)
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    recent_alert = await db.float_alerts.find_one({
        "created_at": {"$gte": one_hour_ago},
        "is_acknowledged": False
    }, {"_id": 0})
    
    if recent_alert:
        return None  # Don't spam alerts
    
    # Send appropriate alert
    if float_balance < CRITICAL_THRESHOLD:
        return await send_float_alert("critical", float_balance, CRITICAL_THRESHOLD)
    elif float_balance < LOW_THRESHOLD:
        return await send_float_alert("low", float_balance, LOW_THRESHOLD)
    
    return None

# ============== NOTIFICATION ENDPOINTS ==============

@sdm_router.post("/admin/notifications")
async def create_notification(
    request: CreateNotificationRequest,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Create and send a notification"""
    notification = Notification(
        recipient_type=request.recipient_type,
        recipient_ids=request.recipient_ids or [],
        title=request.title,
        message=request.message,
        notification_type=request.notification_type,
        priority=request.priority,
        action_url=request.action_url,
        image_url=request.image_url,
        expires_at=request.expires_at,
        sent_by=admin["username"]
    )
    
    await db.notifications.insert_one(notification.model_dump())
    
    # Count recipients
    recipient_count = 0
    if request.recipient_type == "all":
        users = await db.sdm_users.count_documents({"is_active": True})
        merchants = await db.sdm_merchants.count_documents({"is_active": True})
        recipient_count = users + merchants
    elif request.recipient_type == "clients":
        recipient_count = await db.sdm_users.count_documents({"is_active": True})
    elif request.recipient_type == "merchants":
        recipient_count = await db.sdm_merchants.count_documents({"is_active": True})
    elif request.recipient_type == "specific":
        recipient_count = len(request.recipient_ids or [])
    
    return {
        "message": "Notification created and sent",
        "notification_id": notification.id,
        "recipient_type": request.recipient_type,
        "recipient_count": recipient_count
    }

@sdm_router.get("/admin/notifications")
async def get_notifications(
    limit: int = 50,
    skip: int = 0,
    notification_type: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Get all notifications"""
    query = {}
    if notification_type:
        query["notification_type"] = notification_type
    
    notifications = await db.notifications.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return notifications

@sdm_router.put("/admin/notifications/{notification_id}")
async def update_notification(
    notification_id: str,
    request: UpdateNotificationRequest,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Update a notification"""
    update_data = {k: v for k, v in request.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification updated", "notification_id": notification_id}

@sdm_router.delete("/admin/notifications/{notification_id}")
async def delete_notification(
    notification_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Delete a notification"""
    result = await db.notifications.delete_one({"id": notification_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted", "notification_id": notification_id}

@sdm_router.get("/admin/notifications/stats")
async def get_notification_stats(admin: dict = Depends(get_current_admin)):
    """Admin: Get notification statistics"""
    total = await db.notifications.count_documents({})
    by_type = await db.notifications.aggregate([
        {"$group": {"_id": "$notification_type", "count": {"$sum": 1}}}
    ]).to_list(100)
    by_priority = await db.notifications.aggregate([
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
    ]).to_list(100)
    
    return {
        "total_notifications": total,
        "by_type": {item["_id"]: item["count"] for item in by_type},
        "by_priority": {item["_id"]: item["count"] for item in by_priority}
    }

# ============== FLOAT ALERT ENDPOINTS ==============

@sdm_router.get("/admin/float-alerts")
async def get_float_alerts(
    limit: int = 50,
    acknowledged: Optional[bool] = None,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Get float alert history"""
    query = {}
    if acknowledged is not None:
        query["is_acknowledged"] = acknowledged
    
    alerts = await db.float_alerts.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return alerts

@sdm_router.post("/admin/float-alerts/{alert_id}/acknowledge")
async def acknowledge_float_alert(
    alert_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Acknowledge a float alert"""
    result = await db.float_alerts.update_one(
        {"id": alert_id},
        {
            "$set": {
                "is_acknowledged": True,
                "acknowledged_by": admin["username"],
                "acknowledged_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"message": "Alert acknowledged", "alert_id": alert_id}

@sdm_router.post("/admin/float-alerts/test")
async def test_float_alert(admin: dict = Depends(get_current_admin)):
    """Admin: Test float alert system (sends test notification)"""
    config = await get_sdm_config()
    
    webhook_url = config.get("float_alert_webhook_url")
    alert_emails = config.get("float_alert_emails", [])
    
    if not webhook_url and not alert_emails:
        raise HTTPException(
            status_code=400, 
            detail="No webhook URL or email addresses configured. Please configure alert settings first."
        )
    
    # Create test alert
    test_alert = await send_float_alert("test", 999.99, 1000.0)
    
    return {
        "message": "Test alert sent",
        "webhook_configured": bool(webhook_url),
        "webhook_sent": test_alert.webhook_sent if test_alert else False,
        "emails_configured": len(alert_emails),
        "email_sent": test_alert.email_sent if test_alert else False
    }

# ============== CLIENT NOTIFICATION ENDPOINTS ==============

@sdm_router.get("/user/notifications")
async def get_user_notifications(
    limit: int = 20,
    unread_only: bool = False,
    user: dict = Depends(get_current_user)
):
    """User: Get my notifications"""
    user_id = user["id"]
    
    # Query notifications for this user
    query = {
        "$or": [
            {"recipient_type": "all"},
            {"recipient_type": "clients"},
            {"recipient_ids": user_id}
        ],
        "is_active": True
    }
    
    # Filter expired
    now = datetime.now(timezone.utc).isoformat()
    query["$or"].append({"expires_at": None})
    query["$or"].append({"expires_at": {"$gt": now}})
    
    notifications = await db.notifications.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Add read status for this user
    result = []
    for notif in notifications:
        is_read = notif.get("is_read", {}).get(user_id, False)
        if unread_only and is_read:
            continue
        result.append({
            **notif,
            "is_read": is_read
        })
    
    return result

@sdm_router.post("/user/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: dict = Depends(get_current_user)
):
    """User: Mark notification as read"""
    user_id = user["id"]
    
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {f"is_read.{user_id}": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@sdm_router.post("/user/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    """User: Mark all notifications as read"""
    user_id = user["id"]
    
    # Get all notifications for this user
    query = {
        "$or": [
            {"recipient_type": "all"},
            {"recipient_type": "clients"},
            {"recipient_ids": user_id}
        ],
        "is_active": True
    }
    
    result = await db.notifications.update_many(
        query,
        {"$set": {f"is_read.{user_id}": True}}
    )
    
    return {"message": "All notifications marked as read", "count": result.modified_count}

@sdm_router.get("/user/notifications/unread-count")
async def get_unread_notification_count(user: dict = Depends(get_current_user)):
    """User: Get count of unread notifications"""
    user_id = user["id"]
    
    # Query notifications for this user that are NOT read
    query = {
        "$or": [
            {"recipient_type": "all"},
            {"recipient_type": "clients"},
            {"recipient_ids": user_id}
        ],
        "is_active": True,
        f"is_read.{user_id}": {"$ne": True}
    }
    
    count = await db.notifications.count_documents(query)
    
    return {"unread_count": count}

# ============== MERCHANT NOTIFICATION ENDPOINTS ==============

@sdm_router.get("/merchant/notifications")
async def get_merchant_notifications(
    limit: int = 20,
    unread_only: bool = False,
    merchant: dict = Depends(get_current_merchant)
):
    """Merchant: Get my notifications"""
    merchant_id = merchant["id"]
    
    query = {
        "$or": [
            {"recipient_type": "all"},
            {"recipient_type": "merchants"},
            {"recipient_ids": merchant_id}
        ],
        "is_active": True
    }
    
    notifications = await db.notifications.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for notif in notifications:
        is_read = notif.get("is_read", {}).get(merchant_id, False)
        if unread_only and is_read:
            continue
        result.append({
            **notif,
            "is_read": is_read
        })
    
    return result

@sdm_router.post("/merchant/notifications/{notification_id}/read")
async def mark_merchant_notification_read(
    notification_id: str,
    merchant: dict = Depends(get_current_merchant)
):
    """Merchant: Mark notification as read"""
    merchant_id = merchant["id"]
    
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {f"is_read.{merchant_id}": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

# ============== PUSH NOTIFICATIONS (OneSignal) ==============

from push_notifications import OneSignalService, PushNotificationPayload, PushDevice

# Initialize push service
push_service = OneSignalService(db)

class RegisterPushDeviceRequest(BaseModel):
    player_id: str
    platform: str = "web"
    device_model: Optional[str] = None

class SendPushNotificationRequest(BaseModel):
    title: str
    message: str
    url: Optional[str] = None
    image_url: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

@sdm_router.post("/user/push/register")
async def register_user_push_device(
    request: RegisterPushDeviceRequest,
    user: dict = Depends(get_current_user)
):
    """User: Register device for push notifications"""
    result = await push_service.register_device(
        user_id=user["id"],
        user_type="client",
        player_id=request.player_id,
        platform=request.platform,
        device_model=request.device_model
    )
    return result

@sdm_router.post("/user/push/unregister")
async def unregister_user_push_device(
    player_id: str,
    user: dict = Depends(get_current_user)
):
    """User: Unregister device from push notifications"""
    success = await push_service.unregister_device(player_id)
    return {"success": success}

@sdm_router.get("/user/push/devices")
async def get_user_push_devices(user: dict = Depends(get_current_user)):
    """User: Get registered push devices"""
    devices = await push_service.get_user_devices(user["id"])
    return {"devices": devices, "count": len(devices)}

@sdm_router.post("/merchant/push/register")
async def register_merchant_push_device(
    request: RegisterPushDeviceRequest,
    merchant: dict = Depends(get_current_merchant)
):
    """Merchant: Register device for push notifications"""
    result = await push_service.register_device(
        user_id=merchant["id"],
        user_type="merchant",
        player_id=request.player_id,
        platform=request.platform,
        device_model=request.device_model
    )
    return result

@sdm_router.post("/merchant/push/unregister")
async def unregister_merchant_push_device(
    player_id: str,
    merchant: dict = Depends(get_current_merchant)
):
    """Merchant: Unregister device from push notifications"""
    success = await push_service.unregister_device(player_id)
    return {"success": success}

@sdm_router.get("/admin/push/stats")
async def get_push_stats(admin: dict = Depends(get_current_admin)):
    """Admin: Get push notification statistics"""
    stats = await push_service.get_notification_stats()
    return stats

@sdm_router.post("/admin/push/send")
async def admin_send_push_notification(
    request: SendPushNotificationRequest,
    recipient_type: str = "all",
    user_id: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Send push notification to users"""
    payload = PushNotificationPayload(
        title=request.title,
        message=request.message,
        url=request.url,
        image_url=request.image_url,
        data=request.data
    )
    
    if user_id:
        # Send to specific user
        result = await push_service.send_to_user(user_id, payload)
    else:
        # Send to all or segment
        user_type = None
        if recipient_type == "clients":
            user_type = "client"
        elif recipient_type == "merchants":
            user_type = "merchant"
        result = await push_service.send_to_all(payload, user_type)
    
    # Also create in-app notification
    notification = Notification(
        recipient_type=recipient_type,
        recipient_ids=[user_id] if user_id else [],
        title=request.title,
        message=request.message,
        notification_type="push",
        priority="normal",
        action_url=request.url,
        sent_by=admin["username"]
    )
    await db.notifications.insert_one(notification.model_dump())
    
    return {
        "push_result": result,
        "in_app_notification_id": notification.id
    }

@sdm_router.post("/admin/push/test")
async def test_push_notification(admin: dict = Depends(get_current_admin)):
    """Admin: Test push notification system"""
    stats = await push_service.get_notification_stats()
    
    return {
        "is_configured": stats["is_configured"],
        "active_devices": stats["active_devices"],
        "message": "OneSignal configured and ready!" if stats["is_configured"] else 
                   "OneSignal not configured. Add ONESIGNAL_APP_ID and ONESIGNAL_API_KEY to .env"
    }

# ============== CASHBACK SERVICES (Airtime, Data, Bills, MoMo) ==============

from services import (
    BulkClixService, ServiceType, NetworkProvider, BillProvider,
    DATA_BUNDLES, detect_network
)

# Initialize BulkClix service
bulkclix_service = BulkClixService(db, ledger_service)

class BuyAirtimeRequest(BaseModel):
    phone_number: str
    amount: float
    network: Optional[str] = None  # MTN, VODAFONE, AIRTELTIGO

class BuyDataRequest(BaseModel):
    phone_number: str
    bundle_id: str

class PayBillRequest(BaseModel):
    provider: str  # ECG, GWCL, DSTV, GOTV
    account_number: str
    amount: float
    customer_name: Optional[str] = None

class MoMoWithdrawalRequest(BaseModel):
    phone_number: str
    amount: float
    network: Optional[str] = None

# ==================== PROMOTIONS MODELS ====================

class PromotionTargetService(str, Enum):
    ALL = "ALL"
    AIRTIME = "AIRTIME"
    DATA = "DATA"
    BILL_PAYMENT = "BILL_PAYMENT"
    MOMO_WITHDRAWAL = "MOMO_WITHDRAWAL"

class PromotionDayOfWeek(str, Enum):
    MONDAY = "MONDAY"
    TUESDAY = "TUESDAY"
    WEDNESDAY = "WEDNESDAY"
    THURSDAY = "THURSDAY"
    FRIDAY = "FRIDAY"
    SATURDAY = "SATURDAY"
    SUNDAY = "SUNDAY"

class CreatePromotionRequest(BaseModel):
    name: str
    description: Optional[str] = None
    target_service: PromotionTargetService = PromotionTargetService.ALL
    discount_percent: float  # e.g., 10 for 10%
    min_amount: float = 0  # Minimum transaction amount to apply
    days_of_week: List[str] = []  # Empty = all days, or ["SATURDAY", "SUNDAY"]
    start_date: Optional[str] = None  # ISO date string
    end_date: Optional[str] = None  # ISO date string
    is_active: bool = True

class ServicePromotion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    target_service: str  # ALL, AIRTIME, DATA, BILL_PAYMENT, MOMO_WITHDRAWAL
    discount_percent: float
    min_amount: float = 0
    days_of_week: List[str] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    usage_count: int = 0
    total_discount_given: float = 0.0

# ==================== USER SERVICE ENDPOINTS ====================

# Helper function to get active promotions
async def get_active_promotions(service_type: str = None):
    """Get active promotions for a service type"""
    now = datetime.now(timezone.utc)
    current_day = now.strftime("%A").upper()  # MONDAY, TUESDAY, etc.
    
    query = {"is_active": True}
    
    promotions = await db.service_promotions.find(query, {"_id": 0}).to_list(100)
    
    active_promos = []
    for promo in promotions:
        # Check date range
        if promo.get("start_date") and promo["start_date"] > now.isoformat():
            continue
        if promo.get("end_date") and promo["end_date"] < now.isoformat():
            continue
        
        # Check day of week
        if promo.get("days_of_week") and len(promo["days_of_week"]) > 0:
            if current_day not in promo["days_of_week"]:
                continue
        
        # Check service type
        if service_type and promo["target_service"] != "ALL":
            if promo["target_service"] != service_type:
                continue
        
        active_promos.append(promo)
    
    return active_promos

async def apply_promotion(service_type: str, amount: float):
    """Apply best promotion for a service and return discount info"""
    promos = await get_active_promotions(service_type)
    
    best_discount = 0
    best_promo = None
    
    for promo in promos:
        # Check minimum amount
        if amount < promo.get("min_amount", 0):
            continue
        
        discount = amount * (promo["discount_percent"] / 100)
        if discount > best_discount:
            best_discount = discount
            best_promo = promo
    
    if best_promo:
        return {
            "has_discount": True,
            "promo_id": best_promo["id"],
            "promo_name": best_promo["name"],
            "discount_percent": best_promo["discount_percent"],
            "discount_amount": round(best_discount, 2),
            "final_amount": round(amount - best_discount, 2)
        }
    
    return {
        "has_discount": False,
        "discount_amount": 0,
        "final_amount": amount
    }

@sdm_router.get("/user/services/promotions")
async def get_user_promotions():
    """Get active promotions for user"""
    promos = await get_active_promotions()
    return {"promotions": promos}

@sdm_router.get("/user/services/balance")
async def get_user_service_balance(user: dict = Depends(get_current_user)):
    """User: Get available cashback balance for services"""
    balance = await bulkclix_service.get_user_cashback_balance(user["id"])
    limit_check = await bulkclix_service.check_monthly_limit(user["id"], 0)
    
    return {
        "cashback_balance": balance,
        "monthly_limit": limit_check["monthly_limit"],
        "monthly_used": limit_check["current_total"],
        "monthly_remaining": limit_check["remaining"]
    }

@sdm_router.get("/user/services/data-bundles")
async def get_data_bundles(network: Optional[str] = None):
    """Get available data bundles"""
    net = None
    if network:
        try:
            net = NetworkProvider(network)
        except ValueError:
            pass
    
    bundles = bulkclix_service.get_data_bundles(net)
    return {"bundles": bundles}

@sdm_router.post("/user/services/airtime")
async def buy_airtime(request: BuyAirtimeRequest, user: dict = Depends(get_current_user)):
    """User: Buy airtime using cashback balance"""
    network = None
    if request.network:
        try:
            network = NetworkProvider(request.network)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid network: {request.network}")
    
    # Check for promotions
    promo_info = await apply_promotion("AIRTIME", request.amount)
    effective_amount = promo_info["final_amount"]
    
    try:
        result = await bulkclix_service.buy_airtime(
            user_id=user["id"],
            phone_number=request.phone_number,
            amount=effective_amount,
            network=network
        )
        # Add promo info to result
        result["original_amount"] = request.amount
        result["promotion"] = promo_info
        
        # Update promo usage stats
        if promo_info["has_discount"]:
            await db.service_promotions.update_one(
                {"id": promo_info["promo_id"]},
                {
                    "$inc": {
                        "usage_count": 1,
                        "total_discount_given": promo_info["discount_amount"]
                    }
                }
            )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@sdm_router.post("/user/services/data")
async def buy_data(request: BuyDataRequest, user: dict = Depends(get_current_user)):
    """User: Buy data bundle using cashback balance"""
    try:
        # Get bundle price for promo calculation
        bundles = bulkclix_service.get_data_bundles()
        bundle = next((b for b in bundles if b["id"] == request.bundle_id), None)
        if not bundle:
            raise HTTPException(status_code=400, detail=f"Invalid bundle: {request.bundle_id}")
        
        # Check for promotions
        promo_info = await apply_promotion("DATA", bundle["price"])
        
        result = await bulkclix_service.buy_data(
            user_id=user["id"],
            phone_number=request.phone_number,
            bundle_id=request.bundle_id,
            discount_amount=promo_info["discount_amount"] if promo_info["has_discount"] else 0
        )
        result["promotion"] = promo_info
        
        # Update promo usage stats
        if promo_info["has_discount"]:
            await db.service_promotions.update_one(
                {"id": promo_info["promo_id"]},
                {
                    "$inc": {
                        "usage_count": 1,
                        "total_discount_given": promo_info["discount_amount"]
                    }
                }
            )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@sdm_router.post("/user/services/bill")
async def pay_bill(request: PayBillRequest, user: dict = Depends(get_current_user)):
    """User: Pay utility bill using cashback balance"""
    try:
        provider = BillProvider(request.provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {request.provider}")
    
    # Check for promotions
    promo_info = await apply_promotion("BILL_PAYMENT", request.amount)
    effective_amount = promo_info["final_amount"]
    
    try:
        result = await bulkclix_service.pay_bill(
            user_id=user["id"],
            provider=provider,
            account_number=request.account_number,
            amount=effective_amount,
            customer_name=request.customer_name
        )
        result["original_amount"] = request.amount
        result["promotion"] = promo_info
        
        # Update promo usage stats
        if promo_info["has_discount"]:
            await db.service_promotions.update_one(
                {"id": promo_info["promo_id"]},
                {
                    "$inc": {
                        "usage_count": 1,
                        "total_discount_given": promo_info["discount_amount"]
                    }
                }
            )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@sdm_router.post("/user/services/withdraw")
async def withdraw_to_momo(request: MoMoWithdrawalRequest, user: dict = Depends(get_current_user)):
    """User: Withdraw cashback to Mobile Money"""
    network = None
    if request.network:
        try:
            network = NetworkProvider(request.network)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid network: {request.network}")
    
    try:
        result = await bulkclix_service.withdraw_to_momo(
            user_id=user["id"],
            phone_number=request.phone_number,
            amount=request.amount,
            network=network
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@sdm_router.get("/user/services/history")
async def get_service_history(
    service_type: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    """User: Get service transaction history"""
    svc_type = None
    if service_type:
        try:
            svc_type = ServiceType(service_type)
        except ValueError:
            pass
    
    transactions = await bulkclix_service.get_user_service_history(
        user_id=user["id"],
        service_type=svc_type,
        limit=limit
    )
    return {"transactions": transactions}

# ==================== ADMIN SERVICE ENDPOINTS ====================

@sdm_router.get("/admin/services/stats")
async def get_admin_service_stats(
    days: int = 30,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Get service statistics for reporting"""
    stats = await bulkclix_service.get_service_stats(days=days)
    stats["api_configured"] = bulkclix_service.is_configured()
    return stats

@sdm_router.get("/admin/services/transactions")
async def get_admin_service_transactions(
    service_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Get all service transactions"""
    query = {}
    if service_type:
        query["service_type"] = service_type
    if status:
        query["status"] = status
    
    transactions = await db.service_transactions.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"transactions": transactions}

@sdm_router.put("/admin/services/config")
async def update_service_config(
    monthly_limit: Optional[float] = None,
    service_commission_rate: Optional[float] = None,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Update service configuration"""
    update_data = {}
    if monthly_limit is not None:
        update_data["monthly_service_limit"] = monthly_limit
    if service_commission_rate is not None:
        update_data["service_commission_rate"] = service_commission_rate
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    await db.sdm_config.update_one(
        {"key": "config"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Service configuration updated", "updates": update_data}

@sdm_router.get("/admin/services/config")
async def get_service_config(admin: dict = Depends(get_current_admin)):
    """Admin: Get service configuration"""
    config = await db.sdm_config.find_one({"key": "config"}, {"_id": 0})
    
    return {
        "monthly_service_limit": config.get("monthly_service_limit", 2500) if config else 2500,
        "service_commission_rate": config.get("service_commission_rate", 0.001) if config else 0.001,
        "api_configured": bulkclix_service.is_configured()
    }

class CreditUserRequest(BaseModel):
    phone: str
    amount: float

@sdm_router.post("/admin/fintech/users/credit")
async def credit_user_wallet(request: CreditUserRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Credit a user's available cashback balance (for testing)"""
    from ledger import EntityType
    
    phone = normalize_phone(request.phone)
    user = await db.sdm_users.find_one({"phone": phone})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create the ledger wallet
    wallet = await ledger_service.get_wallet_by_entity(EntityType.CLIENT, user["id"])
    if wallet:
        # Update the ledger wallet
        await db.wallets.update_one(
            {"id": wallet.id},
            {"$inc": {"available_balance": request.amount, "balance": request.amount}}
        )
    
    return {"message": f"Credited GHS {request.amount} to {phone}", "user_id": user["id"]}

class CreateTestVIPUsersRequest(BaseModel):
    count: int = 5
    tiers: List[str] = ["SILVER", "GOLD", "PLATINUM"]

@sdm_router.post("/admin/test/create-vip-users")
async def create_test_vip_users(request: CreateTestVIPUsersRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Create test VIP users for lottery testing"""
    from ledger import EntityType
    import random
    
    created_users = []
    tier_multipliers = {"SILVER": 1, "GOLD": 2, "PLATINUM": 3}
    
    # Get card types
    card_types = await db.vip_card_types.find({"is_active": True}, {"_id": 0}).to_list(10)
    tier_to_card = {c["tier"]: c for c in card_types}
    
    for i in range(request.count):
        # Generate unique phone
        phone = f"02{random.randint(40000000, 99999999)}"
        
        # Check if exists
        existing = await db.sdm_users.find_one({"phone": phone})
        if existing:
            continue
        
        # Pick random tier from provided list
        tier = random.choice(request.tiers)
        card = tier_to_card.get(tier)
        
        if not card:
            continue
        
        # Create user
        user_id = str(uuid.uuid4())
        first_name = f"TestUser{i+1}"
        last_name = tier
        
        user = {
            "id": user_id,
            "phone": phone,
            "first_name": first_name,
            "last_name": last_name,
            "email": f"testuser{i+1}@sdm.test",
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.sdm_users.insert_one(user)
        
        # Create VIP membership
        membership = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_phone": phone,
            "card_type_id": card["id"],
            "tier": tier,
            "price_paid": card["price"],
            "status": "active",
            "start_date": datetime.now(timezone.utc).isoformat(),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.vip_memberships.insert_one(membership)
        
        # Create wallet
        wallet_id = str(uuid.uuid4())
        wallet = {
            "id": wallet_id,
            "entity_type": EntityType.CLIENT.value,
            "entity_id": user_id,
            "balance": 10.0,
            "available_balance": 10.0,
            "reserved_balance": 0.0,
            "currency": "GHS",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet)
        
        created_users.append({
            "phone": phone,
            "name": f"{first_name} {last_name}",
            "tier": tier,
            "user_id": user_id,
            "lottery_entries": tier_multipliers.get(tier, 1)
        })
    
    return {
        "message": f"Created {len(created_users)} test VIP users",
        "users": created_users
    }

@sdm_router.post("/admin/lotteries/{lottery_id}/add-test-participants")
async def add_test_participants_to_lottery(lottery_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Add all active VIP members to a lottery (for testing)"""
    lottery = await db.lotteries.find_one({"id": lottery_id}, {"_id": 0})
    if not lottery:
        raise HTTPException(status_code=404, detail="Lottery not found")
    
    if lottery["status"] not in ["DRAFT", "ACTIVE"]:
        raise HTTPException(status_code=400, detail="Lottery must be DRAFT or ACTIVE")
    
    # Get all active VIP members
    vip_members = await db.vip_memberships.find({"status": "active"}, {"_id": 0}).to_list(10000)
    
    tier_multipliers = {"SILVER": 1, "GOLD": 2, "PLATINUM": 3}
    added = 0
    total_entries = lottery.get("total_entries", 0)
    
    for member in vip_members:
        # Check if already participant
        existing = await db.lottery_participants.find_one({
            "lottery_id": lottery_id, 
            "user_id": member["user_id"]
        })
        if existing:
            continue
        
        user = await db.sdm_users.find_one({"id": member["user_id"]}, {"_id": 0})
        if not user:
            continue
        
        entries = tier_multipliers.get(member["tier"], 1)
        
        participant = LotteryParticipant(
            lottery_id=lottery_id,
            user_id=member["user_id"],
            user_phone=member["user_phone"],
            user_name=f"{user.get('first_name') or ''} {user.get('last_name') or ''}".strip() or "Client SDM",
            vip_tier=member["tier"],
            entries=entries
        )
        
        await db.lottery_participants.insert_one(participant.model_dump())
        added += 1
        total_entries += entries
    
    # Update lottery participant count
    total_participants = lottery.get("total_participants", 0) + added
    await db.lotteries.update_one(
        {"id": lottery_id},
        {"$set": {"total_participants": total_participants, "total_entries": total_entries}}
    )
    
    return {
        "message": f"Added {added} participants to lottery",
        "total_participants": total_participants,
        "total_entries": total_entries
    }

# ==================== VIP CARDS ADMIN ENDPOINTS ====================

# Default VIP card types to seed
DEFAULT_VIP_CARDS = [
    {
        "tier": "SILVER",
        "name": "VIP Silver Member",
        "price": 25.0,
        "validity_days": 365,
        "cashback_boost": 0.0,
        "monthly_withdrawal_limit": 2500.0,
        "lottery_multiplier": 1,
        "has_priority_withdrawal": False,
        "has_gold_merchants_access": False,
        "has_ambassador_program": False,
        "has_business_opportunities": False,
        "has_investment_access": False,
        "badge_color": "#C0C0C0",
        "description": "Entry Card - Community & Savings",
        "benefits_list": [
            "Access to exclusive partner merchant offers",
            "Access to SDM app (wallet + history + reward tracking)",
            "Access to monthly draws (partner lottery)",
            "Priority access to flash promos",
            "Personal dashboard with loyalty score",
            "Personalized notifications by geographic area",
            "Birthday Bonus (special bonus on your birthday month)",
            "Buy data bundles, electricity, airtime with cashback"
        ]
    },
    {
        "tier": "GOLD",
        "name": "VIP Gold Member",
        "price": 50.0,
        "validity_days": 365,
        "cashback_boost": 0.2,
        "monthly_withdrawal_limit": 2500.0,
        "lottery_multiplier": 2,
        "has_priority_withdrawal": True,
        "has_gold_merchants_access": True,
        "has_ambassador_program": False,
        "has_business_opportunities": False,
        "has_investment_access": False,
        "badge_color": "#FFD700",
        "description": "Premium Card - Benefits + Power",
        "benefits_list": [
            "Everything Silver has +",
            "Boosted cashback (+0.2% on partners)",
            "Double chance in monthly draws",
            "Priority processing for MoMo withdrawals",
            "Access to exclusive Gold Merchants",
            "Access to SDM events (networking, fintech, business)",
            "Direct discount at Gold partners",
            "Digital Gold badge (visible status in app)"
        ]
    },
    {
        "tier": "PLATINUM",
        "name": "VIP Platinum Member",
        "price": 100.0,
        "validity_days": 365,
        "cashback_boost": 0.5,
        "monthly_withdrawal_limit": 5000.0,
        "lottery_multiplier": 3,
        "has_priority_withdrawal": True,
        "has_gold_merchants_access": True,
        "has_ambassador_program": True,
        "has_business_opportunities": True,
        "has_investment_access": True,
        "badge_color": "#E5E4E2",
        "description": "Elite Card - Business & Social Status",
        "benefits_list": [
            "Everything Silver + Gold +",
            "Premium Cashback Boost (+0.5%)",
            "Access to private partner offers",
            "Access to SDM business partner opportunities",
            "Access to partner investments (crypto, RWA)",
            "High withdrawal limit (5000 GHS/month)",
            "Triple chance in major draws",
            "Invitation to closed conferences & events",
            "Ambassador Program (earn commission via referrals)",
            "Personalized annual earnings report"
        ]
    }
]

class CreateVIPCardRequest(BaseModel):
    tier: str
    name: str
    price: float
    validity_days: int = 365
    cashback_boost: float = 0.0
    monthly_withdrawal_limit: float = 2500.0
    lottery_multiplier: int = 1
    has_priority_withdrawal: bool = False
    has_gold_merchants_access: bool = False
    has_ambassador_program: bool = False
    has_business_opportunities: bool = False
    has_investment_access: bool = False
    badge_color: str = "#C0C0C0"
    description: str = ""
    benefits_list: List[str] = []
    is_active: bool = True

@sdm_router.get("/admin/vip-cards")
async def get_vip_cards(admin: dict = Depends(get_current_admin)):
    """Admin: Get all VIP card types"""
    cards = await db.vip_card_types.find({}, {"_id": 0}).sort("price", 1).to_list(100)
    
    # Seed default cards if none exist
    if not cards:
        for card_data in DEFAULT_VIP_CARDS:
            card = VIPCardType(**card_data)
            await db.vip_card_types.insert_one(card.model_dump())
        cards = await db.vip_card_types.find({}, {"_id": 0}).sort("price", 1).to_list(100)
    
    return {"cards": cards}

@sdm_router.post("/admin/vip-cards")
async def create_vip_card(request: CreateVIPCardRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Create a new VIP card type"""
    card = VIPCardType(
        tier=request.tier,
        name=request.name,
        price=request.price,
        validity_days=request.validity_days,
        cashback_boost=request.cashback_boost,
        monthly_withdrawal_limit=request.monthly_withdrawal_limit,
        lottery_multiplier=request.lottery_multiplier,
        has_priority_withdrawal=request.has_priority_withdrawal,
        has_gold_merchants_access=request.has_gold_merchants_access,
        has_ambassador_program=request.has_ambassador_program,
        has_business_opportunities=request.has_business_opportunities,
        has_investment_access=request.has_investment_access,
        badge_color=request.badge_color,
        description=request.description,
        benefits_list=request.benefits_list
    )
    
    await db.vip_card_types.insert_one(card.model_dump())
    return {"message": "VIP card created", "card": card.model_dump()}

@sdm_router.put("/admin/vip-cards/{card_id}")
async def update_vip_card(card_id: str, request: CreateVIPCardRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Update a VIP card type"""
    result = await db.vip_card_types.update_one(
        {"id": card_id},
        {
            "$set": {
                "tier": request.tier,
                "name": request.name,
                "price": request.price,
                "validity_days": request.validity_days,
                "cashback_boost": request.cashback_boost,
                "monthly_withdrawal_limit": request.monthly_withdrawal_limit,
                "lottery_multiplier": request.lottery_multiplier,
                "has_priority_withdrawal": request.has_priority_withdrawal,
                "has_gold_merchants_access": request.has_gold_merchants_access,
                "has_ambassador_program": request.has_ambassador_program,
                "has_business_opportunities": request.has_business_opportunities,
                "has_investment_access": request.has_investment_access,
                "badge_color": request.badge_color,
                "description": request.description,
                "benefits_list": request.benefits_list,
                "is_active": request.is_active,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="VIP card not found")
    return {"message": "VIP card updated"}

@sdm_router.delete("/admin/vip-cards/{card_id}")
async def delete_vip_card(card_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Delete a VIP card type"""
    result = await db.vip_card_types.delete_one({"id": card_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="VIP card not found")
    return {"message": "VIP card deleted"}

# ==================== PARTNERS ADMIN ENDPOINTS ====================

class CreatePartnerRequest(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    address: str
    city: str = "Accra"
    region: str = "Greater Accra"
    phone: Optional[str] = None
    cashback_rate: float = 5.0
    logo_url: Optional[str] = None
    is_gold_exclusive: bool = False
    is_active: bool = True

@sdm_router.get("/admin/partners")
async def get_partners(admin: dict = Depends(get_current_admin)):
    """Admin: Get all partners"""
    partners = await db.sdm_partners.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return {"partners": partners}

@sdm_router.post("/admin/partners")
async def create_partner(request: CreatePartnerRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Create a new partner"""
    partner = SDMPartner(
        name=request.name,
        category=request.category,
        description=request.description,
        address=request.address,
        city=request.city,
        region=request.region,
        phone=request.phone,
        cashback_rate=request.cashback_rate,
        logo_url=request.logo_url,
        is_gold_exclusive=request.is_gold_exclusive,
        is_active=request.is_active
    )
    
    await db.sdm_partners.insert_one(partner.model_dump())
    return {"message": "Partner created", "partner": partner.model_dump()}

@sdm_router.put("/admin/partners/{partner_id}")
async def update_partner(partner_id: str, request: CreatePartnerRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Update a partner"""
    result = await db.sdm_partners.update_one(
        {"id": partner_id},
        {
            "$set": {
                "name": request.name,
                "category": request.category,
                "description": request.description,
                "address": request.address,
                "city": request.city,
                "region": request.region,
                "phone": request.phone,
                "cashback_rate": request.cashback_rate,
                "logo_url": request.logo_url,
                "is_gold_exclusive": request.is_gold_exclusive,
                "is_active": request.is_active
            }
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"message": "Partner updated"}

@sdm_router.delete("/admin/partners/{partner_id}")
async def delete_partner(partner_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Delete a partner"""
    result = await db.sdm_partners.delete_one({"id": partner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"message": "Partner deleted"}

# Public endpoint for partners list
@sdm_router.get("/partners")
async def get_public_partners(category: Optional[str] = None, city: Optional[str] = None):
    """Public: Get partners list for display"""
    query = {"is_active": True}
    if category:
        query["category"] = category
    if city:
        query["city"] = city
    
    partners = await db.sdm_partners.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    
    # Get unique categories for filter
    categories = await db.sdm_partners.distinct("category", {"is_active": True})
    cities = await db.sdm_partners.distinct("city", {"is_active": True})
    
    return {
        "partners": partners,
        "categories": categories,
        "cities": cities
    }

# ==================== LOTTERY ADMIN ENDPOINTS ====================

class CreateLotteryRequest(BaseModel):
    name: str
    description: Optional[str] = None
    month: str  # e.g., "2026-03"
    funding_source: str = "FIXED"  # FIXED, COMMISSION, MIXED
    fixed_amount: float = 0.0
    commission_percentage: float = 0.0
    prize_distribution: List[float] = [40, 25, 15, 12, 8]  # 5 winners
    start_date: str
    end_date: str

@sdm_router.get("/admin/lotteries")
async def get_lotteries(admin: dict = Depends(get_current_admin)):
    """Admin: Get all lotteries"""
    lotteries = await db.lotteries.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"lotteries": lotteries}

@sdm_router.post("/admin/lotteries")
async def create_lottery(request: CreateLotteryRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Create a new lottery"""
    # Calculate total prize pool
    total_prize = request.fixed_amount
    
    if request.funding_source in ["COMMISSION", "MIXED"]:
        # Get total SDM commissions for the month
        month_start = f"{request.month}-01T00:00:00"
        month_parts = request.month.split("-")
        year, month_num = int(month_parts[0]), int(month_parts[1])
        if month_num == 12:
            next_month = f"{year + 1}-01-01T00:00:00"
        else:
            next_month = f"{year}-{month_num + 1:02d}-01T00:00:00"
        
        pipeline = [
            {"$match": {"created_at": {"$gte": month_start, "$lt": next_month}}},
            {"$group": {"_id": None, "total_commission": {"$sum": "$sdm_commission"}}}
        ]
        result = await db.sdm_transactions.aggregate(pipeline).to_list(1)
        if result:
            commission_amount = result[0]["total_commission"] * (request.commission_percentage / 100)
            total_prize += commission_amount
    
    lottery = SDMLottery(
        name=request.name,
        description=request.description,
        month=request.month,
        funding_source=request.funding_source,
        fixed_amount=request.fixed_amount,
        commission_percentage=request.commission_percentage,
        total_prize_pool=total_prize,
        prize_distribution=request.prize_distribution,
        start_date=request.start_date,
        end_date=request.end_date,
        created_by=admin.get("username")
    )
    
    await db.lotteries.insert_one(lottery.model_dump())
    return {"message": "Lottery created", "lottery": lottery.model_dump()}

@sdm_router.patch("/admin/lotteries/{lottery_id}/activate")
async def activate_lottery(lottery_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Activate a lottery and register all VIP members"""
    lottery = await db.lotteries.find_one({"id": lottery_id}, {"_id": 0})
    if not lottery:
        raise HTTPException(status_code=404, detail="Lottery not found")
    
    if lottery["status"] != "DRAFT":
        raise HTTPException(status_code=400, detail="Lottery is not in DRAFT status")
    
    # Get all active VIP members
    vip_members = await db.vip_memberships.find({"status": "active"}, {"_id": 0}).to_list(10000)
    
    tier_multipliers = {"SILVER": 1, "GOLD": 2, "PLATINUM": 3}
    total_participants = 0
    total_entries = 0
    
    for member in vip_members:
        user = await db.sdm_users.find_one({"id": member["user_id"]}, {"_id": 0})
        if not user:
            continue
        
        entries = tier_multipliers.get(member["tier"], 1)
        
        participant = LotteryParticipant(
            lottery_id=lottery_id,
            user_id=member["user_id"],
            user_phone=member["user_phone"],
            user_name=f"{user.get('first_name') or ''} {user.get('last_name') or ''}".strip() or "Client SDM",
            vip_tier=member["tier"],
            entries=entries
        )
        
        await db.lottery_participants.insert_one(participant.model_dump())
        total_participants += 1
        total_entries += entries
    
    # Update lottery status
    await db.lotteries.update_one(
        {"id": lottery_id},
        {
            "$set": {
                "status": "ACTIVE",
                "total_participants": total_participants,
                "total_entries": total_entries
            }
        }
    )
    
    return {
        "message": f"Lottery activated with {total_participants} participants ({total_entries} entries)",
        "total_participants": total_participants,
        "total_entries": total_entries
    }

@sdm_router.post("/admin/lotteries/{lottery_id}/draw")
async def draw_lottery(lottery_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Perform the lottery draw and select 5 winners"""
    import random
    
    lottery = await db.lotteries.find_one({"id": lottery_id}, {"_id": 0})
    if not lottery:
        raise HTTPException(status_code=404, detail="Lottery not found")
    
    if lottery["status"] != "ACTIVE":
        raise HTTPException(status_code=400, detail="Lottery must be ACTIVE to draw")
    
    # Get all participants
    participants = await db.lottery_participants.find(
        {"lottery_id": lottery_id},
        {"_id": 0}
    ).to_list(10000)
    
    if len(participants) < 5:
        raise HTTPException(status_code=400, detail=f"Not enough participants. Need at least 5, have {len(participants)}")
    
    # Create weighted entry list
    entry_pool = []
    for p in participants:
        for _ in range(p["entries"]):
            entry_pool.append(p)
    
    # Shuffle and select 5 unique winners
    random.shuffle(entry_pool)
    winners = []
    winner_ids = set()
    
    for entry in entry_pool:
        if entry["user_id"] not in winner_ids:
            winners.append(entry)
            winner_ids.add(entry["user_id"])
        if len(winners) >= 5:
            break
    
    # Assign prizes
    prize_distribution = lottery.get("prize_distribution", [40, 25, 15, 12, 8])
    total_prize = lottery["total_prize_pool"]
    
    winner_results = []
    for i, winner in enumerate(winners):
        prize_percentage = prize_distribution[i] if i < len(prize_distribution) else 0
        prize_amount = round(total_prize * (prize_percentage / 100), 2)
        
        winner_result = {
            "user_id": winner["user_id"],
            "user_phone": winner["user_phone"],
            "name": winner["user_name"],
            "tier": winner["vip_tier"],
            "rank": i + 1,
            "prize_percentage": prize_percentage,
            "prize_amount": prize_amount
        }
        winner_results.append(winner_result)
        
        # Update participant record
        await db.lottery_participants.update_one(
            {"lottery_id": lottery_id, "user_id": winner["user_id"]},
            {
                "$set": {
                    "is_winner": True,
                    "prize_rank": i + 1,
                    "prize_amount": prize_amount
                }
            }
        )
        
        # Credit winner's wallet
        from ledger import EntityType
        wallet = await ledger_service.get_wallet_by_entity(EntityType.CLIENT, winner["user_id"])
        if wallet:
            await db.wallets.update_one(
                {"id": wallet.id},
                {"$inc": {"available_balance": prize_amount, "balance": prize_amount}}
            )
    
    # Update lottery with winners
    await db.lotteries.update_one(
        {"id": lottery_id},
        {
            "$set": {
                "status": "COMPLETED",
                "winners": winner_results,
                "draw_date": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "message": "Lottery draw completed!",
        "winners": winner_results
    }

@sdm_router.post("/admin/lotteries/{lottery_id}/announce")
async def announce_lottery_results(lottery_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Announce lottery results via notification"""
    lottery = await db.lotteries.find_one({"id": lottery_id}, {"_id": 0})
    if not lottery:
        raise HTTPException(status_code=404, detail="Lottery not found")
    
    if lottery["status"] != "COMPLETED":
        raise HTTPException(status_code=400, detail="Lottery must be COMPLETED to announce")
    
    if lottery.get("is_announced"):
        raise HTTPException(status_code=400, detail="Results already announced")
    
    winners = lottery.get("winners", [])
    if not winners:
        raise HTTPException(status_code=400, detail="No winners to announce")
    
    # Create announcement message
    announcement_lines = [f"🎰 {lottery['name']} - Résultats!"]
    announcement_lines.append(f"🏆 Cagnotte totale: GHS {lottery['total_prize_pool']:.2f}")
    announcement_lines.append("")
    
    rank_emojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]
    for i, w in enumerate(winners):
        emoji = rank_emojis[i] if i < len(rank_emojis) else f"{i+1}."
        announcement_lines.append(f"{emoji} {w['name']} ({w['tier']}) - GHS {w['prize_amount']:.2f}")
    
    announcement_lines.append("")
    announcement_lines.append("Félicitations aux gagnants! 🎉")
    
    # Create notification for all users
    notification = {
        "id": str(uuid.uuid4()),
        "type": "lottery",
        "priority": "high",
        "title": f"🎰 {lottery['name']} - Gagnants!",
        "message": "\n".join(announcement_lines),
        "recipients": "all",
        "is_read": False,
        "lottery_id": lottery_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification)
    
    # Create individual notifications for winners
    for w in winners:
        winner_notification = {
            "id": str(uuid.uuid4()),
            "type": "lottery_win",
            "priority": "high",
            "title": f"🎉 Vous avez gagné au {lottery['name']}!",
            "message": f"Félicitations! Vous êtes {w['rank']}{'er' if w['rank'] == 1 else 'ème'} et avez gagné GHS {w['prize_amount']:.2f}! Le montant a été crédité sur votre compte.",
            "recipients": [w["user_id"]],
            "is_read": False,
            "lottery_id": lottery_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(winner_notification)
    
    # Mark as announced
    await db.lotteries.update_one(
        {"id": lottery_id},
        {"$set": {"is_announced": True}}
    )
    
    return {
        "message": "Results announced!",
        "notification_sent": True,
        "winners_notified": len(winners)
    }

@sdm_router.delete("/admin/lotteries/{lottery_id}")
async def delete_lottery(lottery_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Delete a lottery (only DRAFT status)"""
    lottery = await db.lotteries.find_one({"id": lottery_id}, {"_id": 0})
    if not lottery:
        raise HTTPException(status_code=404, detail="Lottery not found")
    
    if lottery["status"] != "DRAFT":
        raise HTTPException(status_code=400, detail="Can only delete DRAFT lotteries")
    
    await db.lotteries.delete_one({"id": lottery_id})
    return {"message": "Lottery deleted"}

# ==================== USER LOTTERY ENDPOINTS ====================

@sdm_router.get("/user/lotteries")
async def get_user_lotteries(user: dict = Depends(get_current_user)):
    """User: Get active and past lotteries"""
    # Get active lotteries
    active = await db.lotteries.find(
        {"status": "ACTIVE"},
        {"_id": 0}
    ).sort("end_date", 1).to_list(10)
    
    # Get recent completed lotteries
    completed = await db.lotteries.find(
        {"status": "COMPLETED"},
        {"_id": 0}
    ).sort("draw_date", -1).to_list(5)
    
    # Check user's participation
    participations = await db.lottery_participants.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    participation_map = {p["lottery_id"]: p for p in participations}
    
    return {
        "active_lotteries": active,
        "completed_lotteries": completed,
        "my_participations": participation_map
    }

@sdm_router.get("/lotteries/results")
async def get_public_lottery_results():
    """Public: Get announced lottery results"""
    results = await db.lotteries.find(
        {"status": "COMPLETED", "is_announced": True},
        {"_id": 0}
    ).sort("draw_date", -1).to_list(10)
    
    return {"results": results}

# ==================== AUTO LOTTERY CONFIGURATION ====================

class AutoLotteryConfigRequest(BaseModel):
    enabled: bool = True
    default_prize_amount: float = 500.0
    auto_activate: bool = True

@sdm_router.get("/admin/lottery-config")
async def get_auto_lottery_config(admin: dict = Depends(get_current_admin)):
    """Admin: Get auto lottery configuration"""
    config = await db.lottery_config.find_one({"id": "auto_lottery"}, {"_id": 0})
    if not config:
        # Default config
        config = {
            "id": "auto_lottery",
            "enabled": True,
            "default_prize_amount": 500.0,
            "auto_activate": True,
            "last_auto_created": None,
            "next_draw_month": None
        }
        await db.lottery_config.insert_one(config)
    return {"config": config}

@sdm_router.put("/admin/lottery-config")
async def update_auto_lottery_config(request: AutoLotteryConfigRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Update auto lottery configuration"""
    await db.lottery_config.update_one(
        {"id": "auto_lottery"},
        {
            "$set": {
                "enabled": request.enabled,
                "default_prize_amount": request.default_prize_amount,
                "auto_activate": request.auto_activate,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": admin.get("username")
            }
        },
        upsert=True
    )
    return {"message": "Auto lottery config updated"}

@sdm_router.post("/admin/lottery/trigger-monthly")
async def trigger_monthly_lottery(admin: dict = Depends(get_current_admin)):
    """Admin: Manually trigger monthly lottery creation (for testing or if scheduler missed)"""
    config = await db.lottery_config.find_one({"id": "auto_lottery"}, {"_id": 0})
    if not config:
        config = {"enabled": True, "default_prize_amount": 500.0, "auto_activate": True}
    
    # Get current month
    now = datetime.now(timezone.utc)
    current_month = f"{now.year}-{now.month:02d}"
    
    # Check if lottery for this month already exists
    existing = await db.lotteries.find_one({"month": current_month}, {"_id": 0})
    if existing:
        return {"message": f"Lottery for {current_month} already exists", "lottery_id": existing["id"], "created": False}
    
    # Create lottery for current month
    month_names = ["", "January", "February", "March", "April", "May", "June", 
                   "July", "August", "September", "October", "November", "December"]
    
    # Calculate start and end dates
    start_date = f"{now.year}-{now.month:02d}-01"
    if now.month == 12:
        last_day = 31
    else:
        # Get last day of current month
        next_month = datetime(now.year, now.month + 1, 1) if now.month < 12 else datetime(now.year + 1, 1, 1)
        last_day = (next_month - timedelta(days=1)).day
    end_date = f"{now.year}-{now.month:02d}-{last_day}"
    
    lottery = SDMLottery(
        name=f"{month_names[now.month]} {now.year} VIP Draw",
        description=f"Monthly VIP lottery for {month_names[now.month]} {now.year}",
        month=current_month,
        funding_source="FIXED",
        fixed_amount=config.get("default_prize_amount", 500.0),
        commission_percentage=0,
        total_prize_pool=config.get("default_prize_amount", 500.0),
        prize_distribution=[40, 25, 15, 12, 8],
        start_date=start_date,
        end_date=end_date,
        created_by="auto_system"
    )
    
    await db.lotteries.insert_one(lottery.model_dump())
    
    # Update config with last created date
    await db.lottery_config.update_one(
        {"id": "auto_lottery"},
        {
            "$set": {
                "last_auto_created": datetime.now(timezone.utc).isoformat(),
                "next_draw_month": f"{now.year}-{now.month + 1:02d}" if now.month < 12 else f"{now.year + 1}-01"
            }
        }
    )
    
    result = {"message": f"Lottery for {current_month} created", "lottery": lottery.model_dump(), "created": True}
    
    # Auto-activate if configured
    if config.get("auto_activate", True):
        # Get all active VIP members
        vip_members = await db.vip_memberships.find({"status": "active"}, {"_id": 0}).to_list(10000)
        tier_multipliers = {"SILVER": 1, "GOLD": 2, "PLATINUM": 3}
        
        total_entries = 0
        enrolled = 0
        
        for member in vip_members:
            user = await db.sdm_users.find_one({"id": member["user_id"]}, {"_id": 0})
            if not user:
                continue
            
            entries = tier_multipliers.get(member["tier"], 1)
            
            participant = LotteryParticipant(
                lottery_id=lottery.id,
                user_id=member["user_id"],
                user_phone=member["user_phone"],
                user_name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or "SDM Member",
                vip_tier=member["tier"],
                entries=entries
            )
            
            await db.lottery_participants.insert_one(participant.model_dump())
            total_entries += entries
            enrolled += 1
        
        # Update lottery status and counts
        await db.lotteries.update_one(
            {"id": lottery.id},
            {"$set": {
                "status": "ACTIVE",
                "total_participants": enrolled,
                "total_entries": total_entries,
                "activated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        result["auto_activated"] = True
        result["participants_enrolled"] = enrolled
        result["total_entries"] = total_entries
    
    return result

@sdm_router.get("/admin/scheduler/logs")
async def get_scheduler_logs(admin: dict = Depends(get_current_admin)):
    """Admin: Get scheduler execution logs"""
    logs = await db.scheduler_logs.find({}, {"_id": 0}).sort("executed_at", -1).to_list(50)
    return {"logs": logs}

@sdm_router.get("/admin/scheduler/status")
async def get_scheduler_status(admin: dict = Depends(get_current_admin)):
    """Admin: Get scheduler status and next run time"""
    job = scheduler.get_job("monthly_lottery")
    
    config = await db.lottery_config.find_one({"id": "auto_lottery"}, {"_id": 0})
    
    return {
        "scheduler_running": scheduler.running,
        "job_exists": job is not None,
        "next_run": str(job.next_run_time) if job else None,
        "config": config,
        "info": "Lottery auto-created on the 1st of each month at 00:05 UTC"
    }


# ==================== USER VIP CARD ENDPOINTS ====================

@sdm_router.get("/user/vip-cards")
async def get_available_vip_cards():
    """Public: Get available VIP card types for purchase"""
    cards = await db.vip_card_types.find({"is_active": True}, {"_id": 0}).sort("price", 1).to_list(10)
    
    # Seed if empty
    if not cards:
        for card_data in DEFAULT_VIP_CARDS:
            card = VIPCardType(**card_data)
            await db.vip_card_types.insert_one(card.model_dump())
        cards = await db.vip_card_types.find({"is_active": True}, {"_id": 0}).sort("price", 1).to_list(10)
    
    return {"cards": cards}

@sdm_router.get("/user/my-vip-membership")
async def get_my_vip_membership(user: dict = Depends(get_current_user)):
    """User: Get current VIP membership"""
    membership = await db.vip_memberships.find_one(
        {"user_id": user["id"], "status": "active"},
        {"_id": 0}
    )
    return {"membership": membership}

class PurchaseVIPCardRequest(BaseModel):
    card_type_id: str

@sdm_router.post("/user/vip-cards/purchase")
async def purchase_vip_card(request: PurchaseVIPCardRequest, user: dict = Depends(get_current_user)):
    """User: Purchase or upgrade VIP card using cashback balance"""
    from ledger import EntityType
    
    # Get card type
    card_type = await db.vip_card_types.find_one({"id": request.card_type_id, "is_active": True}, {"_id": 0})
    if not card_type:
        raise HTTPException(status_code=404, detail="VIP card type not found")
    
    # Check current membership
    current_membership = await db.vip_memberships.find_one(
        {"user_id": user["id"], "status": "active"},
        {"_id": 0}
    )
    
    price_to_pay = card_type["price"]
    is_upgrade = False
    
    # If upgrading, calculate price difference
    if current_membership:
        tier_order = {"SILVER": 1, "GOLD": 2, "PLATINUM": 3}
        current_tier = tier_order.get(current_membership["tier"], 0)
        new_tier = tier_order.get(card_type["tier"], 0)
        
        if new_tier <= current_tier:
            raise HTTPException(status_code=400, detail="Cannot downgrade or purchase same tier")
        
        # Calculate upgrade price (difference)
        current_card = await db.vip_card_types.find_one({"tier": current_membership["tier"]}, {"_id": 0})
        if current_card:
            price_to_pay = card_type["price"] - current_card["price"]
        is_upgrade = True
    
    # Check cashback balance
    wallet = await ledger_service.get_wallet_by_entity(EntityType.CLIENT, user["id"])
    if not wallet or wallet.available_balance < price_to_pay:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient cashback balance. Need: GHS {price_to_pay}, Available: GHS {wallet.available_balance if wallet else 0}"
        )
    
    # Debit cashback
    await db.wallets.update_one(
        {"id": wallet.id},
        {"$inc": {"available_balance": -price_to_pay, "balance": -price_to_pay}}
    )
    
    # Mark old membership as upgraded
    if current_membership:
        await db.vip_memberships.update_one(
            {"id": current_membership["id"]},
            {"$set": {"status": "upgraded"}}
        )
    
    # Create new membership
    expires_at = (datetime.now(timezone.utc) + timedelta(days=card_type["validity_days"])).isoformat()
    
    membership = VIPMembership(
        user_id=user["id"],
        user_phone=user["phone"],
        card_type_id=card_type["id"],
        tier=card_type["tier"],
        card_name=card_type["name"],
        price_paid=price_to_pay,
        payment_method="cashback",
        expires_at=expires_at,
        upgraded_from=current_membership["tier"] if current_membership else None
    )
    
    await db.vip_memberships.insert_one(membership.model_dump())
    
    # Update user record with VIP tier
    await db.sdm_users.update_one(
        {"id": user["id"]},
        {"$set": {
            "vip_tier": card_type["tier"],
            "vip_membership_id": membership.id,
            "monthly_withdrawal_limit": card_type["monthly_withdrawal_limit"]
        }}
    )
    
    # Award referral bonuses if this is first purchase and user was referred
    if not is_upgrade and user.get("referred_by"):
        # Award welcome bonus to user (1 GHS)
        await db.wallets.update_one(
            {"id": wallet.id},
            {"$inc": {"available_balance": REFERRAL_WELCOME_BONUS, "balance": REFERRAL_WELCOME_BONUS}}
        )
        
        # Award referrer bonus (3 GHS)
        referrer = await db.sdm_users.find_one({"id": user["referred_by"]})
        if referrer:
            referrer_wallet = await ledger_service.get_wallet_by_entity(EntityType.CLIENT, referrer["id"])
            if referrer_wallet:
                await db.wallets.update_one(
                    {"id": referrer_wallet.id},
                    {"$inc": {"available_balance": REFERRAL_BONUS, "balance": REFERRAL_BONUS}}
                )
                
                # Record referral bonus
                bonus_record = ReferralBonus(
                    referrer_id=referrer["id"],
                    referred_id=user["id"],
                    bonus_type="referrer_bonus",
                    amount=REFERRAL_BONUS
                )
                await db.referral_bonuses.insert_one(bonus_record.model_dump())
        
        # Mark as processed
        await db.vip_memberships.update_one(
            {"id": membership.id},
            {"$set": {"referrer_bonus_paid": True}}
        )
    
    return {
        "message": f"{'Upgraded to' if is_upgrade else 'Purchased'} {card_type['name']}!",
        "membership": membership.model_dump(),
        "price_paid": price_to_pay,
        "is_upgrade": is_upgrade,
        "referral_bonus_received": REFERRAL_WELCOME_BONUS if not is_upgrade and user.get("referred_by") else 0
    }

# ==================== ADMIN PROMOTIONS ENDPOINTS ====================

@sdm_router.post("/admin/promotions")
async def create_promotion(request: CreatePromotionRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Create a new service promotion"""
    promo = ServicePromotion(
        name=request.name,
        description=request.description,
        target_service=request.target_service.value,
        discount_percent=request.discount_percent,
        min_amount=request.min_amount,
        days_of_week=request.days_of_week,
        start_date=request.start_date,
        end_date=request.end_date,
        is_active=request.is_active
    )
    
    await db.service_promotions.insert_one(promo.model_dump())
    
    return {"message": "Promotion created", "promotion": promo.model_dump()}

@sdm_router.get("/admin/promotions")
async def get_promotions(admin: dict = Depends(get_current_admin)):
    """Admin: Get all promotions"""
    promotions = await db.service_promotions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"promotions": promotions}

@sdm_router.put("/admin/promotions/{promo_id}")
async def update_promotion(promo_id: str, request: CreatePromotionRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Update a promotion"""
    result = await db.service_promotions.update_one(
        {"id": promo_id},
        {
            "$set": {
                "name": request.name,
                "description": request.description,
                "target_service": request.target_service.value,
                "discount_percent": request.discount_percent,
                "min_amount": request.min_amount,
                "days_of_week": request.days_of_week,
                "start_date": request.start_date,
                "end_date": request.end_date,
                "is_active": request.is_active,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    return {"message": "Promotion updated"}

@sdm_router.delete("/admin/promotions/{promo_id}")
async def delete_promotion(promo_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Delete a promotion"""
    result = await db.service_promotions.delete_one({"id": promo_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    return {"message": "Promotion deleted"}

@sdm_router.patch("/admin/promotions/{promo_id}/toggle")
async def toggle_promotion(promo_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Toggle promotion active status"""
    promo = await db.service_promotions.find_one({"id": promo_id}, {"_id": 0})
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    new_status = not promo.get("is_active", True)
    await db.service_promotions.update_one(
        {"id": promo_id},
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Promotion {'activated' if new_status else 'deactivated'}", "is_active": new_status}

# ==================== TOP CLIENTS LEADERBOARD ====================

@sdm_router.get("/admin/leaderboard/cashback")
async def get_top_cashback_clients(
    period: str = "month",  # week, month, year
    limit: int = 10,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Get top clients by cashback earned"""
    now = datetime.now(timezone.utc)
    
    # Calculate start date based on period
    if period == "week":
        start_date = (now - timedelta(days=7)).isoformat()
        period_label = "Cette semaine"
    elif period == "year":
        start_date = (now - timedelta(days=365)).isoformat()
        period_label = "Cette année"
    else:  # month
        start_date = (now - timedelta(days=30)).isoformat()
        period_label = "Ce mois"
    
    # Aggregate cashback by user
    pipeline = [
        {
            "$match": {
                "created_at": {"$gte": start_date},
                "status": {"$in": ["available", "pending"]}
            }
        },
        {
            "$group": {
                "_id": "$user_id",
                "total_cashback": {"$sum": "$net_cashback"},
                "transaction_count": {"$sum": 1}
            }
        },
        {"$sort": {"total_cashback": -1}},
        {"$limit": limit}
    ]
    
    top_users = await db.sdm_transactions.aggregate(pipeline).to_list(limit)
    
    # Enrich with user details
    result = []
    for i, entry in enumerate(top_users, 1):
        user = await db.sdm_users.find_one({"id": entry["_id"]}, {"_id": 0, "id": 1, "phone": 1, "first_name": 1, "last_name": 1})
        if user:
            result.append({
                "rank": i,
                "user_id": entry["_id"],
                "phone": user.get("phone", "N/A"),
                "name": f"{user.get('first_name') or ''} {user.get('last_name') or ''}".strip() or "Client SDM",
                "total_cashback": round(entry["total_cashback"], 2),
                "transaction_count": entry["transaction_count"]
            })
    
    return {
        "period": period,
        "period_label": period_label,
        "top_clients": result
    }

@sdm_router.get("/admin/leaderboard/services")
async def get_top_service_users(
    period: str = "month",  # week, month, year
    limit: int = 10,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Get top clients by service usage (cashback spent)"""
    now = datetime.now(timezone.utc)
    
    # Calculate start date based on period
    if period == "week":
        start_date = (now - timedelta(days=7)).isoformat()
        period_label = "Cette semaine"
    elif period == "year":
        start_date = (now - timedelta(days=365)).isoformat()
        period_label = "Cette année"
    else:  # month
        start_date = (now - timedelta(days=30)).isoformat()
        period_label = "Ce mois"
    
    # Aggregate service usage by user
    pipeline = [
        {
            "$match": {
                "created_at": {"$gte": start_date},
                "status": "SUCCESS"
            }
        },
        {
            "$group": {
                "_id": "$user_id",
                "total_spent": {"$sum": "$amount"},
                "transaction_count": {"$sum": 1},
                "services_used": {"$addToSet": "$service_type"}
            }
        },
        {"$sort": {"total_spent": -1}},
        {"$limit": limit}
    ]
    
    top_users = await db.service_transactions.aggregate(pipeline).to_list(limit)
    
    # Enrich with user details
    result = []
    for i, entry in enumerate(top_users, 1):
        user = await db.sdm_users.find_one({"id": entry["_id"]}, {"_id": 0, "id": 1, "phone": 1, "first_name": 1, "last_name": 1})
        if user:
            result.append({
                "rank": i,
                "user_id": entry["_id"],
                "phone": user.get("phone", "N/A"),
                "name": f"{user.get('first_name') or ''} {user.get('last_name') or ''}".strip() or "Client SDM",
                "total_spent": round(entry["total_spent"], 2),
                "transaction_count": entry["transaction_count"],
                "services_used": entry["services_used"]
            })
    
    return {
        "period": period,
        "period_label": period_label,
        "top_clients": result
    }

@sdm_router.post("/admin/leaderboard/announce")
async def announce_top_clients(
    period: str = "month",
    admin: dict = Depends(get_current_admin)
):
    """Admin: Announce top clients via notification"""
    # Get top cashback earner
    cashback_leaders = await get_top_cashback_clients(period=period, limit=3, admin=admin)
    service_leaders = await get_top_service_users(period=period, limit=3, admin=admin)
    
    period_label = {
        "week": "de la semaine",
        "month": "du mois",
        "year": "de l'année"
    }.get(period, "du mois")
    
    # Create announcement notification
    announcement_parts = []
    
    if cashback_leaders["top_clients"]:
        top = cashback_leaders["top_clients"][0]
        announcement_parts.append(f"🏆 Meilleur Cashback {period_label}: {top['name']} avec GHS {top['total_cashback']:.2f}!")
    
    if service_leaders["top_clients"]:
        top = service_leaders["top_clients"][0]
        announcement_parts.append(f"⭐ Champion Services {period_label}: {top['name']} avec GHS {top['total_spent']:.2f} utilisés!")
    
    if not announcement_parts:
        return {"message": "No data to announce"}
    
    announcement_message = "\n".join(announcement_parts)
    
    # Create notification for all users
    notification = {
        "id": str(uuid.uuid4()),
        "type": "promo",
        "priority": "high",
        "title": f"🎉 Top Clients SDM {period_label.title()}",
        "message": announcement_message,
        "recipients": "all",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification)
    
    return {
        "message": "Announcement sent",
        "notification": {k: v for k, v in notification.items() if k != "_id"},
        "cashback_winners": cashback_leaders["top_clients"][:3],
        "service_winners": service_leaders["top_clients"][:3]
    }

# Import for ledger models
from ledger import LedgerEntry, LedgerTransaction, TransactionStatus, EntryType

# ==================== AUTO LOTTERY SCHEDULER ====================

scheduler = AsyncIOScheduler()

async def auto_create_monthly_lottery():
    """Automatically create and activate monthly lottery on the 1st of each month"""
    try:
        logging.info("🎰 Auto Lottery Scheduler: Starting monthly lottery creation...")
        
        # Get config
        config = await db.lottery_config.find_one({"id": "auto_lottery"}, {"_id": 0})
        if not config or not config.get("enabled", True):
            logging.info("Auto lottery is disabled. Skipping.")
            return
        
        # Get current month
        now = datetime.now(timezone.utc)
        current_month = f"{now.year}-{now.month:02d}"
        
        # Check if lottery for this month already exists
        existing = await db.lotteries.find_one({"month": current_month}, {"_id": 0})
        if existing:
            logging.info(f"Lottery for {current_month} already exists. Skipping.")
            return
        
        # Create lottery
        month_names = ["", "January", "February", "March", "April", "May", "June", 
                       "July", "August", "September", "October", "November", "December"]
        
        # Calculate dates
        start_date = f"{now.year}-{now.month:02d}-01"
        if now.month == 12:
            last_day = 31
        else:
            next_month = datetime(now.year, now.month + 1, 1) if now.month < 12 else datetime(now.year + 1, 1, 1)
            last_day = (next_month - timedelta(days=1)).day
        end_date = f"{now.year}-{now.month:02d}-{last_day}"
        
        prize_amount = config.get("default_prize_amount", 500.0)
        
        lottery = SDMLottery(
            name=f"{month_names[now.month]} {now.year} VIP Draw",
            description=f"Automatic monthly VIP lottery for {month_names[now.month]} {now.year}",
            month=current_month,
            funding_source="FIXED",
            fixed_amount=prize_amount,
            commission_percentage=0,
            total_prize_pool=prize_amount,
            prize_distribution=[40, 25, 15, 12, 8],
            start_date=start_date,
            end_date=end_date,
            created_by="auto_scheduler"
        )
        
        await db.lotteries.insert_one(lottery.model_dump())
        logging.info(f"✅ Created lottery: {lottery.name} with prize pool GHS {prize_amount}")
        
        # Update config
        await db.lottery_config.update_one(
            {"id": "auto_lottery"},
            {
                "$set": {
                    "last_auto_created": datetime.now(timezone.utc).isoformat(),
                    "next_draw_month": f"{now.year}-{now.month + 1:02d}" if now.month < 12 else f"{now.year + 1}-01"
                }
            }
        )
        
        # Auto-activate if configured
        if config.get("auto_activate", True):
            vip_members = await db.vip_memberships.find({"status": "active"}, {"_id": 0}).to_list(10000)
            tier_multipliers = {"SILVER": 1, "GOLD": 2, "PLATINUM": 3}
            
            total_entries = 0
            enrolled = 0
            
            for member in vip_members:
                user = await db.sdm_users.find_one({"id": member["user_id"]}, {"_id": 0})
                if not user:
                    continue
                
                entries = tier_multipliers.get(member["tier"], 1)
                
                participant = LotteryParticipant(
                    lottery_id=lottery.id,
                    user_id=member["user_id"],
                    user_phone=member["user_phone"],
                    user_name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or "SDM Member",
                    vip_tier=member["tier"],
                    entries=entries
                )
                
                await db.lottery_participants.insert_one(participant.model_dump())
                total_entries += entries
                enrolled += 1
            
            # Update lottery status
            await db.lotteries.update_one(
                {"id": lottery.id},
                {"$set": {
                    "status": "ACTIVE",
                    "total_participants": enrolled,
                    "total_entries": total_entries,
                    "activated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logging.info(f"✅ Auto-activated lottery with {enrolled} participants and {total_entries} entries")
        
        # Log to scheduler history
        await db.scheduler_logs.insert_one({
            "id": str(uuid.uuid4()),
            "job_type": "auto_lottery",
            "status": "SUCCESS",
            "lottery_id": lottery.id,
            "lottery_name": lottery.name,
            "participants": enrolled if config.get("auto_activate", True) else 0,
            "executed_at": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logging.error(f"❌ Auto Lottery Scheduler Error: {str(e)}")
        await db.scheduler_logs.insert_one({
            "id": str(uuid.uuid4()),
            "job_type": "auto_lottery",
            "status": "ERROR",
            "error": str(e),
            "executed_at": datetime.now(timezone.utc).isoformat()
        })

# Schedule: Run at 00:05 UTC on the 1st of every month
scheduler.add_job(
    auto_create_monthly_lottery,
    CronTrigger(day=1, hour=0, minute=5),
    id="monthly_lottery",
    name="Auto Monthly Lottery Creator",
    replace_existing=True
)

# Include routers
app.include_router(api_router)
app.include_router(sdm_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_scheduler():
    """Start the scheduler on app startup"""
    scheduler.start()
    logging.info("🚀 Auto Lottery Scheduler started - Will run on 1st of each month at 00:05 UTC")

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown()
    client.close()
    logging.info("Scheduler and DB connection closed")
