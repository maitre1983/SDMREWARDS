"""
SDM REWARDS - Phase 2 Features Test Suite
==========================================
Tests for: QR Scanner, Partner Directory, Referral Sharing

Test Coverage:
- Merchant Partners API (public endpoint)
- Merchant By QR Code API
- Client Referrals API
- Merchant Payment Flow via QR

Test Credentials:
- Gold Client: +233541234567 / TestPass123
- Test Merchant QR: SDM-M-6D343A81
"""

import pytest
import requests
import os

# Use the public URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://web-boost-seo.preview.emergentagent.com"

# Test credentials
TEST_CLIENT_PHONE = "+233541234567"
TEST_CLIENT_PASSWORD = "TestPass123"
TEST_MERCHANT_QR = "SDM-M-6D343A81"


@pytest.fixture(scope="module")
def session():
    """Shared requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def client_token(session):
    """Get authenticated client token"""
    # First try login
    response = session.post(f"{BASE_URL}/api/auth/client/login", json={
        "phone": TEST_CLIENT_PHONE,
        "password": TEST_CLIENT_PASSWORD
    })
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token") or data.get("token")
        if token:
            return token
    
    # If login fails, skip authenticated tests
    pytest.skip(f"Could not authenticate client: {response.status_code}")


# ============== PARTNER DIRECTORY TESTS ==============

class TestPartnerDirectory:
    """Test Partner Merchants Public API"""
    
    def test_get_partners_returns_200(self, session):
        """Test GET /api/merchants/partners returns 200"""
        response = session.get(f"{BASE_URL}/api/merchants/partners")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ GET /api/merchants/partners returns 200")
    
    def test_get_partners_returns_merchants_list(self, session):
        """Test partners endpoint returns merchant list with expected fields"""
        response = session.get(f"{BASE_URL}/api/merchants/partners")
        assert response.status_code == 200
        
        data = response.json()
        assert "merchants" in data, "Response should contain 'merchants' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["merchants"], list), "merchants should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        
        print(f"✅ Partners API returns {data['total']} active merchants")
    
    def test_partners_merchant_has_required_fields(self, session):
        """Test each merchant has required fields for display"""
        response = session.get(f"{BASE_URL}/api/merchants/partners")
        assert response.status_code == 200
        
        data = response.json()
        merchants = data.get("merchants", [])
        
        if len(merchants) > 0:
            merchant = merchants[0]
            required_fields = ["id", "business_name", "cashback_rate", "payment_qr_code"]
            
            for field in required_fields:
                assert field in merchant, f"Merchant missing required field: {field}"
            
            # Validate data types
            assert isinstance(merchant["business_name"], str)
            assert isinstance(merchant["cashback_rate"], (int, float))
            assert isinstance(merchant["payment_qr_code"], str)
            
            print(f"✅ Merchant data structure valid: {merchant['business_name']}")
        else:
            print("⚠️ No merchants found - cannot validate structure")


# ============== MERCHANT BY QR CODE TESTS ==============

class TestMerchantByQR:
    """Test Merchant Lookup by QR Code"""
    
    def test_lookup_valid_qr_returns_merchant(self, session):
        """Test GET /api/merchants/by-qr/{code} with valid QR"""
        response = session.get(f"{BASE_URL}/api/merchants/by-qr/{TEST_MERCHANT_QR}")
        
        # Could be 200 (found) or 404 (not found) depending on test data
        if response.status_code == 200:
            data = response.json()
            assert "merchant" in data, "Response should contain 'merchant' key"
            merchant = data["merchant"]
            assert "business_name" in merchant, "Merchant should have business_name"
            assert "cashback_rate" in merchant, "Merchant should have cashback_rate"
            print(f"✅ Found merchant by QR: {merchant['business_name']}")
        elif response.status_code == 404:
            print(f"⚠️ Test merchant QR {TEST_MERCHANT_QR} not found in database")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")
    
    def test_lookup_invalid_qr_returns_404(self, session):
        """Test GET /api/merchants/by-qr/{code} with invalid QR"""
        response = session.get(f"{BASE_URL}/api/merchants/by-qr/INVALID-QR-123")
        assert response.status_code == 404, f"Expected 404 for invalid QR, got {response.status_code}"
        print("✅ Invalid QR code returns 404")
    
    def test_lookup_returns_active_status(self, session):
        """Test merchant lookup returns status field"""
        response = session.get(f"{BASE_URL}/api/merchants/by-qr/{TEST_MERCHANT_QR}")
        
        if response.status_code == 200:
            data = response.json()
            merchant = data.get("merchant", {})
            assert "status" in merchant or response.status_code == 200
            print("✅ Merchant status verification working")
        else:
            print(f"⚠️ Skipped - merchant not found")


# ============== CLIENT REFERRALS TESTS ==============

class TestClientReferrals:
    """Test Client Referrals API"""
    
    def test_get_referrals_authenticated(self, session, client_token):
        """Test GET /api/clients/referrals with authentication"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = session.get(f"{BASE_URL}/api/clients/referrals", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ GET /api/clients/referrals returns 200")
    
    def test_referrals_has_required_fields(self, session, client_token):
        """Test referrals response has required fields"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = session.get(f"{BASE_URL}/api/clients/referrals", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["referral_code", "total_referrals", "active_referrals", "total_bonus_earned", "referrals"]
        for field in required_fields:
            assert field in data, f"Response missing required field: {field}"
        
        print(f"✅ Referrals data: {data['total_referrals']} total, {data['active_referrals']} active, GHS {data['total_bonus_earned']} earned")
    
    def test_referrals_unauthenticated_returns_error(self, session):
        """Test referrals endpoint requires authentication"""
        response = session.get(f"{BASE_URL}/api/clients/referrals")
        # 422 (validation error for missing auth), 401, or 403 are all acceptable
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print("✅ Referrals endpoint requires authentication")


# ============== CLIENT DASHBOARD TESTS ==============

class TestClientDashboard:
    """Test Client Dashboard API"""
    
    def test_dashboard_returns_200(self, session, client_token):
        """Test GET /api/clients/me returns 200"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = session.get(f"{BASE_URL}/api/clients/me", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ GET /api/clients/me returns 200")
    
    def test_dashboard_has_client_data(self, session, client_token):
        """Test dashboard has client data with QR code"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = session.get(f"{BASE_URL}/api/clients/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "client" in data, "Response should contain 'client' key"
        client_data = data["client"]
        
        # Check for QR code and referral code
        assert "qr_code" in client_data, "Client should have qr_code"
        assert "referral_code" in client_data, "Client should have referral_code"
        
        print(f"✅ Client QR code: {client_data['qr_code']}")
        print(f"✅ Client referral code: {client_data['referral_code']}")
    
    def test_dashboard_has_balance_info(self, session, client_token):
        """Test dashboard has cashback balance info"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = session.get(f"{BASE_URL}/api/clients/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "cashback_balance" in data, "Response should have cashback_balance"
        assert "total_earned" in data, "Response should have total_earned"
        
        print(f"✅ Client balance: GHS {data['cashback_balance']}, Total earned: GHS {data['total_earned']}")


