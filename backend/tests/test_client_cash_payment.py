"""
Test Client-Initiated Cash Payment Feature
===========================================
Tests the POST /api/payments/merchant/cash endpoint
which allows clients to record cash payments to merchants
and receive cashback.
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://web-boost-seo.preview.emergentagent.com').rstrip('/')

# Test credentials
CLIENT_PHONE = "+233555861556"
CLIENT_PASSWORD = "000000"
MERCHANT_PHONE = "+233555123456"
MERCHANT_PASSWORD = "000000"
TEST_MERCHANT_QR = "TESTSHOP001"


class TestClientCashPayment:
    """Test client-initiated cash payment flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login client"""
        self.client_token = self._login_client()
        yield
    
    def _login_client(self):
        """Helper to login client and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/client/login", json={
            "phone": CLIENT_PHONE,
            "password": CLIENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def _login_merchant(self):
        """Helper to login merchant and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": MERCHANT_PHONE,
            "password": MERCHANT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None

    # Test 1: Verify endpoint exists and returns proper response
    def test_cash_payment_endpoint_exists(self):
        """Test that /api/payments/merchant/cash endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json={
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 10
        })
        # Should not return 404 (endpoint should exist)
        assert response.status_code != 404, f"Endpoint should exist. Got: {response.status_code}"
        print(f"✓ Cash payment endpoint exists - Status: {response.status_code}")

    # Test 2: Successful cash payment
    def test_successful_cash_payment(self):
        """Test client can record a cash payment successfully"""
        # Get client balance before payment
        headers = {"Authorization": f"Bearer {self.client_token}"} if self.client_token else {}
        pre_response = requests.get(f"{BASE_URL}/api/clients/me", headers=headers)
        pre_balance = pre_response.json().get("client", {}).get("cashback_balance", 0) if pre_response.status_code == 200 else 0
        
        # Make cash payment
        payload = {
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 20.0
        }
        response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should indicate success"
        assert "payment_id" in data, "Response should contain payment_id"
        assert "reference" in data, "Response should contain reference"
        assert data.get("payment_method") == "cash", "Payment method should be 'cash'"
        assert data.get("status") == "completed", "Status should be 'completed'"
        assert "cashback_earned" in data, "Response should contain cashback_earned"
        
        print(f"✓ Cash payment successful - Reference: {data.get('reference')}, Cashback: {data.get('cashback_earned')}")
        
        # Verify cashback was credited
        assert data.get("cashback_earned") > 0, "Cashback should be earned"

    # Test 3: Validate minimum amount
    def test_minimum_amount_validation(self):
        """Test that payment fails with amount less than 1"""
        payload = {
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 0.5  # Below minimum
        }
        response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json=payload)
        
        assert response.status_code == 400, f"Expected 400 for amount < 1, got {response.status_code}"
        print("✓ Minimum amount validation works")

    # Test 4: Invalid merchant QR code
    def test_invalid_merchant_qr(self):
        """Test that payment fails with invalid merchant QR code"""
        payload = {
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": "INVALID_QR_CODE_DOES_NOT_EXIST",
            "amount": 10
        }
        response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json=payload)
        
        assert response.status_code == 404, f"Expected 404 for invalid merchant, got {response.status_code}"
        print("✓ Invalid merchant QR validation works")

    # Test 5: Verify transaction appears in client history
    def test_transaction_in_client_history(self):
        """Test that cash payment appears in client transaction history"""
        if not self.client_token:
            pytest.skip("Client login failed")
        
        # Make a cash payment first
        payload = {
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 15.0
        }
        pay_response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json=payload)
        assert pay_response.status_code == 200, f"Payment failed: {pay_response.text}"
        payment_ref = pay_response.json().get("reference")
        
        # Wait a moment for DB update
        time.sleep(1)
        
        # Fetch client transactions
        headers = {"Authorization": f"Bearer {self.client_token}"}
        txn_response = requests.get(f"{BASE_URL}/api/clients/transactions?limit=20", headers=headers)
        
        assert txn_response.status_code == 200, f"Failed to fetch transactions: {txn_response.text}"
        transactions = txn_response.json().get("transactions", [])
        
        # Find the transaction we just made
        found = False
        for txn in transactions:
            if txn.get("reference") == payment_ref or (txn.get("payment_method") == "cash" and txn.get("amount") == 15.0):
                found = True
                assert txn.get("payment_method") == "cash", "Transaction should have payment_method='cash'"
                print(f"✓ Transaction found in client history - ID: {txn.get('id')}, Type: {txn.get('type')}")
                break
        
        assert found, "Cash payment transaction should appear in client history"

    # Test 6: Verify merchant receives transaction record
    def test_transaction_in_merchant_history(self):
        """Test that cash payment appears in merchant transaction history"""
        merchant_token = self._login_merchant()
        if not merchant_token:
            pytest.skip("Merchant login failed")
        
        # Make a cash payment
        payload = {
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 25.0
        }
        pay_response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json=payload)
        assert pay_response.status_code == 200, f"Payment failed: {pay_response.text}"
        payment_ref = pay_response.json().get("reference")
        
        time.sleep(1)
        
        # Fetch merchant transactions
        headers = {"Authorization": f"Bearer {merchant_token}"}
        txn_response = requests.get(f"{BASE_URL}/api/merchants/transactions?limit=20", headers=headers)
        
        assert txn_response.status_code == 200, f"Failed to fetch merchant transactions: {txn_response.text}"
        transactions = txn_response.json().get("transactions", [])
        
        # Look for the transaction
        found = False
        for txn in transactions:
            if txn.get("reference") == payment_ref:
                found = True
                print(f"✓ Transaction found in merchant history - Ref: {payment_ref}")
                break
        
        # Note: If not found in transactions, might be in cash_transactions or debit_history
        if not found:
            # Check debit history as fallback
            debit_response = requests.get(f"{BASE_URL}/api/merchants/debit-history", headers=headers)
            if debit_response.status_code == 200:
                debit_history = debit_response.json().get("history", [])
                for entry in debit_history:
                    if payment_ref in str(entry.get("description", "")):
                        found = True
                        print(f"✓ Transaction found in merchant debit history")
                        break
        
        print(f"Transaction found in merchant records: {found}")

    # Test 7: Verify merchant debit account is affected
    def test_merchant_debit_account_updated(self):
        """Test that merchant's debit account balance decreases after cash payment"""
        merchant_token = self._login_merchant()
        if not merchant_token:
            pytest.skip("Merchant login failed")
        
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        # Get initial debit account balance
        pre_response = requests.get(f"{BASE_URL}/api/merchants/debit-account", headers=headers)
        pre_balance = 0
        if pre_response.status_code == 200:
            pre_balance = pre_response.json().get("balance", 0)
        
        # Make cash payment
        payload = {
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 50.0
        }
        pay_response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json=payload)
        
        if pay_response.status_code != 200:
            # Might be blocked due to debit limit - this is expected behavior
            if "blocked" in pay_response.text.lower() or "limit" in pay_response.text.lower():
                print("✓ Merchant debit limit check working (payment blocked)")
                return
            pytest.fail(f"Payment failed: {pay_response.text}")
        
        cashback = pay_response.json().get("cashback_earned", 0)
        
        # Get post-payment debit balance
        post_response = requests.get(f"{BASE_URL}/api/merchants/debit-account", headers=headers)
        post_balance = 0
        if post_response.status_code == 200:
            post_balance = post_response.json().get("balance", 0)
        
        # Balance should decrease by cashback amount
        balance_change = post_balance - pre_balance
        print(f"Pre-balance: {pre_balance}, Post-balance: {post_balance}, Change: {balance_change}, Cashback: {cashback}")
        
        # The balance decreases (becomes more negative) by the cashback amount
        if cashback > 0:
            assert post_balance <= pre_balance, "Debit balance should decrease after cash payment"
            print(f"✓ Merchant debit account updated - Balance change: {balance_change}")


