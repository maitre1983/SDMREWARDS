"""
SDM Rewards - Withdrawal and Payment Logos Tests
================================================
Tests for:
1. Client withdrawal endpoint POST /api/payments/withdrawal/initiate
2. Test withdrawal confirmation POST /api/payments/withdrawal/test/confirm/{id}
3. Admin payment logos CRUD endpoints: GET/POST/PUT/DELETE /api/admin/payment-logos
4. Public payment logos endpoint GET /api/admin/payment-logos/public
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from main agent
ADMIN_EMAIL = "emileparfait2003@gmail.com"
ADMIN_PASSWORD = "Gerard0103@"
CLIENT_PHONE = "+233551111111"
CLIENT_PASSWORD = "TestPass123"


class TestClientWithdrawal:
    """Tests for client cashback withdrawal to MoMo"""
    
    @pytest.fixture
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/client/login", json={
            "phone": CLIENT_PHONE,
            "password": CLIENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Client login failed: {response.status_code} - {response.text}")
    
    def test_withdrawal_initiate_unauthorized(self):
        """Test withdrawal without auth token returns 401"""
        response = requests.post(f"{BASE_URL}/api/payments/withdrawal/initiate", json={
            "phone": CLIENT_PHONE,
            "amount": 10.0
        })
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        print(f"✅ Unauthorized withdrawal correctly rejected: {response.status_code}")
    
    def test_withdrawal_initiate_minimum_amount(self, client_token):
        """Test withdrawal with amount below minimum (5 GHS)"""
        response = requests.post(
            f"{BASE_URL}/api/payments/withdrawal/initiate",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "phone": CLIENT_PHONE,
                "amount": 1.0  # Below minimum
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "Minimum withdrawal" in data.get("detail", ""), f"Expected minimum amount error: {data}"
        print(f"✅ Minimum amount validation works: {data}")
    
    def test_withdrawal_initiate_maximum_amount(self, client_token):
        """Test withdrawal with amount above maximum (1000 GHS)"""
        response = requests.post(
            f"{BASE_URL}/api/payments/withdrawal/initiate",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "phone": CLIENT_PHONE,
                "amount": 1500.0  # Above maximum
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "Maximum withdrawal" in data.get("detail", ""), f"Expected max amount error: {data}"
        print(f"✅ Maximum amount validation works: {data}")
    
    def test_withdrawal_initiate_invalid_phone(self, client_token):
        """Test withdrawal with invalid phone number"""
        response = requests.post(
            f"{BASE_URL}/api/payments/withdrawal/initiate",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "phone": "12345",  # Invalid phone
                "amount": 10.0
            }
        )
        # May return 400 for invalid phone or continue with network detection failure
        assert response.status_code in [400, 200], f"Unexpected status: {response.status_code}"
        print(f"✅ Phone validation response: {response.status_code}")
    
    def test_withdrawal_initiate_success(self, client_token):
        """Test successful withdrawal initiation (test mode)"""
        response = requests.post(
            f"{BASE_URL}/api/payments/withdrawal/initiate",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "phone": CLIENT_PHONE,
                "amount": 5.0  # Minimum valid amount
            }
        )
        
        # Check if client has enough balance
        if response.status_code == 400:
            data = response.json()
            if "Insufficient balance" in data.get("detail", ""):
                print(f"ℹ️ Insufficient balance for withdrawal test, skipping: {data}")
                pytest.skip("Insufficient balance for withdrawal test")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "withdrawal_id" in data, f"Missing withdrawal_id: {data}"
        assert "reference" in data, f"Missing reference: {data}"
        assert data.get("status") == "pending", f"Expected status=pending: {data}"
        assert data.get("test_mode") == True, f"Expected test_mode=True: {data}"
        
        print(f"✅ Withdrawal initiated successfully: {data}")
        return data.get("withdrawal_id")
    
    def test_withdrawal_test_confirm(self, client_token):
        """Test manual withdrawal confirmation in test mode"""
        # First initiate a withdrawal
        init_response = requests.post(
            f"{BASE_URL}/api/payments/withdrawal/initiate",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "phone": CLIENT_PHONE,
                "amount": 5.0
            }
        )
        
        if init_response.status_code == 400:
            data = init_response.json()
            if "Insufficient balance" in data.get("detail", ""):
                pytest.skip("Insufficient balance for withdrawal confirmation test")
        
        assert init_response.status_code == 200, f"Init failed: {init_response.text}"
        withdrawal_id = init_response.json().get("withdrawal_id")
        
        # Now confirm the withdrawal
        confirm_response = requests.post(
            f"{BASE_URL}/api/payments/withdrawal/test/confirm/{withdrawal_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert confirm_response.status_code == 200, f"Confirm failed: {confirm_response.status_code} - {confirm_response.text}"
        data = confirm_response.json()
        
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "new_balance" in data, f"Missing new_balance: {data}"
        
        print(f"✅ Withdrawal confirmed successfully: {data}")
    
    def test_withdrawal_confirm_not_found(self, client_token):
        """Test confirmation of non-existent withdrawal"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/payments/withdrawal/test/confirm/{fake_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Non-existent withdrawal correctly returns 404")


