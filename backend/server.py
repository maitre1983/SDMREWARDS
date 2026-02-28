from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'smart-digital-solutions-secret-key-2024')
JWT_ALGORITHM = "HS256"

# Create the main app
app = FastAPI(title="Smart Digital Solutions API")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

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
    status: str = "unread"  # unread, read, replied
    admin_reply: Optional[str] = None
    replied_at: Optional[str] = None
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

# ============== HELPER FUNCTIONS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(data: dict) -> str:
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)

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
    return message_obj

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Smart Digital Solutions"}

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
        return {"message": "Admin already exists"}
    
    admin = AdminUser(
        username="admin",
        password_hash=hash_password("admin123")
    )
    await db.admins.insert_one(admin.model_dump())
    return {"message": "Admin created", "username": "admin", "password": "admin123"}

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
    """Reply to a contact message"""
    result = await db.contact_messages.update_one(
        {"id": message_id},
        {"$set": {
            "status": "replied",
            "admin_reply": reply_data.reply,
            "replied_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Reply saved"}

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
    return {
        "total_messages": total,
        "unread_messages": unread,
        "replied_messages": replied,
        "read_messages": total - unread - replied
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

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
