"""
SDM REWARDS - Test SDM Commissions, Service Fees Analytics, and Card Types with Duration
========================================================================================
Tests for:
1. Advanced stats endpoint includes SDM commissions (total and by period)
2. Advanced stats endpoint includes service fees by service type
3. Service fees includes top services ranking and monthly chart
4. Card types endpoint returns all cards with duration_days field
5. Public card-types endpoint returns duration_label for landing page
6. Create new card type with custom duration
7. Update default card durations via card-prices endpoint
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Test credentials
ADMIN_EMAIL = "emileparfait2003@gmail.com"
ADMIN_PASSWORD = "Gerard0103@"
ADMIN_PIN = "0000"


class TestAdminAuthentication:
    """Admin authentication for testing"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        return data["access_token"]


class TestAdvancedStatsSDMCommissions(TestAdminAuthentication):
    """Test SDM commissions in advanced stats endpoint"""
    
    def test_advanced_stats_returns_total_sdm_commissions(self, admin_token):
        """Test that advanced-stats includes total_sdm_commissions"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/advanced-stats", headers=headers)
        
        assert response.status_code == 200, f"Failed to get advanced stats: {response.text}"
        data = response.json()
        
        # Verify financial_stats structure
        assert "financial_stats" in data, "Missing financial_stats in response"
        financial_stats = data["financial_stats"]
        
        # Check SDM commissions
        assert "total_sdm_commissions" in financial_stats, "Missing total_sdm_commissions"
        assert isinstance(financial_stats["total_sdm_commissions"], (int, float)), "total_sdm_commissions should be a number"
        
        print(f"Total SDM Commissions: GHS {financial_stats['total_sdm_commissions']}")
    
    def test_advanced_stats_returns_commission_by_period(self, admin_token):
        """Test that advanced-stats includes sdm_commission_by_period"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/advanced-stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        financial_stats = data["financial_stats"]
        
        # Check period breakdown
        assert "sdm_commission_by_period" in financial_stats, "Missing sdm_commission_by_period"
        by_period = financial_stats["sdm_commission_by_period"]
        
        # Verify all period keys exist
        assert "day" in by_period, "Missing 'day' period"
        assert "week" in by_period, "Missing 'week' period"
        assert "month" in by_period, "Missing 'month' period"
        assert "year" in by_period, "Missing 'year' period"
        
        # All values should be numbers
        for period, value in by_period.items():
            assert isinstance(value, (int, float)), f"{period} commission should be a number"
        
        print(f"Commission by period: day={by_period['day']}, week={by_period['week']}, month={by_period['month']}, year={by_period['year']}")


class TestAdvancedStatsServiceFees(TestAdminAuthentication):
    """Test service fees analytics in advanced stats endpoint"""
    
    def test_advanced_stats_returns_service_fees_structure(self, admin_token):
        """Test that advanced-stats includes service_fees object"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/advanced-stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify service_fees structure
        assert "service_fees" in data, "Missing service_fees in response"
        service_fees = data["service_fees"]
        
        # Check main structure
        assert "by_service" in service_fees, "Missing by_service"
        assert "top_services" in service_fees, "Missing top_services"
        assert "monthly_chart" in service_fees, "Missing monthly_chart"
        assert "total_fees" in service_fees, "Missing total_fees"
        
        print(f"Total service fees: GHS {service_fees['total_fees']}")
    
    def test_service_fees_by_service_type(self, admin_token):
        """Test service fees includes all 4 service types"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/advanced-stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        by_service = data["service_fees"]["by_service"]
        
        # Check all 4 service types exist
        expected_services = ["airtime", "data_bundle", "ecg_payment", "merchant_payment"]
        for service in expected_services:
            assert service in by_service, f"Missing service type: {service}"
            
            # Each service should have label, count, volume, fees
            svc = by_service[service]
            assert "label" in svc, f"{service} missing label"
            assert "count" in svc, f"{service} missing count"
            assert "volume" in svc, f"{service} missing volume"
            assert "fees" in svc, f"{service} missing fees"
            
            print(f"{service}: count={svc['count']}, volume={svc['volume']}, fees={svc['fees']}")
    
    def test_service_fees_top_services_ranking(self, admin_token):
        """Test top services ranking is included"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/advanced-stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        top_services = data["service_fees"]["top_services"]
        
        # Should be a list
        assert isinstance(top_services, list), "top_services should be a list"
        
        # Each item should have service, count, volume, fees
        for service in top_services:
            assert "service" in service, "Missing service key"
            assert "count" in service, "Missing count key"
            assert "volume" in service, "Missing volume key"
            assert "fees" in service, "Missing fees key"
        
        print(f"Top services count: {len(top_services)}")
    
    def test_service_fees_monthly_chart(self, admin_token):
        """Test monthly chart data for last 6 months"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/advanced-stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        monthly_chart = data["service_fees"]["monthly_chart"]
        
        # Should be a list
        assert isinstance(monthly_chart, list), "monthly_chart should be a list"
        
        # Should have 6 data points
        assert len(monthly_chart) == 6, f"Expected 6 months, got {len(monthly_chart)}"
        
        # Each item should have month and fees
        for month_data in monthly_chart:
            assert "month" in month_data, "Missing month key"
            assert "fees" in month_data, "Missing fees key"
        
        print(f"Monthly chart: {monthly_chart}")


