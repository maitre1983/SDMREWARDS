# /app/backend/models/lottery.py
"""
VIP Lottery Models
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid


class LotteryStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    DRAWING = "DRAWING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class LotteryFundingSource(str, Enum):
    FIXED = "FIXED"
    COMMISSION = "COMMISSION"
    MIXED = "MIXED"


class SDMLottery(BaseModel):
    """Monthly VIP Lottery Draw"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    month: str
    status: str = "DRAFT"
    funding_source: str = "FIXED"
    fixed_amount: float = 0.0
    commission_percentage: float = 0.0
    total_prize_pool: float = 0.0
    prize_distribution: List[float] = Field(default_factory=lambda: [40, 25, 15, 12, 8])
    total_participants: int = 0
    total_entries: int = 0
    start_date: str = ""
    end_date: str = ""
    draw_date: Optional[str] = None
    winners: List[Dict] = Field(default_factory=list)
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
    vip_tier: str
    entries: int
    is_winner: bool = False
    prize_rank: Optional[int] = None
    prize_amount: Optional[float] = None
    prize_type: str = "CASHBACK"
    registered_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class LotteryWinnerAnnouncement(BaseModel):
    """Public lottery winner announcement"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lottery_id: str
    lottery_name: str
    total_prize_pool: float
    winners: List[Dict] = Field(default_factory=list)
    announced_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AutoLotteryConfig(BaseModel):
    """Auto lottery scheduler configuration"""
    id: str = "auto_lottery"
    enabled: bool = True
    default_prize_amount: float = 500.0
    auto_activate: bool = True
    last_auto_created: Optional[str] = None
    next_draw_month: Optional[str] = None
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None
