"""
Usage Tracking Dashboard API Tests
===================================
Tests for:
- GET /api/admin/withdrawal-limits/usage - Get client usage dashboard data
- Filter by approaching limit (at-risk clients)
- Sort by different criteria (daily_usage, weekly_usage, monthly_usage, etc.)
- Query parameters validation

Test credentials: test_admin@sdmrewards.com / TestAdmin123!
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test admin credentials
TEST_ADMIN_EMAIL = "test_admin@sdmrewards.com"
TEST_ADMIN_PASSWORD = "TestAdmin123!"


class TestUsageTrackingDashboardAPI:
    """Usage tracking dashboard API tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        else:
            pytest.skip(f"Failed to login admin: {response.status_code} - {response.text}")

    def test_get_usage_requires_auth(self):
        """Test GET /api/admin/withdrawal-limits/usage returns 401/422 without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/withdrawal-limits/usage")
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}: {response.text}"
        print("✓ GET withdrawal-limits/usage correctly requires authentication")

    def test_get_usage_success(self):
        """Test GET /api/admin/withdrawal-limits/usage returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/admin/withdrawal-limits/usage", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        
        # Verify response structure
        assert "clients" in data, "Expected 'clients' array in response"
        assert "summary" in data, "Expected 'summary' in response"
        assert "period" in data, "Expected 'period' in response"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_clients_with_activity" in summary, "Expected 'total_clients_with_activity' in summary"
        assert "clients_at_limit" in summary, "Expected 'clients_at_limit' in summary"
        assert "clients_approaching_limit" in summary, "Expected 'clients_approaching_limit' in summary"
        assert "total_daily_volume" in summary, "Expected 'total_daily_volume' in summary"
        assert "total_weekly_volume" in summary, "Expected 'total_weekly_volume' in summary"
        assert "total_monthly_volume" in summary, "Expected 'total_monthly_volume' in summary"
        assert "global_limits" in summary, "Expected 'global_limits' in summary"
        
        # Verify period structure
        period = data["period"]
        assert "today_start" in period, "Expected 'today_start' in period"
        assert "week_start" in period, "Expected 'week_start' in period"
        assert "month_start" in period, "Expected 'month_start' in period"
        
        print(f"✓ GET withdrawal-limits/usage returns valid structure")
        print(f"  - Total clients with activity: {summary['total_clients_with_activity']}")
        print(f"  - Clients at limit: {summary['clients_at_limit']}")
        print(f"  - Clients approaching limit: {summary['clients_approaching_limit']}")
        print(f"  - Today's volume: {summary['total_daily_volume']}")

    def test_get_usage_with_limit_param(self):
        """Test GET /api/admin/withdrawal-limits/usage?limit=10 respects limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits/usage?limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        clients = data.get("clients", [])
        
        # Should return at most 10 clients (could be fewer if less data exists)
        assert len(clients) <= 10, f"Expected at most 10 clients, got {len(clients)}"
        print(f"✓ Limit parameter works: got {len(clients)} clients (max 10)")

    def test_get_usage_with_sort_by_daily_usage(self):
        """Test sort_by=daily_usage parameter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits/usage?sort_by=daily_usage",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        print("✓ sort_by=daily_usage parameter accepted")

    def test_get_usage_with_sort_by_weekly_usage(self):
        """Test sort_by=weekly_usage parameter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits/usage?sort_by=weekly_usage",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        print("✓ sort_by=weekly_usage parameter accepted")

    def test_get_usage_with_sort_by_monthly_usage(self):
        """Test sort_by=monthly_usage parameter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits/usage?sort_by=monthly_usage",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        print("✓ sort_by=monthly_usage parameter accepted")

    def test_get_usage_with_sort_by_daily_percent(self):
        """Test sort_by=daily_percent parameter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits/usage?sort_by=daily_percent",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        print("✓ sort_by=daily_percent parameter accepted")

    def test_get_usage_with_filter_approaching(self):
        """Test filter_approaching=true shows only at-risk clients"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits/usage?filter_approaching=true&threshold=0.8",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        
        clients = data.get("clients", [])
        # If there are clients, they should all be approaching or at limit (>=80%)
        for client in clients:
            max_percent = max(
                client.get("daily_percent", 0),
                client.get("weekly_percent", 0),
                client.get("monthly_percent", 0)
            )
            assert max_percent >= 80, f"Client {client.get('name')} is not at-risk (max_percent={max_percent})"
        
        print(f"✓ filter_approaching=true works: {len(clients)} at-risk clients")

    def test_get_usage_with_custom_threshold(self):
        """Test custom threshold parameter (e.g., 0.5 for 50%)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits/usage?filter_approaching=true&threshold=0.5",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        print("✓ Custom threshold parameter (0.5) accepted")

    def test_get_usage_client_data_structure(self):
        """Test that each client object has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits/usage",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        clients = data.get("clients", [])
        
        if len(clients) > 0:
            client = clients[0]
            
            # Check required fields in client object
            required_fields = [
                "client_id", "name", "phone", "email",
                "daily_usage", "weekly_usage", "monthly_usage",
                "daily_percent", "weekly_percent", "monthly_percent",
                "tx_count", "status"
            ]
            
            for field in required_fields:
                assert field in client, f"Expected '{field}' in client object, got {list(client.keys())}"
            
            # Check status is valid
            valid_statuses = ["at_limit", "approaching", "normal"]
            assert client["status"] in valid_statuses, f"Invalid status: {client['status']}"
            
            print(f"✓ Client data structure verified with all required fields")
            print(f"  - Sample client: {client.get('name')} ({client.get('status')})")
        else:
            print("⚠ No clients with withdrawal activity found - structure check skipped")
            print("  This is expected if no withdrawal transactions exist in the database")

    def test_get_usage_global_limits_included(self):
        """Test that global limits are included in summary"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits/usage",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        global_limits = data.get("summary", {}).get("global_limits", {})
        
        # Check momo limits
        assert "momo" in global_limits, "Expected 'momo' in global_limits"
        momo = global_limits["momo"]
        assert "daily" in momo, "Expected 'daily' in momo limits"
        assert "weekly" in momo, "Expected 'weekly' in momo limits"
        assert "monthly" in momo, "Expected 'monthly' in momo limits"
        
        # Check bank limits
        assert "bank" in global_limits, "Expected 'bank' in global_limits"
        bank = global_limits["bank"]
        assert "daily" in bank, "Expected 'daily' in bank limits"
        assert "weekly" in bank, "Expected 'weekly' in bank limits"
        assert "monthly" in bank, "Expected 'monthly' in bank limits"
        
        print(f"✓ Global limits included in response")
        print(f"  - MoMo: daily={momo['daily']}, weekly={momo['weekly']}, monthly={momo['monthly']}")
        print(f"  - Bank: daily={bank['daily']}, weekly={bank['weekly']}, monthly={bank['monthly']}")


class TestUsageTrackingEdgeCases:
    """Edge cases for usage tracking dashboard"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        else:
            pytest.skip(f"Failed to login admin: {response.status_code}")

    def test_invalid_token_rejected(self):
        """Test that invalid bearer token is rejected"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits/usage",
            headers={"Authorization": "Bearer invalid_token_xyz", "Content-Type": "application/json"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Invalid token correctly rejected")

    def test_invalid_sort_by_handled(self):
        """Test that invalid sort_by parameter doesn't crash the endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits/usage?sort_by=invalid_field",
            headers=self.headers
        )
        # Should either return 200 with default sort or 400 with validation error
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"✓ Invalid sort_by handled gracefully (status: {response.status_code})")

    def test_multiple_params_combined(self):
        """Test combining multiple query parameters"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawal-limits/usage?limit=5&sort_by=monthly_percent&filter_approaching=false&threshold=0.8",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        
        clients = data.get("clients", [])
        assert len(clients) <= 5, f"Limit not respected: got {len(clients)} clients"
        
        print(f"✓ Multiple parameters combined successfully: {len(clients)} clients returned")
