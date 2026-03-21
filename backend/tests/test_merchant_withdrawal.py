"""
SDM REWARDS - Merchant Withdrawal API Tests
============================================
Tests for merchant withdrawal endpoints:
- GET /api/merchants/balance
- POST /api/merchants/withdraw
- GET /api/merchants/withdrawals
- GET /api/merchants/auto-withdraw/settings
- POST /api/merchants/auto-withdraw/settings
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://web-boost-seo.preview.emergentagent.com').rstrip('/')


class TestMerchantWithdrawalAPIs:
    """Test merchant withdrawal endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - get merchant token"""
        # Login as test merchant
        login_response = requests.post(
            f"{BASE_URL}/api/auth/merchant/login",
            json={"phone": "+233500700500", "password": "test123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Could not login as merchant - skipping withdrawal tests")
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.merchant = data.get("merchant", {})
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_get_balance_success(self):
        """Test GET /api/merchants/balance returns balance data"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/balance",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "available" in data, "Response should contain 'available' field"
        assert "pending" in data, "Response should contain 'pending' field"
        assert "total_received" in data, "Response should contain 'total_received' field"
        assert "total_withdrawn" in data, "Response should contain 'total_withdrawn' field"
        
        # Verify data types
        assert isinstance(data["available"], (int, float)), "available should be numeric"
        assert isinstance(data["pending"], (int, float)), "pending should be numeric"
        assert isinstance(data["total_received"], (int, float)), "total_received should be numeric"
        assert isinstance(data["total_withdrawn"], (int, float)), "total_withdrawn should be numeric"
        
        # Verify non-negative values
        assert data["available"] >= 0, "available should be non-negative"
        assert data["pending"] >= 0, "pending should be non-negative"
        
        print(f"Balance: available={data['available']}, pending={data['pending']}, total_received={data['total_received']}")
        
    def test_get_balance_unauthorized(self):
        """Test GET /api/merchants/balance without token returns 401/422"""
        response = requests.get(f"{BASE_URL}/api/merchants/balance")
        
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        
    def test_get_withdrawals_success(self):
        """Test GET /api/merchants/withdrawals returns withdrawal history"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/withdrawals?limit=5",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "withdrawals" in data, "Response should contain 'withdrawals' field"
        assert isinstance(data["withdrawals"], list), "withdrawals should be a list"
        
        # If there are withdrawals, verify structure
        if data["withdrawals"]:
            withdrawal = data["withdrawals"][0]
            assert "id" in withdrawal or "amount" in withdrawal, "Withdrawal should have id or amount"
            
        print(f"Found {len(data['withdrawals'])} withdrawals")
        
    def test_get_withdrawals_with_limit(self):
        """Test GET /api/merchants/withdrawals respects limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/withdrawals?limit=2",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["withdrawals"]) <= 2, "Should respect limit parameter"
        
    def test_get_auto_withdraw_settings_success(self):
        """Test GET /api/merchants/auto-withdraw/settings returns settings"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/auto-withdraw/settings",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "enabled" in data, "Response should contain 'enabled' field"
        assert "min_amount" in data, "Response should contain 'min_amount' field"
        assert "frequency" in data, "Response should contain 'frequency' field"
        assert "destination" in data, "Response should contain 'destination' field"
        
        # Verify data types
        assert isinstance(data["enabled"], bool), "enabled should be boolean"
        assert isinstance(data["min_amount"], (int, float)), "min_amount should be numeric"
        assert data["frequency"] in ["instant", "daily", "weekly"], f"frequency should be valid: {data['frequency']}"
        assert data["destination"] in ["momo", "bank"], f"destination should be valid: {data['destination']}"
        
        print(f"Auto-withdraw settings: enabled={data['enabled']}, frequency={data['frequency']}")
        
    def test_save_auto_withdraw_settings_success(self):
        """Test POST /api/merchants/auto-withdraw/settings saves settings"""
        settings = {
            "enabled": False,
            "min_amount": 100,
            "frequency": "daily",
            "destination": "momo"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/merchants/auto-withdraw/settings",
            json=settings,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        # Verify settings were saved by fetching them
        get_response = requests.get(
            f"{BASE_URL}/api/merchants/auto-withdraw/settings",
            headers=self.headers
        )
        
        assert get_response.status_code == 200
        saved_data = get_response.json()
        assert saved_data["min_amount"] == 100, "min_amount should be saved"
        assert saved_data["frequency"] == "daily", "frequency should be saved"
        
        print("Auto-withdraw settings saved and verified")
        
    def test_withdraw_validation_minimum_amount(self):
        """Test POST /api/merchants/withdraw validates minimum amount"""
        response = requests.post(
            f"{BASE_URL}/api/merchants/withdraw",
            json={"amount": 1},  # Below minimum of 5
            headers=self.headers
        )
        
        # Should return 400 for invalid amount
        assert response.status_code == 400, f"Expected 400 for amount below minimum, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data or "error" in data, "Should return error message"
        
    def test_withdraw_validation_insufficient_balance(self):
        """Test POST /api/merchants/withdraw validates sufficient balance"""
        # Try to withdraw more than available
        response = requests.post(
            f"{BASE_URL}/api/merchants/withdraw",
            json={"amount": 999999},  # Very large amount
            headers=self.headers
        )
        
        # Should return 400 for insufficient balance
        assert response.status_code == 400, f"Expected 400 for insufficient balance, got {response.status_code}"
        
    def test_withdraw_unauthorized(self):
        """Test POST /api/merchants/withdraw without token returns 401/422"""
        response = requests.post(
            f"{BASE_URL}/api/merchants/withdraw",
            json={"amount": 50}
        )
        
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"


class TestMerchantWithdrawalUIData:
    """Test data needed for withdrawal UI"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/merchant/login",
            json={"phone": "+233500700500", "password": "test123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Could not login as merchant")
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.merchant = data.get("merchant", {})
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_merchant_has_momo_configured(self):
        """Test merchant has MoMo number configured for withdrawals"""
        # The merchant data from login should have momo_number
        assert self.merchant.get("momo_number"), "Merchant should have momo_number configured"
        print(f"MoMo number: {self.merchant.get('momo_number')}")
        
    def test_balance_for_quick_amount_buttons(self):
        """Test balance data supports quick amount buttons (50, 100, 500, TOUT)"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/balance",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        available = data["available"]
        print(f"Available balance: {available}")
        
        # Check which quick amounts are available
        quick_amounts = [50, 100, 500]
        available_quick_amounts = [amt for amt in quick_amounts if amt <= available]
        print(f"Available quick amounts: {available_quick_amounts}")
        
        # TOUT button should always show available balance
        print(f"TOUT amount: {available}")


class TestMerchantWithdrawalIntegration:
    """Integration tests for withdrawal flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/merchant/login",
            json={"phone": "+233500700500", "password": "test123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Could not login as merchant")
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.merchant = data.get("merchant", {})
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_full_withdrawal_flow_data(self):
        """Test all data needed for withdrawal UI is available"""
        # 1. Get balance
        balance_response = requests.get(
            f"{BASE_URL}/api/merchants/balance",
            headers=self.headers
        )
        assert balance_response.status_code == 200
        balance = balance_response.json()
        
        # 2. Get auto-withdraw settings
        settings_response = requests.get(
            f"{BASE_URL}/api/merchants/auto-withdraw/settings",
            headers=self.headers
        )
        assert settings_response.status_code == 200
        settings = settings_response.json()
        
        # 3. Get withdrawal history
        history_response = requests.get(
            f"{BASE_URL}/api/merchants/withdrawals?limit=5",
            headers=self.headers
        )
        assert history_response.status_code == 200
        history = history_response.json()
        
        print(f"Withdrawal UI data:")
        print(f"  Balance: available={balance['available']}, pending={balance['pending']}")
        print(f"  Auto-withdraw: enabled={settings['enabled']}, frequency={settings['frequency']}")
        print(f"  History: {len(history['withdrawals'])} recent withdrawals")
        
        # Verify merchant payout settings
        assert self.merchant.get("momo_number") or self.merchant.get("bank_account"), \
            "Merchant should have at least one payout method configured"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
