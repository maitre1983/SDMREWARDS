"""
Withdrawal Limits API Tests
============================
Tests for:
- GET /api/admin/withdrawal-limits - Get global withdrawal limits
- PUT /api/admin/withdrawal-limits - Update global withdrawal limits
- Authentication requirements
- Data validation

Test credentials: test_admin@sdmrewards.com / TestAdmin123!
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test admin credentials
TEST_ADMIN_EMAIL = "test_admin@sdmrewards.com"
TEST_ADMIN_PASSWORD = "TestAdmin123!"


class TestWithdrawalLimitsAPI:
    """Withdrawal limits admin API tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        else:
            pytest.skip(f"Failed to login admin: {response.status_code} - {response.text}")

    def test_get_withdrawal_limits_requires_auth(self):
        """Test GET /api/admin/withdrawal-limits returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/withdrawal-limits")
        # Should return 401 or 422 for missing auth header
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}: {response.text}"
        print("✓ GET withdrawal-limits correctly requires authentication")

    def test_get_withdrawal_limits_success(self):
        """Test GET /api/admin/withdrawal-limits returns limits with auth"""
        response = requests.get(f"{BASE_URL}/api/admin/withdrawal-limits", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "limits" in data, "Expected 'limits' in response"
        
        limits = data["limits"]
        # Verify momo limits structure
        assert "momo" in limits, "Expected 'momo' in limits"
        assert "max_per_tx" in limits["momo"], "Expected 'max_per_tx' in momo limits"
        assert "daily" in limits["momo"], "Expected 'daily' in momo limits"
        assert "weekly" in limits["momo"], "Expected 'weekly' in momo limits"
        assert "monthly" in limits["momo"], "Expected 'monthly' in momo limits"
        
        # Verify bank limits structure
        assert "bank" in limits, "Expected 'bank' in limits"
        assert "max_per_tx" in limits["bank"], "Expected 'max_per_tx' in bank limits"
        assert "daily" in limits["bank"], "Expected 'daily' in bank limits"
        assert "weekly" in limits["bank"], "Expected 'weekly' in bank limits"
        assert "monthly" in limits["bank"], "Expected 'monthly' in bank limits"
        
        print(f"✓ GET withdrawal-limits returns valid structure: momo={limits['momo']}, bank={limits['bank']}")

    def test_put_withdrawal_limits_requires_auth(self):
        """Test PUT /api/admin/withdrawal-limits returns 401 without auth"""
        response = requests.put(
            f"{BASE_URL}/api/admin/withdrawal-limits",
            json={"momo_max_per_tx": 500}
        )
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}: {response.text}"
        print("✓ PUT withdrawal-limits correctly requires authentication")

    def test_put_withdrawal_limits_success(self):
        """Test PUT /api/admin/withdrawal-limits updates limits successfully"""
        # New test limits
        test_limits = {
            "momo_max_per_tx": 750,
            "momo_daily": 1500,
            "momo_weekly": 7500,
            "momo_monthly": 30000,
            "bank_max_per_tx": 3000,
            "bank_daily": 7500,
            "bank_weekly": 30000,
            "bank_monthly": 150000
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/withdrawal-limits",
            headers=self.headers,
            json=test_limits
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "limits" in data, "Expected 'limits' in response"
        
        # Verify the returned limits match what we sent
        limits = data["limits"]
        assert limits["momo"]["max_per_tx"] == 750, f"Expected momo_max_per_tx=750, got {limits['momo']['max_per_tx']}"
        assert limits["momo"]["daily"] == 1500, f"Expected momo_daily=1500, got {limits['momo']['daily']}"
        assert limits["bank"]["max_per_tx"] == 3000, f"Expected bank_max_per_tx=3000, got {limits['bank']['max_per_tx']}"
        
        print(f"✓ PUT withdrawal-limits successfully updated: {limits}")

    def test_put_withdrawal_limits_persistence(self):
        """Test that PUT changes are persisted and GET returns updated values"""
        # Set specific limits
        update_limits = {
            "momo_max_per_tx": 888,
            "momo_daily": 1888,
            "momo_weekly": 8888,
            "momo_monthly": 38888,
            "bank_max_per_tx": 4888,
            "bank_daily": 9888,
            "bank_weekly": 48888,
            "bank_monthly": 198888
        }
        
        # Update limits
        put_response = requests.put(
            f"{BASE_URL}/api/admin/withdrawal-limits",
            headers=self.headers,
            json=update_limits
        )
        assert put_response.status_code == 200, f"PUT failed: {put_response.text}"
        
        # Fetch limits and verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits",
            headers=self.headers
        )
        assert get_response.status_code == 200, f"GET failed: {get_response.text}"
        
        data = get_response.json()
        limits = data["limits"]
        
        # Verify momo limits persisted
        assert limits["momo"]["max_per_tx"] == 888, f"momo_max_per_tx not persisted: {limits['momo']['max_per_tx']}"
        assert limits["momo"]["daily"] == 1888, f"momo_daily not persisted"
        assert limits["momo"]["weekly"] == 8888, f"momo_weekly not persisted"
        assert limits["momo"]["monthly"] == 38888, f"momo_monthly not persisted"
        
        # Verify bank limits persisted
        assert limits["bank"]["max_per_tx"] == 4888, f"bank_max_per_tx not persisted"
        assert limits["bank"]["daily"] == 9888, f"bank_daily not persisted"
        assert limits["bank"]["weekly"] == 48888, f"bank_weekly not persisted"
        assert limits["bank"]["monthly"] == 198888, f"bank_monthly not persisted"
        
        print("✓ Withdrawal limits persisted correctly after PUT and verified with GET")

    def test_put_withdrawal_limits_partial_update(self):
        """Test that partial updates work with default values for missing fields"""
        # Only update momo limits, bank should use defaults
        partial_limits = {
            "momo_max_per_tx": 555,
            "momo_daily": 1111
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/withdrawal-limits",
            headers=self.headers,
            json=partial_limits
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        limits = data["limits"]
        
        # Momo values should be updated
        assert limits["momo"]["max_per_tx"] == 555, f"momo_max_per_tx should be 555"
        assert limits["momo"]["daily"] == 1111, f"momo_daily should be 1111"
        
        # Other values should have defaults applied
        assert "weekly" in limits["momo"], "momo_weekly should exist"
        assert "monthly" in limits["momo"], "momo_monthly should exist"
        assert "bank" in limits, "bank limits should exist"
        
        print(f"✓ Partial update works correctly: momo.max_per_tx={limits['momo']['max_per_tx']}")


class TestWithdrawalLimitsEdgeCases:
    """Edge cases and validation tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        else:
            pytest.skip(f"Failed to login admin: {response.status_code}")

    def test_invalid_token_rejected(self):
        """Test that invalid bearer token is rejected"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits",
            headers={"Authorization": "Bearer invalid_token_123", "Content-Type": "application/json"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 for invalid token, got {response.status_code}"
        print("✓ Invalid token correctly rejected")

    def test_put_with_zero_values(self):
        """Test that zero values are accepted"""
        zero_limits = {
            "momo_max_per_tx": 0,
            "momo_daily": 0,
            "momo_weekly": 5000,
            "momo_monthly": 20000,
            "bank_max_per_tx": 2000,
            "bank_daily": 5000,
            "bank_weekly": 20000,
            "bank_monthly": 100000
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/withdrawal-limits",
            headers=self.headers,
            json=zero_limits
        )
        # Zero values should be accepted (could be used to disable withdrawals)
        assert response.status_code == 200, f"Expected 200 for zero values, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["limits"]["momo"]["max_per_tx"] == 0, "Zero value should be saved"
        print("✓ Zero values are accepted (can be used to disable withdrawals)")

    def test_put_with_decimal_values(self):
        """Test that decimal values are handled correctly"""
        decimal_limits = {
            "momo_max_per_tx": 500.50,
            "momo_daily": 1000.75,
            "momo_weekly": 5000.99,
            "momo_monthly": 20000.01,
            "bank_max_per_tx": 2000.25,
            "bank_daily": 5000.50,
            "bank_weekly": 20000.75,
            "bank_monthly": 100000.99
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/withdrawal-limits",
            headers=self.headers,
            json=decimal_limits
        )
        assert response.status_code == 200, f"Expected 200 for decimal values, got {response.status_code}"
        
        data = response.json()
        # Values should be stored as floats
        assert isinstance(data["limits"]["momo"]["max_per_tx"], (int, float)), "Should handle decimal values"
        print(f"✓ Decimal values handled correctly: {data['limits']['momo']['max_per_tx']}")


# Restore default limits after all tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_limits():
    """Restore default limits after all tests"""
    yield
    # After tests, restore reasonable defaults
    response = requests.post(
        f"{BASE_URL}/api/auth/admin/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        default_limits = {
            "momo_max_per_tx": 500,
            "momo_daily": 1000,
            "momo_weekly": 5000,
            "momo_monthly": 20000,
            "bank_max_per_tx": 2000,
            "bank_daily": 5000,
            "bank_weekly": 20000,
            "bank_monthly": 100000
        }
        
        requests.put(
            f"{BASE_URL}/api/admin/withdrawal-limits",
            headers=headers,
            json=default_limits
        )
        print("\n✓ Restored default withdrawal limits after tests")
