"""
SDM REWARDS - Test Mode Payment Routes
======================================
Manual confirmation endpoints for test mode
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import logging

from .shared import get_db, logger
from .processing import complete_payment

router = APIRouter()


@router.post("/test/confirm/{payment_id}")
async def test_confirm_payment(payment_id: str):
    """[TEST MODE] Manually confirm a pending payment"""
    db = get_db()
    payment = await db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if not payment.get("test_mode"):
        raise HTTPException(status_code=400, detail="This endpoint is only for test mode payments")
    
    if payment["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Payment is already {payment['status']}")
    
    # Complete the payment
    await complete_payment(payment_id)
    
    # Reload payment
    payment = await db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
    
    return {
        "success": True,
        "message": "Payment confirmed successfully",
        "payment_id": payment_id,
        "status": "success",
        "type": payment["type"]
    }


@router.post("/test/fail/{payment_id}")
async def test_fail_payment(payment_id: str):
    """[TEST MODE] Manually fail a pending payment"""
    db = get_db()
    payment = await db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if not payment.get("test_mode"):
        raise HTTPException(status_code=400, detail="This endpoint is only for test mode payments")
    
    if payment["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Payment is already {payment['status']}")
    
    await db.momo_payments.update_one(
        {"id": payment_id},
        {
            "$set": {
                "status": "failed",
                "provider_message": "Simulated failure (test mode)",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Payment marked as failed",
        "payment_id": payment_id,
        "status": "failed"
    }
