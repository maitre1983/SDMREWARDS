"""
SDM REWARDS - Language Detection Service
=========================================
Auto-detect and manage user language preferences
"""

import os
import logging
from typing import Optional, Dict, List
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Supported languages
SUPPORTED_LANGUAGES = {
    "en": {
        "name": "English",
        "native_name": "English",
        "direction": "ltr"
    },
    "fr": {
        "name": "French",
        "native_name": "Français",
        "direction": "ltr"
    }
}

DEFAULT_LANGUAGE = "en"


class LanguageService:
    """Service for language detection and management"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    def detect_from_accept_language(self, accept_language: str) -> str:
        """
        Detect language from HTTP Accept-Language header
        Example: "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
        """
        if not accept_language:
            return DEFAULT_LANGUAGE
        
        # Parse Accept-Language header
        languages = []
        for lang_part in accept_language.split(','):
            parts = lang_part.strip().split(';')
            lang_code = parts[0].strip()
            
            # Get quality factor (default 1.0)
            quality = 1.0
            if len(parts) > 1:
                try:
                    quality = float(parts[1].split('=')[1])
                except:
                    pass
            
            languages.append((lang_code, quality))
        
        # Sort by quality factor
        languages.sort(key=lambda x: x[1], reverse=True)
        
        # Find first supported language
        for lang_code, _ in languages:
            # Check exact match first
            base_lang = lang_code.split('-')[0].lower()
            if base_lang in SUPPORTED_LANGUAGES:
                return base_lang
        
        return DEFAULT_LANGUAGE
    
    def detect_from_browser_languages(self, browser_languages: List[str]) -> str:
        """
        Detect language from browser's navigator.languages array
        Example: ["fr-FR", "fr", "en-US", "en"]
        """
        if not browser_languages:
            return DEFAULT_LANGUAGE
        
        for lang_code in browser_languages:
            base_lang = lang_code.split('-')[0].lower()
            if base_lang in SUPPORTED_LANGUAGES:
                return base_lang
        
        return DEFAULT_LANGUAGE
    
    async def get_client_language(self, client_id: str) -> str:
        """Get stored language preference for a client"""
        client = await self.db.clients.find_one(
            {"id": client_id},
            {"language": 1}
        )
        
        if client and client.get("language"):
            return client["language"]
        
        return DEFAULT_LANGUAGE
    
    async def set_client_language(self, client_id: str, language: str) -> Dict:
        """Set language preference for a client"""
        if language not in SUPPORTED_LANGUAGES:
            return {"success": False, "error": f"Unsupported language: {language}"}
        
        await self.db.clients.update_one(
            {"id": client_id},
            {"$set": {"language": language}}
        )
        
        return {
            "success": True,
            "language": language,
            "language_name": SUPPORTED_LANGUAGES[language]["name"]
        }
    
    async def auto_detect_and_set(
        self,
        client_id: str,
        accept_language: str = None,
        browser_languages: List[str] = None
    ) -> Dict:
        """
        Auto-detect language and set if client doesn't have preference
        Returns the detected/existing language
        """
        # Check if client already has a language set
        existing = await self.get_client_language(client_id)
        
        # If client has set a preference, respect it
        client = await self.db.clients.find_one(
            {"id": client_id},
            {"language": 1, "language_auto_detected": 1}
        )
        
        # If manually set (not auto-detected), don't override
        if client and client.get("language") and not client.get("language_auto_detected"):
            return {
                "language": client["language"],
                "source": "user_preference",
                "auto_detected": False
            }
        
        # Auto-detect language
        detected = DEFAULT_LANGUAGE
        source = "default"
        
        if browser_languages:
            detected = self.detect_from_browser_languages(browser_languages)
            source = "browser_languages"
        elif accept_language:
            detected = self.detect_from_accept_language(accept_language)
            source = "accept_language_header"
        
        # Save auto-detected language
        await self.db.clients.update_one(
            {"id": client_id},
            {
                "$set": {
                    "language": detected,
                    "language_auto_detected": True
                }
            }
        )
        
        return {
            "language": detected,
            "source": source,
            "auto_detected": True
        }
    
    def get_supported_languages(self) -> Dict:
        """Get list of supported languages"""
        return {
            "languages": [
                {
                    "code": code,
                    **info
                }
                for code, info in SUPPORTED_LANGUAGES.items()
            ],
            "default": DEFAULT_LANGUAGE
        }
    
    def get_ui_translations(self, language: str) -> Dict:
        """
        Get common UI translations for the specified language
        Used for dynamic translation on the frontend
        """
        translations = {
            "en": {
                "common": {
                    "home": "Home",
                    "history": "History",
                    "profile": "Profile",
                    "settings": "Settings",
                    "logout": "Logout",
                    "loading": "Loading...",
                    "error": "Error",
                    "success": "Success",
                    "save": "Save",
                    "cancel": "Cancel",
                    "confirm": "Confirm",
                    "delete": "Delete",
                    "edit": "Edit",
                    "view": "View",
                    "search": "Search",
                    "filter": "Filter",
                    "sort": "Sort",
                    "refresh": "Refresh",
                    "back": "Back",
                    "next": "Next",
                    "previous": "Previous",
                    "submit": "Submit",
                    "close": "Close"
                },
                "dashboard": {
                    "cashback_balance": "Cashback Balance",
                    "total_earned": "Total Earned",
                    "total_spent": "Total Spent",
                    "recent_activity": "Recent Activity",
                    "services": "Services",
                    "withdraw": "Withdraw",
                    "referrals": "Referrals",
                    "qr_code": "QR Code"
                },
                "notifications": {
                    "title": "Notification Settings",
                    "push": "Push Notifications",
                    "sms": "SMS Messages",
                    "email": "Email",
                    "cashback_alerts": "Cashback Alerts",
                    "security_alerts": "Security Alerts"
                },
                "ai": {
                    "assistant": "AI Assistant",
                    "analyzing": "Analyzing your data...",
                    "recommendations": "Recommendations",
                    "spending_analysis": "Spending Analysis",
                    "security": "Security",
                    "tips": "Tips",
                    "chat": "Chat"
                }
            },
            "fr": {
                "common": {
                    "home": "Accueil",
                    "history": "Historique",
                    "profile": "Profil",
                    "settings": "Paramètres",
                    "logout": "Déconnexion",
                    "loading": "Chargement...",
                    "error": "Erreur",
                    "success": "Succès",
                    "save": "Enregistrer",
                    "cancel": "Annuler",
                    "confirm": "Confirmer",
                    "delete": "Supprimer",
                    "edit": "Modifier",
                    "view": "Voir",
                    "search": "Rechercher",
                    "filter": "Filtrer",
                    "sort": "Trier",
                    "refresh": "Actualiser",
                    "back": "Retour",
                    "next": "Suivant",
                    "previous": "Précédent",
                    "submit": "Soumettre",
                    "close": "Fermer"
                },
                "dashboard": {
                    "cashback_balance": "Solde Cashback",
                    "total_earned": "Total Gagné",
                    "total_spent": "Total Dépensé",
                    "recent_activity": "Activité Récente",
                    "services": "Services",
                    "withdraw": "Retirer",
                    "referrals": "Parrainages",
                    "qr_code": "Code QR"
                },
                "notifications": {
                    "title": "Paramètres de Notification",
                    "push": "Notifications Push",
                    "sms": "Messages SMS",
                    "email": "Email",
                    "cashback_alerts": "Alertes Cashback",
                    "security_alerts": "Alertes de Sécurité"
                },
                "ai": {
                    "assistant": "Assistant IA",
                    "analyzing": "Analyse de vos données...",
                    "recommendations": "Recommandations",
                    "spending_analysis": "Analyse des Dépenses",
                    "security": "Sécurité",
                    "tips": "Conseils",
                    "chat": "Discussion"
                }
            }
        }
        
        return translations.get(language, translations["en"])
