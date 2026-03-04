"""
SDM REWARDS - System Rebuild Tests
===================================
Comprehensive tests for the modular architecture rebuild
Testing: Auth, Clients, Merchants, Admin APIs
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data - unique per run
TEST_RUN_ID = str(uuid.uuid4())[:6]
TEST_CLIENT_PHONE = f"054{TEST_RUN_ID}01"  # Will be normalized to +233
TEST_MERCHANT_PHONE = f"050{TEST_RUN_ID}02"

# Admin credentials from review request
ADMIN_EMAIL = "emileparfait2003@gmail.com"
ADMIN_PASSWORD = "Gerard0103@"


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_returns_healthy(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "healthy"
        assert data.get("service") == "SDM REWARDS API"
        assert "timestamp" in data
        print("✅ Health check returns healthy status")


class TestOTPEndpoints:
    """OTP (One-Time Password) tests - Test mode enabled"""
    
    def test_send_otp_returns_test_mode(self):
        """Test /api/auth/otp/send works in test mode"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": TEST_CLIENT_PHONE
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        assert "request_id" in data
        # Test mode should return TEST_ prefixed request_id
        assert data.get("test_mode") == True or data.get("request_id", "").startswith("TEST_")
        print(f"✅ OTP sent in test mode. Request ID: {data.get('request_id')}")
    
    def test_verify_otp_with_test_code(self):
        """Test /api/auth/otp/verify accepts 123456 in test mode"""
        # First send OTP
        send_res = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": "0541111111"
        })
        request_id = send_res.json().get("request_id")
        
        # Verify with test code
        response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": "0541111111",
            "otp_code": "123456",
            "request_id": request_id
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        print("✅ OTP verification works with test code 123456")
    
    def test_verify_otp_invalid_code_fails(self):
        """Test that invalid OTP code returns error"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": "0541111111",
            "otp_code": "999999",
            "request_id": "TEST_0541111111"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✅ Invalid OTP code correctly rejected")


class TestClientAuth:
    """Client authentication tests"""
    
    @pytest.fixture(scope="class")
    def registered_client(self):
        """Register a new client for testing"""
        payload = {
            "full_name": f"Test Client {TEST_RUN_ID}",
            "username": f"testuser{TEST_RUN_ID}",
            "phone": TEST_CLIENT_PHONE,
            "email": f"testclient{TEST_RUN_ID}@test.com",
            "password": "TestPass123",
            "otp_code": "123456",
            "request_id": f"TEST_{TEST_CLIENT_PHONE}"
        }
        response = requests.post(f"{BASE_URL}/api/auth/client/register", json=payload)
        
        if response.status_code == 400 and "already registered" in response.text.lower():
            # Client already exists, try to login instead
            login_res = requests.post(f"{BASE_URL}/api/auth/client/login", json={
                "phone": TEST_CLIENT_PHONE,
                "password": "TestPass123"
            })
            if login_res.status_code == 200:
                return login_res.json()
        
        assert response.status_code in [200, 201], f"Registration failed: {response.text}"
        return response.json()
    
    def test_client_register_creates_new_client(self, registered_client):
        """Test /api/auth/client/register creates new client"""
        assert registered_client.get("success") == True
        assert "access_token" in registered_client
        assert "client" in registered_client
        
        client = registered_client.get("client")
        assert "id" in client
        assert "referral_code" in client
        assert "qr_code" in client
        print(f"✅ Client registered successfully. ID: {client.get('id')}")
    
    def test_client_login_works_for_existing(self, registered_client):
        """Test /api/auth/client/login works for existing client"""
        response = requests.post(f"{BASE_URL}/api/auth/client/login", json={
            "phone": TEST_CLIENT_PHONE,
            "password": "TestPass123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "access_token" in data
        assert "client" in data
        print("✅ Client login successful")
    
    def test_client_login_invalid_credentials_fails(self):
        """Test that invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/client/login", json={
            "phone": "0541234567",
            "password": "WrongPassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid client credentials correctly rejected")


