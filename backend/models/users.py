# /app/backend/models/users.py
"""
SDM User Models
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid
import secrets


class SDMUser(BaseModel):
    """SDM Client User"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    phone_verified: bool = False
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    qr_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:12].upper())
    referral_code: str = Field(default_factory=lambda: f"SDM{secrets.token_hex(3).upper()}")
    referred_by: Optional[str] = None
    referral_bonus_earned: float = 0.0
    referral_count: int = 0
    referral_level: str = "bronze"
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
