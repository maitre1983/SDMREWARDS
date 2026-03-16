"""
SDM REWARDS - Merchant Public Routes
====================================
Public endpoints (no auth required)
"""

from fastapi import APIRouter, HTTPException
import logging

from .shared import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/partners")
async def get_partner_merchants():
    """
    Public endpoint to list active partner merchants
    Used by clients to browse merchants and their cashback rates
    """
    db = get_db()
    merchants = await db.merchants.find(
        {"status": "active"},
        {
            "_id": 0,
            "id": 1,
            "business_name": 1,
            "business_type": 1,
            "business_address": 1,
            "business_description": 1,
            "city": 1,
            "cashback_rate": 1,
            "payment_qr_code": 1,
            "logo_url": 1,
            "phone": 1,
            "google_maps_url": 1
        }
    ).to_list(500)
    
    return {
        "merchants": merchants,
        "total": len(merchants)
    }


@router.get("/by-qr/{qr_code}")
async def get_merchant_by_qr(qr_code: str):
    """
    Get merchant details by QR code
    Used when client scans merchant QR
    Includes cash payment availability status
    """
    db = get_db()
    
    # Try payment QR code first
    merchant = await db.merchants.find_one(
        {"payment_qr_code": qr_code},
        {
            "_id": 0,
            "id": 1,
            "business_name": 1,
            "business_type": 1,
            "business_address": 1,
            "cashback_rate": 1,
            "payment_qr_code": 1,
            "status": 1,
            "debit_account": 1
        }
    )
    
    # Try recruitment QR code if not found
    if not merchant:
        merchant = await db.merchants.find_one(
            {"recruitment_qr_code": qr_code},
            {
                "_id": 0,
                "id": 1,
                "business_name": 1,
                "business_type": 1,
                "business_address": 1,
                "cashback_rate": 1,
                "payment_qr_code": 1,
                "recruitment_qr_code": 1,
                "status": 1,
                "debit_account": 1
            }
        )
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    if merchant.get("status") != "active":
        raise HTTPException(status_code=400, detail="Merchant is not active")
    
    # Check cash payment availability
    debit_account = merchant.get("debit_account", {})
    debit_limit = debit_account.get("limit", 0)
    current_balance = debit_account.get("balance", 0)
    is_blocked = debit_account.get("is_blocked", False)
    
    cash_available = True
    cash_unavailable_reason = None
    
    if debit_limit <= 0:
        cash_available = False
        cash_unavailable_reason = "Cash payments not configured for this merchant"
    elif is_blocked:
        cash_available = False
        cash_unavailable_reason = "Cash payments temporarily unavailable"
    elif abs(current_balance) >= debit_limit:
        cash_available = False
        cash_unavailable_reason = "Merchant's cash payment limit reached"
    
    # Calculate remaining cash capacity
    remaining_cash_capacity = max(0, debit_limit - abs(current_balance)) if debit_limit > 0 else 0
    
    # Remove debit_account from response
    merchant.pop("debit_account", None)
    
    # Add cash payment info
    merchant["cash_payment"] = {
        "available": cash_available,
        "reason": cash_unavailable_reason,
        "remaining_capacity": round(remaining_cash_capacity, 2)
    }
    
    return {"merchant": merchant}
