"""
SDM REWARDS - Merchant Settings Phase 1 Tests
==============================================
Tests for:
- PIN protection (enable, verify, disable, change, forgot/reset)
- Cashier management (CRUD operations)
- Business info update (name, address, city, GPS, Google Maps URL)
- Settings menu sub-tabs
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Test merchant credentials from review request
MERCHANT_PHONE = "+233551234567"
MERCHANT_PASSWORD = "Test1234!"
TEST_PIN = "1234"


class TestMerchantAuth:
    """Test merchant authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get merchant token"""
        response = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": MERCHANT_PHONE,
            "password": MERCHANT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_merchant_login(self, auth_token):
        """Test merchant can login successfully"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Merchant logged in successfully, token length: {len(auth_token)}")


class TestMerchantDashboard:
    """Test merchant dashboard endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get merchant token"""
        response = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": MERCHANT_PHONE,
            "password": MERCHANT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate merchant")
        return response.json()["access_token"]
    
    def test_get_merchant_dashboard(self, auth_token):
        """Test getting merchant dashboard data"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "merchant" in data
        assert "stats" in data
        print(f"✓ Merchant dashboard loaded: {data['merchant'].get('business_name')}")


class TestPinProtection:
    """Test PIN protection flow: enable, verify, change, forgot, disable"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get merchant token"""
        response = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": MERCHANT_PHONE,
            "password": MERCHANT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate merchant")
        return response.json()["access_token"]
    
    def test_get_pin_status(self, auth_token):
        """Test getting PIN status"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/settings/pin-status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "pin_enabled" in data
        assert "has_pin" in data
        print(f"✓ PIN Status: enabled={data['pin_enabled']}, has_pin={data['has_pin']}")
        return data
    
    def test_verify_pin(self, auth_token):
        """Test PIN verification with correct PIN"""
        response = requests.post(
            f"{BASE_URL}/api/merchants/settings/pin/verify",
            json={"pin": TEST_PIN},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ PIN verified successfully")
    
    def test_verify_pin_wrong(self, auth_token):
        """Test PIN verification with wrong PIN"""
        response = requests.post(
            f"{BASE_URL}/api/merchants/settings/pin/verify",
            json={"pin": "9999"},  # Wrong PIN
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Should return 401 for wrong PIN
        assert response.status_code in [401, 423]  # 401 wrong, 423 locked
        print(f"✓ Wrong PIN correctly rejected: {response.status_code}")
    
    def test_enable_pin(self, auth_token):
        """Test enabling PIN protection"""
        new_pin = "5678"
        response = requests.post(
            f"{BASE_URL}/api/merchants/settings/pin/enable",
            json={"pin": new_pin},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ PIN enabled successfully")
        
        # Verify the new PIN works
        verify_response = requests.post(
            f"{BASE_URL}/api/merchants/settings/pin/verify",
            json={"pin": new_pin},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert verify_response.status_code == 200
        print(f"✓ New PIN verification successful")
    
    def test_change_pin(self, auth_token):
        """Test changing PIN"""
        # Change back to test PIN
        response = requests.post(
            f"{BASE_URL}/api/merchants/settings/pin/change",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"current_pin": "5678", "new_pin": TEST_PIN}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ PIN changed successfully")
        
        # Verify the changed PIN works
        verify_response = requests.post(
            f"{BASE_URL}/api/merchants/settings/pin/verify",
            json={"pin": TEST_PIN},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert verify_response.status_code == 200
        print(f"✓ Changed PIN verification successful")
    
    def test_forgot_pin_request_otp(self, auth_token):
        """Test requesting OTP for PIN reset"""
        response = requests.post(
            f"{BASE_URL}/api/merchants/settings/pin/forgot",
            json={"method": "sms"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        # In test mode, OTP is returned in response
        if data.get("test_mode"):
            assert "otp" in data
            print(f"✓ OTP requested (test mode): {data.get('otp')}")
            return data.get("otp")
        else:
            print(f"✓ OTP requested via SMS")
            return None
    
    def test_forgot_pin_reset(self, auth_token):
        """Test resetting PIN with OTP"""
        # First request OTP
        otp_response = requests.post(
            f"{BASE_URL}/api/merchants/settings/pin/forgot",
            json={"method": "sms"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert otp_response.status_code == 200
        otp_data = otp_response.json()
        
        if not otp_data.get("test_mode") or not otp_data.get("otp"):
            pytest.skip("OTP not available in test mode")
        
        otp = otp_data.get("otp")
        
        # Reset PIN using OTP
        reset_response = requests.post(
            f"{BASE_URL}/api/merchants/settings/pin/reset",
            json={"otp": otp, "new_pin": TEST_PIN},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert reset_response.status_code == 200
        data = reset_response.json()
        assert data.get("success") == True
        print(f"✓ PIN reset successfully via OTP")
        
        # Verify the reset PIN works
        verify_response = requests.post(
            f"{BASE_URL}/api/merchants/settings/pin/verify",
            json={"pin": TEST_PIN},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert verify_response.status_code == 200
        print(f"✓ Reset PIN verification successful")
    
    def test_disable_pin(self, auth_token):
        """Test disabling PIN protection"""
        response = requests.post(
            f"{BASE_URL}/api/merchants/settings/pin/disable",
            json={"pin": TEST_PIN},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ PIN disabled successfully")
        
        # Check status
        status_response = requests.get(
            f"{BASE_URL}/api/merchants/settings/pin-status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert status_response.status_code == 200
        status = status_response.json()
        assert status.get("pin_enabled") == False
        print(f"✓ PIN status confirmed disabled")
    
    def test_re_enable_pin(self, auth_token):
        """Re-enable PIN for future tests"""
        response = requests.post(
            f"{BASE_URL}/api/merchants/settings/pin/enable",
            json={"pin": TEST_PIN},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print(f"✓ PIN re-enabled for future tests")


class TestCashierManagement:
    """Test Cashier CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get merchant token"""
        response = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": MERCHANT_PHONE,
            "password": MERCHANT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate merchant")
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def test_cashier_code(self):
        """Generate unique cashier code for test"""
        return f"TEST{uuid.uuid4().hex[:4].upper()}"
    
    def test_get_cashiers(self, auth_token):
        """Test getting list of cashiers"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/cashiers",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "cashiers" in data
        assert "total" in data
        print(f"✓ Got {data['total']} cashiers")
        return data["cashiers"]
    
    def test_create_cashier(self, auth_token, test_cashier_code):
        """Test creating a new cashier"""
        response = requests.post(
            f"{BASE_URL}/api/merchants/cashiers",
            json={
                "name": "Test Cashier",
                "code": test_cashier_code,
                "register_number": "99"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "cashier" in data
        cashier = data["cashier"]
        assert cashier["name"] == "Test Cashier"
        assert cashier["code"] == test_cashier_code
        assert cashier["is_active"] == True
        print(f"✓ Created cashier: {cashier['code']} - {cashier['name']}")
        return cashier["id"]
    
    def test_create_duplicate_cashier_fails(self, auth_token, test_cashier_code):
        """Test that duplicate cashier code is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/merchants/cashiers",
            json={
                "name": "Duplicate Cashier",
                "code": test_cashier_code,
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 400
        print(f"✓ Duplicate cashier code correctly rejected")
    
    def test_update_cashier(self, auth_token, test_cashier_code):
        """Test updating a cashier"""
        # First get the cashier ID
        list_response = requests.get(
            f"{BASE_URL}/api/merchants/cashiers",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        cashiers = list_response.json().get("cashiers", [])
        test_cashier = next((c for c in cashiers if c["code"] == test_cashier_code), None)
        
        if not test_cashier:
            pytest.skip("Test cashier not found")
        
        # Update the cashier
        response = requests.put(
            f"{BASE_URL}/api/merchants/cashiers/{test_cashier['id']}",
            json={"name": "Updated Test Cashier", "is_active": False},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Cashier updated successfully")
        
        # Verify update by getting cashier list again
        verify_response = requests.get(
            f"{BASE_URL}/api/merchants/cashiers",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        updated_cashiers = verify_response.json().get("cashiers", [])
        updated_cashier = next((c for c in updated_cashiers if c["id"] == test_cashier["id"]), None)
        assert updated_cashier["name"] == "Updated Test Cashier"
        assert updated_cashier["is_active"] == False
        print(f"✓ Cashier update verified")
    
    def test_delete_cashier(self, auth_token, test_cashier_code):
        """Test deleting a cashier"""
        # First get the cashier ID
        list_response = requests.get(
            f"{BASE_URL}/api/merchants/cashiers",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        cashiers = list_response.json().get("cashiers", [])
        test_cashier = next((c for c in cashiers if c["code"] == test_cashier_code), None)
        
        if not test_cashier:
            pytest.skip("Test cashier not found")
        
        # Delete the cashier
        response = requests.delete(
            f"{BASE_URL}/api/merchants/cashiers/{test_cashier['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Cashier deleted successfully")
        
        # Verify deletion
        verify_response = requests.get(
            f"{BASE_URL}/api/merchants/cashiers",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        remaining_cashiers = verify_response.json().get("cashiers", [])
        deleted_cashier = next((c for c in remaining_cashiers if c["id"] == test_cashier["id"]), None)
        assert deleted_cashier is None
        print(f"✓ Cashier deletion verified")


class TestBusinessInfoUpdate:
    """Test Business Info update operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get merchant token"""
        response = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": MERCHANT_PHONE,
            "password": MERCHANT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate merchant")
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def original_merchant_data(self, auth_token):
        """Get original merchant data for restoration"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        return response.json().get("merchant", {})
    
    def test_update_business_name(self, auth_token, original_merchant_data):
        """Test updating business name"""
        new_name = f"TEST_BUSINESS_{uuid.uuid4().hex[:6].upper()}"
        response = requests.put(
            f"{BASE_URL}/api/merchants/settings/business-info",
            json={"business_name": new_name},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("merchant", {}).get("business_name") == new_name
        print(f"✓ Business name updated to: {new_name}")
        
        # Restore original name
        restore_response = requests.put(
            f"{BASE_URL}/api/merchants/settings/business-info",
            json={"business_name": original_merchant_data.get("business_name", "Test Business")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert restore_response.status_code == 200
        print(f"✓ Business name restored")
    
    def test_update_business_address(self, auth_token):
        """Test updating business address"""
        response = requests.put(
            f"{BASE_URL}/api/merchants/settings/business-info",
            json={"business_address": "123 Test Street, Test District"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("merchant", {}).get("business_address") == "123 Test Street, Test District"
        print(f"✓ Business address updated")
    
    def test_update_city(self, auth_token):
        """Test updating city"""
        response = requests.put(
            f"{BASE_URL}/api/merchants/settings/business-info",
            json={"city": "Accra"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("merchant", {}).get("city") == "Accra"
        print(f"✓ City updated to: Accra")
    
    def test_update_gps_coordinates(self, auth_token):
        """Test updating GPS coordinates"""
        response = requests.put(
            f"{BASE_URL}/api/merchants/settings/business-info",
            json={"gps_coordinates": "5.6037, -0.1870"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("merchant", {}).get("gps_coordinates") == "5.6037, -0.1870"
        print(f"✓ GPS coordinates updated")
    
    def test_update_google_maps_url(self, auth_token):
        """Test updating Google Maps URL"""
        maps_url = "https://maps.google.com/?q=5.6037,-0.1870"
        response = requests.put(
            f"{BASE_URL}/api/merchants/settings/business-info",
            json={"google_maps_url": maps_url},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("merchant", {}).get("google_maps_url") == maps_url
        print(f"✓ Google Maps URL updated")
    
    def test_update_all_business_fields(self, auth_token):
        """Test updating all business fields at once"""
        response = requests.put(
            f"{BASE_URL}/api/merchants/settings/business-info",
            json={
                "business_name": "Test Commerce SDM",
                "business_type": "Restaurant",
                "business_address": "45 Main Street, Osu",
                "city": "Kumasi",
                "gps_coordinates": "6.6885, -1.6244",
                "google_maps_url": "https://maps.google.com/?q=6.6885,-1.6244",
                "business_description": "Best restaurant in town!"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        merchant = data.get("merchant", {})
        assert merchant.get("business_name") == "Test Commerce SDM"
        assert merchant.get("business_type") == "Restaurant"
        assert merchant.get("city") == "Kumasi"
        print(f"✓ All business fields updated successfully")


class TestMerchantSettings:
    """Test other merchant settings endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get merchant token"""
        response = requests.post(f"{BASE_URL}/api/auth/merchant/login", json={
            "phone": MERCHANT_PHONE,
            "password": MERCHANT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate merchant")
        return response.json()["access_token"]
    
    def test_get_settings(self, auth_token):
        """Test getting merchant settings"""
        response = requests.get(
            f"{BASE_URL}/api/merchants/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "cashback_rate" in data
        print(f"✓ Settings retrieved: cashback_rate={data.get('cashback_rate')}%")
    
    def test_update_cashback_rate(self, auth_token):
        """Test updating cashback rate"""
        response = requests.put(
            f"{BASE_URL}/api/merchants/settings/cashback",
            json={"cashback_rate": 7.5},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("cashback_rate") == 7.5
        print(f"✓ Cashback rate updated to: 7.5%")
        
        # Restore to 5%
        restore_response = requests.put(
            f"{BASE_URL}/api/merchants/settings/cashback",
            json={"cashback_rate": 5},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert restore_response.status_code == 200
        print(f"✓ Cashback rate restored to: 5%")
    
    def test_invalid_cashback_rate_low(self, auth_token):
        """Test that cashback rate below 1% is rejected"""
        response = requests.put(
            f"{BASE_URL}/api/merchants/settings/cashback",
            json={"cashback_rate": 0.5},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 400
        print(f"✓ Cashback rate < 1% correctly rejected")
    
    def test_invalid_cashback_rate_high(self, auth_token):
        """Test that cashback rate above 20% is rejected"""
        response = requests.put(
            f"{BASE_URL}/api/merchants/settings/cashback",
            json={"cashback_rate": 25},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 400
        print(f"✓ Cashback rate > 20% correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
