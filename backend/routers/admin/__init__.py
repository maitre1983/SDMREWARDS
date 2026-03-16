"""
SDM REWARDS - Admin Router Package
==================================
Refactored admin routes using existing admin_modules + legacy

Migration Status (93 routes total):
- ✅ admin_modules/dashboard.py: 3 routes
- ✅ admin_modules/clients.py: 13 routes
- ✅ admin_modules/merchants.py: 14 routes
- ✅ admin_modules/settings.py: 9 routes
- ✅ admin_modules/admins.py: 10 routes
- ✅ admin_modules/sms.py: 15 routes
- ⏳ admin_legacy.py: ~29 routes (gamification, email, debit mgmt, etc.)

Usage in server.py:
    from routers.admin import router as admin_router
    app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
"""

from fastapi import APIRouter

router = APIRouter()

# Import sub-routers from admin_modules
from routers.admin_modules.dashboard import router as dashboard_router
from routers.admin_modules.clients import router as clients_router
from routers.admin_modules.merchants import router as merchants_router
from routers.admin_modules.settings import router as settings_router
from routers.admin_modules.admins import router as admins_router
from routers.admin_modules.sms import router as sms_router

# Include admin_modules routers first
router.include_router(dashboard_router, tags=["Admin Dashboard"])
router.include_router(clients_router, tags=["Admin Clients"])
router.include_router(merchants_router, tags=["Admin Merchants"])
router.include_router(settings_router, tags=["Admin Settings"])
router.include_router(admins_router, tags=["Admin Users"])
router.include_router(sms_router, tags=["Admin SMS"])

# Collect paths from admin_modules
MIGRATED_PATHS = set()
for sub_router in [dashboard_router, clients_router, merchants_router, 
                   settings_router, admins_router, sms_router]:
    for route in sub_router.routes:
        path = getattr(route, 'path', '')
        MIGRATED_PATHS.add(path)

# Import legacy routes (now internal to package)
from .legacy_routes import router as legacy_router

# Include non-migrated legacy routes
for route in legacy_router.routes:
    path = getattr(route, 'path', '')
    if path not in MIGRATED_PATHS:
        router.routes.append(route)

# Export for external use
from routers.admin_modules import get_db, check_is_super_admin, logger

__all__ = ["router", "get_db", "check_is_super_admin", "logger"]
