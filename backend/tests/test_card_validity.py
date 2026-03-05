"""
SDM Rewards - Card Validity Tests
=================================
Tests for card purchase with start_date/end_date, validity endpoints,
and card renewal when expired.
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://web-boost-seo.preview.emergentagent.com')

# Test credentials
CLIENT_PHONE = "+233559876543"
CLIENT_PASSWORD = "ClientTest123!"
ADMIN_EMAIL = "emileparfait2003@gmail.com"
ADMIN_PASSWORD = "Gerard0103@"


class TestCardAvailableEndpoints:
    """Tests for public and authenticated card listing endpoints"""
    
    def test_public_card_types_has_duration(self):
        """Public /api/public/card-types returns duration_days and duration_label"""
        response = requests.get(f"{BASE_URL}/api/public/card-types")
        assert response.status_code == 200
        
        data = response.json()
        assert "card_types" in data
        assert len(data["card_types"]) >= 3  # silver, gold, platinum at minimum
        
        # Check all cards have duration fields
        for card in data["card_types"]:
            assert "duration_days" in card, f"Card {card.get('slug')} missing duration_days"
            assert "duration_label" in card, f"Card {card.get('slug')} missing duration_label"
            assert isinstance(card["duration_days"], int)
            assert card["duration_days"] > 0
        
        print(f"✅ Public card-types: {len(data['card_types'])} cards with duration info")
        
    def test_available_cards_has_duration(self):
        """Client /api/clients/cards/available returns duration info"""
        response = requests.get(f"{BASE_URL}/api/clients/cards/available")
        assert response.status_code == 200
        
        data = response.json()
        assert "cards" in data
        
        for card in data["cards"]:
            assert "duration_days" in card, f"Card {card.get('type')} missing duration_days"
            assert "duration_label" in card, f"Card {card.get('type')} missing duration_label"
            assert card["duration_days"] > 0
            
        print(f"✅ Available cards: {len(data['cards'])} cards with duration info")
        
    def test_diamond_custom_card_exists(self):
        """Diamond custom card type should exist with 730 days (2 ans)"""
        response = requests.get(f"{BASE_URL}/api/clients/cards/available")
        assert response.status_code == 200
        
        data = response.json()
        diamond = next((c for c in data["cards"] if c.get("type") == "diamond"), None)
        
        assert diamond is not None, "Diamond custom card not found"
        assert diamond["duration_days"] == 730, f"Diamond duration should be 730, got {diamond['duration_days']}"
        assert diamond["duration_label"] == "2 ans", f"Diamond label should be '2 ans', got {diamond['duration_label']}"
        
        print(f"✅ Diamond card: {diamond['price']} GHS, {diamond['duration_days']} days ({diamond['duration_label']})")


class TestClientCardValidity:
    """Tests for authenticated client card validity endpoints"""
    
    @pytest.fixture
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/client/login", json={
            "phone": CLIENT_PHONE,
            "password": CLIENT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Client login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_my_card_returns_validity_info(self, client_token):
        """GET /api/clients/cards/my-card returns card with validity info"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(f"{BASE_URL}/api/clients/cards/my-card", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "card" in data
        assert "validity" in data
        
        validity = data["validity"]
        assert "is_active" in validity
        assert "is_expired" in validity
        assert "days_remaining" in validity
        assert "start_date" in validity
        assert "end_date" in validity
        assert "duration_days" in validity
        assert "days_used" in validity
        
        # Validate data types
        assert isinstance(validity["is_active"], bool)
        assert isinstance(validity["is_expired"], bool)
        assert isinstance(validity["days_remaining"], int)
        assert validity["days_remaining"] >= 0
        
        print(f"✅ Card validity: {validity['days_remaining']} days remaining, active={validity['is_active']}")
        print(f"   Start: {validity['start_date']}, End: {validity['end_date']}")
        
    def test_card_status_quick_check(self, client_token):
        """GET /api/clients/cards/status returns quick status summary"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(f"{BASE_URL}/api/clients/cards/status", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "has_card" in data
        assert "card_type" in data
        assert "status" in data
        assert "message" in data
        
        # If has card, check for days_remaining
        if data["has_card"]:
            assert "days_remaining" in data
            assert data["status"] in ["active", "expiring_soon", "expired"]
            print(f"✅ Card status: {data['status']}, type={data['card_type']}")
            print(f"   Message: {data['message']}")
        else:
            assert data["status"] == "no_card"
            print("✅ Card status: no_card")
            
    def test_validity_dates_format(self, client_token):
        """Validity dates should be in DD/MM/YYYY format"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(f"{BASE_URL}/api/clients/cards/my-card", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        validity = data.get("validity", {})
        
        if validity.get("start_date"):
            # Check format DD/MM/YYYY
            start = validity["start_date"]
            parts = start.split("/")
            assert len(parts) == 3, f"Invalid date format: {start}"
            assert len(parts[0]) == 2, f"Day should be 2 digits: {start}"
            assert len(parts[1]) == 2, f"Month should be 2 digits: {start}"
            assert len(parts[2]) == 4, f"Year should be 4 digits: {start}"
            
        if validity.get("end_date"):
            end = validity["end_date"]
            parts = end.split("/")
            assert len(parts) == 3, f"Invalid date format: {end}"
            
        print(f"✅ Date format verified: {validity.get('start_date')} - {validity.get('end_date')}")


