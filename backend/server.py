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

# Import Payment Service
from services.bulkclix_payment import bulkclix_payment_service

# Import utility functions from refactored modules
from utils.helpers import (
    hash_password,
    verify_password,
    create_token,
    generate_otp,
    normalize_phone,
    generate_qr_code_base64,
    parse_user_agent,
    generate_referral_code,
    format_currency,
    mask_phone
)

# Import configuration constants
from config import (
    JWT_SECRET,
    JWT_ALGORITHM,
    RESEND_API_KEY,
    SENDER_EMAIL,
    ADMIN_EMAIL,
    HUBTEL_CLIENT_ID,
    HUBTEL_CLIENT_SECRET,
    HUBTEL_SENDER_ID,
    BULKCLIX_API_KEY,
    BULKCLIX_OTP_SENDER_ID,
    BULKCLIX_BASE_URL,
    SDM_COMMISSION_RATE,
    CASHBACK_PENDING_DAYS,
    WITHDRAWAL_FEE,
    DEFAULT_CASH_DEBIT_LIMIT,
    DEFAULT_GRACE_PERIOD_DAYS,
    MAX_CASH_CASHBACK_RATE,
    REFERRAL_BONUS,
    REFERRAL_WELCOME_BONUS,
    TEST_PHONE,
    TEST_OTP,
    ADMIN_ROLES,
    DEFAULT_VIP_CARDS,
    DEFAULT_SDM_CONFIG
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Ledger Service
ledger_service = LedgerService(db)

# NOTE: DEFAULT_SDM_CONFIG is now imported from config.py
# Additional DB-specific config can be extended in get_sdm_config()

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
    role: str = "admin"  # super_admin, admin, viewer
    permissions: List[str] = Field(default_factory=lambda: ["view_users", "view_merchants", "view_logs"])
    is_active: bool = True
    created_by: Optional[str] = None
    last_login: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# NOTE: ADMIN_ROLES is now imported from config.py

class AdminLogin(BaseModel):
    username: str
    password: str

class CreateAdminRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "admin"
    permissions: Optional[List[str]] = None

class ChangeAdminPasswordRequest(BaseModel):
    current_password: Optional[str] = None  # Not required for super_admin changing others
    new_password: str
    target_admin_id: Optional[str] = None  # For super_admin changing other admin's password

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
    birth_date: Optional[str] = None  # Format: YYYY-MM-DD for birthday bonus
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
    wallet_frozen: bool = False  # Admin can freeze wallet
    total_earned: float = 0.0
    total_withdrawn: float = 0.0
    is_active: bool = True
    
    # Admin Controls
    is_blocked: bool = False
    is_suspended: bool = False
    block_reason: Optional[str] = None
    blocked_at: Optional[str] = None
    blocked_by: Optional[str] = None
    
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
    cashback_rate: float = 5.0  # Percentage (5.0 means 5%)
    cashback_enabled: bool = True
    api_key: str = Field(default_factory=lambda: f"sdk_{secrets.token_hex(16)}")
    api_secret: str = Field(default_factory=lambda: secrets.token_hex(32))
    qr_code: str = Field(default_factory=lambda: f"MERCH_{secrets.token_hex(6).upper()}")
    is_active: bool = True
    is_verified: bool = False
    subscription_plan: str = "basic"  # basic, pro, enterprise
    subscription_expires: Optional[str] = None
    total_transactions: int = 0
    total_cashback_given: float = 0.0
    balance: float = 0.0  # Merchant balance for cashback pool
    staff: List[Dict] = Field(default_factory=list)
    
    # Payment Settlement Configuration (REQUIRED)
    settlement_type: str = "momo"  # momo, bank
    momo_number: Optional[str] = None  # Mobile Money number for settlements
    momo_provider: Optional[str] = None  # MTN, Vodafone, AirtelTigo
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_branch: Optional[str] = None
    settlement_mode: str = "instant"  # instant, daily
    
    # Cash Payment Mode Settings
    cash_mode_enabled: bool = True
    cash_debit_balance: float = 0.0  # Current cash debit balance (can be negative)
    cash_debit_limit: float = 5000.0  # Maximum allowed negative balance
    cash_grace_period_days: int = 3  # Days before blocking cash mode
    cash_grace_deadline: Optional[str] = None  # Date when grace period expires
    max_cash_cashback_rate: float = 15.0  # Max cashback % for cash payments
    
    # Admin Controls
    is_blocked: bool = False
    is_suspended: bool = False
    block_reason: Optional[str] = None
    blocked_at: Optional[str] = None
    blocked_by: Optional[str] = None
    
    # Security PIN for Settings access
    settings_pin_hash: Optional[str] = None  # 4-6 digit PIN for settings access
    settings_pin_attempts: int = 0  # Failed attempts counter
    settings_locked_until: Optional[str] = None  # Lock time if too many attempts
    
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

# ============ PAYMENT SYSTEM MODELS ============

class PaymentMethod(str, Enum):
    """Payment method types"""
    MOMO = "momo"
    CARD = "card"
    CASH = "cash"

class PaymentStatus(str, Enum):
    """Payment status types"""
    PENDING = "pending"
    PROCESSING = "processing"
    CONFIRMED = "confirmed"
    SPLIT_COMPLETED = "split_completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class SDMPayment(BaseModel):
    """SDM Payment Record - Tracks all payment transactions"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_ref: str = Field(default_factory=lambda: f"PAY{datetime.now().strftime('%Y%m%d%H%M%S')}{secrets.token_hex(4).upper()}")
    
    # Transaction parties
    client_id: str
    client_phone: str
    merchant_id: str
    merchant_name: str
    
    # Payment details
    amount: float  # Total payment amount
    payment_method: str  # momo, card, cash
    
    # For MoMo/Card payments
    payer_phone: Optional[str] = None  # Phone used for MoMo payment
    payer_network: Optional[str] = None  # MTN, Vodafone, AirtelTigo
    card_last_four: Optional[str] = None  # Last 4 digits of card
    
    # External provider references
    bulkclix_ref: Optional[str] = None  # Bulkclix transaction reference
    provider_ref: Optional[str] = None  # MoMo/Card provider reference
    
    # Split calculation
    cashback_rate: float  # Merchant's cashback rate at time of payment
    cashback_amount: float  # Amount going to client wallet
    sdm_commission: float  # SDM's commission
    merchant_amount: float  # Amount going to merchant
    
    # Status tracking
    status: str = "pending"  # pending, processing, confirmed, split_completed, failed
    payment_confirmed_at: Optional[str] = None
    split_completed_at: Optional[str] = None
    
    # Settlement to merchant
    settlement_status: str = "pending"  # pending, processing, completed, failed
    settlement_ref: Optional[str] = None
    settlement_completed_at: Optional[str] = None
    
    # QR scan info
    initiated_by: str = "client"  # client (scanned merchant) or merchant (scanned client)
    
    # Cash payment specific
    client_confirmed: bool = False  # Client confirmation for cash payments
    client_confirmed_at: Optional[str] = None
    
    # Metadata
    notes: Optional[str] = None
    error_message: Optional[str] = None
    webhook_received: bool = False
    webhook_data: Optional[Dict] = None
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MerchantCashDebitLog(BaseModel):
    """Log of merchant cash debit balance changes"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    merchant_id: str
    merchant_name: str
    
    # Balance change
    previous_balance: float
    change_amount: float  # Negative for debits
    new_balance: float
    
    # Context
    reason: str  # cash_payment, daily_settlement, manual_adjustment, top_up
    payment_id: Optional[str] = None
    settlement_date: Optional[str] = None
    
    # Admin info (for manual adjustments)
    adjusted_by: Optional[str] = None
    adjustment_notes: Optional[str] = None
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AdminActionLog(BaseModel):
    """Log of admin actions on accounts"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Admin info
    admin_id: str
    admin_email: str
    
    # Target info
    target_type: str  # client, merchant
    target_id: str
    target_identifier: str  # Phone or business name
    
    # Action details
    action: str  # block, unblock, suspend, unsuspend, delete, freeze_wallet, unfreeze_wallet, adjust_balance
    action_details: Dict = Field(default_factory=dict)
    reason: Optional[str] = None
    
    # Previous state (for rollback reference)
    previous_state: Dict = Field(default_factory=dict)
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PendingCashPayment(BaseModel):
    """Pending cash payment awaiting client confirmation"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_id: str  # Reference to SDMPayment
    
    client_id: str
    merchant_id: str
    merchant_name: str
    amount: float
    cashback_amount: float
    
    # Expiry (client must confirm within X minutes)
    expires_at: str
    
    # Status
    status: str = "pending"  # pending, confirmed, expired, cancelled
    
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
    birth_date: Optional[str] = None  # Format: YYYY-MM-DD

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
    cashback_rate: float = 5.0  # Percentage (5.0 = 5%)
    
    # Payment Settlement Configuration (REQUIRED)
    settlement_type: str = "momo"  # momo, bank
    momo_number: Optional[str] = None
    momo_provider: Optional[str] = None  # MTN, Vodafone, AirtelTigo
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_branch: Optional[str] = None
    settlement_mode: str = "instant"  # instant, daily

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

# ============ PAYMENT SYSTEM REQUESTS ============

class InitiatePaymentRequest(BaseModel):
    """Request to initiate a payment"""
    merchant_qr_code: Optional[str] = None  # If client scans merchant QR
    client_qr_code: Optional[str] = None  # If merchant scans client QR
    amount: float
    payment_method: str  # momo, card, cash
    payer_phone: Optional[str] = None  # Phone for MoMo payment
    payer_network: Optional[str] = None  # MTN, Vodafone, AirtelTigo
    notes: Optional[str] = None

class ConfirmCashPaymentRequest(BaseModel):
    """Client confirmation for cash payment"""
    payment_id: str
    confirm: bool = True

class UpdateMerchantSettlementRequest(BaseModel):
    """Update merchant settlement configuration"""
    settlement_type: Optional[str] = None  # momo, bank
    momo_number: Optional[str] = None
    momo_provider: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_branch: Optional[str] = None
    settlement_mode: Optional[str] = None  # instant, daily
    otp_code: Optional[str] = None  # Required for sensitive changes
    request_id: Optional[str] = None

class AdminMerchantControlRequest(BaseModel):
    """Admin control over merchant"""
    action: str  # block, unblock, suspend, unsuspend, update_cash_limit, toggle_cash_mode
    reason: Optional[str] = None
    cash_debit_limit: Optional[float] = None
    cash_grace_period_days: Optional[int] = None
    max_cash_cashback_rate: Optional[float] = None

class AdminClientControlRequest(BaseModel):
    """Admin control over client"""
    action: str  # block, unblock, suspend, unsuspend, delete, freeze_wallet, unfreeze_wallet, adjust_balance
    reason: Optional[str] = None
    balance_adjustment: Optional[float] = None  # Positive or negative
    adjustment_type: Optional[str] = None  # add, subtract, set

class MerchantCashTopUpRequest(BaseModel):
    """Merchant top-up for cash debit account"""
    amount: float
    payment_method: str  # momo, bank_transfer
    reference: Optional[str] = None

# ============ SECURITY PIN REQUESTS ============

class SetSettingsPINRequest(BaseModel):
    """Set or update the settings PIN"""
    pin: str  # 4-6 digit PIN
    otp_code: str  # OTP for verification
    request_id: str  # OTP request ID

class VerifySettingsPINRequest(BaseModel):
    """Verify PIN to access settings"""
    pin: str

class ResetSettingsPINRequest(BaseModel):
    """Reset PIN via OTP"""
    otp_code: str
    request_id: str
    new_pin: str

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
# NOTE: Core helper functions have been extracted to utils/helpers.py
# The following functions are now imported at the top of this file:
# - hash_password, verify_password, create_token
# - generate_otp, normalize_phone
# - generate_qr_code_base64, parse_user_agent
# - generate_referral_code, format_currency, mask_phone

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

async def send_sms_bulkclix(phone: str, message: str) -> dict:
    """Send simple SMS notification via BulkClix API"""
    if not BULKCLIX_API_KEY:
        logger.warning("BulkClix API key not configured")
        return {"success": False, "error": "SMS service not configured"}
    
    # Normalize phone for BulkClix
    phone_clean = phone.replace("+", "").replace(" ", "")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BULKCLIX_BASE_URL}/sms-api/send",
                json={
                    "sender_id": BULKCLIX_OTP_SENDER_ID or "SDMRewards",
                    "recipients": [phone_clean],
                    "message": message,
                    "type": "transactional"
                },
                headers={
                    "x-api-key": BULKCLIX_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"SMS sent to {phone_clean}")
                return {"success": True}
            else:
                logger.error(f"BulkClix SMS error: {response.text}")
                return {"success": False, "error": response.text}
    except Exception as e:
        logger.error(f"BulkClix SMS error: {str(e)}")
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
        identifier = payload.get("sub")
        if payload.get("type") != "admin":
            raise HTTPException(status_code=401, detail="Invalid token type")
        # Search by username or email (token contains email or username)
        admin = await db.admins.find_one(
            {"$or": [{"username": identifier}, {"email": identifier}]}, 
            {"_id": 0}
        )
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

@api_router.get("/server-info")
async def get_server_info():
    """Get server IP for whitelisting purposes (BulkClix, etc.)"""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("https://api.ipify.org?format=json")
            ip_data = response.json()
            return {
                "server_ip": ip_data.get("ip"),
                "environment": os.environ.get("ENVIRONMENT", "production"),
                "message": "Use this IP for BulkClix whitelisting"
            }
    except Exception as e:
        return {"error": str(e), "message": "Could not fetch server IP"}

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
    doc["role"] = "super_admin"
    await db.admins.insert_one(doc)
    return {"message": "Admin created", "email": "emileparfait2003@gmail.com"}

# ============== ADMIN MANAGEMENT ROUTES ==============

