"""
SDM REWARDS - Referral QR Code & Card Upgrade Tests
====================================================
Tests for:
1. Referral endpoint returns QR code
2. Card upgrade API (pay difference)
3. Test confirm payment for upgrades
4. Inactive client status
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://web-boost-seo.preview.emergentagent.com')

# Test credentials
ACTIVE_CLIENT = {
    "phone": "+233551111111",
    "password": "TestPass123"
}

INACTIVE_CLIENT = {
    "phone": "+23354313c9801",
    "password": "TestInactif123"
}


class TestClientAuthentication:
    """Test client login for both active and inactive clients"""
    
    def test_active_client_login(self):
        """Test active client can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/client/login",
            json=ACTIVE_CLIENT
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "access_token" in data
        assert data["client"]["status"] == "active"
        print(f"✓ Active client logged in, card_type: {data['client']['card_type']}")
    
    def test_inactive_client_login(self):
        """Test inactive client can login with pending status"""
        response = requests.post(
            f"{BASE_URL}/api/auth/client/login",
            json=INACTIVE_CLIENT
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "access_token" in data
        assert data["client"]["status"] == "pending"
        assert data["client"]["card_type"] is None
        print(f"✓ Inactive client logged in with status: pending")


class TestReferralQRCode:
    """Test referral system with QR code functionality"""
    
    @pytest.fixture(autouse=True)
    def get_active_token(self):
        """Login and get token for active client"""
        response = requests.post(
            f"{BASE_URL}/api/auth/client/login",
            json=ACTIVE_CLIENT
        )
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.client = response.json()["client"]
        else:
            pytest.skip("Authentication failed")
    
    def test_referrals_endpoint_returns_qr_code(self):
        """Verify referrals endpoint returns referral_code and qr_code"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/clients/referrals", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields for QR code functionality
        assert "referral_code" in data
        assert "qr_code" in data
        assert data["referral_code"] is not None
        assert len(data["referral_code"]) > 0
        
        # Verify referral stats
        assert "total_referrals" in data
        assert "active_referrals" in data
        assert "total_bonus_earned" in data
        
        print(f"✓ Referral code: {data['referral_code']}")
        print(f"✓ QR code: {data['qr_code']}")
        print(f"✓ Total referrals: {data['total_referrals']}")
    
    def test_qr_code_endpoint(self):
        """Verify dedicated QR code endpoint works"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/clients/qr-code", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "qr_code" in data
        assert "referral_code" in data
        assert "full_name" in data
        
        print(f"✓ QR code endpoint working: {data['qr_code']}")


class TestCardUpgrade:
    """Test card upgrade functionality (pay difference)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        # First need a client with a card that can be upgraded
        response = requests.post(
            f"{BASE_URL}/api/auth/client/login",
            json=ACTIVE_CLIENT
        )
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.client = response.json()["client"]
        else:
            pytest.skip("Authentication failed")
    
    def test_get_available_cards_with_prices(self):
        """Verify available cards endpoint returns prices for upgrade calculation"""
        response = requests.get(f"{BASE_URL}/api/clients/cards/available")
        
        assert response.status_code == 200
        data = response.json()
        assert "cards" in data
        
        cards = data["cards"]
        assert len(cards) >= 3  # At least silver, gold, platinum
        
        # Verify each card has required fields
        for card in cards:
            assert "type" in card
            assert "name" in card
            assert "price" in card
            assert "duration_days" in card
            assert "duration_label" in card
            
        # Verify price hierarchy
        prices = {c["type"]: c["price"] for c in cards}
        if "silver" in prices and "gold" in prices:
            assert prices["gold"] > prices["silver"], "Gold should cost more than Silver"
        if "gold" in prices and "platinum" in prices:
            assert prices["platinum"] > prices["gold"], "Platinum should cost more than Gold"
        
        print(f"✓ Card prices: {prices}")
    
    def test_upgrade_downgrade_rejected(self):
        """Test that downgrade is properly rejected"""
        # Get current card type
        current_card = self.client.get("card_type")
        if not current_card:
            pytest.skip("Client has no card")
        
        # Try to downgrade (if diamond, try gold; otherwise try silver)
        downgrade_to = "silver" if current_card != "silver" else "gold"
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(
            f"{BASE_URL}/api/clients/cards/upgrade",
            headers=headers,
            json={
                "new_card_type": downgrade_to,
                "payment_phone": "+233551111111"
            }
        )
        
        # Should fail with 400 error
        if current_card in ["gold", "platinum", "diamond"]:
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            print(f"✓ Downgrade rejected: {data['detail']}")
        else:
            print(f"? Skipping - client has {current_card}, cannot test downgrade")
    
    def test_upgrade_invalid_card_type(self):
        """Test that invalid card type is rejected"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(
            f"{BASE_URL}/api/clients/cards/upgrade",
            headers=headers,
            json={
                "new_card_type": "nonexistent_card",
                "payment_phone": "+233551111111"
            }
        )
        
        assert response.status_code == 400
        print(f"✓ Invalid card type rejected")


