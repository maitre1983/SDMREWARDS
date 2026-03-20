"""
SDM REWARDS - Account Verification Router
==========================================
Endpoints for verifying MoMo and Bank accounts via Hubtel.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
import logging
from motor.motor_asyncio import AsyncIOMotorClient
import os

from routers.auth import get_current_client, get_current_merchant

logger = logging.getLogger(__name__)
router = APIRouter()

# Get database connection
def get_db():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")
    client = AsyncIOMotorClient(mongo_url)
    return client[db_name]
router = APIRouter()


class MoMoVerifyRequest(BaseModel):
    phone: str
    network: str = "mtn-gh"


class BankVerifyRequest(BaseModel):
    bank_code: str
    account_number: str


# List of Ghana banks for dropdown
GHANA_BANKS = [
    {"code": "300335", "name": "GCB Bank", "short": "GCB"},
    {"code": "300330", "name": "Ecobank Ghana", "short": "ECOBANK"},
    {"code": "300331", "name": "Stanbic Bank", "short": "STANBIC"},
    {"code": "300329", "name": "Absa Bank Ghana", "short": "ABSA"},
    {"code": "300332", "name": "Zenith Bank Ghana", "short": "ZENITH"},
    {"code": "300323", "name": "Fidelity Bank Ghana", "short": "FIDELITY"},
    {"code": "300333", "name": "United Bank for Africa", "short": "UBA"},
    {"code": "300328", "name": "Access Bank Ghana", "short": "ACCESS"},
    {"code": "300327", "name": "CAL Bank", "short": "CAL"},
    {"code": "300324", "name": "Prudential Bank", "short": "PRUDENTIAL"},
    {"code": "300322", "name": "Agricultural Development Bank", "short": "ADB"},
    {"code": "300334", "name": "Guaranty Trust Bank", "short": "GTB"},
    {"code": "300325", "name": "First Bank Nigeria", "short": "FBN"},
    {"code": "300326", "name": "Republic Bank", "short": "REPUBLIC"},
    {"code": "300321", "name": "Societe Generale Ghana", "short": "SOCIETE"},
    {"code": "300320", "name": "National Investment Bank", "short": "NIB"},
    {"code": "300319", "name": "Bank of Africa", "short": "BOA"},
    {"code": "300336", "name": "First National Bank", "short": "FNB"},
    {"code": "300337", "name": "Standard Chartered Bank", "short": "STANDARD"},
    {"code": "300338", "name": "Consolidated Bank Ghana", "short": "CBG"},
    {"code": "300339", "name": "OmniBSIC Bank", "short": "OMNIBSIC"},
]


@router.get("/banks")
async def get_banks_list():
    """
    Get list of Ghana banks for dropdown.
    No authentication required.
    """
    return {
        "banks": GHANA_BANKS,
        "total": len(GHANA_BANKS)
    }


@router.post("/momo/verify")
async def verify_momo_number(
    request: MoMoVerifyRequest,
    current_user: dict = Depends(get_current_client)
):
    """
    Verify MoMo number and get account holder name.
    Used in client withdrawal form.
    """
    from services.hubtel_momo_service import get_hubtel_momo_service
    db = get_db()
    hubtel = get_hubtel_momo_service(db)
    result = await hubtel.verify_momo_number(
        phone=request.phone,
        network=request.network
    )
    
    if not result.get("success"):
        # Don't fail - just return the error message
        return {
            "verified": False,
            "error": result.get("error", "Verification failed"),
            "phone": request.phone
        }
    
    return {
        "verified": True,
        "account_name": result.get("account_name"),
        "phone": result.get("phone"),
        "network": result.get("network"),
        "is_registered": result.get("is_registered", True)
    }


@router.post("/momo/verify/merchant")
async def verify_merchant_momo_number(
    request: MoMoVerifyRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """
    Verify MoMo number and get account holder name.
    Used in merchant payment settings.
    """
    from services.hubtel_momo_service import get_hubtel_momo_service
    db = get_db()
    hubtel = get_hubtel_momo_service(db)
    result = await hubtel.verify_momo_number(
        phone=request.phone,
        network=request.network
    )
    
    if not result.get("success"):
        return {
            "verified": False,
            "error": result.get("error", "Verification failed"),
            "phone": request.phone
        }
    
    return {
        "verified": True,
        "account_name": result.get("account_name"),
        "phone": result.get("phone"),
        "network": result.get("network"),
        "is_registered": result.get("is_registered", True)
    }


@router.post("/bank/verify")
async def verify_bank_account(
    request: BankVerifyRequest,
    current_merchant: dict = Depends(get_current_merchant)
):
    """
    Verify bank account and get account holder name.
    Used in merchant payment settings.
    """
    from services.hubtel_momo_service import get_hubtel_momo_service
    db = get_db()
    hubtel = get_hubtel_momo_service(db)
    result = await hubtel.verify_bank_account(
        bank_code=request.bank_code,
        account_number=request.account_number
    )
    
    if not result.get("success"):
        return {
            "verified": False,
            "error": result.get("error", "Verification failed"),
            "account_number": request.account_number
        }
    
    return {
        "verified": True,
        "account_name": result.get("account_name"),
        "account_number": result.get("account_number"),
        "bank_code": result.get("bank_code")
    }