@api_router.get("/admin/profile")
async def get_admin_profile(admin: dict = Depends(get_current_admin)):
    """Get current admin profile"""
    return {
        "id": admin.get("id"),
        "username": admin.get("username"),
        "email": admin.get("email"),
        "role": admin.get("role", "admin"),
        "permissions": admin.get("permissions", ADMIN_ROLES.get(admin.get("role", "admin"), {}).get("permissions", [])),
        "last_login": admin.get("last_login"),
        "created_at": admin.get("created_at")
    }

@api_router.post("/admin/change-password")
async def change_admin_password(request: ChangeAdminPasswordRequest, admin: dict = Depends(get_current_admin)):
    """Change admin password (own or other admin if super_admin)"""
    admin_role = admin.get("role", "admin")
    
    # If changing own password
    if not request.target_admin_id or request.target_admin_id == admin.get("id"):
        # Verify current password
        if not request.current_password:
            raise HTTPException(status_code=400, detail="Current password required")
        if not verify_password(request.current_password, admin["password_hash"]):
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        
        # Update password
        new_hash = hash_password(request.new_password)
        await db.admins.update_one(
            {"id": admin["id"]},
            {"$set": {"password_hash": new_hash}}
        )
        return {"success": True, "message": "Password changed successfully"}
    
    # If changing another admin's password (super_admin only)
    if admin_role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can change other admin's password")
    
    target_admin = await db.admins.find_one({"id": request.target_admin_id}, {"_id": 0})
    if not target_admin:
        raise HTTPException(status_code=404, detail="Target admin not found")
    
    # Super admin can reset without knowing current password
    new_hash = hash_password(request.new_password)
    await db.admins.update_one(
        {"id": request.target_admin_id},
        {"$set": {"password_hash": new_hash}}
    )
    
    # Log the action
    action_log = AdminActionLog(
        admin_id=admin["id"],
        admin_email=admin.get("email", admin["username"]),
        target_type="admin",
        target_id=request.target_admin_id,
        target_identifier=target_admin.get("email", target_admin["username"]),
        action="reset_password",
        reason="Password reset by super admin"
    )
    await db.admin_action_logs.insert_one(action_log.model_dump())
    
    return {"success": True, "message": f"Password reset for {target_admin.get('email', target_admin['username'])}"}

@api_router.get("/admin/list")
async def list_admins(admin: dict = Depends(get_current_admin)):
    """List all admin accounts (super_admin only)"""
    admin_role = admin.get("role", "admin")
    if admin_role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can view admin list")
    
    admins = await db.admins.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return {"admins": admins}

