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
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

print(f"🔧 SDM REWARDS Server - DB_NAME: {DB_NAME}")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ============== APP LIFESPAN ==============
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    import asyncio
    
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
    
    # Make database accessible via app.state
    app.state.db = db
    
    # Start scheduled SMS worker
    from services.scheduled_sms_processor import start_scheduled_sms_worker
    sms_worker_task = asyncio.create_task(start_scheduled_sms_worker())
    logger.info("📬 Scheduled SMS worker started")
    
    yield
    
    # Shutdown
    logger.info("🛑 SDM REWARDS Server Shutting Down...")
    sms_worker_task.cancel()
    try:
        await sms_worker_task
    except asyncio.CancelledError:
        pass
    client.close()

# ============== CREATE APP ==============
app = FastAPI(
    title="SDM REWARDS API",
    description="Smart Development Membership - Loyalty & Cashback Platform",
    version="2.4.2",
    lifespan=lifespan
)

# ============== CORS ==============
# IMPORTANT: Explicitly allow sdmrewards.com and other origins
# Cannot use credentials=True with origins=["*"], so we list explicitly
ALLOWED_ORIGINS = [
    "https://sdmrewards.com",
    "https://www.sdmrewards.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://web-boost-seo.preview.emergentagent.com",
    # Add any other domains here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],  # Expose all headers to frontend
)

# ============== GZIP COMPRESSION ==============
from starlette.middleware.gzip import GZipMiddleware

# Enable GZIP compression for responses > 500 bytes
# This significantly reduces bandwidth usage for low-connectivity users
app.add_middleware(GZipMiddleware, minimum_size=500)

# ============== RATE LIMITING ==============
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ============== SECURITY HEADERS MIDDLEWARE ==============
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all HTTP responses.
    Mitigates XSS, clickjacking, and other common web vulnerabilities.
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        
        # Content Security Policy - Controls which resources the browser can load
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' https: data: blob:; "
            "script-src 'self' https: 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' https: 'unsafe-inline'; "
            "font-src 'self' https: data:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'self'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        
        # X-Frame-Options - Prevents clickjacking attacks
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        
        # X-Content-Type-Options - Prevents MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Referrer-Policy - Controls referrer information sent with requests
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Strict-Transport-Security (HSTS) - Forces HTTPS connections
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # X-XSS-Protection - Legacy XSS filter (for older browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Permissions-Policy - Controls browser features/APIs
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), "
            "camera=(), "
            "geolocation=(self), "
            "gyroscope=(), "
            "magnetometer=(), "
            "microphone=(), "
            "payment=(self), "
            "usb=()"
        )
        
        return response

app.add_middleware(SecurityHeadersMiddleware)

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
        "version": "2.4.2",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/api/debug/server-ip")
async def get_server_outbound_ip():
    """
    Debug endpoint to discover the server's outbound IP address.
    This helps identify which IP needs to be whitelisted with payment providers.
    """
    import httpx
    
    ip_info = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "outbound_ips": []
    }
    
    # Try multiple IP detection services
    ip_services = [
        "https://api.ipify.org",
        "https://ifconfig.me/ip",
        "https://icanhazip.com"
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        for service in ip_services:
            try:
                response = await client.get(service)
                if response.status_code == 200:
                    ip = response.text.strip()
                    if ip and ip not in ip_info["outbound_ips"]:
                        ip_info["outbound_ips"].append(ip)
            except Exception as e:
                pass
    
    # Also try hitting the webhook to show actual IP
    webhook_url = "https://webhook.site/dfe1a8b7-4e95-44d6-9649-58f02f0935b5"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{webhook_url}/server-ip-check",
                json={"source": "sdm-rewards-debug", "timestamp": ip_info["timestamp"]},
                headers={"X-Debug": "server-ip-check"}
            )
            ip_info["webhook_pinged"] = True
    except Exception:
        ip_info["webhook_pinged"] = False
    
    return ip_info