class TestAdminClientCardValidity:
    """Tests for admin viewing client card validity"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_client_id(self, admin_token):
        """Get a test client ID"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/clients?limit=5", headers=headers)
        if response.status_code != 200:
            pytest.skip("Cannot fetch clients")
        
        clients = response.json().get("clients", [])
        # Find client with card_type
        for client in clients:
            if client.get("card_type"):
                return client["id"]
        pytest.skip("No client with card found")
        
    def test_admin_get_client_has_card_validity(self, admin_token, test_client_id):
        """Admin GET /api/admin/clients/{id} returns card_validity info"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/clients/{test_client_id}", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "client" in data
        assert "card_validity" in data
        
        validity = data["card_validity"]
        assert "status" in validity
        assert "is_active" in validity
        assert "days_remaining" in validity
        assert "duration_days" in validity
        
        print(f"✅ Admin view: Client {test_client_id}")
        print(f"   Card type: {data['client'].get('card_type')}")
        print(f"   Validity status: {validity['status']}, {validity['days_remaining']} days remaining")
        
    def test_admin_client_has_card_dates(self, admin_token, test_client_id):
        """Admin view should show card_purchased_at and card_expires_at"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/clients/{test_client_id}", headers=headers)
        assert response.status_code == 200
        
        client = response.json().get("client", {})
        
        if client.get("card_type"):
            assert "card_purchased_at" in client or "card_expires_at" in client, \
                "Client with card should have card dates"
            print(f"✅ Card dates: purchased={client.get('card_purchased_at')}, expires={client.get('card_expires_at')}")


class TestCardDurationLabel:
    """Tests for duration label formatting"""
    
    def test_duration_label_2_years(self):
        """730 days should display as '2 ans'"""
        response = requests.get(f"{BASE_URL}/api/clients/cards/available")
        data = response.json()
        
        # Find platinum or diamond which should have 730 days
        for card in data["cards"]:
            if card["duration_days"] == 730:
                assert card["duration_label"] == "2 ans", \
                    f"730 days should be '2 ans', got '{card['duration_label']}'"
                print(f"✅ {card['type']}: 730 days = '{card['duration_label']}'")
                return
        
        print("⚠️ No card with 730 days found to verify")
        
    def test_duration_label_1_year(self):
        """365 days should display as '1 an'"""
        response = requests.get(f"{BASE_URL}/api/clients/cards/available")
        data = response.json()
        
        for card in data["cards"]:
            if card["duration_days"] == 365:
                assert card["duration_label"] == "1 an", \
                    f"365 days should be '1 an', got '{card['duration_label']}'"
                print(f"✅ {card['type']}: 365 days = '{card['duration_label']}'")
                return
        
        print("⚠️ No card with 365 days found to verify")


class TestDaysRemainingCalculation:
    """Tests for accurate days remaining calculation"""
    
    @pytest.fixture
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/client/login", json={
            "phone": CLIENT_PHONE,
            "password": CLIENT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Client login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_days_remaining_accuracy(self, client_token):
        """Days remaining should match actual calculation"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(f"{BASE_URL}/api/clients/cards/my-card", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        validity = data.get("validity", {})
        
        if validity.get("expires_at"):
            # Parse expiry date
            expires_at = validity["expires_at"]
            if 'Z' in expires_at:
                expires_at = expires_at.replace('Z', '+00:00')
            expiry_date = datetime.fromisoformat(expires_at)
            now = datetime.now(expiry_date.tzinfo)
            
            expected_days = (expiry_date - now).days
            actual_days = validity["days_remaining"]
            
            # Allow 1 day tolerance for timing differences
            assert abs(expected_days - actual_days) <= 1, \
                f"Days remaining mismatch: expected ~{expected_days}, got {actual_days}"
            
            print(f"✅ Days remaining accurate: {actual_days} days (expected ~{expected_days})")
            
    def test_days_used_plus_remaining_equals_total(self, client_token):
        """days_used + days_remaining should approximately equal duration_days"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(f"{BASE_URL}/api/clients/cards/my-card", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        validity = data.get("validity", {})
        
        if validity.get("duration_days"):
            total = validity["duration_days"]
            used = validity.get("days_used", 0)
            remaining = validity.get("days_remaining", 0)
            
            calculated_total = used + remaining
            
            # Allow 1 day tolerance
            assert abs(total - calculated_total) <= 1, \
                f"Math check failed: {used} used + {remaining} remaining = {calculated_total}, expected {total}"
            
            print(f"✅ Math verified: {used} used + {remaining} remaining ≈ {total} total")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
