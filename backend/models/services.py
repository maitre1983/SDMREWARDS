# /app/backend/models/services.py
"""
Super App Services Models
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
from enum import Enum
import uuid


class ServiceType(str, Enum):
    AIRTIME = "AIRTIME"
    DATA = "DATA"
    BILL_PAYMENT = "BILL_PAYMENT"
    MOMO_WITHDRAWAL = "MOMO_WITHDRAWAL"


class ServiceTransactionStatus(str, Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PROCESSING = "PROCESSING"


class ServiceTransaction(BaseModel):
    """Super App Service Transaction"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_phone: str
    service_type: str
    amount: float
    net_amount: float
    fee: float = 0.0
    recipient: str
    network: Optional[str] = None
    provider: Optional[str] = None
    data_bundle_id: Optional[str] = None
    reference: str = Field(default_factory=lambda: f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}")
    external_reference: Optional[str] = None
    status: str = "PENDING"
    failure_reason: Optional[str] = None
    idempotency_key: Optional[str] = None
    promotion_applied: Optional[str] = None
    discount_amount: float = 0.0
    original_amount: float = 0.0
    ledger_transaction_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None


class ServicePromotion(BaseModel):
    """Service Promotion/Discount"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    service_type: str
    discount_type: str = "PERCENTAGE"
    discount_value: float = 10.0
    min_amount: float = 0.0
    max_discount: float = 100.0
    day_conditions: Optional[str] = None
    vip_only: bool = False
    min_vip_tier: Optional[str] = None
    is_active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    usage_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
