"""
SDM (Smart Development Membership) Platform API Tests
Tests for:
- Admin SDM Config (GET/PUT)
- Admin SDM Stats
- Admin Memberships
- Admin Card Types
- Merchant Card Types CRUD
- Merchant Memberships
- User Available Cards
- User Memberships
- User Purchase Membership
"""
import pytest
import requests
import os
import time
import secrets

# Get the API URL from the environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://web-boost-seo.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Gerard0103@"
TEST_PHONE = "+233241234567"


@pytest.fixture(scope="session")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    print(f"Admin login response: {response.status_code}")
    if response.status_code == 200:
        token = response.json().get("access_token")
        print(f"Admin token obtained successfully")
        return token
    else:
        print(f"Admin login failed: {response.text}")
        pytest.skip("Admin authentication failed")
        return None


@pytest.fixture(scope="session")
def user_token():
    """Get user token via OTP flow"""
    phone = f"+233{secrets.randbelow(900000000) + 100000000}"
    
    # Send OTP
    otp_response = requests.post(
        f"{BASE_URL}/api/sdm/auth/send-otp",
        json={"phone": phone}
    )
    print(f"Send OTP response: {otp_response.status_code} - {otp_response.json()}")
    
    if otp_response.status_code != 200:
        pytest.skip("OTP send failed")
        return None
    
    debug_otp = otp_response.json().get("debug_otp")
    if not debug_otp:
        pytest.skip("No debug OTP available")
        return None
    
    # Verify OTP
    verify_response = requests.post(
        f"{BASE_URL}/api/sdm/auth/verify-otp",
        json={"phone": phone, "otp_code": debug_otp}
    )
    print(f"Verify OTP response: {verify_response.status_code}")
    
    if verify_response.status_code == 200:
        return {
            "token": verify_response.json().get("access_token"),
            "user": verify_response.json().get("user"),
            "phone": phone
        }
    else:
        pytest.skip("OTP verification failed")
        return None


@pytest.fixture(scope="session")
def merchant_data():
    """Register a new merchant for testing"""
    unique_suffix = secrets.token_hex(4)
    phone = f"+233{secrets.randbelow(900000000) + 100000000}"
    
    register_response = requests.post(
        f"{BASE_URL}/api/sdm/merchant/register",
        json={
            "business_name": f"TEST_Merchant_{unique_suffix}",
            "business_type": "restaurant",
            "phone": phone,
            "email": f"test_{unique_suffix}@example.com",
            "city": "Accra",
            "cashback_rate": 0.05
        }
    )
    print(f"Merchant register response: {register_response.status_code} - {register_response.json()}")
    
    if register_response.status_code == 200:
        data = register_response.json()
        return {
            "token": data.get("access_token"),
            "merchant_id": data.get("merchant_id"),
            "api_key": data.get("api_key"),
            "phone": phone
        }
    else:
        pytest.skip("Merchant registration failed")
        return None


