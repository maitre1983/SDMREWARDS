# /app/backend/models/vip.py
"""
VIP Membership Card Models
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid
import secrets


class VIPCardTier(str, Enum):
    SILVER = "SILVER"
    GOLD = "GOLD"
    PLATINUM = "PLATINUM"


class VIPCardType(BaseModel):
    """VIP Membership Card Type - Admin managed"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    tier: str
    card_name: str
    card_number: str = Field(default_factory=lambda: f"VIP{datetime.now().strftime('%Y%m%d')}{secrets.token_hex(4).upper()}")
    price_paid: float
    payment_method: str = "cashback"
    status: str = "active"
    purchased_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str = ""
    upgraded_from: Optional[str] = None
    referrer_bonus_paid: bool = False
