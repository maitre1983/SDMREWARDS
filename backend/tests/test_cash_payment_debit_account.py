"""
Test Cash Payment & Merchant Debit Account Feature
=====================================================
Tests the new feature where:
1. Merchant can view their debit account
2. Merchant can search for a customer by phone
3. Merchant records cash payment, customer gets cashback, merchant debit account is debited
4. Admin can view all merchant debit accounts overview
5. Admin can set debit limit for a merchant
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
CLIENT_PHONE = "+233555861556"  # With country code
CLIENT_PASSWORD = "000000"
MERCHANT_PHONE = "+233555123456"
MERCHANT_PASSWORD = "000000"
ADMIN_EMAIL = "emileparfait2003@gmail.com"
ADMIN_PASSWORD = "password"


class TestCashPaymentDebitAccountFeature:
    """Tests for Cash Payment & Merchant Debit Account system"""

    @pytest.fixture(scope="class")
    def api_client(self):
        """Shared requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session

    @pytest.fixture(scope="class")
    def admin_token(self, api_client):
        """Get admin authentication token"""
        response = api_client.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")

    @pytest.fixture(scope="class")
    def merchant_token(self, api_client):
        """Get merchant authentication token"""
        response = api_client.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": MERCHANT_PHONE,
            "password": MERCHANT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Merchant authentication failed: {response.status_code} - {response.text}")

    @pytest.fixture(scope="class")
    def client_token(self, api_client):
        """Get client authentication token"""
        response = api_client.post(f"{BASE_URL}/api/auth/client/login", json={
            "phone": CLIENT_PHONE,
            "password": CLIENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Client authentication failed: {response.status_code} - {response.text}")

    # ============== MERCHANT DEBIT ACCOUNT TESTS ==============

    def test_merchant_get_debit_account(self, api_client, merchant_token):
        """Test GET /api/merchants/debit-account - Merchant can view their debit account"""
        response = api_client.get(
            f"{BASE_URL}/api/merchants/debit-account",
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "debit_account" in data, "Response should contain debit_account"
        assert "stats" in data, "Response should contain stats"
        
        # Validate debit account structure
        debit_account = data["debit_account"]
        assert "balance" in debit_account or debit_account is not None
        
        # Validate stats structure
        stats = data["stats"]
        assert "current_balance" in stats
        assert "debit_limit" in stats
        print(f"✓ Merchant debit account: balance={stats.get('current_balance')}, limit={stats.get('debit_limit')}")

    def test_merchant_search_customer_by_phone(self, api_client, merchant_token):
        """Test GET /api/merchants/search-customer - Merchant can search for a customer"""
        # Search using client phone (without + prefix to avoid URL encoding issues)
        search_phone = CLIENT_PHONE.replace("+", "")
        response = api_client.get(
            f"{BASE_URL}/api/merchants/search-customer?query={search_phone}",
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "customer" in data, "Response should contain customer"
        
        customer = data["customer"]
        assert "id" in customer, "Customer should have id"
        assert "full_name" in customer, "Customer should have full_name"
        assert "phone" in customer, "Customer should have phone"
        print(f"✓ Found customer: {customer.get('full_name')} ({customer.get('phone')})")
        
        return customer

    def test_merchant_search_customer_too_short_query(self, api_client, merchant_token):
        """Test search-customer with query < 3 characters returns error"""
        response = api_client.get(
            f"{BASE_URL}/api/merchants/search-customer?query=05",
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for short query, got {response.status_code}"
        print("✓ Short query correctly rejected with 400")

    def test_merchant_search_customer_not_found(self, api_client, merchant_token):
        """Test search-customer with non-existent phone returns 404"""
        response = api_client.get(
            f"{BASE_URL}/api/merchants/search-customer?query=9999999999",
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent customer, got {response.status_code}"
        print("✓ Non-existent customer correctly returns 404")

    # ============== ADMIN DEBIT OVERVIEW TESTS ==============

    def test_admin_get_merchants_debit_overview(self, api_client, admin_token):
        """Test GET /api/admin/merchants/debit-overview - Admin can view all merchant debit accounts"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/merchants/debit-overview",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "accounts" in data, "Response should contain accounts"
        assert "summary" in data, "Response should contain summary"
        
        # Validate summary structure
        summary = data["summary"]
        assert "total_merchants" in summary
        assert "total_debt" in summary
        assert "blocked_count" in summary
        
        print(f"✓ Admin debit overview: {summary.get('total_merchants')} merchants, debt={summary.get('total_debt')}")
        
        return data

    def test_admin_set_merchant_debit_settings(self, api_client, admin_token):
        """Test PUT /api/admin/merchants/{merchant_id}/debit-settings - Admin can set debit limit"""
        # First get merchants to find a merchant ID
        merchants_res = api_client.get(
            f"{BASE_URL}/api/admin/merchants",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert merchants_res.status_code == 200
        merchants = merchants_res.json().get("merchants", [])
        
        if not merchants:
            pytest.skip("No merchants available for testing")
        
        # Get first merchant
        merchant_id = merchants[0]["id"]
        merchant_name = merchants[0].get("business_name", "Unknown")
        
        # Set debit limit
        response = api_client.put(
            f"{BASE_URL}/api/admin/merchants/{merchant_id}/debit-settings",
            json={
                "debit_limit": 500.00,
                "settlement_days": 7
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        print(f"✓ Set debit limit for merchant '{merchant_name}': GHS 500.00, 7 days settlement")
        
        return merchant_id

    def test_admin_get_specific_merchant_debit_account(self, api_client, admin_token):
        """Test GET /api/admin/merchants/{merchant_id}/debit-account - Admin can view specific merchant debit"""
        # First get merchants
        merchants_res = api_client.get(
            f"{BASE_URL}/api/admin/merchants",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert merchants_res.status_code == 200
        merchants = merchants_res.json().get("merchants", [])
        
        if not merchants:
            pytest.skip("No merchants available for testing")
        
        merchant_id = merchants[0]["id"]
        
        response = api_client.get(
            f"{BASE_URL}/api/admin/merchants/{merchant_id}/debit-account",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "merchant" in data
        assert "debit_account" in data
        assert "ledger" in data
        assert "stats" in data
        
        print(f"✓ Admin can view specific merchant debit account details")

    # ============== CASH TRANSACTION TESTS ==============

    def test_cash_transaction_requires_customer(self, api_client, merchant_token):
        """Test POST /api/merchants/cash-transaction - Requires customer_id or customer_phone"""
        response = api_client.post(
            f"{BASE_URL}/api/merchants/cash-transaction",
            json={
                "amount": 100.00
            },
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for missing customer, got {response.status_code}"
        print("✓ Cash transaction correctly requires customer identification")

    def test_cash_transaction_requires_valid_amount(self, api_client, merchant_token):
        """Test POST /api/merchants/cash-transaction - Amount must be > 0"""
        response = api_client.post(
            f"{BASE_URL}/api/merchants/cash-transaction",
            json={
                "customer_phone": CLIENT_PHONE,
                "amount": 0
            },
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for zero amount, got {response.status_code}"
        print("✓ Cash transaction correctly requires positive amount")

    def test_merchant_get_debit_history(self, api_client, merchant_token):
        """Test GET /api/merchants/debit-history - Merchant can view debit transaction history"""
        response = api_client.get(
            f"{BASE_URL}/api/merchants/debit-history?limit=10",
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "transactions" in data
        assert "pagination" in data
        
        print(f"✓ Merchant can view debit history: {len(data.get('transactions', []))} entries")


class TestCashPaymentFlow:
    """End-to-end test for the cash payment flow"""

    @pytest.fixture(scope="class")
    def api_client(self):
        """Shared requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session

    @pytest.fixture(scope="class")
    def admin_token(self, api_client):
        """Get admin authentication token"""
        response = api_client.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin authentication failed")

    @pytest.fixture(scope="class")
    def merchant_token(self, api_client):
        """Get merchant authentication token"""
        response = api_client.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": MERCHANT_PHONE,
            "password": MERCHANT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Merchant authentication failed")

    @pytest.fixture(scope="class")
    def client_token(self, api_client):
        """Get client authentication token"""
        response = api_client.post(f"{BASE_URL}/api/auth/client/login", json={
            "phone": CLIENT_PHONE,
            "password": CLIENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Client authentication failed")

    def test_e2e_cash_payment_flow(self, api_client, admin_token, merchant_token, client_token):
        """
        End-to-end test:
        1. Admin sets debit limit for merchant
        2. Get client's initial cashback balance
        3. Merchant records cash payment
        4. Verify client cashback increased
        5. Verify merchant debit account decreased
        """
        # Step 1: Get merchant info and set debit limit
        merchants_res = api_client.get(
            f"{BASE_URL}/api/admin/merchants",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert merchants_res.status_code == 200
        merchants = merchants_res.json().get("merchants", [])
        
        # Find the merchant we're logged in as
        test_merchant = None
        for m in merchants:
            if MERCHANT_PHONE.replace("+", "") in m.get("phone", ""):
                test_merchant = m
                break
        
        if not test_merchant:
            # Use first available merchant
            test_merchant = merchants[0] if merchants else None
        
        if not test_merchant:
            pytest.skip("No merchant available for testing")
        
        merchant_id = test_merchant["id"]
        print(f"Testing with merchant: {test_merchant.get('business_name')}")
        
        # Set debit limit
        limit_res = api_client.put(
            f"{BASE_URL}/api/admin/merchants/{merchant_id}/debit-settings",
            json={"debit_limit": 1000.00, "settlement_days": 14},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert limit_res.status_code == 200, f"Failed to set debit limit: {limit_res.text}"
        print("✓ Step 1: Admin set debit limit to GHS 1000")
        
        # Step 2: Get client's initial cashback balance
        client_res = api_client.get(
            f"{BASE_URL}/api/clients/me",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert client_res.status_code == 200
        initial_cashback = client_res.json().get("client", {}).get("cashback_balance", 0)
        print(f"✓ Step 2: Client initial cashback balance: GHS {initial_cashback}")
        
        # Step 3: Get merchant's initial debit balance
        debit_res = api_client.get(
            f"{BASE_URL}/api/merchants/debit-account",
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        assert debit_res.status_code == 200
        initial_debit_balance = debit_res.json().get("stats", {}).get("current_balance", 0)
        print(f"✓ Step 3: Merchant initial debit balance: GHS {initial_debit_balance}")
        
        # Step 4: Record cash payment
        cash_amount = 50.00
        cash_res = api_client.post(
            f"{BASE_URL}/api/merchants/cash-transaction",
            json={
                "customer_phone": CLIENT_PHONE,
                "amount": cash_amount,
                "description": "TEST Cash payment for testing"
            },
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        
        # Check response
        if cash_res.status_code == 403:
            error_msg = cash_res.json().get("detail", "")
            if "blocked" in error_msg.lower() or "limit" in error_msg.lower():
                print(f"⚠ Cash transaction blocked due to debit limit: {error_msg}")
                pytest.skip("Merchant debit account is blocked or at limit")
            else:
                pytest.fail(f"Unexpected 403: {error_msg}")
        
        assert cash_res.status_code == 200, f"Cash transaction failed: {cash_res.status_code} - {cash_res.text}"
        
        cash_data = cash_res.json()
        assert cash_data.get("success") == True
        assert "transaction" in cash_data
        assert "debit_account" in cash_data
        
        cashback_given = cash_data["transaction"].get("cashback_amount", 0)
        print(f"✓ Step 4: Cash payment recorded. Cashback given: GHS {cashback_given}")
        
        # Step 5: Verify client cashback increased
        client_res2 = api_client.get(
            f"{BASE_URL}/api/clients/me",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert client_res2.status_code == 200
        new_cashback = client_res2.json().get("client", {}).get("cashback_balance", 0)
        
        # Allow for floating point comparison
        expected_increase = cashback_given
        actual_increase = new_cashback - initial_cashback
        
        assert abs(actual_increase - expected_increase) < 0.01, \
            f"Client cashback should increase by {expected_increase}, but got {actual_increase}"
        print(f"✓ Step 5: Client cashback increased from {initial_cashback} to {new_cashback} (+{actual_increase})")
        
        # Step 6: Verify merchant debit account decreased
        debit_res2 = api_client.get(
            f"{BASE_URL}/api/merchants/debit-account",
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        assert debit_res2.status_code == 200
        new_debit_balance = debit_res2.json().get("stats", {}).get("current_balance", 0)
        
        expected_decrease = cashback_given
        actual_decrease = initial_debit_balance - new_debit_balance
        
        assert abs(actual_decrease - expected_decrease) < 0.01, \
            f"Merchant debit should decrease by {expected_decrease}, but got {actual_decrease}"
        print(f"✓ Step 6: Merchant debit balance decreased from {initial_debit_balance} to {new_debit_balance} (-{actual_decrease})")
        
        print("\n===== E2E CASH PAYMENT FLOW PASSED =====")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
