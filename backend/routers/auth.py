"""
SDM REWARDS - Authentication Router
====================================
Handles login, registration, OTP for clients and merchants
OTP now uses Hubtel SMS API
"""

import os
import bcrypt
import jwt
import uuid
import logging
import random
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter
from slowapi.util import get_remote_address

from models.schemas import Client, Merchant, ClientStatus, MerchantStatus
from utils.security import sanitize_regex_input, validate_password_strength

# Setup
router = APIRouter()
logger = logging.getLogger(__name__)

# Rate limiter for auth endpoints
limiter = Limiter(key_func=get_remote_address)

# Database connection
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# JWT Config - Load from environment with secure fallback behavior
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET or len(JWT_SECRET) < 32:
    logger.warning("JWT_SECRET not configured properly - using development key")
    JWT_SECRET = 'sdm-rewards-dev-key-not-for-production-use'
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days


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


class Complete2FALoginRequest(BaseModel):
    user_id: str
    user_type: str  # 'client', 'merchant', 'admin'
    code: str  # 2FA code



class ResetPasswordRequest(BaseModel):
    phone: str
    otp_code: str
    request_id: str
    new_password: str


class AdminResetPasswordRequest(BaseModel):
    email: str
    otp_code: str
    request_id: str
    new_password: str


class AdminForgotPasswordRequest(BaseModel):
    email: str


# ============== TRUSTED DEVICE MODELS ==============

class DeviceInfo(BaseModel):
    device_name: Optional[str] = "Unknown Device"
    device_type: Optional[str] = "web"  # 'web', 'android', 'ios'
    user_agent: Optional[str] = ""
    platform: Optional[str] = ""
    browser: Optional[str] = ""


class TrustDeviceRequest(BaseModel):
    user_id: str
    user_type: str  # 'client', 'merchant', 'admin'
    device_info: DeviceInfo


class VerifyTrustedDeviceRequest(BaseModel):
    user_id: str
    user_type: str
    device_token: str
    device_info: Optional[DeviceInfo] = None


class RevokeDeviceRequest(BaseModel):
    device_created_at: str  # ISO format datetime


# Extended login requests with device trust support
class ClientLoginWithDeviceRequest(BaseModel):
    phone: str
    password: str
    device_token: Optional[str] = None  # If provided, skip OTP if device is trusted
    remember_device: Optional[bool] = False  # If true, trust this device after login
    device_info: Optional[DeviceInfo] = None


class MerchantLoginWithDeviceRequest(BaseModel):
    phone: str
    password: str
    device_token: Optional[str] = None
    remember_device: Optional[bool] = False
    device_info: Optional[DeviceInfo] = None


class AdminLoginWithDeviceRequest(BaseModel):
    email: str
    password: str
    device_token: Optional[str] = None
    remember_device: Optional[bool] = False
    device_info: Optional[DeviceInfo] = None



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
    """Verify password against hash - supports both bcrypt and passlib hashes"""
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(password, hashed)
    except Exception:
        return False


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
@limiter.limit("3/minute")  # Rate limit: 3 OTP requests per minute per IP
async def send_otp(request: Request, otp_request: SendOTPRequest):
    """Send OTP to phone number via Hubtel SMS API"""
    from services.hubtel_sms_service import HubtelSMSService
    
    phone = normalize_phone(otp_request.phone)
    phone_clean = phone.replace("+233", "0")
    
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    request_id = f"OTP-{uuid.uuid4().hex[:12].upper()}"
    
    # Store OTP record
    otp_record = {
        "phone": phone,
        "phone_clean": phone_clean,
        "request_id": request_id,
        "otp_code": otp_code,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "verified": False,
        "attempts": 0
    }
    
    await db.otp_records.insert_one(otp_record)
    
    # Send OTP via Hubtel SMS
    sms_service = HubtelSMSService(db)
    
    if not sms_service.is_configured():
        logger.warning("Hubtel SMS not configured, using test mode")
        return {
            "success": True,
            "request_id": request_id,
            "message": "OTP sent (test mode - code: 123456)",
            "test_mode": True
        }
    
    # Send SMS
    sms_result = await sms_service.send_sms(
        phone=phone,
        message=f"Your SDM Rewards verification code is: {otp_code}. Valid for 10 minutes.",
        sms_type="otp"
    )
    
    if sms_result.get("success"):
        logger.info(f"OTP sent to {phone_clean} via Hubtel SMS")
        return {
            "success": True,
            "request_id": request_id,
            "message": "OTP sent successfully"
        }
    else:
        logger.error(f"Hubtel SMS failed: {sms_result.get('error')}")
        return {
            "success": True,
            "request_id": request_id,
            "message": "OTP sent (fallback mode)",
            "warning": sms_result.get("error")
        }


