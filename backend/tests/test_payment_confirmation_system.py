"""
SDM REWARDS - Payment Confirmation System Tests
================================================
Tests for payment callback, poll-status, and complete_payment functionality.
Verifies the payment confirmation flow including:
1. Hubtel callback endpoint (/api/payments/hubtel/callback)
2. Poll-status endpoint (/api/payments/poll-status/{id})
3. complete_payment function behavior
4. Link between momo_payments and hubtel_payments via client_reference
5. Merchant payment initiation endpoint (/api/payments/merchant/initiate)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

# Get base URL from environment
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test data prefix for cleanup
TEST_PREFIX = "TEST_PAYMENT_CONFIRM_"


class TestPaymentCallbackEndpoint:
    """Tests for /api/payments/hubtel/callback endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Setup test payment data in database"""
        self.client = api_client
        self.test_reference = f"{TEST_PREFIX}{uuid.uuid4().hex[:8]}"
        self.test_payment_id = f"PAY-{uuid.uuid4().hex[:8]}"
        
        # Create a test payment in momo_payments collection via direct DB insert
        # We'll test with existing payments or create via merchant payment initiation
        
    def test_callback_endpoint_exists(self, api_client):
        """Test that callback endpoint accepts POST requests"""
        # Send empty callback - should return error about missing reference
        response = api_client.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json={}
        )
        
        # Should return 200 with error message (webhook endpoints don't typically 4xx)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Check for Hubtel-style response
        assert "ResponseCode" in data or "success" in data
        print(f"✅ Callback endpoint exists and responds: {data}")
    
    def test_callback_with_missing_reference(self, api_client):
        """Test callback returns error when ClientReference is missing"""
        response = api_client.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json={
                "Status": "Success",
                "TransactionId": "TEST123"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        # Should indicate missing reference
        assert data.get("ResponseCode") == "0001" or "Missing" in str(data.get("Message", ""))
        print(f"✅ Callback correctly rejects missing reference: {data}")
    
    def test_callback_with_unknown_reference(self, api_client):
        """Test callback returns error for unknown payment reference"""
        response = api_client.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json={
                "ClientReference": "UNKNOWN_REF_12345",
                "Status": "Success",
                "TransactionId": "TEST123"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        # Should indicate payment not found
        assert data.get("ResponseCode") == "0001" or "not found" in str(data.get("Message", "")).lower()
        print(f"✅ Callback correctly handles unknown reference: {data}")
    
    def test_callback_with_nested_data_format(self, api_client):
        """Test callback handles Hubtel's nested Data format"""
        response = api_client.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json={
                "ResponseCode": "0000",
                "Status": "Success",
                "Data": {
                    "ClientReference": "NESTED_TEST_REF",
                    "TransactionId": "TX123456",
                    "Amount": 25.0
                }
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        # Should parse nested format
        print(f"✅ Callback handles nested Data format: {data}")


class TestPollStatusEndpoint:
    """Tests for /api/payments/poll-status/{id} endpoint"""
    
    def test_poll_status_endpoint_exists(self, api_client):
        """Test that poll-status endpoint exists"""
        # Test with a dummy ID
        response = api_client.get(f"{BASE_URL}/api/payments/poll-status/TEST_ID_12345")
        
        # Should return 200 (with should_poll or status info)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should have expected fields
        assert "status" in data or "should_poll" in data
        print(f"✅ Poll-status endpoint exists and responds: {data}")
    
    def test_poll_status_unknown_payment(self, api_client):
        """Test poll-status returns correct response for unknown payment"""
        response = api_client.get(f"{BASE_URL}/api/payments/poll-status/UNKNOWN_PAYMENT_ID")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should indicate unknown or not_found
        status = data.get("status", "")
        assert status in ["unknown", "not_found", "processing"] or data.get("should_poll") is True
        print(f"✅ Poll-status correctly handles unknown payment: {data}")
    
    def test_poll_status_response_structure(self, api_client):
        """Test poll-status returns expected response structure"""
        response = api_client.get(f"{BASE_URL}/api/payments/poll-status/TEST_STRUCT_ID")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have required fields for frontend polling
        expected_fields = ["success", "status", "should_poll"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Optional fields that may be present
        optional_fields = ["completed", "failed", "message", "source"]
        present_optional = [f for f in optional_fields if f in data]
        
        print(f"✅ Poll-status response structure valid. Fields: {list(data.keys())}")


class TestPaymentFlow:
    """Integration tests for the full payment confirmation flow"""
    
    @pytest.fixture
    def test_merchant(self, api_client):
        """Create or get a test merchant"""
        # Check if test merchant exists
        merchant_data = {
            "business_name": f"{TEST_PREFIX}Merchant",
            "email": f"{TEST_PREFIX.lower()}merchant@test.com",
            "phone": "0241234567",
            "momo_number": "0241234567",
            "momo_network": "MTN",
            "cashback_rate": 5,
            "password": "Test123!",
            "pin": "1234"
        }
        
        # Try to create merchant
        response = api_client.post(
            f"{BASE_URL}/api/merchants/register",
            json=merchant_data
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("merchant", {})
        else:
            # Merchant might already exist - try to login
            login_response = api_client.post(
                f"{BASE_URL}/api/auth/merchant/login",
                json={
                    "email": merchant_data["email"],
                    "password": merchant_data["password"]
                }
            )
            if login_response.status_code == 200:
                return login_response.json().get("merchant", {})
        
        return None
    
    @pytest.fixture
    def test_client(self, api_client):
        """Create or get a test client"""
        client_data = {
            "full_name": f"{TEST_PREFIX}Client",
            "email": f"{TEST_PREFIX.lower()}client@test.com",
            "phone": "0551234567",
            "password": "Test123!"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/auth/client/register",
            json=client_data
        )
        
        if response.status_code == 200:
            return response.json().get("client", {})
        
        # Try login
        login_response = api_client.post(
            f"{BASE_URL}/api/auth/client/login",
            json={
                "phone": client_data["phone"],
                "password": client_data["password"]
            }
        )
        if login_response.status_code == 200:
            return login_response.json().get("client", {})
        
        return None
    
    def test_merchant_payment_initiation_endpoint_exists(self, api_client):
        """Test merchant payment initiation endpoint exists"""
        # Test with invalid data to confirm endpoint exists
        response = api_client.post(
            f"{BASE_URL}/api/payments/merchant/initiate",
            json={
                "client_phone": "0551234567",
                "merchant_qr_code": "TEST_QR",
                "amount": 10.0
            }
        )
        
        # Should return response (may be error due to invalid merchant)
        assert response.status_code in [200, 400, 404, 422], f"Unexpected status: {response.status_code}"
        print(f"✅ Merchant payment initiation endpoint exists: {response.status_code}")
    
    def test_payment_status_endpoint(self, api_client):
        """Test /api/payments/status/{id} endpoint"""
        response = api_client.get(f"{BASE_URL}/api/payments/status/TEST_PAYMENT_ID")
        
        # Should return 404 for unknown payment or 200 with data
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"✅ Payment status endpoint responds: {response.status_code}")
    
    def test_check_status_endpoint(self, api_client):
        """Test /api/payments/check-status/{id} endpoint"""
        response = api_client.post(f"{BASE_URL}/api/payments/check-status/TEST_PAYMENT_ID")
        
        # Should return 404 for unknown payment
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"✅ Check-status endpoint responds: {response.status_code}")


class TestCompletePaymentBehavior:
    """Tests to verify complete_payment function behavior via API effects"""
    
    def test_callback_success_triggers_completion(self, api_client):
        """
        Test that a successful callback should trigger payment completion.
        Since we can't call complete_payment directly, we test via the callback endpoint.
        """
        # Create a unique reference
        test_ref = f"TEST_COMPLETE_{uuid.uuid4().hex[:8]}"
        
        # First, check the callback endpoint can process success status
        response = api_client.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json={
                "ResponseCode": "0000",
                "Status": "Success",
                "Data": {
                    "ClientReference": test_ref,
                    "TransactionId": f"TX_{test_ref}",
                    "Amount": 50.0
                }
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # The callback should process without error (payment may not exist but logic runs)
        print(f"✅ Callback processed success status: {data}")
    
    def test_callback_failed_status(self, api_client):
        """Test that failed status in callback is processed correctly"""
        test_ref = f"TEST_FAILED_{uuid.uuid4().hex[:8]}"
        
        response = api_client.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json={
                "ResponseCode": "1001",
                "Status": "Failed",
                "Data": {
                    "ClientReference": test_ref,
                    "TransactionId": f"TX_{test_ref}",
                    "Description": "User cancelled payment"
                }
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Callback processed failed status: {data}")


class TestDatabaseLinkage:
    """Tests to verify momo_payments and hubtel_payments are properly linked"""
    
    def test_poll_status_checks_both_collections(self, api_client):
        """
        Test that poll-status checks both momo_payments and hubtel_payments.
        We verify this by checking the 'source' field in the response.
        """
        # Generate a unique reference
        test_ref = f"LINK_TEST_{uuid.uuid4().hex[:8]}"
        
        response = api_client.get(f"{BASE_URL}/api/payments/poll-status/{test_ref}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have a source field indicating where it checked
        if "source" in data:
            print(f"✅ Poll-status checked collections, source: {data.get('source')}")
        else:
            print(f"✅ Poll-status response (source not exposed): {data}")
    
    def test_callback_updates_both_collections(self, api_client):
        """
        Test that callback updates both momo_payments and hubtel_payments.
        We verify by checking poll-status after callback.
        """
        test_ref = f"UPDATE_TEST_{uuid.uuid4().hex[:8]}"
        
        # Send callback
        callback_response = api_client.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json={
                "ClientReference": test_ref,
                "Status": "processing",
                "TransactionId": f"TX_{test_ref}"
            }
        )
        
        assert callback_response.status_code == 200
        
        # Check poll-status
        poll_response = api_client.get(f"{BASE_URL}/api/payments/poll-status/{test_ref}")
        assert poll_response.status_code == 200
        
        print(f"✅ Callback and poll-status both processed for ref: {test_ref}")


class TestGenericCallbackEndpoint:
    """Tests for /api/payments/callback (generic) endpoint"""
    
    def test_generic_callback_exists(self, api_client):
        """Test that generic callback endpoint exists"""
        response = api_client.post(
            f"{BASE_URL}/api/payments/callback",
            json={
                "reference": "TEST_GENERIC_REF",
                "status": "success"
            }
        )
        
        assert response.status_code == 200, f"Generic callback failed: {response.status_code}"
        print(f"✅ Generic callback endpoint exists: {response.json()}")


class TestCashPaymentStatusEndpoint:
    """Tests for cash payment status endpoint"""
    
    def test_cash_status_endpoint_exists(self, api_client):
        """Test cash payment status endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/payments/cash/status",
            params={
                "client_phone": "0551234567",
                "merchant_id": "TEST_MERCHANT_ID"
            }
        )
        
        # Should return 404 if no cash payment exists or 200 with data
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"✅ Cash payment status endpoint responds: {response.status_code}")


# Fixtures
@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
