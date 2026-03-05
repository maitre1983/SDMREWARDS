"""
SDM REWARDS - Data Models
=========================
Pydantic models for database entities
"""

from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr
from enum import Enum
import uuid


# ============== ENUMS ==============

class CardType(str, Enum):
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class TransactionType(str, Enum):
    CARD_PURCHASE = "card_purchase"
    CASHBACK_EARNED = "cashback_earned"
    CASHBACK_USED = "cashback_used"
    REFERRAL_BONUS = "referral_bonus"
    WELCOME_BONUS = "welcome_bonus"
    PAYMENT = "payment"
    WITHDRAWAL = "withdrawal"


class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    MOMO = "momo"
    CARD = "card"
    CASH = "cash"
    CASHBACK = "cashback"


class ClientStatus(str, Enum):
    PENDING = "pending"  # Registered but no card
    ACTIVE = "active"    # Has purchased a card
    SUSPENDED = "suspended"
    DELETED = "deleted"


class MerchantStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"


# ============== CLIENT MODEL ==============

class Client(BaseModel):
    """Client/Member model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Basic info
    full_name: str
    username: str
    phone: str  # Unique, format: +233XXXXXXXXX
    email: Optional[str] = None
    password_hash: str
    birthday: Optional[str] = None  # For birthday bonus
    
    # Status & membership
    status: ClientStatus = ClientStatus.PENDING
    card_type: Optional[CardType] = None
    card_number: Optional[str] = None
    card_purchased_at: Optional[str] = None
    card_expires_at: Optional[str] = None  # Card expiration date
    card_duration_days: Optional[int] = None  # Duration in days
    
    # QR Code
    qr_code: str = Field(default_factory=lambda: f"SDM-C-{uuid.uuid4().hex[:8].upper()}")
    
    # Wallet
    cashback_balance: float = 0.0
    total_earned: float = 0.0
    total_spent: float = 0.0
    
    # Referral
    referral_code: str = Field(default_factory=lambda: f"SDM{uuid.uuid4().hex[:6].upper()}")
    referred_by: Optional[str] = None  # Referrer's referral_code
    referral_count: int = 0
    
    # Language preference
    language: str = "en"
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None


# ============== MERCHANT MODEL ==============

class Merchant(BaseModel):
    """Merchant/Partner model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Business info
    business_name: str
    business_type: Optional[str] = None
    business_address: Optional[str] = None
    business_description: Optional[str] = None
    logo_url: Optional[str] = None
    
    # Contact info
    owner_name: str
    phone: str  # Unique
    email: Optional[str] = None
    password_hash: str
    
    # Status
    status: MerchantStatus = MerchantStatus.PENDING
    
    # Cashback settings (1% - 20%)
    cashback_rate: float = 5.0  # Default 5%
    
    # Payment info
    momo_number: Optional[str] = None
    momo_network: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    
    # QR Codes
    payment_qr_code: str = Field(default_factory=lambda: f"SDM-M-{uuid.uuid4().hex[:8].upper()}")
    recruitment_qr_code: str = Field(default_factory=lambda: f"SDM-R-{uuid.uuid4().hex[:8].upper()}")
    
    # Statistics
    total_transactions: int = 0
    total_volume: float = 0.0
    total_cashback_given: float = 0.0
    
    # API Integration
    api_key: Optional[str] = None
    api_enabled: bool = False
    
    # Language preference
    language: str = "en"
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None


# ============== TRANSACTION MODEL ==============

class Transaction(BaseModel):
    """Transaction model - all financial operations"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Type
    type: TransactionType
    status: TransactionStatus = TransactionStatus.PENDING
    
    # Parties
    client_id: Optional[str] = None
    merchant_id: Optional[str] = None
    
    # Amounts
    amount: float  # Transaction amount
    cashback_amount: float = 0.0  # Cashback generated
    commission_amount: float = 0.0  # Platform commission
    net_amount: float = 0.0  # Amount after commission
    
    # Payment details
    payment_method: Optional[PaymentMethod] = None
    payment_reference: Optional[str] = None
    payment_phone: Optional[str] = None
    
    # Description
    description: Optional[str] = None
    
    # Metadata
    metadata: dict = Field(default_factory=dict)
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None


# ============== MEMBERSHIP CARD MODEL ==============

class MembershipCard(BaseModel):
    """Membership card model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    client_id: str
    card_type: CardType
    card_number: str = Field(default_factory=lambda: f"SDM-{uuid.uuid4().hex[:12].upper()}")
    
    # Purchase details
    price: float
    payment_method: PaymentMethod
    payment_reference: Optional[str] = None
    
    # Status
    is_active: bool = True
    
    # QR Code
    qr_code: str = Field(default_factory=lambda: f"CARD-{uuid.uuid4().hex[:8].upper()}")
    
    # Timestamps
    purchased_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: Optional[str] = None  # None = never expires


# ============== REFERRAL MODEL ==============

class Referral(BaseModel):
    """Referral tracking model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    referrer_id: str  # Client who referred
    referred_id: str  # New client
    referral_code: str  # Code used
    
    # Bonuses
    referrer_bonus: float = 3.0  # GHS
    referred_bonus: float = 1.0  # GHS (welcome bonus)
    bonuses_paid: bool = False
    
    # Status
    card_purchased: bool = False  # Bonus only paid when card is purchased
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    bonus_paid_at: Optional[str] = None


# ============== ADMIN MODEL ==============

class Admin(BaseModel):
    """Admin user model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    email: str
    password_hash: str
    name: Optional[str] = None
    
    # Permissions
    is_super_admin: bool = False
    permissions: List[str] = Field(default_factory=list)
    
    # Status
    is_active: bool = True
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None
