"""
SDM REWARDS - Merchants Router Package
======================================
Refactored merchant routes organized by domain

Migration Status:
- ✅ public.py: Partners, QR lookup (2 routes)
- ⏳ Remaining routes: Still in merchants_legacy.py (54 routes)

Usage in server.py:
    from routers.merchants import router as merchants_router
    app.include_router(merchants_router, prefix="/api/merchants", tags=["Merchants"])
"""

from fastapi import APIRouter

# Create main router
router = APIRouter()

# Import sub-routers
from .public import router as public_router

# Include extracted public routes FIRST
router.include_router(public_router, tags=["Merchant Public"])

# Import legacy router
from routers.merchants_legacy import router as legacy_router

# Migrated paths to exclude from legacy import
MIGRATED_PATHS = {'/partners', '/by-qr/{qr_code}'}

# Include legacy routes, excluding migrated ones
for route in legacy_router.routes:
    path = getattr(route, 'path', '')
    if path not in MIGRATED_PATHS:
        router.routes.append(route)

# Export shared utilities
from .shared import get_db, logger, pwd_context

__all__ = [
    "router",
    "get_db", "logger", "pwd_context"
]
