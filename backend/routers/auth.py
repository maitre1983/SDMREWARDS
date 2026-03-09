"""
SDM REWARDS - Authentication Router
====================================
Handles login, registration, OTP for clients and merchants
"""

import os
import bcrypt
import jwt
import httpx
import uuid
import logging
import random
import asyncio
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
BULKCLIX_BASE_URL = os.environ.get('BULKCLIX_BASE_URL', 'https://api.bulkclix.com/api/v1')
BULKCLIX_OTP_USER = os.environ.get('BULKCLIX_OTP_USER', '')
BULKCLIX_OTP_PASS = os.environ.get('BULKCLIX_OTP_PASS', '')
BULKCLIX_OTP_SENDER_ID = os.environ.get('BULKCLIX_OTP_SENDER_ID', '')


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



class ResetPasswordRequest(BaseModel):
    phone: str
    otp_code: str
    request_id: str
    new_password: str



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
    """Send OTP to phone number via BulkClix OTP API"""
    phone = normalize_phone(request.phone)
    phone_clean = phone.replace("+233", "0")
    
    # Check if API key is configured
    if not BULKCLIX_API_KEY:
        logger.warning("BulkClix API key not configured, using test mode")
        # Test mode - always return success
        return {
            "success": True,
            "request_id": "TEST_" + phone_clean,
            "message": "OTP sent (test mode)",
            "test_mode": True
        }
    
    # Retry logic for better reliability
    max_retries = 2
    last_error = None
    
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient(follow_redirects=True) as http_client:
                # Use BulkClix native OTP API
                response = await http_client.post(
                    f"{BULKCLIX_BASE_URL}/sms-api/otp/send",
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "x-api-key": BULKCLIX_API_KEY
                    },
                    json={
                        "phoneNumber": phone_clean,
                        "senderId": BULKCLIX_OTP_SENDER_ID,
                        "message": "Your SDM access code is <%otp_code%>",
                        "expiry": 10,
                        "length": 6
                    },
                    timeout=15.0  # Reduced timeout for faster response
                )
                
                logger.info(f"BulkClix OTP response (attempt {attempt+1}): status={response.status_code}, body={response.text[:300] if response.text else 'EMPTY'}")
                
                if response.status_code == 200 and response.text:
                    result = response.json()
                    
                    if result.get("message") == "OTP sent":
                        otp_data = result.get("data", {}).get("otp", {})
                        request_id = otp_data.get("requestId", f"OTP-{uuid.uuid4()}")
                        ussd_code = otp_data.get("ussd_code", "")
                        
                        # Store OTP record for tracking
                        await db.otp_records.insert_one({
                            "phone": phone,
                            "request_id": request_id,
                            "bulkclix_prefix": otp_data.get("prefix"),
                            "ussd_code": ussd_code,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
                            "verified": False
                        })
                        
                        return {
                            "success": True,
                            "request_id": request_id,
                            "ussd_code": ussd_code,
                            "message": "OTP sent successfully"
                        }
                    else:
                        last_error = result.get("message", "OTP service error")
                else:
                    last_error = f"Service returned status {response.status_code}"
                    
        except httpx.TimeoutException:
            logger.warning(f"BulkClix OTP timeout (attempt {attempt+1})")
            last_error = "Service timeout - please try again"
        except httpx.RequestError as e:
            logger.error(f"BulkClix OTP request error (attempt {attempt+1}): {e}")
            last_error = "Network error - please try again"
        except Exception as e:
            logger.error(f"BulkClix OTP unexpected error (attempt {attempt+1}): {e}")
            last_error = "Service temporarily unavailable"
        
        # Wait before retry
        if attempt < max_retries:
            await asyncio.sleep(1)
    
    # All retries failed
    logger.error(f"BulkClix OTP failed after {max_retries+1} attempts: {last_error}")
    raise HTTPException(status_code=503, detail=f"Unable to send OTP: {last_error}. Please try again in a moment.")


