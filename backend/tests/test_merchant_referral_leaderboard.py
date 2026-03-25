"""
Test Merchant Referral Leaderboard API
======================================
Tests for the new merchant referral leaderboard endpoints:
- GET /api/merchants/referral-leaderboard (merchant dashboard)
- GET /api/admin/merchant-referral-leaderboard (admin dashboard)

These endpoints support the leaderboard feature showing top recruiting merchants.
"""

import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_MERCHANT_PHONE = "+233500700500"
TEST_MERCHANT_PASSWORD = "test123"
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Gerard0103@')


class TestMerchantReferralLeaderboard:
    """Test merchant referral leaderboard endpoint (merchant dashboard)"""
    
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
            pytest.skip("Test merchant not available")
        
        assert self.token is not None
        assert self.merchant is not None
        print(f"✅ Merchant login successful: {self.merchant.get('business_name')}")
    
    def test_referral_leaderboard_endpoint(self):
        """Test GET /api/merchants/referral-leaderboard endpoint"""
        if not self._login_merchant():
            pytest.skip("Merchant login required")
        
        response = self.session.get(f"{BASE_URL}/api/merchants/referral-leaderboard?limit=10")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should have success=True"
        
        # Check required fields exist
        required_fields = [
            "leaderboard",
            "total_participants",
            "current_merchant"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify data types
        assert isinstance(data["leaderboard"], list), "leaderboard should be list"
        assert isinstance(data["total_participants"], int), "total_participants should be int"
        assert isinstance(data["current_merchant"], dict), "current_merchant should be dict"
        
        print(f"✅ Merchant leaderboard endpoint working")
        print(f"   Total participants: {data['total_participants']}")
        print(f"   Leaderboard entries: {len(data['leaderboard'])}")
    
    def test_leaderboard_entry_structure(self):
        """Test leaderboard entry has all required fields"""
        if not self._login_merchant():
            pytest.skip("Merchant login required")
        
        response = self.session.get(f"{BASE_URL}/api/merchants/referral-leaderboard?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data.get("leaderboard", [])
        
        if len(leaderboard) > 0:
            entry = leaderboard[0]
            
            # Check required fields in each entry
            required_entry_fields = [
                "merchant_id",
                "business_name",
                "referral_count",
                "total_earned",
                "rank",
                "is_current_merchant"
            ]
            
            for field in required_entry_fields:
                assert field in entry, f"Missing field in leaderboard entry: {field}"
            
            # Verify rank is 1 for first entry
            assert entry["rank"] == 1, f"First entry should have rank 1, got {entry['rank']}"
            
            print(f"✅ Leaderboard entry structure valid")
            print(f"   Top merchant: {entry['business_name']} with {entry['referral_count']} referrals")
        else:
            print(f"⚠️ Leaderboard is empty (no merchants with referrals)")
    
    def test_current_merchant_in_response(self):
        """Test current merchant rank is included in response"""
        if not self._login_merchant():
            pytest.skip("Merchant login required")
        
        response = self.session.get(f"{BASE_URL}/api/merchants/referral-leaderboard?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        current_merchant = data.get("current_merchant", {})
        
        # Check required fields for current merchant
        required_fields = [
            "rank",
            "merchant_id",
            "business_name",
            "referral_count",
            "total_earned"
        ]
        
        for field in required_fields:
            assert field in current_merchant, f"Missing field in current_merchant: {field}"
        
        # Verify rank is a positive integer
        assert current_merchant["rank"] >= 1, "Rank should be >= 1"
        
        print(f"✅ Current merchant rank included")
        print(f"   Your rank: #{current_merchant['rank']}")
        print(f"   Your referrals: {current_merchant['referral_count']}")
        print(f"   Your earnings: GHS {current_merchant['total_earned']}")
    
    def test_leaderboard_unauthorized(self):
        """Test that leaderboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/merchants/referral-leaderboard")
        
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        print(f"✅ Unauthorized access correctly rejected with {response.status_code}")


class TestAdminMerchantReferralLeaderboard:
    """Test admin merchant referral leaderboard endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        
    def _login_admin(self):
        """Login as admin and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "emileparfait2003@gmail.com",
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return True
        return False
    
    def test_admin_login(self):
        """Test admin login to get auth token"""
        success = self._login_admin()
        
        if not success:
            pytest.skip("Admin login failed")
        
        assert self.token is not None
        print(f"✅ Admin login successful")
    
    def test_admin_leaderboard_endpoint(self):
        """Test GET /api/admin/merchant-referral-leaderboard endpoint"""
        if not self._login_admin():
            pytest.skip("Admin login required")
        
        response = self.session.get(f"{BASE_URL}/api/admin/merchant-referral-leaderboard?limit=20")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should have success=True"
        
        # Check required fields exist
        required_fields = [
            "leaderboard",
            "summary",
            "all_data"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✅ Admin leaderboard endpoint working")
        print(f"   Leaderboard entries: {len(data['leaderboard'])}")
    
    def test_admin_leaderboard_summary_stats(self):
        """Test admin leaderboard includes summary statistics"""
        if not self._login_admin():
            pytest.skip("Admin login required")
        
        response = self.session.get(f"{BASE_URL}/api/admin/merchant-referral-leaderboard?limit=20")
        assert response.status_code == 200
        
        data = response.json()
        summary = data.get("summary", {})
        
        # Check required summary fields
        required_summary_fields = [
            "total_merchants",
            "active_recruiters",
            "total_referrals",
            "total_commissions_paid",
            "bonus_per_referral"
        ]
        
        for field in required_summary_fields:
            assert field in summary, f"Missing summary field: {field}"
        
        # Verify bonus is 3 GHS
        assert summary["bonus_per_referral"] == 3.0, f"Bonus should be 3 GHS, got {summary['bonus_per_referral']}"
        
        print(f"✅ Admin leaderboard summary stats valid")
        print(f"   Total merchants: {summary['total_merchants']}")
        print(f"   Active recruiters: {summary['active_recruiters']}")
        print(f"   Total referrals: {summary['total_referrals']}")
        print(f"   Total commissions paid: GHS {summary['total_commissions_paid']}")
    
    def test_admin_leaderboard_entry_structure(self):
        """Test admin leaderboard entry has all required fields including this month stats"""
        if not self._login_admin():
            pytest.skip("Admin login required")
        
        response = self.session.get(f"{BASE_URL}/api/admin/merchant-referral-leaderboard?limit=20")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data.get("leaderboard", [])
        
        if len(leaderboard) > 0:
            entry = leaderboard[0]
            
            # Check required fields in each entry (admin has more fields)
            required_entry_fields = [
                "merchant_id",
                "business_name",
                "phone",
                "status",
                "referral_count",
                "referrals_this_month",
                "total_earned",
                "earned_this_month",
                "rank"
            ]
            
            for field in required_entry_fields:
                assert field in entry, f"Missing field in admin leaderboard entry: {field}"
            
            print(f"✅ Admin leaderboard entry structure valid")
            print(f"   Top merchant: {entry['business_name']}")
            print(f"   Total referrals: {entry['referral_count']}")
            print(f"   This month: {entry['referrals_this_month']}")
        else:
            print(f"⚠️ Leaderboard is empty")
    
    def test_admin_leaderboard_all_data_for_export(self):
        """Test admin leaderboard includes all_data for CSV export"""
        if not self._login_admin():
            pytest.skip("Admin login required")
        
        response = self.session.get(f"{BASE_URL}/api/admin/merchant-referral-leaderboard?limit=20")
        assert response.status_code == 200
        
        data = response.json()
        all_data = data.get("all_data", [])
        
        # all_data should contain full list for export
        assert isinstance(all_data, list), "all_data should be a list"
        
        # all_data should have at least as many entries as leaderboard
        leaderboard = data.get("leaderboard", [])
        assert len(all_data) >= len(leaderboard), "all_data should have >= leaderboard entries"
        
        print(f"✅ Admin leaderboard all_data available for export")
        print(f"   Total entries for export: {len(all_data)}")
    
    def test_admin_leaderboard_unauthorized(self):
        """Test that admin leaderboard requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/merchant-referral-leaderboard")
        
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        print(f"✅ Unauthorized access correctly rejected with {response.status_code}")
    
    def test_admin_leaderboard_merchant_token_rejected(self):
        """Test that merchant token cannot access admin leaderboard"""
        # Login as merchant
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": TEST_MERCHANT_PHONE,
            "password": TEST_MERCHANT_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip("Merchant login required")
        
        merchant_token = response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {merchant_token}"})
        
        # Try to access admin endpoint with merchant token
        response = session.get(f"{BASE_URL}/api/admin/merchant-referral-leaderboard")
        
        # Should be rejected (401 or 403)
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print(f"✅ Merchant token correctly rejected for admin endpoint with {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
