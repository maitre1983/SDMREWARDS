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

# Load environment variables
load_dotenv()

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
                "silver": {"name": "Silver Card", "price": 25, "color": "#C0C0C0"},
                "gold": {"name": "Gold Card", "price": 50, "color": "#FFD700"},
                "platinum": {"name": "Platinum Card", "price": 100, "color": "#E5E4E2"}
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

# ============== IMPORT ROUTERS ==============
from routers.auth import router as auth_router
from routers.clients import router as clients_router
from routers.merchants import router as merchants_router
from routers.transactions import router as transactions_router
from routers.admin import router as admin_router

# ============== REGISTER ROUTERS ==============
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(clients_router, prefix="/api/clients", tags=["Clients"])
app.include_router(merchants_router, prefix="/api/merchants", tags=["Merchants"])
app.include_router(transactions_router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