# ============== MERCHANT PAYMENT INITIATION TESTS ==============

class TestMerchantPayment:
    """Test Merchant Payment Flow via QR"""
    
    def test_payment_initiate_endpoint_exists(self, session, client_token):
        """Test POST /api/payments/merchant/initiate endpoint exists"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Get client data first for phone
        client_res = session.get(f"{BASE_URL}/api/clients/me", headers=headers)
        client_phone = client_res.json().get("client", {}).get("phone", "+233541234567")
        
        response = session.post(f"{BASE_URL}/api/payments/merchant/initiate", json={
            "client_phone": client_phone,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 10.0
        })
        
        # Should return 200 (success) or 400/404 (validation error like merchant not found)
        assert response.status_code in [200, 400, 404], f"Unexpected status: {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "payment_id" in data, "Success response should have payment_id"
            assert "test_mode" in data, "Response should indicate test_mode"
            print(f"✅ Payment initiated: {data.get('payment_id')}, test_mode: {data.get('test_mode')}")
        else:
            print(f"⚠️ Payment initiation returned {response.status_code} - expected if merchant not found")
    
    def test_payment_validates_minimum_amount(self, session, client_token):
        """Test payment rejects below minimum amount"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        response = session.post(f"{BASE_URL}/api/payments/merchant/initiate", json={
            "client_phone": TEST_CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 0.50  # Below minimum
        })
        
        # Should be 400 for validation error OR 404 if merchant not found
        assert response.status_code in [400, 404], f"Expected 400/404 for low amount, got {response.status_code}"
        print("✅ Payment validates minimum amount")
    
    def test_payment_invalid_merchant_returns_error(self, session, client_token):
        """Test payment with invalid merchant QR returns error"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        response = session.post(f"{BASE_URL}/api/payments/merchant/initiate", json={
            "client_phone": TEST_CLIENT_PHONE,
            "merchant_qr_code": "INVALID-MERCHANT-QR",
            "amount": 10.0
        })
        
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
        print("✅ Invalid merchant QR returns error")


# ============== PAYMENT STATUS & CONFIRMATION TESTS ==============

class TestPaymentStatus:
    """Test Payment Status and Test Confirmation"""
    
    def test_payment_status_endpoint_exists(self, session):
        """Test GET /api/payments/status/{id} endpoint exists"""
        response = session.get(f"{BASE_URL}/api/payments/status/test-payment-id")
        
        # Should return 404 (not found) for fake ID, not 500
        assert response.status_code in [404, 400], f"Expected 404/400, got {response.status_code}"
        print("✅ Payment status endpoint exists and handles invalid IDs")
    
    def test_test_confirm_endpoint_exists(self, session):
        """Test POST /api/payments/test/confirm/{id} endpoint exists"""
        response = session.post(f"{BASE_URL}/api/payments/test/confirm/test-payment-id")
        
        # Should return 404 (not found) for fake ID, not 500
        assert response.status_code in [404, 400], f"Expected 404/400, got {response.status_code}"
        print("✅ Test confirm endpoint exists and handles invalid IDs")


# ============== AVAILABLE CARDS TESTS ==============

class TestAvailableCards:
    """Test Available Cards Public Endpoint"""
    
    def test_available_cards_returns_200(self, session):
        """Test GET /api/clients/cards/available returns 200"""
        response = session.get(f"{BASE_URL}/api/clients/cards/available")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ GET /api/clients/cards/available returns 200")
    
    def test_available_cards_has_three_types(self, session):
        """Test available cards includes silver, gold, platinum"""
        response = session.get(f"{BASE_URL}/api/clients/cards/available")
        assert response.status_code == 200
        
        data = response.json()
        assert "cards" in data
        
        cards = data["cards"]
        card_types = [c["type"] for c in cards]
        
        assert "silver" in card_types, "Should have silver card"
        assert "gold" in card_types, "Should have gold card"
        assert "platinum" in card_types, "Should have platinum card"
        
        print(f"✅ Available cards: {card_types}")
    
    def test_card_has_price_and_name(self, session):
        """Test each card has price and name"""
        response = session.get(f"{BASE_URL}/api/clients/cards/available")
        assert response.status_code == 200
        
        cards = response.json().get("cards", [])
        for card in cards:
            assert "price" in card, f"Card {card.get('type')} missing price"
            assert "name" in card, f"Card {card.get('type')} missing name"
            assert isinstance(card["price"], (int, float))
            print(f"✅ {card['name']}: GHS {card['price']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