# ============== DEBUG ENDPOINT FOR WITHDRAWAL ==============
@app.post("/api/debug/withdrawal-request")
async def debug_withdrawal_request(request: Request):
    """
    Debug endpoint to see exactly what the frontend sends for withdrawal.
    Returns the raw request body without validation.
    """
    try:
        body = await request.json()
    except Exception as e:
        body = {"error": f"Could not parse JSON: {str(e)}"}
    
    headers = dict(request.headers)
    
    return {
        "received_body": body,
        "content_type": headers.get("content-type"),
        "authorization_present": "authorization" in headers,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ============== PUBLIC BANKS ENDPOINT ==============
@app.get("/api/public/banks")
async def get_public_banks():
    """
    Get list of supported banks from BulkClix.
    Used by merchants to configure bank payouts.
    """
    from services.bulkclix_service import bank_transfer_service
    
    result = await bank_transfer_service.get_bank_list()
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to fetch banks"))
    
    return {
        "success": True,
        "banks": result["banks"]
    }


# ============== PUBLIC CARD TYPES ENDPOINT ==============
@app.get("/api/public/card-types")
async def get_public_card_types():
    """
    Get all active card types for landing page and client registration.
    This endpoint returns ALL data configured in Admin Dashboard.
    Auto-synchronized with Admin changes.
    """
    
    # Get platform config for default cards
    config = await db.platform_config.find_one({"key": "main"}, {"_id": 0})
    
    cards = []
    if config:
        # Get all card configuration from platform_config
        card_prices = config.get("card_prices", {"silver": 25, "gold": 50, "platinum": 100})
        card_benefits = config.get("card_benefits", {})
        card_durations = config.get("card_durations", {"silver": 365, "gold": 365, "platinum": 730})
        welcome_bonuses = config.get("welcome_bonuses", {"silver": 1, "gold": 2, "platinum": 3})
        card_cashback_rates = config.get("card_cashback_rates", {"silver": 5, "gold": 7, "platinum": 10})
        card_status = config.get("card_status", {"silver": True, "gold": True, "platinum": True})
        
        # Card colors
        card_colors = {
            "silver": "#94a3b8",
            "gold": "#f59e0b", 
            "platinum": "#6366f1"
        }
        
        # Default benefits if not configured
        default_benefits = {
            "silver": [
                "Access to SDM cashback network",
                "Up to 10% cashback at partner merchants",
                "Referral rewards program",
                "Merchant promotions access",
                f"Welcome bonus: GHS {welcome_bonuses.get('silver', 1)}"
            ],
            "gold": [
                "Higher cashback opportunities",
                "Priority access to promotions",
                "Special birthday bonus",
                "Premium merchant access",
                "Enhanced referral visibility",
                f"Welcome bonus: GHS {welcome_bonuses.get('gold', 2)}"
            ],
            "platinum": [
                "Maximum cashback at all partners",
                "VIP promotions & exclusive offers",
                "Priority support",
                "Exclusive merchant offers",
                "Higher promotional bonuses",
                "Special campaign invitations",
                f"Welcome bonus: GHS {welcome_bonuses.get('platinum', 3)}"
            ]
        }
        
        for card_type in ["silver", "gold", "platinum"]:
            # Skip inactive cards
            if not card_status.get(card_type, True):
                continue
                
            cards.append({
                "slug": card_type,
                "type": card_type,
                "name": card_type.capitalize() + " Card",
                "price": card_prices.get(card_type, 0),
                "duration_days": card_durations.get(card_type, 365),
                "duration_label": format_duration(card_durations.get(card_type, 365)),
                "welcome_bonus": welcome_bonuses.get(card_type, 1),
                "cashback_rate": card_cashback_rates.get(card_type, 5),
                "benefits": card_benefits.get(card_type, default_benefits.get(card_type, [])),
                "color": card_colors.get(card_type, "#6366f1"),
                "icon": "credit-card",
                "is_default": True,
                "is_active": card_status.get(card_type, True)
            })
    
    # Get active custom card types
    custom_cards = await db.card_types.find(
        {"is_active": True},
        {"_id": 0, "created_at": 0, "updated_at": 0}
    ).sort("sort_order", 1).to_list(100)
    
    for card in custom_cards:
        card["is_default"] = False
        card["type"] = card.get("slug", card.get("name", "custom").lower())
        card["duration_label"] = format_duration(card.get("duration_days", 365))
        if not card.get("welcome_bonus"):
            card["welcome_bonus"] = 1
        if not card.get("cashback_rate"):
            card["cashback_rate"] = 5
    
    all_cards = cards + custom_cards
    
    # Also return platform info for landing page
    platform_info = {
        "referral_bonus": config.get("referral_bonus", 3) if config else 3,
        "min_withdrawal": config.get("min_withdrawal", 5) if config else 5,
        "contact_email": config.get("contact_email", "support@sdmrewards.com") if config else "support@sdmrewards.com",
        "contact_phone": config.get("contact_phone", "") if config else ""
    }
    
    return {
        "card_types": all_cards,
        "platform_info": platform_info,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }


# ============== PUBLIC MERCHANTS ENDPOINT ==============
@app.get("/api/public/merchants")
async def get_public_merchants(
    city: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """
    Get list of active merchants with public info for clients.
    Includes: business name, city, address, phone, google maps link.
    """
    from utils.security import sanitize_regex_input
    
    query = {"status": "active"}
    
    # City filter - sanitize input
    if city:
        safe_city = sanitize_regex_input(city)
        query["city"] = {"$regex": safe_city, "$options": "i"}
    
    # Search filter - sanitize input
    if search:
        safe_search = sanitize_regex_input(search)
        query["$or"] = [
            {"business_name": {"$regex": safe_search, "$options": "i"}},
            {"business_type": {"$regex": safe_search, "$options": "i"}},
            {"city": {"$regex": safe_search, "$options": "i"}}
        ]
    
    # Pagination
    skip = (page - 1) * limit
    
    # Get total count
    total_count = await db.merchants.count_documents(query)
    
    # Get merchants with public fields only
    merchants = await db.merchants.find(
        query,
        {
            "_id": 0,
            "id": 1,
            "business_name": 1,
            "business_type": 1,
            "city": 1,
            "business_address": 1,
            "phone": 1,
            "google_maps_url": 1,
            "gps_coordinates": 1,
            "qr_code": 1,
            "cashback_rate": 1,
            "business_description": 1
        }
    ).sort("business_name", 1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "merchants": merchants,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": (total_count + limit - 1) // limit
        }
    }


@app.get("/api/public/merchants/{merchant_id}")
async def get_public_merchant_detail(merchant_id: str):
    """
    Get detailed public info for a single merchant.
    """
    merchant = await db.merchants.find_one(
        {"$or": [{"id": merchant_id}, {"qr_code": merchant_id}], "status": "active"},
        {
            "_id": 0,
            "id": 1,
            "business_name": 1,
            "business_type": 1,
            "city": 1,
            "business_address": 1,
            "phone": 1,
            "google_maps_url": 1,
            "gps_coordinates": 1,
            "qr_code": 1,
            "cashback_rate": 1,
            "business_description": 1
        }
    )
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    return merchant


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
from routers.payments import router as payments_router, set_db as set_payments_db
from routers.services import router as services_router
from routers.seo import router as seo_router
from routers.ai import router as ai_router
from routers.notifications import router as notifications_router
from routers.language import router as language_router
from routers.growth import router as growth_router
from routers.two_factor import router as two_factor_router
from routers import integration as integration_router_module

# Set database for payments router (new package)
set_payments_db(db)

# Set database for integration router
integration_router_module.set_database(db)

# ============== REGISTER ROUTERS ==============
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(clients_router, prefix="/api/clients", tags=["Clients"])
app.include_router(merchants_router, prefix="/api/merchants", tags=["Merchants"])
app.include_router(transactions_router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(payments_router, prefix="/api/payments", tags=["Payments"])
app.include_router(services_router, prefix="/api/services", tags=["Services"])
app.include_router(seo_router, tags=["SEO"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(language_router, prefix="/api/language", tags=["Language"])
app.include_router(growth_router, prefix="/api/growth", tags=["Growth & Gamification"])
app.include_router(two_factor_router, prefix="/api/2fa", tags=["Two-Factor Authentication"])
app.include_router(integration_router_module.router, prefix="/api", tags=["Integration API"])

# ============== MOBILE APP STATIC FILES ==============
import os
mobile_static_path = os.path.join(os.path.dirname(__file__), "static", "mobile")
if os.path.exists(mobile_static_path):
    # Mount static assets for mobile app (with /api prefix for Kubernetes ingress)
    app.mount("/api/mobile/_expo", StaticFiles(directory=os.path.join(mobile_static_path, "_expo")), name="mobile_expo")
    app.mount("/api/mobile/assets", StaticFiles(directory=os.path.join(mobile_static_path, "assets")), name="mobile_assets")
    
    @app.get("/api/mobile")
    @app.get("/api/mobile/")
    @app.get("/api/mobile/{full_path:path}")
    async def serve_mobile_app(full_path: str = ""):
        """Serve the mobile web app"""
        # For any route, serve index.html (SPA routing)
        index_path = os.path.join(mobile_static_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path, media_type="text/html")
        raise HTTPException(status_code=404, detail="Mobile app not found")

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
