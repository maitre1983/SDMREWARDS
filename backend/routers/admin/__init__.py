"""
SDM REWARDS - Admin Router Package
==================================
Refactored admin routes using existing admin_modules

Migration Status:
- ✅ admin_modules/dashboard.py: 3 routes
- ✅ admin_modules/clients.py: 13 routes
- ✅ admin_modules/merchants.py: 14 routes
- ✅ admin_modules/settings.py: 9 routes
- ✅ admin_modules/admins.py: 10 routes
- ✅ admin_modules/sms.py: 15 routes
- ⏳ Remaining routes: Still in admin_legacy.py (~29 routes)

Usage in server.py:
    from routers.admin import router as admin_router
    app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
"""

from fastapi import APIRouter

# Create main router
router = APIRouter()

# Import sub-routers from admin_modules
from routers.admin_modules.dashboard import router as dashboard_router
from routers.admin_modules.clients import router as clients_router
from routers.admin_modules.merchants import router as merchants_router
from routers.admin_modules.settings import router as settings_router
from routers.admin_modules.admins import router as admins_router
from routers.admin_modules.sms import router as sms_router

# Include admin_modules routers
router.include_router(dashboard_router, tags=["Admin Dashboard"])
router.include_router(clients_router, tags=["Admin Clients"])
router.include_router(merchants_router, tags=["Admin Merchants"])
router.include_router(settings_router, tags=["Admin Settings"])
router.include_router(admins_router, tags=["Admin Users"])
router.include_router(sms_router, tags=["Admin SMS"])

# Import legacy router for remaining routes
from routers.admin_legacy import router as legacy_router

# Paths already covered by admin_modules (to exclude from legacy)
MIGRATED_PATHS = set()

# Get paths from admin_modules
for sub_router in [dashboard_router, clients_router, merchants_router, 
                   settings_router, admins_router, sms_router]:
    for route in sub_router.routes:
        path = getattr(route, 'path', '')
        MIGRATED_PATHS.add(path)

# Include remaining legacy routes
for route in legacy_router.routes:
    path = getattr(route, 'path', '')
    if path not in MIGRATED_PATHS:
        router.routes.append(route)

# Export for external use
from routers.admin_modules import get_db, check_is_super_admin, logger

__all__ = [
    "router",
    "get_db", "check_is_super_admin", "logger"
]
