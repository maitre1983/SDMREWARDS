"""
SDM REWARDS - Merchants Router Package
======================================
Refactored merchant routes organized by domain

Migration Status (56 routes total):
- ✅ public.py: Partners, QR lookup (2 routes)
- ✅ dashboard.py: Dashboard, stats, charts (5 routes)
- ⏳ Remaining: 49 routes in merchants_legacy.py

Usage in server.py:
    from routers.merchants import router as merchants_router
    app.include_router(merchants_router, prefix="/api/merchants", tags=["Merchants"])
"""

from fastapi import APIRouter

router = APIRouter()

# Import extracted sub-routers
from .public import router as public_router
from .dashboard import router as dashboard_router

# Include extracted routes FIRST (they take priority)
router.include_router(public_router, tags=["Merchant Public"])
router.include_router(dashboard_router, tags=["Merchant Dashboard"])

# Import legacy routes (now internal to package)
from .legacy_routes import router as legacy_router

# Paths migrated to sub-modules (exclude from legacy)
MIGRATED_PATHS = {
    '/partners', '/by-qr/{qr_code}',  # public.py
    '/me', '/dashboard/advanced-stats', '/dashboard/summary',  # dashboard.py
    '/dashboard/chart-data', '/dashboard/payment-methods'
}

# Include non-migrated legacy routes
for route in legacy_router.routes:
    path = getattr(route, 'path', '')
    if path not in MIGRATED_PATHS:
        router.routes.append(route)

# Export utilities
from .shared import get_db, logger, pwd_context

__all__ = ["router", "get_db", "logger", "pwd_context"]
