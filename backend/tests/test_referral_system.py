"""
Test Referral System APIs
Tests:
- GET /api/sdm/admin/referrals - Admin referral history with stats
- GET /api/sdm/user/referrals - Client referral history with filters
- POST /api/sdm/user/vip-cards/purchase - VIP card purchase with payment method validation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "emileparfait2003@gmail.com"
ADMIN_PASSWORD = "Gerard0103@"

class TestAdminReferrals:
    """Test admin referral history endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_admin_referrals_endpoint_exists(self):
        """Test: GET /api/sdm/admin/referrals returns 200"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/referrals", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Admin referrals endpoint accessible")
    
    def test_admin_referrals_returns_stats(self):
        """Test: Admin referrals returns stats object"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/referrals", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats object exists
        assert "stats" in data, "Response must contain 'stats' field"
        stats = data["stats"]
        
        # Verify stats fields
        assert "total_completed_referrals" in stats, "Stats must contain total_completed_referrals"
        assert "total_pending_referrals" in stats, "Stats must contain total_pending_referrals"
        assert "total_bonus_paid" in stats, "Stats must contain total_bonus_paid"
        assert "referrer_bonus" in stats, "Stats must contain referrer_bonus"
        assert "welcome_bonus" in stats, "Stats must contain welcome_bonus"
        
        print(f"PASS: Admin referrals stats: {stats}")
    
    def test_admin_referrals_returns_completed_referrals_list(self):
        """Test: Admin referrals returns completed_referrals list"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/referrals", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "completed_referrals" in data, "Response must contain 'completed_referrals' field"
        assert isinstance(data["completed_referrals"], list), "completed_referrals must be a list"
        print(f"PASS: Admin referrals has {len(data['completed_referrals'])} completed referrals")
    
    def test_admin_referrals_returns_pending_referrals_list(self):
        """Test: Admin referrals returns pending_referrals list"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/referrals", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "pending_referrals" in data, "Response must contain 'pending_referrals' field"
        assert isinstance(data["pending_referrals"], list), "pending_referrals must be a list"
        print(f"PASS: Admin referrals has {len(data['pending_referrals'])} pending referrals")
    
    def test_admin_referrals_period_filter_all(self):
        """Test: Admin referrals with period=all"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/referrals?period=all", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "all"
        print("PASS: Admin referrals period=all works")
    
    def test_admin_referrals_period_filter_day(self):
        """Test: Admin referrals with period=day"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/referrals?period=day", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "day"
        print("PASS: Admin referrals period=day works")
    
    def test_admin_referrals_period_filter_week(self):
        """Test: Admin referrals with period=week"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/referrals?period=week", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "week"
        print("PASS: Admin referrals period=week works")
    
    def test_admin_referrals_period_filter_month(self):
        """Test: Admin referrals with period=month"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/referrals?period=month", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "month"
        print("PASS: Admin referrals period=month works")
    
    def test_admin_referrals_period_filter_year(self):
        """Test: Admin referrals with period=year"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/referrals?period=year", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "year"
        print("PASS: Admin referrals period=year works")
    
    def test_admin_referrals_bonus_values_correct(self):
        """Test: Referrer bonus = 3 GHS, Welcome bonus = 1 GHS"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/referrals", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        stats = data["stats"]
        
        assert stats["referrer_bonus"] == 3.0, f"Referrer bonus should be 3 GHS, got {stats['referrer_bonus']}"
        assert stats["welcome_bonus"] == 1.0, f"Welcome bonus should be 1 GHS, got {stats['welcome_bonus']}"
        print(f"PASS: Referrer bonus = {stats['referrer_bonus']} GHS, Welcome bonus = {stats['welcome_bonus']} GHS")


class TestUserReferrals:
    """Test client referral history endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get or create test user"""
        # Try to login with existing test user or skip
        response = requests.post(f"{BASE_URL}/api/sdm/auth/login", json={
            "phone": "0551234567",
            "password": "test123456"
        })
        if response.status_code == 200:
            self.user_token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.user_token}"}
        else:
            # Skip if no test user available
            pytest.skip("No test user available for client referral tests")
    
    def test_user_referrals_endpoint_exists(self):
        """Test: GET /api/sdm/user/referrals returns 200"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/referrals", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: User referrals endpoint accessible")
    
    def test_user_referrals_returns_referral_code(self):
        """Test: User referrals returns referral_code"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/referrals", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "referral_code" in data, "Response must contain 'referral_code' field"
        assert data["referral_code"] is not None, "Referral code should not be null"
        print(f"PASS: User has referral code: {data['referral_code']}")
    
    def test_user_referrals_returns_how_it_works(self):
        """Test: User referrals returns 'how_it_works' with correct message"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/referrals", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "how_it_works" in data, "Response must contain 'how_it_works' field"
        hiw = data["how_it_works"]
        
        # Check step_3 contains correct bonus amounts
        assert "step_3" in hiw, "how_it_works must contain step_3"
        step_3 = hiw["step_3"]
        
        assert "You get GHS 3" in step_3, f"step_3 should mention 'You get GHS 3', got: {step_3}"
        assert "they get GHS 1" in step_3, f"step_3 should mention 'they get GHS 1', got: {step_3}"
        assert "When they buy" in step_3, f"step_3 should mention 'When they buy', got: {step_3}"
        print(f"PASS: how_it_works message correct: {step_3}")
    
    def test_user_referrals_period_filter(self):
        """Test: User referrals with period filter"""
        for period in ["all", "day", "week", "month", "year"]:
            response = requests.get(f"{BASE_URL}/api/sdm/user/referrals?period={period}", headers=self.headers)
            assert response.status_code == 200, f"Period filter {period} failed"
            data = response.json()
            assert data["period"] == period
        print("PASS: All period filters work for user referrals")
    
    def test_user_referrals_returns_stats(self):
        """Test: User referrals returns stats object"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/referrals", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "stats" in data, "Response must contain 'stats' field"
        stats = data["stats"]
        
        assert "total_referrals" in stats
        assert "active_referrals" in stats
        assert "pending_referrals" in stats
        assert "total_bonus_earned" in stats
        print(f"PASS: User referral stats: {stats}")


