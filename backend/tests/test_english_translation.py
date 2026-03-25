"""
Test English Translation for Backend APIs
Tests that period_label and other labels are returned in English
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test that health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✅ Health check passed: {data}")


class TestMerchantDashboardEnglish:
    """Test that merchant dashboard API returns English labels"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as merchant and get token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/merchant/login",
            json={"phone": "+233500700500", "password": "test123"}
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Merchant login failed - skipping merchant tests")
    
    def test_period_label_day_is_english(self):
        """Test that period_label for day returns 'Today' in English"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/advanced-stats?period=day",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "period_label" in data
        assert data["period_label"] == "Today", f"Expected 'Today', got '{data['period_label']}'"
        print(f"✅ period_label for day: {data['period_label']}")
    
    def test_period_label_week_is_english(self):
        """Test that period_label for week returns 'This Week' in English"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/advanced-stats?period=week",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "period_label" in data
        assert data["period_label"] == "This Week", f"Expected 'This Week', got '{data['period_label']}'"
        print(f"✅ period_label for week: {data['period_label']}")
    
    def test_period_label_month_is_english(self):
        """Test that period_label for month returns 'This Month' in English"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/advanced-stats?period=month",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "period_label" in data
        assert data["period_label"] == "This Month", f"Expected 'This Month', got '{data['period_label']}'"
        print(f"✅ period_label for month: {data['period_label']}")
    
    def test_period_label_year_is_english(self):
        """Test that period_label for year returns 'This Year' in English"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/dashboard/advanced-stats?period=year",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "period_label" in data
        assert data["period_label"] == "This Year", f"Expected 'This Year', got '{data['period_label']}'"
        print(f"✅ period_label for year: {data['period_label']}")
    
    def test_no_french_period_labels(self):
        """Test that no French period labels are returned"""
        french_labels = ["Aujourd'hui", "Cette semaine", "Ce mois", "Cette année"]
        
        for period in ["day", "week", "month", "year"]:
            response = requests.get(
                f"{BASE_URL}/api/merchants/dashboard/advanced-stats?period={period}",
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            period_label = data.get("period_label", "")
            
            for french_label in french_labels:
                assert french_label not in period_label, f"Found French label '{french_label}' in period_label"
        
        print("✅ No French period labels found")


class TestLegacyRoutesEnglish:
    """Test that legacy routes return English labels"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as merchant and get token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/merchant/login",
            json={"phone": "+233500700500", "password": "test123"}
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Merchant login failed - skipping legacy route tests")
    
    def test_legacy_stats_period_label_english(self):
        """Test that legacy stats endpoint returns English period labels"""
        for period in ["day", "week", "month", "year"]:
            response = requests.get(
                f"{BASE_URL}/api/merchants/stats?period={period}",
                headers=self.headers
            )
            if response.status_code == 200:
                data = response.json()
                if "period_label" in data:
                    french_labels = ["Aujourd'hui", "Cette semaine", "Ce mois", "Cette année"]
                    for french_label in french_labels:
                        assert french_label not in data.get("period_label", ""), \
                            f"Found French label '{french_label}' in legacy stats"
        
        print("✅ Legacy routes return English labels")


class TestLanguageAPI:
    """Test language API endpoints"""
    
    def test_translations_endpoint_english(self):
        """Test that English translations are available"""
        response = requests.get(f"{BASE_URL}/api/language/translations/en")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✅ English translations available")
    
    def test_language_detection(self):
        """Test language detection endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/language/detect",
            json={"browser_languages": ["en-US", "en"]}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("detected_language") == "en"
        print(f"✅ Language detection returns English for English browser")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
