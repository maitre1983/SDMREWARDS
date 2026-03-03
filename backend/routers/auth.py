"""
SDM Authentication Routes
Handles OTP, registration, and login for clients and merchants
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

# This file will be fully implemented during backend refactoring
# For now, it serves as a placeholder for the route structure

auth_router = APIRouter(prefix="/auth", tags=["auth"])

# Models will be imported from models package after full refactoring
# from ..models.auth import ClientRegisterRequest, MerchantRegisterRequest

# Placeholder for future implementation
# The actual logic is currently in server.py and will be migrated here