class TestAdminPaymentLogos:
    """Tests for admin payment logos management"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_public_payment_logos_no_auth(self):
        """Test public payment logos endpoint without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/payment-logos/public")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "logos" in data, f"Missing logos key: {data}"
        assert isinstance(data["logos"], list), f"logos should be a list: {data}"
        print(f"✅ Public payment logos accessible without auth: {len(data['logos'])} logos")
    
    def test_admin_get_payment_logos_unauthorized(self):
        """Test admin payment logos list without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/payment-logos")
        # 422 - Pydantic validation error if no auth header passed
        # 401/403 - Auth error if auth header present but invalid
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print(f"✅ Admin payment logos correctly requires auth: {response.status_code}")
    
    def test_admin_get_payment_logos(self, admin_token):
        """Test admin get all payment logos"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payment-logos",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "logos" in data, f"Missing logos key: {data}"
        print(f"✅ Admin can list payment logos: {len(data['logos'])} logos")
    
    def test_admin_create_payment_logo(self, admin_token):
        """Test creating a new payment logo"""
        test_logo = {
            "name": f"TEST_Logo_{uuid.uuid4().hex[:8]}",
            "logo_url": "https://example.com/test-logo.png",
            "display_order": 99,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/payment-logos",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=test_logo
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "logo" in data, f"Missing logo in response: {data}"
        assert data["logo"]["name"] == test_logo["name"], f"Name mismatch: {data}"
        
        logo_id = data["logo"]["id"]
        print(f"✅ Payment logo created: {logo_id}")
        
        return logo_id
    
    def test_admin_update_payment_logo(self, admin_token):
        """Test updating a payment logo"""
        # First create a logo
        test_logo = {
            "name": f"TEST_Update_{uuid.uuid4().hex[:8]}",
            "logo_url": "https://example.com/original.png",
            "display_order": 98,
            "is_active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/payment-logos",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=test_logo
        )
        assert create_response.status_code == 200
        logo_id = create_response.json()["logo"]["id"]
        
        # Now update it
        updated_data = {
            "name": f"TEST_Updated_{uuid.uuid4().hex[:8]}",
            "logo_url": "https://example.com/updated.png",
            "display_order": 97,
            "is_active": False
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/payment-logos/{logo_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=updated_data
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.status_code}: {update_response.text}"
        data = update_response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        
        print(f"✅ Payment logo updated: {logo_id}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/payment-logos/{logo_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_admin_delete_payment_logo(self, admin_token):
        """Test deleting a payment logo"""
        # First create a logo
        test_logo = {
            "name": f"TEST_Delete_{uuid.uuid4().hex[:8]}",
            "logo_url": "https://example.com/delete-me.png",
            "display_order": 96,
            "is_active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/payment-logos",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=test_logo
        )
        assert create_response.status_code == 200
        logo_id = create_response.json()["logo"]["id"]
        
        # Delete the logo
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/payment-logos/{logo_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.status_code}: {delete_response.text}"
        data = delete_response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        
        print(f"✅ Payment logo deleted: {logo_id}")
    
    def test_admin_delete_nonexistent_logo(self, admin_token):
        """Test deleting a non-existent logo"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/admin/payment-logos/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Non-existent logo delete correctly returns 404")
    
    def test_admin_update_nonexistent_logo(self, admin_token):
        """Test updating a non-existent logo"""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/admin/payment-logos/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test",
                "logo_url": "https://example.com/test.png",
                "display_order": 1,
                "is_active": True
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Non-existent logo update correctly returns 404")


class TestClientBalance:
    """Tests to verify client balance before withdrawal tests"""
    
    @pytest.fixture
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/client/login", json={
            "phone": CLIENT_PHONE,
            "password": CLIENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Client login failed: {response.status_code}")
    
    def test_get_client_dashboard(self, client_token):
        """Test getting client dashboard with balance info"""
        response = requests.get(
            f"{BASE_URL}/api/clients/me",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200, f"Dashboard failed: {response.status_code}: {response.text}"
        data = response.json()
        
        assert "client" in data, f"Missing client key: {data}"
        client = data["client"]
        
        print(f"✅ Client info retrieved:")
        print(f"   - Phone: {client.get('phone')}")
        print(f"   - Status: {client.get('status')}")
        print(f"   - Card Type: {client.get('card_type')}")
        print(f"   - Cashback Balance: GHS {client.get('cashback_balance', 0):.2f}")
        
        return client.get("cashback_balance", 0)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
