"""
Test Merchant Settings PIN Security and Admin Management APIs

Tests for:
1. PIN Status - GET /api/sdm/merchant/settings/pin-status
2. Set PIN - POST /api/sdm/merchant/settings/set-pin
3. Verify PIN - POST /api/sdm/merchant/settings/verify-pin
4. Reset PIN - POST /api/sdm/merchant/settings/reset-pin
5. Admin Profile - GET /api/admin/profile
6. Admin List - GET /api/admin/list (super_admin only)
7. Create Admin - POST /api/admin/create (super_admin only)
8. Change Password - POST /api/admin/change-password
9. Change Admin Role - PUT /api/admin/{id}/role
10. Delete Admin - DELETE /api/admin/{id}
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "emileparfait2003@gmail.com"
SUPER_ADMIN_PASSWORD = "Gerard0103@"
TEST_MERCHANT_PHONE = "0000000000"
TEST_MERCHANT_PASSWORD = "TestPass123"
TEST_OTP = "0000"
TEST_OTP_REQUEST_ID = "test_request_id"


class TestMerchantPINSecurity:
    """Tests for Merchant Settings PIN Security APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as merchant before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as merchant
        response = self.session.post(f"{BASE_URL}/api/sdm/merchant/login", json={
            "phone": TEST_MERCHANT_PHONE,
            "password": TEST_MERCHANT_PASSWORD
        })
        assert response.status_code == 200, f"Merchant login failed: {response.text}"
        self.merchant_token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.merchant_token}"})
        self.merchant = response.json()["merchant"]
    
    def test_01_pin_status_initial(self):
        """Test PIN status endpoint returns correct structure"""
        response = self.session.get(f"{BASE_URL}/api/sdm/merchant/settings/pin-status")
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "has_pin" in data
        assert "is_locked" in data
        assert isinstance(data["has_pin"], bool)
        assert isinstance(data["is_locked"], bool)
        print(f"PIN Status: has_pin={data['has_pin']}, is_locked={data['is_locked']}")
    
    def test_02_set_pin_invalid_format(self):
        """Test set PIN with invalid format (not 4-6 digits)"""
        # Too short
        response = self.session.post(f"{BASE_URL}/api/sdm/merchant/settings/set-pin", json={
            "pin": "123",  # 3 digits - invalid
            "otp_code": TEST_OTP,
            "request_id": TEST_OTP_REQUEST_ID
        })
        assert response.status_code == 400
        assert "4-6 digits" in response.json()["detail"]
        
        # Too long
        response = self.session.post(f"{BASE_URL}/api/sdm/merchant/settings/set-pin", json={
            "pin": "1234567",  # 7 digits - invalid
            "otp_code": TEST_OTP,
            "request_id": TEST_OTP_REQUEST_ID
        })
        assert response.status_code == 400
        
        # Non-numeric
        response = self.session.post(f"{BASE_URL}/api/sdm/merchant/settings/set-pin", json={
            "pin": "12ab",  # Contains letters - invalid
            "otp_code": TEST_OTP,
            "request_id": TEST_OTP_REQUEST_ID
        })
        assert response.status_code == 400
        print("PIN format validation working correctly")
    
    def test_03_set_pin_invalid_otp(self):
        """Test set PIN with invalid OTP"""
        response = self.session.post(f"{BASE_URL}/api/sdm/merchant/settings/set-pin", json={
            "pin": "1234",
            "otp_code": "9999",  # Wrong OTP
            "request_id": TEST_OTP_REQUEST_ID
        })
        assert response.status_code == 400
        assert "OTP" in response.json()["detail"] or "Invalid" in response.json()["detail"]
        print("OTP validation working correctly")
    
    def test_04_set_pin_success(self):
        """Test set PIN with valid data"""
        response = self.session.post(f"{BASE_URL}/api/sdm/merchant/settings/set-pin", json={
            "pin": "1234",
            "otp_code": TEST_OTP,
            "request_id": TEST_OTP_REQUEST_ID
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"PIN set successfully: {data['message']}")
        
        # Verify PIN is now set
        status_response = self.session.get(f"{BASE_URL}/api/sdm/merchant/settings/pin-status")
        assert status_response.status_code == 200
        assert status_response.json()["has_pin"] == True
    
    def test_05_verify_pin_correct(self):
        """Test verify PIN with correct PIN"""
        # Ensure PIN is set first
        self.session.post(f"{BASE_URL}/api/sdm/merchant/settings/set-pin", json={
            "pin": "4321",
            "otp_code": TEST_OTP,
            "request_id": TEST_OTP_REQUEST_ID
        })
        
        response = self.session.post(f"{BASE_URL}/api/sdm/merchant/settings/verify-pin", json={
            "pin": "4321"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "settings_token" in data
        assert "expires_in" in data
        print(f"PIN verified, got settings_token (expires in {data['expires_in']}s)")
    
    def test_06_verify_pin_incorrect(self):
        """Test verify PIN with incorrect PIN"""
        response = self.session.post(f"{BASE_URL}/api/sdm/merchant/settings/verify-pin", json={
            "pin": "9999"  # Wrong PIN
        })
        assert response.status_code == 401
        assert "Invalid PIN" in response.json()["detail"]
        assert "attempts remaining" in response.json()["detail"]
        print(f"Incorrect PIN rejected: {response.json()['detail']}")
    
    def test_07_reset_pin_success(self):
        """Test reset PIN with OTP"""
        response = self.session.post(f"{BASE_URL}/api/sdm/merchant/settings/reset-pin", json={
            "new_pin": "9876",
            "otp_code": TEST_OTP,
            "request_id": TEST_OTP_REQUEST_ID
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"PIN reset successfully: {data['message']}")
        
        # Verify new PIN works
        verify_response = self.session.post(f"{BASE_URL}/api/sdm/merchant/settings/verify-pin", json={
            "pin": "9876"
        })
        assert verify_response.status_code == 200
        print("New PIN verified successfully after reset")


class TestAdminManagement:
    """Tests for Admin Management APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
    
    def test_01_admin_profile(self):
        """Test get admin profile"""
        response = self.session.get(f"{BASE_URL}/api/admin/profile")
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert "username" in data
        assert "email" in data
        assert "role" in data
        assert "permissions" in data
        assert data["role"] == "super_admin"
        print(f"Admin profile: {data['email']} - Role: {data['role']}")
    
    def test_02_admin_list(self):
        """Test list all admins (super_admin only)"""
        response = self.session.get(f"{BASE_URL}/api/admin/list")
        assert response.status_code == 200
        data = response.json()
        
        assert "admins" in data
        assert isinstance(data["admins"], list)
        assert len(data["admins"]) >= 1  # At least super admin exists
        
        # Verify password_hash is not exposed
        for admin in data["admins"]:
            assert "password_hash" not in admin
        print(f"Admin list: {len(data['admins'])} admins found")
    
    def test_03_create_admin(self):
        """Test create new admin"""
        unique_id = str(uuid.uuid4())[:8]
        new_admin = {
            "username": f"test_admin_{unique_id}",
            "email": f"test_{unique_id}@sdm.com",
            "password": "TestPassword123",
            "role": "admin"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/create", json=new_admin)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "admin" in data
        assert data["admin"]["username"] == new_admin["username"]
        assert data["admin"]["role"] == "admin"
        print(f"Admin created: {data['admin']['email']}")
        
        # Store admin ID for cleanup
        self.created_admin_id = data["admin"]["id"]
        
        # Cleanup - delete created admin
        self.session.delete(f"{BASE_URL}/api/admin/{self.created_admin_id}")
    
    def test_04_create_admin_duplicate(self):
        """Test create admin with duplicate email fails"""
        # First admin
        unique_id = str(uuid.uuid4())[:8]
        admin_data = {
            "username": f"dup_admin_{unique_id}",
            "email": f"dup_{unique_id}@sdm.com",
            "password": "TestPassword123",
            "role": "admin"
        }
        response = self.session.post(f"{BASE_URL}/api/admin/create", json=admin_data)
        assert response.status_code == 200
        admin_id = response.json()["admin"]["id"]
        
        # Try to create duplicate
        response = self.session.post(f"{BASE_URL}/api/admin/create", json=admin_data)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]
        print("Duplicate admin creation rejected")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/{admin_id}")
    
    def test_05_create_admin_invalid_role(self):
        """Test create admin with invalid role fails"""
        response = self.session.post(f"{BASE_URL}/api/admin/create", json={
            "username": "invalid_role_admin",
            "email": "invalid@sdm.com",
            "password": "TestPassword123",
            "role": "invalid_role"
        })
        assert response.status_code == 400
        assert "Invalid role" in response.json()["detail"]
        print("Invalid role rejected")
    
    def test_06_change_admin_role(self):
        """Test change admin role"""
        # Create test admin
        unique_id = str(uuid.uuid4())[:8]
        response = self.session.post(f"{BASE_URL}/api/admin/create", json={
            "username": f"role_test_{unique_id}",
            "email": f"role_test_{unique_id}@sdm.com",
            "password": "TestPassword123",
            "role": "admin"
        })
        assert response.status_code == 200
        admin_id = response.json()["admin"]["id"]
        
        # Change role to viewer
        response = self.session.put(f"{BASE_URL}/api/admin/{admin_id}/role", json={
            "role": "viewer"
        })
        assert response.status_code == 200
        assert response.json()["success"] == True
        print(f"Admin role changed to viewer")
        
        # Verify role changed
        list_response = self.session.get(f"{BASE_URL}/api/admin/list")
        admins = list_response.json()["admins"]
        updated_admin = next((a for a in admins if a["id"] == admin_id), None)
        assert updated_admin is not None
        assert updated_admin["role"] == "viewer"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/{admin_id}")
    
    def test_07_change_own_role_fails(self):
        """Test cannot change own role"""
        # Get current admin profile
        profile_response = self.session.get(f"{BASE_URL}/api/admin/profile")
        current_admin_id = profile_response.json()["id"]
        
        response = self.session.put(f"{BASE_URL}/api/admin/{current_admin_id}/role", json={
            "role": "viewer"
        })
        assert response.status_code == 400
        assert "own role" in response.json()["detail"]
        print("Cannot change own role - correctly rejected")
    
    def test_08_change_password_own(self):
        """Test change own password"""
        # Create test admin
        unique_id = str(uuid.uuid4())[:8]
        test_password = "OldPassword123"
        new_password = "NewPassword456"
        
        response = self.session.post(f"{BASE_URL}/api/admin/create", json={
            "username": f"pwd_test_{unique_id}",
            "email": f"pwd_test_{unique_id}@sdm.com",
            "password": test_password,
            "role": "admin"
        })
        admin_id = response.json()["admin"]["id"]
        admin_email = response.json()["admin"]["email"]
        
        # Login as new admin
        login_response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": admin_email,
            "password": test_password
        })
        assert login_response.status_code == 200
        new_admin_token = login_response.json()["access_token"]
        
        # Change password as new admin
        pwd_session = requests.Session()
        pwd_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {new_admin_token}"
        })
        
        response = pwd_session.post(f"{BASE_URL}/api/admin/change-password", json={
            "current_password": test_password,
            "new_password": new_password
        })
        assert response.status_code == 200
        assert response.json()["success"] == True
        print("Password changed successfully")
        
        # Verify can login with new password
        login_response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": admin_email,
            "password": new_password
        })
        assert login_response.status_code == 200
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/{admin_id}")
    
    def test_09_reset_password_other_admin(self):
        """Test super admin can reset other admin's password"""
        # Create test admin
        unique_id = str(uuid.uuid4())[:8]
        response = self.session.post(f"{BASE_URL}/api/admin/create", json={
            "username": f"reset_test_{unique_id}",
            "email": f"reset_test_{unique_id}@sdm.com",
            "password": "OldPassword123",
            "role": "admin"
        })
        admin_id = response.json()["admin"]["id"]
        admin_email = response.json()["admin"]["email"]
        
        # Super admin resets password
        response = self.session.post(f"{BASE_URL}/api/admin/change-password", json={
            "target_admin_id": admin_id,
            "new_password": "ResetPassword789"
        })
        assert response.status_code == 200
        assert response.json()["success"] == True
        print(f"Password reset for {admin_email}")
        
        # Verify new password works
        login_response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": admin_email,
            "password": "ResetPassword789"
        })
        assert login_response.status_code == 200
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/{admin_id}")
    
    def test_10_delete_admin(self):
        """Test delete admin"""
        # Create admin to delete
        unique_id = str(uuid.uuid4())[:8]
        response = self.session.post(f"{BASE_URL}/api/admin/create", json={
            "username": f"del_test_{unique_id}",
            "email": f"del_test_{unique_id}@sdm.com",
            "password": "TestPassword123",
            "role": "viewer"
        })
        admin_id = response.json()["admin"]["id"]
        
        # Delete admin
        response = self.session.delete(f"{BASE_URL}/api/admin/{admin_id}")
        assert response.status_code == 200
        assert response.json()["success"] == True
        print(f"Admin deleted successfully")
        
        # Verify admin is gone
        list_response = self.session.get(f"{BASE_URL}/api/admin/list")
        admins = list_response.json()["admins"]
        assert not any(a["id"] == admin_id for a in admins)
    
    def test_11_delete_own_account_fails(self):
        """Test cannot delete own account"""
        profile_response = self.session.get(f"{BASE_URL}/api/admin/profile")
        current_admin_id = profile_response.json()["id"]
        
        response = self.session.delete(f"{BASE_URL}/api/admin/{current_admin_id}")
        assert response.status_code == 400
        assert "own account" in response.json()["detail"]
        print("Cannot delete own account - correctly rejected")
    
    def test_12_non_super_admin_cannot_list(self):
        """Test non-super admin cannot list admins"""
        # Create viewer admin
        unique_id = str(uuid.uuid4())[:8]
        response = self.session.post(f"{BASE_URL}/api/admin/create", json={
            "username": f"viewer_{unique_id}",
            "email": f"viewer_{unique_id}@sdm.com",
            "password": "ViewerPassword123",
            "role": "viewer"
        })
        admin_id = response.json()["admin"]["id"]
        
        # Login as viewer
        login_response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": f"viewer_{unique_id}@sdm.com",
            "password": "ViewerPassword123"
        })
        viewer_token = login_response.json()["access_token"]
        
        # Try to list admins as viewer
        viewer_session = requests.Session()
        viewer_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {viewer_token}"
        })
        
        response = viewer_session.get(f"{BASE_URL}/api/admin/list")
        assert response.status_code == 403
        assert "super admin" in response.json()["detail"].lower()
        print("Non-super admin cannot list admins - correctly rejected")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/{admin_id}")
    
    def test_13_admin_roles_endpoint(self):
        """Test get available admin roles"""
        response = self.session.get(f"{BASE_URL}/api/admin/roles")
        assert response.status_code == 200
        data = response.json()
        
        assert "roles" in data
        assert "super_admin" in data["roles"]
        assert "admin" in data["roles"]
        assert "viewer" in data["roles"]
        print(f"Available roles: {list(data['roles'].keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
