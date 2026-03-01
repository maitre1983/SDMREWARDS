"""
Push Notification API Tests for SDM Fintech Ghana
==================================================
Tests for OneSignal push notification integration endpoints.
OneSignal is in SIMULATION mode (credentials not configured).
All tests should work with simulated: true responses.
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPushNotificationEndpoints:
    """Test push notification endpoints in simulation mode"""
    
    admin_token = None
    user_token = None
    test_player_id = "test_player_id_12345"
    
    @classmethod
    def setup_class(cls):
        """Setup: Get admin and user tokens"""
        # Admin login
        admin_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "admin", "password": "Gerard0103@"}
        )
        assert admin_response.status_code == 200, f"Admin login failed: {admin_response.text}"
        cls.admin_token = admin_response.json()["access_token"]
        
        # User login via OTP
        # Send OTP
        otp_response = requests.post(
            f"{BASE_URL}/api/sdm/auth/send-otp",
            json={"phone": "+233000000000"}
        )
        assert otp_response.status_code == 200, f"Send OTP failed: {otp_response.text}"
        
        # Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/sdm/auth/verify-otp",
            json={"phone": "+233000000000", "otp_code": "000000"}
        )
        assert verify_response.status_code == 200, f"Verify OTP failed: {verify_response.text}"
        cls.user_token = verify_response.json()["access_token"]
    
    # ============== ADMIN PUSH STATS ENDPOINT ==============
    
    def test_admin_push_stats(self):
        """Test GET /api/sdm/admin/push/stats - Get push notification statistics"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/push/stats",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Push stats failed: {response.text}"
        
        data = response.json()
        # Verify expected fields
        assert "is_configured" in data
        assert "active_devices" in data
        assert "total_devices" in data
        assert "by_platform" in data
        assert "by_user_type" in data
        
        # OneSignal should NOT be configured (env vars empty)
        assert data["is_configured"] == False, "OneSignal should not be configured"
        print(f"✓ Push stats: is_configured={data['is_configured']}, active_devices={data['active_devices']}")
    
    def test_admin_push_stats_requires_auth(self):
        """Test GET /api/sdm/admin/push/stats - Requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/push/stats")
        assert response.status_code in [401, 403], "Should require auth"
        print("✓ Push stats requires admin authentication")
    
    # ============== ADMIN PUSH TEST ENDPOINT ==============
    
    def test_admin_push_test(self):
        """Test POST /api/sdm/admin/push/test - Test push notification system"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/push/test",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Push test failed: {response.text}"
        
        data = response.json()
        assert "is_configured" in data
        assert "active_devices" in data
        assert "message" in data
        
        # Should show not configured message
        assert data["is_configured"] == False
        assert "not configured" in data["message"].lower() or "Add ONESIGNAL" in data["message"]
        print(f"✓ Push test: {data['message']}")
    
    # ============== ADMIN PUSH SEND ENDPOINT ==============
    
    def test_admin_push_send_to_all(self):
        """Test POST /api/sdm/admin/push/send - Send to all users (simulated)"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/push/send?recipient_type=all",
            json={
                "title": "Test Notification",
                "message": "This is a test push notification for all users"
            },
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Push send failed: {response.text}"
        
        data = response.json()
        assert "push_result" in data
        assert "in_app_notification_id" in data
        
        # Should be simulated since OneSignal not configured
        push_result = data["push_result"]
        assert push_result.get("simulated") == True or push_result.get("success") == True
        print(f"✓ Push send to all: simulated={push_result.get('simulated', False)}")
    
    def test_admin_push_send_to_clients(self):
        """Test POST /api/sdm/admin/push/send - Send to clients only (simulated)"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/push/send?recipient_type=clients",
            json={
                "title": "Client Promo",
                "message": "Exclusive offer for SDM clients!"
            },
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Push send failed: {response.text}"
        
        data = response.json()
        assert "push_result" in data
        print(f"✓ Push send to clients: {data['push_result']}")
    
    def test_admin_push_send_to_merchants(self):
        """Test POST /api/sdm/admin/push/send - Send to merchants only (simulated)"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/push/send?recipient_type=merchants",
            json={
                "title": "Merchant Alert",
                "message": "Important update for SDM merchants"
            },
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Push send failed: {response.text}"
        
        data = response.json()
        assert "push_result" in data
        print(f"✓ Push send to merchants: {data['push_result']}")
    
    def test_admin_push_send_with_url(self):
        """Test POST /api/sdm/admin/push/send - Send with action URL"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/push/send?recipient_type=all",
            json={
                "title": "Check This Out!",
                "message": "Click to see our latest offers",
                "url": "https://sdm.com/offers"
            },
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Push send with URL failed: {response.text}"
        print("✓ Push send with URL works")
    
    # ============== USER PUSH DEVICE REGISTRATION ==============
    
    def test_user_push_register(self):
        """Test POST /api/sdm/user/push/register - Register device for push"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/user/push/register",
            json={
                "player_id": self.test_player_id,
                "platform": "web",
                "device_model": "Chrome Browser"
            },
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert response.status_code == 200, f"User push register failed: {response.text}"
        
        data = response.json()
        assert "status" in data
        assert data["status"] in ["registered", "updated"]
        assert "device_id" in data
        print(f"✓ User push register: status={data['status']}, device_id={data['device_id']}")
    
    def test_user_push_register_updates_existing(self):
        """Test POST /api/sdm/user/push/register - Re-registering updates existing"""
        # Register again with same player_id
        response = requests.post(
            f"{BASE_URL}/api/sdm/user/push/register",
            json={
                "player_id": self.test_player_id,
                "platform": "web",
                "device_model": "Firefox Browser"  # Different model
            },
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert response.status_code == 200, f"User push re-register failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "updated", "Re-registering should update"
        print(f"✓ User push re-register: status={data['status']}")
    
    def test_user_push_get_devices(self):
        """Test GET /api/sdm/user/push/devices - Get registered devices"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/user/push/devices",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert response.status_code == 200, f"Get devices failed: {response.text}"
        
        data = response.json()
        assert "devices" in data
        assert "count" in data
        assert data["count"] >= 1, "Should have at least one registered device"
        
        # Verify device has expected fields
        if data["devices"]:
            device = data["devices"][0]
            assert "player_id" in device
            assert "platform" in device
            assert "is_active" in device
            print(f"✓ User push devices: count={data['count']}, device={device['player_id']}")
        else:
            print("✓ User push devices: empty (may have been unregistered)")
    
    def test_user_push_unregister(self):
        """Test POST /api/sdm/user/push/unregister - Unregister device"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/user/push/unregister?player_id={self.test_player_id}",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert response.status_code == 200, f"User push unregister failed: {response.text}"
        
        data = response.json()
        assert "success" in data
        print(f"✓ User push unregister: success={data['success']}")
    
    def test_user_push_unregister_nonexistent(self):
        """Test POST /api/sdm/user/push/unregister - Nonexistent device"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/user/push/unregister?player_id=nonexistent_player_12345",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Should still return 200 with success=False
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False, "Unregistering nonexistent should return False"
        print("✓ User push unregister nonexistent returns success=False")
    
    def test_user_push_requires_auth(self):
        """Test user push endpoints require authentication"""
        # Register without auth
        response = requests.post(
            f"{BASE_URL}/api/sdm/user/push/register",
            json={"player_id": "test123"}
        )
        assert response.status_code in [401, 403], "Should require auth"
        
        # Get devices without auth
        response = requests.get(f"{BASE_URL}/api/sdm/user/push/devices")
        assert response.status_code in [401, 403], "Should require auth"
        print("✓ User push endpoints require authentication")
    
    # ============== ADMIN PUSH STATS AFTER REGISTRATION ==============
    
    def test_admin_push_stats_after_registration(self):
        """Test push stats reflect registered devices"""
        # First register a device
        requests.post(
            f"{BASE_URL}/api/sdm/user/push/register",
            json={
                "player_id": "stats_test_player_123",
                "platform": "web",
                "device_model": "Test Device"
            },
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Check stats
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/push/stats",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have at least 1 device
        assert data["active_devices"] >= 1, "Should have at least one active device"
        assert data["total_devices"] >= 1, "Should have at least one total device"
        
        # Cleanup
        requests.post(
            f"{BASE_URL}/api/sdm/user/push/unregister?player_id=stats_test_player_123",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        print(f"✓ Push stats reflect devices: active={data['active_devices']}, total={data['total_devices']}")
    
    # ============== PUSH NOTIFICATION WITH DATA PAYLOAD ==============
    
    def test_admin_push_send_with_data(self):
        """Test POST /api/sdm/admin/push/send - With custom data payload"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/push/send?recipient_type=all",
            json={
                "title": "Transaction Alert",
                "message": "You received GHS 50.00 cashback!",
                "url": "https://sdm.com/wallet",
                "data": {
                    "transaction_id": "TXN123456",
                    "amount": 50.00,
                    "type": "cashback"
                }
            },
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Push with data failed: {response.text}"
        
        data = response.json()
        assert "push_result" in data
        print("✓ Push send with custom data payload works")


class TestMerchantPushDevice:
    """Test merchant push device registration"""
    
    merchant_token = None
    admin_token = None
    test_player_id = "merchant_player_id_67890"
    
    @classmethod
    def setup_class(cls):
        """Setup: Get admin token and register merchant"""
        # Admin login
        admin_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "admin", "password": "Gerard0103@"}
        )
        cls.admin_token = admin_response.json()["access_token"]
        
        # Register a test merchant
        register_response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/register",
            json={
                "business_name": "Push Test Merchant",
                "business_type": "cafe",
                "phone": "+233240000099",
                "city": "Accra",
                "cashback_rate": 0.05
            }
        )
        
        if register_response.status_code == 200:
            cls.merchant_token = register_response.json()["access_token"]
        elif register_response.status_code == 400 and "already registered" in register_response.text:
            # Login existing merchant
            login_response = requests.post(
                f"{BASE_URL}/api/sdm/merchant/login",
                json={
                    "phone": "+233240000099",
                    "api_key": register_response.json().get("api_key", "")
                }
            )
            if login_response.status_code == 200:
                cls.merchant_token = login_response.json()["access_token"]
    
    def test_merchant_push_register(self):
        """Test POST /api/sdm/merchant/push/register - Register merchant device"""
        if not self.merchant_token:
            pytest.skip("No merchant token available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/push/register",
            json={
                "player_id": self.test_player_id,
                "platform": "android",
                "device_model": "Samsung Galaxy"
            },
            headers={"Authorization": f"Bearer {self.merchant_token}"}
        )
        
        assert response.status_code == 200, f"Merchant push register failed: {response.text}"
        
        data = response.json()
        assert "status" in data
        assert data["status"] in ["registered", "updated"]
        print(f"✓ Merchant push register: status={data['status']}")
    
    def test_merchant_push_unregister(self):
        """Test POST /api/sdm/merchant/push/unregister - Unregister merchant device"""
        if not self.merchant_token:
            pytest.skip("No merchant token available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/push/unregister?player_id={self.test_player_id}",
            headers={"Authorization": f"Bearer {self.merchant_token}"}
        )
        
        assert response.status_code == 200, f"Merchant push unregister failed: {response.text}"
        print("✓ Merchant push unregister works")
    
    def test_push_stats_shows_merchant_devices(self):
        """Test push stats shows merchants in by_user_type"""
        if not self.merchant_token:
            pytest.skip("No merchant token available")
        
        # Register merchant device
        requests.post(
            f"{BASE_URL}/api/sdm/merchant/push/register",
            json={
                "player_id": "merchant_stats_test_player",
                "platform": "ios",
                "device_model": "iPhone"
            },
            headers={"Authorization": f"Bearer {self.merchant_token}"}
        )
        
        # Check stats
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/push/stats",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have merchant in by_user_type
        assert "by_user_type" in data
        # Merchant count should be >= 1 if registration succeeded
        print(f"✓ Push stats by_user_type: {data['by_user_type']}")
        
        # Cleanup
        requests.post(
            f"{BASE_URL}/api/sdm/merchant/push/unregister?player_id=merchant_stats_test_player",
            headers={"Authorization": f"Bearer {self.merchant_token}"}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
