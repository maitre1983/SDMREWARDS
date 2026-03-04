"""
SDM REWARDS - Authentication Router
====================================
Handles login, registration, OTP for clients and merchants
"""

import os
import bcrypt
import jwt
import httpx
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient

from models.schemas import Client, Merchant, ClientStatus, MerchantStatus

# Setup
router = APIRouter()
logger = logging.getLogger(__name__)

# Database connection
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'sdm-rewards-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# BulkClix Config
BULKCLIX_API_KEY = os.environ.get('BULKCLIX_API_KEY', '')
BULKCLIX_OTP_USER = os.environ.get('BULKCLIX_OTP_USER', '')
BULKCLIX_OTP_PASS = os.environ.get('BULKCLIX_OTP_PASS', '')


# ============== REQUEST MODELS ==============

class SendOTPRequest(BaseModel):
    phone: str


class VerifyOTPRequest(BaseModel):
    phone: str
    otp_code: str
    request_id: str


class ClientRegisterRequest(BaseModel):
    full_name: str
    username: str
    phone: str
    email: Optional[str] = None
    password: str
    birthday: Optional[str] = None
    referral_code: Optional[str] = None  # Code of referrer
    otp_code: str
    request_id: str


class ClientLoginRequest(BaseModel):
    phone: str
    password: str


class MerchantRegisterRequest(BaseModel):
    business_name: str
    owner_name: str
    phone: str
    email: Optional[str] = None
    password: str
    business_type: Optional[str] = None
    business_address: Optional[str] = None
    otp_code: str
    request_id: str


class MerchantLoginRequest(BaseModel):
    phone: str
    password: str


class AdminLoginRequest(BaseModel):
    email: str
    password: str


# ============== HELPER FUNCTIONS ==============

