"""
SDM REWARDS - Admin Router Dependencies
=======================================
Shared dependencies and utilities for admin routes
"""

import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

# Setup logging
logger = logging.getLogger(__name__)

# Database connection
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


def check_is_super_admin(admin: dict) -> bool:
    """Check if admin is super admin - supports both is_super_admin field and role field"""
    return admin.get("is_super_admin", False) or admin.get("role") == "super_admin"


def get_db():
    """Get database instance"""
    return db