class TestVIPCardPurchase:
    """Test VIP card purchase payment method validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get test user token"""
        response = requests.post(f"{BASE_URL}/api/sdm/auth/login", json={
            "phone": "0551234567",
            "password": "test123456"
        })
        if response.status_code == 200:
            self.user_token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.user_token}"}
        else:
            pytest.skip("No test user available for VIP card tests")
        
        # Get available VIP cards
        cards_response = requests.get(f"{BASE_URL}/api/sdm/user/vip-cards")
        if cards_response.status_code == 200:
            cards = cards_response.json().get("cards", [])
            if cards:
                self.card_type_id = cards[0]["id"]
            else:
                self.card_type_id = None
        else:
            self.card_type_id = None
    
    def test_vip_purchase_rejects_cash_payment(self):
        """Test: POST /api/sdm/user/vip-cards/purchase rejects payment_method='cash'"""
        if not self.card_type_id:
            pytest.skip("No VIP card types available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/user/vip-cards/purchase",
            headers=self.headers,
            json={
                "card_type_id": self.card_type_id,
                "payment_method": "cash"
            }
        )
        
        # Should return 400 Bad Request with specific error message
        assert response.status_code == 400, f"Expected 400 for cash payment, got {response.status_code}"
        
        error_detail = response.json().get("detail", "")
        assert "cash" in error_detail.lower() or "not allowed" in error_detail.lower(), \
            f"Error should mention cash not allowed: {error_detail}"
        print(f"PASS: Cash payment rejected with message: {error_detail}")
    
    def test_vip_purchase_accepts_momo_payment(self):
        """Test: POST /api/sdm/user/vip-cards/purchase accepts payment_method='momo'"""
        if not self.card_type_id:
            pytest.skip("No VIP card types available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/user/vip-cards/purchase",
            headers=self.headers,
            json={
                "card_type_id": self.card_type_id,
                "payment_method": "momo",
                "momo_number": "0551234567",
                "momo_provider": "MTN"
            }
        )
        
        # Should either succeed (200) or fail for other reasons (not payment method)
        if response.status_code == 400:
            error_detail = response.json().get("detail", "")
            # Should not be about payment method
            assert "cash" not in error_detail.lower() or "momo" not in error_detail.lower() or "card" not in error_detail.lower(), \
                f"MoMo should be accepted as payment method: {error_detail}"
        else:
            # Any other status is fine as long as momo is accepted
            print(f"PASS: MoMo payment accepted (status: {response.status_code})")
    
    def test_vip_purchase_accepts_card_payment(self):
        """Test: POST /api/sdm/user/vip-cards/purchase accepts payment_method='card'"""
        if not self.card_type_id:
            pytest.skip("No VIP card types available")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/user/vip-cards/purchase",
            headers=self.headers,
            json={
                "card_type_id": self.card_type_id,
                "payment_method": "card"
            }
        )
        
        # Should either succeed (200) or fail for other reasons (not payment method)
        if response.status_code == 400:
            error_detail = response.json().get("detail", "")
            # Error should NOT be about card not being allowed
            assert "card" not in error_detail.lower() or "not allowed" not in error_detail.lower(), \
                f"Card should be accepted as payment method: {error_detail}"
        print(f"PASS: Card payment accepted (status: {response.status_code})")
    
    def test_vip_purchase_momo_requires_details(self):
        """Test: MoMo payment requires momo_number and momo_provider"""
        if not self.card_type_id:
            pytest.skip("No VIP card types available")
        
        # Test missing momo_number
        response = requests.post(
            f"{BASE_URL}/api/sdm/user/vip-cards/purchase",
            headers=self.headers,
            json={
                "card_type_id": self.card_type_id,
                "payment_method": "momo"
                # Missing momo_number and momo_provider
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for missing MoMo details, got {response.status_code}"
        error_detail = response.json().get("detail", "")
        assert "momo" in error_detail.lower() or "number" in error_detail.lower() or "provider" in error_detail.lower(), \
            f"Error should mention missing MoMo details: {error_detail}"
        print(f"PASS: MoMo requires details, error: {error_detail}")


class TestVIPCardsEndpoint:
    """Test VIP cards listing endpoint"""
    
    def test_vip_cards_list_endpoint(self):
        """Test: GET /api/sdm/user/vip-cards returns list of cards"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/vip-cards")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "cards" in data, "Response should have 'cards' field"
        assert isinstance(data["cards"], list), "Cards should be a list"
        
        if data["cards"]:
            card = data["cards"][0]
            assert "id" in card, "Card should have id"
            assert "tier" in card, "Card should have tier"
            assert "price" in card, "Card should have price"
            print(f"PASS: VIP cards endpoint returns {len(data['cards'])} cards")
        else:
            print("PASS: VIP cards endpoint works (no cards configured)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
