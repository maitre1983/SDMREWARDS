"""
Admin Router Package
Organized admin endpoints for SDM Rewards
"""

from .clients import router as clients_router
from .merchants import router as merchants_router
from .settings import router as settings_router

__all__ = ['clients_router', 'merchants_router', 'settings_router']
