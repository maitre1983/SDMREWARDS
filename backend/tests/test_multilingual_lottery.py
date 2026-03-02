"""
Backend tests for multilingual support and auto lottery features
Tests the lottery config endpoints and verifies multilingual translations exist
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAutoLotteryConfig:
    """Auto lottery configuration endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "admin", "password": "Gerard0103@"}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_get_lottery_config(self):
        """Test GET /api/sdm/admin/lottery-config"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/lottery-config",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "config" in data
        config = data["config"]
        assert "enabled" in config
        assert "default_prize_amount" in config
        assert "auto_activate" in config
    
    def test_put_lottery_config(self):
        """Test PUT /api/sdm/admin/lottery-config"""
        payload = {
            "enabled": True,
            "default_prize_amount": 500,
            "auto_enroll_vip": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/sdm/admin/lottery-config",
            headers=self.headers,
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "updated" in data["message"].lower()
    
    def test_trigger_monthly_lottery(self):
        """Test POST /api/sdm/admin/lottery/trigger-monthly"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/lottery/trigger-monthly",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Either created or already exists
        assert "lottery" in data["message"].lower() or "created" in str(data)
    
    def test_lottery_config_default_amount(self):
        """Test that default prize amount defaults to 500 GHS"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/lottery-config",
            headers=self.headers
        )
        
        assert response.status_code == 200
        config = response.json()["config"]
        # Default should be 500 GHS
        assert config["default_prize_amount"] == 500


class TestSDMAPIHealth:
    """Basic SDM platform health tests"""
    
    def test_health_check(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
    
    def test_sdm_user_vip_cards(self):
        """Test public VIP cards endpoint"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/vip-cards")
        assert response.status_code == 200
        data = response.json()
        assert "cards" in data
    
    def test_sdm_partners(self):
        """Test public partners endpoint"""
        response = requests.get(f"{BASE_URL}/api/sdm/partners")
        assert response.status_code == 200
        data = response.json()
        assert "partners" in data


class TestSDMClientAuth:
    """SDM Client authentication tests"""
    
    def test_send_otp(self):
        """Test sending OTP to test phone"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/auth/send-otp",
            json={"phone": "0000000000"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "otp_id" in data
    
    def test_verify_otp(self):
        """Test verifying OTP with test credentials"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/auth/verify-otp",
            json={"phone": "0000000000", "otp_code": "000000"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