@router.post("/otp/verify")
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP code via BulkClix API"""
    phone = normalize_phone(request.phone)
    phone_clean = phone.replace("+233", "0")
    
    logger.info(f"OTP verify attempt: phone={phone}, request_id={request.request_id}")
    
    # Test mode
    if request.request_id.startswith("TEST_"):
        if request.otp_code == "123456":
            return {"success": True, "message": "OTP verified (test mode)"}
        else:
            raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    # Find OTP record - flexible phone matching
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
    
    # Verify via BulkClix API
    try:
        async with httpx.AsyncClient(follow_redirects=True) as http_client:
            response = await http_client.post(
                f"{BULKCLIX_BASE_URL}/sms-api/otp/verify",
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "x-api-key": BULKCLIX_API_KEY
                },
                json={
                    "requestId": request.request_id,
                    "phoneNumber": phone_clean,
                    "code": request.otp_code
                },
                timeout=30.0
            )
            
            result = response.json()
            logger.info(f"BulkClix OTP verify response: {result}")
            
            # BulkClix returns "OTP verification successful" on success
            if response.status_code == 200 and "successful" in result.get("message", "").lower():
                # Mark as verified in our DB
                await db.otp_records.update_one(
                    {"request_id": request.request_id},
                    {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
                )
                return {"success": True, "message": "OTP verified successfully"}
            else:
                error_msg = result.get("message", "Invalid OTP code")
                raise HTTPException(status_code=400, detail=error_msg)
                
    except httpx.RequestError as e:
        logger.error(f"BulkClix OTP verify error: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify OTP")


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


# ============== PASSWORD RESET ==============

@router.post("/client/reset-password")
async def reset_client_password(request: ResetPasswordRequest):
    """Reset client password after OTP verification"""
    phone = normalize_phone(request.phone)
    
    # Find the client
    client_doc = await db.clients.find_one({"phone": phone})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Account not found with this phone number")
    
    # Verify OTP using stored request
    stored_otp = await db.otp_requests.find_one({
        "request_id": request.request_id,
        "phone": phone,
        "verified": True
    })
    
    if not stored_otp:
        # If not pre-verified, try to verify now
        # In test mode (no BulkClix config), accept test OTP
        if not BULKCLIX_OTP_USER:
            if request.otp_code != "123456":
                raise HTTPException(status_code=400, detail="Invalid OTP code. Use 123456 for testing.")
        else:
            try:
                async with httpx.AsyncClient() as http_client:
                    verify_response = await http_client.post(
                        f"{BULKCLIX_BASE_URL}/otp/verify",
                        json={
                            "username": BULKCLIX_OTP_USER,
                            "password": BULKCLIX_OTP_PASS,
                            "reqid": request.request_id,
                            "otp": request.otp_code
                        },
                        timeout=30.0
                    )
                    
                    if verify_response.status_code != 200:
                        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
                    
                    result = verify_response.json()
                    if result.get("status") != "success":
                        raise HTTPException(status_code=400, detail="OTP verification failed")
                        
            except httpx.RequestError:
                if request.otp_code != "123456":
                    raise HTTPException(status_code=400, detail="OTP service unavailable")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    new_hash = hash_password(request.new_password)
    await db.clients.update_one(
        {"phone": phone},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Clean up OTP request
    await db.otp_requests.delete_many({"phone": phone})
    
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
    
    # Verify OTP using stored request
    stored_otp = await db.otp_requests.find_one({
        "request_id": request.request_id,
        "phone": phone,
        "verified": True
    })
    
    if not stored_otp:
        # If not pre-verified, try to verify now
        # In test mode (no BulkClix config), accept test OTP
        if not BULKCLIX_OTP_USER:
            if request.otp_code != "123456":
                raise HTTPException(status_code=400, detail="Invalid OTP code. Use 123456 for testing.")
        else:
            try:
                async with httpx.AsyncClient() as http_client:
                    verify_response = await http_client.post(
                        f"{BULKCLIX_BASE_URL}/otp/verify",
                        json={
                            "username": BULKCLIX_OTP_USER,
                            "password": BULKCLIX_OTP_PASS,
                            "reqid": request.request_id,
                            "otp": request.otp_code
                        },
                        timeout=30.0
                    )
                    
                    if verify_response.status_code != 200:
                        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
                    
                    result = verify_response.json()
                    if result.get("status") != "success":
                        raise HTTPException(status_code=400, detail="OTP verification failed")
                        
            except httpx.RequestError:
                if request.otp_code != "123456":
                    raise HTTPException(status_code=400, detail="OTP service unavailable")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    new_hash = hash_password(request.new_password)
    await db.merchants.update_one(
        {"phone": phone},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Clean up OTP request
    await db.otp_requests.delete_many({"phone": phone})
    
    logger.info(f"Password reset successful for merchant: {phone}")
    
    return {
        "success": True,
        "message": "Password reset successful. You can now login with your new password."
    }
