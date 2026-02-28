from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
import resend

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
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'Contact@smartdigitalsolutions.com')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Create the main app
app = FastAPI(title="Smart Digital Solutions API")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

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
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AdminLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Analytics Models
class VisitLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    page: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    device_type: str = "unknown"  # desktop, mobile, tablet
    browser: Optional[str] = None
    os: Optional[str] = None
    referrer: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VisitCreate(BaseModel):
    page: str
    referrer: Optional[str] = None

# ============== HELPER FUNCTIONS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(data: dict) -> str:
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)

def parse_user_agent(user_agent: str) -> dict:
    """Parse user agent to extract device, browser, and OS info"""
    ua_lower = user_agent.lower() if user_agent else ""
    
    # Detect device type
    device_type = "desktop"
    if "mobile" in ua_lower or "android" in ua_lower and "mobile" in ua_lower:
        device_type = "mobile"
    elif "tablet" in ua_lower or "ipad" in ua_lower:
        device_type = "tablet"
    elif "android" in ua_lower:
        device_type = "tablet"
    
    # Detect browser
    browser = "unknown"
    if "edg" in ua_lower:
        browser = "Edge"
    elif "chrome" in ua_lower:
        browser = "Chrome"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "safari" in ua_lower:
        browser = "Safari"
    elif "opera" in ua_lower or "opr" in ua_lower:
        browser = "Opera"
    
    # Detect OS
    os_name = "unknown"
    if "windows" in ua_lower:
        os_name = "Windows"
    elif "mac" in ua_lower:
        os_name = "MacOS"
    elif "linux" in ua_lower:
        os_name = "Linux"
    elif "android" in ua_lower:
        os_name = "Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os_name = "iOS"
    
    return {
        "device_type": device_type,
        "browser": browser,
        "os": os_name
    }

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        admin = await db.admins.find_one({"username": username}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== EMAIL FUNCTIONS ==============

async def send_admin_notification(message: ContactMessage):
    """Send email notification to admin when new contact is received"""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return False
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0056D2, #00E0FF); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Request</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Smart Digital Solutions</p>
        </div>
        <div style="background: #f8f9fb; padding: 25px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #0056D2; margin-top: 0;">Contact Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b; width: 120px;">Name:</td><td style="padding: 8px 0; color: #1e293b; font-weight: 600;">{message.name}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Email:</td><td style="padding: 8px 0; color: #1e293b;">{message.email}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Phone:</td><td style="padding: 8px 0; color: #1e293b;">{message.phone or 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Company:</td><td style="padding: 8px 0; color: #1e293b;">{message.company or 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Service:</td><td style="padding: 8px 0; color: #1e293b;">{message.service_type or 'N/A'}</td></tr>
            </table>
            <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #0056D2;">
                <p style="color: #64748b; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase;">Message:</p>
                <p style="color: #1e293b; margin: 0; line-height: 1.6;">{message.message}</p>
            </div>
            <p style="margin-top: 20px; color: #94a3b8; font-size: 12px;">Received: {message.created_at}</p>
        </div>
    </div>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [ADMIN_EMAIL],
        "subject": f"New Contact: {message.name} - {message.service_type or 'General Inquiry'}",
        "html": html_content
    }
    
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Admin notification sent for message {message.id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send admin notification: {str(e)}")
        return False

async def send_client_confirmation(message: ContactMessage):
    """Send confirmation email to client"""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return False
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0056D2, #00E0FF); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Thank You!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">We've received your message</p>
        </div>
        <div style="background: #f8f9fb; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">Dear {message.name},</p>
            <p style="color: #64748b; line-height: 1.8;">Thank you for contacting Smart Digital Solutions. We have received your inquiry and our team will get back to you within 24-48 hours.</p>
            <div style="margin: 25px 0; padding: 20px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="color: #64748b; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase;">Your Message Summary:</p>
                <p style="color: #1e293b; margin: 0; font-style: italic;">"{message.message[:200]}{'...' if len(message.message) > 200 else ''}"</p>
            </div>
            <p style="color: #64748b; line-height: 1.8;">In the meantime, feel free to reach us on WhatsApp for faster response:</p>
            <a href="https://wa.me/233555861556" style="display: inline-block; background: #25D366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0;">Chat on WhatsApp</a>
            <p style="color: #64748b; margin-top: 25px; line-height: 1.6;">Best regards,<br><strong style="color: #0056D2;">Smart Digital Solutions Team</strong></p>
        </div>
        <div style="text-align: center; padding: 20px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Smart Digital Solutions by GIT NFT GHANA LTD</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0 0;">Contact@smartdigitalsolutions.com | +233 55 586 1556</p>
        </div>
    </div>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [message.email],
        "subject": "Thank you for contacting Smart Digital Solutions!",
        "html": html_content
    }
    
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Confirmation email sent to {message.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send confirmation email: {str(e)}")
        return False

async def send_reply_email(message: ContactMessage, reply: str):
    """Send admin reply to client"""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return False
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0056D2, #00E0FF); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Response to Your Inquiry</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Smart Digital Solutions</p>
        </div>
        <div style="background: #f8f9fb; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">Dear {message.name},</p>
            <p style="color: #64748b; line-height: 1.8;">Thank you for your interest in Smart Digital Solutions. Here is our response to your inquiry:</p>
            <div style="margin: 25px 0; padding: 20px; background: white; border-radius: 8px; border-left: 4px solid #0056D2;">
                <p style="color: #1e293b; margin: 0; line-height: 1.8; white-space: pre-wrap;">{reply}</p>
            </div>
            <div style="margin: 25px 0; padding: 15px; background: #f1f5f9; border-radius: 8px;">
                <p style="color: #64748b; margin: 0 0 8px 0; font-size: 12px;">YOUR ORIGINAL MESSAGE:</p>
                <p style="color: #94a3b8; margin: 0; font-size: 14px; font-style: italic;">"{message.message[:150]}{'...' if len(message.message) > 150 else ''}"</p>
            </div>
            <p style="color: #64748b; line-height: 1.8;">Need faster support? Contact us on WhatsApp:</p>
            <a href="https://wa.me/233555861556" style="display: inline-block; background: #25D366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0;">Chat on WhatsApp</a>
            <p style="color: #64748b; margin-top: 25px; line-height: 1.6;">Best regards,<br><strong style="color: #0056D2;">Smart Digital Solutions Team</strong></p>
        </div>
    </div>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [message.email],
        "subject": f"Re: Your inquiry to Smart Digital Solutions",
        "html": html_content
    }
    
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Reply email sent to {message.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send reply email: {str(e)}")
        return False

# ============== PUBLIC ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Smart Digital Solutions API"}

@api_router.post("/contact", response_model=ContactMessage)
async def create_contact_message(input_data: ContactMessageCreate):
    """Submit a contact message from the website"""
    message_obj = ContactMessage(**input_data.model_dump())
    doc = message_obj.model_dump()
    await db.contact_messages.insert_one(doc)
    
    # Send email notifications (non-blocking)
    asyncio.create_task(send_admin_notification(message_obj))
    asyncio.create_task(send_client_confirmation(message_obj))
    
    return message_obj

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Smart Digital Solutions"}

# ============== ANALYTICS ROUTES ==============

@api_router.post("/track")
async def track_visit(visit_data: VisitCreate, request: Request):
    """Track a page visit"""
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

@api_router.get("/admin/analytics")
async def get_analytics(admin: dict = Depends(get_current_admin)):
    """Get analytics data for admin dashboard"""
    # Total visits
    total_visits = await db.visits.count_documents({})
    
    # Today's visits
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_visits = await db.visits.count_documents({
        "timestamp": {"$gte": today.isoformat()}
    })
    
    # Device breakdown
    device_pipeline = [
        {"$group": {"_id": "$device_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    devices = await db.visits.aggregate(device_pipeline).to_list(10)
    
    # Browser breakdown
    browser_pipeline = [
        {"$group": {"_id": "$browser", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    browsers = await db.visits.aggregate(browser_pipeline).to_list(10)
    
    # OS breakdown
    os_pipeline = [
        {"$group": {"_id": "$os", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    os_stats = await db.visits.aggregate(os_pipeline).to_list(10)
    
    # Page breakdown
    page_pipeline = [
        {"$group": {"_id": "$page", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    pages = await db.visits.aggregate(page_pipeline).to_list(10)
    
    # Recent visits (last 20)
    recent_visits = await db.visits.find({}, {"_id": 0}).sort("timestamp", -1).to_list(20)
    
    # Visits by day (last 7 days)
    seven_days_ago = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    from datetime import timedelta
    seven_days_ago = seven_days_ago - timedelta(days=7)
    
    daily_pipeline = [
        {"$match": {"timestamp": {"$gte": seven_days_ago.isoformat()}}},
        {"$addFields": {"date": {"$substr": ["$timestamp", 0, 10]}}},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    daily_visits = await db.visits.aggregate(daily_pipeline).to_list(30)
    
    return {
        "total_visits": total_visits,
        "today_visits": today_visits,
        "devices": [{"name": d["_id"], "count": d["count"]} for d in devices],
        "browsers": [{"name": b["_id"], "count": b["count"]} for b in browsers],
        "os_stats": [{"name": o["_id"], "count": o["count"]} for o in os_stats],
        "pages": [{"name": p["_id"], "count": p["count"]} for p in pages],
        "recent_visits": recent_visits,
        "daily_visits": [{"date": d["_id"], "count": d["count"]} for d in daily_visits]
    }

# ============== ADMIN ROUTES ==============

@api_router.post("/admin/login", response_model=TokenResponse)
async def admin_login(credentials: AdminLogin):
    """Admin login endpoint"""
    admin = await db.admins.find_one({"username": credentials.username}, {"_id": 0})
    
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token({"sub": admin["username"]})
    return TokenResponse(access_token=token)

@api_router.post("/admin/setup")
async def setup_admin():
    """Create default admin if none exists"""
    existing = await db.admins.find_one({"username": "admin"}, {"_id": 0})
    if existing:
        # Update existing admin with new password
        new_hash = hash_password("Gerard0103@")
        await db.admins.update_one(
            {"username": "admin"},
            {"$set": {"password_hash": new_hash, "email": "emileparfait2003@gmail.com"}}
        )
        return {"message": "Admin password updated"}
    
    admin = AdminUser(
        username="admin",
        password_hash=hash_password("Gerard0103@")
    )
    doc = admin.model_dump()
    doc["email"] = "emileparfait2003@gmail.com"
    await db.admins.insert_one(doc)
    return {"message": "Admin created", "username": "admin"}

@api_router.get("/admin/messages", response_model=List[ContactMessage])
async def get_all_messages(admin: dict = Depends(get_current_admin)):
    """Get all contact messages (admin only)"""
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return messages

@api_router.get("/admin/messages/{message_id}", response_model=ContactMessage)
async def get_message(message_id: str, admin: dict = Depends(get_current_admin)):
    """Get a specific message"""
    message = await db.contact_messages.find_one({"id": message_id}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message

@api_router.put("/admin/messages/{message_id}/read")
async def mark_as_read(message_id: str, admin: dict = Depends(get_current_admin)):
    """Mark a message as read"""
    result = await db.contact_messages.update_one(
        {"id": message_id},
        {"$set": {"status": "read"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Marked as read"}

@api_router.put("/admin/messages/{message_id}/reply")
async def reply_to_message(message_id: str, reply_data: AdminReply, admin: dict = Depends(get_current_admin)):
    """Reply to a contact message and send email to client"""
    # Get the message first
    message_doc = await db.contact_messages.find_one({"id": message_id}, {"_id": 0})
    if not message_doc:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Update the message
    result = await db.contact_messages.update_one(
        {"id": message_id},
        {"$set": {
            "status": "replied",
            "admin_reply": reply_data.reply,
            "replied_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send email to client (non-blocking)
    message_obj = ContactMessage(**message_doc)
    asyncio.create_task(send_reply_email(message_obj, reply_data.reply))
    
    return {"message": "Reply saved and email sent"}

@api_router.delete("/admin/messages/{message_id}")
async def delete_message(message_id: str, admin: dict = Depends(get_current_admin)):
    """Delete a message"""
    result = await db.contact_messages.delete_one({"id": message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Message deleted"}

@api_router.get("/admin/stats")
async def get_stats(admin: dict = Depends(get_current_admin)):
    """Get dashboard statistics"""
    total = await db.contact_messages.count_documents({})
    unread = await db.contact_messages.count_documents({"status": "unread"})
    replied = await db.contact_messages.count_documents({"status": "replied"})
    total_visits = await db.visits.count_documents({})
    
    return {
        "total_messages": total,
        "unread_messages": unread,
        "replied_messages": replied,
        "read_messages": total - unread - replied,
        "total_visits": total_visits
    }

# Include router
app.include_router(api_router)

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
