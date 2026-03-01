from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import httpx
import base64
import secrets
import qrcode
import io
import base64 as b64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import resend
import phonenumbers

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'smart-digital-solutions-secret-key-2024')
JWT_ALGORITHM = "HS256"

# Resend Settings
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'emileparfait2003@gmail.com')

# Hubtel Settings
HUBTEL_CLIENT_ID = os.environ.get('HUBTEL_CLIENT_ID', '')
HUBTEL_CLIENT_SECRET = os.environ.get('HUBTEL_CLIENT_SECRET', '')
HUBTEL_SENDER_ID = os.environ.get('HUBTEL_SENDER_ID', 'SDM')

# SDM Business Settings (defaults - can be overridden by DB config)
SDM_COMMISSION_RATE = float(os.environ.get('SDM_COMMISSION_RATE', '0.02'))  # 2%
CASHBACK_PENDING_DAYS = int(os.environ.get('CASHBACK_PENDING_DAYS', '7'))
WITHDRAWAL_FEE = float(os.environ.get('WITHDRAWAL_FEE', '1.0'))  # GHS

# Referral bonus constants (used before membership system)
REFERRAL_BONUS = 5.0  # GHS for referrer
REFERRAL_WELCOME_BONUS = 2.0  # GHS for new user

# Default config (will be loaded from DB)
DEFAULT_SDM_CONFIG = {
    "membership_card_price": 50.0,  # GHS - Default for platform cards
    "referral_bonus_bronze": 5.0,   # GHS per referral at Bronze level
    "referral_bonus_silver": 7.0,   # GHS per referral at Silver level  
    "referral_bonus_gold": 10.0,    # GHS per referral at Gold level
    "welcome_bonus": 2.0,           # GHS for new member
    "bronze_min_referrals": 0,
    "silver_min_referrals": 5,
    "gold_min_referrals": 15,
    "membership_validity_days": 365,
    "require_membership_for_referral": False,  # If true, only members can refer
}

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Global config cache
sdm_config_cache = None

async def get_sdm_config():
    """Get SDM config from database or return defaults"""
    global sdm_config_cache
    if sdm_config_cache:
        return sdm_config_cache
    
    config = await db.sdm_config.find_one({"type": "main"}, {"_id": 0})
    if config:
        sdm_config_cache = {**DEFAULT_SDM_CONFIG, **config}
    else:
        sdm_config_cache = DEFAULT_SDM_CONFIG.copy()
        await db.sdm_config.insert_one({"type": "main", **sdm_config_cache})
    return sdm_config_cache

async def update_sdm_config(updates: dict):
    """Update SDM config and clear cache"""
    global sdm_config_cache
    await db.sdm_config.update_one(
        {"type": "main"},
        {"$set": updates},
        upsert=True
    )
    sdm_config_cache = None  # Clear cache

# Create the main app
app = FastAPI(title="Smart Digital Solutions & SDM API")

# Create routers
api_router = APIRouter(prefix="/api")
sdm_router = APIRouter(prefix="/api/sdm")

security = HTTPBearer()

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== SMART DIGITAL MODELS (Original) ==============

class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    service_type: Optional[str] = None
    message: str
    status: str = "unread"
    admin_reply: Optional[str] = None
    replied_at: Optional[str] = None
    email_sent: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    service_type: Optional[str] = None
    message: str

class AdminReply(BaseModel):
    reply: str

class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    email: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AdminLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class VisitLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    page: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    device_type: str = "unknown"
    browser: Optional[str] = None
    os: Optional[str] = None
    referrer: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VisitCreate(BaseModel):
    page: str
    referrer: Optional[str] = None

# ============== SDM MODELS ==============

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
    referral_code: str = Field(default_factory=lambda: f"SDM{secrets.token_hex(3).upper()}")
    referred_by: Optional[str] = None  # User ID who referred this user
    referral_bonus_earned: float = 0.0
    referral_count: int = 0  # Active members referred
    referral_level: str = "bronze"  # bronze, silver, gold
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