class TestAdminSDMConfig:
    """Test Admin SDM Configuration endpoints"""
    
    def test_admin_get_sdm_config(self, admin_token):
        """Test GET /api/sdm/admin/config"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"GET config response: {response.status_code} - {response.json() if response.status_code == 200 else response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify config structure
        assert "membership_card_price" in data
        assert "referral_bonus_bronze" in data
        assert "referral_bonus_silver" in data
        assert "referral_bonus_gold" in data
        assert "welcome_bonus" in data
        assert "membership_validity_days" in data
        print(f"SDM Config: {data}")
    
    def test_admin_update_sdm_config(self, admin_token):
        """Test PUT /api/sdm/admin/config"""
        # Get current config first
        get_response = requests.get(
            f"{BASE_URL}/api/sdm/admin/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if get_response.status_code != 200:
            pytest.skip("Cannot get config to update")
        
        current_config = get_response.json()
        new_welcome_bonus = current_config.get("welcome_bonus", 2.0) + 0.5
        
        # Update config
        response = requests.put(
            f"{BASE_URL}/api/sdm/admin/config",
            json={"welcome_bonus": new_welcome_bonus},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"PUT config response: {response.status_code} - {response.json() if response.status_code == 200 else response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data
        assert data["message"] == "Configuration updated"
        
        # Verify update was persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/sdm/admin/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("welcome_bonus") == new_welcome_bonus
        print(f"Config update verified: welcome_bonus = {verify_data.get('welcome_bonus')}")
        
        # Reset to original value
        requests.put(
            f"{BASE_URL}/api/sdm/admin/config",
            json={"welcome_bonus": current_config.get("welcome_bonus", 2.0)},
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestAdminSDMStats:
    """Test Admin SDM Statistics endpoint"""
    
    def test_admin_get_sdm_stats(self, admin_token):
        """Test GET /api/sdm/admin/sdm-stats"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/sdm-stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"SDM Stats response: {response.status_code} - {response.json() if response.status_code == 200 else response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify stats structure
        assert "total_users" in data
        assert "total_merchants" in data
        assert "verified_merchants" in data
        assert "total_transactions" in data
        assert "total_memberships" in data
        assert "active_memberships" in data
        assert "total_card_types" in data
        assert "total_cashback_given" in data
        assert "total_commission_earned" in data
        assert "total_membership_revenue" in data
        assert "total_referral_bonuses" in data
        assert "pending_withdrawals" in data
        
        print(f"SDM Stats: Users={data['total_users']}, Merchants={data['total_merchants']}, Transactions={data['total_transactions']}")


class TestAdminMemberships:
    """Test Admin Memberships endpoint"""
    
    def test_admin_get_memberships(self, admin_token):
        """Test GET /api/sdm/admin/memberships"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/memberships",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Admin memberships response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of memberships"
        print(f"Total memberships returned: {len(data)}")
        
        # If there are memberships, verify structure
        if len(data) > 0:
            membership = data[0]
            assert "id" in membership
            assert "user_id" in membership
            assert "merchant_id" in membership
            assert "card_type_id" in membership
            assert "status" in membership
            print(f"Sample membership: {membership}")
    
    def test_admin_get_memberships_with_status_filter(self, admin_token):
        """Test GET /api/sdm/admin/memberships with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/memberships?status=active",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Admin memberships (active) response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned memberships should be active
        for membership in data:
            assert membership.get("status") == "active", f"Expected active status, got {membership.get('status')}"


class TestAdminCardTypes:
    """Test Admin Card Types endpoint"""
    
    def test_admin_get_all_card_types(self, admin_token):
        """Test GET /api/sdm/admin/card-types"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/card-types",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Admin card types response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of card types"
        print(f"Total card types returned: {len(data)}")
        
        # If there are card types, verify structure
        if len(data) > 0:
            card_type = data[0]
            assert "id" in card_type
            assert "merchant_id" in card_type
            assert "name" in card_type
            assert "price" in card_type
            print(f"Sample card type: {card_type}")


class TestMerchantCardTypes:
    """Test Merchant Card Types CRUD endpoints"""
    
    def test_merchant_create_card_type(self, merchant_data):
        """Test POST /api/sdm/merchant/card-types"""
        unique_suffix = secrets.token_hex(3)
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/card-types",
            json={
                "name": f"TEST_VIP_Card_{unique_suffix}",
                "description": "Test VIP membership card",
                "price": 75.0,
                "validity_days": 365,
                "cashback_bonus": 0.02,
                "referral_bonus": 7.5,
                "welcome_bonus": 3.0
            },
            headers={"Authorization": f"Bearer {merchant_data['token']}"}
        )
        print(f"Create card type response: {response.status_code} - {response.json() if response.status_code == 200 else response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data
        assert "card_type" in data
        assert data["card_type"]["name"] == f"TEST_VIP_Card_{unique_suffix}"
        assert data["card_type"]["price"] == 75.0
        
        # Store for cleanup
        return data["card_type"]["id"]
    
    def test_merchant_get_card_types(self, merchant_data):
        """Test GET /api/sdm/merchant/card-types"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/card-types",
            headers={"Authorization": f"Bearer {merchant_data['token']}"}
        )
        print(f"Get merchant card types response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Merchant has {len(data)} card types")
    
    def test_merchant_update_card_type(self, merchant_data):
        """Test PUT /api/sdm/merchant/card-types/{card_type_id}"""
        # First create a card type
        unique_suffix = secrets.token_hex(3)
        create_response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/card-types",
            json={
                "name": f"TEST_Update_Card_{unique_suffix}",
                "price": 50.0,
                "validity_days": 180
            },
            headers={"Authorization": f"Bearer {merchant_data['token']}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip("Cannot create card type for update test")
        
        card_type_id = create_response.json()["card_type"]["id"]
        
        # Update the card type
        update_response = requests.put(
            f"{BASE_URL}/api/sdm/merchant/card-types/{card_type_id}",
            json={
                "name": f"TEST_Updated_Card_{unique_suffix}",
                "price": 60.0,
                "validity_days": 365
            },
            headers={"Authorization": f"Bearer {merchant_data['token']}"}
        )
        print(f"Update card type response: {update_response.status_code}")
        
        assert update_response.status_code == 200
        assert update_response.json().get("message") == "Card type updated"
    
    def test_merchant_delete_card_type(self, merchant_data):
        """Test DELETE /api/sdm/merchant/card-types/{card_type_id}"""
        # First create a card type
        unique_suffix = secrets.token_hex(3)
        create_response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/card-types",
            json={
                "name": f"TEST_Delete_Card_{unique_suffix}",
                "price": 40.0,
                "validity_days": 90
            },
            headers={"Authorization": f"Bearer {merchant_data['token']}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip("Cannot create card type for delete test")
        
        card_type_id = create_response.json()["card_type"]["id"]
        
        # Delete (deactivate) the card type
        delete_response = requests.delete(
            f"{BASE_URL}/api/sdm/merchant/card-types/{card_type_id}",
            headers={"Authorization": f"Bearer {merchant_data['token']}"}
        )
        print(f"Delete card type response: {delete_response.status_code}")
        
        assert delete_response.status_code == 200
        assert delete_response.json().get("message") == "Card type deactivated"


class TestMerchantMemberships:
    """Test Merchant Memberships endpoint"""
    
    def test_merchant_get_memberships(self, merchant_data):
        """Test GET /api/sdm/merchant/memberships"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/memberships",
            headers={"Authorization": f"Bearer {merchant_data['token']}"}
        )
        print(f"Merchant memberships response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Merchant has {len(data)} active memberships")


class TestUserAvailableCards:
    """Test User Available Cards endpoint"""
    
    def test_user_get_available_cards(self, user_token):
        """Test GET /api/sdm/user/available-cards"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/user/available-cards",
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )
        print(f"User available cards response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"User has {len(data)} available cards to purchase")
        
        # Verify card structure if any cards exist
        if len(data) > 0:
            card = data[0]
            assert "id" in card
            assert "merchant_id" in card
            assert "merchant_name" in card
            assert "name" in card
            assert "price" in card
            print(f"Sample available card: {card}")


class TestUserMemberships:
    """Test User Memberships endpoint"""
    
    def test_user_get_memberships(self, user_token):
        """Test GET /api/sdm/user/memberships"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/user/memberships",
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )
        print(f"User memberships response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"User has {len(data)} memberships")


class TestUserPurchaseMembership:
    """Test User Purchase Membership endpoint"""
    
    def test_user_purchase_membership_no_balance(self, user_token, merchant_data):
        """Test POST /api/sdm/user/purchase-membership with insufficient balance"""
        # First need to ensure merchant is verified and has a card type
        # Create a card type for the merchant
        unique_suffix = secrets.token_hex(3)
        card_response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/card-types",
            json={
                "name": f"TEST_Purchase_Card_{unique_suffix}",
                "price": 1000.0,  # High price to ensure insufficient balance
                "validity_days": 365
            },
            headers={"Authorization": f"Bearer {merchant_data['token']}"}
        )
        
        if card_response.status_code != 200:
            pytest.skip("Cannot create card type for purchase test")
        
        card_type_id = card_response.json()["card_type"]["id"]
        
        # Try to purchase (should fail due to insufficient balance)
        response = requests.post(
            f"{BASE_URL}/api/sdm/user/purchase-membership",
            json={
                "card_type_id": card_type_id,
                "payment_method": "wallet"
            },
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )
        print(f"Purchase membership (insufficient) response: {response.status_code} - {response.json() if response.status_code >= 400 else ''}")
        
        # Should fail with 400 - insufficient balance OR 404 if merchant not verified
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"
    
    def test_user_purchase_membership_invalid_card(self, user_token):
        """Test POST /api/sdm/user/purchase-membership with invalid card type"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/user/purchase-membership",
            json={
                "card_type_id": "invalid_card_type_id",
                "payment_method": "wallet"
            },
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )
        print(f"Purchase membership (invalid card) response: {response.status_code}")
        
        assert response.status_code == 404
        assert "Card type not found" in response.json().get("detail", "")


class TestAuthEndpoints:
    """Test basic SDM auth endpoints"""
    
    def test_send_otp(self):
        """Test POST /api/sdm/auth/send-otp"""
        phone = f"+233{secrets.randbelow(900000000) + 100000000}"
        response = requests.post(
            f"{BASE_URL}/api/sdm/auth/send-otp",
            json={"phone": phone}
        )
        print(f"Send OTP response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "otp_id" in data
        assert "debug_otp" in data  # Debug mode is enabled
        assert data["expires_in"] == 600
    
    def test_send_otp_with_referral(self):
        """Test POST /api/sdm/auth/send-otp with referral code"""
        phone = f"+233{secrets.randbelow(900000000) + 100000000}"
        response = requests.post(
            f"{BASE_URL}/api/sdm/auth/send-otp",
            json={"phone": phone, "referral_code": "INVALID_CODE"}
        )
        print(f"Send OTP (with referral) response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("referral_valid") == False  # Invalid code
    
    def test_verify_otp_invalid(self):
        """Test POST /api/sdm/auth/verify-otp with invalid OTP"""
        phone = f"+233{secrets.randbelow(900000000) + 100000000}"
        
        # First send OTP
        requests.post(f"{BASE_URL}/api/sdm/auth/send-otp", json={"phone": phone})
        
        # Try to verify with wrong OTP
        response = requests.post(
            f"{BASE_URL}/api/sdm/auth/verify-otp",
            json={"phone": phone, "otp_code": "000000"}
        )
        print(f"Verify OTP (invalid) response: {response.status_code}")
        
        assert response.status_code == 400
        assert "Invalid OTP" in response.json().get("detail", "")


class TestMerchantVerification:
    """Test merchant verification flow for available cards"""
    
    def test_admin_verify_merchant(self, admin_token, merchant_data):
        """Test PUT /api/sdm/admin/merchants/{merchant_id}/verify"""
        response = requests.put(
            f"{BASE_URL}/api/sdm/admin/merchants/{merchant_data['merchant_id']}/verify",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Verify merchant response: {response.status_code} - {response.json() if response.status_code == 200 else response.text}")
        
        assert response.status_code == 200
        assert response.json().get("message") == "Merchant verified"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
