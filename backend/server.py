"""
SDM REWARDS - Main Server
=========================
Smart Development Membership - Loyalty & Cashback Platform
By GIT NFT GHANA Ltd.
"""

import os
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from passlib.context import CryptContext

# Load environment variables
load_dotenv()

# Password/PIN hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== DATABASE CONNECTION ==============
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sdm_rewards')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ============== APP LIFESPAN ==============
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("🚀 SDM REWARDS Server Starting...")
    logger.info(f"📦 Database: {DB_NAME}")
    
    # Create indexes
    await create_indexes()
    
    # Initialize platform config
    await init_platform_config()
    
    # Initialize super admin
    await init_super_admin()
    
    # Initialize Settings PIN
    await init_settings_pin()
    
    yield
    
    # Shutdown
    logger.info("🛑 SDM REWARDS Server Shutting Down...")
    client.close()

# ============== CREATE APP ==============
app = FastAPI(
    title="SDM REWARDS API",
    description="Smart Development Membership - Loyalty & Cashback Platform",
    version="2.0.0",
    lifespan=lifespan
)

# ============== CORS ==============
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== DATABASE INDEXES ==============
async def create_indexes():
    """Create database indexes for performance"""
    try:
        # Clients collection
        await db.clients.create_index("phone", unique=True)
        await db.clients.create_index("email", unique=True, sparse=True)
        await db.clients.create_index("username", unique=True)
        await db.clients.create_index("referral_code", unique=True)
        
        # Merchants collection - drop and recreate email index with sparse=True
        try:
            await db.merchants.drop_index("email_1")
        except Exception:
            pass  # Index may not exist
        
        await db.merchants.create_index("phone", unique=True)
        await db.merchants.create_index("email", unique=True, sparse=True)
        await db.merchants.create_index("business_name")
        await db.merchants.create_index("payment_qr_code", unique=True)
        
        # Transactions collection
        await db.transactions.create_index("client_id")
        await db.transactions.create_index("merchant_id")
        await db.transactions.create_index("created_at")
        await db.transactions.create_index("type")
        
        # Cards collection
        await db.membership_cards.create_index("client_id")
        await db.membership_cards.create_index("card_number", unique=True)
        
        # Referrals collection
        await db.referrals.create_index("referrer_id")
        await db.referrals.create_index("referred_id")
        
        logger.info("✅ Database indexes created")
    except Exception as e:
        logger.error(f"❌ Index creation error: {e}")

# ============== SUPER ADMIN INITIALIZATION ==============
async def init_super_admin():
    """Create super admin account if it doesn't exist"""
    try:
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        # Check if super admin exists
        existing = await db.admins.find_one({"email": "emileparfait2003@gmail.com"})
        if not existing:
            hashed_password = pwd_context.hash("Gerard0103@")
            admin_data = {
                "email": "emileparfait2003@gmail.com",
                "password": hashed_password,
                "name": "Super Admin",
                "role": "super_admin",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            await db.admins.insert_one(admin_data)
            logger.info("✅ Super admin account created")
        else:
            # Ensure the account is active
            if not existing.get("is_active"):
                await db.admins.update_one(
                    {"email": "emileparfait2003@gmail.com"},
                    {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc)}}
                )
                logger.info("✅ Super admin account reactivated")
            else:
                logger.info("✅ Super admin account exists and is active")
    except Exception as e:
        logger.error(f"❌ Super admin initialization error: {e}")