class MembershipCard(BaseModel):
    """SDM Membership Card"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    card_number: str = Field(default_factory=lambda: f"SDM{datetime.now().strftime('%Y%m%d')}{secrets.token_hex(4).upper()}")
    price_paid: float
    payment_method: str  # "wallet", "mobile_money", "card"
    payment_reference: Optional[str] = None
    status: str = "active"  # active, expired, cancelled
    purchased_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str = ""
    referrer_bonus_paid: bool = False  # Track if referrer got bonus

class SDMMerchant(BaseModel):
    """SDM Merchant/Business"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_name: str
    business_type: str  # restaurant, salon, spa, hotel, etc.
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: str = "Accra"
    cashback_rate: float = 0.05  # 5% default
    api_key: str = Field(default_factory=lambda: f"sdk_{secrets.token_hex(16)}")
    api_secret: str = Field(default_factory=lambda: secrets.token_hex(32))
    is_active: bool = True
    is_verified: bool = False
    subscription_plan: str = "basic"  # basic, pro, enterprise
    subscription_expires: Optional[str] = None
    total_transactions: int = 0
    total_cashback_given: float = 0.0
    balance: float = 0.0  # Merchant balance for cashback pool
    staff: List[Dict] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SDMTransaction(BaseModel):
    """SDM Transaction Record (Ledger)"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: str = Field(default_factory=lambda: f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}{secrets.token_hex(4).upper()}")
    user_id: str
    merchant_id: str
    merchant_name: str
    amount: float  # Transaction amount
    cashback_rate: float
    cashback_amount: float
    sdm_commission: float
    net_cashback: float  # After SDM commission
    status: str = "pending"  # pending, available, claimed
    available_date: str = ""  # When cashback becomes available
    staff_id: Optional[str] = None
    staff_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SDMWithdrawal(BaseModel):
    """SDM Withdrawal Request"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    fee: float
    net_amount: float
    mobile_money_number: str
    mobile_money_provider: str  # MTN, Vodafone, AirtelTigo
    status: str = "pending"  # pending, processing, completed, failed
    reference: Optional[str] = None
    processed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OTPRecord(BaseModel):
    """OTP for phone verification"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    otp_code: str
    referral_code: Optional[str] = None  # Referral code used during registration
    attempts: int = 0
    is_verified: bool = False
    expires_at: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReferralBonus(BaseModel):
    """Referral bonus record"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    referrer_id: str
    referred_id: str
    referred_phone: str
    bonus_type: str  # "referrer_bonus", "welcome_bonus"
    amount: float
    status: str = "credited"  # credited, pending
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============== REQUEST/RESPONSE MODELS ==============

class SendOTPRequest(BaseModel):
    phone: str
    referral_code: Optional[str] = None  # Optional referral code

class VerifyOTPRequest(BaseModel):
    phone: str
    otp_code: str

class UserRegisterRequest(BaseModel):
    phone: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None

class MerchantRegisterRequest(BaseModel):
    business_name: str
    business_type: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: str = "Accra"
    cashback_rate: float = 0.05

class CreateTransactionRequest(BaseModel):
    user_qr_code: str
    amount: float
    notes: Optional[str] = None
    staff_id: Optional[str] = None

class WithdrawalRequest(BaseModel):
    amount: float
    mobile_money_number: str
    mobile_money_provider: str

class AddStaffRequest(BaseModel):
    name: str
    phone: str
    role: str = "cashier"

class PurchaseMembershipRequest(BaseModel):
    payment_method: str = "wallet"  # wallet, mobile_money
    mobile_money_number: Optional[str] = None
    mobile_money_provider: Optional[str] = None

class UpdateSDMConfigRequest(BaseModel):
    membership_card_price: Optional[float] = None
    referral_bonus_bronze: Optional[float] = None
    referral_bonus_silver: Optional[float] = None
    referral_bonus_gold: Optional[float] = None
    welcome_bonus: Optional[float] = None
    bronze_min_referrals: Optional[int] = None
    silver_min_referrals: Optional[int] = None
    gold_min_referrals: Optional[int] = None
    membership_validity_days: Optional[int] = None

# ============== HELPER FUNCTIONS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(data: dict, expires_hours: int = 24) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)

def normalize_phone(phone: str) -> str:
    """Normalize phone to E.164 format for Ghana"""
    try:
        parsed = phonenumbers.parse(phone, "GH")
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except:
        pass
    # Fallback: basic normalization
    phone = phone.replace(" ", "").replace("-", "")
    if phone.startswith("0"):
        phone = "+233" + phone[1:]
    elif phone.startswith("233"):
        phone = "+" + phone
    elif not phone.startswith("+"):
        phone = "+233" + phone
    return phone

