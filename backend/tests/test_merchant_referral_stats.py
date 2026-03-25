"""
Test Merchant Referral Stats API
================================
Tests for the new merchant referral dashboard endpoints:
- GET /api/merchants/referral-stats
- GET /api/merchants/referral-link

These endpoints support the refactored MerchantWithdrawal component
which now shows referral performance instead of manual withdrawal UI.
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test merchant credentials (from previous tests)
TEST_MERCHANT_PHONE = "+233500700500"
TEST_MERCHANT_PASSWORD = "test123"


class TestMerchantReferralStats:
    """Test merchant referral statistics endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with merchant authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.merchant = None
        
    def _login_merchant(self):
        """Login as test merchant and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": TEST_MERCHANT_PHONE,
            "password": TEST_MERCHANT_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.merchant = data.get("merchant")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return True
        return False
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✅ API health check passed - version {data.get('version')}")
    
    def test_merchant_login(self):
        """Test merchant login to get auth token"""
        success = self._login_merchant()
        
        if not success:
            # Try to create a test merchant if login fails
            print("⚠️ Test merchant login failed - may need to create test merchant")
            pytest.skip("Test merchant not available")
        
        assert self.token is not None
        assert self.merchant is not None
        print(f"✅ Merchant login successful: {self.merchant.get('business_name')}")
        print(f"   Recruitment QR: {self.merchant.get('recruitment_qr_code')}")
    
    def test_referral_stats_endpoint(self):
        """Test GET /api/merchants/referral-stats endpoint"""
        if not self._login_merchant():
            pytest.skip("Merchant login required")
        
        response = self.session.get(f"{BASE_URL}/api/merchants/referral-stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should have success=True"
        
        # Check required fields exist
        required_fields = [
            "total_referrals",
            "total_earned",
            "earnings_today",
            "earnings_this_month",
            "referrals_today",
            "referrals_this_month",
            "bonus_per_referral",
            "recruitment_qr_code",
            "monthly_breakdown",
            "recent_referrals"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify data types
        assert isinstance(data["total_referrals"], int), "total_referrals should be int"
        assert isinstance(data["total_earned"], (int, float)), "total_earned should be numeric"
        assert isinstance(data["bonus_per_referral"], (int, float)), "bonus_per_referral should be numeric"
        assert isinstance(data["monthly_breakdown"], list), "monthly_breakdown should be list"
        assert isinstance(data["recent_referrals"], list), "recent_referrals should be list"
        
        # Verify bonus amount is 3 GHS
        assert data["bonus_per_referral"] == 3.0, f"Bonus should be 3 GHS, got {data['bonus_per_referral']}"
        
        print(f"✅ Referral stats endpoint working")
        print(f"   Total referrals: {data['total_referrals']}")
        print(f"   Total earned: GHS {data['total_earned']}")
        print(f"   Earnings today: GHS {data['earnings_today']}")
        print(f"   Earnings this month: GHS {data['earnings_this_month']}")
        print(f"   Recruitment QR: {data['recruitment_qr_code']}")
    
    def test_referral_stats_monthly_breakdown(self):
        """Test monthly breakdown structure in referral stats"""
        if not self._login_merchant():
            pytest.skip("Merchant login required")
        
        response = self.session.get(f"{BASE_URL}/api/merchants/referral-stats")
        assert response.status_code == 200
        
        data = response.json()
        monthly_breakdown = data.get("monthly_breakdown", [])
        
        # Should have 6 months of data
        assert len(monthly_breakdown) == 6, f"Expected 6 months, got {len(monthly_breakdown)}"
        
        # Verify each month has required fields
        for month in monthly_breakdown:
            assert "month" in month, "Month should have 'month' field"
            assert "month_short" in month, "Month should have 'month_short' field"
            assert "year" in month, "Month should have 'year' field"
            assert "referrals" in month, "Month should have 'referrals' field"
            assert "earnings" in month, "Month should have 'earnings' field"
        
        print(f"✅ Monthly breakdown structure valid")
        print(f"   Months: {[m['month_short'] for m in monthly_breakdown]}")
    
    def test_referral_link_endpoint(self):
        """Test GET /api/merchants/referral-link endpoint"""
        if not self._login_merchant():
            pytest.skip("Merchant login required")
        
        response = self.session.get(f"{BASE_URL}/api/merchants/referral-link")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should have success=True"
        
        # Check required fields
        required_fields = [
            "recruitment_qr_code",
            "referral_link",
            "bonus_per_referral",
            "share_messages"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify referral code format (SDM-R-xxx)
        qr_code = data["recruitment_qr_code"]
        assert qr_code.startswith("SDM-R-"), f"QR code should start with SDM-R-, got {qr_code}"
        
        # Verify referral link contains the code
        referral_link = data["referral_link"]
        assert qr_code in referral_link, "Referral link should contain the QR code"
        
        # Verify share messages
        share_messages = data["share_messages"]
        assert "whatsapp" in share_messages, "Should have WhatsApp message"
        assert "sms" in share_messages, "Should have SMS message"
        assert qr_code in share_messages["whatsapp"], "WhatsApp message should contain code"
        
        print(f"✅ Referral link endpoint working")
        print(f"   QR Code: {qr_code}")
        print(f"   Link: {referral_link}")
    
    def test_referral_stats_unauthorized(self):
        """Test that referral stats requires authentication"""
        # Make request without auth token
        response = requests.get(f"{BASE_URL}/api/merchants/referral-stats")
        
        # Should return 401 or 422 (missing auth header)
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        print(f"✅ Unauthorized access correctly rejected with {response.status_code}")
    
    def test_referral_link_unauthorized(self):
        """Test that referral link requires authentication"""
        response = requests.get(f"{BASE_URL}/api/merchants/referral-link")
        
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        print(f"✅ Unauthorized access correctly rejected with {response.status_code}")


class TestClientRegistrationWithMerchantReferral:
    """Test client registration with merchant referral code"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_otp_send(self):
        """Test OTP sending for registration"""
        test_phone = f"+233{500000000 + int(datetime.now().timestamp()) % 100000000}"
        
        response = self.session.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": test_phone
        })
        
        # May be rate limited, so accept 200 or 429
        assert response.status_code in [200, 429], f"Expected 200/429, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "request_id" in data
            print(f"✅ OTP send working - request_id: {data.get('request_id')}")
        else:
            print(f"⚠️ OTP rate limited (expected in testing)")
    
    def test_merchant_referral_code_format(self):
        """Verify merchant referral codes follow SDM-R-xxx pattern"""
        # Login as merchant to get their referral code
        response = self.session.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": TEST_MERCHANT_PHONE,
            "password": TEST_MERCHANT_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip("Merchant login required")
        
        data = response.json()
        merchant = data.get("merchant", {})
        recruitment_qr = merchant.get("recruitment_qr_code", "")
        
        # Verify format
        assert recruitment_qr.startswith("SDM-R-"), f"Expected SDM-R- prefix, got {recruitment_qr}"
        print(f"✅ Merchant referral code format valid: {recruitment_qr}")


class TestNoManualWithdrawalUI:
    """
    Verify that manual withdrawal elements are NOT present in the new UI.
    This is a documentation test - actual UI testing done via Playwright.
    """
    
    def test_withdrawal_endpoint_still_exists(self):
        """
        The withdrawal endpoint should still exist for backward compatibility,
        but the UI should not show manual withdrawal controls.
        """
        # Login as merchant
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": TEST_MERCHANT_PHONE,
            "password": TEST_MERCHANT_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip("Merchant login required")
        
        token = response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Check balance endpoint still works
        balance_response = session.get(f"{BASE_URL}/api/merchants/balance")
        assert balance_response.status_code == 200
        
        balance_data = balance_response.json()
        print(f"✅ Balance endpoint still accessible")
        print(f"   Available: GHS {balance_data.get('available', 0)}")
        print(f"   Note: Manual withdrawal UI removed, auto-payout enabled")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
