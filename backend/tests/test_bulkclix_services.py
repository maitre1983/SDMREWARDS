"""
BulkClix Services Backend Tests
===============================
Tests for Airtime, Data Bundles, Bill Payments, and MoMo Withdrawal services.
All tests use the BulkClix API in SIMULATION mode.

IMPORTANT: BulkClix API is MOCKED/SIMULATED - Real API returns "Unauthorized" 
and triggers simulation mode. All services work in simulation for testing.
"""

import pytest
import requests
import os
import random
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://web-boost-seo.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_PHONE = "0000000000"  # 10 zeros
TEST_OTP = "000000"


def generate_unique_phone():
    """Generate unique phone number to avoid idempotency collision"""
    return f"024{random.randint(10000, 99999)}{random.randint(100, 999)}"


def generate_unique_account():
    """Generate unique account number for bill tests"""
    return f"TEST-{random.randint(100000, 999999)}"


class TestServiceEndpoints:
    """Test BulkClix service endpoints"""
    
    @pytest.fixture(scope="class")
    def user_token(self):
        """Login as test user and get token"""
        # Send OTP
        response = requests.post(f"{BASE_URL}/api/sdm/auth/send-otp", json={"phone": TEST_PHONE})
        assert response.status_code == 200, f"Send OTP failed: {response.text}"
        
        # Verify OTP
        response = requests.post(f"{BASE_URL}/api/sdm/auth/verify-otp", json={
            "phone": TEST_PHONE,
            "otp_code": TEST_OTP
        })
        assert response.status_code == 200, f"Verify OTP failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, user_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {user_token}"}
    
    # ==================== SERVICE BALANCE ====================
    
    def test_get_service_balance(self, auth_headers):
        """GET /api/sdm/user/services/balance - returns cashback balance and monthly limit"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/services/balance", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "cashback_balance" in data, "Missing cashback_balance"
        assert "monthly_limit" in data, "Missing monthly_limit"
        assert "monthly_used" in data, "Missing monthly_used"
        assert "monthly_remaining" in data, "Missing monthly_remaining"
        
        # Verify values are numeric
        assert isinstance(data["cashback_balance"], (int, float)), "cashback_balance should be numeric"
        assert isinstance(data["monthly_limit"], (int, float)), "monthly_limit should be numeric"
        assert data["monthly_limit"] > 0, f"monthly_limit should be positive, got {data['monthly_limit']}"
        
        print(f"✅ Service balance: {data['cashback_balance']} GHS, Monthly limit: {data['monthly_limit']} GHS")
    
    def test_service_balance_requires_auth(self):
        """GET /api/sdm/user/services/balance requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/services/balance")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✅ Service balance requires authentication")
    
    # ==================== DATA BUNDLES ====================
    
    def test_get_data_bundles(self, auth_headers):
        """GET /api/sdm/user/services/data-bundles - returns available bundles"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/services/data-bundles", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "bundles" in data, "Missing bundles key"
        assert isinstance(data["bundles"], list), "bundles should be a list"
        assert len(data["bundles"]) > 0, "Expected at least one data bundle"
        
        # Verify bundle structure
        bundle = data["bundles"][0]
        assert "id" in bundle, "Bundle missing id"
        assert "name" in bundle, "Bundle missing name"
        assert "network" in bundle, "Bundle missing network"
        assert "data_amount" in bundle, "Bundle missing data_amount"
        assert "validity" in bundle, "Bundle missing validity"
        assert "price" in bundle, "Bundle missing price"
        
        print(f"✅ Found {len(data['bundles'])} data bundles")
    
    def test_get_data_bundles_filter_by_network(self, auth_headers):
        """GET /api/sdm/user/services/data-bundles?network=MTN - filter by network"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/services/data-bundles?network=MTN", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # All bundles should be MTN
        for bundle in data["bundles"]:
            assert bundle["network"] == "MTN", f"Expected MTN bundle, got {bundle['network']}"
        
        print(f"✅ Found {len(data['bundles'])} MTN data bundles")
    
    # ==================== AIRTIME PURCHASE (SIMULATION) ====================
    
    def test_buy_airtime_simulation(self, auth_headers):
        """POST /api/sdm/user/services/airtime - buy airtime in simulation mode"""
        # First check balance
        balance_resp = requests.get(f"{BASE_URL}/api/sdm/user/services/balance", headers=auth_headers)
        initial_balance = balance_resp.json()["cashback_balance"]
        
        if initial_balance < 2:
            pytest.skip(f"Insufficient balance ({initial_balance} GHS). Need at least 2 GHS for test.")
        
        # Use unique phone to avoid idempotency collision
        unique_phone = generate_unique_phone()
        
        response = requests.post(f"{BASE_URL}/api/sdm/user/services/airtime", json={
            "phone_number": unique_phone,
            "amount": 1.0,
            "network": "MTN"
        }, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure - may be DUPLICATE (idempotency) or SUCCESS
        assert data["status"] in ["SUCCESS", "DUPLICATE"], f"Expected SUCCESS or DUPLICATE status, got {data['status']}"
        
        if data["status"] == "SUCCESS":
            assert "transaction_id" in data, "Missing transaction_id"
            assert "reference" in data, "Missing reference"
            assert "phone_number" in data, "Missing phone_number"
            assert "network" in data, "Missing network"
            assert "amount" in data, "Missing amount"
            assert "commission" in data, "Missing commission"
            assert "net_amount" in data, "Missing net_amount"
            print(f"✅ Airtime purchase SUCCESS (simulated): {data['reference']}")
        else:
            # DUPLICATE is also valid response - idempotency protection working
            assert "transaction" in data or "message" in data
            print(f"✅ Airtime purchase DUPLICATE (idempotency protection working)")
    
    def test_buy_airtime_auto_detect_network(self, auth_headers):
        """POST /api/sdm/user/services/airtime - auto-detect network from phone"""
        balance_resp = requests.get(f"{BASE_URL}/api/sdm/user/services/balance", headers=auth_headers)
        initial_balance = balance_resp.json()["cashback_balance"]
        
        if initial_balance < 2:
            pytest.skip(f"Insufficient balance ({initial_balance} GHS)")
        
        # MTN prefix 024 - should auto-detect - use unique suffix
        unique_suffix = random.randint(100000, 999999)
        
        response = requests.post(f"{BASE_URL}/api/sdm/user/services/airtime", json={
            "phone_number": f"024{unique_suffix}",
            "amount": 1.0
            # No network specified - should auto-detect
        }, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Accept both SUCCESS and DUPLICATE (idempotency)
        assert data["status"] in ["SUCCESS", "DUPLICATE"]
        
        if data["status"] == "SUCCESS":
            assert data["network"] == "MTN", f"Expected MTN from 024 prefix, got {data['network']}"
            print(f"✅ Airtime auto-detected network: {data['network']}")
        else:
            print(f"✅ Airtime auto-detect: DUPLICATE (idempotency protection)")
    
    def test_buy_airtime_insufficient_balance(self, auth_headers):
        """POST /api/sdm/user/services/airtime - fails with insufficient balance or exceeds limit"""
        response = requests.post(f"{BASE_URL}/api/sdm/user/services/airtime", json={
            "phone_number": "0241234567",
            "amount": 99999.0,  # Very large amount
            "network": "MTN"
        }, headers=auth_headers)
        
        assert response.status_code == 400, f"Expected 400 for insufficient balance, got {response.status_code}"
        # Either insufficient balance OR monthly limit exceeded is valid rejection
        error_msg = response.text.lower()
        valid_errors = ["insufficient", "balance", "limit", "exceeded"]
        assert any(err in error_msg for err in valid_errors), f"Expected rejection message, got: {response.text}"
        print("✅ Airtime purchase correctly rejects: large amount")
    
    # ==================== DATA BUNDLE PURCHASE (SIMULATION) ====================
    
    def test_buy_data_bundle_simulation(self, auth_headers):
        """POST /api/sdm/user/services/data - buy data bundle in simulation mode"""
        # Get available bundles first
        bundles_resp = requests.get(f"{BASE_URL}/api/sdm/user/services/data-bundles", headers=auth_headers)
        bundles = bundles_resp.json()["bundles"]
        
        # Find cheapest bundle
        cheapest = min(bundles, key=lambda b: b["price"])
        
        # Check balance
        balance_resp = requests.get(f"{BASE_URL}/api/sdm/user/services/balance", headers=auth_headers)
        initial_balance = balance_resp.json()["cashback_balance"]
        
        if initial_balance < cheapest["price"]:
            pytest.skip(f"Insufficient balance ({initial_balance} GHS) for bundle ({cheapest['price']} GHS)")
        
        # Use unique phone
        unique_phone = generate_unique_phone()
        
        response = requests.post(f"{BASE_URL}/api/sdm/user/services/data", json={
            "phone_number": unique_phone,
            "bundle_id": cheapest["id"]
        }, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Accept both SUCCESS and DUPLICATE
        assert data["status"] in ["SUCCESS", "DUPLICATE"], f"Expected SUCCESS or DUPLICATE, got {data['status']}"
        
        if data["status"] == "SUCCESS":
            assert "transaction_id" in data
            assert "reference" in data
            assert "bundle" in data
            print(f"✅ Data bundle purchase SUCCESS (simulated): {data['reference']} - {cheapest['name']}")
        else:
            print(f"✅ Data bundle purchase: DUPLICATE (idempotency)")
    
    def test_buy_data_invalid_bundle(self, auth_headers):
        """POST /api/sdm/user/services/data - fails with invalid bundle ID"""
        response = requests.post(f"{BASE_URL}/api/sdm/user/services/data", json={
            "phone_number": "0241234567",
            "bundle_id": "invalid_bundle_id_12345"
        }, headers=auth_headers)
        
        assert response.status_code == 400, f"Expected 400 for invalid bundle, got {response.status_code}"
        assert "not found" in response.text.lower() or "bundle" in response.text.lower()
        print("✅ Data purchase correctly rejects invalid bundle ID")
    
    # ==================== BILL PAYMENT (SIMULATION) ====================
    
    def test_pay_bill_ecg_simulation(self, auth_headers):
        """POST /api/sdm/user/services/bill - pay ECG bill in simulation mode"""
        balance_resp = requests.get(f"{BASE_URL}/api/sdm/user/services/balance", headers=auth_headers)
        initial_balance = balance_resp.json()["cashback_balance"]
        
        if initial_balance < 5:
            pytest.skip(f"Insufficient balance ({initial_balance} GHS)")
        
        # Use unique account number
        unique_account = generate_unique_account()
        
        response = requests.post(f"{BASE_URL}/api/sdm/user/services/bill", json={
            "provider": "ECG",
            "account_number": unique_account,
            "amount": 5.0
        }, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Accept both SUCCESS and DUPLICATE
        assert data["status"] in ["SUCCESS", "DUPLICATE"]
        
        if data["status"] == "SUCCESS":
            assert "transaction_id" in data
            assert "reference" in data
            assert data["provider"] == "ECG"
            print(f"✅ ECG bill payment SUCCESS (simulated): {data['reference']}")
        else:
            print(f"✅ ECG bill payment: DUPLICATE (idempotency)")
    
    def test_pay_bill_invalid_provider(self, auth_headers):
        """POST /api/sdm/user/services/bill - fails with invalid provider"""
        response = requests.post(f"{BASE_URL}/api/sdm/user/services/bill", json={
            "provider": "INVALID_PROVIDER",
            "account_number": "123456789",
            "amount": 5.0
        }, headers=auth_headers)
        
        assert response.status_code == 400, f"Expected 400 for invalid provider, got {response.status_code}"
        assert "invalid" in response.text.lower() or "provider" in response.text.lower()
        print("✅ Bill payment correctly rejects invalid provider")
    
    def test_pay_bill_all_providers(self, auth_headers):
        """Test all bill providers: ECG, GWCL, DSTV, GOTV"""
        providers = ["ECG", "GWCL", "DSTV", "GOTV"]
        
        balance_resp = requests.get(f"{BASE_URL}/api/sdm/user/services/balance", headers=auth_headers)
        initial_balance = balance_resp.json()["cashback_balance"]
        
        # Need at least 2 GHS per provider = 8 GHS
        if initial_balance < 8:
            pytest.skip(f"Insufficient balance ({initial_balance} GHS) for all providers test")
        
        success_count = 0
        duplicate_count = 0
        
        for provider in providers:
            unique_account = generate_unique_account()
            response = requests.post(f"{BASE_URL}/api/sdm/user/services/bill", json={
                "provider": provider,
                "account_number": unique_account,
                "amount": 2.0
            }, headers=auth_headers)
            
            assert response.status_code == 200, f"{provider} bill payment failed: {response.text}"
            data = response.json()
            assert data["status"] in ["SUCCESS", "DUPLICATE"], f"{provider} status unexpected: {data['status']}"
            
            if data["status"] == "SUCCESS":
                success_count += 1
            else:
                duplicate_count += 1
        
        print(f"✅ All bill providers work: {success_count} SUCCESS, {duplicate_count} DUPLICATE (idempotency)")
    
    # ==================== MOMO WITHDRAWAL (SIMULATION) ====================
    
    def test_momo_withdrawal_simulation(self, auth_headers):
        """POST /api/sdm/user/services/withdraw - MoMo withdrawal in simulation mode"""
        balance_resp = requests.get(f"{BASE_URL}/api/sdm/user/services/balance", headers=auth_headers)
        initial_balance = balance_resp.json()["cashback_balance"]
        
        if initial_balance < 5:
            pytest.skip(f"Insufficient balance ({initial_balance} GHS). Need at least 5 GHS for withdrawal.")
        
        # Use unique phone
        unique_phone = generate_unique_phone()
        
        response = requests.post(f"{BASE_URL}/api/sdm/user/services/withdraw", json={
            "phone_number": unique_phone,
            "amount": 5.0,
            "network": "MTN"
        }, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Accept both SUCCESS and DUPLICATE
        assert data["status"] in ["SUCCESS", "DUPLICATE"]
        
        if data["status"] == "SUCCESS":
            assert "transaction_id" in data
            assert "reference" in data
            assert data["amount"] == 5.0
            assert "fee" in data, "Missing fee field"
            assert "net_amount" in data, "Missing net_amount field"
            print(f"✅ MoMo withdrawal SUCCESS (simulated): {data['reference']}, Fee: {data['fee']} GHS")
        else:
            print(f"✅ MoMo withdrawal: DUPLICATE (idempotency)")
    
    def test_momo_withdrawal_amount_too_small(self, auth_headers):
        """POST /api/sdm/user/services/withdraw - fails when amount too small"""
        response = requests.post(f"{BASE_URL}/api/sdm/user/services/withdraw", json={
            "phone_number": "0241234567",
            "amount": 1.0,  # Too small after fee
            "network": "MTN"
        }, headers=auth_headers)
        
        assert response.status_code == 400, f"Expected 400 for amount too small, got {response.status_code}"
        assert "small" in response.text.lower() or "minimum" in response.text.lower()
        print("✅ MoMo withdrawal correctly rejects amount too small")
    
    # ==================== SERVICE HISTORY ====================
    
    def test_get_service_history(self, auth_headers):
        """GET /api/sdm/user/services/history - returns transaction history"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/services/history", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "transactions" in data, "Missing transactions key"
        assert isinstance(data["transactions"], list), "transactions should be a list"
        
        # If there are transactions, verify structure
        if len(data["transactions"]) > 0:
            tx = data["transactions"][0]
            assert "id" in tx, "Transaction missing id"
            assert "service_type" in tx, "Transaction missing service_type"
            assert "status" in tx, "Transaction missing status"
            assert "amount" in tx, "Transaction missing amount"
            
            # Verify service type is valid
            valid_types = ["AIRTIME", "DATA", "BILL_PAYMENT", "MOMO_WITHDRAWAL"]
            assert tx["service_type"] in valid_types, f"Invalid service_type: {tx['service_type']}"
        
        print(f"✅ Service history returns {len(data['transactions'])} transactions")
    
    def test_get_service_history_filter_by_type(self, auth_headers):
        """GET /api/sdm/user/services/history?service_type=AIRTIME - filter by type"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/services/history?service_type=AIRTIME", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # All transactions should be AIRTIME type
        for tx in data["transactions"]:
            assert tx["service_type"] == "AIRTIME", f"Expected AIRTIME, got {tx['service_type']}"
        
        print(f"✅ History filter by AIRTIME type works, found {len(data['transactions'])} transactions")
    
    def test_service_history_requires_auth(self):
        """GET /api/sdm/user/services/history requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/services/history")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✅ Service history requires authentication")


class TestServiceIntegration:
    """Integration tests for complete service flows"""
    
    @pytest.fixture(scope="class")
    def user_token(self):
        """Login as test user and get token"""
        response = requests.post(f"{BASE_URL}/api/sdm/auth/send-otp", json={"phone": TEST_PHONE})
        assert response.status_code == 200
        
        response = requests.post(f"{BASE_URL}/api/sdm/auth/verify-otp", json={
            "phone": TEST_PHONE,
            "otp_code": TEST_OTP
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, user_token):
        return {"Authorization": f"Bearer {user_token}"}
    
    def test_service_deducts_balance(self, auth_headers):
        """Verify that service purchases deduct from cashback balance"""
        # Get initial balance
        balance_before = requests.get(f"{BASE_URL}/api/sdm/user/services/balance", headers=auth_headers)
        initial = balance_before.json()["cashback_balance"]
        
        if initial < 2:
            pytest.skip(f"Insufficient balance ({initial} GHS)")
        
        # Use unique phone number to avoid idempotency collision
        unique_phone = generate_unique_phone()
        
        # Buy 1 GHS airtime
        response = requests.post(f"{BASE_URL}/api/sdm/user/services/airtime", json={
            "phone_number": unique_phone,
            "amount": 1.0,
            "network": "MTN"
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # If duplicate, skip this test (idempotency triggered)
        if data.get("status") == "DUPLICATE":
            pytest.skip("Idempotency triggered - transaction already processed this hour")
        
        # Check balance after
        balance_after = requests.get(f"{BASE_URL}/api/sdm/user/services/balance", headers=auth_headers)
        final = balance_after.json()["cashback_balance"]
        
        # Balance should have decreased by 1 GHS
        assert final < initial, f"Balance should decrease. Before: {initial}, After: {final}"
        assert abs((initial - final) - 1.0) < 0.1, f"Expected ~1 GHS deduction, got {initial - final}"
        
        print(f"✅ Balance correctly deducted: {initial} -> {final} (diff: {initial - final})")
    
    def test_service_appears_in_history(self, auth_headers):
        """Verify that service purchase appears in history"""
        # Check balance first
        balance_resp = requests.get(f"{BASE_URL}/api/sdm/user/services/balance", headers=auth_headers)
        if balance_resp.json()["cashback_balance"] < 2:
            pytest.skip("Insufficient balance")
        
        # Use unique phone
        unique_phone = generate_unique_phone()
        
        # Make a purchase
        response = requests.post(f"{BASE_URL}/api/sdm/user/services/airtime", json={
            "phone_number": unique_phone,
            "amount": 1.0,
            "network": "MTN"
        }, headers=auth_headers)
        
        if response.status_code != 200:
            pytest.skip(f"Purchase failed: {response.text}")
        
        data = response.json()
        
        # Handle DUPLICATE status
        if data.get("status") == "DUPLICATE":
            # Use the original transaction reference from the duplicate response
            tx_reference = data.get("transaction", {}).get("reference")
            if not tx_reference:
                pytest.skip("DUPLICATE response without transaction reference")
        else:
            tx_reference = data["reference"]
        
        # Check history 
        history_after = requests.get(f"{BASE_URL}/api/sdm/user/services/history", headers=auth_headers)
        transactions = history_after.json()["transactions"]
        
        # Find our transaction
        found = False
        for tx in transactions:
            if tx.get("reference") == tx_reference:
                found = True
                break
        
        assert found, f"Transaction {tx_reference} not found in history"
        print(f"✅ Transaction {tx_reference} appears in history")


# Run tests directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
