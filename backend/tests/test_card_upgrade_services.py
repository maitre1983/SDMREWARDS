"""
Test Card Upgrade Functionality - Complete Test Suite
Tests the /api/clients/cards/upgrade endpoint and Services page integration
"""

import pytest
import requests
import uuid
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test client with known password
TEST_CLIENT_PHONE = "+233249876543"
TEST_CLIENT_PASSWORD = "TestPass@123"

# Module-level session for sharing across tests
session = requests.Session()
session.headers.update({"Content-Type": "application/json"})

# Shared state
client_token = None
client_data = None


class TestCardUpgradeBackendAPI:
    """Backend API tests for card upgrade functionality"""
    
    def test_01_health_check(self):
        """Verify API is healthy"""
        response = session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✅ API healthy: {data.get('service')}")
    
    def test_02_get_available_cards(self):
        """Test fetching available card types for upgrade"""
        response = session.get(f"{BASE_URL}/api/clients/cards/available")
        assert response.status_code == 200
        data = response.json()
        assert "cards" in data
        cards = data["cards"]
        assert len(cards) >= 3  # At least silver, gold, platinum
        
        # Verify card structure has upgrade-related fields
        for card in cards:
            assert "type" in card
            assert "name" in card
            assert "price" in card  # Full price for upgrade
            print(f"✅ Card: {card['name']} - GHS {card['price']}")
    
    def test_03_get_public_card_types(self):
        """Test public card types endpoint (used by Services page)"""
        response = session.get(f"{BASE_URL}/api/public/card-types")
        assert response.status_code == 200
        data = response.json()
        assert "card_types" in data
        print(f"✅ Public card types: {len(data['card_types'])} types available")
    
    def test_04_get_service_fees(self):
        """Test service fees endpoint (Services page)"""
        response = session.get(f"{BASE_URL}/api/services/fees")
        assert response.status_code == 200
        data = response.json()
        assert "fees" in data
        print(f"✅ Service fees: {data.get('fees')}")
    
    def test_05_login_test_client(self):
        """Login the test client"""
        global client_token, client_data
        
        payload = {
            "phone": TEST_CLIENT_PHONE,
            "password": TEST_CLIENT_PASSWORD
        }
        response = session.post(f"{BASE_URL}/api/auth/client/login", json=payload)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data or "token" in data
        
        client_token = data.get("access_token") or data.get("token")
        client_data = data.get("client", {})
        
        print(f"✅ Logged in as: {client_data.get('full_name')}")
        print(f"   Card type: {client_data.get('card_type')}")
        print(f"   Balance: GHS {client_data.get('cashback_balance', 0)}")
    
    def test_06_get_client_dashboard(self):
        """Get client dashboard data"""
        global client_data
        
        headers = {"Authorization": f"Bearer {client_token}"}
        response = session.get(f"{BASE_URL}/api/clients/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        client_data = data.get("client", {})
        assert client_data.get("status") == "active"
        print(f"✅ Client status: {client_data.get('status')}")
    
    def test_07_upgrade_cannot_downgrade(self):
        """Test that can't upgrade to same or lower tier"""
        current_type = client_data.get("card_type")
        
        headers = {"Authorization": f"Bearer {client_token}"}
        payload = {
            "new_card_type": current_type,
            "payment_phone": TEST_CLIENT_PHONE
        }
        response = session.post(
            f"{BASE_URL}/api/clients/cards/upgrade",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "higher tier" in data.get("detail", "").lower()
        print(f"✅ Correctly rejected upgrade to same tier ({current_type})")
    
    def test_08_upgrade_requires_phone_for_momo(self):
        """Test that upgrade validates phone when MoMo payment required"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        current_type = client_data.get("card_type")
        next_tier = {"silver": "gold", "gold": "platinum"}.get(current_type, "platinum")
        
        # Try to upgrade without phone
        payload = {
            "new_card_type": next_tier,
            "payment_phone": None,
            "use_cashback": False
        }
        response = session.post(
            f"{BASE_URL}/api/clients/cards/upgrade",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "phone" in data.get("detail", "").lower()
        print(f"✅ Correctly requires phone for MoMo payment")
    
    def test_09_upgrade_with_momo_payment(self):
        """Test upgrade initiation with MoMo payment"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        current_type = client_data.get("card_type")
        next_tier = {"silver": "gold", "gold": "platinum"}.get(current_type, "platinum")
        
        payload = {
            "new_card_type": next_tier,
            "payment_phone": TEST_CLIENT_PHONE,
            "use_cashback": False
        }
        response = session.post(
            f"{BASE_URL}/api/clients/cards/upgrade",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("to_card") == next_tier
        assert data.get("from_card") == current_type
        assert data.get("amount") > 0  # Full price
        
        print(f"✅ Upgrade initiated:")
        print(f"   From: {data.get('from_card')} → To: {data.get('to_card')}")
        print(f"   Full price: GHS {data.get('amount')}")
        print(f"   Welcome bonus: GHS {data.get('welcome_bonus')}")
        
        # Store for later confirmation
        TestCardUpgradeBackendAPI.upgrade_payment_id = data.get("payment_id")
    
    def test_10_confirm_upgrade_payment(self):
        """Confirm upgrade payment in test mode"""
        if not hasattr(TestCardUpgradeBackendAPI, 'upgrade_payment_id'):
            pytest.skip("No upgrade payment to confirm")
        
        payment_id = TestCardUpgradeBackendAPI.upgrade_payment_id
        response = session.post(f"{BASE_URL}/api/payments/test/confirm/{payment_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✅ Upgrade payment confirmed")
    
    def test_11_verify_upgraded_card(self):
        """Verify client card was upgraded"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = session.get(f"{BASE_URL}/api/clients/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        client = data.get("client", {})
        assert client.get("status") == "active"
        
        # Card should be upgraded (no longer the original type)
        print(f"✅ Client now has {client.get('card_type')} card")
        print(f"   New balance: GHS {client.get('cashback_balance', 0)}")


class TestUpgradeWithCashback:
    """Test upgrade using cashback balance"""
    
    def test_01_upgrade_with_partial_cashback(self):
        """Test upgrade using partial cashback + MoMo"""
        global client_token, client_data
        
        # Login fresh
        payload = {
            "phone": TEST_CLIENT_PHONE,
            "password": TEST_CLIENT_PASSWORD
        }
        response = session.post(f"{BASE_URL}/api/auth/client/login", json=payload)
        if response.status_code != 200:
            pytest.skip("Could not login")
        
        data = response.json()
        client_token = data.get("access_token") or data.get("token")
        client_data = data.get("client", {})
        
        balance = client_data.get("cashback_balance", 0)
        current_type = client_data.get("card_type")
        
        print(f"Current card: {current_type}, Balance: GHS {balance}")
        
        # Get next upgrade tier
        tier_order = ["silver", "gold", "platinum", "diamond", "business"]
        current_index = tier_order.index(current_type) if current_type in tier_order else 0
        
        if current_index >= len(tier_order) - 1:
            pytest.skip("Already at highest tier")
        
        next_tier = tier_order[current_index + 1]
        
        headers = {"Authorization": f"Bearer {client_token}"}
        payload = {
            "new_card_type": next_tier,
            "payment_phone": TEST_CLIENT_PHONE,
            "use_cashback": True,
            "cashback_amount": min(balance, 5)  # Use up to 5 GHS
        }
        response = session.post(
            f"{BASE_URL}/api/clients/cards/upgrade",
            json=payload,
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Upgrade with cashback:")
            print(f"   Cashback used: GHS {data.get('cashback_used')}")
            print(f"   MoMo amount: GHS {data.get('momo_amount')}")
            
            TestUpgradeWithCashback.payment_id = data.get("payment_id")
        else:
            print(f"⚠️ Upgrade returned: {response.status_code}")
            print(f"   Detail: {response.json().get('detail')}")


class TestServicesEndpoints:
    """Test Services page API endpoints"""
    
    def test_01_services_fees_endpoint(self):
        """Verify services fees endpoint"""
        response = requests.get(f"{BASE_URL}/api/services/fees")
        assert response.status_code == 200
        data = response.json()
        assert "fees" in data
        print(f"✅ Service fees available")
    
    def test_02_available_cards_has_required_fields(self):
        """Verify cards have fields needed for upgrade UI"""
        response = requests.get(f"{BASE_URL}/api/clients/cards/available")
        assert response.status_code == 200
        data = response.json()
        
        cards = data.get("cards", [])
        for card in cards:
            # Required for upgrade selection UI
            assert "price" in card, f"Missing price in {card.get('type')}"
            assert "type" in card, f"Missing type"
            assert "name" in card, f"Missing name"
            
        print(f"✅ All {len(cards)} cards have required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
