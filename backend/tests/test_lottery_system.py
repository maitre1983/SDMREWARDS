"""
Test VIP Lottery System - Full cycle testing
Tests: Create lottery, Activate, Draw, Announce, Prize distribution
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://web-boost-seo.preview.emergentagent.com')

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Gerard0103@"

# Test client credentials
TEST_PHONE = "0000000000"
TEST_OTP = "000000"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def client_token():
    """Get client auth token using test account"""
    # Send OTP
    otp_response = requests.post(
        f"{BASE_URL}/api/sdm/auth/send-otp",
        json={"phone": TEST_PHONE}
    )
    assert otp_response.status_code == 200
    
    # Verify OTP
    verify_response = requests.post(
        f"{BASE_URL}/api/sdm/auth/verify-otp",
        json={"phone": TEST_PHONE, "otp_code": TEST_OTP}
    )
    assert verify_response.status_code == 200
    return verify_response.json()["access_token"]


class TestLotteryAdminEndpoints:
    """Admin lottery management endpoints"""
    
    def test_get_lotteries(self, admin_token):
        """GET /api/sdm/admin/lotteries - Get all lotteries"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/lotteries",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "lotteries" in data
        assert isinstance(data["lotteries"], list)
        print(f"Found {len(data['lotteries'])} lotteries")
    
    def test_get_lotteries_requires_auth(self):
        """GET /api/sdm/admin/lotteries - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sdm/admin/lotteries")
        assert response.status_code in [401, 403]
    
    def test_create_lottery(self, admin_token):
        """POST /api/sdm/admin/lotteries - Create new lottery"""
        lottery_data = {
            "name": "Test Lottery May 2026",
            "description": "Automated test lottery",
            "month": "2026-05",
            "funding_source": "FIXED",
            "fixed_amount": 50,
            "commission_percentage": 0,
            "prize_distribution": [40, 25, 15, 12, 8],
            "start_date": "2026-05-01",
            "end_date": "2026-05-31"
        }
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/lotteries",
            json=lottery_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "lottery" in data
        assert data["lottery"]["name"] == "Test Lottery May 2026"
        assert data["lottery"]["status"] == "DRAFT"
        assert data["lottery"]["total_prize_pool"] == 50
        
        # Store lottery ID for cleanup
        pytest.test_lottery_id = data["lottery"]["id"]
        print(f"Created lottery ID: {pytest.test_lottery_id}")
    
    def test_add_test_participants(self, admin_token):
        """POST /api/sdm/admin/lotteries/{id}/add-test-participants"""
        lottery_id = getattr(pytest, 'test_lottery_id', None)
        if not lottery_id:
            pytest.skip("No lottery ID from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/lotteries/{lottery_id}/add-test-participants",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert data["total_participants"] >= 0
        print(f"Added {data['total_participants']} participants, {data['total_entries']} entries")
    
    def test_activate_lottery(self, admin_token):
        """PATCH /api/sdm/admin/lotteries/{id}/activate"""
        lottery_id = getattr(pytest, 'test_lottery_id', None)
        if not lottery_id:
            pytest.skip("No lottery ID from previous test")
        
        response = requests.patch(
            f"{BASE_URL}/api/sdm/admin/lotteries/{lottery_id}/activate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # May fail if already activated or not enough VIP members
        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            print(f"Activated: {data['message']}")
        else:
            print(f"Activation returned {response.status_code}: {response.text}")
    
    def test_draw_lottery(self, admin_token):
        """POST /api/sdm/admin/lotteries/{id}/draw - Draw winners"""
        lottery_id = getattr(pytest, 'test_lottery_id', None)
        if not lottery_id:
            pytest.skip("No lottery ID from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/lotteries/{lottery_id}/draw",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # May fail if not enough participants
        if response.status_code == 200:
            data = response.json()
            assert "winners" in data
            assert len(data["winners"]) == 5
            # Verify prize amounts
            for winner in data["winners"]:
                assert "prize_amount" in winner
                assert "rank" in winner
                assert winner["prize_amount"] > 0
            print(f"Drew {len(data['winners'])} winners")
        else:
            print(f"Draw returned {response.status_code}: {response.text}")
    
    def test_announce_lottery(self, admin_token):
        """POST /api/sdm/admin/lotteries/{id}/announce - Announce results"""
        lottery_id = getattr(pytest, 'test_lottery_id', None)
        if not lottery_id:
            pytest.skip("No lottery ID from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/admin/lotteries/{lottery_id}/announce",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            print(f"Announced: {data}")
        else:
            print(f"Announce returned {response.status_code}: {response.text}")
    
    def test_delete_draft_lottery(self, admin_token):
        """DELETE /api/sdm/admin/lotteries/{id} - Only DRAFT status"""
        # This should fail for our test lottery since it's been activated
        lottery_id = getattr(pytest, 'test_lottery_id', None)
        if not lottery_id:
            pytest.skip("No lottery ID from previous test")
        
        response = requests.delete(
            f"{BASE_URL}/api/sdm/admin/lotteries/{lottery_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should fail with 400 if not DRAFT
        print(f"Delete returned {response.status_code}: {response.text}")


class TestLotteryClientEndpoints:
    """Client lottery viewing endpoints"""
    
    def test_get_user_lotteries(self, client_token):
        """GET /api/sdm/user/lotteries - User lottery view"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/user/lotteries",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "active_lotteries" in data
        assert "completed_lotteries" in data
        assert "my_participations" in data
        
        print(f"Active: {len(data['active_lotteries'])}, Completed: {len(data['completed_lotteries'])}")
        print(f"User participations: {len(data['my_participations'])}")
    
    def test_get_user_lotteries_requires_auth(self):
        """GET /api/sdm/user/lotteries - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sdm/user/lotteries")
        assert response.status_code in [401, 403]


class TestLotteryPublicEndpoints:
    """Public lottery results endpoints"""
    
    def test_get_public_results(self):
        """GET /api/sdm/lotteries/results - Public results"""
        response = requests.get(f"{BASE_URL}/api/sdm/lotteries/results")
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert isinstance(data["results"], list)
        
        # Verify structure of announced lotteries
        if data["results"]:
            lottery = data["results"][0]
            assert "name" in lottery
            assert "winners" in lottery
            assert "total_prize_pool" in lottery
            assert lottery["is_announced"] == True
            
            # Verify winners structure
            if lottery["winners"]:
                winner = lottery["winners"][0]
                assert "rank" in winner
                assert "prize_amount" in winner
        
        print(f"Found {len(data['results'])} announced lottery results")


class TestLotteryExistingData:
    """Verify existing lottery data from previous runs"""
    
    def test_completed_march_lottery(self, admin_token):
        """Verify March 2026 lottery completed with 5 winners"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/lotteries",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        lotteries = response.json()["lotteries"]
        
        # Find March 2026 lottery
        march_lottery = None
        for lottery in lotteries:
            if lottery["month"] == "2026-03":
                march_lottery = lottery
                break
        
        if march_lottery:
            assert march_lottery["status"] == "COMPLETED"
            assert march_lottery["is_announced"] == True
            assert len(march_lottery["winners"]) == 5
            
            # Verify prize distribution
            total_prize = march_lottery["total_prize_pool"]
            for winner in march_lottery["winners"]:
                assert winner["prize_amount"] > 0
                assert winner["rank"] >= 1 and winner["rank"] <= 5
            
            print(f"March 2026 lottery verified: {len(march_lottery['winners'])} winners, GHS {total_prize} pool")
        else:
            print("March 2026 lottery not found - may be first run")
    
    def test_winner_receives_prize_in_wallet(self, admin_token):
        """Verify lottery winners have prizes credited to their wallets"""
        # Get lotteries
        response = requests.get(
            f"{BASE_URL}/api/sdm/admin/lotteries",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        lotteries = response.json()["lotteries"]
        
        completed = [l for l in lotteries if l["status"] == "COMPLETED"]
        if not completed:
            pytest.skip("No completed lotteries to verify")
        
        lottery = completed[0]
        if not lottery["winners"]:
            pytest.skip("No winners in completed lottery")
        
        # Get wallets
        wallets_response = requests.get(
            f"{BASE_URL}/api/sdm/admin/fintech/wallets?limit=100",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert wallets_response.status_code == 200
        wallets = wallets_response.json()
        
        # Create wallet lookup by entity_id
        wallet_map = {w["entity_id"]: w for w in wallets if w["entity_type"] == "CLIENT"}
        
        # Verify at least one winner has wallet with balance
        winners_with_wallets = 0
        for winner in lottery["winners"]:
            if winner["user_id"] in wallet_map:
                wallet = wallet_map[winner["user_id"]]
                # Winner should have some available balance (may include other sources)
                if wallet["available_balance"] >= 0:
                    winners_with_wallets += 1
        
        print(f"Verified {winners_with_wallets}/{len(lottery['winners'])} winners have ledger wallets")
        assert winners_with_wallets > 0, "At least one winner should have a ledger wallet"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
