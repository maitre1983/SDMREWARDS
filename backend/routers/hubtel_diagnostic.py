"""
SDM REWARDS - Hubtel Diagnostic Routes
======================================
Test endpoints for diagnosing Hubtel SMP API issues
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel

from routers.auth import get_current_admin
from services.hubtel_diagnostic_service import get_diagnostic_service

router = APIRouter(prefix="/hubtel-diagnostic", tags=["Hubtel Diagnostics"])


class MoMoTestRequest(BaseModel):
    phone: str
    amount: float = 1.0  # Minimum test amount


class BankTestRequest(BaseModel):
    account_number: str
    bank_code: str  # e.g., "300335" for GCB
    account_name: str
    amount: float = 1.0  # Minimum test amount


@router.get("/config")
async def get_hubtel_configuration(current_admin: dict = Depends(get_current_admin)):
    """
    Get current Hubtel configuration summary (masked for security)
    Shows if credentials are set and proxy is configured
    """
    service = get_diagnostic_service()
    config = service.get_configuration_summary()
    
    return {
        "success": True,
        "configuration": config,
        "notes": [
            "Client ID and Secret are masked for security",
            "Proxy should be configured for static IP compliance",
            "All fields should show values (not 'NOT SET')"
        ]
    }


@router.get("/balance")
async def check_account_balance(current_admin: dict = Depends(get_current_admin)):
    """
    Check prepaid account balance
    This verifies if the account is accessible via API
    """
    service = get_diagnostic_service()
    result = await service.check_account_balance()
    
    return {
        "success": result.get("success", False),
        "data": result,
        "interpretation": {
            "if_success": "Account is accessible, check balance value",
            "if_401": "Credentials are invalid",
            "if_403": "IP not whitelisted",
            "if_404": "Prepaid Deposit ID is invalid"
        }
    }


@router.post("/test-momo")
async def test_momo_disbursement(
    request: MoMoTestRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Test MoMo disbursement with detailed diagnostics
    
    ⚠️ WARNING: This will attempt a REAL transaction!
    Use minimum amount (GHS 1) for testing.
    
    Provides detailed request/response for debugging.
    """
    if request.amount > 5:
        raise HTTPException(
            status_code=400, 
            detail="Test amount should be <= GHS 5 to avoid accidental large transfers"
        )
    
    service = get_diagnostic_service()
    result = await service.test_momo_disbursement(request.phone, request.amount)
    
    return {
        "success": result.get("response", {}).get("status_code") == 200,
        "diagnostics": result,
        "help": {
            "status_200": "Transaction initiated successfully",
            "status_400_limit": "Account has transaction limits configured by Hubtel",
            "status_401": "Invalid API credentials",
            "status_403": "IP not whitelisted or disbursement not enabled",
            "next_steps": "Share this response with Hubtel support for diagnosis"
        }
    }


@router.post("/test-bank")
async def test_bank_disbursement(
    request: BankTestRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Test Bank disbursement with detailed diagnostics
    
    ⚠️ WARNING: This will attempt a REAL transaction!
    Use minimum amount (GHS 1) for testing.
    
    Common bank codes:
    - GCB: 300335
    - Ecobank: 130100
    - Stanbic: 190100
    - Fidelity: 240100
    - Access: 280100
    """
    if request.amount > 5:
        raise HTTPException(
            status_code=400, 
            detail="Test amount should be <= GHS 5 to avoid accidental large transfers"
        )
    
    service = get_diagnostic_service()
    result = await service.test_bank_disbursement(
        request.account_number,
        request.bank_code,
        request.account_name,
        request.amount
    )
    
    return {
        "success": result.get("response", {}).get("status_code") == 200,
        "diagnostics": result,
        "help": {
            "status_200": "Transaction initiated successfully",
            "status_400_limit": "Account has transaction limits configured by Hubtel",
            "status_401": "Invalid API credentials",
            "status_403": "IP not whitelisted or disbursement not enabled",
            "next_steps": "Share this response with Hubtel support for diagnosis"
        }
    }


@router.get("/transactions")
async def get_recent_transactions(
    limit: int = 10,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Get recent transaction history from Hubtel
    Useful to verify if any transactions are going through
    """
    service = get_diagnostic_service()
    result = await service.get_transaction_history(limit)
    
    return {
        "success": result.get("success", False),
        "data": result
    }


@router.get("/full-diagnosis")
async def run_full_diagnosis(current_admin: dict = Depends(get_current_admin)):
    """
    Run a complete diagnostic check (config + balance only, no transactions)
    
    This is safe to run - it doesn't initiate any transactions.
    """
    service = get_diagnostic_service()
    
    # Get config
    config = service.get_configuration_summary()
    
    # Check balance
    balance = await service.check_account_balance()
    
    # Get recent transactions
    transactions = await service.get_transaction_history(5)
    
    # Compile diagnosis
    issues = []
    recommendations = []
    
    if not config["is_configured"]:
        issues.append("Missing Hubtel credentials")
        recommendations.append("Set HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, HUBTEL_PREPAID_DEPOSIT_ID in .env")
    
    if not config["proxy_configured"]:
        issues.append("Proxy not configured - using dynamic IP")
        recommendations.append("Set FIXIE_URL for static IP compliance")
    
    if not balance.get("success"):
        status = balance.get("status_code")
        if status == 401:
            issues.append("Invalid credentials")
            recommendations.append("Verify HUBTEL_CLIENT_ID and HUBTEL_CLIENT_SECRET")
        elif status == 403:
            issues.append("IP not whitelisted")
            recommendations.append("Contact Hubtel to whitelist 52.5.155.132")
        elif status == 404:
            issues.append("Invalid Prepaid Deposit ID")
            recommendations.append("Verify HUBTEL_PREPAID_DEPOSIT_ID")
    
    return {
        "success": len(issues) == 0,
        "configuration": config,
        "balance_check": balance,
        "recent_transactions": transactions,
        "diagnosis": {
            "issues_found": issues,
            "recommendations": recommendations,
            "overall_status": "OK" if len(issues) == 0 else "ISSUES_DETECTED"
        },
        "next_steps": [
            "If balance check fails, verify credentials first",
            "If balance shows but transactions fail, run /test-momo or /test-bank",
            "Share diagnostic results with Hubtel support"
        ]
    }