def normalize_phone(phone: str) -> str:
    """Normalize phone to +233 format"""
    phone = phone.replace(" ", "").replace("-", "")
    if phone.startswith("0"):
        phone = "+233" + phone[1:]
    elif phone.startswith("233"):
        phone = "+" + phone
    elif not phone.startswith("+"):
        phone = "+233" + phone
    return phone


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str, user_type: str) -> str:
    """Create JWT token"""
    payload = {
        "sub": user_id,
        "type": user_type,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============== AUTH DEPENDENCIES ==============

async def get_current_client(authorization: str = Header(...)) -> dict:
    """Get current authenticated client"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if payload.get("type") != "client":
        raise HTTPException(status_code=403, detail="Not a client account")
    
    client_doc = await db.clients.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client_doc.get("status") == ClientStatus.SUSPENDED.value:
        raise HTTPException(status_code=403, detail="Account suspended")
    
    return client_doc


async def get_current_merchant(authorization: str = Header(...)) -> dict:
    """Get current authenticated merchant"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if payload.get("type") != "merchant":
        raise HTTPException(status_code=403, detail="Not a merchant account")
    
    merchant_doc = await db.merchants.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not merchant_doc:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    if merchant_doc.get("status") == MerchantStatus.SUSPENDED.value:
        raise HTTPException(status_code=403, detail="Account suspended")
    
    return merchant_doc


async def get_current_admin(authorization: str = Header(...)) -> dict:
    """Get current authenticated admin"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if payload.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Not an admin account")
    
    admin_doc = await db.admins.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not admin_doc:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    if not admin_doc.get("is_active"):
        raise HTTPException(status_code=403, detail="Account disabled")
    
    return admin_doc


# ============== OTP ENDPOINTS ==============

@router.post("/otp/send")
async def send_otp(request: SendOTPRequest):
    """Send OTP to phone number via BulkClix"""
    phone = normalize_phone(request.phone)
    phone_clean = phone.replace("+233", "0")
    
    # Check if credentials are configured
    if not BULKCLIX_OTP_USER or not BULKCLIX_OTP_PASS:
        logger.warning("BulkClix OTP not configured, using test mode")
        # Test mode - always return success
        return {
            "success": True,
            "request_id": "TEST_" + phone_clean,
            "message": "OTP sent (test mode)",
            "test_mode": True
        }
    
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                "https://api.bulkclix.com/otp/send",
                json={
                    "username": BULKCLIX_OTP_USER,
                    "password": BULKCLIX_OTP_PASS,
                    "phone": phone_clean,
                    "sender_id": "SDM"
                },
                timeout=30.0
            )
            
            result = response.json()
            
            if response.status_code == 200 and result.get("status") == "success":
                # Store OTP record
                await db.otp_records.insert_one({
                    "phone": phone,
                    "request_id": result.get("request_id"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "verified": False
                })
                
                return {
                    "success": True,
                    "request_id": result.get("request_id"),
                    "message": "OTP sent successfully"
                }
            else:
                raise HTTPException(status_code=400, detail=result.get("message", "Failed to send OTP"))
                
    except httpx.RequestError as e:
        logger.error(f"BulkClix OTP error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP")


@router.post("/otp/verify")
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP code via BulkClix"""
    phone = normalize_phone(request.phone)
    phone_clean = phone.replace("+233", "0")
    
    # Test mode
    if request.request_id.startswith("TEST_"):
        if request.otp_code == "123456":
            return {"success": True, "message": "OTP verified (test mode)"}
        else:
            raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    if not BULKCLIX_API_KEY:
        raise HTTPException(status_code=500, detail="OTP service not configured")
    
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                "https://api.bulkclix.com/otp/verify",
                json={
                    "request_id": request.request_id,
                    "otp": request.otp_code
                },
                headers={"Authorization": f"Bearer {BULKCLIX_API_KEY}"},
                timeout=30.0
            )
            
            result = response.json()
            
            if response.status_code == 200 and result.get("valid"):
                # Mark as verified
                await db.otp_records.update_one(
                    {"request_id": request.request_id},
                    {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
                )
                return {"success": True, "message": "OTP verified"}
            else:
                raise HTTPException(status_code=400, detail="Invalid OTP code")
                
    except httpx.RequestError as e:
        logger.error(f"BulkClix verify error: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify OTP")


# ============== CLIENT AUTH ==============

@router.post("/client/register")
async def register_client(request: ClientRegisterRequest):
    """Register new client"""
    phone = normalize_phone(request.phone)
    
    # Verify OTP first
    otp_record = await db.otp_records.find_one({
        "request_id": request.request_id,
        "verified": True
    })
    
    # Allow test mode
    if not otp_record and not request.request_id.startswith("TEST_"):
        raise HTTPException(status_code=400, detail="Please verify your phone number first")
    
    # Check for duplicate phone
    existing_phone = await db.clients.find_one({"phone": phone})
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Check for duplicate username
    existing_username = await db.clients.find_one({"username": request.username.lower()})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Check for duplicate email
    if request.email:
        existing_email = await db.clients.find_one({"email": request.email.lower()})
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create client
    client_data = Client(
        full_name=request.full_name,
        username=request.username.lower(),
        phone=phone,
        email=request.email.lower() if request.email else None,
        password_hash=hash_password(request.password),
        birthday=request.birthday,
        referred_by=request.referral_code.upper() if request.referral_code else None
    )
    
    # If referred, create referral record
    if request.referral_code:
        referrer = await db.clients.find_one({"referral_code": request.referral_code.upper()})
        if referrer:
            from models.schemas import Referral
            referral = Referral(
                referrer_id=referrer["id"],
                referred_id=client_data.id,
                referral_code=request.referral_code.upper()
            )
            await db.referrals.insert_one(referral.model_dump())
    
    # Save client
    await db.clients.insert_one(client_data.model_dump())
    
    # Create token
    token = create_token(client_data.id, "client")
    
    return {
        "success": True,
        "message": "Registration successful! Purchase a membership card to activate your account.",
        "access_token": token,
        "token_type": "bearer",
        "client": {
            "id": client_data.id,
            "full_name": client_data.full_name,
            "username": client_data.username,
            "phone": client_data.phone,
            "status": client_data.status.value,
            "referral_code": client_data.referral_code,
            "qr_code": client_data.qr_code
        }
    }


@router.post("/client/login")
async def login_client(request: ClientLoginRequest):
    """Login client"""
    phone = normalize_phone(request.phone)
    
    client_doc = await db.clients.find_one({"phone": phone})
    if not client_doc:
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    if not verify_password(request.password, client_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    if client_doc.get("status") == ClientStatus.SUSPENDED.value:
        raise HTTPException(status_code=403, detail="Account suspended")
    
    if client_doc.get("status") == ClientStatus.DELETED.value:
        raise HTTPException(status_code=403, detail="Account deleted")
    
    # Update last login
    await db.clients.update_one(
        {"id": client_doc["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create token
    token = create_token(client_doc["id"], "client")
    
    # Remove sensitive data
    del client_doc["password_hash"]
    del client_doc["_id"]
    
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "client": client_doc
    }


# ============== MERCHANT AUTH ==============

@router.post("/merchant/register")
async def register_merchant(request: MerchantRegisterRequest):
    """Register new merchant"""
    phone = normalize_phone(request.phone)
    
    # Verify OTP first
    otp_record = await db.otp_records.find_one({
        "request_id": request.request_id,
        "verified": True
    })
    
    if not otp_record and not request.request_id.startswith("TEST_"):
        raise HTTPException(status_code=400, detail="Please verify your phone number first")
    
    # Check for duplicate phone
    existing = await db.merchants.find_one({"phone": phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered as merchant")
    
    # Create merchant
    merchant_data = Merchant(
        business_name=request.business_name,
        owner_name=request.owner_name,
        phone=phone,
        email=request.email.lower() if request.email else None,
        password_hash=hash_password(request.password),
        business_type=request.business_type,
        business_address=request.business_address
    )
    
    # Save merchant
    await db.merchants.insert_one(merchant_data.model_dump())
    
    # Create token
    token = create_token(merchant_data.id, "merchant")
    
    return {
        "success": True,
        "message": "Merchant registration successful! Your account is pending approval.",
        "access_token": token,
        "token_type": "bearer",
        "merchant": {
            "id": merchant_data.id,
            "business_name": merchant_data.business_name,
            "phone": merchant_data.phone,
            "status": merchant_data.status.value,
            "payment_qr_code": merchant_data.payment_qr_code,
            "recruitment_qr_code": merchant_data.recruitment_qr_code
        }
    }


@router.post("/merchant/login")
async def login_merchant(request: MerchantLoginRequest):
    """Login merchant"""
    phone = normalize_phone(request.phone)
    
    merchant_doc = await db.merchants.find_one({"phone": phone})
    if not merchant_doc:
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    if not verify_password(request.password, merchant_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    if merchant_doc.get("status") == MerchantStatus.SUSPENDED.value:
        raise HTTPException(status_code=403, detail="Account suspended")
    
    if merchant_doc.get("status") == MerchantStatus.DELETED.value:
        raise HTTPException(status_code=403, detail="Account deleted")
    
    # Update last login
    await db.merchants.update_one(
        {"id": merchant_doc["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create token
    token = create_token(merchant_doc["id"], "merchant")
    
    # Remove sensitive data
    del merchant_doc["password_hash"]
    del merchant_doc["_id"]
    
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "merchant": merchant_doc
    }


# ============== ADMIN AUTH ==============

@router.post("/admin/login")
async def login_admin(request: AdminLoginRequest):
    """Login admin"""
    admin_doc = await db.admins.find_one({"email": request.email.lower()})
    if not admin_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(request.password, admin_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not admin_doc.get("is_active"):
        raise HTTPException(status_code=403, detail="Account disabled")
    
    # Update last login
    await db.admins.update_one(
        {"id": admin_doc["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create token
    token = create_token(admin_doc["id"], "admin")
    
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "admin": {
            "id": admin_doc["id"],
            "email": admin_doc["email"],
            "name": admin_doc.get("name"),
            "is_super_admin": admin_doc.get("is_super_admin", False)
        }
    }


# ============== TOKEN VALIDATION ==============

@router.get("/me")
async def get_current_user(authorization: str = Header(...)):
    """Get current authenticated user (client, merchant, or admin)"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    user_type = payload.get("type")
    user_id = payload.get("sub")
    
    if user_type == "client":
        user = await db.clients.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    elif user_type == "merchant":
        user = await db.merchants.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    elif user_type == "admin":
        user = await db.admins.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    else:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "type": user_type,
        "user": user
    }
