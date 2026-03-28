"""
SDM REWARDS - Hubtel Checkout Payment Tests
============================================
Tests for card purchase and upgrade using Hubtel Online Checkout API

Features tested:
- POST /api/payments/card/initiate - Card purchase with checkout redirect
- POST /api/payments/card/upgrade - Card upgrade with checkout redirect
- GET /api/payments/verify-checkout/{ref} - Verify checkout payment status
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test client phone (existing active client with silver card)
TEST_CLIENT_PHONE = "+233532838983"

# Card prices from platform config
CARD_PRICES = {
    "silver": 30,
    "gold": 60,
    "platinum": 120
}


class TestCardPurchaseInitiate:
    """Tests for POST /api/payments/card/initiate endpoint"""
    
    def test_initiate_card_purchase_invalid_card_type(self):
        """Test that invalid card type returns 400 error"""
        response = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": TEST_CLIENT_PHONE,
            "card_type": "invalid_card"
        })
        
        assert response.status_code == 400
        assert "Invalid card type" in response.json().get("detail", "")
        print("✅ Invalid card type returns 400")
    
    def test_initiate_card_purchase_client_not_found(self):
        """Test that non-existent client returns 404"""
        response = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": "+233999999999",
            "card_type": "silver"
        })
        
        assert response.status_code == 404
        assert "not found" in response.json().get("detail", "").lower()
        print("✅ Non-existent client returns 404")
    
    def test_initiate_card_purchase_already_active(self):
        """Test that client with active card cannot purchase another"""
        response = requests.post(f"{BASE_URL}/api/payments/card/initiate", json={
            "phone": TEST_CLIENT_PHONE,  # This client already has active silver card
            "card_type": "silver"
        })
        
        assert response.status_code == 400
        assert "already have an active" in response.json().get("detail", "").lower()
        print("✅ Active client cannot purchase another card")


class TestCardUpgradeInitiate:
    """Tests for POST /api/payments/card/upgrade endpoint"""
    
    def test_initiate_card_upgrade_returns_success(self):
        """Test that card upgrade initiation returns success response"""
        # Use existing test client with silver card to upgrade to gold
        response = requests.post(f"{BASE_URL}/api/payments/card/upgrade", json={
            "phone": TEST_CLIENT_PHONE,
            "card_type": "gold"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "payment_id" in data
        assert "reference" in data
        assert data.get("new_card") == "gold"
        assert data.get("previous_card") == "silver"
        
        # Verify upgrade price calculation: gold(60) - silver(30) = 30
        expected_upgrade_price = CARD_PRICES["gold"] - CARD_PRICES["silver"]
        assert data.get("amount") == expected_upgrade_price, f"Expected {expected_upgrade_price}, got {data.get('amount')}"
        
        # Check checkout mode
        if data.get("test_mode"):
            assert data.get("use_checkout") == False
            print(f"✅ Test mode upgrade: amount={data.get('amount')}, use_checkout=False")
        else:
            assert data.get("use_checkout") == True
            assert "checkout_url" in data
            print(f"✅ Production upgrade: checkout_url={data.get('checkout_url')}")
    
    def test_initiate_card_upgrade_to_platinum(self):
        """Test upgrade to platinum calculates correct price"""
        response = requests.post(f"{BASE_URL}/api/payments/card/upgrade", json={
            "phone": TEST_CLIENT_PHONE,
            "card_type": "platinum"
        })
        
        assert response.status_code == 200
        
        data = response.json()
        # Verify upgrade price: platinum(120) - silver(30) = 90
        expected_upgrade_price = CARD_PRICES["platinum"] - CARD_PRICES["silver"]
        assert data.get("amount") == expected_upgrade_price, f"Expected {expected_upgrade_price}, got {data.get('amount')}"
        print(f"✅ Silver->Platinum upgrade price: GHS {data.get('amount')}")
    
    def test_initiate_card_upgrade_invalid_downgrade(self):
        """Test that downgrade is not allowed"""
        # Client has silver, cannot downgrade to silver again
        response = requests.post(f"{BASE_URL}/api/payments/card/upgrade", json={
            "phone": TEST_CLIENT_PHONE,
            "card_type": "silver"
        })
        
        assert response.status_code == 400
        assert "Cannot upgrade" in response.json().get("detail", "") or "higher tier" in response.json().get("detail", "").lower()
        print("✅ Downgrade not allowed")
    
    def test_initiate_card_upgrade_client_not_found(self):
        """Test that non-existent client returns 404"""
        response = requests.post(f"{BASE_URL}/api/payments/card/upgrade", json={
            "phone": "+233999999999",
            "card_type": "gold"
        })
        
        assert response.status_code == 404
        print("✅ Non-existent client returns 404 for upgrade")


class TestVerifyCheckoutPayment:
    """Tests for GET /api/payments/verify-checkout/{ref} endpoint"""
    
    def test_verify_checkout_not_found(self):
        """Test that non-existent reference returns not_found status"""
        fake_ref = f"SDM-CARD-{datetime.now().strftime('%Y%m%d%H%M%S')}-FAKE1234"
        
        response = requests.get(f"{BASE_URL}/api/payments/verify-checkout/{fake_ref}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "not_found"
        print("✅ Non-existent reference returns not_found status")
    
    def test_verify_checkout_endpoint_exists(self):
        """Test that verify-checkout endpoint exists and responds"""
        response = requests.get(f"{BASE_URL}/api/payments/verify-checkout/test-ref")
        
        # Should return 200 with not_found status, not 404
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✅ Verify checkout endpoint responds with status: {data.get('status')}")
    
    def test_verify_checkout_after_upgrade_initiation(self):
        """Test verify-checkout for a payment created via upgrade"""
        # First initiate an upgrade
        init_res = requests.post(f"{BASE_URL}/api/payments/card/upgrade", json={
            "phone": TEST_CLIENT_PHONE,
            "card_type": "gold"
        })
        
        assert init_res.status_code == 200
        payment_ref = init_res.json().get("reference")
        
        # Verify the payment status
        verify_res = requests.get(f"{BASE_URL}/api/payments/verify-checkout/{payment_ref}")
        
        assert verify_res.status_code == 200
        data = verify_res.json()
        
        # Should be pending since we just created it
        assert data.get("status") in ["pending", "checkout_initiated", "processing"]
        print(f"✅ Verify checkout returns status: {data.get('status')}")


class TestUpgradePriceCalculation:
    """Tests for upgrade price calculation logic"""
    
    def test_silver_to_gold_upgrade_price(self):
        """Test Silver to Gold upgrade price = 60 - 30 = 30"""
        response = requests.post(f"{BASE_URL}/api/payments/card/upgrade", json={
            "phone": TEST_CLIENT_PHONE,
            "card_type": "gold"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        expected = CARD_PRICES["gold"] - CARD_PRICES["silver"]
        assert data.get("amount") == expected
        print(f"✅ Silver->Gold: GHS {expected}")
    
    def test_silver_to_platinum_upgrade_price(self):
        """Test Silver to Platinum upgrade price = 120 - 30 = 90"""
        response = requests.post(f"{BASE_URL}/api/payments/card/upgrade", json={
            "phone": TEST_CLIENT_PHONE,
            "card_type": "platinum"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        expected = CARD_PRICES["platinum"] - CARD_PRICES["silver"]
        assert data.get("amount") == expected
        print(f"✅ Silver->Platinum: GHS {expected}")


class TestPaymentReferenceFormat:
    """Tests for payment reference format"""
    
    def test_card_upgrade_reference_format(self):
        """Test that card upgrade reference follows SDM-UPGRADE-YYYYMMDDHHMMSS-XXXXXXXX format"""
        response = requests.post(f"{BASE_URL}/api/payments/card/upgrade", json={
            "phone": TEST_CLIENT_PHONE,
            "card_type": "gold"
        })
        
        assert response.status_code == 200
        ref = response.json().get("reference")
        
        assert ref.startswith("SDM-UPGRADE-")
        print(f"✅ Card upgrade reference format: {ref}")


class TestCheckoutModeResponse:
    """Tests for checkout mode response fields"""
    
    def test_upgrade_response_has_checkout_fields(self):
        """Test that upgrade response contains checkout-related fields"""
        response = requests.post(f"{BASE_URL}/api/payments/card/upgrade", json={
            "phone": TEST_CLIENT_PHONE,
            "card_type": "gold"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        assert "success" in data
        assert "payment_id" in data
        assert "reference" in data
        assert "amount" in data
        assert "status" in data
        
        # Checkout mode fields
        if data.get("test_mode"):
            # Test mode: use_checkout should be False
            assert "use_checkout" in data
            assert data.get("use_checkout") == False
            assert "message" in data
            print(f"✅ Test mode response: use_checkout=False, message present")
        else:
            # Production mode: should have checkout_url
            assert "use_checkout" in data
            assert data.get("use_checkout") == True
            assert "checkout_url" in data
            assert data.get("checkout_url").startswith("http")
            print(f"✅ Production mode response: checkout_url={data.get('checkout_url')}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