class TestMerchantAuth:
    """Merchant authentication tests"""
    
    @pytest.fixture(scope="class")
    def registered_merchant(self):
        """Register a new merchant for testing"""
        payload = {
            "business_name": f"Test Business {TEST_RUN_ID}",
            "owner_name": f"Test Owner {TEST_RUN_ID}",
            "phone": TEST_MERCHANT_PHONE,
            "email": f"testmerchant{TEST_RUN_ID}@test.com",
            "password": "MerchantPass123",
            "business_type": "Retail",
            "business_address": "Test Street 123",
            "otp_code": "123456",
            "request_id": f"TEST_{TEST_MERCHANT_PHONE}"
        }
        response = requests.post(f"{BASE_URL}/api/auth/merchant/register", json=payload)
        
        if response.status_code == 400 and "already registered" in response.text.lower():
            # Merchant already exists, try to login
            login_res = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
                "phone": TEST_MERCHANT_PHONE,
                "password": "MerchantPass123"
            })
            if login_res.status_code == 200:
                return login_res.json()
        
        assert response.status_code in [200, 201], f"Registration failed: {response.text}"
        return response.json()
    
    def test_merchant_register_creates_new_merchant(self, registered_merchant):
        """Test /api/auth/merchant/register creates new merchant"""
        assert registered_merchant.get("success") == True
        assert "access_token" in registered_merchant
        assert "merchant" in registered_merchant
        
        merchant = registered_merchant.get("merchant")
        assert "id" in merchant
        assert "payment_qr_code" in merchant
        assert "recruitment_qr_code" in merchant
        print(f"✅ Merchant registered successfully. ID: {merchant.get('id')}")
    
    def test_merchant_login_works_for_existing(self, registered_merchant):
        """Test /api/auth/merchant/login works for existing merchant"""
        response = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": TEST_MERCHANT_PHONE,
            "password": "MerchantPass123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "access_token" in data
        assert "merchant" in data
        print("✅ Merchant login successful")
    
    def test_merchant_login_invalid_credentials_fails(self):
        """Test that invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": "0509876543",
            "password": "WrongPassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid merchant credentials correctly rejected")


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_with_valid_credentials(self):
        """Test /api/auth/admin/login works with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "access_token" in data
        assert "admin" in data
        
        admin = data.get("admin")
        assert admin.get("email") == ADMIN_EMAIL
        print(f"✅ Admin login successful. Admin: {admin.get('email')}")
    
    def test_admin_login_invalid_credentials_fails(self):
        """Test that invalid admin credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid admin credentials correctly rejected")


class TestClientDashboard:
    """Client dashboard and cards tests"""
    
    @pytest.fixture
    def client_token(self):
        """Get client authentication token"""
        # Try with test client credentials
        response = requests.post(f"{BASE_URL}/api/auth/client/login", json={
            "phone": "0541234567",
            "password": "TestPass123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        
        # Register a new client if login fails
        reg_res = requests.post(f"{BASE_URL}/api/auth/client/register", json={
            "full_name": "Dashboard Test Client",
            "username": f"dashtest{uuid.uuid4().hex[:6]}",
            "phone": f"054{uuid.uuid4().hex[:7]}",
            "password": "TestPass123",
            "otp_code": "123456",
            "request_id": "TEST_dashboard"
        })
        if reg_res.status_code in [200, 201]:
            return reg_res.json().get("access_token")
        return None
    
    def test_available_cards_returns_3_types(self):
        """Test /api/clients/cards/available returns 3 card types"""
        response = requests.get(f"{BASE_URL}/api/clients/cards/available")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        cards = data.get("cards", [])
        assert len(cards) == 3, f"Expected 3 cards, got {len(cards)}"
        
        # Verify card types
        card_types = [c.get("type") for c in cards]
        assert "silver" in card_types
        assert "gold" in card_types
        assert "platinum" in card_types
        
        # Verify prices
        for card in cards:
            if card.get("type") == "silver":
                assert card.get("price") == 25
            elif card.get("type") == "gold":
                assert card.get("price") == 50
            elif card.get("type") == "platinum":
                assert card.get("price") == 100
        
        print("✅ Available cards endpoint returns 3 card types with correct prices")


class TestAdminDashboard:
    """Admin dashboard tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_admin_clients_list(self, admin_token):
        """Test /api/admin/clients lists all clients"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/clients", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "clients" in data
        assert "total" in data
        assert isinstance(data.get("clients"), list)
        print(f"✅ Admin clients list returned. Total: {data.get('total')}")
    
    def test_admin_merchants_list(self, admin_token):
        """Test /api/admin/merchants lists all merchants"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/merchants", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "merchants" in data
        assert "total" in data
        assert isinstance(data.get("merchants"), list)
        print(f"✅ Admin merchants list returned. Total: {data.get('total')}")
    
    def test_admin_requires_authentication(self):
        """Test admin endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/clients")
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        print("✅ Admin endpoints correctly require authentication")


class TestTokenValidation:
    """Token validation tests"""
    
    def test_auth_me_returns_user_info(self):
        """Test /api/auth/me returns user information"""
        # Login as admin
        login_res = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_res.json().get("access_token")
        
        # Call /api/auth/me
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "type" in data
        assert "user" in data
        assert data.get("type") == "admin"
        print("✅ Token validation returns correct user info")
    
    def test_invalid_token_rejected(self):
        """Test that invalid tokens are rejected"""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid token correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
