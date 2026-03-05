"""
Test Monthly Analytics API and Admin PIN Change Feature
- Monthly Analytics endpoint with month parameter
- Admin PIN change (super admin only)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "emileparfait2003@gmail.com"
ADMIN_PASSWORD = "Gerard0103@"
ADMIN_PIN = "1234"


class TestAdminAuthentication:
    """Test admin login and token retrieval"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        print(f"Admin login response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Admin login failed: {response.text}")
            pytest.skip("Admin authentication failed")
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "admin" in data, "No admin info in response"
        
        token = data["access_token"]
        admin = data.get("admin", {})
        print(f"Admin logged in: {admin.get('email')} - Super Admin: {admin.get('is_super_admin')}")
        return token
    
    def test_admin_login(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "admin" in data
        assert data["admin"]["email"].lower() == ADMIN_EMAIL.lower()
        print(f"✅ Admin login successful - is_super_admin: {data['admin'].get('is_super_admin')}")


class TestMonthlyAnalytics:
    """Test Monthly Analytics API endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin authentication failed")
        return response.json()["access_token"]
    
    def test_monthly_analytics_current_month(self, admin_token):
        """Test monthly analytics for current month"""
        from datetime import datetime
        
        current_month = datetime.now().strftime("%Y-%m")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/monthly",
            params={"month": current_month},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"API returned {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Monthly analytics response: {data}")
        
        # Verify response structure
        assert "month" in data, "Response missing 'month' field"
        assert "transactions" in data, "Response missing 'transactions' field"
        assert "volume" in data, "Response missing 'volume' field"
        assert "new_clients" in data, "Response missing 'new_clients' field"
        assert "new_merchants" in data, "Response missing 'new_merchants' field"
        assert "cashback_distributed" in data, "Response missing 'cashback_distributed' field"
        assert "card_sales" in data, "Response missing 'card_sales' field"
        
        # Verify data types
        assert isinstance(data["transactions"], int), "transactions should be an integer"
        assert isinstance(data["volume"], (int, float)), "volume should be numeric"
        assert isinstance(data["new_clients"], int), "new_clients should be an integer"
        assert isinstance(data["new_merchants"], int), "new_merchants should be an integer"
        
        print(f"✅ Monthly analytics for {current_month}: {data['transactions']} transactions, {data['new_clients']} new clients")
    
    def test_monthly_analytics_past_month(self, admin_token):
        """Test monthly analytics for a past month"""
        from datetime import datetime
        
        # Test January 2026
        past_month = "2026-01"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/monthly",
            params={"month": past_month},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"API returned {response.status_code}: {response.text}"
        
        data = response.json()
        assert "month" in data
        assert data["month"] == past_month
        
        print(f"✅ Monthly analytics for {past_month}: {data['transactions']} transactions")
    
    def test_monthly_analytics_unauthorized(self):
        """Test monthly analytics without authentication"""
        from datetime import datetime
        
        current_month = datetime.now().strftime("%Y-%m")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/monthly",
            params={"month": current_month}
        )
        
        # Should return 401, 403, or 422 (validation error) without auth
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print(f"✅ Monthly analytics requires authentication (returned {response.status_code})")


class TestAdminPINChange:
    """Test Admin PIN change functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin authentication failed")
        return response.json()["access_token"]
    
    def test_pin_verify_with_correct_pin(self, admin_token):
        """Test PIN verification with correct PIN"""
        response = requests.post(
            f"{BASE_URL}/api/admin/settings/verify-pin",
            json={"pin": ADMIN_PIN},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Should succeed with correct PIN
        assert response.status_code == 200, f"PIN verification failed: {response.text}"
        print("✅ PIN verification works with correct PIN")
    
    def test_pin_verify_with_wrong_pin(self, admin_token):
        """Test PIN verification with wrong PIN"""
        response = requests.post(
            f"{BASE_URL}/api/admin/settings/verify-pin",
            json={"pin": "9999"},  # Wrong PIN
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Should fail with wrong PIN
        assert response.status_code in [400, 401, 403], f"Expected failure, got {response.status_code}"
        print("✅ PIN verification correctly rejects wrong PIN")
    
    def test_pin_change_super_admin(self, admin_token):
        """Test PIN change by super admin (emileparfait2003@gmail.com)"""
        # First, change the PIN to a new value
        new_pin = "5678"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/settings/change-pin",
            json={"pin": new_pin},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"PIN change response status: {response.status_code}")
        print(f"PIN change response: {response.text}")
        
        # Super admin should be able to change PIN
        assert response.status_code == 200, f"PIN change failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "PIN change did not return success=true"
        
        print("✅ Super admin PIN change successful")
        
        # Verify new PIN works
        verify_response = requests.post(
            f"{BASE_URL}/api/admin/settings/verify-pin",
            json={"pin": new_pin},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert verify_response.status_code == 200, f"New PIN verification failed: {verify_response.text}"
        print("✅ New PIN verified successfully")
        
        # Change back to original PIN
        restore_response = requests.post(
            f"{BASE_URL}/api/admin/settings/change-pin",
            json={"pin": ADMIN_PIN},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert restore_response.status_code == 200, f"PIN restore failed: {restore_response.text}"
        print("✅ PIN restored to original value")
    
    def test_pin_change_invalid_format(self, admin_token):
        """Test PIN change with invalid format"""
        # Test with non-digit PIN
        response = requests.post(
            f"{BASE_URL}/api/admin/settings/change-pin",
            json={"pin": "abcd"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid PIN, got {response.status_code}"
        print("✅ PIN change correctly rejects non-digit PIN")
        
        # Test with too short PIN
        response = requests.post(
            f"{BASE_URL}/api/admin/settings/change-pin",
            json={"pin": "123"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for short PIN, got {response.status_code}"
        print("✅ PIN change correctly rejects too short PIN")


class TestPINStatus:
    """Test PIN status endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin authentication failed")
        return response.json()["access_token"]
    
    def test_pin_status(self, admin_token):
        """Test PIN status retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/pin-status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"PIN status failed: {response.text}"
        
        data = response.json()
        assert "pin_enabled" in data, "Response missing 'pin_enabled' field"
        
        print(f"✅ PIN status: enabled={data.get('pin_enabled')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
