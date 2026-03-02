# /app/backend/models/merchants.py
"""
SDM Merchant Models
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid
import secrets


class MerchantMembershipCardType(BaseModel):
    """Merchant-specific membership card type"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    merchant_id: str
    merchant_name: str
    name: str
    description: Optional[str] = None
    price: float
    validity_days: int = 365
    cashback_bonus: float = 0.0
    referral_bonus: float = 5.0
    welcome_bonus: float = 2.0
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
    payment_method: str = "wallet"
    payment_reference: Optional[str] = None
    status: str = "active"
    purchased_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str = ""
    referrer_bonus_paid: bool = False
