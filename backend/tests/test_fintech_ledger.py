"""
SDM Fintech Ledger Module Tests
================================
Tests for Phase 1 Fintech infrastructure:
- Ledger with double-entry accounting
- Wallet management (Client, Merchant, SDM system wallets)
- Merchant deposit workflow (PENDING -> CONFIRMED)
- Withdrawal workflow (PENDING -> APPROVED -> PAID/REJECTED)
- Admin financial dashboard endpoints
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://web-boost-seo.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Gerard0103@"
TEST_MERCHANT_PHONE = "233246283156"
TEST_MERCHANT_API_KEY = "sdk_af10983a3524c11d21c39dfe2fbf4660"


class TestSetup:
    """Setup fixtures for all tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get admin headers"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def merchant_token(self):
        """Get merchant authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/login",
            json={"phone": TEST_MERCHANT_PHONE, "api_key": TEST_MERCHANT_API_KEY}
        )
        assert response.status_code == 200, f"Merchant login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def merchant_headers(self, merchant_token):
        """Get merchant headers"""
        return {
            "Authorization": f"Bearer {merchant_token}",
            "Content-Type": "application/json"
        }


class TestAdminFintechSummary(TestSetup):
    """Tests for Admin Fintech Summary endpoint"""
    
    def test_get_fintech_summary(self, admin_headers):
        """GET /api/sdm/admin/fintech/summary - Returns financial summary"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/fintech/summary",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate structure
        assert "sdm_wallets" in data, "Missing sdm_wallets in response"
        assert "client_wallets" in data, "Missing client_wallets in response"
        assert "merchant_wallets" in data, "Missing merchant_wallets in response"
        assert "pending_withdrawals" in data, "Missing pending_withdrawals in response"
        assert "transactions_by_type" in data, "Missing transactions_by_type in response"
        assert "generated_at" in data, "Missing generated_at in response"
        
        # Validate SDM wallets structure
        sdm_wallets = data["sdm_wallets"]
        assert "commission" in sdm_wallets, "Missing commission in sdm_wallets"
        assert "operations" in sdm_wallets, "Missing operations in sdm_wallets"
        assert "float" in sdm_wallets, "Missing float in sdm_wallets"
        
        # Validate client wallets structure
        client = data["client_wallets"]
        assert "count" in client, "Missing count in client_wallets"
        assert "total_available" in client, "Missing total_available in client_wallets"
        assert "total_pending" in client, "Missing total_pending in client_wallets"
        
        # Validate merchant wallets structure
        merchant = data["merchant_wallets"]
        assert "count" in merchant, "Missing count in merchant_wallets"
        assert "total_available" in merchant, "Missing total_available in merchant_wallets"
        
        print(f"✅ Fintech summary retrieved successfully")
        print(f"   - SDM Commission Wallet: GHS {sdm_wallets['commission']}")
        print(f"   - SDM Operations Wallet: GHS {sdm_wallets['operations']}")
        print(f"   - SDM Float Wallet: GHS {sdm_wallets['float']}")
        print(f"   - Client Wallets: {client['count']}")
        print(f"   - Merchant Wallets: {merchant['count']}")
        print(f"   - Pending Withdrawals: {data['pending_withdrawals']}")
    
    def test_fintech_summary_requires_auth(self):
        """GET /api/sdm/admin/fintech/summary - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/fintech/summary")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Fintech summary requires authentication")


class TestAdminFintechWallets(TestSetup):
    """Tests for Admin Wallets endpoint"""
    
    def test_get_all_wallets(self, admin_headers):
        """GET /api/sdm/admin/fintech/wallets - Returns all wallets"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/fintech/wallets?limit=100",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        if len(data) > 0:
            wallet = data[0]
            # Validate wallet structure
            assert "id" in wallet, "Missing id in wallet"
            assert "entity_type" in wallet, "Missing entity_type in wallet"
            assert "entity_id" in wallet, "Missing entity_id in wallet"
            assert "available_balance" in wallet, "Missing available_balance in wallet"
            assert "pending_balance" in wallet, "Missing pending_balance in wallet"
            assert "reserved_balance" in wallet, "Missing reserved_balance in wallet"
            assert "status" in wallet, "Missing status in wallet"
            assert "currency" in wallet, "Missing currency in wallet"
            
            print(f"✅ Got {len(data)} wallets")
            # Show wallet types breakdown
            types = {}
            for w in data:
                t = w.get("entity_type", "UNKNOWN")
                types[t] = types.get(t, 0) + 1
            for t, c in types.items():
                print(f"   - {t}: {c}")
        else:
            print("✅ No wallets found (empty list)")
    
    def test_filter_wallets_by_entity_type(self, admin_headers):
        """GET /api/sdm/admin/fintech/wallets?entity_type=MERCHANT - Filter by type"""
        for entity_type in ["CLIENT", "MERCHANT", "SDM_OPERATIONS", "SDM_COMMISSION", "SDM_FLOAT"]:
            response = requests.get(
                f"{BASE_URL}/api/sdm/admin/fintech/wallets?entity_type={entity_type}",
                headers=admin_headers
            )
            assert response.status_code == 200, f"Expected 200 for {entity_type}, got {response.status_code}"
            
            data = response.json()
            assert isinstance(data, list), f"Expected list for {entity_type}"
            
            # All returned wallets should match the filter
            for wallet in data:
                assert wallet["entity_type"] == entity_type, f"Got {wallet['entity_type']} but expected {entity_type}"
            
            print(f"✅ Filter by {entity_type}: {len(data)} wallets")


