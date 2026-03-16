"""
SDM REWARDS - Merchants Shared Module
=====================================
Configuration, models and utilities for merchant routes
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# Password/PIN hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
_client = AsyncIOMotorClient(MONGO_URL)
db = _client[DB_NAME]


def get_db():
    return db


# ============== REQUEST MODELS ==============

class UpdateCashbackRequest(BaseModel):
    cashback_rate: float  # 1-20%


class UpdatePaymentInfoRequest(BaseModel):
    momo_number: Optional[str] = None
    momo_network: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_id: Optional[str] = None
    bank_account_name: Optional[str] = None
    preferred_payout_method: Optional[str] = None


class UpdateBusinessInfoRequest(BaseModel):
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    business_address: Optional[str] = None
    business_description: Optional[str] = None
    logo_url: Optional[str] = None
    city: Optional[str] = None
    gps_coordinates: Optional[str] = None
    google_maps_url: Optional[str] = None


# ============== PIN MANAGEMENT MODELS ==============

class SetPinRequest(BaseModel):
    pin: str


class VerifyPinRequest(BaseModel):
    pin: str


class ChangePinRequest(BaseModel):
    current_pin: str
    new_pin: str


class ForgotPinRequest(BaseModel):
    method: str  # "sms" or "email"


class ResetPinRequest(BaseModel):
    otp: str
    new_pin: str


# ============== CASH PAYMENT & DEBIT ACCOUNT MODELS ==============

class SearchCustomerRequest(BaseModel):
    query: str


class CashTransactionRequest(BaseModel):
    customer_id: Optional[str] = None
    customer_phone: Optional[str] = None
    amount: float
    description: Optional[str] = None


class TopUpDebitAccountRequest(BaseModel):
    amount: float
    payment_method: str
    momo_phone: str
    momo_network: str


# ============== CASHIER MANAGEMENT MODELS ==============

class CreateCashierRequest(BaseModel):
    name: str
    code: str
    register_number: Optional[str] = None


class UpdateCashierRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    register_number: Optional[str] = None
    is_active: Optional[bool] = None


# ============== BANK MODELS ==============

class VerifyBankAccountRequest(BaseModel):
    bank_id: str
    account_number: str


class UpdateBankInfoRequest(BaseModel):
    bank_id: str
    bank_name: str
    account_number: str
    account_name: str


# ============== PUSH NOTIFICATION MODELS ==============

class PushRegistrationRequest(BaseModel):
    player_id: str
    device_type: Optional[str] = None


# ============== MOMO VERIFICATION MODELS ==============

class MomoVerifyRequest(BaseModel):
    phone: str
    network: str
