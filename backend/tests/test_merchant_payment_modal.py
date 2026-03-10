"""
SDM REWARDS - Merchant Payment Modal Tests
==========================================
Tests for the 4 payment methods: MoMo, Cash, Cashback, Hybrid

Test cases:
1. GET /api/merchants/by-qr/{code} - Merchant lookup by QR code
2. POST /api/payments/merchant/cashback - Cashback payment
3. POST /api/payments/merchant/cashback - Hybrid payment
4. POST /api/payments/merchant/cash - Cash payment
5. POST /api/payments/merchant/initiate - MoMo payment
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENT_PHONE = "+233555861556"
CLIENT_PASSWORD = "000000"
MERCHANT_QR_CODE = "TESTSHOP001"


@pytest.fixture(scope="module")
def client_token():
    """Login and get client token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/client/login",
        json={"phone": CLIENT_PHONE, "password": CLIENT_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Client login failed - cannot run authenticated tests")


@pytest.fixture(scope="module")
def client_data(client_token):
    """Get client data including cashback balance"""
    headers = {"Authorization": f"Bearer {client_token}"}
    response = requests.get(f"{BASE_URL}/api/clients/me", headers=headers)
    if response.status_code == 200:
        return response.json().get("client")
    return None


class TestMerchantQRLookup:
    """Tests for merchant QR code lookup"""
    
    def test_merchant_lookup_by_qr_success(self):
        """Test GET /api/merchants/by-qr/{code} returns merchant info"""
        response = requests.get(f"{BASE_URL}/api/merchants/by-qr/{MERCHANT_QR_CODE}")
        
        assert response.status_code == 200
        data = response.json()
        assert "merchant" in data
        merchant = data["merchant"]
        assert merchant["payment_qr_code"] == MERCHANT_QR_CODE
        assert merchant["business_name"] == "Test Shop Ghana"
        assert merchant["status"] == "active"
        assert "cashback_rate" in merchant
        assert "cash_payment" in merchant
        print(f"Merchant found: {merchant['business_name']} with {merchant['cashback_rate']}% cashback")
    
    def test_merchant_lookup_invalid_qr(self):
        """Test merchant lookup with invalid QR code returns 404"""
        response = requests.get(f"{BASE_URL}/api/merchants/by-qr/INVALID_QR_CODE")
        
        assert response.status_code == 404
        print("Invalid QR code correctly returns 404")
    
    def test_merchant_cash_payment_info(self):
        """Test merchant includes cash payment availability info"""
        response = requests.get(f"{BASE_URL}/api/merchants/by-qr/{MERCHANT_QR_CODE}")
        
        assert response.status_code == 200
        merchant = response.json()["merchant"]
        
        # Check cash_payment field exists
        assert "cash_payment" in merchant
        cash_info = merchant["cash_payment"]
        assert "available" in cash_info
        print(f"Cash payment available: {cash_info['available']}")


class TestCashbackPayment:
    """Tests for cashback payment endpoint"""
    
    def test_cashback_payment_requires_auth(self):
        """Test cashback payment requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/payments/merchant/cashback",
            json={
                "client_phone": CLIENT_PHONE,
                "merchant_qr_code": MERCHANT_QR_CODE,
                "amount": 1.0,
                "payment_method": "cashback",
                "cashback_to_use": 1.0,
                "momo_amount": 0
            }
        )
        
        # Without auth token, should return 401 or 422 (validation error)
        assert response.status_code in [401, 422]
        print(f"Cashback payment requires authentication (status: {response.status_code})")
    
    def test_cashback_payment_minimum_amount(self, client_token):
        """Test minimum payment amount is enforced (GHS 1)"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.post(
            f"{BASE_URL}/api/payments/merchant/cashback",
            headers=headers,
            json={
                "client_phone": CLIENT_PHONE,
                "merchant_qr_code": MERCHANT_QR_CODE,
                "amount": 0.5,  # Less than minimum
                "payment_method": "cashback",
                "cashback_to_use": 0.5,
                "momo_amount": 0
            }
        )
        
        assert response.status_code == 400
        assert "Minimum payment is GHS 1" in response.json().get("detail", "")
        print("Minimum amount validation working")
    
    def test_cashback_payment_insufficient_balance(self, client_token, client_data):
        """Test cashback payment with insufficient balance fails"""
        headers = {"Authorization": f"Bearer {client_token}"}
        current_balance = client_data.get("cashback_balance", 0) if client_data else 0
        
        # Request amount greater than balance
        request_amount = current_balance + 100
        
        response = requests.post(
            f"{BASE_URL}/api/payments/merchant/cashback",
            headers=headers,
            json={
                "client_phone": CLIENT_PHONE,
                "merchant_qr_code": MERCHANT_QR_CODE,
                "amount": request_amount,
                "payment_method": "cashback",
                "cashback_to_use": request_amount,
                "momo_amount": 0
            }
        )
        
        assert response.status_code == 400
        assert "Insufficient cashback balance" in response.json().get("detail", "")
        print(f"Insufficient balance validation working (balance: {current_balance}, requested: {request_amount})")


