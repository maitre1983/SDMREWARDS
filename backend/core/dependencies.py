# /app/backend/core/dependencies.py
"""
FastAPI dependencies for authentication
"""

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .config import db, JWT_SECRET, JWT_ALGORITHM

security = HTTPBearer()

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current admin from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if payload.get("type") != "admin":
            raise HTTPException(status_code=401, detail="Invalid token type")
        admin = await db.admins.find_one({"username": username}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current user from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if payload.get("type") != "user":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.sdm_users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_merchant(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current merchant from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        merchant_id = payload.get("sub")
        if payload.get("type") != "merchant":
            raise HTTPException(status_code=401, detail="Invalid token type")
        merchant = await db.sdm_merchants.find_one({"id": merchant_id}, {"_id": 0})
        if not merchant:
            raise HTTPException(status_code=401, detail="Merchant not found")
        return merchant
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
