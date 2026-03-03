"""
Test Suite for Phase 2 Admin Controls
- Client control actions: block, unblock, suspend, unsuspend, freeze_wallet, unfreeze_wallet, adjust_balance
- Merchant control actions: block, unblock, suspend, unsuspend, toggle_cash_mode, update_cash_limit
- Admin action logs retrieval with filters
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "emileparfait2003@gmail.com"
ADMIN_PASSWORD = "Gerard0103@"

class TestAdminControlsPhase2:
    """Phase 2 Admin Controls Tests"""
    
    admin_token = None
    test_client_id = None
    test_merchant_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token and fetch existing client/merchant for testing"""
        if not TestAdminControlsPhase2.admin_token:
            # Login as admin
            login_resp = requests.post(
                f"{BASE_URL}/api/admin/login",
                json={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
            )
            assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
            TestAdminControlsPhase2.admin_token = login_resp.json()["access_token"]
        
        self.headers = {"Authorization": f"Bearer {TestAdminControlsPhase2.admin_token}"}
        
        # Fetch a test client if not already
        if not TestAdminControlsPhase2.test_client_id:
            users_resp = requests.get(f"{BASE_URL}/api/sdm/admin/users?limit=10", headers=self.headers)
            if users_resp.status_code == 200:
                users = users_resp.json()
                if users:
                    TestAdminControlsPhase2.test_client_id = users[0]["id"]
        
        # Fetch a test merchant if not already
        if not TestAdminControlsPhase2.test_merchant_id:
            merchants_resp = requests.get(f"{BASE_URL}/api/sdm/admin/merchants", headers=self.headers)
            if merchants_resp.status_code == 200:
                merchants = merchants_resp.json()
                if merchants:
                    TestAdminControlsPhase2.test_merchant_id = merchants[0]["id"]
    
    # ==================== ADMIN LOGIN ====================
    
    def test_01_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"Admin login successful, token obtained")
    
    def test_02_admin_login_invalid_credentials(self):
        """Test admin login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("Invalid credentials correctly rejected")
    
    # ==================== CLIENT CONTROL ACTIONS ====================
    
    def test_10_client_block_action(self):
        """Test blocking a client account"""
        if not TestAdminControlsPhase2.test_client_id:
            pytest.skip("No test client available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/clients/{TestAdminControlsPhase2.test_client_id}/control",
            json={"action": "block", "reason": "Test block action"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "block"
        print(f"Client blocked successfully: {data['message']}")
    
    def test_11_client_unblock_action(self):
        """Test unblocking a client account"""
        if not TestAdminControlsPhase2.test_client_id:
            pytest.skip("No test client available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/clients/{TestAdminControlsPhase2.test_client_id}/control",
            json={"action": "unblock", "reason": "Test unblock action"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "unblock"
        print(f"Client unblocked successfully: {data['message']}")
    
    def test_12_client_suspend_action(self):
        """Test suspending a client account"""
        if not TestAdminControlsPhase2.test_client_id:
            pytest.skip("No test client available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/clients/{TestAdminControlsPhase2.test_client_id}/control",
            json={"action": "suspend", "reason": "Test suspend action"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "suspend"
        print(f"Client suspended successfully: {data['message']}")
    
    def test_13_client_unsuspend_action(self):
        """Test unsuspending a client account"""
        if not TestAdminControlsPhase2.test_client_id:
            pytest.skip("No test client available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/clients/{TestAdminControlsPhase2.test_client_id}/control",
            json={"action": "unsuspend"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "unsuspend"
        print(f"Client unsuspended successfully: {data['message']}")
    
    def test_14_client_freeze_wallet(self):
        """Test freezing client wallet"""
        if not TestAdminControlsPhase2.test_client_id:
            pytest.skip("No test client available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/clients/{TestAdminControlsPhase2.test_client_id}/control",
            json={"action": "freeze_wallet", "reason": "Test freeze wallet"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "freeze_wallet"
        print(f"Client wallet frozen successfully: {data['message']}")
    
    def test_15_client_unfreeze_wallet(self):
        """Test unfreezing client wallet"""
        if not TestAdminControlsPhase2.test_client_id:
            pytest.skip("No test client available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/clients/{TestAdminControlsPhase2.test_client_id}/control",
            json={"action": "unfreeze_wallet"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "unfreeze_wallet"
        print(f"Client wallet unfrozen successfully: {data['message']}")
    
    def test_16_client_adjust_balance_add(self):
        """Test adding balance to client wallet"""
        if not TestAdminControlsPhase2.test_client_id:
            pytest.skip("No test client available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/clients/{TestAdminControlsPhase2.test_client_id}/control",
            json={
                "action": "adjust_balance",
                "balance_adjustment": 10.0,
                "adjustment_type": "add",
                "reason": "Test balance add"
            },
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "adjust_balance"
        print(f"Client balance adjusted (add): {data['message']}")
    
    def test_17_client_adjust_balance_subtract(self):
        """Test subtracting balance from client wallet"""
        if not TestAdminControlsPhase2.test_client_id:
            pytest.skip("No test client available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/clients/{TestAdminControlsPhase2.test_client_id}/control",
            json={
                "action": "adjust_balance",
                "balance_adjustment": 5.0,
                "adjustment_type": "subtract",
                "reason": "Test balance subtract"
            },
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"Client balance adjusted (subtract): {data['message']}")
    
    def test_18_client_control_invalid_action(self):
        """Test invalid client control action"""
        if not TestAdminControlsPhase2.test_client_id:
            pytest.skip("No test client available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/clients/{TestAdminControlsPhase2.test_client_id}/control",
            json={"action": "invalid_action"},
            headers=self.headers
        )
        assert response.status_code == 400
        print("Invalid client action correctly rejected")
    
    def test_19_client_control_nonexistent_client(self):
        """Test control action on non-existent client"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/clients/nonexistent-id-12345/control",
            json={"action": "block"},
            headers=self.headers
        )
        assert response.status_code == 404
        print("Non-existent client correctly returns 404")
    
    # ==================== MERCHANT CONTROL ACTIONS ====================
    
    def test_20_merchant_block_action(self):
        """Test blocking a merchant account"""
        if not TestAdminControlsPhase2.test_merchant_id:
            pytest.skip("No test merchant available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/merchants/{TestAdminControlsPhase2.test_merchant_id}/control",
            json={"action": "block", "reason": "Test block action"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "block"
        print(f"Merchant blocked successfully: {data['message']}")
    
    def test_21_merchant_unblock_action(self):
        """Test unblocking a merchant account"""
        if not TestAdminControlsPhase2.test_merchant_id:
            pytest.skip("No test merchant available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/merchants/{TestAdminControlsPhase2.test_merchant_id}/control",
            json={"action": "unblock"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "unblock"
        print(f"Merchant unblocked successfully: {data['message']}")
    
    def test_22_merchant_suspend_action(self):
        """Test suspending a merchant account"""
        if not TestAdminControlsPhase2.test_merchant_id:
            pytest.skip("No test merchant available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/merchants/{TestAdminControlsPhase2.test_merchant_id}/control",
            json={"action": "suspend", "reason": "Test suspend action"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "suspend"
        print(f"Merchant suspended successfully: {data['message']}")
    
    def test_23_merchant_unsuspend_action(self):
        """Test unsuspending a merchant account"""
        if not TestAdminControlsPhase2.test_merchant_id:
            pytest.skip("No test merchant available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/merchants/{TestAdminControlsPhase2.test_merchant_id}/control",
            json={"action": "unsuspend"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "unsuspend"
        print(f"Merchant unsuspended successfully: {data['message']}")
    
    def test_24_merchant_toggle_cash_mode(self):
        """Test toggling merchant cash mode"""
        if not TestAdminControlsPhase2.test_merchant_id:
            pytest.skip("No test merchant available")
        
        # Toggle cash mode off
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/merchants/{TestAdminControlsPhase2.test_merchant_id}/control",
            json={"action": "toggle_cash_mode", "reason": "Test toggle cash mode"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "toggle_cash_mode"
        print(f"Merchant cash mode toggled: {data['message']}")
        
        # Toggle back
        response2 = requests.post(
            f"{BASE_URL}/api/sdm/admin/merchants/{TestAdminControlsPhase2.test_merchant_id}/control",
            json={"action": "toggle_cash_mode"},
            headers=self.headers
        )
        assert response2.status_code == 200
        print("Merchant cash mode toggled back")
    
    def test_25_merchant_update_cash_limit(self):
        """Test updating merchant cash debit limits"""
        if not TestAdminControlsPhase2.test_merchant_id:
            pytest.skip("No test merchant available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/merchants/{TestAdminControlsPhase2.test_merchant_id}/control",
            json={
                "action": "update_cash_limit",
                "cash_debit_limit": 7500.0,
                "cash_grace_period_days": 5,
                "max_cash_cashback_rate": 12.0,
                "reason": "Test cash limit update"
            },
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "update_cash_limit"
        print(f"Merchant cash limits updated: {data['message']}")
        
        # Reset to defaults
        requests.post(
            f"{BASE_URL}/api/sdm/admin/merchants/{TestAdminControlsPhase2.test_merchant_id}/control",
            json={
                "action": "update_cash_limit",
                "cash_debit_limit": 5000.0,
                "cash_grace_period_days": 3,
                "max_cash_cashback_rate": 15.0
            },
            headers=self.headers
        )
        print("Merchant cash limits reset to defaults")
    
    def test_26_merchant_control_invalid_action(self):
        """Test invalid merchant control action"""
        if not TestAdminControlsPhase2.test_merchant_id:
            pytest.skip("No test merchant available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/merchants/{TestAdminControlsPhase2.test_merchant_id}/control",
            json={"action": "invalid_action"},
            headers=self.headers
        )
        assert response.status_code == 400
        print("Invalid merchant action correctly rejected")
    
    def test_27_merchant_control_nonexistent_merchant(self):
        """Test control action on non-existent merchant"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/merchants/nonexistent-id-12345/control",
            json={"action": "block"},
            headers=self.headers
        )
        assert response.status_code == 404
        print("Non-existent merchant correctly returns 404")
    
    # ==================== ADMIN ACTION LOGS ====================
    
    def test_30_get_action_logs_all(self):
        """Test retrieving all admin action logs"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/action-logs?limit=50",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert isinstance(data["logs"], list)
        print(f"Retrieved {len(data['logs'])} action logs")
        
        # Verify log structure if logs exist
        if data["logs"]:
            log = data["logs"][0]
            assert "admin_email" in log
            assert "target_type" in log
            assert "action" in log
            assert "target_identifier" in log
            assert "created_at" in log
            print(f"Log structure verified: admin={log['admin_email']}, action={log['action']}, target={log['target_type']}")
    
    def test_31_get_action_logs_filter_client(self):
        """Test retrieving action logs filtered by client target type"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/action-logs?target_type=client&limit=50",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        
        # All logs should be for clients
        for log in data["logs"]:
            assert log["target_type"] == "client"
        print(f"Retrieved {len(data['logs'])} client action logs")
    
    def test_32_get_action_logs_filter_merchant(self):
        """Test retrieving action logs filtered by merchant target type"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/action-logs?target_type=merchant&limit=50",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        
        # All logs should be for merchants
        for log in data["logs"]:
            assert log["target_type"] == "merchant"
        print(f"Retrieved {len(data['logs'])} merchant action logs")
    
    # ==================== ADMIN LIST ENDPOINTS ====================
    
    def test_40_get_admin_users_list(self):
        """Test retrieving clients/users list for admin panel"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/users?limit=100",
            headers=self.headers
        )
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        print(f"Retrieved {len(users)} clients for admin panel")
        
        if users:
            user = users[0]
            # Verify expected fields for admin panel
            assert "id" in user
            assert "phone" in user
            print(f"Sample client: {user.get('full_name', 'N/A')}, phone: {user['phone']}")
    
    def test_41_get_admin_merchants_list(self):
        """Test retrieving merchants list for admin panel"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/merchants",
            headers=self.headers
        )
        assert response.status_code == 200
        merchants = response.json()
        assert isinstance(merchants, list)
        print(f"Retrieved {len(merchants)} merchants for admin panel")
        
        if merchants:
            merchant = merchants[0]
            # Verify expected fields for admin panel
            assert "id" in merchant
            assert "business_name" in merchant
            assert "phone" in merchant
            # Cash debit fields (Phase 1)
            print(f"Sample merchant: {merchant['business_name']}, cash_balance: {merchant.get('cash_debit_balance', 0)}, cash_limit: {merchant.get('cash_debit_limit', 5000)}")
    
    # ==================== UNAUTHORIZED ACCESS ====================
    
    def test_50_unauthorized_client_control(self):
        """Test client control without auth token"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/clients/some-id/control",
            json={"action": "block"}
        )
        assert response.status_code in [401, 403]
        print("Unauthorized client control correctly rejected")
    
    def test_51_unauthorized_merchant_control(self):
        """Test merchant control without auth token"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/merchants/some-id/control",
            json={"action": "block"}
        )
        assert response.status_code in [401, 403]
        print("Unauthorized merchant control correctly rejected")
    
    def test_52_unauthorized_action_logs(self):
        """Test action logs without auth token"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/action-logs")
        assert response.status_code in [401, 403]
        print("Unauthorized action logs access correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