@api_router.post("/admin/create")
async def create_admin(request: CreateAdminRequest, admin: dict = Depends(get_current_admin)):
    """Create a new admin account (super_admin only)"""
    admin_role = admin.get("role", "admin")
    if admin_role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can create new admins")
    
    # Validate role
    if request.role not in ADMIN_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {list(ADMIN_ROLES.keys())}")
    
    # Check if username/email already exists
    existing = await db.admins.find_one(
        {"$or": [{"username": request.username}, {"email": request.email}]},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Admin with this username or email already exists")
    
    # Create new admin
    new_admin = AdminUser(
        username=request.username,
        password_hash=hash_password(request.password),
        email=request.email,
        role=request.role,
        permissions=request.permissions or ADMIN_ROLES[request.role]["permissions"],
        created_by=admin["id"]
    )
    
    await db.admins.insert_one(new_admin.model_dump())
    
    # Log the action
    action_log = AdminActionLog(
        admin_id=admin["id"],
        admin_email=admin.get("email", admin["username"]),
        target_type="admin",
        target_id=new_admin.id,
        target_identifier=request.email,
        action="create_admin",
        action_details={"role": request.role},
        reason=f"New admin created with role: {request.role}"
    )
    await db.admin_action_logs.insert_one(action_log.model_dump())
    
    return {
        "success": True,
        "message": f"Admin {request.email} created successfully",
        "admin": {
            "id": new_admin.id,
            "username": request.username,
            "email": request.email,
            "role": request.role
        }
    }

@api_router.put("/admin/{admin_id}/role")
async def update_admin_role(admin_id: str, body: dict, admin: dict = Depends(get_current_admin)):
    """Update admin role (super_admin only)"""
    admin_role = admin.get("role", "admin")
    if admin_role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can change admin roles")
    
    if admin_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    new_role = body.get("role")
    if new_role not in ADMIN_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {list(ADMIN_ROLES.keys())}")
    
    target_admin = await db.admins.find_one({"id": admin_id}, {"_id": 0})
    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    await db.admins.update_one(
        {"id": admin_id},
        {"$set": {
            "role": new_role,
            "permissions": ADMIN_ROLES[new_role]["permissions"]
        }}
    )
    
    # Log the action
    action_log = AdminActionLog(
        admin_id=admin["id"],
        admin_email=admin.get("email", admin["username"]),
        target_type="admin",
        target_id=admin_id,
        target_identifier=target_admin.get("email", target_admin["username"]),
        action="change_role",
        action_details={"old_role": target_admin.get("role"), "new_role": new_role},
        previous_state={"role": target_admin.get("role")}
    )
    await db.admin_action_logs.insert_one(action_log.model_dump())
    
    return {"success": True, "message": f"Admin role updated to {new_role}"}

@api_router.delete("/admin/{admin_id}")
async def delete_admin(admin_id: str, admin: dict = Depends(get_current_admin)):
    """Delete an admin account (super_admin only)"""
    admin_role = admin.get("role", "admin")
    if admin_role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can delete admins")
    
    if admin_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    target_admin = await db.admins.find_one({"id": admin_id}, {"_id": 0})
    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Prevent deleting other super_admins
    if target_admin.get("role") == "super_admin":
        raise HTTPException(status_code=400, detail="Cannot delete another super admin")
    
    await db.admins.delete_one({"id": admin_id})
    
    # Log the action
    action_log = AdminActionLog(
        admin_id=admin["id"],
        admin_email=admin.get("email", admin["username"]),
        target_type="admin",
        target_id=admin_id,
        target_identifier=target_admin.get("email", target_admin["username"]),
        action="delete_admin",
        previous_state=target_admin
    )
    await db.admin_action_logs.insert_one(action_log.model_dump())
    
    return {"success": True, "message": "Admin deleted"}

@api_router.get("/admin/roles")
async def get_admin_roles(admin: dict = Depends(get_current_admin)):
    """Get available admin roles and permissions"""
    return {"roles": ADMIN_ROLES}

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

# NOTE: Test account credentials (TEST_PHONE, TEST_OTP) are now imported from config.py

async def verify_otp_helper(phone: str, otp_code: str, request_id: str) -> bool:
    """Helper function to verify OTP for internal use (PIN operations)"""
    normalized_phone = normalize_phone(phone)
    
    # Test account - accept TEST_OTP
    if normalized_phone == normalize_phone(TEST_PHONE):
        return otp_code == TEST_OTP
    
    # Verify via BulkClix
    result = await verify_otp_bulkclix(normalized_phone, otp_code, request_id)
    return result.get("success", False)

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
        full_name=request.full_name,
        birth_date=request.birth_date
    )
    
    # Handle referral - only store referred_by, bonuses paid on card purchase
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
            # NO bonus given at registration - will be given when membership card is purchased
    
    # Set membership status as pending (will be active after card purchase)
    new_user_data = new_user.model_dump()
    new_user_data["membership_status"] = "pending"  # pending, active
    new_user_data["membership_confirmed_at"] = None
    
    await db.sdm_users.insert_one(new_user_data)
    
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
    user_data["membership_status"] = "pending"
    
    return {
        "message": "Registration successful. Please purchase a membership card to activate your account.",
        "access_token": token,
        "token_type": "bearer",
        "user": user_data,
        "membership_status": "pending",
        "referral_bonus_pending": REFERRAL_WELCOME_BONUS if new_user.referred_by else 0
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
        cashback_rate=request.cashback_rate,
        # Settlement configuration
        settlement_type=request.settlement_type,
        momo_number=request.momo_number,
        momo_provider=request.momo_provider,
        bank_name=request.bank_name,
        bank_account_number=request.bank_account_number,
        bank_account_name=request.bank_account_name,
        bank_branch=request.bank_branch,
        settlement_mode=request.settlement_mode
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
    
    # Send welcome SMS to merchant (pending verification notification)
    try:
        sms_message = f"Welcome to SDM Rewards! Your merchant account '{request.business_name}' is pending verification. You will be notified once approved. Questions? Contact support."
        await send_sms_bulkclix(phone, sms_message)
    except Exception as e:
        print(f"Warning: Failed to send welcome SMS to merchant: {e}")
    
    # Notify admin about new merchant registration
    try:
        admin_notification = Notification(
            recipient_type="admin",
            title="New Merchant Registration",
            message=f"New merchant '{request.business_name}' registered and awaiting verification. Phone: {phone}",
            notification_type="alert",
            priority="high"
        )
        await db.notifications.insert_one(admin_notification.model_dump())
    except Exception as e:
        print(f"Warning: Failed to create admin notification: {e}")
    
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
async def update_merchant_settings(
    body: dict,
    merchant: dict = Depends(get_current_merchant)
):
    """Update merchant settings including cashback rate"""
    updates = {}
    
    # Update cashback rate
    if "cashback_rate" in body:
        cashback_rate = body["cashback_rate"]
        if cashback_rate is not None:
            if cashback_rate < 0 or cashback_rate > 50:
                raise HTTPException(status_code=400, detail="Cashback rate must be between 0% and 50%")
            updates["cashback_rate"] = float(cashback_rate)
    
    # Enable/disable cashback
    if "cashback_enabled" in body:
        updates["cashback_enabled"] = bool(body["cashback_enabled"])
    
    # Update business info
    if "business_name" in body:
        updates["business_name"] = body["business_name"]
    if "business_category" in body:
        updates["business_category"] = body["business_category"]
    if "gps_location" in body:
        updates["gps_location"] = body["gps_location"]
    if "city" in body:
        updates["city"] = body["city"]
    
    if updates:
        await db.sdm_merchants.update_one({"id": merchant["id"]}, {"$set": updates})
    
    # Get updated merchant data
    updated_merchant = await db.sdm_merchants.find_one({"id": merchant["id"]}, {"_id": 0, "password_hash": 0})
    
    return {"message": "Settings updated", "merchant": updated_merchant}

# ============ MERCHANT SETTLEMENT CONFIGURATION ============

@sdm_router.post("/merchant/verify-momo")
async def verify_momo_account(phone_number: str, merchant: dict = Depends(get_current_merchant)):
    """Verify MoMo account name for settlement configuration"""
    result = await bulkclix_payment_service.verify_account_name(phone_number)
    
    if result.get("success") and result.get("verified"):
        return {
            "success": True,
            "verified": True,
            "account_name": result.get("account_name"),
            "phone_number": phone_number
        }
    elif result.get("success"):
        return {
            "success": True,
            "verified": False,
            "message": "Could not verify account name",
            "phone_number": phone_number
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Verification failed")
        )

@sdm_router.put("/merchant/settlement")
async def update_merchant_settlement(
    request: UpdateMerchantSettlementRequest,
    merchant: dict = Depends(get_current_merchant)
):
    """Update merchant settlement configuration with KYC verification"""
    updates = {}
    now = datetime.now(timezone.utc).isoformat()
    
    # Settlement type
    if request.settlement_type:
        if request.settlement_type not in ["momo", "bank"]:
            raise HTTPException(status_code=400, detail="Settlement type must be 'momo' or 'bank'")
        updates["settlement_type"] = request.settlement_type
    
    # MoMo settings with KYC verification
    if request.momo_number:
        # Verify MoMo account first
        kyc_result = await bulkclix_payment_service.verify_account_name(request.momo_number)
        
        if kyc_result.get("success") and kyc_result.get("verified"):
            updates["momo_number"] = request.momo_number
            updates["momo_provider"] = request.momo_provider
            updates["momo_account_name"] = kyc_result.get("account_name")
            updates["momo_verified"] = True
            updates["momo_verified_at"] = now
        else:
            # Allow update but mark as unverified
            updates["momo_number"] = request.momo_number
            updates["momo_provider"] = request.momo_provider
            updates["momo_verified"] = False
            updates["momo_verification_error"] = kyc_result.get("error", "Verification failed")
    
    if request.momo_provider:
        # Normalize provider
        provider_map = {"MTN": "MTN", "VODAFONE": "TELECEL", "TELECEL": "TELECEL", "AIRTELTIGO": "AIRTELTIGO"}
        updates["momo_provider"] = provider_map.get(request.momo_provider.upper(), request.momo_provider.upper())
    
    # Bank settings
    if request.bank_name:
        updates["bank_name"] = request.bank_name
    if request.bank_account_number:
        updates["bank_account_number"] = request.bank_account_number
    if request.bank_account_name:
        updates["bank_account_name"] = request.bank_account_name
    if request.bank_branch:
        updates["bank_branch"] = request.bank_branch
    
    # Settlement mode
    if request.settlement_mode:
        if request.settlement_mode not in ["instant", "daily"]:
            raise HTTPException(status_code=400, detail="Settlement mode must be 'instant' or 'daily'")
        updates["settlement_mode"] = request.settlement_mode
    
    if updates:
        updates["settlement_updated_at"] = now
        await db.sdm_merchants.update_one({"id": merchant["id"]}, {"$set": updates})
    
    # Get updated merchant
    updated_merchant = await db.sdm_merchants.find_one(
        {"id": merchant["id"]}, 
        {"_id": 0, "password_hash": 0}
    )
    
    return {
        "message": "Settlement configuration updated",
        "merchant": updated_merchant,
        "momo_verified": updates.get("momo_verified", None)
    }

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

# ============== MERCHANT SETTINGS PIN SECURITY ==============

@sdm_router.get("/merchant/settings/pin-status")
async def get_pin_status(merchant: dict = Depends(get_current_merchant)):
    """Check if PIN is set and if settings are locked"""
    has_pin = bool(merchant.get("settings_pin_hash"))
    locked_until = merchant.get("settings_locked_until")
    is_locked = False
    
    if locked_until:
        lock_time = datetime.fromisoformat(locked_until.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) < lock_time:
            is_locked = True
        else:
            # Clear lock if expired
            await db.sdm_merchants.update_one(
                {"id": merchant["id"]},
                {"$set": {"settings_locked_until": None, "settings_pin_attempts": 0}}
            )
    
    return {
        "has_pin": has_pin,
        "is_locked": is_locked,
        "locked_until": locked_until if is_locked else None,
        "attempts": merchant.get("settings_pin_attempts", 0)
    }

@sdm_router.post("/merchant/settings/set-pin")
async def set_settings_pin(request: SetSettingsPINRequest, merchant: dict = Depends(get_current_merchant)):
    """Set or update the settings PIN (requires OTP verification)"""
    # Validate PIN format (4-6 digits)
    if not request.pin.isdigit() or len(request.pin) < 4 or len(request.pin) > 6:
        raise HTTPException(status_code=400, detail="PIN must be 4-6 digits")
    
    # Verify OTP using helper function
    phone = merchant["phone"]
    if not await verify_otp_helper(phone, request.otp_code, request.request_id):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Hash and store PIN
    pin_hash = hash_password(request.pin)
    await db.sdm_merchants.update_one(
        {"id": merchant["id"]},
        {"$set": {
            "settings_pin_hash": pin_hash,
            "settings_pin_attempts": 0,
            "settings_locked_until": None
        }}
    )
    
    return {"success": True, "message": "Settings PIN has been set"}

@sdm_router.post("/merchant/settings/verify-pin")
async def verify_settings_pin(request: VerifySettingsPINRequest, merchant: dict = Depends(get_current_merchant)):
    """Verify PIN to access settings"""
    # Check if locked
    locked_until = merchant.get("settings_locked_until")
    if locked_until:
        lock_time = datetime.fromisoformat(locked_until.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) < lock_time:
            remaining = int((lock_time - datetime.now(timezone.utc)).total_seconds() / 60)
            raise HTTPException(
                status_code=423, 
                detail=f"Settings locked. Try again in {remaining} minutes"
            )
    
    # Check if PIN is set
    if not merchant.get("settings_pin_hash"):
        raise HTTPException(status_code=400, detail="PIN not set. Please set a PIN first")
    
    # Verify PIN
    if not verify_password(request.pin, merchant["settings_pin_hash"]):
        # Increment attempts
        attempts = merchant.get("settings_pin_attempts", 0) + 1
        updates = {"settings_pin_attempts": attempts}
        
        # Lock after 5 failed attempts for 30 minutes
        if attempts >= 5:
            lock_until = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
            updates["settings_locked_until"] = lock_until
            await db.sdm_merchants.update_one({"id": merchant["id"]}, {"$set": updates})
            raise HTTPException(
                status_code=423, 
                detail="Too many failed attempts. Settings locked for 30 minutes"
            )
        
        await db.sdm_merchants.update_one({"id": merchant["id"]}, {"$set": updates})
        raise HTTPException(
            status_code=401, 
            detail=f"Invalid PIN. {5 - attempts} attempts remaining"
        )
    
    # Reset attempts on success
    await db.sdm_merchants.update_one(
        {"id": merchant["id"]},
        {"$set": {"settings_pin_attempts": 0, "settings_locked_until": None}}
    )
    
    # Generate a temporary settings access token (valid for 10 minutes)
    settings_token = create_token(
        {"merchant_id": merchant["id"], "settings_access": True, "type": "settings"},
        expires_hours=1  # Using 1 hour as minimum since function uses hours
    )
    
    return {
        "success": True,
        "settings_token": settings_token,
        "expires_in": 600  # 10 minutes in seconds
    }

@sdm_router.post("/merchant/settings/reset-pin")
async def reset_settings_pin(request: ResetSettingsPINRequest, merchant: dict = Depends(get_current_merchant)):
    """Reset PIN via OTP (for forgotten PIN)"""
    # Validate new PIN format
    if not request.new_pin.isdigit() or len(request.new_pin) < 4 or len(request.new_pin) > 6:
        raise HTTPException(status_code=400, detail="PIN must be 4-6 digits")
    
    # Verify OTP using helper function
    phone = merchant["phone"]
    if not await verify_otp_helper(phone, request.otp_code, request.request_id):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Hash and store new PIN
    pin_hash = hash_password(request.new_pin)
    await db.sdm_merchants.update_one(
        {"id": merchant["id"]},
        {"$set": {
            "settings_pin_hash": pin_hash,
            "settings_pin_attempts": 0,
            "settings_locked_until": None
        }}
    )
    
    return {"success": True, "message": "Settings PIN has been reset"}

# ============== INSTANT MOMO SETTLEMENT ==============

async def process_instant_momo_settlement(merchant: dict, amount: float, transaction_id: str) -> dict:
    """
    Process instant MoMo transfer to merchant after a customer payment
    
    Args:
        merchant: Merchant document with settlement details
        amount: Amount to transfer (merchant_receives after cashback deduction)
        transaction_id: Original transaction reference
        
    Returns:
        Settlement result with status and details
    """
    # Validate amount
    if amount <= 0:
        logging.warning(f"Skipping settlement - invalid amount: {amount}")
        return {
            "status": "skipped",
            "message": "Settlement amount must be positive",
            "amount": amount
        }
    
    try:
        client_reference = f"SET_{transaction_id[-10:]}"
        account_name = merchant.get("momo_account_name") or merchant.get("business_name", "Merchant")
        
        logging.info(f"Processing instant MoMo settlement: {amount} GHS to {merchant.get('momo_number')} for txn {transaction_id}")
        
        # Send MoMo transfer via BulkClix
        result = await bulkclix_payment_service.transfer_momo(
            amount=amount,
            account_number=merchant["momo_number"],
            network=merchant["momo_provider"],
            account_name=account_name,
            client_reference=client_reference
        )
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Record settlement
        settlement_record = {
            "id": str(uuid.uuid4()),
            "merchant_id": merchant["id"],
            "transaction_id": transaction_id,
            "client_reference": client_reference,
            "amount": amount,
            "momo_number": merchant["momo_number"],
            "momo_provider": merchant["momo_provider"],
            "account_name": account_name,
            "status": "completed" if result.get("success") else "failed",
            "bulkclix_response": result.get("data"),
            "error_message": result.get("error") if not result.get("success") else None,
            "created_at": now,
            "test_mode": result.get("test_mode", False)
        }
        await db.merchant_settlements.insert_one(settlement_record)
        
        # Update transaction with settlement info
        await db.sdm_transactions.update_one(
            {"transaction_id": transaction_id},
            {"$set": {
                "settlement_status": settlement_record["status"],
                "settlement_ref": client_reference,
                "settlement_completed_at": now if result.get("success") else None
            }}
        )
        
        if result.get("success"):
            logging.info(f"Instant settlement successful: {client_reference}")
            return {
                "status": "completed",
                "client_reference": client_reference,
                "amount": amount,
                "momo_number": merchant["momo_number"],
                "message": "Funds transferred to merchant MoMo"
            }
        else:
            logging.error(f"Instant settlement failed: {result.get('error')}")
            return {
                "status": "failed",
                "client_reference": client_reference,
                "error": result.get("error"),
                "message": "Settlement will be retried or processed manually"
            }
            
    except Exception as e:
        logging.error(f"Instant settlement error: {e}")
        return {
            "status": "error",
            "error": str(e),
            "message": "Settlement processing error"
        }

@sdm_router.post("/merchant/transaction")
async def create_transaction(request: CreateTransactionRequest, merchant: dict = Depends(get_current_merchant)):
    """Initiate payment transaction - Client pays first via MoMo
    
    Flow:
    1. Client scans merchant QR and confirms amount
    2. System initiates MoMo collection from client
    3. Client approves payment on phone
    4. Webhook confirms payment
    5. Merchant receives funds (instant MoMo transfer)
    6. SDM receives commission
    7. Client receives cashback
    """
    # Get dynamic config
    config = await get_sdm_config()
    commission_rate = config.get("sdm_commission_rate", SDM_COMMISSION_RATE)
    
    # Find user by QR code
    user = await db.sdm_users.find_one({"qr_code": request.user_qr_code}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("is_active", True) == False:
        pass  # Allow if is_active is True or not set
    elif user.get("is_active") == False:
        raise HTTPException(status_code=400, detail="User account inactive")
    
    # Get user's MoMo details for payment collection
    user_phone = user.get("phone", "").replace("+233", "0").replace(" ", "")
    if not user_phone:
        raise HTTPException(status_code=400, detail="User phone number not found")
    
    # Detect network from phone number or use default
    user_network = user.get("momo_provider") or detect_network_from_phone(user_phone)
    
    # Get staff info
    staff_name = None
    if request.staff_id:
        for s in merchant.get("staff", []):
            if s["id"] == request.staff_id:
                staff_name = s["name"]
                break
    
    # Generate unique transaction ID
    transaction_id = f"TXN_{uuid.uuid4().hex[:12].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate amounts
    cashback_rate = merchant.get("cashback_rate", 2.5) / 100  # Convert % to decimal
    cashback_amount = round(request.amount * cashback_rate, 2)
    sdm_commission = round(cashback_amount * commission_rate, 2)
    net_cashback = round(cashback_amount - sdm_commission, 2)
    merchant_receives = round(request.amount - cashback_amount, 2)
    
    # Create pending transaction record
    pending_transaction = {
        "id": str(uuid.uuid4()),
        "transaction_id": transaction_id,
        "merchant_id": merchant["id"],
        "merchant_name": merchant["business_name"],
        "user_id": user["id"],
        "user_phone": user_phone,
        "user_network": user_network,
        "amount": request.amount,
        "cashback_rate": merchant.get("cashback_rate", 2.5),
        "cashback_amount": cashback_amount,
        "sdm_commission": sdm_commission,
        "net_cashback": net_cashback,
        "merchant_receives": merchant_receives,
        "payment_status": "pending",  # pending -> collected -> settled -> completed
        "staff_id": request.staff_id,
        "staff_name": staff_name,
        "notes": request.notes,
        "created_at": now,
        "settlement_type": merchant.get("settlement_type", "momo"),
        "merchant_momo_number": merchant.get("momo_number"),
        "merchant_momo_provider": merchant.get("momo_provider")
    }
    
    # Store pending transaction
    await db.pending_payments.insert_one(pending_transaction)
    
    # Initiate MoMo collection from client
    callback_url = f"{os.environ.get('BACKEND_URL', 'https://web-boost-seo.preview.emergentagent.com')}/api/sdm/payments/webhook/transaction"
    
    collection_result = await bulkclix_payment_service.collect_momo_payment(
        amount=request.amount,
        phone_number=user_phone,
        network=user_network,
        transaction_id=transaction_id,
        callback_url=callback_url,
        reference=f"Pay {merchant['business_name'][:15]}"
    )
    
    if not collection_result.get("success"):
        # Payment initiation failed
        await db.pending_payments.update_one(
            {"transaction_id": transaction_id},
            {"$set": {"payment_status": "failed", "error": collection_result.get("error")}}
        )
        raise HTTPException(
            status_code=400,
            detail=f"Payment initiation failed: {collection_result.get('error', 'Unknown error')}"
        )
    
    # Update with BulkClix response
    await db.pending_payments.update_one(
        {"transaction_id": transaction_id},
        {"$set": {
            "bulkclix_collection_response": collection_result.get("data"),
            "payment_initiated_at": now
        }}
    )
    
    return {
        "message": "Payment initiated. Customer must approve on their phone.",
        "transaction_id": transaction_id,
        "amount": request.amount,
        "customer_phone": user_phone[-4:].rjust(len(user_phone), '*'),  # Masked
        "merchant_receives": merchant_receives,
        "cashback_amount": net_cashback,
        "status": "pending_customer_approval",
        "instructions": "Customer will receive a prompt to approve the payment."
    }

def detect_network_from_phone(phone: str) -> str:
    """Detect MoMo network from Ghana phone number"""
    phone = phone.replace("+233", "0").replace(" ", "").replace("-", "")
    if phone.startswith("024") or phone.startswith("054") or phone.startswith("055") or phone.startswith("059"):
        return "MTN"
    elif phone.startswith("020") or phone.startswith("050"):
        return "TELECEL"
    elif phone.startswith("026") or phone.startswith("056") or phone.startswith("027") or phone.startswith("057"):
        return "AIRTELTIGO"
    return "MTN"  # Default to MTN

# ============== TRANSACTION PAYMENT WEBHOOK ==============

@sdm_router.post("/payments/webhook/transaction")
async def transaction_payment_webhook(request: Request):
    """
    Webhook for customer payment confirmation
    Called when customer approves MoMo payment
    
    Flow after confirmation:
    1. Mark payment as collected
    2. Transfer to merchant's MoMo
    3. Credit SDM commission
    4. Credit customer cashback
    """
    try:
        data = await request.json()
        logging.info(f"Transaction Payment webhook received: {data}")
        
        transaction_id = data.get("transaction_id")
        status = data.get("status", "").lower()
        ext_transaction_id = data.get("ext_transaction_id")
        
        if not transaction_id:
            return {"success": False, "error": "Missing transaction_id"}
        
        # Find pending transaction
        pending = await db.pending_payments.find_one(
            {"transaction_id": transaction_id},
            {"_id": 0}
        )
        
        if not pending:
            logging.warning(f"Transaction not found: {transaction_id}")
            return {"success": False, "error": "Transaction not found"}
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Update with webhook data
        await db.pending_payments.update_one(
            {"transaction_id": transaction_id},
            {"$set": {
                "webhook_received": True,
                "webhook_data": data,
                "ext_transaction_id": ext_transaction_id,
                "webhook_received_at": now
            }}
        )
        
        if status == "success":
            # Process the full payment flow
            await process_successful_transaction(pending, ext_transaction_id)
            return {"success": True, "message": "Payment processed successfully"}
        elif status in ["failed", "declined", "cancelled"]:
            await db.pending_payments.update_one(
                {"transaction_id": transaction_id},
                {"$set": {
                    "payment_status": "failed",
                    "error_message": data.get("message", "Payment failed"),
                    "failed_at": now
                }}
            )
            return {"success": True, "message": "Payment marked as failed"}
        
        return {"success": True, "message": "Webhook received"}
        
    except Exception as e:
        logging.error(f"Transaction webhook error: {e}")
        return {"success": False, "error": str(e)}

async def process_successful_transaction(pending: dict, ext_transaction_id: str):
    """
    Process successful customer payment:
    1. Mark as collected
    2. Transfer to merchant MoMo
    3. Record SDM commission
    4. Credit customer cashback
    """
    from ledger import EntityType
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = pending["transaction_id"]
    
    # Step 1: Mark as collected
    await db.pending_payments.update_one(
        {"transaction_id": transaction_id},
        {"$set": {
            "payment_status": "collected",
            "collected_at": now
        }}
    )
    logging.info(f"Payment collected: {transaction_id}")
    
    # Step 2: Transfer to merchant's MoMo (if instant settlement)
    merchant = await db.sdm_merchants.find_one({"id": pending["merchant_id"]}, {"_id": 0})
    settlement_result = None
    
    if merchant and merchant.get("momo_number") and merchant.get("momo_provider"):
        settlement_ref = f"SET_{transaction_id[-10:]}"
        
        transfer_result = await bulkclix_payment_service.transfer_momo(
            amount=pending["merchant_receives"],
            account_number=merchant["momo_number"],
            network=merchant["momo_provider"],
            account_name=merchant.get("momo_account_name", merchant["business_name"]),
            client_reference=settlement_ref
        )
        
        settlement_result = {
            "status": "completed" if transfer_result.get("success") else "failed",
            "reference": settlement_ref,
            "amount": pending["merchant_receives"],
            "response": transfer_result.get("data"),
            "error": transfer_result.get("error") if not transfer_result.get("success") else None
        }
        
        # Record settlement
        await db.merchant_settlements.insert_one({
            "id": str(uuid.uuid4()),
            "transaction_id": transaction_id,
            "merchant_id": pending["merchant_id"],
            "client_reference": settlement_ref,
            "amount": pending["merchant_receives"],
            "status": settlement_result["status"],
            "created_at": now
        })
        
        logging.info(f"Merchant settlement: {settlement_result['status']} - {pending['merchant_receives']} GHS")
    
    # Step 3: Record SDM commission (credit to SDM wallet)
    sdm_commission = pending["sdm_commission"]
    await db.sdm_commissions.insert_one({
        "id": str(uuid.uuid4()),
        "transaction_id": transaction_id,
        "amount": sdm_commission,
        "merchant_id": pending["merchant_id"],
        "created_at": now
    })
    logging.info(f"SDM commission recorded: {sdm_commission} GHS")
    
    # Step 4: Credit customer cashback - AVAILABLE IMMEDIATELY (no pending)
    user_id = pending["user_id"]
    net_cashback = pending["net_cashback"]
    
    # Update user wallet - cashback available immediately
    await db.sdm_users.update_one(
        {"id": user_id},
        {"$inc": {
            "wallet_available": net_cashback,
            "total_cashback_earned": net_cashback
        }}
    )
    
    # Also update ledger wallet if exists - available balance
    user_wallet = await ledger_service.get_wallet_by_entity(EntityType.CLIENT, user_id)
    if user_wallet:
        await db.wallets.update_one(
            {"id": user_wallet.id},
            {"$inc": {"available_balance": net_cashback, "balance": net_cashback}}
        )
    
    logging.info(f"Customer cashback credited: {net_cashback} GHS (available immediately)")
    
    # Step 5: Mark transaction as completed
    await db.pending_payments.update_one(
        {"transaction_id": transaction_id},
        {"$set": {
            "payment_status": "completed",
            "settlement_result": settlement_result,
            "completed_at": now
        }}
    )
    
    # Also record in sdm_transactions for history
    await db.sdm_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "transaction_id": transaction_id,
        "user_id": user_id,
        "merchant_id": pending["merchant_id"],
        "merchant_name": pending["merchant_name"],
        "amount": pending["amount"],
        "cashback_amount": pending["net_cashback"],
        "merchant_receives": pending["merchant_receives"],
        "sdm_commission": pending["sdm_commission"],
        "status": "completed",
        "payment_method": "MOMO",
        "created_at": pending["created_at"],
        "completed_at": now,
        "ext_transaction_id": ext_transaction_id
    })
    
    logging.info(f"Transaction completed: {transaction_id}")