# ============== SETTINGS PIN INITIALIZATION ==============
async def init_settings_pin():
    """Initialize default Settings PIN (0000)"""
    try:
        existing = await db.settings_security.find_one({"key": "settings_pin"})
        if not existing:
            # Create default PIN (0000)
            default_pin = "0000"
            pin_hash = pwd_context.hash(default_pin)
            
            await db.settings_security.insert_one({
                "key": "settings_pin",
                "pin_hash": pin_hash,
                "enabled": True,
                "failed_attempts": 0,
                "locked_until": None,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
            logger.info("✅ Default Settings PIN (0000) created")
        else:
            logger.info("✅ Settings PIN already configured")
    except Exception as e:
        logger.error(f"❌ Settings PIN initialization error: {e}")

# ============== PLATFORM CONFIG ==============
async def init_platform_config():
    """Initialize platform configuration"""
    existing = await db.platform_config.find_one({"key": "main"})
    if not existing:
        config = {
            "key": "main",
            "platform_name": "SDM REWARDS",
            "currency": "GHS",
            "country": "Ghana",
            
            # Cards
            "cards": {
                "silver": {"name": "Silver Card", "price": 25, "color": "#C0C0C0", "duration_days": 365},
                "gold": {"name": "Gold Card", "price": 50, "color": "#FFD700", "duration_days": 365},
                "platinum": {"name": "Platinum Card", "price": 100, "color": "#E5E4E2", "duration_days": 730}
            },
            
            # Card durations (for legacy compatibility)
            "card_durations": {
                "silver": 365,
                "gold": 365,
                "platinum": 730
            },
            
            # Cashback settings
            "cashback_min_rate": 1,
            "cashback_max_rate": 20,
            
            # Platform commission on cashback (1-5%)
            "platform_commission_rate": 5,
            
            # Commission on cashback usage
            "usage_commission_type": "percentage",  # "percentage" or "fixed"
            "usage_commission_rate": 1,  # 1% or 1 GHS
            
            # Referral bonuses
            "welcome_bonus": 1,  # 1 GHS for new member
            "referrer_bonus": 3,  # 3 GHS for referrer
            
            # Languages
            "default_language": "en",
            "supported_languages": ["en", "fr", "zh", "ar"],
            
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.platform_config.insert_one(config)
        logger.info("✅ Platform config initialized")

# ============== HEALTH CHECK ==============
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "SDM REWARDS API",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ============== PUBLIC CARD TYPES ENDPOINT ==============
@app.get("/api/public/card-types")
async def get_public_card_types():
    """Get all active card types for landing page and client registration"""
    
    # Get platform config for default cards
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    
    cards = []
    if config:
        card_prices = config.get("card_prices", {})
        card_benefits = config.get("card_benefits", {})
        card_durations = config.get("card_durations", {"silver": 365, "gold": 365, "platinum": 730})
        
        for card_type in ["silver", "gold", "platinum"]:
            cards.append({
                "slug": card_type,
                "name": card_type.capitalize(),
                "price": card_prices.get(card_type, 0),
                "duration_days": card_durations.get(card_type, 365),
                "duration_label": format_duration(card_durations.get(card_type, 365)),
                "benefits": card_benefits.get(card_type, ""),
                "color": {"silver": "#94a3b8", "gold": "#f59e0b", "platinum": "#6366f1"}.get(card_type, "#6366f1"),
                "icon": "credit-card",
                "is_default": True
            })
    
    # Get active custom card types
    custom_cards = await db.card_types.find(
        {"is_active": True},
        {"_id": 0, "id": 0, "created_at": 0, "updated_at": 0}
    ).sort("sort_order", 1).to_list(100)
    
    for card in custom_cards:
        card["is_default"] = False
        card["duration_label"] = format_duration(card.get("duration_days", 365))
    
    all_cards = cards + custom_cards
    return {"card_types": all_cards}


def format_duration(days: int) -> str:
    """Format duration in days to human readable string"""
    if days >= 730:
        years = days // 365
        return f"{years} year{'s' if years > 1 else ''}"
    elif days >= 365:
        return "1 year"
    elif days >= 30:
        months = days // 30
        return f"{months} month{'s' if months > 1 else ''}"
    else:
        return f"{days} day{'s' if days > 1 else ''}"

# ============== IMPORT ROUTERS ==============
from routers.auth import router as auth_router
from routers.clients import router as clients_router
from routers.merchants import router as merchants_router
from routers.transactions import router as transactions_router
from routers.admin import router as admin_router
from routers import payments as payments_router_module
from routers.services import router as services_router

# Set database for payments router
payments_router_module.set_db(db)

# ============== REGISTER ROUTERS ==============
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(clients_router, prefix="/api/clients", tags=["Clients"])
app.include_router(merchants_router, prefix="/api/merchants", tags=["Merchants"])
app.include_router(transactions_router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(payments_router_module.router, prefix="/api/payments", tags=["Payments"])
app.include_router(services_router, prefix="/api/services", tags=["Services"])

# ============== ERROR HANDLERS ==============
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "status_code": exc.status_code,
            "detail": exc.detail
        }
    )


# ============== CARD EXPIRATION REMINDER TASK ==============
from datetime import timedelta

@app.post("/api/tasks/card-expiration-reminders")
async def send_card_expiration_reminders():
    """
    Send SMS reminders to clients whose cards are expiring soon.
    Called by external cron job (daily).
    Sends reminders at: 7 days, 3 days, 1 day before expiration.
    """
    from services.sms_service import get_sms_service
    
    sms = get_sms_service(db)
    now = datetime.now(timezone.utc)
    
    # Find clients with expiring cards
    reminder_days = [7, 3, 1]
    sent_count = 0
    
    for days in reminder_days:
        target_date = now + timedelta(days=days)
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Find clients whose cards expire on this target date
        expiring_clients = await db.clients.find({
            "status": "active",
            "card_expires_at": {
                "$gte": start_of_day.isoformat(),
                "$lte": end_of_day.isoformat()
            }
        }, {"_id": 0, "id": 1, "phone": 1, "card_type": 1, "full_name": 1}).to_list(1000)
        
        for client in expiring_clients:
            # Check if we already sent a reminder for this day
            existing_reminder = await db.sms_logs.find_one({
                "phone": client["phone"],
                "type": "card_expiring",
                "created_at": {"$gte": start_of_day.isoformat()}
            })
            
            if not existing_reminder:
                try:
                    await sms.notify_card_expiring(
                        client["phone"],
                        client.get("card_type", ""),
                        days
                    )
                    sent_count += 1
                    logger.info(f"Sent expiration reminder to {client['phone']} ({days} days)")
                except Exception as e:
                    logger.error(f"Failed to send reminder to {client['phone']}: {e}")
    
    # Also check for already expired cards (send once)
    expired_clients = await db.clients.find({
        "status": "active",
        "card_expires_at": {"$lt": now.isoformat()}
    }, {"_id": 0, "id": 1, "phone": 1, "card_type": 1}).to_list(100)
    
    for client in expired_clients:
        # Check if we sent expired notification in last 7 days
        week_ago = (now - timedelta(days=7)).isoformat()
        existing_expired_sms = await db.sms_logs.find_one({
            "phone": client["phone"],
            "type": "card_expired",
            "created_at": {"$gte": week_ago}
        })
        
        if not existing_expired_sms:
            try:
                await sms.notify_card_expired(client["phone"], client.get("card_type", ""))
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send expired notification: {e}")
    
    return {
        "success": True,
        "reminders_sent": sent_count,
        "timestamp": now.isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
