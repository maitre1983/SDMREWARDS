"""
SDM REWARDS - Payments Router Package
=====================================
Refactored payment routes organized by domain

IMPORTANT: This package is designed to work alongside the legacy 
payments.py file during the migration period.

Structure:
- shared.py: Config, helpers, schemas
- card.py: Card purchase endpoints
- merchant.py: Merchant payment endpoints (MoMo, cash, cashback)
- callbacks.py: Hubtel callbacks and status checks (TODO)
- withdrawal.py: Cashback withdrawal endpoints (TODO)
- processing.py: Payment completion logic (TODO)

Migration Status:
- [x] shared.py - Config, helpers, schemas extracted
- [x] card.py - Card purchase initiate endpoint
- [x] merchant.py - Merchant payment endpoints (initiate, cash, cashback)
- [ ] callbacks.py - Pending extraction
- [ ] withdrawal.py - Pending extraction
- [ ] processing.py - Pending extraction

To complete migration:
1. Extract remaining routes to their modules
2. Update server.py to use this package instead of legacy payments.py
3. Test all endpoints thoroughly
4. Delete legacy payments.py

Usage in server.py (after full migration):
    from routers.payments import router as payments_router
    app.include_router(payments_router, prefix="/api/payments", tags=["Payments"])
"""

from fastapi import APIRouter

# Import sub-routers
from .card import router as card_router
from .merchant import router as merchant_router

# Main router that combines all sub-routers
router = APIRouter()

# Include sub-routers
router.include_router(card_router, tags=["Card Payments"])
router.include_router(merchant_router, tags=["Merchant Payments"])

# Export shared utilities for use in other modules
from .shared import (
    set_db, get_db, detect_network, normalize_network, is_test_mode,
    get_sms, get_gamification, get_push_service,
    CardPaymentRequest, MerchantPaymentRequest, ClientCashPaymentRequest,
    WithdrawalRequest, logger
)

__all__ = [
    "router",
    "set_db", "get_db",
    "detect_network", "normalize_network", "is_test_mode",
    "get_sms", "get_gamification", "get_push_service",
    "CardPaymentRequest", "MerchantPaymentRequest", 
    "ClientCashPaymentRequest", "WithdrawalRequest"
]
