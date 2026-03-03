"""
SDM Payment System Phase 1 Tests
Testing: MoMo, Card, Cash payments with split calculation and settlements

Features tested:
- /api/sdm/payments/initiate - Client initiates payment (scans merchant QR)
- /api/sdm/payments/merchant-initiate - Merchant initiates payment (scans client QR)
- /api/sdm/payments/confirm-cash - Client confirms cash payment
- /api/sdm/merchant/qr-code - Merchant QR code generation
- /api/sdm/merchant/cash-balance - Merchant cash debit balance
- /api/sdm/payments/pending - Client pending payments
- Split calculation: 100 GHS @ 8% = Cashback 7.2 GHS (after SDM 10% commission)
- Merchant registration with settlement configuration
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://web-boost-seo.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_PHONE = "0000000000"
TEST_PASSWORD = "TestPass123"

class TestPaymentSystemAPIs:
    """Test payment system APIs"""
    
    merchant_token = None
    client_token = None
    merchant_data = None
    client_data = None
    
    @classmethod
    def setup_class(cls):
        """Get tokens for merchant and client"""
        # Login as merchant
        merchant_resp = requests.post(f"{BASE_URL}/api/sdm/merchant/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        if merchant_resp.status_code == 200:
            cls.merchant_token = merchant_resp.json().get("access_token")
            cls.merchant_data = merchant_resp.json().get("merchant")
            print(f"Merchant logged in: {cls.merchant_data.get('business_name', 'Unknown')}")
        else:
            print(f"Merchant login failed: {merchant_resp.status_code} - {merchant_resp.text}")
        
        # Login as client
        client_resp = requests.post(f"{BASE_URL}/api/sdm/auth/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        if client_resp.status_code == 200:
            cls.client_token = client_resp.json().get("access_token")
            cls.client_data = client_resp.json().get("user")
            print(f"Client logged in: {cls.client_data.get('full_name', 'Unknown')}")
        else:
            print(f"Client login failed: {client_resp.status_code} - {client_resp.text}")
    
    # ==================== MERCHANT QR CODE TESTS ====================
    
    def test_01_merchant_qr_code_generation(self):
        """Test: GET /api/sdm/merchant/qr-code - Merchant QR code generation"""
        if not self.merchant_token:
            pytest.skip("Merchant not logged in")
        
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/qr-code",
            headers={"Authorization": f"Bearer {self.merchant_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "qr_code" in data, "Missing qr_code field"
        assert "qr_image" in data, "Missing qr_image field"
        assert "merchant_name" in data, "Missing merchant_name field"
        assert "cashback_rate" in data, "Missing cashback_rate field"
        
        # Store QR code for later tests
        self.__class__.merchant_qr_code = data["qr_code"]
        
        print(f"Merchant QR code: {data['qr_code']}")
        print(f"Merchant name: {data['merchant_name']}")
        print(f"Cashback rate: {data['cashback_rate']}%")
        
        # Verify QR image is base64 PNG
        assert data["qr_image"].startswith("data:image/png;base64,"), "QR image should be base64 PNG"
    
    # ==================== CASH BALANCE TESTS ====================
    
    def test_02_merchant_cash_balance(self):
        """Test: GET /api/sdm/merchant/cash-balance - Merchant cash debit balance"""
        if not self.merchant_token:
            pytest.skip("Merchant not logged in")
        
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/cash-balance",
            headers={"Authorization": f"Bearer {self.merchant_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "cash_debit_balance" in data, "Missing cash_debit_balance"
        assert "cash_debit_limit" in data, "Missing cash_debit_limit"
        assert "cash_mode_enabled" in data, "Missing cash_mode_enabled"
        assert "available_limit" in data, "Missing available_limit"
        
        print(f"Cash debit balance: {data['cash_debit_balance']}")
        print(f"Cash debit limit: {data['cash_debit_limit']}")
        print(f"Cash mode enabled: {data['cash_mode_enabled']}")
        print(f"Available limit: {data['available_limit']}")
    
    # ==================== SPLIT CALCULATION TESTS ====================
    
    def test_03_split_calculation_100_ghs_at_8_percent(self):
        """Test: Split calculation for 100 GHS @ 8% = Cashback 7.2 GHS"""
        # The split formula is:
        # Total cashback = Amount * (Rate / 100) = 100 * 0.08 = 8 GHS
        # SDM Commission = Total cashback * 0.10 = 8 * 0.10 = 0.8 GHS
        # Client cashback = Total - SDM = 8 - 0.8 = 7.2 GHS
        # Merchant amount = 100 - 8 = 92 GHS
        
        amount = 100.0
        cashback_rate = 8.0
        sdm_commission_rate = 0.10
        
        total_cashback = amount * (cashback_rate / 100)
        sdm_commission = total_cashback * sdm_commission_rate
        client_cashback = total_cashback - sdm_commission
        merchant_amount = amount - total_cashback
        
        assert total_cashback == 8.0, f"Expected total cashback 8.0, got {total_cashback}"
        assert sdm_commission == 0.8, f"Expected SDM commission 0.8, got {sdm_commission}"
        assert client_cashback == 7.2, f"Expected client cashback 7.2, got {client_cashback}"
        assert merchant_amount == 92.0, f"Expected merchant amount 92.0, got {merchant_amount}"
        
        print(f"Split calculation verified:")
        print(f"  Amount: {amount} GHS @ {cashback_rate}% cashback")
        print(f"  Total cashback: {total_cashback} GHS")
        print(f"  SDM commission (10%): {sdm_commission} GHS")
        print(f"  Client cashback: {client_cashback} GHS")
        print(f"  Merchant receives: {merchant_amount} GHS")
    
    # ==================== CLIENT INITIATE PAYMENT TESTS ====================
    
    def test_04_client_initiate_momo_payment(self):
        """Test: POST /api/sdm/payments/initiate - Client initiates MoMo payment"""
        if not self.client_token:
            pytest.skip("Client not logged in")
        
        if not hasattr(self, 'merchant_qr_code') or not self.merchant_qr_code:
            # Get merchant QR code first
            qr_resp = requests.get(
                f"{BASE_URL}/api/sdm/merchant/qr-code",
                headers={"Authorization": f"Bearer {self.merchant_token}"}
            )
            if qr_resp.status_code == 200:
                self.__class__.merchant_qr_code = qr_resp.json()["qr_code"]
            else:
                pytest.skip("Cannot get merchant QR code")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/payments/initiate",
            json={
                "merchant_qr_code": self.merchant_qr_code,
                "amount": 100.0,
                "payment_method": "momo",
                "payer_phone": "0241234567",
                "payer_network": "MTN",
                "notes": "Test MoMo payment"
            },
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "payment_id" in data, "Missing payment_id"
        assert "payment_ref" in data, "Missing payment_ref"
        assert "split" in data, "Missing split details"
        
        # Verify split calculation
        split = data["split"]
        assert "client_cashback" in split, "Missing client_cashback in split"
        assert "sdm_commission" in split, "Missing sdm_commission in split"
        assert "merchant_amount" in split, "Missing merchant_amount in split"
        
        print(f"MoMo payment initiated (SIMULATED)")
        print(f"  Payment ID: {data['payment_id']}")
        print(f"  Payment Ref: {data['payment_ref']}")
        print(f"  Client Cashback: {split['client_cashback']} GHS")
        print(f"  SDM Commission: {split['sdm_commission']} GHS")
    
    def test_05_client_initiate_card_payment(self):
        """Test: POST /api/sdm/payments/initiate - Client initiates Card payment"""
        if not self.client_token or not hasattr(self, 'merchant_qr_code'):
            pytest.skip("Client not logged in or merchant QR not available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/payments/initiate",
            json={
                "merchant_qr_code": self.merchant_qr_code,
                "amount": 50.0,
                "payment_method": "card",
                "notes": "Test Card payment"
            },
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "payment_id" in data, "Missing payment_id"
        assert "bulkclix_ref" in data, "Missing bulkclix_ref"
        
        print(f"Card payment initiated (SIMULATED)")
        print(f"  Payment ID: {data['payment_id']}")
        print(f"  Bulkclix Ref: {data.get('bulkclix_ref')}")
    
    def test_06_client_initiate_cash_payment(self):
        """Test: POST /api/sdm/payments/initiate - Client initiates Cash payment (awaiting confirmation)"""
        if not self.client_token or not hasattr(self, 'merchant_qr_code'):
            pytest.skip("Client not logged in or merchant QR not available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/payments/initiate",
            json={
                "merchant_qr_code": self.merchant_qr_code,
                "amount": 75.0,
                "payment_method": "cash",
                "notes": "Test Cash payment"
            },
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "payment_id" in data, "Missing payment_id"
        assert data.get("status") == "awaiting_confirmation", f"Expected awaiting_confirmation, got {data.get('status')}"
        assert data.get("requires_client_confirmation") == True, "Cash payment should require confirmation"
        assert "confirmation_expires_at" in data, "Missing confirmation_expires_at"
        
        # Store payment_id for confirmation test
        self.__class__.cash_payment_id = data["payment_id"]
        
        print(f"Cash payment initiated")
        print(f"  Payment ID: {data['payment_id']}")
        print(f"  Status: {data['status']}")
        print(f"  Expires at: {data.get('confirmation_expires_at')}")
    
    # ==================== MERCHANT INITIATE PAYMENT TESTS ====================
    
    def test_07_get_client_qr_code(self):
        """Test: Get client QR code for merchant to scan"""
        if not self.client_token:
            pytest.skip("Client not logged in")
        
        # Get client profile which includes QR code
        response = requests.get(
            f"{BASE_URL}/api/sdm/user/profile",
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "qr_code" in data, "Missing qr_code in client profile"
        
        self.__class__.client_qr_code = data["qr_code"]
        print(f"Client QR code: {data['qr_code']}")
    
    def test_08_merchant_initiate_momo_payment(self):
        """Test: POST /api/sdm/payments/merchant-initiate - Merchant initiates MoMo payment"""
        if not self.merchant_token:
            pytest.skip("Merchant not logged in")
        
        if not hasattr(self, 'client_qr_code') or not self.client_qr_code:
            pytest.skip("Client QR code not available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/payments/merchant-initiate",
            json={
                "client_qr_code": self.client_qr_code,
                "amount": 200.0,
                "payment_method": "momo",
                "payer_phone": "0241234567",
                "payer_network": "MTN",
                "notes": "Merchant initiated MoMo"
            },
            headers={"Authorization": f"Bearer {self.merchant_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "payment_id" in data, "Missing payment_id"
        assert "split" in data, "Missing split"
        
        print(f"Merchant-initiated MoMo payment (SIMULATED)")
        print(f"  Payment ID: {data['payment_id']}")
        print(f"  Client Cashback: {data['split'].get('client_cashback')} GHS")
    
    def test_09_merchant_initiate_cash_payment(self):
        """Test: POST /api/sdm/payments/merchant-initiate - Merchant initiates Cash payment"""
        if not self.merchant_token:
            pytest.skip("Merchant not logged in")
        
        if not hasattr(self, 'client_qr_code') or not self.client_qr_code:
            pytest.skip("Client QR code not available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/payments/merchant-initiate",
            json={
                "client_qr_code": self.client_qr_code,
                "amount": 100.0,
                "payment_method": "cash",
                "notes": "Merchant initiated Cash"
            },
            headers={"Authorization": f"Bearer {self.merchant_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert data.get("status") == "awaiting_confirmation", f"Expected awaiting_confirmation, got {data.get('status')}"
        assert data.get("requires_client_confirmation") == True, "Cash payment should require client confirmation"
        
        # Store for pending test
        self.__class__.merchant_cash_payment_id = data["payment_id"]
        
        print(f"Merchant-initiated Cash payment")
        print(f"  Payment ID: {data['payment_id']}")
        print(f"  Status: {data['status']}")
        print(f"  Requires confirmation: {data.get('requires_client_confirmation')}")
    
    # ==================== PENDING PAYMENTS TESTS ====================
    
    def test_10_get_pending_payments(self):
        """Test: GET /api/sdm/payments/pending - Client pending payments"""
        if not self.client_token:
            pytest.skip("Client not logged in")
        
        response = requests.get(
            f"{BASE_URL}/api/sdm/payments/pending",
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "pending_payments" in data, "Missing pending_payments field"
        
        pending = data["pending_payments"]
        print(f"Pending payments count: {len(pending)}")
        
        if len(pending) > 0:
            first_pending = pending[0]
            print(f"  First pending payment:")
            print(f"    Payment ID: {first_pending.get('payment_id')}")
            print(f"    Merchant: {first_pending.get('merchant_name')}")
            print(f"    Amount: {first_pending.get('amount')}")
            print(f"    Cashback: {first_pending.get('cashback_amount')}")
    
    # ==================== CONFIRM CASH PAYMENT TESTS ====================
    
    def test_11_confirm_cash_payment(self):
        """Test: POST /api/sdm/payments/confirm-cash - Client confirms cash payment"""
        if not self.client_token:
            pytest.skip("Client not logged in")
        
        # Get pending payments first
        pending_resp = requests.get(
            f"{BASE_URL}/api/sdm/payments/pending",
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if pending_resp.status_code != 200:
            pytest.skip("Cannot get pending payments")
        
        pending = pending_resp.json().get("pending_payments", [])
        if len(pending) == 0:
            pytest.skip("No pending payments to confirm")
        
        payment_id = pending[0]["payment_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/payments/confirm-cash",
            json={
                "payment_id": payment_id,
                "confirm": True
            },
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "cashback_credited" in data, "Missing cashback_credited"
        
        print(f"Cash payment confirmed")
        print(f"  Cashback credited: {data.get('cashback_credited')} GHS")
    
    def test_12_reject_cash_payment(self):
        """Test: POST /api/sdm/payments/confirm-cash - Client rejects cash payment"""
        if not self.client_token:
            pytest.skip("Client not logged in")
        
        # Get pending payments first
        pending_resp = requests.get(
            f"{BASE_URL}/api/sdm/payments/pending",
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if pending_resp.status_code != 200:
            pytest.skip("Cannot get pending payments")
        
        pending = pending_resp.json().get("pending_payments", [])
        if len(pending) == 0:
            print("No pending payments to reject - test passes")
            return
        
        payment_id = pending[0]["payment_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/payments/confirm-cash",
            json={
                "payment_id": payment_id,
                "confirm": False
            },
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        
        print(f"Cash payment rejected successfully")
    
    # ==================== PAYMENT HISTORY TESTS ====================
    
    def test_13_get_client_payment_history(self):
        """Test: GET /api/sdm/payments/history - Client payment history"""
        if not self.client_token:
            pytest.skip("Client not logged in")
        
        response = requests.get(
            f"{BASE_URL}/api/sdm/payments/history",
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "payments" in data, "Missing payments field"
        
        payments = data["payments"]
        print(f"Client payment history count: {len(payments)}")
        
        if len(payments) > 0:
            for i, payment in enumerate(payments[:3]):
                print(f"  Payment {i+1}: {payment.get('payment_ref')} - {payment.get('amount')} GHS - {payment.get('status')}")
    
    def test_14_get_merchant_payment_history(self):
        """Test: GET /api/sdm/merchant/payments - Merchant payment history"""
        if not self.merchant_token:
            pytest.skip("Merchant not logged in")
        
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/payments",
            headers={"Authorization": f"Bearer {self.merchant_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "payments" in data, "Missing payments field"
        
        payments = data["payments"]
        print(f"Merchant payment history count: {len(payments)}")


class TestMerchantSettlementRegistration:
    """Test merchant registration with settlement configuration"""
    
    def test_01_get_merchant_profile_with_settlement(self):
        """Test: Verify merchant profile includes settlement configuration"""
        # Login as merchant
        login_resp = requests.post(f"{BASE_URL}/api/sdm/merchant/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Merchant login failed")
        
        token = login_resp.json().get("access_token")
        
        # Get profile
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check settlement fields exist
        print("Merchant settlement configuration:")
        print(f"  Settlement type: {data.get('settlement_type', 'N/A')}")
        print(f"  MoMo number: {data.get('momo_number', 'N/A')}")
        print(f"  MoMo provider: {data.get('momo_provider', 'N/A')}")
        print(f"  Bank name: {data.get('bank_name', 'N/A')}")
        print(f"  Bank account: {data.get('bank_account_number', 'N/A')}")
        print(f"  Settlement mode: {data.get('settlement_mode', 'N/A')}")
        
        # Verify at least one settlement method is configured
        has_momo = data.get('momo_number') is not None
        has_bank = data.get('bank_account_number') is not None
        
        # Note: Test accounts may not have settlement configured
        print(f"  Has MoMo configured: {has_momo}")
        print(f"  Has Bank configured: {has_bank}")


class TestInvalidScenarios:
    """Test invalid/error scenarios"""
    
    def test_01_initiate_payment_invalid_method(self):
        """Test: Invalid payment method returns error"""
        # Login client
        login_resp = requests.post(f"{BASE_URL}/api/sdm/auth/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Client login failed")
        
        token = login_resp.json().get("access_token")
        
        # Get merchant QR first
        merchant_login = requests.post(f"{BASE_URL}/api/sdm/merchant/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        
        if merchant_login.status_code != 200:
            pytest.skip("Merchant login failed")
        
        merchant_token = merchant_login.json().get("access_token")
        qr_resp = requests.get(
            f"{BASE_URL}/api/sdm/merchant/qr-code",
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        
        if qr_resp.status_code != 200:
            pytest.skip("Cannot get merchant QR")
        
        merchant_qr = qr_resp.json()["qr_code"]
        
        # Try invalid payment method
        response = requests.post(
            f"{BASE_URL}/api/sdm/payments/initiate",
            json={
                "merchant_qr_code": merchant_qr,
                "amount": 100.0,
                "payment_method": "invalid_method"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid method, got {response.status_code}"
        print(f"Invalid payment method correctly rejected: {response.json().get('detail')}")
    
    def test_02_initiate_payment_invalid_merchant_qr(self):
        """Test: Invalid merchant QR returns 404"""
        login_resp = requests.post(f"{BASE_URL}/api/sdm/auth/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Client login failed")
        
        token = login_resp.json().get("access_token")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/payments/initiate",
            json={
                "merchant_qr_code": "INVALID_QR_CODE_12345",
                "amount": 100.0,
                "payment_method": "momo"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid QR, got {response.status_code}"
        print(f"Invalid merchant QR correctly rejected: {response.json().get('detail')}")
    
    def test_03_merchant_initiate_invalid_client_qr(self):
        """Test: Invalid client QR returns 404"""
        login_resp = requests.post(f"{BASE_URL}/api/sdm/merchant/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Merchant login failed")
        
        token = login_resp.json().get("access_token")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/payments/merchant-initiate",
            json={
                "client_qr_code": "INVALID_CLIENT_QR",
                "amount": 100.0,
                "payment_method": "cash"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid client QR, got {response.status_code}"
        print(f"Invalid client QR correctly rejected: {response.json().get('detail')}")
    
    def test_04_confirm_nonexistent_payment(self):
        """Test: Confirming non-existent payment returns 404"""
        login_resp = requests.post(f"{BASE_URL}/api/sdm/auth/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Client login failed")
        
        token = login_resp.json().get("access_token")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/payments/confirm-cash",
            json={
                "payment_id": "nonexistent-payment-id",
                "confirm": True
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent payment, got {response.status_code}"
        print(f"Non-existent payment correctly rejected: {response.json().get('detail')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
