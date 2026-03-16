"""
SDM REWARDS - Payments Router Package
=====================================
Refactored payment routes organized by domain

Structure:
- shared.py: Config, helpers, schemas
- card.py: Card purchase endpoints
- merchant.py: Merchant payment endpoints (MoMo, cash, cashback)
- callbacks.py: Hubtel callbacks and status checks
- withdrawal.py: Cashback withdrawal endpoints
- processing.py: Payment completion logic (internal functions)
- test.py: Test mode manual confirmation endpoints

Usage in server.py:
    from routers.payments import router as payments_router, set_db
    set_db(db)
    app.include_router(payments_router, prefix="/api/payments", tags=["Payments"])
"""

from fastapi import APIRouter

# Import sub-routers
from .card import router as card_router
from .merchant import router as merchant_router
from .callbacks import router as callbacks_router
from .withdrawal import router as withdrawal_router
from .test import router as test_router

# Main router that combines all sub-routers
router = APIRouter()

# Include sub-routers
router.include_router(card_router, tags=["Card Payments"])
router.include_router(merchant_router, tags=["Merchant Payments"])
router.include_router(callbacks_router, tags=["Payment Callbacks"])
router.include_router(withdrawal_router, tags=["Withdrawals"])
router.include_router(test_router, tags=["Test Mode"])

# Export shared utilities for use in other modules
from .shared import (
    set_db, get_db, detect_network, normalize_network, is_test_mode,
    get_sms, get_gamification, get_push_service,
    CardPaymentRequest, MerchantPaymentRequest, ClientCashPaymentRequest,
    WithdrawalRequest, logger
)

# Export processing functions for callbacks
from .processing import complete_payment

__all__ = [
    "router",
    "set_db", "get_db",
    "detect_network", "normalize_network", "is_test_mode",
    "get_sms", "get_gamification", "get_push_service",
    "CardPaymentRequest", "MerchantPaymentRequest", 
    "ClientCashPaymentRequest", "WithdrawalRequest",
    "complete_payment"
]