class TestInactiveClientFeatures:
    """Test features available to inactive clients"""
    
    @pytest.fixture(autouse=True)
    def get_inactive_token(self):
        """Login as inactive client"""
        response = requests.post(
            f"{BASE_URL}/api/auth/client/login",
            json=INACTIVE_CLIENT
        )
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.client = response.json()["client"]
        else:
            pytest.skip("Inactive client authentication failed")
    
    def test_inactive_client_status_pending(self):
        """Verify inactive client has pending status"""
        assert self.client["status"] == "pending"
        assert self.client["card_type"] is None
        print(f"✓ Inactive client status: {self.client['status']}")
    
    def test_inactive_client_has_referral_code(self):
        """Verify inactive clients still get a referral code"""
        assert "referral_code" in self.client
        assert self.client["referral_code"] is not None
        assert len(self.client["referral_code"]) > 0
        print(f"✓ Inactive client referral code: {self.client['referral_code']}")
    
    def test_inactive_client_can_access_referrals(self):
        """Verify inactive clients can access referrals endpoint"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/clients/referrals", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "referral_code" in data
        print(f"✓ Inactive client can access referrals")
    
    def test_inactive_client_cannot_upgrade(self):
        """Verify inactive clients cannot upgrade (no card to upgrade)"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(
            f"{BASE_URL}/api/clients/cards/upgrade",
            headers=headers,
            json={
                "new_card_type": "gold",
                "payment_phone": "+23354313c9801"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        # Should say need active card
        print(f"✓ Inactive client upgrade rejected: {data.get('detail', data)}")


class TestPaymentTestConfirm:
    """Test payment confirmation endpoint for upgrades"""
    
    def test_confirm_nonexistent_payment(self):
        """Test confirming non-existent payment returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/payments/test/confirm/nonexistent-id-12345"
        )
        
        assert response.status_code == 404
        print("✓ Non-existent payment returns 404")
    
    def test_payment_status_endpoint(self):
        """Test payment status endpoint"""
        # First, we need to get a valid payment ID from an upgrade
        login_response = requests.post(
            f"{BASE_URL}/api/auth/client/login",
            json=ACTIVE_CLIENT
        )
        
        if login_response.status_code != 200:
            pytest.skip("Login failed")
        
        token = login_response.json()["access_token"]
        client = login_response.json()["client"]
        
        # Only test if client is not already at max tier
        if client.get("card_type") != "diamond":
            headers = {"Authorization": f"Bearer {token}"}
            
            # Determine upgrade target
            card_order = ['silver', 'gold', 'platinum', 'diamond']
            current_idx = card_order.index(client["card_type"]) if client.get("card_type") in card_order else -1
            if current_idx < len(card_order) - 1:
                upgrade_to = card_order[current_idx + 1]
                
                # Initiate upgrade
                upgrade_response = requests.post(
                    f"{BASE_URL}/api/clients/cards/upgrade",
                    headers=headers,
                    json={
                        "new_card_type": upgrade_to,
                        "payment_phone": "+233551111111"
                    }
                )
                
                if upgrade_response.status_code == 200:
                    payment_id = upgrade_response.json().get("payment_id")
                    if payment_id:
                        # Check payment status
                        status_response = requests.get(f"{BASE_URL}/api/payments/status/{payment_id}")
                        assert status_response.status_code == 200
                        status_data = status_response.json()
                        assert "status" in status_data
                        print(f"✓ Payment status: {status_data['status']}")
        else:
            print("✓ Client at max tier (diamond), skipping upgrade test")


class TestAPIHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ API healthy: {data['service']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
