"""
SDM REWARDS - Admin Router Package
===================================
Refactored admin routes organized by domain

Structure:
- models.py: Pydantic request/response models
- dependencies.py: Shared utilities and DB connection
- dashboard.py: Dashboard and analytics endpoints
- clients.py: Client management endpoints (TODO)
- merchants.py: Merchant management endpoints (TODO)
- settings.py: Platform settings endpoints (TODO)
- sms.py: SMS and messaging endpoints (TODO)
- admins.py: Admin user management endpoints (TODO)

Migration Note:
The original admin.py (2700+ lines) is being progressively refactored.
Currently, the main admin.py imports from these modules for new code,
while maintaining backwards compatibility with existing endpoints.
"""

from routers.admin_modules.models import (
    CreateAdminRequest,
    UpdateClientRequest,
    UpdateClientLimitsRequest,
    SendSMSRequest,
    UpdateMerchantRequest,
    UpdateCommissionRequest,
    UpdateCardPricesRequest,
    CreateCardTypeRequest,
    UpdateCardTypeRequest,
    UpdateServiceCommissionsRequest,
    UpdateReferralBonusesRequest,
    CreateClientManualRequest,
    CreateMerchantManualRequest,
    BulkSMSRequest,
    SMSTemplateRequest,
    SetPINRequest,
    VerifyPINRequest,
    ChangePasswordRequest,
    AdminResetPasswordRequest,
    CreateAdminRoleRequest,
    UpdateAdminRoleRequest,
    StatusActionRequest,
    PaymentLogoRequest,
    ADMIN_ROLES
)

from routers.admin_modules.dependencies import (
    check_is_super_admin,
    get_db,
    logger
)

# Export all models and utilities
__all__ = [
    # Models
    "CreateAdminRequest",
    "UpdateClientRequest",
    "UpdateClientLimitsRequest",
    "SendSMSRequest",
    "UpdateMerchantRequest",
    "UpdateCommissionRequest",
    "UpdateCardPricesRequest",
    "CreateCardTypeRequest",
    "UpdateCardTypeRequest",
    "UpdateServiceCommissionsRequest",
    "UpdateReferralBonusesRequest",
    "CreateClientManualRequest",
    "CreateMerchantManualRequest",
    "BulkSMSRequest",
    "SMSTemplateRequest",
    "SetPINRequest",
    "VerifyPINRequest",
    "ChangePasswordRequest",
    "AdminResetPasswordRequest",
    "CreateAdminRoleRequest",
    "UpdateAdminRoleRequest",
    "StatusActionRequest",
    "PaymentLogoRequest",
    "ADMIN_ROLES",
    # Utilities
    "check_is_super_admin",
    "get_db",
    "logger"
]