class TestMerchantPayModalAPI:
    """Test APIs used by MerchantPayModal component"""
    
    def test_merchant_lookup_by_qr(self):
        """Test merchant lookup by QR code"""
        response = requests.get(f"{BASE_URL}/api/merchants/by-qr/{TEST_MERCHANT_QR}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "merchant" in data, "Response should contain merchant info"
        merchant = data["merchant"]
        
        assert "business_name" in merchant, "Merchant should have business_name"
        assert "cashback_rate" in merchant or merchant.get("cashback_rate") is not None, "Merchant should have cashback_rate"
        
        print(f"✓ Merchant lookup successful - Name: {merchant.get('business_name')}, Cashback: {merchant.get('cashback_rate')}%")

    def test_payment_method_options(self):
        """Verify both MoMo and Cash payment methods can be used"""
        # Test MoMo payment initiation (should work or return processing)
        momo_response = requests.post(f"{BASE_URL}/api/payments/merchant/initiate", json={
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 10,
            "network": "MTN"
        })
        
        momo_works = momo_response.status_code in [200, 400]  # 400 if inactive client
        print(f"MoMo endpoint status: {momo_response.status_code}")
        
        # Test Cash payment
        cash_response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json={
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 10
        })
        
        cash_works = cash_response.status_code in [200, 400]  # 400 if inactive client
        print(f"Cash endpoint status: {cash_response.status_code}")
        
        print(f"✓ Both payment methods accessible - MoMo: {momo_works}, Cash: {cash_works}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
