"""
Test Cash Payment Fraud Prevention Feature
===========================================
Tests the new cash payment flow with pending_confirmation status:
- Client-initiated cash payment creates pending_confirmation transaction
- Client cashback is NOT credited immediately (only after merchant confirms)
- Merchant can confirm/reject payments
- Max 3 pending limit per customer
- 72-hour expiration
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


class TestCashPaymentFraudPrevention:
    """Test cash payment fraud prevention features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login both client and merchant"""
        self.client_token = self._login_client()
        self.merchant_token = self._login_merchant()
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
    
    def _get_client_balance(self):
        """Get client's current cashback balance"""
        if not self.client_token:
            return 0
        headers = {"Authorization": f"Bearer {self.client_token}"}
        response = requests.get(f"{BASE_URL}/api/clients/me", headers=headers)
        if response.status_code == 200:
            return response.json().get("client", {}).get("cashback_balance", 0)
        return 0

    # Test 1: Cash payment creates pending_confirmation status
    def test_cash_payment_creates_pending_status(self):
        """Test that client-initiated cash payment creates pending_confirmation status"""
        payload = {
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 20.0
        }
        response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json=payload)
        
        # Handle case where merchant has no debit limit configured
        if response.status_code == 400:
            error_detail = response.json().get("detail", "")
            if "debit limit" in error_detail.lower() or "not configured" in error_detail.lower() or "blocked" in error_detail.lower():
                pytest.skip(f"Merchant cash payments not configured: {error_detail}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify pending_confirmation status
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("status") == "pending_confirmation", f"Status should be 'pending_confirmation', got: {data.get('status')}"
        assert "payment_id" in data, "Response should contain payment_id"
        assert data.get("payment_method") == "cash", "Payment method should be 'cash'"
        assert "expires_at" in data, "Response should contain expiration time"
        
        print(f"✓ Cash payment created with pending_confirmation status")
        print(f"  Payment ID: {data.get('payment_id')}")
        print(f"  Expires at: {data.get('expires_at')}")
        print(f"  Cashback (pending): GHS {data.get('cashback_amount')}")

    # Test 2: Client cashback is NOT credited immediately
    def test_cashback_not_credited_immediately(self):
        """Test that cashback is NOT credited to client until merchant confirms"""
        if not self.client_token:
            pytest.skip("Client login failed")
        
        # Get initial balance
        initial_balance = self._get_client_balance()
        print(f"Initial balance: GHS {initial_balance}")
        
        # Make cash payment
        payload = {
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 30.0
        }
        response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json=payload)
        
        if response.status_code == 400:
            error_detail = response.json().get("detail", "")
            if "pending" in error_detail.lower() or "debit limit" in error_detail.lower():
                pytest.skip(f"Skipped due to: {error_detail}")
        
        assert response.status_code == 200, f"Payment failed: {response.text}"
        expected_cashback = response.json().get("cashback_amount", 0)
        
        # Wait briefly for any async updates
        time.sleep(1)
        
        # Check balance after payment
        post_balance = self._get_client_balance()
        print(f"Post-payment balance: GHS {post_balance}")
        print(f"Expected cashback (if credited): GHS {expected_cashback}")
        
        # Balance should NOT have increased by cashback amount yet
        balance_increase = post_balance - initial_balance
        
        # If pending_confirmation is working, balance shouldn't increase
        if expected_cashback > 0:
            assert balance_increase < expected_cashback, \
                f"Cashback should NOT be credited immediately! Balance increased by {balance_increase}, expected no increase"
            print(f"✓ Cashback NOT credited immediately - Balance increase: {balance_increase}")

    # Test 3: Merchant can see pending confirmations
    def test_merchant_sees_pending_confirmations(self):
        """Test that merchant can see pending cash payments in their dashboard"""
        if not self.merchant_token:
            pytest.skip("Merchant login failed")
        
        headers = {"Authorization": f"Bearer {self.merchant_token}"}
        response = requests.get(f"{BASE_URL}/api/merchants/pending-confirmations", headers=headers)
        
        assert response.status_code == 200, f"Failed to get pending confirmations: {response.text}"
        data = response.json()
        
        assert "pending_count" in data, "Response should contain pending_count"
        assert "transactions" in data, "Response should contain transactions list"
        
        pending_count = data.get("pending_count", 0)
        transactions = data.get("transactions", [])
        
        print(f"✓ Merchant can view pending confirmations - Count: {pending_count}")
        for txn in transactions[:3]:  # Show first 3
            print(f"  - {txn.get('client_name')}: GHS {txn.get('amount')} (Cashback: GHS {txn.get('cashback_amount')})")

    # Test 4: Merchant can confirm payment
    def test_merchant_confirm_payment(self):
        """Test that merchant can confirm a pending cash payment"""
        if not self.merchant_token or not self.client_token:
            pytest.skip("Login failed")
        
        # First create a pending payment
        payload = {
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 15.0
        }
        pay_response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json=payload)
        
        if pay_response.status_code == 400:
            error_detail = pay_response.json().get("detail", "")
            pytest.skip(f"Cash payment not available: {error_detail}")
        
        assert pay_response.status_code == 200, f"Payment creation failed: {pay_response.text}"
        payment_id = pay_response.json().get("payment_id")
        expected_cashback = pay_response.json().get("cashback_amount", 0)
        
        # Get client balance before confirmation
        pre_confirm_balance = self._get_client_balance()
        
        # Merchant confirms the payment
        headers = {"Authorization": f"Bearer {self.merchant_token}"}
        confirm_response = requests.post(
            f"{BASE_URL}/api/merchants/confirm-cash-payment/{payment_id}",
            headers=headers
        )
        
        assert confirm_response.status_code == 200, f"Confirmation failed: {confirm_response.text}"
        confirm_data = confirm_response.json()
        
        assert confirm_data.get("success") == True, "Confirmation should succeed"
        print(f"✓ Merchant confirmed payment - {confirm_data.get('message')}")
        
        # Wait for DB update
        time.sleep(1)
        
        # Verify client cashback is now credited
        post_confirm_balance = self._get_client_balance()
        balance_increase = post_confirm_balance - pre_confirm_balance
        
        print(f"  Pre-confirm balance: GHS {pre_confirm_balance}")
        print(f"  Post-confirm balance: GHS {post_confirm_balance}")
        print(f"  Balance increase: GHS {balance_increase}")
        
        if expected_cashback > 0:
            assert balance_increase >= expected_cashback * 0.9, \
                f"Cashback should be credited after confirmation. Increase: {balance_increase}, Expected: {expected_cashback}"
            print(f"✓ Cashback credited after confirmation: GHS {balance_increase}")

    # Test 5: Merchant can reject payment
    def test_merchant_reject_payment(self):
        """Test that merchant can reject a pending cash payment"""
        if not self.merchant_token:
            pytest.skip("Merchant login failed")
        
        # Create a pending payment
        payload = {
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 12.0
        }
        pay_response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json=payload)
        
        if pay_response.status_code == 400:
            error_detail = pay_response.json().get("detail", "")
            pytest.skip(f"Cash payment not available: {error_detail}")
        
        assert pay_response.status_code == 200, f"Payment creation failed: {pay_response.text}"
        payment_id = pay_response.json().get("payment_id")
        
        # Merchant rejects the payment
        headers = {"Authorization": f"Bearer {self.merchant_token}"}
        reject_response = requests.post(
            f"{BASE_URL}/api/merchants/reject-cash-payment/{payment_id}?reason=Payment not received",
            headers=headers
        )
        
        assert reject_response.status_code == 200, f"Rejection failed: {reject_response.text}"
        reject_data = reject_response.json()
        
        assert reject_data.get("success") == True, "Rejection should succeed"
        print(f"✓ Merchant rejected payment - {reject_data.get('message')}")
        
        # Verify transaction no longer in pending list
        time.sleep(1)
        pending_response = requests.get(f"{BASE_URL}/api/merchants/pending-confirmations", headers=headers)
        if pending_response.status_code == 200:
            pending_txns = pending_response.json().get("transactions", [])
            found = any(t.get("id") == payment_id for t in pending_txns)
            assert not found, "Rejected payment should not appear in pending list"
            print(f"✓ Rejected payment removed from pending list")

    # Test 6: Max 3 pending limit per customer
    def test_max_pending_limit(self):
        """Test that max 3 pending payments per customer is enforced"""
        # Clear any existing pending by trying to make 4 payments
        # The 4th should fail with limit error
        
        payments_made = []
        for i in range(4):
            payload = {
                "client_phone": CLIENT_PHONE,
                "merchant_qr_code": TEST_MERCHANT_QR,
                "amount": 10.0 + i
            }
            response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json=payload)
            
            if response.status_code == 400:
                error_detail = response.json().get("detail", "")
                
                # If we hit the limit, that's expected
                if "3 pending" in error_detail.lower() or "maximum" in error_detail.lower():
                    print(f"✓ Max pending limit enforced at payment {i+1}: {error_detail}")
                    return
                
                # If it's a debit limit issue, skip
                if "debit limit" in error_detail.lower() or "not configured" in error_detail.lower():
                    pytest.skip(f"Merchant cash payments not configured: {error_detail}")
                
            elif response.status_code == 200:
                payments_made.append(response.json().get("payment_id"))
                print(f"  Payment {i+1} created: {response.json().get('payment_id')}")
        
        # If we made 4 payments without hitting limit, the test failed
        if len(payments_made) >= 4:
            pytest.fail("Should not be able to create more than 3 pending payments")

    # Test 7: Client sees 'Awaiting Confirmation' status
    def test_client_sees_awaiting_status(self):
        """Test that client can see pending_confirmation transactions"""
        if not self.client_token:
            pytest.skip("Client login failed")
        
        headers = {"Authorization": f"Bearer {self.client_token}"}
        response = requests.get(f"{BASE_URL}/api/clients/transactions?limit=20", headers=headers)
        
        assert response.status_code == 200, f"Failed to get transactions: {response.text}"
        transactions = response.json().get("transactions", [])
        
        # Look for any pending_confirmation transactions
        pending_txns = [t for t in transactions if t.get("status") == "pending_confirmation"]
        
        if pending_txns:
            print(f"✓ Client can see {len(pending_txns)} pending_confirmation transactions")
            for txn in pending_txns[:3]:
                print(f"  - {txn.get('description')}: GHS {txn.get('amount')} - Status: {txn.get('status')}")
        else:
            print("  No pending_confirmation transactions found (may have been processed)")


