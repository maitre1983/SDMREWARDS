"""
SDM REWARDS - SEO & SMS Notification Features Test Suite
=========================================================
Tests: 
- Card expiration reminder task API
- robots.txt and sitemap.xml accessibility
- SMS notification functions exist in sms_service.py
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "SDM REWARDS API"
        print("✅ API Health Check PASSED")


class TestCardExpirationReminders:
    """Tests for POST /api/tasks/card-expiration-reminders endpoint"""
    
    def test_card_expiration_task_endpoint(self):
        """Test the card expiration reminders task API"""
        response = requests.post(f"{BASE_URL}/api/tasks/card-expiration-reminders")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "reminders_sent" in data
        assert isinstance(data["reminders_sent"], int)
        assert "timestamp" in data
        print(f"✅ Card Expiration Reminders API PASSED - Reminders sent: {data['reminders_sent']}")
    
    def test_card_expiration_task_returns_correct_fields(self):
        """Verify the response structure"""
        response = requests.post(f"{BASE_URL}/api/tasks/card-expiration-reminders")
        data = response.json()
        
        # Check all expected fields
        expected_fields = ["success", "reminders_sent", "timestamp"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Validate types
        assert isinstance(data["success"], bool)
        assert isinstance(data["reminders_sent"], int)
        assert isinstance(data["timestamp"], str)
        print("✅ Card Expiration Reminders Response Structure PASSED")


class TestSEOFiles:
    """Tests for SEO files accessibility"""
    
    def test_robots_txt_accessible(self):
        """Test robots.txt is accessible"""
        response = requests.get(f"{BASE_URL}/robots.txt")
        assert response.status_code == 200
        content = response.text
        
        # Check for SDM REWARDS specific content
        assert "User-agent:" in content
        assert "Allow:" in content
        assert "Sitemap:" in content
        print("✅ robots.txt Accessible PASSED")
    
    def test_robots_txt_contains_sdm_content(self):
        """Test robots.txt contains SDM specific rules"""
        response = requests.get(f"{BASE_URL}/robots.txt")
        content = response.text
        
        # Check for SDM specific disallow rules
        assert "SDM REWARDS" in content
        assert "/admin" in content
        assert "/api/" in content
        assert "sitemap.xml" in content.lower()
        print("✅ robots.txt SDM Content PASSED")
    
    def test_sitemap_xml_accessible(self):
        """Test sitemap.xml is accessible"""
        response = requests.get(f"{BASE_URL}/sitemap.xml")
        assert response.status_code == 200
        content = response.text
        
        # Check XML structure
        assert '<?xml version="1.0"' in content
        assert '<urlset' in content
        assert '</urlset>' in content
        print("✅ sitemap.xml Accessible PASSED")
    
    def test_sitemap_xml_contains_valid_urls(self):
        """Test sitemap.xml contains valid URLs"""
        response = requests.get(f"{BASE_URL}/sitemap.xml")
        content = response.text
        
        # Check for expected URLs
        assert '<loc>' in content
        assert '<lastmod>' in content
        assert '<changefreq>' in content
        assert '<priority>' in content
        
        # Check for key pages
        assert '/client' in content
        assert '/merchant' in content
        assert '/terms' in content
        assert '/privacy' in content
        assert '/faq' in content
        print("✅ sitemap.xml Valid URLs PASSED")
    
    def test_sitemap_xml_valid_structure(self):
        """Test sitemap.xml has valid XML structure"""
        response = requests.get(f"{BASE_URL}/sitemap.xml")
        content = response.text
        
        # Count URLs - should have multiple pages
        url_count = content.count('<url>')
        assert url_count >= 5, f"Expected at least 5 URLs, found {url_count}"
        print(f"✅ sitemap.xml Contains {url_count} URLs PASSED")


class TestSMSServiceFunctions:
    """Tests for SMS service notification functions existence"""
    
    def test_sms_service_file_exists(self):
        """Test sms_service.py exists and is importable"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        # Try to import the service
        from services.sms_service import SMSService, get_sms_service
        
        # Verify functions exist
        sms = SMSService()
        
        # Check key methods exist
        assert hasattr(sms, 'notify_card_expiring'), "Missing notify_card_expiring method"
        assert hasattr(sms, 'notify_card_expired'), "Missing notify_card_expired method"
        assert hasattr(sms, 'notify_referral_bonus'), "Missing notify_referral_bonus method"
        assert hasattr(sms, 'notify_payment_received'), "Missing notify_payment_received method"
        assert hasattr(sms, 'send_sms'), "Missing send_sms method"
        print("✅ SMS Service Functions Exist PASSED")
    
    def test_sms_notify_card_expiring_method(self):
        """Test notify_card_expiring method signature"""
        import sys
        sys.path.insert(0, '/app/backend')
        from services.sms_service import SMSService
        import inspect
        
        sms = SMSService()
        sig = inspect.signature(sms.notify_card_expiring)
        params = list(sig.parameters.keys())
        
        # Check required parameters
        assert 'phone' in params, "Missing phone parameter"
        assert 'card_type' in params, "Missing card_type parameter"
        assert 'days_remaining' in params, "Missing days_remaining parameter"
        print("✅ notify_card_expiring Method Signature PASSED")
    
    def test_sms_notify_card_expired_method(self):
        """Test notify_card_expired method signature"""
        import sys
        sys.path.insert(0, '/app/backend')
        from services.sms_service import SMSService
        import inspect
        
        sms = SMSService()
        sig = inspect.signature(sms.notify_card_expired)
        params = list(sig.parameters.keys())
        
        # Check required parameters
        assert 'phone' in params, "Missing phone parameter"
        assert 'card_type' in params, "Missing card_type parameter"
        print("✅ notify_card_expired Method Signature PASSED")
    
    def test_sms_notify_referral_bonus_method(self):
        """Test notify_referral_bonus method exists for referral SMS"""
        import sys
        sys.path.insert(0, '/app/backend')
        from services.sms_service import SMSService
        import inspect
        
        sms = SMSService()
        assert callable(sms.notify_referral_bonus), "notify_referral_bonus should be callable"
        
        sig = inspect.signature(sms.notify_referral_bonus)
        params = list(sig.parameters.keys())
        
        assert 'phone' in params
        assert 'bonus' in params
        assert 'referred_name' in params
        print("✅ notify_referral_bonus Method Signature PASSED")


class TestSMSTestMode:
    """Tests for SMS test mode behavior"""
    
    def test_sms_test_mode_configured(self):
        """Test SMS_TEST_MODE environment variable behavior"""
        import sys
        sys.path.insert(0, '/app/backend')
        from services.sms_service import SMS_TEST_MODE
        
        # In test environment, SMS_TEST_MODE should be true
        assert isinstance(SMS_TEST_MODE, bool)
        print(f"✅ SMS Test Mode: {SMS_TEST_MODE}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
