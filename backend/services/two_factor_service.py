"""
SDM REWARDS - Two-Factor Authentication (2FA) Service
=====================================================
TOTP-based 2FA for enhanced account security.
Supports Google Authenticator, Authy, and other TOTP apps.
"""

import os
import pyotp
import base64
import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase

# App configuration
APP_NAME = "SDM REWARDS"
ISSUER_NAME = "SDM REWARDS Ghana"


def generate_secret() -> str:
    """
    Generate a new TOTP secret key.
    Returns a base32-encoded secret suitable for authenticator apps.
    """
    return pyotp.random_base32()


def get_totp_uri(secret: str, user_identifier: str, issuer: str = ISSUER_NAME) -> str:
    """
    Generate a TOTP URI for QR code generation.
    
    Args:
        secret: The TOTP secret key
        user_identifier: User's phone or email for identification
        issuer: App name shown in authenticator
    
    Returns:
        otpauth:// URI string
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=user_identifier, issuer_name=issuer)


def verify_totp(secret: str, code: str) -> bool:
    """
    Verify a TOTP code against the secret.
    
    Args:
        secret: The user's TOTP secret
        code: The 6-digit code to verify
    
    Returns:
        True if valid, False otherwise
    """
    if not secret or not code:
        return False
    
    # Clean the code (remove spaces)
    code = code.replace(" ", "").replace("-", "")
    
    # Verify with 1 interval tolerance (30 seconds before/after)
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def generate_backup_codes(count: int = 8) -> list:
    """
    Generate backup codes for account recovery.
    
    Args:
        count: Number of backup codes to generate
    
    Returns:
        List of backup code strings
    """
    codes = []
    for _ in range(count):
        # Generate 8-character alphanumeric codes
        code = secrets.token_hex(4).upper()
        # Format as XXXX-XXXX for readability
        formatted = f"{code[:4]}-{code[4:]}"
        codes.append(formatted)
    return codes


def hash_backup_code(code: str) -> str:
    """
    Hash a backup code for secure storage.
    
    Args:
        code: The backup code to hash
    
    Returns:
        SHA256 hash of the code
    """
    # Normalize: remove dashes, uppercase
    normalized = code.replace("-", "").upper()
    return hashlib.sha256(normalized.encode()).hexdigest()


class TwoFactorService:
    """Service class for managing 2FA operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def setup_2fa(
        self, 
        user_id: str, 
        user_type: str,  # 'client', 'merchant', 'admin'
        user_identifier: str  # phone or email
    ) -> dict:
        """
        Initialize 2FA setup for a user.
        
        Returns:
            Dict with secret, URI for QR code, and backup codes
        """
        secret = generate_secret()
        backup_codes = generate_backup_codes()
        
        # Hash backup codes for storage
        hashed_codes = [hash_backup_code(code) for code in backup_codes]
        
        # Get the appropriate collection
        collection = self._get_collection(user_type)
        
        # Store temporary setup (not enabled until verified)
        await collection.update_one(
            {"id": user_id},
            {
                "$set": {
                    "two_factor_setup": {
                        "secret": secret,
                        "backup_codes_hashed": hashed_codes,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            }
        )
        
        uri = get_totp_uri(secret, user_identifier)
        
        return {
            "secret": secret,
            "uri": uri,
            "backup_codes": backup_codes,  # Only shown once!
            "message": "Scan QR code with your authenticator app, then verify with a code"
        }
    
    async def verify_and_enable_2fa(
        self, 
        user_id: str, 
        user_type: str, 
        code: str
    ) -> Tuple[bool, str]:
        """
        Verify the TOTP code and enable 2FA if correct.
        
        Returns:
            Tuple of (success, message)
        """
        collection = self._get_collection(user_type)
        user = await collection.find_one({"id": user_id})
        
        if not user:
            return False, "User not found"
        
        setup = user.get("two_factor_setup")
        if not setup or not setup.get("secret"):
            return False, "2FA setup not initiated. Please start setup first."
        
        secret = setup["secret"]
        
        if not verify_totp(secret, code):
            return False, "Invalid verification code. Please try again."
        
        # Enable 2FA
        await collection.update_one(
            {"id": user_id},
            {
                "$set": {
                    "two_factor_enabled": True,
                    "two_factor_secret": secret,
                    "two_factor_backup_codes": setup.get("backup_codes_hashed", []),
                    "two_factor_enabled_at": datetime.now(timezone.utc).isoformat()
                },
                "$unset": {
                    "two_factor_setup": ""
                }
            }
        )
        
        return True, "2FA enabled successfully!"
    
    async def verify_2fa_login(
        self, 
        user_id: str, 
        user_type: str, 
        code: str
    ) -> Tuple[bool, str]:
        """
        Verify 2FA code during login.
        Also supports backup codes.
        
        Returns:
            Tuple of (success, message)
        """
        collection = self._get_collection(user_type)
        user = await collection.find_one({"id": user_id})
        
        if not user:
            return False, "User not found"
        
        if not user.get("two_factor_enabled"):
            return True, "2FA not enabled"
        
        secret = user.get("two_factor_secret")
        if not secret:
            return False, "2FA configuration error"
        
        # First try TOTP verification
        if verify_totp(secret, code):
            return True, "2FA verified"
        
        # Try backup code
        hashed_code = hash_backup_code(code)
        backup_codes = user.get("two_factor_backup_codes", [])
        
        if hashed_code in backup_codes:
            # Remove used backup code
            backup_codes.remove(hashed_code)
            await collection.update_one(
                {"id": user_id},
                {"$set": {"two_factor_backup_codes": backup_codes}}
            )
            return True, "Backup code used. Please generate new backup codes."
        
        return False, "Invalid 2FA code"
    
    async def disable_2fa(
        self, 
        user_id: str, 
        user_type: str,
        disabled_by: Optional[str] = None  # Admin ID if disabled by admin
    ) -> Tuple[bool, str]:
        """
        Disable 2FA for a user.
        
        Args:
            user_id: The user's ID
            user_type: Type of user
            disabled_by: Admin ID if being disabled by admin
        
        Returns:
            Tuple of (success, message)
        """
        collection = self._get_collection(user_type)
        user = await collection.find_one({"id": user_id})
        
        if not user:
            return False, "User not found"
        
        if not user.get("two_factor_enabled"):
            return False, "2FA is not enabled"
        
        # Log the disable action
        disable_record = {
            "disabled_at": datetime.now(timezone.utc).isoformat(),
            "disabled_by": disabled_by or user_id,
            "previous_enabled_at": user.get("two_factor_enabled_at")
        }
        
        await collection.update_one(
            {"id": user_id},
            {
                "$set": {
                    "two_factor_enabled": False,
                    "two_factor_disabled_record": disable_record
                },
                "$unset": {
                    "two_factor_secret": "",
                    "two_factor_backup_codes": "",
                    "two_factor_enabled_at": "",
                    "two_factor_setup": ""
                }
            }
        )
        
        return True, "2FA disabled successfully"
    
    async def regenerate_backup_codes(
        self, 
        user_id: str, 
        user_type: str
    ) -> Tuple[bool, list, str]:
        """
        Generate new backup codes (invalidates old ones).
        
        Returns:
            Tuple of (success, new_codes, message)
        """
        collection = self._get_collection(user_type)
        user = await collection.find_one({"id": user_id})
        
        if not user:
            return False, [], "User not found"
        
        if not user.get("two_factor_enabled"):
            return False, [], "2FA is not enabled"
        
        # Generate new codes
        new_codes = generate_backup_codes()
        hashed_codes = [hash_backup_code(code) for code in new_codes]
        
        await collection.update_one(
            {"id": user_id},
            {
                "$set": {
                    "two_factor_backup_codes": hashed_codes,
                    "two_factor_backup_regenerated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return True, new_codes, "New backup codes generated"
    
    async def get_2fa_status(self, user_id: str, user_type: str) -> dict:
        """
        Get 2FA status for a user.
        
        Returns:
            Dict with 2FA status information
        """
        collection = self._get_collection(user_type)
        user = await collection.find_one({"id": user_id})
        
        if not user:
            return {"enabled": False, "error": "User not found"}
        
        enabled = user.get("two_factor_enabled", False)
        backup_count = len(user.get("two_factor_backup_codes", []))
        
        return {
            "enabled": enabled,
            "enabled_at": user.get("two_factor_enabled_at") if enabled else None,
            "backup_codes_remaining": backup_count if enabled else 0,
            "setup_pending": "two_factor_setup" in user
        }
    
    async def admin_list_2fa_users(self, user_type: str = None) -> list:
        """
        Admin function: List all users with 2FA enabled.
        
        Returns:
            List of users with 2FA status
        """
        results = []
        
        types_to_check = [user_type] if user_type else ["clients", "merchants", "admins"]
        
        for utype in types_to_check:
            collection = self.db[utype]
            users = await collection.find(
                {"two_factor_enabled": True},
                {
                    "_id": 0,
                    "id": 1,
                    "phone": 1,
                    "email": 1,
                    "full_name": 1,
                    "business_name": 1,
                    "name": 1,
                    "two_factor_enabled_at": 1
                }
            ).to_list(1000)
            
            for user in users:
                user["user_type"] = utype.rstrip("s")  # clients -> client
                results.append(user)
        
        return results
    
    def _get_collection(self, user_type: str):
        """Get the appropriate MongoDB collection for user type."""
        collections = {
            "client": self.db.clients,
            "merchant": self.db.merchants,
            "admin": self.db.admins
        }
        return collections.get(user_type, self.db.clients)


# Singleton instance getter
_service_instance = None

def get_2fa_service(db: AsyncIOMotorDatabase) -> TwoFactorService:
    """Get or create the 2FA service instance."""
    global _service_instance
    if _service_instance is None:
        _service_instance = TwoFactorService(db)
    return _service_instance