def generate_qr_code_base64(data: str) -> str:
    """Generate QR code as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return b64.b64encode(buffer.getvalue()).decode()

def parse_user_agent(user_agent: str) -> dict:
    ua_lower = user_agent.lower() if user_agent else ""
    device_type = "desktop"
    if "mobile" in ua_lower or "android" in ua_lower and "mobile" in ua_lower:
        device_type = "mobile"
    elif "tablet" in ua_lower or "ipad" in ua_lower:
        device_type = "tablet"
    browser = "unknown"
    if "edg" in ua_lower: browser = "Edge"
    elif "chrome" in ua_lower: browser = "Chrome"
    elif "firefox" in ua_lower: browser = "Firefox"
    elif "safari" in ua_lower: browser = "Safari"
    os_name = "unknown"
    if "windows" in ua_lower: os_name = "Windows"
    elif "mac" in ua_lower: os_name = "MacOS"
    elif "linux" in ua_lower: os_name = "Linux"
    elif "android" in ua_lower: os_name = "Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower: os_name = "iOS"
    return {"device_type": device_type, "browser": browser, "os": os_name}

async def send_sms_hubtel(phone: str, message: str) -> bool:
    """Send SMS via Hubtel API"""
    if not HUBTEL_CLIENT_ID or not HUBTEL_CLIENT_SECRET:
        logger.warning("Hubtel credentials not configured")
        return False
    
    credentials = f"{HUBTEL_CLIENT_ID}:{HUBTEL_CLIENT_SECRET}"
    encoded = base64.b64encode(credentials.encode()).decode()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://smsc.hubtel.com/v1/messages/send",
                json={
                    "From": HUBTEL_SENDER_ID,
                    "To": phone,
                    "Content": message
                },
                headers={
                    "Authorization": f"Basic {encoded}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            if response.status_code in [200, 201]:
                logger.info(f"SMS sent to {phone}")
                return True
            else:
                logger.error(f"Hubtel SMS error: {response.text}")
                return False
    except Exception as e:
        logger.error(f"SMS error: {str(e)}")
        return False

# ============== AUTH DEPENDENCIES ==============

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
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

# ============== EMAIL FUNCTIONS ==============

async def send_admin_notification(message: ContactMessage):
    if not RESEND_API_KEY:
        return False
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0056D2;">New Contact Request</h2>
        <p><strong>Name:</strong> {message.name}</p>
        <p><strong>Email:</strong> {message.email}</p>
        <p><strong>Phone:</strong> {message.phone or 'N/A'}</p>
        <p><strong>Company:</strong> {message.company or 'N/A'}</p>
        <p><strong>Service:</strong> {message.service_type or 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <p style="background: #f5f5f5; padding: 15px; border-radius: 8px;">{message.message}</p>
    </div>
    """
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [ADMIN_EMAIL],
            "subject": f"New Contact: {message.name}",
            "html": html_content
        })
        return True
    except Exception as e:
        logger.error(f"Email error: {str(e)}")
        return False

# ============== SMART DIGITAL ROUTES (Original) ==============

@api_router.get("/")
async def root():
    return {"message": "Smart Digital Solutions API"}

@api_router.post("/contact", response_model=ContactMessage)
async def create_contact_message(input_data: ContactMessageCreate):
    message_obj = ContactMessage(**input_data.model_dump())
    await db.contact_messages.insert_one(message_obj.model_dump())
    asyncio.create_task(send_admin_notification(message_obj))
    return message_obj

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Smart Digital Solutions & SDM"}

@api_router.post("/track")
async def track_visit(visit_data: VisitCreate, request: Request):
    user_agent = request.headers.get("user-agent", "")
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    if ip and "," in ip:
        ip = ip.split(",")[0].strip()
    ua_info = parse_user_agent(user_agent)
    visit = VisitLog(
        page=visit_data.page,
        user_agent=user_agent,
        ip_address=ip,
        device_type=ua_info["device_type"],
        browser=ua_info["browser"],
        os=ua_info["os"],
        referrer=visit_data.referrer
    )
    await db.visits.insert_one(visit.model_dump())
    return {"status": "tracked"}