@sdm_router.get("/merchant/transaction/{transaction_id}/status")
async def get_transaction_status(transaction_id: str, merchant: dict = Depends(get_current_merchant)):
    """Check status of a pending transaction"""
    pending = await db.pending_payments.find_one(
        {"transaction_id": transaction_id, "merchant_id": merchant["id"]},
        {"_id": 0}
    )
    
    if not pending:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {
        "transaction_id": transaction_id,
        "status": pending.get("payment_status"),
        "amount": pending.get("amount"),
        "merchant_receives": pending.get("merchant_receives"),
        "cashback_amount": pending.get("net_cashback"),
        "created_at": pending.get("created_at"),
        "completed_at": pending.get("completed_at"),
        "settlement_result": pending.get("settlement_result")
    }

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

# ============== PAYMENT SYSTEM ROUTES ==============

def calculate_payment_split(amount: float, cashback_rate: float, sdm_commission_rate: float = 0.10) -> Dict:
    """
    Calculate payment split between client cashback, SDM commission, and merchant
    
    Example with 1000 GHS at 10% cashback:
    - Cashback total: 100 GHS (10% of 1000)
    - SDM Commission: 10 GHS (10% of cashback)
    - Client receives: 90 GHS (cashback - SDM commission)
    - Merchant receives: 900 GHS (1000 - 100)
    """
    total_cashback = amount * (cashback_rate / 100)
    sdm_commission = total_cashback * sdm_commission_rate
    client_cashback = total_cashback - sdm_commission
    merchant_amount = amount - total_cashback
    
    return {
        "total_cashback": round(total_cashback, 2),
        "sdm_commission": round(sdm_commission, 2),
        "client_cashback": round(client_cashback, 2),
        "merchant_amount": round(merchant_amount, 2)
    }

