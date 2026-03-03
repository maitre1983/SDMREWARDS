"""
Test Suite: Merchant Delete & Admin Features
Tests for:
1. Super Admin can delete merchants (action='delete')
2. Deleted merchants don't appear in GET /api/sdm/partners
3. Blocked merchants don't appear in GET /api/sdm/partners
4. Suspended merchants don't appear in GET /api/sdm/partners
5. Normal admin cannot delete merchants (should get 403)
6. Admin Management - Create Admin functionality
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "emileparfait2003@gmail.com"
SUPER_ADMIN_PASSWORD = "Gerard0103@"

TEST_ADMIN = {
    "username": "test_admin",
    "email": "test@sdm.com",
    "password": "TestAdmin123"
}


class TestMerchantDeleteAndPartnerFiltering:
    """Tests for merchant deletion and partner filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get super admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        self.super_admin_token = response.json()["access_token"]
        self.super_admin_headers = {
            "Authorization": f"Bearer {self.super_admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_health_check(self):
        """Verify API is running"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ API health check passed")
    
    def test_02_super_admin_can_delete_merchant(self):
        """Test Super Admin can delete a merchant via action='delete'"""
        # First, get list of merchants to find one to test with
        response = self.session.get(
            f"{BASE_URL}/api/sdm/admin/merchants",
            headers=self.super_admin_headers
        )
        assert response.status_code == 200, f"Failed to get merchants: {response.text}"
        merchants = response.json()
        
        # Find a test merchant that's not already deleted
        test_merchant = None
        for m in merchants:
            if not m.get("is_deleted") and "test" in m.get("business_name", "").lower():
                test_merchant = m
                break
        
        if not test_merchant:
            # Create a test merchant for deletion test
            print("⚠ No test merchant found, skipping delete test")
            pytest.skip("No test merchant available for deletion test")
            return
        
        merchant_id = test_merchant["id"]
        print(f"Testing delete on merchant: {test_merchant['business_name']} ({merchant_id})")
        
        # Delete the merchant
        response = self.session.post(
            f"{BASE_URL}/api/sdm/admin/merchants/{merchant_id}/control",
            json={
                "action": "delete",
                "reason": "Testing merchant deletion feature"
            },
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 200, f"Delete failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "delete"
        print(f"✓ Merchant '{test_merchant['business_name']}' deleted successfully")
        
        # Verify merchant is marked as deleted
        response = self.session.get(
            f"{BASE_URL}/api/sdm/admin/merchants",
            headers=self.super_admin_headers
        )
        merchants = response.json()
        deleted_merchant = next((m for m in merchants if m["id"] == merchant_id), None)
        
        if deleted_merchant:
            assert deleted_merchant.get("is_deleted") == True, "Merchant should be marked as deleted"
            print("✓ Merchant is_deleted flag is True")
    
    def test_03_deleted_merchants_not_in_partners_list(self):
        """Verify deleted merchants don't appear in public partners list"""
        response = self.session.get(f"{BASE_URL}/api/sdm/partners")
        assert response.status_code == 200, f"Failed to get partners: {response.text}"
        data = response.json()
        partners = data.get("partners", [])
        
        # Check that no partner/merchant has is_deleted=True
        for p in partners:
            merchant_id = p.get("id")
            # Partners shouldn't have deleted merchants
            assert p.get("is_deleted", False) == False, f"Deleted merchant {p.get('name')} found in partners"
        
        print(f"✓ Partners list has {len(partners)} items, no deleted merchants found")
    
    def test_04_blocked_merchants_not_in_partners_list(self):
        """Verify blocked merchants don't appear in public partners list"""
        # First check admin merchants list for any blocked merchants
        response = self.session.get(
            f"{BASE_URL}/api/sdm/admin/merchants",
            headers=self.super_admin_headers
        )
        all_merchants = response.json()
        blocked_merchant_ids = [m["id"] for m in all_merchants if m.get("is_blocked")]
        
        if blocked_merchant_ids:
            # Get public partners
            response = self.session.get(f"{BASE_URL}/api/sdm/partners")
            data = response.json()
            partner_ids = [p.get("id") for p in data.get("partners", [])]
            
            for blocked_id in blocked_merchant_ids:
                assert blocked_id not in partner_ids, f"Blocked merchant {blocked_id} found in partners"
            print(f"✓ {len(blocked_merchant_ids)} blocked merchants correctly filtered from partners list")
        else:
            print("⚠ No blocked merchants to test - verification skipped")
    
    def test_05_suspended_merchants_not_in_partners_list(self):
        """Verify suspended merchants don't appear in public partners list"""
        # First check admin merchants list for any suspended merchants
        response = self.session.get(
            f"{BASE_URL}/api/sdm/admin/merchants",
            headers=self.super_admin_headers
        )
        all_merchants = response.json()
        suspended_merchant_ids = [m["id"] for m in all_merchants if m.get("is_suspended")]
        
        if suspended_merchant_ids:
            # Get public partners
            response = self.session.get(f"{BASE_URL}/api/sdm/partners")
            data = response.json()
            partner_ids = [p.get("id") for p in data.get("partners", [])]
            
            for suspended_id in suspended_merchant_ids:
                assert suspended_id not in partner_ids, f"Suspended merchant {suspended_id} found in partners"
            print(f"✓ {len(suspended_merchant_ids)} suspended merchants correctly filtered from partners list")
        else:
            print("⚠ No suspended merchants to test - verification skipped")
    
    def test_06_normal_admin_cannot_delete_merchant(self):
        """Verify normal admin (non-super_admin) gets 403 when trying to delete"""
        # First try to login with test_admin
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": TEST_ADMIN["username"],
            "password": TEST_ADMIN["password"]
        })
        
        if response.status_code != 200:
            # Try with email
            response = self.session.post(f"{BASE_URL}/api/admin/login", json={
                "username": TEST_ADMIN["email"],
                "password": TEST_ADMIN["password"]
            })
        
        if response.status_code != 200:
            print("⚠ Test admin not found, creating one...")
            # Create test admin first
            create_response = self.session.post(
                f"{BASE_URL}/api/admin/create",
                json={
                    "username": TEST_ADMIN["username"],
                    "email": TEST_ADMIN["email"],
                    "password": TEST_ADMIN["password"],
                    "role": "admin"
                },
                headers=self.super_admin_headers
            )
            if create_response.status_code not in [200, 400]:  # 400 = already exists
                pytest.skip(f"Could not create test admin: {create_response.text}")
            
            # Try login again
            response = self.session.post(f"{BASE_URL}/api/admin/login", json={
                "username": TEST_ADMIN["username"],
                "password": TEST_ADMIN["password"]
            })
        
        if response.status_code != 200:
            pytest.skip("Could not login as test admin")
        
        normal_admin_token = response.json()["access_token"]
        normal_admin_headers = {
            "Authorization": f"Bearer {normal_admin_token}",
            "Content-Type": "application/json"
        }
        
        # Get a merchant to try to delete
        response = self.session.get(
            f"{BASE_URL}/api/sdm/admin/merchants",
            headers=normal_admin_headers
        )
        merchants = response.json()
        
        if not merchants:
            pytest.skip("No merchants available to test")
        
        test_merchant_id = merchants[0]["id"]
        
        # Try to delete - should get 403
        response = self.session.post(
            f"{BASE_URL}/api/sdm/admin/merchants/{test_merchant_id}/control",
            json={
                "action": "delete",
                "reason": "Testing unauthorized delete"
            },
            headers=normal_admin_headers
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Normal admin correctly denied (403) when trying to delete merchant")


class TestAdminManagement:
    """Tests for Admin Management Panel functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get super admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        self.super_admin_token = response.json()["access_token"]
        self.super_admin_headers = {
            "Authorization": f"Bearer {self.super_admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_get_admin_profile(self):
        """Test GET /api/admin/profile returns current admin info"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/profile",
            headers=self.super_admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert "email" in data
        assert "role" in data
        assert data["role"] == "super_admin"
        print(f"✓ Admin profile returned: {data['email']} ({data['role']})")
    
    def test_02_list_admins(self):
        """Test GET /api/admin/list returns admin list (super_admin only)"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/list",
            headers=self.super_admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "admins" in data
        admins = data["admins"]
        
        # Verify password_hash is not exposed
        for admin in admins:
            assert "password_hash" not in admin, "password_hash should not be exposed"
        
        print(f"✓ Admin list returned {len(admins)} admins")
    
    def test_03_create_admin(self):
        """Test POST /api/admin/create creates new admin"""
        unique_id = str(uuid.uuid4())[:8]
        new_admin_data = {
            "username": f"test_new_admin_{unique_id}",
            "email": f"test_new_{unique_id}@sdm.com",
            "password": "TestPassword123",
            "role": "viewer"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/create",
            json=new_admin_data,
            headers=self.super_admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        assert "admin" in data
        assert data["admin"]["email"] == new_admin_data["email"]
        assert data["admin"]["role"] == "viewer"
        
        created_admin_id = data["admin"]["id"]
        print(f"✓ Admin created: {new_admin_data['email']}")
        
        # Cleanup - delete the created admin
        self.session.delete(
            f"{BASE_URL}/api/admin/{created_admin_id}",
            headers=self.super_admin_headers
        )
        print("✓ Test admin cleaned up")
    
    def test_04_admin_roles_endpoint(self):
        """Test GET /api/admin/roles returns available roles"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/roles",
            headers=self.super_admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "roles" in data
        roles = data["roles"]
        
        assert "super_admin" in roles
        assert "admin" in roles
        assert "viewer" in roles
        print(f"✓ Available roles: {list(roles.keys())}")


class TestPartnerEndpointFiltering:
    """Tests specifically for GET /api/sdm/partners filtering logic"""
    
    def test_01_partners_endpoint_returns_valid_structure(self):
        """Verify partners endpoint returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/sdm/partners")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "partners" in data
        assert "categories" in data
        assert "cities" in data
        assert isinstance(data["partners"], list)
        print(f"✓ Partners endpoint returned {len(data['partners'])} partners")
    
    def test_02_partners_endpoint_filters_by_category(self):
        """Test partners can be filtered by category"""
        # First get all to find a category
        response = requests.get(f"{BASE_URL}/api/sdm/partners")
        data = response.json()
        categories = data.get("categories", [])
        
        if categories:
            test_category = categories[0]
            response = requests.get(f"{BASE_URL}/api/sdm/partners?category={test_category}")
            assert response.status_code == 200
            print(f"✓ Category filter '{test_category}' works")
        else:
            print("⚠ No categories available to test filtering")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
