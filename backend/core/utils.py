# /app/backend/core/utils.py
"""
Utility functions for the SDM platform
"""

import bcrypt
import jwt
import secrets
import qrcode
import io
import base64
import httpx
import asyncio
import logging
import phonenumbers
from datetime import datetime, timezone, timedelta

from .config import JWT_SECRET, JWT_ALGORITHM, HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, HUBTEL_SENDER_ID

logger = logging.getLogger(__name__)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(data: dict, expires_hours: int = 24) -> str:
    """Create a JWT token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
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
    return base64.b64encode(buffer.getvalue()).decode()

def parse_user_agent(user_agent: str) -> dict:
    """Parse user agent string to extract device info"""
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