class TestAdminFintechTransactions(TestSetup):
    """Tests for Admin Ledger Transactions endpoint"""
    
    def test_get_ledger_transactions(self, admin_headers):
        """GET /api/sdm/admin/fintech/transactions - Returns ledger transactions"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/fintech/transactions?limit=50",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        if len(data) > 0:
            txn = data[0]
            # Validate transaction structure
            assert "id" in txn, "Missing id in transaction"
            assert "reference_id" in txn, "Missing reference_id in transaction"
            assert "transaction_type" in txn, "Missing transaction_type in transaction"
            assert "status" in txn, "Missing status in transaction"
            assert "amount" in txn, "Missing amount in transaction"
            assert "fee_amount" in txn, "Missing fee_amount in transaction"
            assert "net_amount" in txn, "Missing net_amount in transaction"
            assert "created_at" in txn, "Missing created_at in transaction"
            
            print(f"✅ Got {len(data)} ledger transactions")
            # Show transaction types breakdown
            types = {}
            for t in data:
                tt = t.get("transaction_type", "UNKNOWN")
                types[tt] = types.get(tt, 0) + 1
            for tt, c in types.items():
                print(f"   - {tt}: {c}")
        else:
            print("✅ No ledger transactions yet (empty list)")
    
    def test_filter_transactions_by_type(self, admin_headers):
        """GET /api/sdm/admin/fintech/transactions?transaction_type=DEPOSIT - Filter by type"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/fintech/transactions?transaction_type=DEPOSIT&limit=10",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list"
        
        for txn in data:
            assert txn["transaction_type"] == "DEPOSIT", f"Got {txn['transaction_type']} but expected DEPOSIT"
        
        print(f"✅ Filter by DEPOSIT: {len(data)} transactions")


class TestAdminFintechWithdrawals(TestSetup):
    """Tests for Admin Withdrawals endpoint"""
    
    def test_get_withdrawals(self, admin_headers):
        """GET /api/sdm/admin/fintech/withdrawals - Returns withdrawal requests"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/fintech/withdrawals?limit=50",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        if len(data) > 0:
            withdrawal = data[0]
            # Validate withdrawal structure
            assert "id" in withdrawal, "Missing id in withdrawal"
            assert "wallet_id" in withdrawal, "Missing wallet_id in withdrawal"
            assert "entity_type" in withdrawal, "Missing entity_type in withdrawal"
            assert "entity_id" in withdrawal, "Missing entity_id in withdrawal"
            assert "amount" in withdrawal, "Missing amount in withdrawal"
            assert "fee" in withdrawal, "Missing fee in withdrawal"
            assert "net_amount" in withdrawal, "Missing net_amount in withdrawal"
            assert "provider" in withdrawal, "Missing provider in withdrawal"
            assert "phone_number" in withdrawal, "Missing phone_number in withdrawal"
            assert "status" in withdrawal, "Missing status in withdrawal"
            assert "requested_at" in withdrawal, "Missing requested_at in withdrawal"
            
            print(f"✅ Got {len(data)} withdrawal requests")
            # Show status breakdown
            statuses = {}
            for w in data:
                s = w.get("status", "UNKNOWN")
                statuses[s] = statuses.get(s, 0) + 1
            for s, c in statuses.items():
                print(f"   - {s}: {c}")
        else:
            print("✅ No withdrawal requests yet (empty list)")
    
    def test_filter_withdrawals_by_status(self, admin_headers):
        """GET /api/sdm/admin/fintech/withdrawals?status=PENDING - Filter by status"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/fintech/withdrawals?status=PENDING&limit=10",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list"
        
        for w in data:
            assert w["status"] == "PENDING", f"Got {w['status']} but expected PENDING"
        
        print(f"✅ Filter by PENDING: {len(data)} withdrawals")


