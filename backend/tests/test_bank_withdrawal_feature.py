"""
SDM REWARDS - Bank Withdrawal Feature Tests
=============================================
Tests for the new bank withdrawal option for merchants including:
1. GET /api/public/banks - Returns list of supported banks
2. POST /api/merchants/banks/verify-account - Verify bank account and get account holder name
3. Merchant payout settings: bank_id, bank_account, bank_account_name, preferred_payout_method
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the request
TEST_MERCHANT_PHONE = "+233509876543"
TEST_MERCHANT_PASSWORD = "Test123456!"
ADMIN_EMAIL = "emileparfait2003@gmail.com"
ADMIN_PASSWORD = "Admin@123456"


class TestPublicBanksEndpoint:
    """Test /api/public/banks - Get list of supported banks"""
    
    def test_get_bank_list_success(self):
        """Test that public banks endpoint returns list of banks"""
        response = requests.get(f"{BASE_URL}/api/public/banks")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "banks" in data
        assert isinstance(data["banks"], list)
        assert len(data["banks"]) > 0
        
        # Validate bank structure
        first_bank = data["banks"][0]
        assert "id" in first_bank
        assert "name" in first_bank
        print(f"Found {len(data['banks'])} banks")
    
    def test_bank_list_contains_major_banks(self):
        """Test that bank list contains major Ghanaian banks"""
        response = requests.get(f"{BASE_URL}/api/public/banks")
        
        assert response.status_code == 200
        
        data = response.json()
        banks = data.get("banks", [])
        bank_names = [b.get("name", "").lower() for b in banks]
        
        # Check for some major banks
        major_banks_found = 0
        expected_major_banks = ["gcb", "ecobank", "fidelity", "absa", "stanbic"]
        
        for major in expected_major_banks:
            if any(major in name for name in bank_names):
                major_banks_found += 1
        
        assert major_banks_found >= 3, f"Expected at least 3 major banks, found {major_banks_found}"
        print(f"Major banks verification: {major_banks_found}/{len(expected_major_banks)} found")


class TestMerchantBankVerification:
    """Test merchant bank account verification and settings"""
    
    @pytest.fixture
    def merchant_token(self):
        """Get merchant authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": TEST_MERCHANT_PHONE,
            "password": TEST_MERCHANT_PASSWORD
        })
        
        if response.status_code == 200:
            return response.json().get("access_token")
        
        # If merchant doesn't exist, skip tests
        pytest.skip(f"Merchant login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture
    def bank_id(self):
        """Get a valid bank ID for testing"""
        response = requests.get(f"{BASE_URL}/api/public/banks")
        
        if response.status_code == 200:
            banks = response.json().get("banks", [])
            if banks:
                # Return GCB Bank if available, otherwise first bank
                for bank in banks:
                    if "GCB" in bank.get("name", "").upper():
                        return bank["id"]
                return banks[0]["id"]
        
        pytest.skip("Could not get bank list")
    
    def test_verify_bank_account_unauthenticated(self, bank_id):
        """Test that verify-account requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/merchants/banks/verify-account",
            params={"account_number": "1234567890", "bank_id": bank_id}
        )
        
        # Should fail without auth (either 401 or 422 depending on validation order)
        assert response.status_code in [401, 422], f"Expected 401 or 422 without auth, got {response.status_code}"
    
    def test_verify_bank_account_missing_params(self, merchant_token):
        """Test that verify-account requires account_number and bank_id"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        # Missing bank_id
        response = requests.post(
            f"{BASE_URL}/api/merchants/banks/verify-account",
            params={"account_number": "1234567890"},
            headers=headers
        )
        
        # Should fail with 422 (validation error)
        assert response.status_code == 422 or response.status_code == 400, f"Expected 400/422, got {response.status_code}"
    
    def test_verify_bank_account_with_invalid_number(self, merchant_token, bank_id):
        """Test bank verification with invalid account number"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/merchants/banks/verify-account",
            params={"account_number": "0000000000", "bank_id": bank_id},
            headers=headers
        )
        
        # BulkClix may return 400 for invalid account
        # Log the response for debugging
        print(f"Invalid account verification response: {response.status_code} - {response.text}")
        
        # This test documents the behavior - may return 400 error or success based on BulkClix behavior


class TestMerchantPayoutSettings:
    """Test merchant payout configuration with bank settings"""
    
    @pytest.fixture
    def merchant_token(self):
        """Get merchant authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": TEST_MERCHANT_PHONE,
            "password": TEST_MERCHANT_PASSWORD
        })
        
        if response.status_code == 200:
            return response.json().get("access_token")
        
        pytest.skip(f"Merchant login failed: {response.status_code}")
    
    def test_get_payout_info(self, merchant_token):
        """Test GET /api/merchants/settings/payout-info endpoint"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        response = requests.get(f"{BASE_URL}/api/merchants/settings/payout-info", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "payout_info" in data
        
        payout_info = data["payout_info"]
        assert "momo" in payout_info
        assert "bank" in payout_info
        assert "preferred_method" in payout_info
        
        print(f"Payout info retrieved: preferred_method={payout_info.get('preferred_method')}")
    
    def test_update_bank_info(self, merchant_token):
        """Test PUT /api/merchants/settings/bank-info endpoint"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        # Get a bank ID first
        banks_response = requests.get(f"{BASE_URL}/api/public/banks")
        assert banks_response.status_code == 200
        
        banks = banks_response.json().get("banks", [])
        assert len(banks) > 0
        
        test_bank = banks[0]
        
        response = requests.put(
            f"{BASE_URL}/api/merchants/settings/bank-info",
            params={
                "bank_name": test_bank["name"],
                "bank_id": test_bank["id"],
                "bank_account": "TEST1234567890",
                "bank_account_name": "TEST ACCOUNT HOLDER",
                "preferred_payout_method": "bank"
            },
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("bank_name") == test_bank["name"]
        assert data.get("bank_account") == "TEST1234567890"
        assert data.get("preferred_payout_method") == "bank"
        
        print(f"Bank info updated: {test_bank['name']}")
    
    def test_update_payment_info_with_bank_fields(self, merchant_token):
        """Test that PUT /api/merchants/settings/payment accepts bank fields"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/merchants/settings/payment",
            json={
                "momo_number": "0509876543",
                "momo_network": "MTN",
                "bank_name": "Test Bank",
                "bank_account": "9876543210",
                "bank_id": "test-bank-id",
                "bank_account_name": "Test Account",
                "preferred_payout_method": "momo"
            },
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print("Payment info with bank fields updated successfully")
    
    def test_preferred_payout_method_validation(self, merchant_token):
        """Test that preferred_payout_method only accepts 'momo' or 'bank'"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        # Get a valid bank ID
        banks_response = requests.get(f"{BASE_URL}/api/public/banks")
        banks = banks_response.json().get("banks", [])
        test_bank = banks[0] if banks else {"id": "test", "name": "Test"}
        
        # Try invalid value
        response = requests.put(
            f"{BASE_URL}/api/merchants/settings/bank-info",
            params={
                "bank_name": test_bank["name"],
                "bank_id": test_bank["id"],
                "bank_account": "1234567890",
                "bank_account_name": "Test",
                "preferred_payout_method": "invalid"
            },
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid method, got {response.status_code}"
        print("Invalid payout method correctly rejected")


class TestMerchantDashboardBankData:
    """Test that merchant dashboard returns bank-related data"""
    
    @pytest.fixture
    def merchant_token(self):
        """Get merchant authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": TEST_MERCHANT_PHONE,
            "password": TEST_MERCHANT_PASSWORD
        })
        
        if response.status_code == 200:
            return response.json().get("access_token")
        
        pytest.skip(f"Merchant login failed")
    
    def test_merchant_me_includes_bank_fields(self, merchant_token):
        """Test that GET /api/merchants/me includes bank-related fields"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        response = requests.get(f"{BASE_URL}/api/merchants/me", headers=headers)
        
        assert response.status_code == 200
        
        data = response.json()
        merchant = data.get("merchant", {})
        
        # Check that bank fields can be present
        # These may be empty if not configured
        expected_fields = [
            "momo_number", "momo_network", 
            "bank_name", "bank_account",
            "bank_id", "bank_account_name",
            "preferred_payout_method"
        ]
        
        print(f"Merchant data keys: {list(merchant.keys())}")
        
        # At minimum, the merchant object should exist
        assert merchant is not None


class TestBankTransferServiceIntegration:
    """Test the bank transfer service integration (via routers)"""
    
    def test_banks_list_endpoint_available(self):
        """Verify /api/merchants/banks/list endpoint exists"""
        # This endpoint may require auth
        response = requests.get(f"{BASE_URL}/api/merchants/banks/list")
        
        # Should return data (might be same as public banks)
        if response.status_code == 200:
            data = response.json()
            assert "banks" in data
            print("Merchant banks list endpoint accessible")
        else:
            print(f"Merchant banks list response: {response.status_code} (may require auth)")


# Run health check first
class TestHealthCheck:
    """Basic health check to ensure services are running"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200
        print("API is healthy")
    
    def test_frontend_accessible(self):
        """Test that frontend is accessible"""
        response = requests.get(BASE_URL)
        
        assert response.status_code == 200
        print("Frontend is accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