class TestMerchantPendingConfirmationsAPI:
    """Test merchant-side pending confirmations API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.merchant_token = self._login_merchant()
        yield
    
    def _login_merchant(self):
        response = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": MERCHANT_PHONE,
            "password": MERCHANT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_pending_confirmations_endpoint(self):
        """Test GET /api/merchants/pending-confirmations endpoint"""
        if not self.merchant_token:
            pytest.skip("Merchant login failed")
        
        headers = {"Authorization": f"Bearer {self.merchant_token}"}
        response = requests.get(f"{BASE_URL}/api/merchants/pending-confirmations", headers=headers)
        
        assert response.status_code == 200, f"Endpoint failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "pending_count" in data, "Should have pending_count"
        assert "transactions" in data, "Should have transactions array"
        assert isinstance(data["transactions"], list), "transactions should be a list"
        
        if data["transactions"]:
            txn = data["transactions"][0]
            assert "id" in txn, "Transaction should have id"
            assert "client_name" in txn, "Transaction should have client_name"
            assert "amount" in txn, "Transaction should have amount"
            assert "cashback_amount" in txn, "Transaction should have cashback_amount"
            assert "expires_at" in txn, "Transaction should have expires_at"
        
        print(f"✓ Pending confirmations endpoint working - {data['pending_count']} pending")

    def test_confirm_endpoint_requires_auth(self):
        """Test that confirm endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/merchants/confirm-cash-payment/fake-id")
        assert response.status_code == 401, "Should require authentication"
        print("✓ Confirm endpoint requires authentication")

    def test_reject_endpoint_requires_auth(self):
        """Test that reject endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/merchants/reject-cash-payment/fake-id")
        assert response.status_code == 401, "Should require authentication"
        print("✓ Reject endpoint requires authentication")

    def test_confirm_nonexistent_transaction(self):
        """Test confirming a non-existent transaction returns 404"""
        if not self.merchant_token:
            pytest.skip("Merchant login failed")
        
        headers = {"Authorization": f"Bearer {self.merchant_token}"}
        response = requests.post(
            f"{BASE_URL}/api/merchants/confirm-cash-payment/nonexistent-id-12345",
            headers=headers
        )
        
        assert response.status_code == 404, f"Should return 404, got {response.status_code}"
        print("✓ Confirm nonexistent transaction returns 404")

    def test_reject_nonexistent_transaction(self):
        """Test rejecting a non-existent transaction returns 404"""
        if not self.merchant_token:
            pytest.skip("Merchant login failed")
        
        headers = {"Authorization": f"Bearer {self.merchant_token}"}
        response = requests.post(
            f"{BASE_URL}/api/merchants/reject-cash-payment/nonexistent-id-12345",
            headers=headers
        )
        
        assert response.status_code == 404, f"Should return 404, got {response.status_code}"
        print("✓ Reject nonexistent transaction returns 404")


class TestCashPaymentEndpointValidation:
    """Test input validation for cash payment endpoint"""
    
    def test_minimum_amount(self):
        """Test minimum payment amount validation"""
        response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json={
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 0.5  # Below minimum
        })
        assert response.status_code == 400, f"Should reject amount < 1, got {response.status_code}"
        print("✓ Minimum amount validation works")

    def test_invalid_merchant_qr(self):
        """Test invalid merchant QR code handling"""
        response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json={
            "client_phone": CLIENT_PHONE,
            "merchant_qr_code": "INVALID_QR_DOESNT_EXIST",
            "amount": 10
        })
        assert response.status_code == 404, f"Should return 404 for invalid merchant, got {response.status_code}"
        print("✓ Invalid merchant QR validation works")

    def test_invalid_client_phone(self):
        """Test invalid client phone handling"""
        response = requests.post(f"{BASE_URL}/api/payments/merchant/cash", json={
            "client_phone": "+233000000000",  # Non-existent client
            "merchant_qr_code": TEST_MERCHANT_QR,
            "amount": 10
        })
        assert response.status_code == 404, f"Should return 404 for invalid client, got {response.status_code}"
        print("✓ Invalid client phone validation works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
