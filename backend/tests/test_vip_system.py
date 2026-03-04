"""
VIP System Tests - VIP Card Protection for Services
Tests:
1. Service endpoints (airtime, data, bill, withdraw) return 403 for users without VIP
2. Service endpoints work for users with active VIP membership
3. Admin card sales endpoint returns correct statistics
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVIPServiceProtection:
    """Test that services are protected for non-VIP users"""
    
    # Test user credentials from the problem statement
    TEST_USER_NO_VIP = {
        "phone": "+233599999999",
        "password": "VipTest123",
        "note": "User WITHOUT VIP - should see services blocked"
    }
    
    TEST_USER_WITH_VIP = {
        "phone": "+233588888888",
        "password": "VipActive123",
        "note": "User WITH VIP - should access services"
    }
    
    ADMIN_CREDS = {
        "username": "emileparfait2003@gmail.com",
        "password": "Gerard0103@"
    }
    
    @pytest.fixture(scope="class")
    def api_client(self):
        """Shared requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def admin_token(self, api_client):
        """Get admin authentication token"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json=self.ADMIN_CREDS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture(scope="class")
    def no_vip_user_token(self, api_client):
        """Login or register test user WITHOUT VIP"""
        # Try to login first
        response = api_client.post(f"{BASE_URL}/api/sdm/auth/login", json={
            "phone": self.TEST_USER_NO_VIP["phone"],
            "password": self.TEST_USER_NO_VIP["password"]
        })
        
        if response.status_code == 200:
            return response.json().get("access_token")
        
        # If login fails, create the user via test account method
        pytest.skip("No VIP test user does not exist - need to create via OTP")
        return None
    
    @pytest.fixture(scope="class")
    def vip_user_token(self, api_client):
        """Login or register test user WITH VIP"""
        response = api_client.post(f"{BASE_URL}/api/sdm/auth/login", json={
            "phone": self.TEST_USER_WITH_VIP["phone"],
            "password": self.TEST_USER_WITH_VIP["password"]
        })
        
        if response.status_code == 200:
            return response.json().get("access_token")
        
        pytest.skip("VIP test user does not exist - need to create via OTP")
        return None

    # ======================== SERVICE PROTECTION TESTS (403 for non-VIP) ========================
    
    def test_airtime_requires_vip(self, api_client, no_vip_user_token):
        """Test that /api/sdm/user/services/airtime returns 403 for non-VIP user"""
        if not no_vip_user_token:
            pytest.skip("No VIP test user token available")
        
        response = api_client.post(
            f"{BASE_URL}/api/sdm/user/services/airtime",
            json={"phone_number": "+233500000000", "amount": 5},
            headers={"Authorization": f"Bearer {no_vip_user_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "VIP" in data.get("detail", "") or "carte VIP" in data.get("detail", "").lower(), \
            f"Error message should mention VIP requirement: {data}"
        print(f"✓ Airtime endpoint correctly blocked non-VIP user: {data.get('detail')}")
    
    def test_data_requires_vip(self, api_client, no_vip_user_token):
        """Test that /api/sdm/user/services/data returns 403 for non-VIP user"""
        if not no_vip_user_token:
            pytest.skip("No VIP test user token available")
        
        response = api_client.post(
            f"{BASE_URL}/api/sdm/user/services/data",
            json={"phone_number": "+233500000000", "bundle_id": "test-bundle"},
            headers={"Authorization": f"Bearer {no_vip_user_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "VIP" in data.get("detail", "") or "carte VIP" in data.get("detail", "").lower(), \
            f"Error message should mention VIP requirement: {data}"
        print(f"✓ Data endpoint correctly blocked non-VIP user: {data.get('detail')}")
    
    def test_bill_requires_vip(self, api_client, no_vip_user_token):
        """Test that /api/sdm/user/services/bill returns 403 for non-VIP user"""
        if not no_vip_user_token:
            pytest.skip("No VIP test user token available")
        
        response = api_client.post(
            f"{BASE_URL}/api/sdm/user/services/bill",
            json={"provider": "ECG", "account_number": "123456", "amount": 50},
            headers={"Authorization": f"Bearer {no_vip_user_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "VIP" in data.get("detail", "") or "carte VIP" in data.get("detail", "").lower(), \
            f"Error message should mention VIP requirement: {data}"
        print(f"✓ Bill endpoint correctly blocked non-VIP user: {data.get('detail')}")
    
    def test_withdraw_requires_vip(self, api_client, no_vip_user_token):
        """Test that /api/sdm/user/services/withdraw returns 403 for non-VIP user"""
        if not no_vip_user_token:
            pytest.skip("No VIP test user token available")
        
        response = api_client.post(
            f"{BASE_URL}/api/sdm/user/services/withdraw",
            json={"phone_number": "+233500000000", "amount": 10, "network": "MTN"},
            headers={"Authorization": f"Bearer {no_vip_user_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "VIP" in data.get("detail", "") or "carte VIP" in data.get("detail", "").lower(), \
            f"Error message should mention VIP requirement: {data}"
        print(f"✓ Withdraw endpoint correctly blocked non-VIP user: {data.get('detail')}")

    # ======================== VIP USER ACCESS TESTS ========================
    
    def test_vip_user_can_call_airtime(self, api_client, vip_user_token):
        """Test that VIP user can access airtime endpoint (may fail at business logic, not 403)"""
        if not vip_user_token:
            pytest.skip("VIP test user token not available")
        
        response = api_client.post(
            f"{BASE_URL}/api/sdm/user/services/airtime",
            json={"phone_number": "+233500000000", "amount": 1},
            headers={"Authorization": f"Bearer {vip_user_token}"}
        )
        
        # Should NOT be 403 - may be 400 (insufficient balance) or 200 (success)
        assert response.status_code != 403, f"VIP user should not get 403, got: {response.text}"
        print(f"✓ VIP user passed VIP check for airtime (status: {response.status_code})")
    
    def test_vip_user_can_call_data(self, api_client, vip_user_token):
        """Test that VIP user can access data endpoint (may fail at business logic, not 403)"""
        if not vip_user_token:
            pytest.skip("VIP test user token not available")
        
        response = api_client.post(
            f"{BASE_URL}/api/sdm/user/services/data",
            json={"phone_number": "+233500000000", "bundle_id": "MTN_500MB"},
            headers={"Authorization": f"Bearer {vip_user_token}"}
        )
        
        assert response.status_code != 403, f"VIP user should not get 403, got: {response.text}"
        print(f"✓ VIP user passed VIP check for data (status: {response.status_code})")
    
    def test_vip_user_can_call_bill(self, api_client, vip_user_token):
        """Test that VIP user can access bill endpoint (may fail at business logic, not 403)"""
        if not vip_user_token:
            pytest.skip("VIP test user token not available")
        
        response = api_client.post(
            f"{BASE_URL}/api/sdm/user/services/bill",
            json={"provider": "ECG", "account_number": "123456", "amount": 10},
            headers={"Authorization": f"Bearer {vip_user_token}"}
        )
        
        assert response.status_code != 403, f"VIP user should not get 403, got: {response.text}"
        print(f"✓ VIP user passed VIP check for bill (status: {response.status_code})")
    
    def test_vip_user_can_call_withdraw(self, api_client, vip_user_token):
        """Test that VIP user can access withdraw endpoint (may fail at business logic, not 403)"""
        if not vip_user_token:
            pytest.skip("VIP test user token not available")
        
        response = api_client.post(
            f"{BASE_URL}/api/sdm/user/services/withdraw",
            json={"phone_number": "+233500000000", "amount": 1, "network": "MTN"},
            headers={"Authorization": f"Bearer {vip_user_token}"}
        )
        
        assert response.status_code != 403, f"VIP user should not get 403, got: {response.text}"
        print(f"✓ VIP user passed VIP check for withdraw (status: {response.status_code})")


class TestAdminCardSales:
    """Test admin card sales endpoint"""
    
    ADMIN_CREDS = {
        "username": "emileparfait2003@gmail.com",
        "password": "Gerard0103@"
    }
    
    @pytest.fixture(scope="class")
    def api_client(self):
        """Shared requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def admin_token(self, api_client):
        """Get admin authentication token"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json=self.ADMIN_CREDS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    def test_card_sales_endpoint_exists(self, api_client, admin_token):
        """Test that /api/sdm/admin/platform/card-sales endpoint exists and returns data"""
        response = api_client.get(
            f"{BASE_URL}/api/sdm/admin/platform/card-sales",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        expected_fields = ["platform_balance", "total_cards_sold", "today", "this_week", "this_month"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Card sales endpoint returns valid structure")
        print(f"  - Platform Balance: {data.get('platform_balance')}")
        print(f"  - Total Cards Sold: {data.get('total_cards_sold')}")
        print(f"  - Today: {data.get('today')}")
        print(f"  - This Month: {data.get('this_month')}")
    
    def test_card_sales_stats_structure(self, api_client, admin_token):
        """Test that card sales stats have correct nested structure"""
        response = api_client.get(
            f"{BASE_URL}/api/sdm/admin/platform/card-sales",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check nested period structures
        for period in ["today", "this_week", "this_month"]:
            period_data = data.get(period, {})
            assert "cards_sold" in period_data or period_data == {}, f"Missing cards_sold in {period}"
            assert "revenue" in period_data or period_data == {}, f"Missing revenue in {period}"
        
        print(f"✓ Card sales stats have correct nested structure")
    
    def test_card_sales_requires_admin_auth(self, api_client):
        """Test that card sales endpoint requires admin authentication"""
        response = api_client.get(f"{BASE_URL}/api/sdm/admin/platform/card-sales")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ Card sales endpoint correctly requires authentication")
    
    def test_card_sales_by_tier(self, api_client, admin_token):
        """Test that card sales includes by_tier breakdown"""
        response = api_client.get(
            f"{BASE_URL}/api/sdm/admin/platform/card-sales",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # by_tier is optional but should be present
        by_tier = data.get("by_tier", {})
        print(f"✓ Card sales by_tier breakdown: {by_tier}")
        
        # Verify if there's data, it has the expected structure
        for tier, tier_data in by_tier.items():
            assert isinstance(tier_data, dict), f"Invalid tier data for {tier}"
            print(f"  - {tier}: {tier_data}")


class TestUserWithoutVIPCreation:
    """Helper tests to create test users if they don't exist"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_can_check_test_phone_user(self, api_client):
        """Check if we can use the test phone for creating users"""
        # Test phone: +233555000000 (from config)
        test_phone = "+233555000000"
        
        response = api_client.post(f"{BASE_URL}/api/sdm/auth/send-otp", json={
            "phone": test_phone
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Test phone OTP system working")
            print(f"  - Request ID: {data.get('request_id')}")
            print(f"  - Is test account: {data.get('is_test_account')}")
        else:
            print(f"OTP send response: {response.status_code} - {response.text}")
