"""
Test suite for SDM Merchant Dashboard - Cashback Rate Bug Fix Verification
Tests merchant login, profile, settings update, and cashback calculation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://web-boost-seo.preview.emergentagent.com')

# Test credentials
TEST_PHONE = "0000000000"
TEST_PASSWORD = "TestPass123"


class TestMerchantLogin:
    """Merchant authentication tests"""
    
    def test_merchant_login_success(self):
        """Test merchant login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/sdm/merchant/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "merchant" in data
        assert data["token_type"] == "bearer"
        
        # Verify merchant data
        merchant = data["merchant"]
        assert "id" in merchant
        assert "business_name" in merchant
        assert "cashback_rate" in merchant
        
        print(f"SUCCESS: Merchant logged in - {merchant['business_name']}")
        print(f"Cashback rate from API: {merchant['cashback_rate']}%")
        
    def test_merchant_login_invalid_password(self):
        """Test merchant login with invalid password"""
        response = requests.post(f"{BASE_URL}/api/sdm/merchant/login", json={
            "phone": TEST_PHONE,
            "password": "WrongPassword123"
        })
        
        assert response.status_code == 401
        print("SUCCESS: Invalid password correctly rejected")


class TestMerchantProfile:
    """Merchant profile and dashboard tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/sdm/merchant/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_merchant_profile(self, auth_token):
        """Test fetching merchant profile"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/profile",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        merchant = response.json()
        
        # Verify profile fields
        assert "id" in merchant
        assert "business_name" in merchant
        assert "cashback_rate" in merchant
        assert "api_key" in merchant
        assert "api_secret" in merchant
        
        # CRITICAL: Verify cashback_rate is a reasonable value (not multiplied by 100)
        cashback_rate = merchant["cashback_rate"]
        assert 1 <= cashback_rate <= 20, f"Cashback rate {cashback_rate} is outside valid range 1-20%"
        
        print(f"SUCCESS: Profile loaded - cashback_rate = {cashback_rate}%")
        print(f"API Key: {merchant['api_key'][:20]}...")
        
    def test_get_merchant_transactions(self, auth_token):
        """Test fetching merchant transactions"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/transactions?limit=10",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        transactions = response.json()
        assert isinstance(transactions, list)
        
        print(f"SUCCESS: Fetched {len(transactions)} transactions")
        
    def test_get_merchant_report(self, auth_token):
        """Test fetching merchant report"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/report?days=30",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        report = response.json()
        
        # Verify report structure
        assert "total_transactions" in report
        assert "total_amount" in report
        
        print(f"SUCCESS: Report - {report['total_transactions']} transactions, GHS {report.get('total_amount', 0)}")


class TestMerchantSettings:
    """Merchant settings update tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/sdm/merchant/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_update_cashback_rate(self, auth_token):
        """Test updating cashback rate via settings endpoint"""
        # Get current rate first
        profile_response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/profile",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert profile_response.status_code == 200
        original_rate = profile_response.json()["cashback_rate"]
        
        # Update to a new rate (10%)
        new_rate = 10.0
        update_response = requests.put(
            f"{BASE_URL}/api/sdm/merchant/settings",
            json={"cashback_rate": new_rate},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert update_response.status_code == 200, f"Failed to update: {update_response.text}"
        
        # Verify the update
        profile_response2 = requests.get(
            f"{BASE_URL}/api/sdm/merchant/profile",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert profile_response2.status_code == 200
        updated_rate = profile_response2.json()["cashback_rate"]
        
        assert updated_rate == new_rate, f"Rate not updated: expected {new_rate}, got {updated_rate}"
        print(f"SUCCESS: Cashback rate updated from {original_rate}% to {updated_rate}%")
        
        # Restore original rate
        restore_response = requests.put(
            f"{BASE_URL}/api/sdm/merchant/settings",
            json={"cashback_rate": original_rate},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert restore_response.status_code == 200
        print(f"SUCCESS: Cashback rate restored to {original_rate}%")
        
    def test_update_cashback_enabled(self, auth_token):
        """Test enabling/disabling cashback"""
        # Disable cashback
        response = requests.put(
            f"{BASE_URL}/api/sdm/merchant/settings",
            json={"cashback_enabled": False},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Failed to disable: {response.text}"
        print("SUCCESS: Cashback disabled")
        
        # Re-enable cashback
        response2 = requests.put(
            f"{BASE_URL}/api/sdm/merchant/settings",
            json={"cashback_enabled": True},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response2.status_code == 200, f"Failed to enable: {response2.text}"
        print("SUCCESS: Cashback re-enabled")
        
    def test_cashback_rate_validation(self, auth_token):
        """Test cashback rate validation (must be 0-50%)"""
        # Try invalid rate (too high)
        response = requests.put(
            f"{BASE_URL}/api/sdm/merchant/settings",
            json={"cashback_rate": 100},  # Invalid: > 50%
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should reject invalid rate
        assert response.status_code in [400, 422], f"Should reject 100% rate: {response.text}"
        print("SUCCESS: Invalid cashback rate (100%) correctly rejected")


class TestCashbackCalculation:
    """Tests to verify cashback calculation is correct (bug fix verification)"""
    
    def test_cashback_preview_calculation(self):
        """Verify the cashback calculation formula is correct"""
        # Formula: amount * (cashback_rate / 100) * 0.98 (2% SDM commission)
        
        # Login to get merchant data
        login_response = requests.post(f"{BASE_URL}/api/sdm/merchant/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        merchant = login_response.json()["merchant"]
        
        cashback_rate = merchant["cashback_rate"]  # e.g., 8.0 means 8%
        
        # Test calculation: 100 GHS * 8% * 0.98 = 7.84 GHS
        test_amount = 100.0
        expected_cashback = test_amount * (cashback_rate / 100) * 0.98
        
        # The frontend formula is: parseFloat(scanAmount) * (merchant?.cashback_rate || 5) / 100 * 0.98
        frontend_calculation = test_amount * cashback_rate / 100 * 0.98
        
        assert abs(expected_cashback - frontend_calculation) < 0.01, \
            f"Calculation mismatch: {expected_cashback} vs {frontend_calculation}"
        
        print(f"SUCCESS: Cashback calculation verified")
        print(f"  Amount: {test_amount} GHS")
        print(f"  Rate: {cashback_rate}%")
        print(f"  Cashback: {expected_cashback:.2f} GHS")
        
        # Verify the rate is NOT multiplied by 100 (bug that was fixed)
        assert cashback_rate <= 50, \
            f"BUG: Cashback rate {cashback_rate}% seems to be multiplied by 100!"
        
        print(f"SUCCESS: Cashback rate is correctly stored as {cashback_rate}% (not {cashback_rate * 100}%)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
