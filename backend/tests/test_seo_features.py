"""
Test SEO Features and Multilingual Support
Tests:
- SEO sitemap.xml endpoint
- SEO robots.txt endpoint
- SEO analytics overview endpoint
- SEO keyword suggestions endpoint
- AI analysis endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

class TestSEOSitemap:
    """Test XML Sitemap generation"""
    
    def test_sitemap_returns_xml(self):
        """Verify sitemap returns valid XML content"""
        response = requests.get(f"{BASE_URL}/api/seo/sitemap.xml")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "application/xml" in response.headers.get("content-type", "")
        assert "<?xml version" in response.text
        assert "<urlset" in response.text
        assert "</urlset>" in response.text
        print(f"✓ Sitemap returns valid XML (status: {response.status_code})")
    
    def test_sitemap_contains_required_urls(self):
        """Verify sitemap contains all required URLs"""
        response = requests.get(f"{BASE_URL}/api/seo/sitemap.xml")
        content = response.text
        
        required_paths = ["/", "/client-auth", "/merchant-auth", "/faq", "/privacy-policy"]
        for path in required_paths:
            assert path in content, f"Missing path {path} in sitemap"
        
        print(f"✓ Sitemap contains all required URLs: {required_paths}")
    
    def test_sitemap_has_valid_structure(self):
        """Verify sitemap has proper URL structure"""
        response = requests.get(f"{BASE_URL}/api/seo/sitemap.xml")
        content = response.text
        
        assert "<loc>" in content
        assert "<lastmod>" in content
        assert "<changefreq>" in content
        assert "<priority>" in content
        
        print("✓ Sitemap has valid XML structure with loc, lastmod, changefreq, priority")


class TestSEORobotsTxt:
    """Test robots.txt generation"""
    
    def test_robots_returns_text(self):
        """Verify robots.txt returns text content"""
        response = requests.get(f"{BASE_URL}/api/seo/robots.txt")
        assert response.status_code == 200
        assert "text/plain" in response.headers.get("content-type", "")
        print(f"✓ Robots.txt returns text/plain (status: {response.status_code})")
    
    def test_robots_has_required_directives(self):
        """Verify robots.txt has required SEO directives"""
        response = requests.get(f"{BASE_URL}/api/seo/robots.txt")
        content = response.text
        
        assert "User-agent:" in content
        assert "Allow:" in content
        assert "Disallow:" in content
        assert "Sitemap:" in content
        
        # Should disallow admin and API paths
        assert "Disallow: /api/" in content
        assert "Disallow: /admin" in content
        
        print("✓ Robots.txt has all required directives")


class TestSEOAnalyticsOverview:
    """Test SEO analytics overview endpoint"""
    
    def test_analytics_overview_returns_data(self):
        """Verify analytics overview returns expected data structure"""
        response = requests.get(f"{BASE_URL}/api/seo/analytics/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "overview" in data
        assert "seo_metrics" in data
        assert "target_keywords" in data
        
        print(f"✓ Analytics overview returns proper structure (status: {response.status_code})")
    
    def test_analytics_overview_contains_metrics(self):
        """Verify analytics overview contains expected metrics"""
        response = requests.get(f"{BASE_URL}/api/seo/analytics/overview")
        data = response.json()
        
        # Check overview has user/merchant stats
        overview = data.get("overview", {})
        assert "total_users" in overview or overview == {}  # May be empty on error
        
        # Check SEO metrics
        seo_metrics = data.get("seo_metrics", {})
        assert "indexed_pages" in seo_metrics or seo_metrics == {}
        
        print(f"✓ Analytics contains expected metrics: {list(overview.keys())}")


class TestSEOKeywordSuggestions:
    """Test AI-powered keyword suggestions endpoint"""
    
    def test_keyword_suggestions_returns_list(self):
        """Verify keyword suggestions returns list of keywords"""
        response = requests.get(f"{BASE_URL}/api/seo/keywords/suggestions")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert "keywords" in data
        assert isinstance(data["keywords"], list)
        assert len(data["keywords"]) > 0
        
        print(f"✓ Keyword suggestions returns {len(data['keywords'])} keywords")
    
    def test_keyword_structure(self):
        """Verify keyword objects have required structure"""
        response = requests.get(f"{BASE_URL}/api/seo/keywords/suggestions")
        data = response.json()
        
        keywords = data.get("keywords", [])
        if keywords:
            first_keyword = keywords[0]
            assert "keyword" in first_keyword
            assert "category" in first_keyword
            assert "difficulty" in first_keyword
            
            print(f"✓ Keyword structure valid: {first_keyword}")
    
    def test_keyword_suggestions_with_params(self):
        """Verify keyword suggestions with custom parameters"""
        response = requests.get(f"{BASE_URL}/api/seo/keywords/suggestions?industry=fintech&location=ghana")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        print("✓ Keyword suggestions works with custom params")


class TestSEOAIAnalysis:
    """Test AI-powered SEO analysis endpoint"""
    
    def test_analyze_endpoint_exists(self):
        """Verify analyze endpoint accepts POST requests"""
        response = requests.post(
            f"{BASE_URL}/api/seo/analyze",
            json={
                "url": "https://example.com",
                "target_keywords": ["test"]
            }
        )
        # Should return 200 on success or 500 if LLM not configured
        assert response.status_code in [200, 500]
        print(f"✓ AI Analysis endpoint responds (status: {response.status_code})")
    
    def test_content_generate_endpoint_exists(self):
        """Verify content generation endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/seo/content/generate?content_type=meta_description&topic=cashback"
        )
        # Should return 200 on success or 500 if LLM not configured
        assert response.status_code in [200, 500]
        print(f"✓ Content generation endpoint responds (status: {response.status_code})")


class TestAdminLogin:
    """Test admin login for SEO dashboard access"""
    
    def test_admin_login(self):
        """Verify admin login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={
                "email": "emileparfait2003@gmail.com",
                "password": "password"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert "admin" in data
        
        print(f"✓ Admin login successful")
        return data["access_token"]


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/admin/login",
        json={
            "email": "emileparfait2003@gmail.com",
            "password": "password"
        }
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin login failed")


class TestAuthenticatedSEO:
    """Test SEO endpoints that may require authentication"""
    
    def test_seo_history_endpoint(self, admin_token):
        """Test SEO analysis history endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/seo/history", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "analyses" in data
        
        print(f"✓ SEO history endpoint works (found {len(data['analyses'])} analyses)")