class TestAdminFintechDeposits(TestSetup):
    """Tests for Admin Deposits endpoint"""
    
    def test_get_deposits(self, admin_headers):
        """GET /api/sdm/admin/fintech/deposits - Returns merchant deposits"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/fintech/deposits?limit=50",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        if len(data) > 0:
            deposit = data[0]
            # Validate deposit structure
            assert "id" in deposit, "Missing id in deposit"
            assert "merchant_id" in deposit, "Missing merchant_id in deposit"
            assert "wallet_id" in deposit, "Missing wallet_id in deposit"
            assert "amount" in deposit, "Missing amount in deposit"
            assert "deposit_method" in deposit, "Missing deposit_method in deposit"
            assert "status" in deposit, "Missing status in deposit"
            assert "requested_at" in deposit, "Missing requested_at in deposit"
            
            print(f"✅ Got {len(data)} deposits")
            # Show status breakdown
            statuses = {}
            for d in data:
                s = d.get("status", "UNKNOWN")
                statuses[s] = statuses.get(s, 0) + 1
            for s, c in statuses.items():
                print(f"   - {s}: {c}")
        else:
            print("✅ No deposits yet (empty list)")


class TestAdminAuditLogs(TestSetup):
    """Tests for Admin Audit Logs endpoint"""
    
    def test_get_audit_logs(self, admin_headers):
        """GET /api/sdm/admin/fintech/audit-logs - Returns audit logs"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/fintech/audit-logs?limit=50",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        if len(data) > 0:
            log = data[0]
            # Validate audit log structure
            assert "id" in log, "Missing id in audit log"
            assert "action" in log, "Missing action in audit log"
            assert "entity_type" in log, "Missing entity_type in audit log"
            assert "entity_id" in log, "Missing entity_id in audit log"
            assert "performed_by" in log, "Missing performed_by in audit log"
            assert "performed_at" in log, "Missing performed_at in audit log"
            
            print(f"✅ Got {len(data)} audit logs")
            # Show action breakdown
            actions = {}
            for l in data:
                a = l.get("action", "UNKNOWN")
                actions[a] = actions.get(a, 0) + 1
            for a, c in actions.items():
                print(f"   - {a}: {c}")
        else:
            print("✅ No audit logs yet (empty list)")