class TestHybridPayment:
    """Tests for hybrid payment (cashback + MoMo)"""
    
    def test_hybrid_payment_amounts_must_add_up(self, client_token, client_data):
        """Test hybrid payment validates amounts add up to total"""
        headers = {"Authorization": f"Bearer {client_token}"}
        balance = client_data.get("cashback_balance", 0) if client_data else 0
        
        # Use a small cashback_to_use within balance and wrong momo_amount
        cashback_to_use = min(balance, 0.1)
        
        response = requests.post(
            f"{BASE_URL}/api/payments/merchant/cashback",
            headers=headers,
            json={
                "client_phone": CLIENT_PHONE,
                "merchant_qr_code": MERCHANT_QR_CODE,
                "amount": 10.0,
                "payment_method": "hybrid",
                "cashback_to_use": cashback_to_use,
                "momo_amount": 5.0  # Should be 10.0 - cashback_to_use
            }
        )
        
        assert response.status_code == 400
        detail = response.json().get("detail", "")
        # Should fail because amounts don't add up OR insufficient balance
        assert "don't add up" in detail or "Insufficient" in detail
        print(f"Hybrid payment validation working: {detail}")
    
    def test_hybrid_payment_invalid_merchant(self, client_token):
        """Test hybrid payment with invalid merchant QR fails"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.post(
            f"{BASE_URL}/api/payments/merchant/cashback",
            headers=headers,
            json={
                "client_phone": CLIENT_PHONE,
                "merchant_qr_code": "INVALID_QR",
                "amount": 5.0,
                "payment_method": "hybrid",
                "cashback_to_use": 0.1,
                "momo_amount": 4.9
            }
        )
        
        assert response.status_code == 404
        print("Invalid merchant QR correctly returns 404")


class TestCashPayment:
    """Tests for cash payment endpoint"""
    
    def test_cash_payment_endpoint_exists(self):
        """Test cash payment endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/payments/merchant/cash",
            json={
                "client_phone": CLIENT_PHONE,
                "merchant_qr_code": MERCHANT_QR_CODE,
                "amount": 5.0
            }
        )
        
        # Should not be 404 (endpoint exists)
        assert response.status_code != 404
        print(f"Cash payment endpoint exists, returned status: {response.status_code}")
    
    def test_cash_payment_minimum_amount(self):
        """Test cash payment minimum amount validation"""
        response = requests.post(
            f"{BASE_URL}/api/payments/merchant/cash",
            json={
                "client_phone": CLIENT_PHONE,
                "merchant_qr_code": MERCHANT_QR_CODE,
                "amount": 0.5  # Less than minimum
            }
        )
        
        assert response.status_code == 400
        assert "Minimum payment is GHS 1" in response.json().get("detail", "")
        print("Cash payment minimum amount validation working")


class TestMoMoPayment:
    """Tests for MoMo payment endpoint"""
    
    def test_momo_payment_endpoint_exists(self):
        """Test MoMo payment initiation endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/payments/merchant/initiate",
            json={
                "client_phone": CLIENT_PHONE,
                "merchant_qr_code": MERCHANT_QR_CODE,
                "amount": 5.0,
                "network": "MTN"
            }
        )
        
        # Should not be 404 (endpoint exists)
        assert response.status_code != 404
        print(f"MoMo payment endpoint exists, returned status: {response.status_code}")
    
    def test_momo_payment_minimum_amount(self):
        """Test MoMo payment minimum amount validation"""
        response = requests.post(
            f"{BASE_URL}/api/payments/merchant/initiate",
            json={
                "client_phone": CLIENT_PHONE,
                "merchant_qr_code": MERCHANT_QR_CODE,
                "amount": 0.5,
                "network": "MTN"
            }
        )
        
        assert response.status_code == 400
        assert "Minimum payment is GHS 1" in response.json().get("detail", "")
        print("MoMo payment minimum amount validation working")


class TestClientCashbackBalance:
    """Tests for client cashback balance"""
    
    def test_client_has_cashback_balance_field(self, client_token):
        """Test client profile includes cashback balance"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(f"{BASE_URL}/api/clients/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "client" in data
        client = data["client"]
        assert "cashback_balance" in client
        print(f"Client cashback balance: GHS {client['cashback_balance']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
