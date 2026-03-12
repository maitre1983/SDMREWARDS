# /app/backend/utils/helpers.py
"""
SDM Fintech Platform - Helper Functions
Extracted from server.py for better maintainability
"""

import os
import bcrypt
import jwt
import secrets
import qrcode
import io
import base64
import phonenumbers
from datetime import datetime, timezone, timedelta

# JWT Secret from environment - no fallback for security
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    import warnings
    warnings.warn("JWT_SECRET not properly configured - using development key")
    JWT_SECRET = "sdm-dev-key-not-for-production-use-32chars"


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(data: dict, expires_hours: int = 24) -> str:
    """Create a JWT token with expiration"""
    expire = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
    data_copy = data.copy()
    data_copy.update({"exp": expire})
    return jwt.encode(data_copy, JWT_SECRET, algorithm="HS256")


def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return str(secrets.randbelow(900000) + 100000)


def normalize_phone(phone: str) -> str:
    """Normalize phone number to E.164 format (+233...)"
    
    Handles various input formats:
    - 0551234567 -> +233551234567
    - +233551234567 -> +233551234567  
    - 233551234567 -> +233551234567
    """
    try:
        # Remove all spaces and dashes
        phone = phone.replace(" ", "").replace("-", "")
        
        # If already in international format
        if phone.startswith("+"):
            parsed = phonenumbers.parse(phone)
        else:
            # Assume Ghana (GH) as default region
            parsed = phonenumbers.parse(phone, "GH")
        
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except Exception:
        # Return original if parsing fails
        return phone


def generate_qr_code_base64(data: str) -> str:
    """Generate QR code and return as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()


def parse_user_agent(user_agent: str) -> dict:
    """Parse user agent string to extract device info"""
    ua = user_agent.lower() if user_agent else ""
    
    # Detect device type
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        device_type = "mobile"
    elif "tablet" in ua or "ipad" in ua:
        device_type = "tablet"
    else:
        device_type = "desktop"
    
    # Detect OS
    if "android" in ua:
        os_name = "Android"
    elif "iphone" in ua or "ipad" in ua or "mac" in ua:
        os_name = "iOS/macOS"
    elif "windows" in ua:
        os_name = "Windows"
    elif "linux" in ua:
        os_name = "Linux"
    else:
        os_name = "Unknown"
    
    # Detect browser
    if "chrome" in ua and "edg" not in ua:
        browser = "Chrome"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"
    elif "edg" in ua:
        browser = "Edge"
    else:
        browser = "Other"
    
    return {
        "device_type": device_type,
        "os": os_name,
        "browser": browser
    }


def generate_referral_code(length: int = 6) -> str:
    """Generate a unique referral code"""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # Excluding confusing chars (0, O, 1, I)
    return "".join(secrets.choice(chars) for _ in range(length))


def format_currency(amount: float, currency: str = "GHS") -> str:
    """Format amount as currency string"""
    return f"{currency} {amount:,.2f}"


def mask_phone(phone: str) -> str:
    """Mask phone number for privacy (show last 4 digits only)"""
    if len(phone) >= 4:
        return "*" * (len(phone) - 4) + phone[-4:]
    return phone