class TestCardTypesWithDuration(TestAdminAuthentication):
    """Test card types endpoints with duration_days field"""
    
    def test_card_types_endpoint_returns_duration_days(self, admin_token):
        """Test /admin/settings/card-types returns duration_days for all cards"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings/card-types", headers=headers)
        
        assert response.status_code == 200, f"Failed to get card types: {response.text}"
        data = response.json()
        
        assert "card_types" in data, "Missing card_types in response"
        card_types = data["card_types"]
        
        # Verify all cards have duration_days
        for card in card_types:
            assert "duration_days" in card, f"Card {card.get('name')} missing duration_days"
            assert isinstance(card["duration_days"], int), "duration_days should be integer"
            assert card["duration_days"] > 0, "duration_days should be positive"
            print(f"Card: {card['name']}, Duration: {card['duration_days']} days, Price: {card.get('price')}")
    
    def test_default_cards_have_duration(self, admin_token):
        """Test default cards (silver, gold, platinum) have duration_days"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings/card-types", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        card_types = data["card_types"]
        
        default_slugs = ["silver", "gold", "platinum"]
        for slug in default_slugs:
            card = next((c for c in card_types if c["slug"] == slug), None)
            assert card is not None, f"Missing default card: {slug}"
            assert "duration_days" in card, f"{slug} card missing duration_days"
            assert card["is_default"] == True, f"{slug} should be marked as default"
        
        print("All default cards have duration_days field")


class TestPublicCardTypesEndpoint(TestAdminAuthentication):
    """Test public card-types endpoint for landing page"""
    
    def test_public_card_types_returns_duration_label(self):
        """Test /api/public/card-types returns duration_label"""
        # Public endpoint - no auth required
        response = requests.get(f"{BASE_URL}/api/public/card-types")
        
        assert response.status_code == 200, f"Failed to get public card types: {response.text}"
        data = response.json()
        
        assert "card_types" in data, "Missing card_types in response"
        card_types = data["card_types"]
        
        # All cards should have duration_label for display
        for card in card_types:
            assert "duration_days" in card, f"Card {card.get('name')} missing duration_days"
            assert "duration_label" in card, f"Card {card.get('name')} missing duration_label"
            
            # duration_label should be a human-readable string
            label = card["duration_label"]
            assert isinstance(label, str), "duration_label should be string"
            assert len(label) > 0, "duration_label should not be empty"
            
            print(f"Card: {card['name']}, Duration: {card['duration_days']} days, Label: {label}")
    
    def test_duration_label_format(self):
        """Test duration_label formats correctly"""
        response = requests.get(f"{BASE_URL}/api/public/card-types")
        assert response.status_code == 200
        data = response.json()
        card_types = data["card_types"]
        
        for card in card_types:
            days = card["duration_days"]
            label = card["duration_label"]
            
            # Verify label format based on duration
            if days >= 730:
                assert "ans" in label.lower() or "year" in label.lower(), f"730+ days should show years: {label}"
            elif days >= 365:
                assert "an" in label.lower() or "year" in label.lower(), f"365 days should show 1 year: {label}"
            elif days >= 30:
                assert "mois" in label.lower() or "month" in label.lower(), f"30+ days should show months: {label}"
            else:
                assert "jour" in label.lower() or "day" in label.lower(), f"<30 days should show days: {label}"


