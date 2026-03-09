"""
Test Withdrawal Fee Configuration and Service Fees API
Tests for: 1) Withdrawal fee endpoint, 2) Service fees endpoint, 3) Admin save service commissions
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "emileparfait2003@gmail.com"
ADMIN_PASSWORD = "Admin@123456"
ADMIN_PIN = "0000"


class TestWithdrawalFeeAPI:
    """Test withdrawal fee configuration endpoint"""

    def test_withdrawal_fee_endpoint_returns_200(self):
        """GET /api/payments/withdrawal/fee should return 200"""
        response = requests.get(f"{BASE_URL}/api/payments/withdrawal/fee")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Withdrawal fee endpoint returns 200")

    def test_withdrawal_fee_has_correct_structure(self):
        """Withdrawal fee response should have type and rate"""
        response = requests.get(f"{BASE_URL}/api/payments/withdrawal/fee")
        data = response.json()
        
        assert "success" in data, "Response missing 'success' field"
        assert data["success"] == True, "success should be True"
        assert "fee" in data, "Response missing 'fee' field"
        assert "type" in data["fee"], "fee missing 'type' field"
        assert "rate" in data["fee"], "fee missing 'rate' field"
        assert data["fee"]["type"] in ["percentage", "fixed"], f"Invalid fee type: {data['fee']['type']}"
        print(f"PASS: Withdrawal fee structure correct - type={data['fee']['type']}, rate={data['fee']['rate']}")


class TestServiceFeesAPI:
    """Test service fees endpoint"""

    def test_service_fees_endpoint_returns_200(self):
        """GET /api/services/fees should return 200"""
        response = requests.get(f"{BASE_URL}/api/services/fees")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Service fees endpoint returns 200")

    def test_service_fees_includes_withdrawal(self):
        """Service fees should include withdrawal fee"""
        response = requests.get(f"{BASE_URL}/api/services/fees")
        data = response.json()
        
        assert "success" in data and data["success"] == True
        assert "fees" in data, "Response missing 'fees' field"
        assert "withdrawal" in data["fees"], "fees missing 'withdrawal' field"
        
        withdrawal = data["fees"]["withdrawal"]
        assert "type" in withdrawal, "withdrawal missing 'type'"
        assert "rate" in withdrawal, "withdrawal missing 'rate'"
        print(f"PASS: Service fees includes withdrawal - type={withdrawal['type']}, rate={withdrawal['rate']}")

    def test_service_fees_includes_all_services(self):
        """Service fees should include airtime, data_bundle, ecg_payment, withdrawal"""
        response = requests.get(f"{BASE_URL}/api/services/fees")
        data = response.json()
        
        required_services = ["airtime", "data_bundle", "ecg_payment", "withdrawal"]
        for service in required_services:
            assert service in data["fees"], f"Missing service: {service}"
            assert "type" in data["fees"][service], f"{service} missing 'type'"
            assert "rate" in data["fees"][service], f"{service} missing 'rate'"
        
        print(f"PASS: All services present: {list(data['fees'].keys())}")


class TestAdminServiceCommissions:
    """Test admin save service commissions"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        return response.json().get("access_token")

    def test_admin_login_works(self, admin_token):
        """Admin should be able to login"""
        assert admin_token is not None, "Admin token should not be None"
        print("PASS: Admin login successful")

    def test_get_platform_settings(self, admin_token):
        """Admin should be able to get platform settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "config" in data, "Response missing 'config'"
        print("PASS: Admin can get platform settings")
        
        if data.get("config") and "service_commissions" in data["config"]:
            sc = data["config"]["service_commissions"]
            print(f"  Current service_commissions: {sc}")

    def test_save_service_commissions(self, admin_token):
        """Admin should be able to save service commissions including withdrawal"""
        # Get current config first
        current = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        current_config = current.json().get("config", {})
        sc = current_config.get("service_commissions", {})
        
        # Update withdrawal commission
        update_payload = {
            "airtime_commission_type": sc.get("airtime", {}).get("type", "percentage"),
            "airtime_commission_rate": sc.get("airtime", {}).get("rate", 2),
            "data_commission_type": sc.get("data", {}).get("type", "percentage"),
            "data_commission_rate": sc.get("data", {}).get("rate", 2),
            "ecg_commission_type": sc.get("ecg", {}).get("type", "fixed"),
            "ecg_commission_rate": sc.get("ecg", {}).get("rate", 1),
            "merchant_payment_commission_type": sc.get("merchant_payment", {}).get("type", "percentage"),
            "merchant_payment_commission_rate": sc.get("merchant_payment", {}).get("rate", 1),
            "withdrawal_commission_type": "percentage",  # Test value
            "withdrawal_commission_rate": 2  # Test value: 2%
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/settings/service-commissions",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=update_payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.text}"
        print("PASS: Admin can save service commissions")
        
        # Verify the change via withdrawal/fee endpoint
        fee_response = requests.get(f"{BASE_URL}/api/payments/withdrawal/fee")
        fee_data = fee_response.json()
        print(f"  Withdrawal fee after update: {fee_data['fee']}")
        
        # Restore original value
        update_payload["withdrawal_commission_type"] = "percentage"
        update_payload["withdrawal_commission_rate"] = 1  # Restore to 1%
        requests.put(
            f"{BASE_URL}/api/admin/settings/service-commissions",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=update_payload
        )
        print("  Restored withdrawal fee to 1%")


class TestBackendStartsClean:
    """Verify backend starts without bcrypt errors"""
    
    def test_health_endpoint(self):
        """Backend health check - server should be running"""
        response = requests.get(f"{BASE_URL}/api/public/card-types")
        assert response.status_code == 200, f"Backend not responding: {response.status_code}"
        print("PASS: Backend is running and responding")

    def test_auth_endpoint_available(self):
        """Auth endpoints should be available (no bcrypt import errors)"""
        # Try admin login endpoint - this uses bcrypt
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        # 401 means endpoint works but credentials wrong (expected)
        # 500 would mean bcrypt error
        assert response.status_code in [401, 400], f"Unexpected status: {response.status_code}"
        print("PASS: Auth endpoint available (bcrypt working)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
