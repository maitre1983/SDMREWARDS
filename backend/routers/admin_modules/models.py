"""
SDM REWARDS - Admin Router Models
=================================
Pydantic models for admin API requests/responses
"""

from typing import Optional, List
from pydantic import BaseModel


# ============== REQUEST MODELS ==============

class CreateAdminRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    is_super_admin: bool = False


class UpdateClientRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None


class UpdateClientLimitsRequest(BaseModel):
    withdrawal_limit: Optional[float] = None
    transaction_limit: Optional[float] = None
    daily_limit: Optional[float] = None


class SendSMSRequest(BaseModel):
    message: str


class UpdateMerchantRequest(BaseModel):
    business_name: Optional[str] = None
    owner_name: Optional[str] = None
    status: Optional[str] = None
    cashback_rate: Optional[float] = None
    address: Optional[str] = None
    google_maps_url: Optional[str] = None
    city: Optional[str] = None


class UpdateCommissionRequest(BaseModel):
    platform_commission_rate: Optional[float] = None
    usage_commission_type: Optional[str] = None
    usage_commission_rate: Optional[float] = None


class UpdateCardPricesRequest(BaseModel):
    silver_price: Optional[float] = None
    gold_price: Optional[float] = None
    platinum_price: Optional[float] = None
    silver_benefits: Optional[str] = None
    gold_benefits: Optional[str] = None
    platinum_benefits: Optional[str] = None
    silver_duration: Optional[int] = None
    gold_duration: Optional[int] = None
    platinum_duration: Optional[int] = None
    silver_welcome_bonus: Optional[float] = None
    gold_welcome_bonus: Optional[float] = None
    platinum_welcome_bonus: Optional[float] = None


class CreateCardTypeRequest(BaseModel):
    name: str
    slug: str
    price: float
    duration_days: int
    benefits: str
    color: Optional[str] = "#6366f1"
    icon: Optional[str] = "credit-card"
    is_active: bool = True
    sort_order: int = 0


class UpdateCardTypeRequest(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    duration_days: Optional[int] = None
    benefits: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class UpdateServiceCommissionsRequest(BaseModel):
    airtime_commission_type: Optional[str] = None
    airtime_commission_rate: Optional[float] = None
    data_commission_type: Optional[str] = None
    data_commission_rate: Optional[float] = None
    ecg_commission_type: Optional[str] = None
    ecg_commission_rate: Optional[float] = None
    merchant_payment_commission_type: Optional[str] = None
    merchant_payment_commission_rate: Optional[float] = None
    withdrawal_commission_type: Optional[str] = None
    withdrawal_commission_rate: Optional[float] = None


class UpdateReferralBonusesRequest(BaseModel):
    welcome_bonus: Optional[float] = None
    referrer_bonus: Optional[float] = None


class CreateClientManualRequest(BaseModel):
    full_name: str
    phone: str
    username: str
    email: Optional[str] = None
    card_type: Optional[str] = None


class CreateMerchantManualRequest(BaseModel):
    business_name: str
    owner_name: str
    phone: str
    email: Optional[str] = None
    cashback_rate: float = 5.0
    city: Optional[str] = None
    address: Optional[str] = None
    google_maps_url: Optional[str] = None


class BulkSMSRequest(BaseModel):
    message: str
    recipient_filter: str
    recipient_ids: Optional[List[str]] = None
    scheduled_at: Optional[str] = None
    template_id: Optional[str] = None


class SMSTemplateRequest(BaseModel):
    name: str
    message: str
    category: str = "general"


class SetPINRequest(BaseModel):
    pin: str
    otp_code: Optional[str] = None


class VerifyPINRequest(BaseModel):
    pin: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    otp_code: str
    otp_method: str = "sms"


class AdminResetPasswordRequest(BaseModel):
    new_password: str


class CreateAdminRoleRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str
    permissions: Optional[List[str]] = None


class UpdateAdminRoleRequest(BaseModel):
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None


class StatusActionRequest(BaseModel):
    status: str


class PaymentLogoRequest(BaseModel):
    name: str
    logo_url: str
    display_order: int = 0
    is_active: bool = True


# Admin role definitions
ADMIN_ROLES = {
    "super_admin": {
        "name": "Super Admin",
        "permissions": ["all"]
    },
    "admin_support": {
        "name": "Admin Support",
        "permissions": ["view_clients", "edit_clients", "send_sms_clients", "view_stats"]
    },
    "admin_merchants": {
        "name": "Admin Merchants", 
        "permissions": ["view_merchants", "edit_merchants", "approve_merchants", "send_sms_merchants", "view_stats"]
    },
    "admin_finance": {
        "name": "Admin Finance",
        "permissions": ["view_stats", "view_transactions", "view_commissions"]
    },
    "admin_readonly": {
        "name": "Read-only Admin",
        "permissions": ["view_clients", "view_merchants", "view_stats"]
    }
}