class TestCreateCustomCardType(TestAdminAuthentication):
    """Test creating new custom card types with duration"""
    
    def test_create_card_type_with_custom_duration(self, admin_token):
        """Test creating a new card type with custom duration"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Generate unique slug for test
        test_slug = f"test_card_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "name": "Test Premium Card",
            "slug": test_slug,
            "price": 200.0,
            "duration_days": 548,  # ~18 months custom duration
            "benefits": "Test benefits: 15% cashback, VIP support",
            "color": "#8b5cf6",
            "icon": "credit-card",
            "is_active": True,
            "sort_order": 10
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/settings/card-types",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Failed to create card type: {response.text}"
        data = response.json()
        
        assert data["success"] == True, "Creation should succeed"
        assert "card_type" in data, "Should return created card type"
        
        created_card = data["card_type"]
        assert created_card["duration_days"] == 548, "duration_days should be 548"
        assert created_card["name"] == "Test Premium Card"
        assert created_card["price"] == 200.0
        
        print(f"Created card: {created_card['name']} with {created_card['duration_days']} days duration")
        
        # Cleanup - delete the test card
        card_id = created_card["id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/settings/card-types/{card_id}",
            headers=headers
        )
        assert delete_response.status_code == 200, "Cleanup failed"
        print("Test card cleaned up successfully")
    
    def test_cannot_create_card_with_reserved_slug(self, admin_token):
        """Test that reserved slugs (silver, gold, platinum) cannot be used"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        payload = {
            "name": "Fake Gold",
            "slug": "gold",
            "price": 100.0,
            "duration_days": 365,
            "benefits": "Test",
            "is_active": True,
            "sort_order": 0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/settings/card-types",
            headers=headers,
            json=payload
        )
        
        # Should fail with 400
        assert response.status_code == 400, f"Should reject reserved slug: {response.text}"
        print("Correctly rejected reserved slug 'gold'")


class TestUpdateCardPricesDuration(TestAdminAuthentication):
    """Test updating default card durations via card-prices endpoint"""
    
    def test_update_silver_duration(self, admin_token):
        """Test updating silver card duration"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First, get current config
        response = requests.get(f"{BASE_URL}/api/admin/settings/card-types", headers=headers)
        assert response.status_code == 200
        original_cards = response.json()["card_types"]
        original_silver = next(c for c in original_cards if c["slug"] == "silver")
        original_duration = original_silver.get("duration_days", 365)
        
        # Update silver duration
        new_duration = 400  # Different from default
        update_response = requests.put(
            f"{BASE_URL}/api/admin/settings/card-prices",
            headers=headers,
            json={"silver_duration": new_duration}
        )
        
        assert update_response.status_code == 200, f"Failed to update: {update_response.text}"
        
        # Verify change
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings/card-types", headers=headers)
        assert verify_response.status_code == 200
        updated_cards = verify_response.json()["card_types"]
        updated_silver = next(c for c in updated_cards if c["slug"] == "silver")
        
        assert updated_silver["duration_days"] == new_duration, f"Duration not updated: {updated_silver['duration_days']}"
        print(f"Silver card duration updated from {original_duration} to {new_duration} days")
        
        # Restore original
        restore_response = requests.put(
            f"{BASE_URL}/api/admin/settings/card-prices",
            headers=headers,
            json={"silver_duration": original_duration}
        )
        assert restore_response.status_code == 200, "Failed to restore original duration"
        print("Original duration restored")


class TestAdvancedStatsAuthProtection:
    """Test authentication protection for advanced stats"""
    
    def test_advanced_stats_requires_auth(self):
        """Test that advanced-stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/advanced-stats")
        
        # Should return 401/403/422 without auth
        assert response.status_code in [401, 403, 422], f"Should require auth: {response.status_code}"
        print("Advanced stats correctly requires authentication")
    
    def test_card_types_requires_auth(self):
        """Test that card-types admin endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/card-types")
        
        assert response.status_code in [401, 403, 422], f"Should require auth: {response.status_code}"
        print("Card types admin endpoint correctly requires authentication")


class TestCompleteFinancialStatsStructure(TestAdminAuthentication):
    """Test complete structure of financial_stats in advanced-stats"""
    
    def test_complete_financial_stats(self, admin_token):
        """Verify complete structure of financial_stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/advanced-stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        financial_stats = data["financial_stats"]
        
        # All expected fields
        expected_fields = [
            "total_gmv",
            "total_cashback_distributed",
            "total_card_revenue",
            "total_referral_bonuses",
            "total_sdm_commissions",
            "sdm_commission_by_period"
        ]
        
        for field in expected_fields:
            assert field in financial_stats, f"Missing {field} in financial_stats"
        
        print("Financial stats structure is complete:")
        for field in expected_fields:
            print(f"  {field}: {financial_stats[field]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
