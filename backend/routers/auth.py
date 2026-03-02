# /app/backend/routers/auth.py
"""
SDM Authentication Router
Handles OTP-based authentication for clients
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid

from core.config import db, REFERRAL_BONUS, REFERRAL_WELCOME_BONUS
from core.utils import normalize_phone, generate_otp, create_token, send_sms_hubtel, generate_qr_code_base64
from ledger import LedgerService, EntityType

# Test account credentials
TEST_PHONE = "+233000000000"
TEST_OTP = "000000"

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Initialize ledger service
ledger_service = LedgerService(db)

# ============== Models ==============

class SendOTPRequest(BaseModel):
    phone: str
    referral_code: Optional[str] = None

class VerifyOTPRequest(BaseModel):
    phone: str
    otp_code: str

class OTPRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    otp_code: str
    referral_code: Optional[str] = None
    attempts: int = 0
    is_verified: bool = False
    expires_at: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SDMUser(BaseModel):
    """SDM Client User"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    phone_verified: bool = False
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    qr_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:12].upper())
    referral_code: str = Field(default_factory=lambda: f"SDM{__import__('secrets').token_hex(3).upper()}")
    referred_by: Optional[str] = None
    referral_bonus_earned: float = 0.0
    referral_count: int = 0
    referral_level: str = "bronze"
    has_membership: bool = False
    membership_expires: Optional[str] = None
    membership_card_id: Optional[str] = None
    wallet_pending: float = 0.0
    wallet_available: float = 0.0
    total_earned: float = 0.0
    total_withdrawn: float = 0.0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReferralBonus(BaseModel):
    """Referral bonus record"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    referrer_id: str
    referred_id: str
    referred_phone: str
    bonus_type: str
    amount: float
    status: str = "credited"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============== Routes ==============

@router.post("/send-otp")
async def send_otp(request: SendOTPRequest):
    """Send OTP to phone number"""
    phone = normalize_phone(request.phone)
    
    # Test account - fixed OTP that never expires
    if phone == normalize_phone(TEST_PHONE):
        otp_code = TEST_OTP
        expires_at = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
    else:
        otp_code = generate_otp()
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    
    # Validate referral code if provided
    referral_code = None
    if request.referral_code:
        referrer = await db.sdm_users.find_one({"referral_code": request.referral_code.upper()}, {"_id": 0})
        if referrer:
            referral_code = request.referral_code.upper()
    
    # Store OTP with referral code
    otp_record = OTPRecord(phone=phone, otp_code=otp_code, referral_code=referral_code, expires_at=expires_at)
    await db.otp_records.delete_many({"phone": phone})
    await db.otp_records.insert_one(otp_record.model_dump())
    
    # Send SMS (skip for test account)
    sms_sent = False
    if phone != normalize_phone(TEST_PHONE):
        message = f"Your SDM verification code is: {otp_code}. Valid for 10 minutes."
        sms_sent = await send_sms_hubtel(phone, message)
    
    # Check if Hubtel is configured
    from core.config import HUBTEL_CLIENT_ID
    
    return {
        "message": "OTP sent" if sms_sent else "OTP generated (SMS not configured)",
        "phone": phone,
        "expires_in": 600,
        "otp_id": otp_record.id,
        "referral_valid": referral_code is not None if request.referral_code else None,
        "debug_otp": otp_code if not HUBTEL_CLIENT_ID else None,
        "is_test_account": phone == normalize_phone(TEST_PHONE)
    }

@router.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP and login/register user"""
    phone = normalize_phone(request.phone)
    
    # Find OTP record
    otp_record = await db.otp_records.find_one({"phone": phone, "is_verified": False}, {"_id": 0})
    if not otp_record:
        raise HTTPException(status_code=400, detail="No OTP request found")
    
    # Check expiration
    if datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00")) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # Check attempts
    if otp_record["attempts"] >= 3:
        raise HTTPException(status_code=400, detail="Too many attempts")
    
    # Verify OTP
    if otp_record["otp_code"] != request.otp_code:
        await db.otp_records.update_one({"id": otp_record["id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Mark as verified
    await db.otp_records.update_one({"id": otp_record["id"]}, {"$set": {"is_verified": True}})
    
    # Find or create user
    user = await db.sdm_users.find_one({"phone": phone}, {"_id": 0})
    is_new_user = False
    
    if not user:
        is_new_user = True
        new_user = SDMUser(phone=phone, phone_verified=True)
        
        # Handle referral
        referral_code = otp_record.get("referral_code")
        if referral_code:
            referrer = await db.sdm_users.find_one({"referral_code": referral_code}, {"_id": 0})
            if referrer and referrer["phone"] != phone:
                new_user.referred_by = referrer["id"]
                
                # Give welcome bonus to new user
                new_user.wallet_available = REFERRAL_WELCOME_BONUS
                new_user.total_earned = REFERRAL_WELCOME_BONUS
                
                # Record welcome bonus
                welcome_bonus = ReferralBonus(
                    referrer_id=referrer["id"],
                    referred_id=new_user.id,
                    referred_phone=phone,
                    bonus_type="welcome_bonus",
                    amount=REFERRAL_WELCOME_BONUS
                )
                await db.referral_bonuses.insert_one(welcome_bonus.model_dump())
                
                # Give bonus to referrer
                await db.sdm_users.update_one(
                    {"id": referrer["id"]},
                    {
                        "$inc": {
                            "wallet_available": REFERRAL_BONUS,
                            "total_earned": REFERRAL_BONUS,
                            "referral_bonus_earned": REFERRAL_BONUS,
                            "referral_count": 1
                        }
                    }
                )
                
                # Record referrer bonus
                referrer_bonus = ReferralBonus(
                    referrer_id=referrer["id"],
                    referred_id=new_user.id,
                    referred_phone=phone,
                    bonus_type="referrer_bonus",
                    amount=REFERRAL_BONUS
                )
                await db.referral_bonuses.insert_one(referrer_bonus.model_dump())
        
        await db.sdm_users.insert_one(new_user.model_dump())
        user = new_user.model_dump()
        
        # Automatically create client wallet in ledger
        try:
            await ledger_service.create_wallet(EntityType.CLIENT, new_user.id)
        except Exception as e:
            print(f"Warning: Failed to create client wallet: {e}")
    else:
        await db.sdm_users.update_one({"phone": phone}, {"$set": {"phone_verified": True}})
    
    # Generate token
    token = create_token({"sub": user["id"], "type": "user", "phone": phone}, expires_hours=168)
    
    return {
        "message": "Verification successful",
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "is_new_user": is_new_user,
        "welcome_bonus": REFERRAL_WELCOME_BONUS if is_new_user and user.get("referred_by") else 0
    }