class TestMerchantFintechWallet(TestSetup):
    """Tests for Merchant Fintech Wallet endpoint"""
    
    def test_get_merchant_wallet(self, merchant_headers):
        """GET /api/sdm/merchant/fintech/wallet - Returns merchant wallet"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/fintech/wallet",
            headers=merchant_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate wallet structure
        assert "id" in data, "Missing id in wallet"
        assert "entity_type" in data, "Missing entity_type in wallet"
        assert data["entity_type"] == "MERCHANT", f"Expected MERCHANT, got {data['entity_type']}"
        assert "entity_id" in data, "Missing entity_id in wallet"
        assert "available_balance" in data, "Missing available_balance in wallet"
        assert "pending_balance" in data, "Missing pending_balance in wallet"
        assert "reserved_balance" in data, "Missing reserved_balance in wallet"
        assert "status" in data, "Missing status in wallet"
        assert "currency" in data, "Missing currency in wallet"
        assert data["currency"] == "GHS", f"Expected GHS, got {data['currency']}"
        
        print(f"✅ Merchant wallet retrieved")
        print(f"   - Available: GHS {data['available_balance']}")
        print(f"   - Pending: GHS {data['pending_balance']}")
        print(f"   - Reserved: GHS {data['reserved_balance']}")
        print(f"   - Status: {data['status']}")


class TestMerchantDeposit(TestSetup):
    """Tests for Merchant Deposit workflow"""
    
    def test_create_merchant_deposit(self, merchant_headers, admin_headers):
        """POST /api/sdm/merchant/fintech/deposit - Create deposit and confirm"""
        # Step 1: Create a deposit request
        deposit_data = {
            "amount": 100.0,
            "deposit_method": "MOBILE_MONEY",
            "provider": "MTN",
            "provider_reference": f"TEST_DEP_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "notes": "Test deposit for integration testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/fintech/deposit",
            headers=merchant_headers,
            json=deposit_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message in response"
        assert "deposit" in data, "Missing deposit in response"
        
        deposit = data["deposit"]
        assert deposit["amount"] == 100.0, f"Expected amount 100.0, got {deposit['amount']}"
        assert deposit["status"] == "PENDING", f"Expected status PENDING, got {deposit['status']}"
        assert deposit["deposit_method"] == "MOBILE_MONEY", f"Expected MOBILE_MONEY, got {deposit['deposit_method']}"
        
        deposit_id = deposit["id"]
        print(f"✅ Deposit created: {deposit_id}")
        print(f"   - Amount: GHS {deposit['amount']}")
        print(f"   - Status: {deposit['status']}")
        
        # Step 2: Get merchant wallet balance before confirmation
        wallet_before = requests.get(
            f"{BASE_URL}/api/sdm/merchant/fintech/wallet",
            headers=merchant_headers
        ).json()
        balance_before = wallet_before["available_balance"]
        print(f"   - Merchant balance before: GHS {balance_before}")
        
        # Step 3: Admin confirms the deposit
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/fintech/deposits/{deposit_id}/confirm",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        confirm_data = response.json()
        assert "message" in confirm_data, "Missing message in confirm response"
        assert confirm_data["amount"] == 100.0, "Amount mismatch in confirmation"
        
        print(f"✅ Deposit confirmed by admin")
        
        # Step 4: Verify merchant wallet balance increased
        wallet_after = requests.get(
            f"{BASE_URL}/api/sdm/merchant/fintech/wallet",
            headers=merchant_headers
        ).json()
        balance_after = wallet_after["available_balance"]
        
        expected_balance = balance_before + 100.0
        assert balance_after == expected_balance, f"Expected {expected_balance}, got {balance_after}"
        
        print(f"✅ Merchant balance updated: GHS {balance_before} -> GHS {balance_after}")
        
        # Step 5: Verify deposit status changed
        deposits = requests.get(
            f"{BASE_URL}/api/sdm/admin/fintech/deposits",
            headers=admin_headers
        ).json()
        
        confirmed_deposit = next((d for d in deposits if d["id"] == deposit_id), None)
        assert confirmed_deposit is not None, "Deposit not found after confirmation"
        assert confirmed_deposit["status"] == "CONFIRMED", f"Expected CONFIRMED, got {confirmed_deposit['status']}"
        
        print(f"✅ Deposit workflow complete: PENDING -> CONFIRMED -> Balance credited")
    
    def test_get_merchant_deposits(self, merchant_headers):
        """GET /api/sdm/merchant/fintech/deposits - Returns merchant's deposits"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/fintech/deposits",
            headers=merchant_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        print(f"✅ Merchant has {len(data)} deposits")


class TestProcessPendingCashback(TestSetup):
    """Tests for processing pending cashback"""
    
    def test_process_pending_cashback(self, admin_headers):
        """POST /api/sdm/admin/fintech/process-pending - Process pending to available"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/fintech/process-pending",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message in response"
        assert "converted_count" in data, "Missing converted_count in response"
        assert "total_converted" in data, "Missing total_converted in response"
        assert "processed_at" in data, "Missing processed_at in response"
        
        print(f"✅ Pending cashback processing triggered")
        print(f"   - Converted: {data['converted_count']} transactions")
        print(f"   - Total: GHS {data['total_converted']}")


class TestUserFintechWallet(TestSetup):
    """Tests for User Fintech Wallet endpoint"""
    
    @pytest.fixture(scope="class")
    def user_token(self):
        """Get user authentication token via OTP flow"""
        # Send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/sdm/auth/send-otp",
            json={"phone": "+233000000000"}  # Test account
        )
        assert send_response.status_code == 200, f"Send OTP failed: {send_response.text}"
        
        # Verify OTP (test account uses 000000)
        verify_response = requests.post(
            f"{BASE_URL}/api/sdm/auth/verify-otp",
            json={"phone": "+233000000000", "otp_code": "000000"}
        )
        assert verify_response.status_code == 200, f"Verify OTP failed: {verify_response.text}"
        return verify_response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def user_headers(self, user_token):
        """Get user headers"""
        return {
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_user_wallet(self, user_headers):
        """GET /api/sdm/user/fintech/wallet - Returns user wallet"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/user/fintech/wallet",
            headers=user_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate wallet structure
        assert "id" in data, "Missing id in wallet"
        assert "entity_type" in data, "Missing entity_type in wallet"
        assert data["entity_type"] == "CLIENT", f"Expected CLIENT, got {data['entity_type']}"
        assert "available_balance" in data, "Missing available_balance in wallet"
        assert "pending_balance" in data, "Missing pending_balance in wallet"
        
        print(f"✅ User wallet retrieved")
        print(f"   - Available: GHS {data['available_balance']}")
        print(f"   - Pending: GHS {data['pending_balance']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
