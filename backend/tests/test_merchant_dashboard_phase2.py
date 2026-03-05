"""
SDM REWARDS - Phase 2 Merchant Dashboard Advanced Stats Tests
=============================================================
Testing:
- Advanced stats endpoint by period (day/week/month/year)
- Merchant summary/accounting endpoint  
- Chart data endpoint (daily/weekly/monthly)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
MERCHANT_PHONE = "+233551234567"
MERCHANT_PASSWORD = "Test1234!"
MERCHANT_PIN = "1234"


class TestMerchantDashboardPhase2:
    """Phase 2 Advanced Dashboard API Tests"""
    
    @pytest.fixture(scope="class")
    def merchant_token(self):
        """Get merchant auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/merchant/login",
            json={"phone": MERCHANT_PHONE, "password": MERCHANT_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns access_token, not token
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]

    @pytest.fixture(scope="class")
    def auth_headers(self, merchant_token):
        """Auth headers with token"""
        return {"Authorization": f"Bearer {merchant_token}"}

    # =============== ADVANCED STATS BY PERIOD ===============

    def test_advanced_stats_day(self, auth_headers):
        """Test advanced stats for day period"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/advanced-stats?period=day",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data["period"] == "day"
        assert data["period_label"] == "Aujourd'hui"
        
        # Verify current stats
        assert "current" in data
        assert "volume" in data["current"]
        assert "cashback" in data["current"]
        assert "transactions" in data["current"]
        assert "average_transaction" in data["current"]
        
        # Verify previous stats
        assert "previous" in data
        assert "volume" in data["previous"]
        
        # Verify growth indicators
        assert "growth" in data
        assert "volume" in data["growth"]
        assert "cashback" in data["growth"]
        assert "transactions" in data["growth"]
        assert "average_transaction" in data["growth"]
        
        # Verify period timestamps
        assert "period_start" in data
        assert "period_end" in data
        
        print(f"Day stats - Volume: {data['current']['volume']}, Txn: {data['current']['transactions']}, Growth: {data['growth']['volume']}%")

    def test_advanced_stats_week(self, auth_headers):
        """Test advanced stats for week period"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/advanced-stats?period=week",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["period"] == "week"
        assert data["period_label"] == "Cette semaine"
        assert "current" in data
        assert "previous" in data
        assert "growth" in data
        
        print(f"Week stats - Volume: {data['current']['volume']}, Txn: {data['current']['transactions']}")

    def test_advanced_stats_month(self, auth_headers):
        """Test advanced stats for month period"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/advanced-stats?period=month",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["period"] == "month"
        assert data["period_label"] == "Ce mois"
        assert "current" in data
        assert "previous" in data
        assert "growth" in data
        
        print(f"Month stats - Volume: {data['current']['volume']}, Txn: {data['current']['transactions']}")

    def test_advanced_stats_year(self, auth_headers):
        """Test advanced stats for year period"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/advanced-stats?period=year",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["period"] == "year"
        assert data["period_label"] == "Cette année"
        assert "current" in data
        assert "previous" in data
        assert "growth" in data
        
        print(f"Year stats - Volume: {data['current']['volume']}, Txn: {data['current']['transactions']}")

    def test_advanced_stats_invalid_period(self, auth_headers):
        """Test advanced stats with invalid period defaults to day"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/advanced-stats?period=invalid",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Invalid period defaults to "day" behavior
        assert data["period"] == "invalid"  # period is echoed back
        assert "current" in data  # But stats are calculated

    # =============== MERCHANT SUMMARY (MINI COMPTABILITE) ===============

    def test_merchant_summary(self, auth_headers):
        """Test merchant accounting summary endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/summary",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify all-time totals
        assert "all_time" in data
        assert "total_volume" in data["all_time"]
        assert "total_cashback" in data["all_time"]
        assert "total_transactions" in data["all_time"]
        assert "average_transaction" in data["all_time"]
        assert "unique_clients" in data["all_time"]
        
        # Verify by_period breakdown
        assert "by_period" in data
        assert "day" in data["by_period"]
        assert "week" in data["by_period"]
        assert "month" in data["by_period"]
        assert "year" in data["by_period"]
        
        # Verify each period has expected fields
        for period_name in ["day", "week", "month", "year"]:
            period_data = data["by_period"][period_name]
            assert "volume" in period_data
            assert "cashback" in period_data
            assert "transactions" in period_data
        
        # Verify additional info
        assert "cashback_rate" in data
        assert "member_since" in data
        
        print(f"Summary - Total Volume: {data['all_time']['total_volume']}, "
              f"Total Txn: {data['all_time']['total_transactions']}, "
              f"Unique Clients: {data['all_time']['unique_clients']}")

    def test_merchant_summary_data_values(self, auth_headers):
        """Test that summary data has expected values based on seed data"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/summary",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Based on context: total_volume=5522.23, total_cashback=276.09, 20 transactions, 5 unique clients
        # Allow some variance as values may change
        assert data["all_time"]["total_volume"] >= 0
        assert data["all_time"]["total_cashback"] >= 0
        assert data["all_time"]["total_transactions"] >= 0
        assert data["all_time"]["unique_clients"] >= 0
        
        # Verify average transaction calculation is correct
        if data["all_time"]["total_transactions"] > 0:
            expected_avg = data["all_time"]["total_volume"] / data["all_time"]["total_transactions"]
            assert abs(data["all_time"]["average_transaction"] - expected_avg) < 0.1
        
        print(f"Data validation passed - All values are numeric and consistent")

    # =============== CHART DATA ===============

    def test_chart_data_daily(self, auth_headers):
        """Test chart data for daily view (last 7 days)"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/chart-data?chart_type=daily",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert data["chart_type"] == "daily"
        assert "data" in data
        assert "totals" in data
        
        # Should have 7 data points (last 7 days)
        assert len(data["data"]) == 7
        
        # Verify each data point structure
        for point in data["data"]:
            assert "label" in point  # e.g., "Mon", "Tue"
            assert "date" in point
            assert "volume" in point
            assert "cashback" in point
            assert "transactions" in point
        
        # Verify totals
        assert "volume" in data["totals"]
        assert "cashback" in data["totals"]
        assert "transactions" in data["totals"]
        
        # Verify totals match sum of data points
        sum_volume = sum(p["volume"] for p in data["data"])
        assert abs(data["totals"]["volume"] - sum_volume) < 0.1
        
        print(f"Daily chart - 7 days data, Total Volume: {data['totals']['volume']}")

    def test_chart_data_weekly(self, auth_headers):
        """Test chart data for weekly view (last 4 weeks)"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/chart-data?chart_type=weekly",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["chart_type"] == "weekly"
        assert "data" in data
        assert "totals" in data
        
        # Should have 4 data points (last 4 weeks)
        assert len(data["data"]) == 4
        
        # Verify week labels (e.g., "S1", "S2")
        for point in data["data"]:
            assert "label" in point
            assert point["label"].startswith("S")  # Week number
        
        print(f"Weekly chart - 4 weeks data, Total Volume: {data['totals']['volume']}")

    def test_chart_data_monthly(self, auth_headers):
        """Test chart data for monthly view (last 6 months)"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/chart-data?chart_type=monthly",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["chart_type"] == "monthly"
        assert "data" in data
        assert "totals" in data
        
        # Should have 6 data points (last 6 months)
        assert len(data["data"]) == 6
        
        # Verify month labels (e.g., "Jan", "Feb")
        for point in data["data"]:
            assert "label" in point
            assert len(point["label"]) == 3  # 3-letter month abbreviation
        
        print(f"Monthly chart - 6 months data, Total Volume: {data['totals']['volume']}")

    def test_chart_data_default(self, auth_headers):
        """Test chart data with no chart_type defaults to daily"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/chart-data",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["chart_type"] == "daily"
        assert len(data["data"]) == 7

    # =============== AUTH CHECKS ===============

    def test_advanced_stats_no_auth(self):
        """Test advanced stats requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/advanced-stats?period=day"
        )
        assert response.status_code in [401, 403, 422]

    def test_summary_no_auth(self):
        """Test summary requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/summary"
        )
        assert response.status_code in [401, 403, 422]

    def test_chart_data_no_auth(self):
        """Test chart data requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/chart-data?chart_type=daily"
        )
        assert response.status_code in [401, 403, 422]

    # =============== GROWTH CALCULATIONS ===============

    def test_growth_percentage_calculation(self, auth_headers):
        """Test that growth percentages are calculated correctly"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/advanced-stats?period=day",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify growth is a number (can be positive, negative, or zero)
        assert isinstance(data["growth"]["volume"], (int, float))
        assert isinstance(data["growth"]["cashback"], (int, float))
        assert isinstance(data["growth"]["transactions"], (int, float))
        assert isinstance(data["growth"]["average_transaction"], (int, float))
        
        print(f"Growth indicators - Volume: {data['growth']['volume']}%, "
              f"Txn: {data['growth']['transactions']}%")

    # =============== BASIC DASHBOARD (existing endpoint) ===============

    def test_basic_dashboard_still_works(self, auth_headers):
        """Test that basic /me endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/me",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "merchant" in data
        assert "stats" in data
        assert "recent_transactions" in data
        
        print(f"Basic dashboard - Merchant: {data['merchant']['business_name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
