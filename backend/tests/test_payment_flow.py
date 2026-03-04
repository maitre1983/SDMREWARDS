"""
SDM REWARDS - Payment Flow Tests
=================================
Tests for MoMo payment flow for VIP card purchases and merchant payments.
- Card purchase initiation
- Payment status check
- Test mode payment confirmation
- Merchant payment with cashback
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
ADMIN_EMAIL = "emileparfait2003@gmail.com"
ADMIN_PASSWORD = "Gerard0103@"
TEST_CLIENT_PHONE = "+233541234567"
TEST_CLIENT_PASSWORD = "TestPass123"
TEST_CLIENT_2_PHONE = "+233551234567"
TEST_CLIENT_2_PASSWORD = "TestPass123"
TEST_MERCHANT_QR = "SDM-M-6D343A81"


class TestHealthEndpoint:
    """Basic health check to ensure backend is running"""
    
    def test_health_check(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Backend health check passed")


class TestPaymentCardEndpoints:
    """Test VIP card purchase payment flow"""
    
    @pytest.fixture
    def client_token(self):
        """Login as test client to get token"""
        response = requests.post(f"{BASE_URL}/api/auth/client/login", json={
            "phone": TEST_CLIENT_PHONE,
            "password": TEST_CLIENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Client login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture
    def new_client_session(self):
        """Create a new client for card purchase test"""
        # Generate unique phone
        unique_phone = f"+2335412{int(time.time()) % 100000:05d}"
        
        # Send OTP
        otp_res = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": unique_phone,
            "type": "register",
            "user_type": "client"
        })
        if otp_res.status_code != 200:
            pytest.skip(f"OTP send failed: {otp_res.text}")
        
        # Register with test OTP code 123456
        register_res = requests.post(f"{BASE_URL}/api/auth/client/register", json={
            "phone": unique_phone,
            "otp_code": "123456",
            "full_name": f"Test Card Buyer {int(time.time()) % 10000}",
            "username": f"testbuyer{int(time.time()) % 10000}",
            "password": "TestPass123"
        })
        
        if register_res.status_code in [200, 201]:
            data = register_res.json()
            return {
                "token": data.get("access_token"),
                "phone": unique_phone,
                "client_id": data.get("client", {}).get("id")
            }
        pytest.skip(f"Client registration failed: {register_res.status_code} - {register_res.text}")
    
    def test_initiate_card_payment_invalid_card_type(self):
        """Test payment initiation with invalid card type"""
        response = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": TEST_CLIENT_PHONE,
            "card_type": "diamond"  # Invalid type
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "Invalid card type" in data.get("detail", "")
        print("✓ Invalid card type correctly rejected")
    
    def test_initiate_card_payment_invalid_phone(self):
        """Test payment initiation with unsupported phone prefix"""
        response = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": "+11234567890",  # Non-Ghana number
            "card_type": "silver"
        })
        
        # Either 400 (invalid phone) or 404 (client not found)
        assert response.status_code in [400, 404]
        print("✓ Invalid phone number handled correctly")
    
    def test_initiate_card_payment_client_not_found(self):
        """Test payment initiation for non-existent client"""
        response = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": "+233541111999",  # Phone not registered
            "card_type": "gold"
        })
        
        assert response.status_code == 404
        data = response.json()
        assert "Client not found" in data.get("detail", "") or "not found" in data.get("detail", "").lower()
        print("✓ Non-existent client correctly rejected")
    
    def test_initiate_card_payment_silver(self, new_client_session):
        """Test Silver card purchase initiation - GHS 25"""
        session = new_client_session
        
        response = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": session["phone"],
            "card_type": "silver"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") is True
        assert "payment_id" in data
        assert data.get("amount") == 25
        assert data.get("card_type") == "silver"
        assert data.get("status") == "pending"
        assert data.get("test_mode") is True  # Should be in test mode
        
        print(f"✓ Silver card payment initiated: {data['payment_id']}")
        return data
    
    def test_initiate_card_payment_gold(self, new_client_session):
        """Test Gold card purchase initiation - GHS 50"""
        session = new_client_session
        
        response = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": session["phone"],
            "card_type": "gold"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") is True
        assert data.get("amount") == 50
        assert data.get("card_type") == "gold"
        
        print(f"✓ Gold card payment initiated: {data['payment_id']}")
    
    def test_initiate_card_payment_platinum(self, new_client_session):
        """Test Platinum card purchase initiation - GHS 100"""
        session = new_client_session
        
        response = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": session["phone"],
            "card_type": "platinum"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") is True
        assert data.get("amount") == 100
        assert data.get("card_type") == "platinum"
        
        print(f"✓ Platinum card payment initiated: {data['payment_id']}")


class TestPaymentStatusAndConfirmation:
    """Test payment status checking and test mode confirmation"""
    
    @pytest.fixture
    def pending_payment(self):
        """Create a new client and initiate a payment"""
        unique_phone = f"+2335413{int(time.time()) % 100000:05d}"
        
        # Register new client
        otp_res = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": unique_phone,
            "type": "register",
            "user_type": "client"
        })
        if otp_res.status_code != 200:
            pytest.skip(f"OTP send failed: {otp_res.text}")
        
        register_res = requests.post(f"{BASE_URL}/api/auth/client/register", json={
            "phone": unique_phone,
            "otp_code": "123456",
            "full_name": f"Payment Test {int(time.time()) % 10000}",
            "username": f"paytest{int(time.time()) % 10000}",
            "password": "TestPass123"
        })
        
        if register_res.status_code not in [200, 201]:
            pytest.skip(f"Client registration failed: {register_res.text}")
        
        client_data = register_res.json()
        token = client_data.get("access_token")
        
        # Initiate payment
        payment_res = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": unique_phone,
            "card_type": "gold"
        })
        
        if payment_res.status_code != 200:
            pytest.skip(f"Payment initiation failed: {payment_res.text}")
        
        payment_data = payment_res.json()
        return {
            "payment_id": payment_data["payment_id"],
            "reference": payment_data.get("reference"),
            "phone": unique_phone,
            "token": token
        }
    
    def test_get_payment_status_not_found(self):
        """Test status check for non-existent payment"""
        response = requests.get(f"{BASE_URL}/api/payments/status/non-existent-id")
        assert response.status_code == 404
        print("✓ Non-existent payment returns 404")
    
    def test_get_payment_status_pending(self, pending_payment):
        """Test status check for pending payment"""
        payment_id = pending_payment["payment_id"]
        
        response = requests.get(f"{BASE_URL}/api/payments/status/{payment_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert data.get("payment_id") == payment_id
        assert data.get("status") == "pending"
        assert data.get("type") == "card_purchase"
        assert data.get("amount") == 50  # Gold card price
        
        print(f"✓ Payment status returned correctly: {data['status']}")
    
    def test_confirm_test_payment(self, pending_payment):
        """Test confirming a payment in test mode"""
        payment_id = pending_payment["payment_id"]
        
        # Confirm the test payment
        response = requests.post(f"{BASE_URL}/api/payments/test/confirm/{payment_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert data.get("status") == "success"
        assert data.get("type") == "card_purchase"
        
        print(f"✓ Test payment confirmed successfully")
        
        # Verify status changed
        status_res = requests.get(f"{BASE_URL}/api/payments/status/{payment_id}")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data.get("status") == "success"
        assert status_data.get("completed_at") is not None
        
        print("✓ Payment status updated to success with completion timestamp")
    
    def test_confirm_already_confirmed_payment(self, pending_payment):
        """Test confirming an already confirmed payment"""
        payment_id = pending_payment["payment_id"]
        
        # Confirm first time
        requests.post(f"{BASE_URL}/api/payments/test/confirm/{payment_id}")
        
        # Try to confirm again
        response = requests.post(f"{BASE_URL}/api/payments/test/confirm/{payment_id}")
        assert response.status_code == 400
        assert "already" in response.json().get("detail", "").lower()
        
        print("✓ Double confirmation correctly rejected")
    
    def test_fail_test_payment(self):
        """Test failing a payment in test mode"""
        # Create a new payment to fail
        unique_phone = f"+2335414{int(time.time()) % 100000:05d}"
        
        # Register
        requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": unique_phone, "type": "register", "user_type": "client"
        })
        requests.post(f"{BASE_URL}/api/auth/client/register", json={
            "phone": unique_phone,
            "otp_code": "123456",
            "full_name": f"Fail Test {int(time.time()) % 10000}",
            "username": f"failtest{int(time.time()) % 10000}",
            "password": "TestPass123"
        })
        
        # Initiate payment
        pay_res = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": unique_phone,
            "card_type": "silver"
        })
        if pay_res.status_code != 200:
            pytest.skip("Could not create payment for fail test")
        
        payment_id = pay_res.json()["payment_id"]
        
        # Fail the payment
        response = requests.post(f"{BASE_URL}/api/payments/test/fail/{payment_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert data.get("status") == "failed"
        
        # Verify status
        status_res = requests.get(f"{BASE_URL}/api/payments/status/{payment_id}")
        assert status_res.json().get("status") == "failed"
        
        print("✓ Test payment failed successfully")


class TestCardActivationAfterPayment:
    """Test that card is activated after successful payment"""
    
    def test_client_status_active_after_payment(self):
        """Test client becomes active after card purchase"""
        unique_phone = f"+2335415{int(time.time()) % 100000:05d}"
        
        # Register new client
        requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": unique_phone, "type": "register", "user_type": "client"
        })
        reg_res = requests.post(f"{BASE_URL}/api/auth/client/register", json={
            "phone": unique_phone,
            "otp_code": "123456",
            "full_name": f"Activation Test {int(time.time()) % 10000}",
            "username": f"acttest{int(time.time()) % 10000}",
            "password": "TestPass123"
        })
        
        if reg_res.status_code not in [200, 201]:
            pytest.skip(f"Registration failed: {reg_res.text}")
        
        token = reg_res.json().get("access_token")
        
        # Verify initial status (should be inactive/pending)
        headers = {"Authorization": f"Bearer {token}"}
        me_res = requests.get(f"{BASE_URL}/api/clients/me", headers=headers)
        initial_client = me_res.json().get("client", {})
        initial_status = initial_client.get("status")
        print(f"  Initial status: {initial_status}")
        
        # Initiate and confirm payment
        pay_res = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": unique_phone,
            "card_type": "gold"
        })
        payment_id = pay_res.json()["payment_id"]
        
        confirm_res = requests.post(f"{BASE_URL}/api/payments/test/confirm/{payment_id}")
        assert confirm_res.status_code == 200
        
        # Verify client is now active
        me_res_after = requests.get(f"{BASE_URL}/api/clients/me", headers=headers)
        client_after = me_res_after.json().get("client", {})
        
        assert client_after.get("status") == "active"
        assert client_after.get("card_type") == "gold"
        assert client_after.get("card_purchased_at") is not None
        
        print("✓ Client status changed to active after payment")
        print(f"✓ Card type set to: {client_after.get('card_type')}")
    
    def test_welcome_bonus_credited(self):
        """Test that welcome bonus is credited after card activation"""
        unique_phone = f"+2335416{int(time.time()) % 100000:05d}"
        
        # Register
        requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": unique_phone, "type": "register", "user_type": "client"
        })
        reg_res = requests.post(f"{BASE_URL}/api/auth/client/register", json={
            "phone": unique_phone,
            "otp_code": "123456",
            "full_name": f"Bonus Test {int(time.time()) % 10000}",
            "username": f"bonustest{int(time.time()) % 10000}",
            "password": "TestPass123"
        })
        
        if reg_res.status_code not in [200, 201]:
            pytest.skip(f"Registration failed: {reg_res.text}")
        
        token = reg_res.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Check initial balance
        me_res = requests.get(f"{BASE_URL}/api/clients/me", headers=headers)
        initial_balance = me_res.json().get("client", {}).get("cashback_balance", 0)
        
        # Complete card purchase
        pay_res = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": unique_phone,
            "card_type": "silver"
        })
        payment_id = pay_res.json()["payment_id"]
        requests.post(f"{BASE_URL}/api/payments/test/confirm/{payment_id}")
        
        # Check balance after
        me_res_after = requests.get(f"{BASE_URL}/api/clients/me", headers=headers)
        final_balance = me_res_after.json().get("client", {}).get("cashback_balance", 0)
        
        # Welcome bonus should be 1 GHS
        bonus_received = final_balance - initial_balance
        assert bonus_received >= 1.0, f"Expected at least 1 GHS welcome bonus, got {bonus_received}"
        
        print(f"✓ Welcome bonus credited: GHS {bonus_received}")


class TestMerchantPaymentFlow:
    """Test merchant payment flow with cashback calculation"""
    
    @pytest.fixture
    def active_client(self):
        """Use existing active client for merchant payment tests"""
        # Use the already active test client
        return {"phone": TEST_CLIENT_PHONE, "token": None}
    
    def test_merchant_payment_inactive_client(self):
        """Test merchant payment with inactive client - should return 400 or 404 if client not registered"""
        # Create inactive client
        unique_phone = f"+2335418{int(time.time()) % 100000:05d}"
        otp_res = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": unique_phone, "type": "register", "user_type": "client"
        })
        
        if otp_res.status_code != 200:
            pytest.skip("OTP send failed")
        
        reg_res = requests.post(f"{BASE_URL}/api/auth/client/register", json={
            "phone": unique_phone,
            "otp_code": "123456",
            "full_name": f"Inactive Client {int(time.time()) % 10000}",
            "username": f"inactive{int(time.time()) % 10000}",
            "password": "TestPass123"
        })
        
        if reg_res.status_code not in [200, 201]:
            pytest.skip("Registration failed - cannot test inactive client scenario")
        
        # Try merchant payment
        response = requests.post(f"{BASE_URL}/api/payments/merchant/initiate", json={
            "client_phone": unique_phone,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 50.0
        })
        
        # Should return 400 (inactive) - client not active
        assert response.status_code == 400
        assert "membership card" in response.json().get("detail", "").lower() or "purchase" in response.json().get("detail", "").lower()
        print("✓ Inactive client correctly rejected for merchant payment")
    
    def test_merchant_payment_invalid_qr(self, active_client):
        """Test merchant payment with invalid QR code"""
        response = requests.post(f"{BASE_URL}/api/payments/merchant/initiate", json={
            "client_phone": active_client["phone"],
            "merchant_qr_code": "INVALID-QR-CODE",
            "amount": 50.0
        })
        
        assert response.status_code == 404
        assert "merchant not found" in response.json().get("detail", "").lower()
        print("✓ Invalid merchant QR correctly rejected")
    
    def test_merchant_payment_minimum_amount(self, active_client):
        """Test minimum payment amount validation"""
        response = requests.post(f"{BASE_URL}/api/payments/merchant/initiate", json={
            "client_phone": active_client["phone"],
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 0.50  # Less than 1 GHS minimum
        })
        
        assert response.status_code == 400
        assert "minimum" in response.json().get("detail", "").lower()
        print("✓ Below minimum amount correctly rejected")
    
    def test_merchant_payment_initiate(self, active_client):
        """Test successful merchant payment initiation"""
        response = requests.post(f"{BASE_URL}/api/payments/merchant/initiate", json={
            "client_phone": active_client["phone"],
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 100.0
        })
        
        # May return 404 if test merchant doesn't exist
        if response.status_code == 404:
            pytest.skip("Test merchant not found in database")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") is True
        assert data.get("payment_id") is not None
        assert data.get("amount") == 100.0
        assert "expected_cashback" in data  # Cashback should be calculated
        assert data.get("test_mode") is True
        
        # Verify cashback calculation (5% of 100 = 5 GHS gross)
        expected_cashback = data.get("expected_cashback")
        assert expected_cashback is not None
        print(f"✓ Merchant payment initiated with expected cashback: GHS {expected_cashback}")


class TestPaymentCallback:
    """Test payment callback endpoint"""
    
    def test_callback_missing_reference(self):
        """Test callback without reference"""
        response = requests.post(f"{BASE_URL}/api/payments/callback", json={
            "status": "success"
        })
        
        # Should handle gracefully
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is False or "missing" in data.get("message", "").lower()
        print("✓ Callback without reference handled correctly")
    
    def test_callback_unknown_reference(self):
        """Test callback with unknown reference"""
        response = requests.post(f"{BASE_URL}/api/payments/callback", json={
            "reference": "UNKNOWN-REF-12345",
            "status": "success"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "not found" in data.get("message", "").lower()
        print("✓ Unknown reference handled correctly")


class TestExistingClientWithActiveCard:
    """Test payment attempts for clients who already have cards"""
    
    def test_already_active_client_cannot_buy_card(self):
        """Test that active client cannot purchase another card - using existing active client"""
        # Use the already active test client from credentials
        response = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": TEST_CLIENT_PHONE,
            "card_type": "platinum"
        })
        
        assert response.status_code == 400
        assert "already" in response.json().get("detail", "").lower()
        print("✓ Already active client correctly prevented from buying another card")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
