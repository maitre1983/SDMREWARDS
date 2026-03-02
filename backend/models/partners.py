# /app/backend/models/partners.py
"""
SDM Partner Models
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
from enum import Enum
import uuid


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
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