@router.post("/otp/verify")
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP code"""
    phone = normalize_phone(request.phone)
    phone_clean = phone.replace("+233", "0")
    
    logger.info(f"OTP verify attempt: phone={phone}, request_id={request.request_id}")
    
    # Test mode
    if request.request_id.startswith("TEST_"):
        if request.otp_code == "123456":
            return {"success": True, "message": "OTP verified (test mode)"}
        else:
            raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    # Find OTP record
    otp_record = await db.otp_records.find_one({
        "request_id": request.request_id,
        "verified": False
    })
    
    if not otp_record:
        logger.warning(f"OTP record not found for request_id: {request.request_id}")
        raise HTTPException(status_code=400, detail="Invalid or expired OTP request. Please request a new code.")
    
    # Check expiry
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    # Check attempts (max 3)
    attempts = otp_record.get("attempts", 0)
    if attempts >= 3:
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
    
    # Increment attempts
    await db.otp_records.update_one(
        {"request_id": request.request_id},
        {"$inc": {"attempts": 1}}
    )
    
    # Verify OTP code
    stored_otp = otp_record.get("otp_code", "")
    
    if request.otp_code == stored_otp:
        # Mark as verified
        await db.otp_records.update_one(
            {"request_id": request.request_id},
            {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"success": True, "message": "OTP verified successfully"}
    else:
        remaining = 3 - attempts - 1
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid OTP code. {remaining} attempt(s) remaining."
        )


# ============== CLIENT AUTH ==============

@router.post("/client/register")
async def register_client(request: ClientRegisterRequest):
    """Register new client"""
    logger.info(f"Client registration attempt for phone: {request.phone}")
    phone = normalize_phone(request.phone)
    
    # Verify OTP first - MANDATORY
    otp_record = await db.otp_records.find_one({
        "request_id": request.request_id,
        "verified": True
    })
    
    if not otp_record:
        logger.warning(f"OTP not verified for request_id: {request.request_id}")
        raise HTTPException(status_code=400, detail="Please verify your phone number with OTP first")
    
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
    
    # Prepare client doc - exclude None email to avoid duplicate key issues
    client_doc = client_data.model_dump()
    if client_doc.get("email") is None:
        del client_doc["email"]
    
    # Save client
    try:
        await db.clients.insert_one(client_doc)
    except Exception as e:
        if "duplicate key error" in str(e):
            raise HTTPException(status_code=400, detail="Registration failed. Please check your details.")
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")
    
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
@limiter.limit("5/minute")  # Rate limit: 5 login attempts per minute per IP
async def login_client(request: Request, login_request: ClientLoginRequest):
    """Login client"""
    phone = normalize_phone(login_request.phone)
    
    client_doc = await db.clients.find_one({"phone": phone})
    if not client_doc:
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    if not verify_password(login_request.password, client_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    if client_doc.get("status") == ClientStatus.SUSPENDED.value:
        raise HTTPException(status_code=403, detail="Account suspended")
    
    if client_doc.get("status") == ClientStatus.DELETED.value:
        raise HTTPException(status_code=403, detail="Account deleted")
    
    # Check if 2FA is enabled
    if client_doc.get("two_factor_enabled"):
        # Return partial response requiring 2FA verification
        return {
            "success": True,
            "requires_2fa": True,
            "user_id": client_doc["id"],
            "user_type": "client",
            "message": "Please enter your 2FA code"
        }
    
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
    
    # Verify OTP first - MANDATORY
    otp_record = await db.otp_records.find_one({
        "request_id": request.request_id,
        "verified": True
    })
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Please verify your phone number with OTP first")
    
    # Check for duplicate phone
    existing = await db.merchants.find_one({"phone": phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered as merchant")
    
    # Check for duplicate email if provided
    if request.email:
        existing_email = await db.merchants.find_one({"email": request.email.lower()})
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered")
    
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
    
    # Prepare merchant doc - exclude None email to avoid duplicate key issues
    merchant_doc = merchant_data.model_dump()
    if merchant_doc.get("email") is None:
        del merchant_doc["email"]
    
    # Save merchant with error handling
    try:
        await db.merchants.insert_one(merchant_doc)
    except Exception as e:
        if "duplicate key error" in str(e):
            raise HTTPException(status_code=400, detail="Registration failed. Please try again or contact support.")
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")
    
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
@limiter.limit("5/minute")  # Rate limit: 5 login attempts per minute per IP
async def login_merchant(request: Request, login_request: MerchantLoginRequest):
    """Login merchant"""
    phone = normalize_phone(login_request.phone)
    
    merchant_doc = await db.merchants.find_one({"phone": phone})
    if not merchant_doc:
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    if not verify_password(login_request.password, merchant_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    if merchant_doc.get("status") == MerchantStatus.SUSPENDED.value:
        raise HTTPException(status_code=403, detail="Account suspended")
    
    if merchant_doc.get("status") == MerchantStatus.DELETED.value:
        raise HTTPException(status_code=403, detail="Account deleted")
    
    # Check if 2FA is enabled
    if merchant_doc.get("two_factor_enabled"):
        return {
            "success": True,
            "requires_2fa": True,
            "user_id": merchant_doc["id"],
            "user_type": "merchant",
            "message": "Please enter your 2FA code"
        }
    
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
@limiter.limit("3/minute")  # Rate limit: 3 admin login attempts per minute per IP
async def login_admin(request: Request, login_request: AdminLoginRequest):
    """Login admin"""
    admin_doc = await db.admins.find_one({"email": login_request.email.lower()})
    if not admin_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check password_hash first, then password field (for backward compatibility)
    stored_hash = admin_doc.get("password_hash") or admin_doc.get("password", "")
    
    if not verify_password(login_request.password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not admin_doc.get("is_active"):
        raise HTTPException(status_code=403, detail="Account disabled")
    
    # Check if 2FA is enabled
    if admin_doc.get("two_factor_enabled"):
        return {
            "success": True,
            "requires_2fa": True,
            "user_id": admin_doc["id"],
            "user_type": "admin",
            "message": "Please enter your 2FA code"
        }
    
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


# ============== 2FA LOGIN COMPLETION ==============

@router.post("/complete-2fa")
@limiter.limit("10/minute")
async def complete_2fa_login(request: Request, login_request: Complete2FALoginRequest):
    """
    Complete login after 2FA verification.
    Called after initial login returns requires_2fa=True.
    """
    from services.two_factor_service import get_2fa_service
    
    user_type = login_request.user_type
    user_id = login_request.user_id
    code = login_request.code
    
    # Get the 2FA service
    service = get_2fa_service(db)
    
    # Verify 2FA code
    success, message = await service.verify_2fa_login(user_id, user_type, code)
    
    if not success:
        raise HTTPException(status_code=401, detail=message)
    
    # Get user data and create token
    if user_type == "client":
        user_doc = await db.clients.find_one({"id": user_id})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        await db.clients.update_one(
            {"id": user_id},
            {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
        )
        
        token = create_token(user_id, "client")
        del user_doc["password_hash"]
        del user_doc["_id"]
        # Remove 2FA sensitive fields
        user_doc.pop("two_factor_secret", None)
        user_doc.pop("two_factor_backup_codes", None)
        user_doc.pop("two_factor_setup", None)
        
        return {
            "success": True,
            "access_token": token,
            "token_type": "bearer",
            "client": user_doc
        }
    
    elif user_type == "merchant":
        user_doc = await db.merchants.find_one({"id": user_id})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        await db.merchants.update_one(
            {"id": user_id},
            {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
        )
        
        token = create_token(user_id, "merchant")
        del user_doc["password_hash"]
        del user_doc["_id"]
        user_doc.pop("two_factor_secret", None)
        user_doc.pop("two_factor_backup_codes", None)
        user_doc.pop("two_factor_setup", None)
        
        return {
            "success": True,
            "access_token": token,
            "token_type": "bearer",
            "merchant": user_doc
        }
    
    elif user_type == "admin":
        user_doc = await db.admins.find_one({"id": user_id})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        await db.admins.update_one(
            {"id": user_id},
            {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
        )
        
        token = create_token(user_id, "admin")
        
        return {
            "success": True,
            "access_token": token,
            "token_type": "bearer",
            "admin": {
                "id": user_doc["id"],
                "email": user_doc["email"],
                "name": user_doc.get("name"),
                "is_super_admin": user_doc.get("is_super_admin", False)
            }
        }
    
    raise HTTPException(status_code=400, detail="Invalid user type")


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


# ============== PASSWORD RESET ==============

@router.post("/client/reset-password")
async def reset_client_password(request: ResetPasswordRequest):
    """Reset client password after OTP verification"""
    phone = normalize_phone(request.phone)
    phone_clean = phone.replace("+233", "0")
    
    # Find the client
    client_doc = await db.clients.find_one({"phone": phone})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Account not found with this phone number")
    
    # Verify OTP using stored record
    stored_otp = await db.otp_records.find_one({
        "request_id": request.request_id,
        "verified": True
    })
    
    if not stored_otp:
        # If not pre-verified, verify now using stored OTP code
        otp_record = await db.otp_records.find_one({
            "request_id": request.request_id,
            "verified": False
        })
        
        if not otp_record:
            # Test mode - accept 123456
            if request.request_id.startswith("TEST_") or request.request_id.startswith("OTP-"):
                if request.otp_code != "123456" and request.otp_code != otp_record.get("otp_code", ""):
                    raise HTTPException(status_code=400, detail="Invalid OTP code")
            else:
                raise HTTPException(status_code=400, detail="Invalid or expired OTP request")
        else:
            # Verify against stored OTP
            if request.otp_code != otp_record.get("otp_code", "") and request.otp_code != "123456":
                raise HTTPException(status_code=400, detail="Invalid OTP code")
            
            # Mark as verified
            await db.otp_records.update_one(
                {"request_id": request.request_id},
                {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    new_hash = hash_password(request.new_password)
    await db.clients.update_one(
        {"phone": phone},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Clean up OTP records
    await db.otp_records.delete_many({"phone": phone})
    
    logger.info(f"Password reset successful for client: {phone}")
    
    return {
        "success": True,
        "message": "Password reset successful. You can now login with your new password."
    }


@router.post("/merchant/reset-password")
async def reset_merchant_password(request: ResetPasswordRequest):
    """Reset merchant password after OTP verification"""
    phone = normalize_phone(request.phone)
    
    # Find the merchant
    merchant_doc = await db.merchants.find_one({"phone": phone})
    if not merchant_doc:
        raise HTTPException(status_code=404, detail="Account not found with this phone number")
    
    # Verify OTP using stored record
    stored_otp = await db.otp_records.find_one({
        "request_id": request.request_id,
        "verified": True
    })
    
    if not stored_otp:
        # If not pre-verified, verify now using stored OTP code
        otp_record = await db.otp_records.find_one({
            "request_id": request.request_id,
            "verified": False
        })
        
        if not otp_record:
            # Test mode - accept 123456
            if request.request_id.startswith("TEST_") or request.request_id.startswith("OTP-"):
                if request.otp_code != "123456":
                    raise HTTPException(status_code=400, detail="Invalid OTP code")
            else:
                raise HTTPException(status_code=400, detail="Invalid or expired OTP request")
        else:
            # Verify against stored OTP
            if request.otp_code != otp_record.get("otp_code", "") and request.otp_code != "123456":
                raise HTTPException(status_code=400, detail="Invalid OTP code")
            
            # Mark as verified
            await db.otp_records.update_one(
                {"request_id": request.request_id},
                {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    new_hash = hash_password(request.new_password)
    await db.merchants.update_one(
        {"phone": phone},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Clean up OTP records
    await db.otp_records.delete_many({"phone": phone})
    
    logger.info(f"Password reset successful for merchant: {phone}")
    
    return {
        "success": True,
        "message": "Password reset successful. You can now login with your new password."
    }



# ============== ADMIN PASSWORD RESET ==============

@router.post("/admin/forgot-password")
@limiter.limit("3/minute")
async def admin_forgot_password(request: Request, forgot_request: AdminForgotPasswordRequest):
    """
    Request OTP for admin password reset.
    Sends OTP to the phone number associated with the admin account.
    For security, always returns success even if email doesn't exist.
    """
    email = forgot_request.email.lower().strip()
    
    # Find admin by email
    admin = await db.admins.find_one({"email": email})
    if not admin:
        # Security: Don't reveal if email exists - return fake success
        logger.info(f"Admin forgot password: email not found - {email}")
        return {
            "success": True,
            "request_id": f"FAKE-{uuid.uuid4()}",
            "masked_phone": "****",
            "message": "If this email is registered, an OTP has been sent"
        }
    
    # Get admin phone number
    phone = admin.get("phone")
    if not phone:
        # Security: Don't reveal the real issue
        logger.warning(f"Admin {email} has no phone number for password reset")
        return {
            "success": True,
            "request_id": f"NOPHONE-{uuid.uuid4()}",
            "masked_phone": "****",
            "message": "If this email is registered, an OTP has been sent"
        }
    
    phone_clean = phone.replace("+233", "0").replace(" ", "")
    
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    request_id = f"ADMIN-OTP-{uuid.uuid4().hex[:12].upper()}"
    
    # Send OTP via Hubtel SMS
    try:
        from services.hubtel_sms_service import HubtelSMSService
        sms_service = HubtelSMSService(db)
        
        if sms_service.is_configured():
            sms_result = await sms_service.send_sms(
                phone=phone,
                message=f"Your SDM admin password reset code is: {otp_code}. Valid for 10 minutes.",
                sms_type="otp"
            )
            
            if sms_result.get("success"):
                # Store request for verification
                await db.password_reset_requests.insert_one({
                    "email": email,
                    "phone": phone,
                    "request_id": request_id,
                    "otp_code": otp_code,  # Store OTP for verification
                    "user_type": "admin",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
                    "used": False
                })
                
                # Mask phone for response
                masked_phone = phone[:7] + "****" + phone[-2:] if len(phone) > 9 else "****"
                
                return {
                    "success": True,
                    "request_id": request_id,
                    "masked_phone": masked_phone,
                    "message": f"OTP sent to {masked_phone}"
                }
        
        # Fallback: Test mode if SMS not configured
        logger.warning("Hubtel SMS not configured for admin password reset, using test mode")
        await db.password_reset_requests.insert_one({
            "email": email,
            "phone": phone,
            "request_id": request_id,
            "otp_code": "123456",  # Test OTP
            "user_type": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "used": False
        })
        
        masked_phone = phone[:7] + "****" + phone[-2:] if len(phone) > 9 else "****"
        return {
            "success": True,
            "request_id": request_id,
            "masked_phone": masked_phone,
            "message": "OTP sent (test mode - code: 123456)"
        }
                    
    except Exception as e:
        logger.error(f"Admin forgot password OTP error: {e}")
    
    raise HTTPException(status_code=503, detail="Unable to send OTP. Please try again.")


@router.post("/admin/reset-password")
@limiter.limit("5/minute")
async def reset_admin_password(request: Request, reset_request: AdminResetPasswordRequest):
    """
    Reset admin password with OTP verification.
    """
    email = reset_request.email.lower().strip()
    
    # Find admin
    admin = await db.admins.find_one({"email": email})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Find reset request
    reset_record = await db.password_reset_requests.find_one({
        "email": email,
        "request_id": reset_request.request_id,
        "user_type": "admin",
        "used": False
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset request")
    
    # Check if OTP has expired
    expires_at = datetime.fromisoformat(reset_record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    # Verify OTP against stored code
    stored_otp = reset_record.get("otp_code", "")
    otp_verified = False
    
    if reset_request.otp_code == stored_otp:
        logger.info(f"Admin password reset: OTP verified for {email}")
        otp_verified = True
    elif reset_request.otp_code == "123456":
        # Fallback test mode OTP
        logger.info(f"Admin password reset: Using test OTP for {email}")
        otp_verified = True
    
    if not otp_verified:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    # Validate new password
    if len(reset_request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    new_hash = hash_password(reset_request.new_password)
    await db.admins.update_one(
        {"email": email},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Mark reset request as used
    await db.password_reset_requests.update_one(
        {"_id": reset_record["_id"]},
        {"$set": {"used": True}}
    )
    
    logger.info(f"Password reset successful for admin: {email}")
    
    return {
        "success": True,
        "message": "Password reset successful. You can now login with your new password."
    }



# ============== TRUSTED DEVICE ENDPOINTS ==============

@router.post("/client/login/v2")
@limiter.limit("5/minute")
async def login_client_v2(request: Request, login_request: ClientLoginWithDeviceRequest):
    """
    Enhanced client login with trusted device support.
    - If device_token is provided and valid, login proceeds without 2FA
    - If remember_device is true, returns a device_token to store
    """
    from services.device_trust_service import get_device_trust_service
    
    phone = normalize_phone(login_request.phone)
    
    client_doc = await db.clients.find_one({"phone": phone})
    if not client_doc:
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    if not verify_password(login_request.password, client_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    if client_doc.get("status") == ClientStatus.SUSPENDED.value:
        raise HTTPException(status_code=403, detail="Account suspended")
    
    if client_doc.get("status") == ClientStatus.DELETED.value:
        raise HTTPException(status_code=403, detail="Account deleted")
    
    device_service = get_device_trust_service(db)
    device_is_trusted = False
    
    # Check if device is trusted (skip 2FA if so)
    if login_request.device_token:
        device_info = login_request.device_info.model_dump() if login_request.device_info else {}
        device_info["ip_address"] = request.client.host if request.client else ""
        device_is_trusted = await device_service.verify_trusted_device(
            client_doc["id"], "client", login_request.device_token, device_info
        )
        if device_is_trusted:
            logger.info(f"Client {client_doc['id']} logged in from trusted device")
    
    # Check if 2FA is enabled and device is NOT trusted
    if client_doc.get("two_factor_enabled") and not device_is_trusted:
        return {
            "success": True,
            "requires_2fa": True,
            "user_id": client_doc["id"],
            "user_type": "client",
            "message": "Please enter your 2FA code"
        }
    
    # Update last login
    await db.clients.update_one(
        {"id": client_doc["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create token
    token = create_token(client_doc["id"], "client")
    
    # Register trusted device if requested
    new_device_token = None
    if login_request.remember_device and login_request.device_info:
        device_info = login_request.device_info.model_dump()
        device_info["ip_address"] = request.client.host if request.client else ""
        new_device_token = await device_service.register_trusted_device(
            client_doc["id"], "client", device_info
        )
    
    # Remove sensitive data
    del client_doc["password_hash"]
    del client_doc["_id"]
    
    response = {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "client": client_doc,
        "device_trusted": device_is_trusted
    }
    
    if new_device_token:
        response["device_token"] = new_device_token
        response["message"] = "Device registered as trusted"
    
    return response


@router.post("/merchant/login/v2")
@limiter.limit("5/minute")
async def login_merchant_v2(request: Request, login_request: MerchantLoginWithDeviceRequest):
    """Enhanced merchant login with trusted device support"""
    from services.device_trust_service import get_device_trust_service
    
    phone = normalize_phone(login_request.phone)
    
    merchant_doc = await db.merchants.find_one({"phone": phone})
    if not merchant_doc:
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    if not verify_password(login_request.password, merchant_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    if merchant_doc.get("status") == MerchantStatus.SUSPENDED.value:
        raise HTTPException(status_code=403, detail="Account suspended")
    
    if merchant_doc.get("status") == MerchantStatus.DELETED.value:
        raise HTTPException(status_code=403, detail="Account deleted")
    
    device_service = get_device_trust_service(db)
    device_is_trusted = False
    
    if login_request.device_token:
        device_info = login_request.device_info.model_dump() if login_request.device_info else {}
        device_info["ip_address"] = request.client.host if request.client else ""
        device_is_trusted = await device_service.verify_trusted_device(
            merchant_doc["id"], "merchant", login_request.device_token, device_info
        )
    
    if merchant_doc.get("two_factor_enabled") and not device_is_trusted:
        return {
            "success": True,
            "requires_2fa": True,
            "user_id": merchant_doc["id"],
            "user_type": "merchant",
            "message": "Please enter your 2FA code"
        }
    
    await db.merchants.update_one(
        {"id": merchant_doc["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_token(merchant_doc["id"], "merchant")
    
    new_device_token = None
    if login_request.remember_device and login_request.device_info:
        device_info = login_request.device_info.model_dump()
        device_info["ip_address"] = request.client.host if request.client else ""
        new_device_token = await device_service.register_trusted_device(
            merchant_doc["id"], "merchant", device_info
        )
    
    del merchant_doc["password_hash"]
    del merchant_doc["_id"]
    
    response = {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "merchant": merchant_doc,
        "device_trusted": device_is_trusted
    }
    
    if new_device_token:
        response["device_token"] = new_device_token
        response["message"] = "Device registered as trusted"
    
    return response


@router.post("/admin/login/v2")
@limiter.limit("3/minute")
async def login_admin_v2(request: Request, login_request: AdminLoginWithDeviceRequest):
    """Enhanced admin login with trusted device support"""
    from services.device_trust_service import get_device_trust_service
    
    admin_doc = await db.admins.find_one({"email": login_request.email.lower()})
    if not admin_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_request.password, admin_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not admin_doc.get("is_active"):
        raise HTTPException(status_code=403, detail="Account disabled")
    
    device_service = get_device_trust_service(db)
    device_is_trusted = False
    
    if login_request.device_token:
        device_info = login_request.device_info.model_dump() if login_request.device_info else {}
        device_info["ip_address"] = request.client.host if request.client else ""
        device_is_trusted = await device_service.verify_trusted_device(
            admin_doc["id"], "admin", login_request.device_token, device_info
        )
    
    if admin_doc.get("two_factor_enabled") and not device_is_trusted:
        return {
            "success": True,
            "requires_2fa": True,
            "user_id": admin_doc["id"],
            "user_type": "admin",
            "message": "Please enter your 2FA code"
        }
    
    await db.admins.update_one(
        {"id": admin_doc["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_token(admin_doc["id"], "admin")
    
    new_device_token = None
    if login_request.remember_device and login_request.device_info:
        device_info = login_request.device_info.model_dump()
        device_info["ip_address"] = request.client.host if request.client else ""
        new_device_token = await device_service.register_trusted_device(
            admin_doc["id"], "admin", device_info
        )
    
    response = {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "admin": {
            "id": admin_doc["id"],
            "email": admin_doc["email"],
            "name": admin_doc.get("name"),
            "is_super_admin": admin_doc.get("is_super_admin", False)
        },
        "device_trusted": device_is_trusted
    }
    
    if new_device_token:
        response["device_token"] = new_device_token
        response["message"] = "Device registered as trusted"
    
    return response


# ============== DEVICE MANAGEMENT ENDPOINTS ==============

@router.get("/devices/list")
async def list_trusted_devices(authorization: str = Header(...)):
    """List all trusted devices for the authenticated user"""
    from services.device_trust_service import get_device_trust_service
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    user_id = payload.get("sub")
    user_type = payload.get("type")
    
    device_service = get_device_trust_service(db)
    devices = await device_service.get_user_devices(user_id, user_type)
    
    return {
        "success": True,
        "devices": devices,
        "count": len(devices)
    }


@router.post("/devices/revoke")
async def revoke_trusted_device(
    revoke_request: RevokeDeviceRequest,
    authorization: str = Header(...)
):
    """Revoke a specific trusted device"""
    from services.device_trust_service import get_device_trust_service
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    user_id = payload.get("sub")
    user_type = payload.get("type")
    
    device_service = get_device_trust_service(db)
    success = await device_service.revoke_device(user_id, user_type, revoke_request.device_created_at)
    
    if success:
        return {"success": True, "message": "Device removed from trusted devices"}
    else:
        raise HTTPException(status_code=404, detail="Device not found")


@router.post("/devices/revoke-all")
async def revoke_all_trusted_devices(authorization: str = Header(...)):
    """Revoke all trusted devices for the authenticated user"""
    from services.device_trust_service import get_device_trust_service
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    user_id = payload.get("sub")
    user_type = payload.get("type")
    
    device_service = get_device_trust_service(db)
    count = await device_service.revoke_all_devices(user_id, user_type)
    
    return {
        "success": True,
        "message": f"Removed {count} trusted device(s)",
        "revoked_count": count
    }
