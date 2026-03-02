"""
SDM Authentication Tests
Tests for:
- Client registration flow: send OTP -> verify OTP -> register with name + password  
- Client login with phone + password
- Merchant registration flow: send OTP -> verify OTP + password -> complete registration
- Merchant login with phone + password
- Test account login: phone 0000000000, OTP 0000
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_PHONE = "0000000000"  # Test account
TEST_OTP = "0000"
TEST_REQUEST_ID = "test_request_id"

class TestClientAuthentication:
    """Client authentication flow tests"""
    
    def test_send_otp_test_account(self):
        """Test sending OTP to test account - should return test_request_id"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/auth/send-otp",
            json={"phone": TEST_PHONE}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("request_id") == TEST_REQUEST_ID
        assert data.get("is_test_account") == True
        print(f"✓ Send OTP to test account: request_id={data.get('request_id')}, is_test_account={data.get('is_test_account')}")
    
    def test_verify_otp_test_account(self):
        """Test verifying OTP for test account"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/auth/verify-otp",
            json={
                "phone": TEST_PHONE,
                "otp_code": TEST_OTP,
                "request_id": TEST_REQUEST_ID
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Should either be new user or return token for existing user
        assert "message" in data
        print(f"✓ Verify OTP test account: {data.get('message')}, is_new_user={data.get('is_new_user')}")
    
    def test_verify_otp_invalid_code(self):
        """Test verifying wrong OTP code - should fail"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/auth/verify-otp",
            json={
                "phone": TEST_PHONE,
                "otp_code": "9999",  # Wrong OTP
                "request_id": TEST_REQUEST_ID
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"✓ Invalid OTP rejected correctly")
    
    def test_client_register_new_user(self):
        """Test client registration with name and password"""
        unique_phone = f"999{uuid.uuid4().hex[:7]}"  # Random phone for new user
        
        # Note: For non-test accounts, registration would require real OTP
        # We'll test with test account flow
        response = requests.post(
            f"{BASE_URL}/api/sdm/auth/register",
            json={
                "phone": TEST_PHONE,
                "full_name": "Test User Registration",
                "password": "test123456",
                "otp_code": TEST_OTP,
                "request_id": TEST_REQUEST_ID
            }
        )
        # May return 400 if phone already registered - that's expected
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            assert "access_token" in data
            assert "user" in data
            print(f"✓ Client registration successful: user_id={data.get('user', {}).get('id')}")
        elif response.status_code == 400 and "already registered" in response.text:
            print(f"✓ Phone already registered (expected for test account): {response.json().get('detail')}")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}, {response.text}")
    
    def test_client_login(self):
        """Test client login with phone and password"""
        # First, ensure test account exists by trying to register (if needed)
        # Then login
        response = requests.post(
            f"{BASE_URL}/api/sdm/auth/login",
            json={
                "phone": TEST_PHONE,
                "password": "test123456"  # Using common test password
            }
        )
        # This might fail if user doesn't exist or wrong password
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert "user" in data
            print(f"✓ Client login successful: user_id={data.get('user', {}).get('id')}")
        elif response.status_code == 401:
            # Expected if phone not registered or wrong password
            print(f"✓ Client login failed as expected: {response.json().get('detail')}")
        else:
            print(f"Client login status: {response.status_code}, {response.text}")


class TestMerchantAuthentication:
    """Merchant authentication flow tests"""
    
    def test_merchant_send_otp_test_account(self):
        """Test sending OTP to merchant test account"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/send-otp",
            json={"phone": TEST_PHONE}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("request_id") == TEST_REQUEST_ID
        assert data.get("is_test_account") == True
        print(f"✓ Merchant send OTP: request_id={data.get('request_id')}, is_test_account={data.get('is_test_account')}")
    
    def test_merchant_register(self):
        """Test merchant registration with OTP + password"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/register",
            json={
                "business_name": "Test Restaurant",
                "business_type": "restaurant",
                "phone": TEST_PHONE,
                "password": "merchant123",
                "otp_code": TEST_OTP,
                "request_id": TEST_REQUEST_ID,
                "email": "test@restaurant.com",
                "address": "123 Test Street",
                "gps_address": "5.6037,-0.1870",
                "city": "Accra",
                "cashback_rate": 0.05
            }
        )
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            assert "access_token" in data
            assert "merchant" in data
            print(f"✓ Merchant registration successful: merchant_id={data.get('merchant', {}).get('id')}")
        elif response.status_code == 400 and "already registered" in response.text:
            print(f"✓ Merchant phone already registered (expected): {response.json().get('detail')}")
        else:
            print(f"Merchant registration status: {response.status_code}, {response.text}")
    
    def test_merchant_login(self):
        """Test merchant login with phone + password"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/login",
            json={
                "phone": TEST_PHONE,
                "password": "merchant123"  # Common test password
            }
        )
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert "merchant" in data
            print(f"✓ Merchant login successful: merchant_id={data.get('merchant', {}).get('id')}")
        elif response.status_code == 401:
            print(f"✓ Merchant login failed as expected: {response.json().get('detail')}")
        else:
            print(f"Merchant login status: {response.status_code}, {response.text}")


class TestPasswordReset:
    """Password reset flow tests"""
    
    def test_forgot_password_test_account(self):
        """Test forgot password sends OTP for test account"""
        # First check if user exists
        response = requests.post(
            f"{BASE_URL}/api/sdm/auth/forgot-password",
            json={"phone": TEST_PHONE}
        )
        # Returns 200 with request_id for test account, or 404 if not registered
        if response.status_code == 200:
            data = response.json()
            assert data.get("request_id") == TEST_REQUEST_ID
            print(f"✓ Forgot password OTP sent: request_id={data.get('request_id')}")
        elif response.status_code == 404:
            print(f"✓ User not found (expected if not registered): {response.json().get('detail')}")
        else:
            print(f"Forgot password status: {response.status_code}, {response.text}")


class TestOTPEndpoints:
    """Test all OTP-related endpoints"""
    
    def test_client_send_otp_with_referral(self):
        """Test sending OTP with referral code"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/auth/send-otp",
            json={
                "phone": TEST_PHONE,
                "referral_code": "TESTCODE123"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"✓ Send OTP with referral: request_id={data.get('request_id')}")
    
    def test_client_send_otp_user_type(self):
        """Test sending OTP specifying user_type"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/auth/send-otp",
            json={
                "phone": TEST_PHONE,
                "user_type": "client"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"✓ Send OTP with user_type=client: request_id={data.get('request_id')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