@api_router.post("/admin/login", response_model=TokenResponse)
async def admin_login(credentials: AdminLogin):
    admin = await db.admins.find_one({"username": credentials.username}, {"_id": 0})
    if not admin or not verify_password(credentials.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": admin["username"], "type": "admin"})
    return TokenResponse(access_token=token)

@api_router.post("/admin/setup")
async def setup_admin():
    existing = await db.admins.find_one({"username": "admin"}, {"_id": 0})
    if existing:
        new_hash = hash_password("Gerard0103@")
        await db.admins.update_one(
            {"username": "admin"},
            {"$set": {"password_hash": new_hash, "email": "emileparfait2003@gmail.com"}}
        )
        return {"message": "Admin password updated"}
    admin = AdminUser(username="admin", password_hash=hash_password("Gerard0103@"))
    doc = admin.model_dump()
    doc["email"] = "emileparfait2003@gmail.com"
    await db.admins.insert_one(doc)
    return {"message": "Admin created", "username": "admin"}

@api_router.get("/admin/messages", response_model=List[ContactMessage])
async def get_all_messages(admin: dict = Depends(get_current_admin)):
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return messages

@api_router.put("/admin/messages/{message_id}/read")
async def mark_as_read(message_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.contact_messages.update_one({"id": message_id}, {"$set": {"status": "read"}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Marked as read"}

@api_router.put("/admin/messages/{message_id}/reply")
async def reply_to_message(message_id: str, reply_data: AdminReply, admin: dict = Depends(get_current_admin)):
    result = await db.contact_messages.update_one(
        {"id": message_id},
        {"$set": {"status": "replied", "admin_reply": reply_data.reply, "replied_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Reply saved"}

@api_router.delete("/admin/messages/{message_id}")
async def delete_message(message_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.contact_messages.delete_one({"id": message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Message deleted"}

@api_router.get("/admin/stats")
async def get_stats(admin: dict = Depends(get_current_admin)):
    total = await db.contact_messages.count_documents({})
    unread = await db.contact_messages.count_documents({"status": "unread"})
    replied = await db.contact_messages.count_documents({"status": "replied"})
    total_visits = await db.visits.count_documents({})
    # SDM Stats
    sdm_users = await db.sdm_users.count_documents({})
    sdm_merchants = await db.sdm_merchants.count_documents({})
    sdm_transactions = await db.sdm_transactions.count_documents({})
    return {
        "total_messages": total,
        "unread_messages": unread,
        "replied_messages": replied,
        "read_messages": total - unread - replied,
        "total_visits": total_visits,
        "sdm_users": sdm_users,
        "sdm_merchants": sdm_merchants,
        "sdm_transactions": sdm_transactions
    }

@api_router.get("/admin/analytics")
async def get_analytics(admin: dict = Depends(get_current_admin)):
    total_visits = await db.visits.count_documents({})
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_visits = await db.visits.count_documents({"timestamp": {"$gte": today.isoformat()}})
    device_pipeline = [{"$group": {"_id": "$device_type", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    devices = await db.visits.aggregate(device_pipeline).to_list(10)
    browser_pipeline = [{"$group": {"_id": "$browser", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    browsers = await db.visits.aggregate(browser_pipeline).to_list(10)
    os_pipeline = [{"$group": {"_id": "$os", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    os_stats = await db.visits.aggregate(os_pipeline).to_list(10)
    page_pipeline = [{"$group": {"_id": "$page", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    pages = await db.visits.aggregate(page_pipeline).to_list(10)
    recent_visits = await db.visits.find({}, {"_id": 0}).sort("timestamp", -1).to_list(20)
    return {
        "total_visits": total_visits,
        "today_visits": today_visits,
        "devices": [{"name": d["_id"], "count": d["count"]} for d in devices],
        "browsers": [{"name": b["_id"], "count": b["count"]} for b in browsers],
        "os_stats": [{"name": o["_id"], "count": o["count"]} for o in os_stats],
        "pages": [{"name": p["_id"], "count": p["count"]} for p in pages],
        "recent_visits": recent_visits
    }

# ============== SDM USER ROUTES ==============

@sdm_router.post("/auth/send-otp")
async def send_otp(request: SendOTPRequest):
    """Send OTP to phone number"""
    phone = normalize_phone(request.phone)
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
    await db.otp_records.delete_many({"phone": phone})  # Remove old OTPs
    await db.otp_records.insert_one(otp_record.model_dump())
    
    # Send SMS
    message = f"Your SDM verification code is: {otp_code}. Valid for 10 minutes."
    sms_sent = await send_sms_hubtel(phone, message)
    
    return {
        "message": "OTP sent" if sms_sent else "OTP generated (SMS not configured)",
        "phone": phone,
        "expires_in": 600,
        "otp_id": otp_record.id,
        "referral_valid": referral_code is not None if request.referral_code else None,
        # For testing only - remove in production
        "debug_otp": otp_code if not HUBTEL_CLIENT_ID else None
    }

@sdm_router.post("/auth/verify-otp")
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
            if referrer and referrer["phone"] != phone:  # Can't refer yourself
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
    else:
        await db.sdm_users.update_one({"phone": phone}, {"$set": {"phone_verified": True}})
    
    # Generate token
    token = create_token({"sub": user["id"], "type": "user", "phone": phone}, expires_hours=168)  # 7 days
    
    return {
        "message": "Verification successful",
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "is_new_user": is_new_user,
        "welcome_bonus": REFERRAL_WELCOME_BONUS if is_new_user and user.get("referred_by") else 0
    }

@sdm_router.get("/user/profile")
async def get_user_profile(user: dict = Depends(get_current_user)):
    """Get user profile with QR code"""
    qr_data = f"SDM:{user['qr_code']}"
    qr_base64 = generate_qr_code_base64(qr_data)
    return {
        **user,
        "qr_code_image": f"data:image/png;base64,{qr_base64}"
    }

@sdm_router.get("/user/referral")
async def get_user_referral(user: dict = Depends(get_current_user)):
    """Get user referral info and stats"""
    # Get referrals made by this user
    referrals = await db.sdm_users.find(
        {"referred_by": user["id"]},
        {"_id": 0, "id": 1, "phone": 1, "first_name": 1, "last_name": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(100)
    
    # Get referral bonuses earned
    bonuses = await db.referral_bonuses.find(
        {"referrer_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get who referred this user
    referrer = None
    if user.get("referred_by"):
        referrer_data = await db.sdm_users.find_one(
            {"id": user["referred_by"]},
            {"_id": 0, "first_name": 1, "last_name": 1}
        )
        if referrer_data:
            referrer = f"{referrer_data.get('first_name', '')} {referrer_data.get('last_name', '')}".strip() or "SDM User"
    
    return {
        "referral_code": user.get("referral_code"),
        "referral_link": f"https://smartdigitalsolutions.com/sdm/client?ref={user.get('referral_code')}",
        "total_referrals": user.get("referral_count", 0),
        "total_bonus_earned": user.get("referral_bonus_earned", 0),
        "bonus_per_referral": REFERRAL_BONUS,
        "welcome_bonus_amount": REFERRAL_WELCOME_BONUS,
        "referrals": referrals,
        "bonus_history": bonuses,
        "referred_by": referrer
    }

@sdm_router.put("/user/profile")
async def update_user_profile(first_name: Optional[str] = None, last_name: Optional[str] = None, email: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Update user profile"""
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if first_name: updates["first_name"] = first_name
    if last_name: updates["last_name"] = last_name
    if email: updates["email"] = email
    await db.sdm_users.update_one({"id": user["id"]}, {"$set": updates})
    return {"message": "Profile updated"}

@sdm_router.get("/user/wallet")
async def get_user_wallet(user: dict = Depends(get_current_user)):
    """Get user wallet balance"""
    # Check for newly available cashback
    now = datetime.now(timezone.utc)
    pending_txns = await db.sdm_transactions.find({
        "user_id": user["id"],
        "status": "pending",
        "available_date": {"$lte": now.isoformat()}
    }, {"_id": 0}).to_list(100)
    
    total_newly_available = 0
    for txn in pending_txns:
        await db.sdm_transactions.update_one({"id": txn["id"]}, {"$set": {"status": "available"}})
        total_newly_available += txn["net_cashback"]
    
    if total_newly_available > 0:
        await db.sdm_users.update_one(
            {"id": user["id"]},
            {"$inc": {"wallet_available": total_newly_available, "wallet_pending": -total_newly_available}}
        )
    
    # Get updated user
    updated_user = await db.sdm_users.find_one({"id": user["id"]}, {"_id": 0})
    
    return {
        "wallet_pending": updated_user["wallet_pending"],
        "wallet_available": updated_user["wallet_available"],
        "total_earned": updated_user["total_earned"],
        "total_withdrawn": updated_user["total_withdrawn"]
    }

@sdm_router.get("/user/transactions")
async def get_user_transactions(user: dict = Depends(get_current_user), limit: int = 50):
    """Get user transaction history"""
    transactions = await db.sdm_transactions.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return transactions

@sdm_router.post("/user/withdraw")
async def request_withdrawal(request: WithdrawalRequest, user: dict = Depends(get_current_user)):
    """Request withdrawal to Mobile Money"""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    
    if request.amount > user["wallet_available"]:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    fee = WITHDRAWAL_FEE
    net_amount = request.amount - fee
    
    if net_amount <= 0:
        raise HTTPException(status_code=400, detail="Amount too small after fee")
    
    # Create withdrawal request
    withdrawal = SDMWithdrawal(
        user_id=user["id"],
        amount=request.amount,
        fee=fee,
        net_amount=net_amount,
        mobile_money_number=normalize_phone(request.mobile_money_number),
        mobile_money_provider=request.mobile_money_provider
    )
    await db.sdm_withdrawals.insert_one(withdrawal.model_dump())
    
    # Deduct from wallet
    await db.sdm_users.update_one(
        {"id": user["id"]},
        {"$inc": {"wallet_available": -request.amount}}
    )
    
    return {
        "message": "Withdrawal request submitted",
        "withdrawal_id": withdrawal.id,
        "amount": request.amount,
        "fee": fee,
        "net_amount": net_amount,
        "status": "pending"
    }

# ============== SDM MERCHANT ROUTES ==============

@sdm_router.post("/merchant/register")
async def register_merchant(request: MerchantRegisterRequest):
    """Register new merchant"""
    phone = normalize_phone(request.phone)
    
    # Check if exists
    existing = await db.sdm_merchants.find_one({"phone": phone}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Merchant already registered")
    
    merchant = SDMMerchant(
        business_name=request.business_name,
        business_type=request.business_type,
        phone=phone,
        email=request.email,
        address=request.address,
        city=request.city,
        cashback_rate=request.cashback_rate
    )
    await db.sdm_merchants.insert_one(merchant.model_dump())
    
    # Generate token
    token = create_token({"sub": merchant.id, "type": "merchant"}, expires_hours=720)  # 30 days
    
    return {
        "message": "Merchant registered successfully",
        "merchant_id": merchant.id,
        "api_key": merchant.api_key,
        "api_secret": merchant.api_secret,
        "access_token": token,
        "token_type": "bearer"
    }

@sdm_router.post("/merchant/login")
async def merchant_login(phone: str, api_key: str):
    """Merchant login with phone and API key"""
    phone = normalize_phone(phone)
    merchant = await db.sdm_merchants.find_one({"phone": phone, "api_key": api_key}, {"_id": 0})
    if not merchant:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token({"sub": merchant["id"], "type": "merchant"}, expires_hours=720)
    return {
        "access_token": token,
        "token_type": "bearer",
        "merchant": merchant
    }

@sdm_router.get("/merchant/profile")
async def get_merchant_profile(merchant: dict = Depends(get_current_merchant)):
    """Get merchant profile"""
    return merchant

@sdm_router.put("/merchant/settings")
async def update_merchant_settings(cashback_rate: Optional[float] = None, merchant: dict = Depends(get_current_merchant)):
    """Update merchant settings"""
    updates = {}
    if cashback_rate is not None:
        if cashback_rate < 0.01 or cashback_rate > 0.20:
            raise HTTPException(status_code=400, detail="Cashback rate must be between 1% and 20%")
        updates["cashback_rate"] = cashback_rate
    
    if updates:
        await db.sdm_merchants.update_one({"id": merchant["id"]}, {"$set": updates})
    
    return {"message": "Settings updated"}

@sdm_router.post("/merchant/staff")
async def add_staff(request: AddStaffRequest, merchant: dict = Depends(get_current_merchant)):
    """Add staff member"""
    staff_member = {
        "id": str(uuid.uuid4()),
        "name": request.name,
        "phone": normalize_phone(request.phone),
        "role": request.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sdm_merchants.update_one(
        {"id": merchant["id"]},
        {"$push": {"staff": staff_member}}
    )
    return {"message": "Staff added", "staff": staff_member}

@sdm_router.get("/merchant/staff")
async def get_staff(merchant: dict = Depends(get_current_merchant)):
    """Get merchant staff list"""
    return merchant.get("staff", [])

@sdm_router.delete("/merchant/staff/{staff_id}")
async def remove_staff(staff_id: str, merchant: dict = Depends(get_current_merchant)):
    """Remove staff member"""
    await db.sdm_merchants.update_one(
        {"id": merchant["id"]},
        {"$pull": {"staff": {"id": staff_id}}}
    )
    return {"message": "Staff removed"}

@sdm_router.post("/merchant/transaction")
async def create_transaction(request: CreateTransactionRequest, merchant: dict = Depends(get_current_merchant)):
    """Create cashback transaction (scan QR + amount)"""
    # Find user by QR code
    user = await db.sdm_users.find_one({"qr_code": request.user_qr_code}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user["is_active"]:
        raise HTTPException(status_code=400, detail="User account inactive")
    
    # Calculate cashback
    cashback_amount = request.amount * merchant["cashback_rate"]
    sdm_commission = cashback_amount * SDM_COMMISSION_RATE
    net_cashback = cashback_amount - sdm_commission
    available_date = (datetime.now(timezone.utc) + timedelta(days=CASHBACK_PENDING_DAYS)).isoformat()
    
    # Get staff info
    staff_name = None
    if request.staff_id:
        for s in merchant.get("staff", []):
            if s["id"] == request.staff_id:
                staff_name = s["name"]
                break
    
    # Create transaction
    transaction = SDMTransaction(
        user_id=user["id"],
        merchant_id=merchant["id"],
        merchant_name=merchant["business_name"],
        amount=request.amount,
        cashback_rate=merchant["cashback_rate"],
        cashback_amount=cashback_amount,
        sdm_commission=sdm_commission,
        net_cashback=net_cashback,
        available_date=available_date,
        staff_id=request.staff_id,
        staff_name=staff_name,
        notes=request.notes
    )
    await db.sdm_transactions.insert_one(transaction.model_dump())
    
    # Update user wallet (pending)
    await db.sdm_users.update_one(
        {"id": user["id"]},
        {"$inc": {"wallet_pending": net_cashback, "total_earned": net_cashback}}
    )
    
    # Update merchant stats
    await db.sdm_merchants.update_one(
        {"id": merchant["id"]},
        {"$inc": {"total_transactions": 1, "total_cashback_given": net_cashback}}
    )
    
    return {
        "message": "Transaction created",
        "transaction_id": transaction.transaction_id,
        "amount": request.amount,
        "cashback_amount": round(net_cashback, 2),
        "available_date": available_date,
        "user_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or "SDM User"
    }

@sdm_router.get("/merchant/transactions")
async def get_merchant_transactions(merchant: dict = Depends(get_current_merchant), limit: int = 100):
    """Get merchant transaction history"""
    transactions = await db.sdm_transactions.find(
        {"merchant_id": merchant["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return transactions

@sdm_router.get("/merchant/report")
async def get_merchant_report(merchant: dict = Depends(get_current_merchant), days: int = 30):
    """Get merchant report/analytics"""
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Get transactions in period
    transactions = await db.sdm_transactions.find(
        {"merchant_id": merchant["id"], "created_at": {"$gte": start_date}},
        {"_id": 0}
    ).to_list(1000)
    
    total_amount = sum(t["amount"] for t in transactions)
    total_cashback = sum(t["net_cashback"] for t in transactions)
    transaction_count = len(transactions)
    
    # Daily breakdown
    daily_stats = {}
    for t in transactions:
        date = t["created_at"][:10]
        if date not in daily_stats:
            daily_stats[date] = {"amount": 0, "cashback": 0, "count": 0}
        daily_stats[date]["amount"] += t["amount"]
        daily_stats[date]["cashback"] += t["net_cashback"]
        daily_stats[date]["count"] += 1
    
    return {
        "period_days": days,
        "total_transactions": transaction_count,
        "total_amount": round(total_amount, 2),
        "total_cashback": round(total_cashback, 2),
        "average_transaction": round(total_amount / transaction_count, 2) if transaction_count > 0 else 0,
        "daily_breakdown": [{"date": k, **v} for k, v in sorted(daily_stats.items())]
    }

# ============== SDM ADMIN ROUTES ==============

@sdm_router.get("/admin/users")
async def admin_get_users(admin: dict = Depends(get_current_admin), limit: int = 100):
    """Admin: Get all SDM users"""
    users = await db.sdm_users.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return users

@sdm_router.get("/admin/merchants")
async def admin_get_merchants(admin: dict = Depends(get_current_admin), limit: int = 100):
    """Admin: Get all merchants"""
    merchants = await db.sdm_merchants.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return merchants

@sdm_router.put("/admin/merchants/{merchant_id}/verify")
async def admin_verify_merchant(merchant_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Verify merchant"""
    result = await db.sdm_merchants.update_one(
        {"id": merchant_id},
        {"$set": {"is_verified": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return {"message": "Merchant verified"}

@sdm_router.get("/admin/transactions")
async def admin_get_transactions(admin: dict = Depends(get_current_admin), limit: int = 100):
    """Admin: Get all transactions"""
    transactions = await db.sdm_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return transactions

@sdm_router.get("/admin/withdrawals")
async def admin_get_withdrawals(admin: dict = Depends(get_current_admin), status: Optional[str] = None):
    """Admin: Get withdrawal requests"""
    query = {} if not status else {"status": status}
    withdrawals = await db.sdm_withdrawals.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return withdrawals

@sdm_router.put("/admin/withdrawals/{withdrawal_id}/process")
async def admin_process_withdrawal(withdrawal_id: str, status: str, reference: Optional[str] = None, admin: dict = Depends(get_current_admin)):
    """Admin: Process withdrawal (manual)"""
    if status not in ["processing", "completed", "failed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    updates = {"status": status}
    if status == "completed":
        updates["processed_at"] = datetime.now(timezone.utc).isoformat()
        if reference:
            updates["reference"] = reference
    
    result = await db.sdm_withdrawals.update_one({"id": withdrawal_id}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    # If failed, refund user
    if status == "failed":
        withdrawal = await db.sdm_withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
        await db.sdm_users.update_one(
            {"id": withdrawal["user_id"]},
            {"$inc": {"wallet_available": withdrawal["amount"]}}
        )
    elif status == "completed":
        withdrawal = await db.sdm_withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
        await db.sdm_users.update_one(
            {"id": withdrawal["user_id"]},
            {"$inc": {"total_withdrawn": withdrawal["net_amount"]}}
        )
    
    return {"message": f"Withdrawal {status}"}

@sdm_router.get("/admin/sdm-stats")
async def admin_get_sdm_stats(admin: dict = Depends(get_current_admin)):
    """Admin: Get SDM platform statistics"""
    total_users = await db.sdm_users.count_documents({})
    total_merchants = await db.sdm_merchants.count_documents({})
    verified_merchants = await db.sdm_merchants.count_documents({"is_verified": True})
    total_transactions = await db.sdm_transactions.count_documents({})
    
    # Total cashback given
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$net_cashback"}}}]
    cashback_result = await db.sdm_transactions.aggregate(pipeline).to_list(1)
    total_cashback = cashback_result[0]["total"] if cashback_result else 0
    
    # Total commission earned
    commission_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$sdm_commission"}}}]
    commission_result = await db.sdm_transactions.aggregate(commission_pipeline).to_list(1)
    total_commission = commission_result[0]["total"] if commission_result else 0
    
    # Pending withdrawals
    pending_withdrawals = await db.sdm_withdrawals.count_documents({"status": "pending"})
    
    return {
        "total_users": total_users,
        "total_merchants": total_merchants,
        "verified_merchants": verified_merchants,
        "total_transactions": total_transactions,
        "total_cashback_given": round(total_cashback, 2),
        "total_commission_earned": round(total_commission, 2),
        "pending_withdrawals": pending_withdrawals
    }

# ============== EXTERNAL API (For merchant website integration) ==============

@sdm_router.post("/external/transaction")
async def external_create_transaction(
    request: Request,
    user_phone: str,
    amount: float,
    reference: Optional[str] = None
):
    """External API: Create transaction from merchant website"""
    # Authenticate via API key in header
    api_key = request.headers.get("X-API-Key")
    api_secret = request.headers.get("X-API-Secret")
    
    if not api_key or not api_secret:
        raise HTTPException(status_code=401, detail="Missing API credentials")
    
    merchant = await db.sdm_merchants.find_one(
        {"api_key": api_key, "api_secret": api_secret, "is_active": True},
        {"_id": 0}
    )
    if not merchant:
        raise HTTPException(status_code=401, detail="Invalid API credentials")
    
    # Find user by phone
    phone = normalize_phone(user_phone)
    user = await db.sdm_users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate cashback
    cashback_amount = amount * merchant["cashback_rate"]
    sdm_commission = cashback_amount * SDM_COMMISSION_RATE
    net_cashback = cashback_amount - sdm_commission
    available_date = (datetime.now(timezone.utc) + timedelta(days=CASHBACK_PENDING_DAYS)).isoformat()
    
    # Create transaction
    transaction = SDMTransaction(
        user_id=user["id"],
        merchant_id=merchant["id"],
        merchant_name=merchant["business_name"],
        amount=amount,
        cashback_rate=merchant["cashback_rate"],
        cashback_amount=cashback_amount,
        sdm_commission=sdm_commission,
        net_cashback=net_cashback,
        available_date=available_date,
        notes=reference
    )
    await db.sdm_transactions.insert_one(transaction.model_dump())
    
    # Update user wallet
    await db.sdm_users.update_one(
        {"id": user["id"]},
        {"$inc": {"wallet_pending": net_cashback, "total_earned": net_cashback}}
    )
    
    # Update merchant stats
    await db.sdm_merchants.update_one(
        {"id": merchant["id"]},
        {"$inc": {"total_transactions": 1, "total_cashback_given": net_cashback}}
    )
    
    return {
        "success": True,
        "transaction_id": transaction.transaction_id,
        "cashback_amount": round(net_cashback, 2),
        "available_date": available_date
    }

@sdm_router.get("/external/user/{phone}")
async def external_get_user(phone: str, request: Request):
    """External API: Check if user exists"""
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing API key")
    
    merchant = await db.sdm_merchants.find_one({"api_key": api_key, "is_active": True}, {"_id": 0})
    if not merchant:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    phone = normalize_phone(phone)
    user = await db.sdm_users.find_one({"phone": phone}, {"_id": 0, "id": 1, "first_name": 1, "last_name": 1})
    
    if not user:
        return {"exists": False}
    
    return {
        "exists": True,
        "user_id": user["id"],
        "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or "SDM User"
    }

# Include routers
app.include_router(api_router)
app.include_router(sdm_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
