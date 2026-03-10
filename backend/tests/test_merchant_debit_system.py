"""
Test Merchant Debit Account System for SDM Rewards Admin
=======================================================
Tests debit-overview, debit-settings, and unblock-debit endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "emileparfait2003@gmail.com"
ADMIN_PASSWORD = "password"
TEST_MERCHANT_ID = "e86c0e6b-fc36-4302-bf20-682a5543a1ea"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(admin_token):
    """Get auth headers"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestMerchantDebitOverview:
    """Test GET /api/admin/merchants/debit-overview endpoint"""
    
    def test_debit_overview_returns_200(self, auth_headers):
        """Test that debit-overview endpoint returns 200 status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/merchants/debit-overview",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_debit_overview_structure(self, auth_headers):
        """Test that debit-overview returns proper structure with accounts and summary"""
        response = requests.get(
            f"{BASE_URL}/api/admin/merchants/debit-overview",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Check top-level keys
        assert "accounts" in data, "Response should have 'accounts' key"
        assert "summary" in data, "Response should have 'summary' key"
        
        # Check summary structure
        summary = data["summary"]
        assert "total_merchants" in summary, "Summary should have 'total_merchants'"
        assert "total_debt" in summary, "Summary should have 'total_debt'"
        assert "total_credit" in summary, "Summary should have 'total_credit'"
        assert "blocked_count" in summary, "Summary should have 'blocked_count'"
        assert "warning_count" in summary, "Summary should have 'warning_count'"
    
    def test_debit_overview_has_merchants(self, auth_headers):
        """Test that debit-overview returns merchant accounts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/merchants/debit-overview",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        accounts = data.get("accounts", [])
        
        # Should have at least one merchant
        assert len(accounts) > 0, "Should have at least 1 merchant account"
        
        # Check account structure
        first_account = accounts[0]
        expected_fields = ["merchant_id", "business_name", "balance", "debit_limit", "status"]
        for field in expected_fields:
            assert field in first_account, f"Account should have '{field}' field"
    
    def test_debit_overview_account_fields(self, auth_headers):
        """Test that each account has all required fields with correct types"""
        response = requests.get(
            f"{BASE_URL}/api/admin/merchants/debit-overview",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        
        for account in data.get("accounts", []):
            assert "merchant_id" in account, "Account should have merchant_id"
            assert "business_name" in account, "Account should have business_name"
            assert "balance" in account, "Account should have balance"
            assert isinstance(account["balance"], (int, float)), "Balance should be numeric"
            assert "debit_limit" in account, "Account should have debit_limit"
            assert isinstance(account["debit_limit"], (int, float)), "debit_limit should be numeric"
            assert "status" in account, "Account should have status"
            assert account["status"] in ["active", "blocked", "warning", "not_configured"], f"Invalid status: {account['status']}"


class TestMerchantDebitSettings:
    """Test PUT /api/admin/merchants/{id}/debit-settings endpoint"""
    
    def test_update_debit_settings_success(self, auth_headers):
        """Test successfully updating debit settings for a merchant"""
        # First get the list of merchants to find a valid merchant_id
        overview_response = requests.get(
            f"{BASE_URL}/api/admin/merchants/debit-overview",
            headers=auth_headers
        )
        assert overview_response.status_code == 200
        
        accounts = overview_response.json().get("accounts", [])
        if not accounts:
            pytest.skip("No merchants found to test debit settings")
        
        # Use the first available merchant
        merchant_id = accounts[0]["merchant_id"]
        
        # Update debit settings
        response = requests.put(
            f"{BASE_URL}/api/admin/merchants/{merchant_id}/debit-settings",
            headers=auth_headers,
            json={
                "debit_limit": 500.00,
                "settlement_days": 30
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "message" in data, "Response should have a message"
    
    def test_update_debit_settings_with_test_merchant(self, auth_headers):
        """Test updating debit settings for the specific test merchant"""
        response = requests.put(
            f"{BASE_URL}/api/admin/merchants/{TEST_MERCHANT_ID}/debit-settings",
            headers=auth_headers,
            json={
                "debit_limit": 1000.00,
                "settlement_days": 14
            }
        )
        
        # 200 = success, 404 = merchant doesn't exist (which is a valid response)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
    
    def test_update_debit_settings_negative_limit_fails(self, auth_headers):
        """Test that negative debit limit is rejected"""
        overview_response = requests.get(
            f"{BASE_URL}/api/admin/merchants/debit-overview",
            headers=auth_headers
        )
        accounts = overview_response.json().get("accounts", [])
        if not accounts:
            pytest.skip("No merchants found")
        
        merchant_id = accounts[0]["merchant_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/merchants/{merchant_id}/debit-settings",
            headers=auth_headers,
            json={
                "debit_limit": -100.00,
                "settlement_days": 30
            }
        )
        
        # Should return 400 for negative limit
        assert response.status_code == 400, f"Expected 400 for negative limit, got {response.status_code}"
    
    def test_update_debit_settings_invalid_merchant_returns_404(self, auth_headers):
        """Test that updating settings for non-existent merchant returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/admin/merchants/nonexistent-merchant-id/debit-settings",
            headers=auth_headers,
            json={
                "debit_limit": 500.00,
                "settlement_days": 30
            }
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid merchant, got {response.status_code}"


class TestMerchantUnblockDebit:
    """Test POST /api/admin/merchants/{id}/unblock-debit endpoint"""
    
    def test_unblock_debit_not_blocked_returns_error(self, auth_headers):
        """Test that unblocking a non-blocked merchant returns appropriate error"""
        # Get a merchant that is NOT blocked
        overview_response = requests.get(
            f"{BASE_URL}/api/admin/merchants/debit-overview",
            headers=auth_headers
        )
        accounts = overview_response.json().get("accounts", [])
        
        # Find a non-blocked account
        non_blocked = [a for a in accounts if not a.get("is_blocked", False)]
        if not non_blocked:
            pytest.skip("No non-blocked merchants to test")
        
        merchant_id = non_blocked[0]["merchant_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/merchants/{merchant_id}/unblock-debit",
            headers=auth_headers
        )
        
        # Should return 400 since account is not blocked
        assert response.status_code == 400, f"Expected 400 for unblocking non-blocked account, got {response.status_code}"
    
    def test_unblock_invalid_merchant_returns_404(self, auth_headers):
        """Test that unblocking non-existent merchant returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/admin/merchants/invalid-merchant-id/unblock-debit",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid merchant, got {response.status_code}"


class TestDebitOverviewSummaryCalculations:
    """Test that summary calculations in debit overview are accurate"""
    
    def test_summary_totals_are_numeric(self, auth_headers):
        """Test that all summary totals are numeric values"""
        response = requests.get(
            f"{BASE_URL}/api/admin/merchants/debit-overview",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        summary = response.json().get("summary", {})
        
        assert isinstance(summary.get("total_merchants"), int), "total_merchants should be int"
        assert isinstance(summary.get("total_debt"), (int, float)), "total_debt should be numeric"
        assert isinstance(summary.get("total_credit"), (int, float)), "total_credit should be numeric"
        assert isinstance(summary.get("blocked_count"), int), "blocked_count should be int"
        assert isinstance(summary.get("warning_count"), int), "warning_count should be int"
    
    def test_total_merchants_matches_accounts_length(self, auth_headers):
        """Test that total_merchants in summary matches accounts array length"""
        response = requests.get(
            f"{BASE_URL}/api/admin/merchants/debit-overview",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        accounts = data.get("accounts", [])
        summary = data.get("summary", {})
        
        assert summary.get("total_merchants") == len(accounts), \
            f"total_merchants ({summary.get('total_merchants')}) should match accounts length ({len(accounts)})"


class TestMerchantDebitAccountPersistence:
    """Test that debit settings persist correctly"""
    
    def test_debit_settings_persist_after_update(self, auth_headers):
        """Test that updated debit settings are persisted and returned correctly"""
        # Get a merchant
        overview_response = requests.get(
            f"{BASE_URL}/api/admin/merchants/debit-overview",
            headers=auth_headers
        )
        accounts = overview_response.json().get("accounts", [])
        if not accounts:
            pytest.skip("No merchants found")
        
        merchant_id = accounts[0]["merchant_id"]
        
        # Set specific values
        new_limit = 750.00
        new_days = 21
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/merchants/{merchant_id}/debit-settings",
            headers=auth_headers,
            json={
                "debit_limit": new_limit,
                "settlement_days": new_days
            }
        )
        
        assert update_response.status_code == 200
        
        # Fetch again and verify
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/merchants/debit-overview",
            headers=auth_headers
        )
        
        updated_accounts = verify_response.json().get("accounts", [])
        updated_merchant = next((a for a in updated_accounts if a["merchant_id"] == merchant_id), None)
        
        assert updated_merchant is not None, "Merchant should still exist"
        assert updated_merchant["debit_limit"] == new_limit, \
            f"debit_limit should be {new_limit}, got {updated_merchant['debit_limit']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