@sdm_router.post("/payments/initiate")
async def initiate_payment(request: InitiatePaymentRequest, user: dict = Depends(get_current_user)):
    """
    Initiate a payment transaction
    Can be called by client (scanning merchant QR) or merchant (scanning client QR)
    """
    # Check if user is blocked
    if user.get("is_blocked") or user.get("is_suspended"):
        raise HTTPException(status_code=403, detail="Your account is blocked or suspended")
    
    # Determine merchant and client based on QR codes provided
    merchant = None
    client = user
    
    if request.merchant_qr_code:
        # Client scans merchant QR
        merchant = await db.sdm_merchants.find_one(
            {"qr_code": request.merchant_qr_code, "is_active": True, "is_verified": True},
            {"_id": 0}
        )
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant not found or not active")
        initiated_by = "client"
    elif request.client_qr_code:
        raise HTTPException(status_code=400, detail="Use /payments/merchant-initiate endpoint for merchant-initiated payments")
    else:
        raise HTTPException(status_code=400, detail="Merchant QR code required")
    
    # Check merchant status
    if merchant.get("is_blocked") or merchant.get("is_suspended"):
        raise HTTPException(status_code=403, detail="This merchant is currently unavailable")
    
    # Validate payment method
    if request.payment_method not in ["momo", "card", "cash"]:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    
    # For cash payments, check if merchant has cash mode enabled and within limits
    if request.payment_method == "cash":
        if not merchant.get("cash_mode_enabled", True):
            raise HTTPException(status_code=400, detail="This merchant does not accept cash payments")
        
        # Check merchant's cash debit balance
        cash_debit_balance = merchant.get("cash_debit_balance", 0)
        cash_debit_limit = merchant.get("cash_debit_limit", DEFAULT_CASH_DEBIT_LIMIT)
        
        # Calculate potential new balance
        cashback_rate = min(merchant.get("cashback_rate", 5.0), merchant.get("max_cash_cashback_rate", MAX_CASH_CASHBACK_RATE))
        split = calculate_payment_split(request.amount, cashback_rate)
        potential_new_balance = cash_debit_balance - split["client_cashback"]
        
        if abs(potential_new_balance) > cash_debit_limit:
            raise HTTPException(
                status_code=400, 
                detail=f"Merchant's cash debit limit exceeded. Maximum allowed: {cash_debit_limit} GHS"
            )
    
    # Calculate split
    cashback_rate = merchant.get("cashback_rate", 5.0)
    if request.payment_method == "cash":
        cashback_rate = min(cashback_rate, merchant.get("max_cash_cashback_rate", MAX_CASH_CASHBACK_RATE))
    
    split = calculate_payment_split(request.amount, cashback_rate)
    
    # Create payment record
    payment = SDMPayment(
        client_id=client["id"],
        client_phone=client["phone"],
        merchant_id=merchant["id"],
        merchant_name=merchant["business_name"],
        amount=request.amount,
        payment_method=request.payment_method,
        payer_phone=request.payer_phone or client["phone"],
        payer_network=request.payer_network,
        cashback_rate=cashback_rate,
        cashback_amount=split["client_cashback"],
        sdm_commission=split["sdm_commission"],
        merchant_amount=split["merchant_amount"],
        initiated_by=initiated_by,
        notes=request.notes
    )
    
    # For cash payments, create pending confirmation
    if request.payment_method == "cash":
        payment.status = "awaiting_confirmation"
        await db.sdm_payments.insert_one(payment.model_dump())
        
        # Create pending cash payment record
        pending = PendingCashPayment(
            payment_id=payment.id,
            client_id=client["id"],
            merchant_id=merchant["id"],
            merchant_name=merchant["business_name"],
            amount=request.amount,
            cashback_amount=split["client_cashback"],
            expires_at=(datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        )
        await db.pending_cash_payments.insert_one(pending.model_dump())
        
        return {
            "success": True,
            "payment_id": payment.id,
            "payment_ref": payment.payment_ref,
            "status": "awaiting_confirmation",
            "requires_client_confirmation": True,
            "confirmation_expires_at": pending.expires_at,
            "split": split
        }
    
    # For MoMo/Card payments - SIMULATED for now
    if request.payment_method == "momo":
        # In production: Call Bulkclix API to initiate MoMo collection
        payment.status = "processing"
        payment.bulkclix_ref = f"BCMOMO{secrets.token_hex(8).upper()}"
        await db.sdm_payments.insert_one(payment.model_dump())
        
        # SIMULATED: Auto-confirm after short delay (in production, webhook confirms)
        # For demo purposes, we'll mark it as confirmed immediately
        await process_payment_confirmation(payment.id)
        
        return {
            "success": True,
            "payment_id": payment.id,
            "payment_ref": payment.payment_ref,
            "bulkclix_ref": payment.bulkclix_ref,
            "status": "confirmed",
            "message": "Payment confirmed (SIMULATED)",
            "split": split
        }
    
    elif request.payment_method == "card":
        # In production: Call Bulkclix API to initiate card payment
        payment.status = "processing"
        payment.bulkclix_ref = f"BCCARD{secrets.token_hex(8).upper()}"
        await db.sdm_payments.insert_one(payment.model_dump())
        
        # SIMULATED: Auto-confirm
        await process_payment_confirmation(payment.id)
        
        return {
            "success": True,
            "payment_id": payment.id,
            "payment_ref": payment.payment_ref,
            "bulkclix_ref": payment.bulkclix_ref,
            "status": "confirmed",
            "message": "Payment confirmed (SIMULATED)",
            "split": split
        }

@sdm_router.post("/payments/merchant-initiate")
async def merchant_initiate_payment(request: InitiatePaymentRequest, merchant: dict = Depends(get_current_merchant)):
    """
    Merchant initiates payment by scanning client QR
    """
    # Check merchant status
    if merchant.get("is_blocked") or merchant.get("is_suspended"):
        raise HTTPException(status_code=403, detail="Your merchant account is blocked or suspended")
    
    if not merchant.get("is_verified"):
        raise HTTPException(status_code=403, detail="Your merchant account is not verified yet")
    
    if not request.client_qr_code:
        raise HTTPException(status_code=400, detail="Client QR code required")
    
    # Find client by QR code
    client = await db.sdm_users.find_one(
        {"qr_code": request.client_qr_code, "is_active": True},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check client status
    if client.get("is_blocked") or client.get("is_suspended"):
        raise HTTPException(status_code=403, detail="This client's account is blocked or suspended")
    
    # Validate payment method
    if request.payment_method not in ["momo", "card", "cash"]:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    
    # For cash payments, check limits
    if request.payment_method == "cash":
        if not merchant.get("cash_mode_enabled", True):
            raise HTTPException(status_code=400, detail="Cash payments are disabled for your account")
        
        cash_debit_balance = merchant.get("cash_debit_balance", 0)
        cash_debit_limit = merchant.get("cash_debit_limit", DEFAULT_CASH_DEBIT_LIMIT)
        
        cashback_rate = min(merchant.get("cashback_rate", 5.0), merchant.get("max_cash_cashback_rate", MAX_CASH_CASHBACK_RATE))
        split = calculate_payment_split(request.amount, cashback_rate)
        potential_new_balance = cash_debit_balance - split["client_cashback"]
        
        if abs(potential_new_balance) > cash_debit_limit:
            raise HTTPException(
                status_code=400,
                detail=f"Your cash debit limit exceeded. Maximum allowed: {cash_debit_limit} GHS"
            )
    
    # Calculate split
    cashback_rate = merchant.get("cashback_rate", 5.0)
    if request.payment_method == "cash":
        cashback_rate = min(cashback_rate, merchant.get("max_cash_cashback_rate", MAX_CASH_CASHBACK_RATE))
    
    split = calculate_payment_split(request.amount, cashback_rate)
    
    # Create payment record
    payment = SDMPayment(
        client_id=client["id"],
        client_phone=client["phone"],
        merchant_id=merchant["id"],
        merchant_name=merchant["business_name"],
        amount=request.amount,
        payment_method=request.payment_method,
        payer_phone=request.payer_phone or client["phone"],
        payer_network=request.payer_network,
        cashback_rate=cashback_rate,
        cashback_amount=split["client_cashback"],
        sdm_commission=split["sdm_commission"],
        merchant_amount=split["merchant_amount"],
        initiated_by="merchant",
        notes=request.notes
    )
    
    # For cash payments, require client confirmation
    if request.payment_method == "cash":
        payment.status = "awaiting_confirmation"
        await db.sdm_payments.insert_one(payment.model_dump())
        
        pending = PendingCashPayment(
            payment_id=payment.id,
            client_id=client["id"],
            merchant_id=merchant["id"],
            merchant_name=merchant["business_name"],
            amount=request.amount,
            cashback_amount=split["client_cashback"],
            expires_at=(datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        )
        await db.pending_cash_payments.insert_one(pending.model_dump())
        
        # TODO: Send push notification to client
        
        return {
            "success": True,
            "payment_id": payment.id,
            "payment_ref": payment.payment_ref,
            "status": "awaiting_confirmation",
            "client_phone": client["phone"][-4:].rjust(len(client["phone"]), '*'),
            "requires_client_confirmation": True,
            "confirmation_expires_at": pending.expires_at,
            "split": split
        }
    
    # For MoMo/Card - SIMULATED
    payment.status = "processing"
    payment.bulkclix_ref = f"BC{request.payment_method.upper()}{secrets.token_hex(8).upper()}"
    await db.sdm_payments.insert_one(payment.model_dump())
    
    # SIMULATED: Auto-confirm
    await process_payment_confirmation(payment.id)
    
    return {
        "success": True,
        "payment_id": payment.id,
        "payment_ref": payment.payment_ref,
        "bulkclix_ref": payment.bulkclix_ref,
        "status": "confirmed",
        "message": "Payment confirmed (SIMULATED)",
        "split": split
    }

async def process_payment_confirmation(payment_id: str):
    """Process payment confirmation and execute split"""
    payment = await db.sdm_payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        return False
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update payment status
    await db.sdm_payments.update_one(
        {"id": payment_id},
        {"$set": {
            "status": "confirmed",
            "payment_confirmed_at": now,
            "updated_at": now
        }}
    )
    
    # Credit client wallet with cashback
    await db.sdm_users.update_one(
        {"id": payment["client_id"]},
        {"$inc": {
            "wallet_available": payment["cashback_amount"],
            "total_earned": payment["cashback_amount"]
        }}
    )
    
    # Get merchant for settlement
    merchant = await db.sdm_merchants.find_one({"id": payment["merchant_id"]}, {"_id": 0})
    
    if payment["payment_method"] == "cash":
        # For cash payments, debit merchant's cash account
        previous_balance = merchant.get("cash_debit_balance", 0)
        new_balance = previous_balance - payment["cashback_amount"]
        
        await db.sdm_merchants.update_one(
            {"id": merchant["id"]},
            {"$inc": {
                "cash_debit_balance": -payment["cashback_amount"],
                "total_transactions": 1,
                "total_cashback_given": payment["cashback_amount"]
            }}
        )
        
        # Log the cash debit
        cash_log = MerchantCashDebitLog(
            merchant_id=merchant["id"],
            merchant_name=merchant["business_name"],
            previous_balance=previous_balance,
            change_amount=-payment["cashback_amount"],
            new_balance=new_balance,
            reason="cash_payment",
            payment_id=payment_id
        )
        await db.merchant_cash_logs.insert_one(cash_log.model_dump())
        
        # Mark payment as completed (no settlement needed for cash)
        await db.sdm_payments.update_one(
            {"id": payment_id},
            {"$set": {
                "status": "split_completed",
                "split_completed_at": now,
                "settlement_status": "not_applicable"
            }}
        )
    else:
        # For MoMo/Card, initiate settlement to merchant
        settlement_ref = f"SETTLE{secrets.token_hex(6).upper()}"
        
        # SIMULATED: In production, call Bulkclix API for transfer
        await db.sdm_payments.update_one(
            {"id": payment_id},
            {"$set": {
                "status": "split_completed",
                "split_completed_at": now,
                "settlement_status": "completed",
                "settlement_ref": settlement_ref,
                "settlement_completed_at": now
            }}
        )
        
        await db.sdm_merchants.update_one(
            {"id": merchant["id"]},
            {"$inc": {
                "total_transactions": 1,
                "total_cashback_given": payment["cashback_amount"]
            }}
        )
    
    return True

@sdm_router.post("/payments/confirm-cash")
async def confirm_cash_payment(request: ConfirmCashPaymentRequest, user: dict = Depends(get_current_user)):
    """Client confirms a cash payment"""
    # Find pending payment
    pending = await db.pending_cash_payments.find_one(
        {"payment_id": request.payment_id, "client_id": user["id"], "status": "pending"},
        {"_id": 0}
    )
    
    if not pending:
        raise HTTPException(status_code=404, detail="Pending payment not found")
    
    # Check expiry
    if datetime.fromisoformat(pending["expires_at"].replace('Z', '+00:00')) < datetime.now(timezone.utc):
        await db.pending_cash_payments.update_one(
            {"payment_id": request.payment_id},
            {"$set": {"status": "expired"}}
        )
        await db.sdm_payments.update_one(
            {"id": request.payment_id},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=400, detail="Payment confirmation has expired")
    
    if not request.confirm:
        # Client rejected
        await db.pending_cash_payments.update_one(
            {"payment_id": request.payment_id},
            {"$set": {"status": "cancelled"}}
        )
        await db.sdm_payments.update_one(
            {"id": request.payment_id},
            {"$set": {"status": "cancelled"}}
        )
        return {"success": True, "message": "Payment cancelled"}
    
    # Update pending record
    now = datetime.now(timezone.utc).isoformat()
    await db.pending_cash_payments.update_one(
        {"payment_id": request.payment_id},
        {"$set": {"status": "confirmed"}}
    )
    
    # Update payment record
    await db.sdm_payments.update_one(
        {"id": request.payment_id},
        {"$set": {
            "client_confirmed": True,
            "client_confirmed_at": now
        }}
    )
    
    # Process the payment
    await process_payment_confirmation(request.payment_id)
    
    return {
        "success": True,
        "message": "Payment confirmed",
        "cashback_credited": pending["cashback_amount"]
    }

@sdm_router.get("/payments/pending")
async def get_pending_payments(user: dict = Depends(get_current_user)):
    """Get pending cash payments awaiting client confirmation"""
    pending = await db.pending_cash_payments.find(
        {"client_id": user["id"], "status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    
    # Filter expired ones
    now = datetime.now(timezone.utc)
    active = []
    for p in pending:
        expires = datetime.fromisoformat(p["expires_at"].replace('Z', '+00:00'))
        if expires > now:
            active.append(p)
        else:
            # Mark as expired
            await db.pending_cash_payments.update_one(
                {"id": p["id"]},
                {"$set": {"status": "expired"}}
            )
    
    return {"pending_payments": active}

@sdm_router.get("/payments/history")
async def get_payment_history(user: dict = Depends(get_current_user), limit: int = 50):
    """Get client's payment history"""
    payments = await db.sdm_payments.find(
        {"client_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return {"payments": payments}

@sdm_router.get("/merchant/payments")
async def get_merchant_payments(merchant: dict = Depends(get_current_merchant), limit: int = 50):
    """Get merchant's payment history"""
    payments = await db.sdm_payments.find(
        {"merchant_id": merchant["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return {"payments": payments}

@sdm_router.get("/merchant/cash-balance")
async def get_merchant_cash_balance(merchant: dict = Depends(get_current_merchant)):
    """Get merchant's cash debit balance and status"""
    return {
        "cash_debit_balance": merchant.get("cash_debit_balance", 0),
        "cash_debit_limit": merchant.get("cash_debit_limit", DEFAULT_CASH_DEBIT_LIMIT),
        "cash_mode_enabled": merchant.get("cash_mode_enabled", True),
        "cash_grace_period_days": merchant.get("cash_grace_period_days", DEFAULT_GRACE_PERIOD_DAYS),
        "cash_grace_deadline": merchant.get("cash_grace_deadline"),
        "max_cash_cashback_rate": merchant.get("max_cash_cashback_rate", MAX_CASH_CASHBACK_RATE),
        "available_limit": merchant.get("cash_debit_limit", DEFAULT_CASH_DEBIT_LIMIT) - abs(merchant.get("cash_debit_balance", 0))
    }

@sdm_router.get("/merchant/qr-code")
async def get_merchant_qr_code(merchant: dict = Depends(get_current_merchant)):
    """Get merchant's QR code for payments"""
    qr_code = merchant.get("qr_code")
    if not qr_code:
        # Generate one if not exists
        qr_code = f"MERCH_{secrets.token_hex(6).upper()}"
        await db.sdm_merchants.update_one(
            {"id": merchant["id"]},
            {"$set": {"qr_code": qr_code}}
        )
    
    # Generate QR code image
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(qr_code)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_image = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "qr_code": qr_code,
        "qr_image": f"data:image/png;base64,{qr_image}",
        "merchant_name": merchant["business_name"],
        "cashback_rate": merchant.get("cashback_rate", 5.0)
    }

# ============== WEBHOOK FOR BULKCLIX ==============

@sdm_router.post("/payments/webhook/bulkclix")
async def bulkclix_payment_webhook(request: Request):
    """
    Webhook endpoint for Bulkclix payment confirmations
    Called by Bulkclix when payment status changes
    """
    try:
        data = await request.json()
        logging.info(f"Bulkclix webhook received: {data}")
        
        transaction_ref = data.get("reference") or data.get("transaction_id")
        status = data.get("status", "").lower()
        
        if not transaction_ref:
            return {"success": False, "error": "Missing reference"}
        
        # Find payment by bulkclix reference
        payment = await db.sdm_payments.find_one(
            {"bulkclix_ref": transaction_ref},
            {"_id": 0}
        )
        
        if not payment:
            logging.warning(f"Payment not found for ref: {transaction_ref}")
            return {"success": False, "error": "Payment not found"}
        
        # Update webhook data
        await db.sdm_payments.update_one(
            {"id": payment["id"]},
            {"$set": {
                "webhook_received": True,
                "webhook_data": data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Process based on status
        if status in ["success", "successful", "completed"]:
            await process_payment_confirmation(payment["id"])
            return {"success": True, "message": "Payment processed"}
        elif status in ["failed", "declined", "cancelled"]:
            await db.sdm_payments.update_one(
                {"id": payment["id"]},
                {"$set": {
                    "status": "failed",
                    "error_message": data.get("message", "Payment failed")
                }}
            )
            return {"success": True, "message": "Payment marked as failed"}
        
        return {"success": True, "message": "Webhook received"}
        
    except Exception as e:
        logging.error(f"Webhook error: {e}")
        return {"success": False, "error": str(e)}

# ============== ADMIN CONTROL ROUTES ==============

@sdm_router.post("/admin/clients/{client_id}/control")
async def admin_control_client(client_id: str, request: AdminClientControlRequest, admin: dict = Depends(get_current_admin)):
    """Admin control over client accounts"""
    client = await db.sdm_users.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc).isoformat()
    updates = {}
    previous_state = {
        "is_blocked": client.get("is_blocked", False),
        "is_suspended": client.get("is_suspended", False),
        "wallet_frozen": client.get("wallet_frozen", False),
        "wallet_available": client.get("wallet_available", 0)
    }
    
    if request.action == "block":
        updates = {
            "is_blocked": True,
            "block_reason": request.reason,
            "blocked_at": now,
            "blocked_by": admin.get("email", "admin")
        }
    elif request.action == "unblock":
        updates = {
            "is_blocked": False,
            "block_reason": None,
            "blocked_at": None,
            "blocked_by": None
        }
    elif request.action == "suspend":
        updates = {
            "is_suspended": True,
            "block_reason": request.reason,
            "blocked_at": now,
            "blocked_by": admin.get("email", "admin")
        }
    elif request.action == "unsuspend":
        updates = {"is_suspended": False}
    elif request.action == "freeze_wallet":
        updates = {"wallet_frozen": True}
    elif request.action == "unfreeze_wallet":
        updates = {"wallet_frozen": False}
    elif request.action == "adjust_balance":
        if request.adjustment_type == "add":
            updates = {"$inc": {"wallet_available": request.balance_adjustment}}
        elif request.adjustment_type == "subtract":
            updates = {"$inc": {"wallet_available": -request.balance_adjustment}}
        elif request.adjustment_type == "set":
            updates = {"wallet_available": request.balance_adjustment}
    elif request.action == "delete":
        updates = {"is_active": False}
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {request.action}")
    
    # Apply updates
    if "$inc" in updates:
        await db.sdm_users.update_one({"id": client_id}, updates)
    else:
        await db.sdm_users.update_one({"id": client_id}, {"$set": updates})
    
    # Log admin action
    action_log = AdminActionLog(
        admin_id=admin.get("id", "admin"),
        admin_email=admin.get("email", "admin"),
        target_type="client",
        target_id=client_id,
        target_identifier=client["phone"],
        action=request.action,
        action_details={"adjustment": request.balance_adjustment, "type": request.adjustment_type} if request.action == "adjust_balance" else {},
        reason=request.reason,
        previous_state=previous_state
    )
    await db.admin_action_logs.insert_one(action_log.model_dump())
    
    return {
        "success": True,
        "action": request.action,
        "client_id": client_id,
        "message": f"Client {request.action} successful"
    }

@sdm_router.post("/admin/merchants/{merchant_id}/control")
async def admin_control_merchant(merchant_id: str, request: AdminMerchantControlRequest, admin: dict = Depends(get_current_admin)):
    """Admin control over merchant accounts"""
    merchant = await db.sdm_merchants.find_one({"id": merchant_id}, {"_id": 0})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    now = datetime.now(timezone.utc).isoformat()
    updates = {}
    previous_state = {
        "is_blocked": merchant.get("is_blocked", False),
        "is_suspended": merchant.get("is_suspended", False),
        "cash_mode_enabled": merchant.get("cash_mode_enabled", True),
        "cash_debit_limit": merchant.get("cash_debit_limit", DEFAULT_CASH_DEBIT_LIMIT)
    }
    
    if request.action == "block":
        updates = {
            "is_blocked": True,
            "block_reason": request.reason,
            "blocked_at": now,
            "blocked_by": admin.get("email", "admin")
        }
    elif request.action == "unblock":
        updates = {
            "is_blocked": False,
            "block_reason": None,
            "blocked_at": None,
            "blocked_by": None
        }
    elif request.action == "suspend":
        updates = {
            "is_suspended": True,
            "block_reason": request.reason,
            "blocked_at": now,
            "blocked_by": admin.get("email", "admin")
        }
    elif request.action == "unsuspend":
        updates = {"is_suspended": False}
    elif request.action == "update_cash_limit":
        updates = {
            "cash_debit_limit": request.cash_debit_limit or DEFAULT_CASH_DEBIT_LIMIT,
            "cash_grace_period_days": request.cash_grace_period_days or DEFAULT_GRACE_PERIOD_DAYS,
            "max_cash_cashback_rate": request.max_cash_cashback_rate or MAX_CASH_CASHBACK_RATE
        }
    elif request.action == "toggle_cash_mode":
        updates = {"cash_mode_enabled": not merchant.get("cash_mode_enabled", True)}
    elif request.action == "delete":
        # Soft delete the merchant - requires super_admin role
        admin_role = admin.get("role", "admin")
        if admin_role != "super_admin":
            raise HTTPException(status_code=403, detail="Only super admin can delete merchants")
        updates = {
            "is_deleted": True,
            "is_active": False,
            "deleted_at": now,
            "deleted_by": admin.get("email", "admin"),
            "delete_reason": request.reason
        }
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {request.action}")
    
    await db.sdm_merchants.update_one({"id": merchant_id}, {"$set": updates})
    
    # Log admin action
    action_log = AdminActionLog(
        admin_id=admin.get("id", "admin"),
        admin_email=admin.get("email", "admin"),
        target_type="merchant",
        target_id=merchant_id,
        target_identifier=merchant["business_name"],
        action=request.action,
        action_details={
            "cash_debit_limit": request.cash_debit_limit,
            "cash_grace_period_days": request.cash_grace_period_days,
            "max_cash_cashback_rate": request.max_cash_cashback_rate
        } if request.action == "update_cash_limit" else {},
        reason=request.reason,
        previous_state=previous_state
    )
    await db.admin_action_logs.insert_one(action_log.model_dump())
    
    return {
        "success": True,
        "action": request.action,
        "merchant_id": merchant_id,
        "message": f"Merchant {request.action} successful"
    }

@sdm_router.get("/admin/action-logs")
async def get_admin_action_logs(admin: dict = Depends(get_current_admin), target_type: str = None, limit: int = 100):
    """Get admin action logs"""
    query = {}
    if target_type:
        query["target_type"] = target_type
    
    logs = await db.admin_action_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"logs": logs}

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
async def admin_verify_merchant(
    merchant_id: str, 
    body: dict = None,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Verify or unverify merchant"""
    is_verified = body.get("is_verified", True) if body else True
    
    # Get merchant info first
    merchant = await db.sdm_merchants.find_one({"id": merchant_id}, {"_id": 0})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    result = await db.sdm_merchants.update_one(
        {"id": merchant_id},
        {"$set": {"is_verified": is_verified}}
    )
    
    # Send SMS notification to merchant
    if is_verified and result.modified_count > 0:
        try:
            sms_message = f"Congratulations! Your SDM Rewards merchant account '{merchant.get('business_name', '')}' has been verified. You can now accept cashback payments from customers. Welcome to our network!"
            await send_sms_bulkclix(merchant.get("phone", ""), sms_message)
        except Exception as e:
            print(f"Warning: Failed to send verification SMS: {e}")
    
    return {"message": f"Merchant {'verified' if is_verified else 'unverified'}"}

@sdm_router.get("/admin/transactions")
async def admin_get_transactions(
    admin: dict = Depends(get_current_admin), 
    limit: int = 100,
    status: Optional[str] = None,
    period: Optional[str] = None,
    search: Optional[str] = None
):
    """Admin: Get all transactions with filters"""
    # Build query
    query = {}
    
    if status and status != 'all':
        query["payment_status"] = status
    
    # Period filter
    if period:
        now = datetime.now(timezone.utc)
        if period == 'today':
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            query["created_at"] = {"$gte": start.isoformat()}
        elif period == 'week':
            start = now - timedelta(days=7)
            query["created_at"] = {"$gte": start.isoformat()}
        elif period == 'month':
            start = now - timedelta(days=30)
            query["created_at"] = {"$gte": start.isoformat()}
    
    # Get from both collections (pending_payments has the new flow, sdm_transactions has old)
    pending = await db.pending_payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    old_txns = await db.sdm_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # Merge and sort
    all_transactions = pending + old_txns
    all_transactions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # Apply search filter
    if search:
        search = search.lower()
        all_transactions = [
            t for t in all_transactions 
            if search in (t.get("transaction_id", "").lower() or "") or
               search in (t.get("merchant_name", "").lower() or "") or
               search in (t.get("user_phone", "") or "")
        ]
    
    return {"transactions": all_transactions[:limit]}

@sdm_router.get("/admin/transactions/stats")
async def admin_get_transaction_stats(admin: dict = Depends(get_current_admin)):
    """Admin: Get transaction statistics"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Today's stats from pending_payments
    today_txns = await db.pending_payments.find(
        {"created_at": {"$gte": today_start}, "payment_status": "completed"},
        {"_id": 0}
    ).to_list(1000)
    
    today_volume = sum(t.get("amount", 0) for t in today_txns)
    today_count = len(today_txns)
    total_commission = sum(t.get("sdm_commission", 0) for t in today_txns)
    total_cashback = sum(t.get("net_cashback", 0) for t in today_txns)
    
    return {
        "today_volume": today_volume,
        "today_count": today_count,
        "total_commission": total_commission,
        "total_cashback": total_cashback
    }

# ============== SDM COMMISSIONS MANAGEMENT ==============

@sdm_router.get("/admin/commissions")
async def admin_get_commissions(admin: dict = Depends(get_current_admin)):
    """Admin: Get SDM commission summary and history"""
    # Get all commissions
    commissions = await db.sdm_commissions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Calculate totals
    total_earned = sum(c.get("amount", 0) for c in commissions)
    
    # Get withdrawn commissions
    withdrawals = await db.sdm_commission_withdrawals.find({}, {"_id": 0}).to_list(100)
    total_withdrawn = sum(w.get("amount", 0) for w in withdrawals if w.get("status") == "completed")
    
    available_balance = total_earned - total_withdrawn
    
    return {
        "total_earned": round(total_earned, 2),
        "total_withdrawn": round(total_withdrawn, 2),
        "available_balance": round(available_balance, 2),
        "recent_commissions": commissions[:50],
        "withdrawal_history": withdrawals
    }

class SDMCommissionWithdrawRequest(BaseModel):
    amount: float
    momo_number: str
    momo_provider: str  # MTN, TELECEL, AIRTELTIGO
    account_name: Optional[str] = "SDM Admin"

@sdm_router.post("/admin/commissions/withdraw")
async def admin_withdraw_commission(request: SDMCommissionWithdrawRequest, admin: dict = Depends(get_current_admin)):
    """Super Admin: Withdraw SDM commissions to MoMo"""
    # Only super_admin can withdraw
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can withdraw commissions")
    
    # Get available balance
    commissions = await db.sdm_commissions.find({}, {"_id": 0}).to_list(10000)
    total_earned = sum(c.get("amount", 0) for c in commissions)
    
    withdrawals = await db.sdm_commission_withdrawals.find({}, {"_id": 0}).to_list(100)
    total_withdrawn = sum(w.get("amount", 0) for w in withdrawals if w.get("status") == "completed")
    
    available_balance = total_earned - total_withdrawn
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    if request.amount > available_balance:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: {available_balance:.2f} GHS")
    
    # Normalize provider
    provider_map = {"MTN": "MTN", "VODAFONE": "TELECEL", "TELECEL": "TELECEL", "AIRTELTIGO": "AIRTELTIGO"}
    normalized_provider = provider_map.get(request.momo_provider.upper(), request.momo_provider.upper())
    
    # Create withdrawal record
    withdrawal_id = str(uuid.uuid4())
    client_reference = f"SDMW_{uuid.uuid4().hex[:10].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    
    withdrawal_record = {
        "id": withdrawal_id,
        "admin_id": admin["id"],
        "admin_username": admin.get("username"),
        "amount": request.amount,
        "momo_number": request.momo_number,
        "momo_provider": normalized_provider,
        "account_name": request.account_name,
        "client_reference": client_reference,
        "status": "processing",
        "created_at": now
    }
    
    await db.sdm_commission_withdrawals.insert_one(withdrawal_record)
    
    # Send MoMo transfer
    transfer_result = await bulkclix_payment_service.transfer_momo(
        amount=request.amount,
        account_number=request.momo_number,
        network=normalized_provider,
        account_name=request.account_name or "SDM Admin",
        client_reference=client_reference
    )
    
    if transfer_result.get("success"):
        await db.sdm_commission_withdrawals.update_one(
            {"id": withdrawal_id},
            {"$set": {
                "status": "completed",
                "completed_at": now,
                "bulkclix_response": transfer_result.get("data")
            }}
        )
        
        return {
            "success": True,
            "message": f"Withdrawal of {request.amount} GHS sent to {request.momo_number}",
            "withdrawal_id": withdrawal_id,
            "client_reference": client_reference,
            "new_balance": round(available_balance - request.amount, 2)
        }
    else:
        await db.sdm_commission_withdrawals.update_one(
            {"id": withdrawal_id},
            {"$set": {
                "status": "failed",
                "error": transfer_result.get("error"),
                "failed_at": now
            }}
        )
        
        raise HTTPException(
            status_code=400,
            detail=f"Transfer failed: {transfer_result.get('error')}"
        )

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

@sdm_router.post("/admin/withdrawals/{withdrawal_id}/send-momo")
async def admin_send_momo_withdrawal(withdrawal_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Send MoMo transfer for withdrawal using BulkClix API"""
    # Get withdrawal details
    withdrawal = await db.sdm_withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal.get("status") != "pending":
        raise HTTPException(status_code=400, detail=f"Withdrawal is not pending (current: {withdrawal.get('status')})")
    
    # Get user details
    user = await db.sdm_users.find_one({"id": withdrawal["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Determine network from phone number or user preference
    network = withdrawal.get("network") or user.get("momo_provider") or "MTN"
    phone = withdrawal.get("phone") or user.get("phone")
    
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number for withdrawal")
    
    # Generate client reference
    client_reference = f"WDR_{withdrawal_id[:12].upper()}"
    account_name = user.get("full_name") or "SDM User"
    
    # Mark as processing
    await db.sdm_withdrawals.update_one(
        {"id": withdrawal_id},
        {"$set": {
            "status": "processing",
            "momo_transfer_initiated_at": datetime.now(timezone.utc).isoformat(),
            "admin_processed_by": admin["id"]
        }}
    )
    
    # Send MoMo transfer via BulkClix
    result = await bulkclix_payment_service.transfer_momo(
        amount=withdrawal["net_amount"],
        account_number=phone,
        network=network,
        account_name=account_name,
        client_reference=client_reference
    )
    
    if result.get("success"):
        # Update withdrawal with transfer details
        await db.sdm_withdrawals.update_one(
            {"id": withdrawal_id},
            {"$set": {
                "momo_transfer_response": result.get("data"),
                "client_reference": client_reference
            }}
        )
        
        return {
            "success": True,
            "message": "MoMo transfer initiated",
            "client_reference": client_reference,
            "amount": withdrawal["net_amount"],
            "phone": phone,
            "network": network,
            "response": result.get("data")
        }
    else:
        # Mark as failed and refund
        await db.sdm_withdrawals.update_one(
            {"id": withdrawal_id},
            {"$set": {
                "status": "failed",
                "error_message": result.get("error"),
                "failed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Refund user
        await db.sdm_users.update_one(
            {"id": withdrawal["user_id"]},
            {"$inc": {"wallet_available": withdrawal["amount"]}}
        )
        
        raise HTTPException(
            status_code=400,
            detail=f"MoMo transfer failed: {result.get('error')}"
        )

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
    
    # Calculate cashback (cashback_rate is stored as percentage, e.g., 8.0 means 8%)
    cashback_amount = amount * (merchant["cashback_rate"] / 100)
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

# NOTE: DEFAULT_VIP_CARDS with detailed tiers is defined locally here
# (Extended version with more fields than the one in config.py)
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

# Public endpoint for VIP cards (for landing page)
@sdm_router.get("/vip-cards")
async def get_public_vip_cards():
    """Public: Get active VIP card types for landing page display"""
    cards = await db.vip_card_types.find({"is_active": True}, {"_id": 0}).sort("price", 1).to_list(100)
    
    # Seed default cards if none exist
    if not cards:
        for card_data in DEFAULT_VIP_CARDS:
            card = VIPCardType(**card_data)
            await db.vip_card_types.insert_one(card.model_dump())
        cards = await db.vip_card_types.find({"is_active": True}, {"_id": 0}).sort("price", 1).to_list(100)
    
    return {"cards": cards}

# Public stats endpoint (for landing page)
@sdm_router.get("/stats")
async def get_public_stats():
    """Public: Get platform statistics for landing page"""
    total_users = await db.sdm_users.count_documents({})
    total_merchants = await db.sdm_merchants.count_documents({"is_verified": True})
    total_partners = await db.sdm_partners.count_documents({"is_active": True})
    total_transactions = await db.sdm_transactions.count_documents({})
    
    return {
        "total_users": total_users,
        "total_merchants": total_merchants,
        "total_partners": total_partners + total_merchants,
        "total_transactions": total_transactions
    }

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
    """Public: Get partners list for display (includes verified merchants)"""
    query = {"is_active": True}
    if category:
        query["category"] = category
    if city:
        query["city"] = city
    
    # Get partners from partners collection
    partners = await db.sdm_partners.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    
    # Also get verified merchants - exclude blocked, suspended and deleted
    merchant_query = {
        "is_verified": True,
        "$and": [
            {"$or": [{"is_blocked": {"$exists": False}}, {"is_blocked": False}]},
            {"$or": [{"is_suspended": {"$exists": False}}, {"is_suspended": False}]},
            {"$or": [{"is_deleted": {"$exists": False}}, {"is_deleted": False}]}
        ]
    }
    if category:
        merchant_query["business_category"] = category
    if city:
        merchant_query["city"] = city
    
    merchants = await db.sdm_merchants.find(merchant_query, {"_id": 0}).to_list(500)
    
    # Convert merchants to partner format
    for m in merchants:
        partners.append({
            "id": m.get("id"),
            "name": m.get("business_name", m.get("name", "Unknown")),
            "category": m.get("business_category", "General"),
            "city": m.get("city", ""),
            "address": m.get("gps_location", m.get("address", "")),
            "phone": m.get("phone", ""),
            "cashback_rate": m.get("cashback_rate", 1.0),
            "is_active": True,
            "is_merchant": True,
            "logo": m.get("logo", None),
            "description": m.get("description", "SDM Partner Merchant")
        })
    
    # Get unique categories for filter
    categories = await db.sdm_partners.distinct("category", {"is_active": True})
    merchant_categories = await db.sdm_merchants.distinct("business_category", {"is_verified": True})
    all_categories = list(set(categories + merchant_categories))
    
    cities = await db.sdm_partners.distinct("city", {"is_active": True})
    merchant_cities = await db.sdm_merchants.distinct("city", {"is_verified": True})
    all_cities = list(set(cities + merchant_cities))
    
    return {
        "partners": partners,
        "categories": all_categories,
        "cities": all_cities
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
    payment_method: str = "momo"  # "momo" or "card" only (no cash)
    momo_number: Optional[str] = None  # For MoMo payments
    momo_provider: Optional[str] = None  # MTN, TELECEL, AIRTELTIGO

@sdm_router.post("/user/vip-cards/purchase")
async def purchase_vip_card(request: PurchaseVIPCardRequest, user: dict = Depends(get_current_user)):
    """User: Purchase membership card using Mobile Money (required to activate account)"""
    from ledger import EntityType
    
    # Validate payment method - only MoMo allowed for now
    if request.payment_method not in ["momo"]:
        raise HTTPException(status_code=400, detail="Only Mobile Money payment is currently supported")
    
    # Validate MoMo details
    if request.payment_method == "momo":
        if not request.momo_number or not request.momo_provider:
            raise HTTPException(status_code=400, detail="MoMo number and provider are required for Mobile Money payment")
        # Normalize provider names
        provider_map = {"VODAFONE": "TELECEL", "MTN": "MTN", "TELECEL": "TELECEL", "AIRTELTIGO": "AIRTELTIGO"}
        normalized_provider = provider_map.get(request.momo_provider.upper())
        if not normalized_provider:
            raise HTTPException(status_code=400, detail="Invalid MoMo provider. Must be MTN, Telecel (Vodafone), or AirtelTigo")
        request.momo_provider = normalized_provider
    
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
    is_first_purchase = user.get("membership_status") != "active"
    
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
        is_first_purchase = False
    
    # Generate unique transaction ID
    transaction_id = f"VIP_{uuid.uuid4().hex[:12].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Create pending membership record
    expires_at = (datetime.now(timezone.utc) + timedelta(days=card_type["validity_days"])).isoformat()
    
    membership = VIPMembership(
        user_id=user["id"],
        user_phone=user["phone"],
        card_type_id=card_type["id"],
        tier=card_type["tier"],
        card_name=card_type["name"],
        price_paid=price_to_pay,
        payment_method=request.payment_method,
        expires_at=expires_at,
        upgraded_from=current_membership["tier"] if current_membership else None,
        status="pending"  # Will be activated on payment confirmation
    )
    
    membership_data = membership.model_dump()
    membership_data["payment_reference"] = transaction_id
    membership_data["momo_number"] = request.momo_number
    membership_data["momo_provider"] = request.momo_provider
    membership_data["payment_status"] = "pending"
    membership_data["is_first_purchase"] = is_first_purchase
    membership_data["created_at"] = now
    
    # Store pending membership
    await db.vip_memberships.insert_one(membership_data)
    
    # Initiate BulkClix MoMo collection
    callback_url = f"{os.environ.get('BACKEND_URL', 'https://web-boost-seo.preview.emergentagent.com')}/api/sdm/payments/webhook/vip-card"
    
    payment_result = await bulkclix_payment_service.collect_momo_payment(
        amount=price_to_pay,
        phone_number=request.momo_number,
        network=request.momo_provider,
        transaction_id=transaction_id,
        callback_url=callback_url,
        reference=f"SDM VIP {card_type['tier']}"  # Keep under 20 chars
    )
    
    if not payment_result.get("success"):
        # Payment initiation failed - delete pending membership
        await db.vip_memberships.delete_one({"id": membership.id})
        raise HTTPException(
            status_code=400, 
            detail=f"Payment initiation failed: {payment_result.get('error', 'Unknown error')}"
        )
    
    # Update membership with BulkClix response
    await db.vip_memberships.update_one(
        {"id": membership.id},
        {"$set": {
            "bulkclix_response": payment_result.get("data"),
            "payment_initiated_at": now
        }}
    )
    
    return {
        "message": "Payment initiated. Please approve the payment on your phone.",
        "transaction_id": transaction_id,
        "amount": price_to_pay,
        "payment_method": request.payment_method,
        "momo_number": request.momo_number,
        "momo_provider": request.momo_provider,
        "status": "pending",
        "card_name": card_type["name"],
        "is_upgrade": is_upgrade,
        "instructions": "You will receive a prompt on your phone to approve the payment. Once approved, your membership will be activated automatically."
    }

# ============== VIP CARD PAYMENT WEBHOOK ==============

@sdm_router.post("/payments/webhook/vip-card")
async def vip_card_payment_webhook(request: Request):
    """
    Webhook endpoint for VIP card payment confirmations from BulkClix
    Called when payment status changes
    """
    try:
        data = await request.json()
        logging.info(f"VIP Card Payment webhook received: {data}")
        
        # Extract transaction details from webhook
        transaction_id = data.get("transaction_id")
        ext_transaction_id = data.get("ext_transaction_id")
        status = data.get("status", "").lower()
        amount = data.get("amount")
        phone_number = data.get("phone_number")
        
        if not transaction_id:
            logging.warning("VIP Card webhook: Missing transaction_id")
            return {"success": False, "error": "Missing transaction_id"}
        
        # Find pending membership by transaction ID
        membership = await db.vip_memberships.find_one(
            {"payment_reference": transaction_id},
            {"_id": 0}
        )
        
        if not membership:
            logging.warning(f"VIP Card webhook: Membership not found for transaction: {transaction_id}")
            return {"success": False, "error": "Membership not found"}
        
        # Update with webhook data
        now = datetime.now(timezone.utc).isoformat()
        await db.vip_memberships.update_one(
            {"id": membership["id"]},
            {"$set": {
                "webhook_received": True,
                "webhook_data": data,
                "ext_transaction_id": ext_transaction_id,
                "webhook_received_at": now
            }}
        )
        
        # Process based on status
        if status == "success":
            await process_vip_card_payment_success(membership)
            return {"success": True, "message": "Payment processed, membership activated"}
        elif status in ["failed", "declined", "cancelled"]:
            await db.vip_memberships.update_one(
                {"id": membership["id"]},
                {"$set": {
                    "payment_status": "failed",
                    "status": "payment_failed",
                    "error_message": data.get("message", "Payment failed")
                }}
            )
            return {"success": True, "message": "Payment marked as failed"}
        
        return {"success": True, "message": "Webhook received"}
        
    except Exception as e:
        logging.error(f"VIP Card Payment webhook error: {e}")
        return {"success": False, "error": str(e)}

async def process_vip_card_payment_success(membership: dict):
    """Process successful VIP card payment - activate membership and pay bonuses"""
    from ledger import EntityType
    
    now = datetime.now(timezone.utc).isoformat()
    user_id = membership["user_id"]
    
    # Get user
    user = await db.sdm_users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        logging.error(f"User not found for membership: {membership['id']}")
        return
    
    # Check if this was an upgrade
    is_upgrade = membership.get("upgraded_from") is not None
    is_first_purchase = membership.get("is_first_purchase", False)
    
    # Mark old membership as upgraded if upgrading
    if is_upgrade:
        await db.vip_memberships.update_many(
            {"user_id": user_id, "status": "active", "id": {"$ne": membership["id"]}},
            {"$set": {"status": "upgraded"}}
        )
    
    # Get card type for details
    card_type = await db.vip_card_types.find_one({"id": membership["card_type_id"]}, {"_id": 0})
    
    # Activate membership
    await db.vip_memberships.update_one(
        {"id": membership["id"]},
        {"$set": {
            "status": "active",
            "payment_status": "completed",
            "activated_at": now
        }}
    )
    
    # Update user record
    user_updates = {
        "vip_tier": membership["tier"],
        "vip_membership_id": membership["id"],
        "membership_status": "active",
        "membership_confirmed_at": now
    }
    if card_type:
        user_updates["monthly_withdrawal_limit"] = card_type.get("monthly_withdrawal_limit", 2500)
    
    await db.sdm_users.update_one(
        {"id": user_id},
        {"$set": user_updates}
    )
    
    # Get or create wallet
    wallet = await ledger_service.get_wallet_by_entity(EntityType.CLIENT, user_id)
    if not wallet:
        wallet = await ledger_service.create_wallet(EntityType.CLIENT, user_id)
    
    # Award referral bonuses if first purchase and user was referred
    if is_first_purchase and user.get("referred_by"):
        # Award welcome bonus to new user (1 GHS)
        await db.sdm_users.update_one(
            {"id": user_id},
            {"$inc": {
                "wallet_available": REFERRAL_WELCOME_BONUS,
                "total_earned": REFERRAL_WELCOME_BONUS
            }}
        )
        if wallet:
            await db.wallets.update_one(
                {"id": wallet.id},
                {"$inc": {"available_balance": REFERRAL_WELCOME_BONUS, "balance": REFERRAL_WELCOME_BONUS}}
            )
        
        # Record welcome bonus
        welcome_bonus_record = ReferralBonus(
            referrer_id=user["referred_by"],
            referred_id=user_id,
            referred_phone=user["phone"],
            bonus_type="welcome_bonus",
            amount=REFERRAL_WELCOME_BONUS
        )
        await db.referral_bonuses.insert_one(welcome_bonus_record.model_dump())
        
        # Award referrer bonus (3 GHS)
        referrer = await db.sdm_users.find_one({"id": user["referred_by"]})
        if referrer:
            await db.sdm_users.update_one(
                {"id": referrer["id"]},
                {"$inc": {
                    "wallet_available": REFERRAL_BONUS,
                    "total_earned": REFERRAL_BONUS,
                    "referral_bonus_earned": REFERRAL_BONUS,
                    "referral_count": 1
                }}
            )
            
            referrer_wallet = await ledger_service.get_wallet_by_entity(EntityType.CLIENT, referrer["id"])
            if referrer_wallet:
                await db.wallets.update_one(
                    {"id": referrer_wallet.id},
                    {"$inc": {"available_balance": REFERRAL_BONUS, "balance": REFERRAL_BONUS}}
                )
            
            # Record referrer bonus
            referrer_bonus_record = ReferralBonus(
                referrer_id=referrer["id"],
                referred_id=user_id,
                referred_phone=user["phone"],
                bonus_type="referrer_bonus",
                amount=REFERRAL_BONUS
            )
            await db.referral_bonuses.insert_one(referrer_bonus_record.model_dump())
        
        # Mark referral as processed
        await db.vip_memberships.update_one(
            {"id": membership["id"]},
            {"$set": {"referrer_bonus_paid": True}}
        )
    
    logging.info(f"VIP Card membership activated: {membership['id']} for user {user_id}")

# ============== CHECK VIP PAYMENT STATUS ==============

@sdm_router.get("/user/vip-cards/payment-status/{transaction_id}")
async def check_vip_payment_status(transaction_id: str, user: dict = Depends(get_current_user)):
    """Check the status of a VIP card payment"""
    membership = await db.vip_memberships.find_one(
        {"payment_reference": transaction_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not membership:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {
        "transaction_id": transaction_id,
        "status": membership.get("payment_status", "pending"),
        "membership_status": membership.get("status"),
        "card_name": membership.get("card_name"),
        "price_paid": membership.get("price_paid"),
        "is_active": membership.get("status") == "active",
        "created_at": membership.get("created_at"),
        "activated_at": membership.get("activated_at")
    }

# ==================== REFERRAL HISTORY ENDPOINTS ====================

@sdm_router.get("/user/referrals")
async def get_user_referrals(
    user: dict = Depends(get_current_user),
    period: str = "all"  # all, day, week, month, year
):
    """Get user's referral history with filters"""
    now = datetime.now(timezone.utc)
    
    # Calculate date filter based on period
    date_filter = {}
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        date_filter = {"created_at": {"$gte": start_date.isoformat()}}
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_filter = {"created_at": {"$gte": start_date.isoformat()}}
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        date_filter = {"created_at": {"$gte": start_date.isoformat()}}
    elif period == "year":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        date_filter = {"created_at": {"$gte": start_date.isoformat()}}
    
    # Get users referred by this user
    query = {"referred_by": user["id"]}
    if date_filter:
        query.update(date_filter)
    
    referred_users = await db.sdm_users.find(
        query,
        {"_id": 0, "id": 1, "full_name": 1, "phone": 1, "membership_status": 1, "created_at": 1, "membership_confirmed_at": 1}
    ).sort("created_at", -1).to_list(500)
    
    # Get referral bonuses earned
    bonus_query = {"referrer_id": user["id"], "bonus_type": "referrer_bonus"}
    if date_filter:
        bonus_query.update(date_filter)
    
    bonuses = await db.referral_bonuses.find(bonus_query, {"_id": 0}).to_list(500)
    total_bonus_earned = sum(b.get("amount", 0) for b in bonuses)
    
    # Calculate stats
    total_referrals = len(referred_users)
    active_referrals = len([r for r in referred_users if r.get("membership_status") == "active"])
    pending_referrals = len([r for r in referred_users if r.get("membership_status") == "pending"])
    
    return {
        "referral_code": user.get("referral_code"),
        "period": period,
        "stats": {
            "total_referrals": total_referrals,
            "active_referrals": active_referrals,
            "pending_referrals": pending_referrals,
            "total_bonus_earned": total_bonus_earned
        },
        "referrals": [
            {
                "id": r["id"],
                "name": r.get("full_name", "N/A"),
                "phone": r.get("phone", "")[-4:].rjust(len(r.get("phone", "")), "*"),  # Mask phone
                "status": r.get("membership_status", "pending"),
                "registered_at": r.get("created_at"),
                "confirmed_at": r.get("membership_confirmed_at"),
                "bonus_earned": REFERRAL_BONUS if r.get("membership_status") == "active" else 0
            }
            for r in referred_users
        ],
        "how_it_works": {
            "step_1": "Share your referral code with friends",
            "step_2": "They sign up using your code",
            "step_3": f"When they buy a membership card: You get GHS {REFERRAL_BONUS}, they get GHS {REFERRAL_WELCOME_BONUS}!"
        }
    }

@sdm_router.get("/admin/referrals")
async def get_admin_referral_history(
    admin: dict = Depends(get_current_admin),
    limit: int = 100,
    period: str = "all"
):
    """Admin: Get complete referral history (who referred who)"""
    now = datetime.now(timezone.utc)
    
    # Calculate date filter based on period
    date_filter = {}
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        date_filter = {"created_at": {"$gte": start_date.isoformat()}}
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_filter = {"created_at": {"$gte": start_date.isoformat()}}
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        date_filter = {"created_at": {"$gte": start_date.isoformat()}}
    elif period == "year":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        date_filter = {"created_at": {"$gte": start_date.isoformat()}}
    
    # Get all referral bonuses
    bonus_query = {"bonus_type": "referrer_bonus"}
    if date_filter:
        bonus_query.update(date_filter)
    
    bonuses = await db.referral_bonuses.find(bonus_query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # Enrich with user details
    referral_history = []
    for bonus in bonuses:
        referrer = await db.sdm_users.find_one({"id": bonus["referrer_id"]}, {"_id": 0, "full_name": 1, "phone": 1})
        referred = await db.sdm_users.find_one({"id": bonus["referred_id"]}, {"_id": 0, "full_name": 1, "phone": 1, "membership_status": 1})
        
        referral_history.append({
            "id": bonus.get("id"),
            "referrer": {
                "id": bonus["referrer_id"],
                "name": referrer.get("full_name", "N/A") if referrer else "N/A",
                "phone": referrer.get("phone", "") if referrer else ""
            },
            "referred": {
                "id": bonus["referred_id"],
                "name": referred.get("full_name", "N/A") if referred else "N/A",
                "phone": referred.get("phone", "") if referred else "",
                "status": referred.get("membership_status", "pending") if referred else "unknown"
            },
            "bonus_amount": bonus.get("amount", 0),
            "date": bonus.get("created_at")
        })
    
    # Get all users who were referred but haven't purchased yet
    pending_referrals_query = {"referred_by": {"$exists": True, "$ne": None}, "membership_status": "pending"}
    if date_filter:
        pending_referrals_query.update(date_filter)
    
    pending_users = await db.sdm_users.find(
        pending_referrals_query,
        {"_id": 0, "id": 1, "full_name": 1, "phone": 1, "referred_by": 1, "created_at": 1}
    ).to_list(limit)
    
    pending_referrals = []
    for pu in pending_users:
        referrer = await db.sdm_users.find_one({"id": pu["referred_by"]}, {"_id": 0, "full_name": 1, "phone": 1})
        pending_referrals.append({
            "referred": {
                "id": pu["id"],
                "name": pu.get("full_name", "N/A"),
                "phone": pu.get("phone", "")
            },
            "referrer": {
                "id": pu["referred_by"],
                "name": referrer.get("full_name", "N/A") if referrer else "N/A",
                "phone": referrer.get("phone", "") if referrer else ""
            },
            "registered_at": pu.get("created_at"),
            "status": "pending_card_purchase"
        })
    
    # Calculate stats
    total_referrals = len(referral_history)
    total_bonus_paid = sum(r["bonus_amount"] for r in referral_history)
    
    return {
        "period": period,
        "stats": {
            "total_completed_referrals": total_referrals,
            "total_pending_referrals": len(pending_referrals),
            "total_bonus_paid": total_bonus_paid,
            "referrer_bonus": REFERRAL_BONUS,
            "welcome_bonus": REFERRAL_WELCOME_BONUS
        },
        "completed_referrals": referral_history,
        "pending_referrals": pending_referrals
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

# ============== BIRTHDAY BONUS JOB ==============
async def process_birthday_bonuses():
    """Process birthday bonuses for VIP members"""
    from datetime import datetime, timezone
    
    today = datetime.now(timezone.utc)
    current_month = today.month
    current_day = today.day
    
    try:
        # Find VIP users with birthday this month who haven't received bonus yet
        birthday_users = await db.sdm_users.find({
            "vip_membership_id": {"$exists": True, "$ne": None},
            "$expr": {
                "$and": [
                    {"$eq": [{"$month": {"$dateFromString": {"dateString": "$birth_date"}}}, current_month]},
                    {"$eq": [{"$dayOfMonth": {"$dateFromString": {"dateString": "$birth_date"}}}, current_day]}
                ]
            },
            f"birthday_bonus_{today.year}": {"$exists": False}
        }, {"_id": 0}).to_list(1000)
        
        config = await db.sdm_config.find_one({}, {"_id": 0}) or {}
        birthday_bonus_amount = config.get("birthday_bonus_amount", 5.0)  # Default 5 GHS
        
        for user in birthday_users:
            try:
                # Credit birthday bonus
                await db.sdm_users.update_one(
                    {"id": user["id"]},
                    {
                        "$inc": {"balance": birthday_bonus_amount, "total_earned": birthday_bonus_amount},
                        "$set": {f"birthday_bonus_{today.year}": True}
                    }
                )
                
                # Record transaction
                await db.sdm_transactions.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": user["id"],
                    "type": "birthday_bonus",
                    "amount": birthday_bonus_amount,
                    "description": f"Happy Birthday! VIP Birthday Bonus",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                # Send birthday SMS
                if user.get("phone"):
                    await send_sms_bulkclix(
                        user["phone"],
                        f"Happy Birthday from SDM Rewards! 🎉 We've added GHS {birthday_bonus_amount} to your wallet as a special birthday gift. Enjoy your day!"
                    )
                
                logging.info(f"Birthday bonus credited to user {user['id']}")
                
            except Exception as e:
                logging.error(f"Error processing birthday bonus for user {user.get('id')}: {e}")
        
        # Log job execution
        await db.scheduler_logs.insert_one({
            "job_type": "birthday_bonus",
            "status": "SUCCESS",
            "users_processed": len(birthday_users),
            "executed_at": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logging.error(f"Birthday bonus job error: {e}")
        await db.scheduler_logs.insert_one({
            "job_type": "birthday_bonus",
            "status": "ERROR",
            "error": str(e),
            "executed_at": datetime.now(timezone.utc).isoformat()
        })

# Schedule: Run daily at 08:00 UTC to check for birthdays
scheduler.add_job(
    process_birthday_bonuses,
    CronTrigger(hour=8, minute=0),
    id="birthday_bonus",
    name="Daily Birthday Bonus Processor",
    replace_existing=True
)

# ============== DAILY CASH SETTLEMENT JOB ==============
async def process_daily_cash_settlement():
    """
    Daily settlement of merchant cash debit accounts
    Runs at 00:00 UTC each day
    """
    logging.info("🏦 Starting daily cash settlement job...")
    
    try:
        # Get all merchants with cash mode enabled
        merchants = await db.sdm_merchants.find(
            {"cash_mode_enabled": True},
            {"_id": 0}
        ).to_list(10000)
        
        processed = 0
        alerts_sent = 0
        
        for merchant in merchants:
            cash_balance = merchant.get("cash_debit_balance", 0)
            cash_limit = merchant.get("cash_debit_limit", DEFAULT_CASH_DEBIT_LIMIT)
            grace_days = merchant.get("cash_grace_period_days", DEFAULT_GRACE_PERIOD_DAYS)
            
            # Check if merchant is in deficit
            if cash_balance < 0:
                deficit = abs(cash_balance)
                
                # Check if deficit exceeds limit
                if deficit > cash_limit:
                    grace_deadline = merchant.get("cash_grace_deadline")
                    
                    if not grace_deadline:
                        # Start grace period
                        deadline = (datetime.now(timezone.utc) + timedelta(days=grace_days)).isoformat()
                        await db.sdm_merchants.update_one(
                            {"id": merchant["id"]},
                            {"$set": {"cash_grace_deadline": deadline}}
                        )
                        
                        # Send warning notification (TODO: implement SMS/Push)
                        logging.warning(f"⚠️ Merchant {merchant['business_name']} exceeded cash limit. Grace period started.")
                        alerts_sent += 1
                        
                    else:
                        # Check if grace period expired
                        deadline_dt = datetime.fromisoformat(grace_deadline.replace('Z', '+00:00'))
                        if datetime.now(timezone.utc) > deadline_dt:
                            # Disable cash mode
                            await db.sdm_merchants.update_one(
                                {"id": merchant["id"]},
                                {"$set": {"cash_mode_enabled": False}}
                            )
                            
                            logging.warning(f"🚫 Merchant {merchant['business_name']} cash mode disabled due to unpaid deficit.")
                            alerts_sent += 1
                
                processed += 1
            else:
                # Clear any grace deadline if balance is positive
                if merchant.get("cash_grace_deadline"):
                    await db.sdm_merchants.update_one(
                        {"id": merchant["id"]},
                        {"$set": {"cash_grace_deadline": None}}
                    )
        
        logging.info(f"✅ Daily cash settlement complete. Processed: {processed}, Alerts: {alerts_sent}")
        
        # Log to scheduler history
        await db.scheduler_logs.insert_one({
            "id": str(uuid.uuid4()),
            "job_type": "daily_cash_settlement",
            "status": "SUCCESS",
            "merchants_processed": processed,
            "alerts_sent": alerts_sent,
            "executed_at": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logging.error(f"❌ Daily cash settlement error: {e}")
        await db.scheduler_logs.insert_one({
            "id": str(uuid.uuid4()),
            "job_type": "daily_cash_settlement",
            "status": "ERROR",
            "error": str(e),
            "executed_at": datetime.now(timezone.utc).isoformat()
        })

# Schedule: Run daily at 00:00 UTC for cash settlement
scheduler.add_job(
    process_daily_cash_settlement,
    CronTrigger(hour=0, minute=0),
    id="daily_cash_settlement",
    name="Daily Cash Settlement Processor",
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
    
    # Ensure super admin account exists and has correct role
    await ensure_super_admin()

async def ensure_super_admin():
    """Ensure the primary super admin account exists with correct role"""
    super_admin_email = "emileparfait2003@gmail.com"
    
    try:
        # Check if admin exists
        existing_admin = await db.admins.find_one({
            "$or": [
                {"email": super_admin_email},
                {"username": super_admin_email}
            ]
        })
        
        if existing_admin:
            # Update to super_admin if not already
            if existing_admin.get("role") != "super_admin":
                await db.admins.update_one(
                    {"_id": existing_admin["_id"]},
                    {"$set": {
                        "role": "super_admin",
                        "permissions": ["*"]
                    }}
                )
                logging.info(f"✅ Upgraded {super_admin_email} to super_admin")
            else:
                logging.info(f"✅ Super admin {super_admin_email} already configured")
        else:
            # Create super admin account
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            
            admin_data = {
                "id": str(uuid.uuid4()),
                "username": super_admin_email,
                "email": super_admin_email,
                "password_hash": pwd_context.hash("Gerard0103@"),
                "role": "super_admin",
                "permissions": ["*"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.admins.insert_one(admin_data)
            logging.info(f"✅ Created super admin account: {super_admin_email}")
    except Exception as e:
        logging.error(f"❌ Error ensuring super admin: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown()
    client.close()
    logging.info("Scheduler and DB connection closed")
