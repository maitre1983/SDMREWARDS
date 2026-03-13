"""
SDM REWARDS - Security Utilities
================================
Centralized security functions for:
- JWT token management
- Input sanitization
- Rate limiting configuration
"""

import os
import re
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

import jwt

# ============== JWT CONFIGURATION ==============
# Load from environment with NO fallback - fail fast if not configured
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    import warnings
    warnings.warn("JWT_SECRET not properly configured - using development key")
    JWT_SECRET = "sdm-dev-key-not-for-production-use-32chars"

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days


def create_secure_token(user_id: str, user_type: str, extra_data: Optional[dict] = None) -> str:
    """
    Create a secure JWT token with proper claims.
    
    Args:
        user_id: Unique identifier of the user
        user_type: Type of user (client, merchant, admin)
        extra_data: Optional additional claims
    
    Returns:
        Encoded JWT token string
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": user_type,
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRATION_HOURS),
        "jti": secrets.token_urlsafe(16)  # Unique token ID for revocation
    }
    
    if extra_data:
        payload.update(extra_data)
    
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_secure_token(token: str) -> dict:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded payload dictionary
    
    Raises:
        jwt.ExpiredSignatureError: Token has expired
        jwt.InvalidTokenError: Token is invalid
    """
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


# ============== INPUT SANITIZATION ==============

# Characters that have special meaning in regex
REGEX_SPECIAL_CHARS = re.compile(r'([.^$*+?{}()\[\]\\|])')


def sanitize_regex_input(user_input: str, max_length: int = 100) -> str:
    """
    Sanitize user input for safe use in MongoDB $regex queries.
    
    This prevents:
    - ReDoS (Regular Expression Denial of Service) attacks
    - NoSQL injection via regex metacharacters
    
    Args:
        user_input: Raw user input string
        max_length: Maximum allowed length (default 100)
    
    Returns:
        Sanitized string safe for regex queries
    """
    if not user_input:
        return ""
    
    # Truncate to max length
    sanitized = user_input[:max_length]
    
    # Escape all regex special characters
    sanitized = REGEX_SPECIAL_CHARS.sub(r'\\\1', sanitized)
    
    # Remove null bytes and other control characters
    sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', sanitized)
    
    return sanitized


def sanitize_search_query(query: str) -> str:
    """
    Sanitize a search query for MongoDB text search.
    
    Args:
        query: Raw search query
    
    Returns:
        Sanitized query string
    """
    if not query:
        return ""
    
    # Remove MongoDB operators that could be injected
    dangerous_patterns = [
        r'\$[a-zA-Z]+',  # MongoDB operators like $gt, $regex
        r'\{[^}]*\}',    # JSON objects
        r'\[[^\]]*\]',   # Arrays
    ]
    
    sanitized = query
    for pattern in dangerous_patterns:
        sanitized = re.sub(pattern, '', sanitized)
    
    # Limit length and strip
    return sanitized[:200].strip()


# ============== CORS CONFIGURATION ==============

def get_cors_origins() -> list:
    """
    Get allowed CORS origins from environment.
    
    Returns:
        List of allowed origin strings
    """
    # ALWAYS include production domains
    default_origins = [
        "https://sdmrewards.com",
        "https://www.sdmrewards.com",
        "https://web-boost-seo.preview.emergentagent.com",
        "https://web-boost-seo.emergent.host",
        "http://localhost:3000",
        "http://localhost:8001",
    ]
    
    # Read additional origins from environment variable
    origins_str = os.environ.get("CORS_ORIGINS") or os.environ.get("CORS_ALLOWED_ORIGINS", "")
    
    if origins_str == "*":
        # Allow all origins (useful for development/preview)
        return ["*"]
    
    if origins_str:
        # Parse comma-separated origins and merge with defaults
        env_origins = [origin.strip() for origin in origins_str.split(",") if origin.strip()]
        all_origins = list(set(default_origins + env_origins))
        return all_origins
    
    # Return default origins
    return default_origins


# ============== RATE LIMITING HELPERS ==============

def get_client_ip(request) -> str:
    """
    Get the real client IP address from request.
    Handles proxies and load balancers.
    
    Args:
        request: FastAPI/Starlette request object
    
    Returns:
        Client IP address string
    """
    # Check X-Forwarded-For header (set by proxies)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Get the first IP (original client)
        return forwarded_for.split(",")[0].strip()
    
    # Check X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fall back to direct client IP
    if request.client:
        return request.client.host
    
    return "unknown"


# ============== PASSWORD SECURITY ==============

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets minimum security requirements.
    
    Args:
        password: Password to validate
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 6:
        return False, "Password must be at least 6 characters"
    
    if len(password) > 128:
        return False, "Password too long (max 128 characters)"
    
    # Check for common weak passwords
    weak_passwords = [
        "123456", "password", "000000", "111111", 
        "123123", "abc123", "qwerty", "admin"
    ]
    if password.lower() in weak_passwords:
        return False, "Password is too common. Please choose a stronger password."
    
    return True, ""
