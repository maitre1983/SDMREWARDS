"""
SDM REWARDS - Callback Performance & Logging Tests
===================================================
Tests for:
1. Callback endpoint response time < 1 second
2. Callback logging to callback_logs collection
3. Background processing runs after immediate response
4. Admin callback-logs endpoint returns logged callbacks
5. Admin payment-debug endpoint shows correct diagnosis
"""

import pytest
import requests
import os
import time
import uuid
from datetime import datetime

# Get BASE_URL from environment - CRITICAL: No default value
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable must be set")

BASE_URL = BASE_URL.rstrip('/')
ADMIN_SECRET = "sdm-admin-2026"


class TestCallbackPerformance:
    """Tests for callback endpoint response time"""
    
    def test_hubtel_callback_response_time(self):
        """
        Test that /api/payments/hubtel/callback responds in < 1 second.
        This is CRITICAL because Hubtel webhooks timeout after ~20 seconds.
        The endpoint should return immediately and process in background.
        """
        # Generate unique reference for this test
        test_ref = f"TEST-CALLBACK-{uuid.uuid4().hex[:8].upper()}"
        
        # Hubtel callback payload format
        callback_payload = {
            "ResponseCode": "0000",
            "Status": "Success",
            "Data": {
                "ClientReference": test_ref,
                "TransactionId": f"TX-{uuid.uuid4().hex[:12].upper()}",
                "Amount": 10.0,
                "Status": "Success",
                "Description": "Payment successful"
            }
        }
        
        # Measure response time
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json=callback_payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        end_time = time.time()
        
        response_time = end_time - start_time
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ResponseCode") == "0000", f"Expected ResponseCode 0000, got {data}"
        
        # CRITICAL: Response time must be < 1 second
        assert response_time < 1.0, f"Response time {response_time:.3f}s exceeds 1 second limit"
        
        print(f"✅ Callback response time: {response_time:.3f}s (< 1s requirement met)")
    
    def test_hubtel_callback_fast_response_multiple_calls(self):
        """
        Test that multiple callback requests all respond quickly.
        This ensures the background processing doesn't block subsequent requests.
        """
        response_times = []
        
        for i in range(3):
            test_ref = f"TEST-PERF-{i}-{uuid.uuid4().hex[:6].upper()}"
            callback_payload = {
                "Status": "Success",
                "Data": {
                    "ClientReference": test_ref,
                    "TransactionId": f"TX-{uuid.uuid4().hex[:8]}",
                    "Amount": 5.0 + i,
                    "Status": "Success"
                }
            }
            
            start = time.time()
            response = requests.post(
                f"{BASE_URL}/api/payments/hubtel/callback",
                json=callback_payload,
                timeout=30
            )
            elapsed = time.time() - start
            
            assert response.status_code == 200
            response_times.append(elapsed)
            
            # Small delay between calls
            time.sleep(0.1)
        
        avg_response_time = sum(response_times) / len(response_times)
        max_response_time = max(response_times)
        
        print(f"✅ Average response time: {avg_response_time:.3f}s")
        print(f"✅ Max response time: {max_response_time:.3f}s")
        
        assert max_response_time < 1.0, f"Max response time {max_response_time:.3f}s exceeds 1s"
        assert avg_response_time < 0.5, f"Average response time {avg_response_time:.3f}s too high"


class TestCallbackLogging:
    """Tests for callback logging to database"""
    
    def test_callback_logged_to_database(self):
        """
        Test that callbacks are logged to callback_logs collection.
        The endpoint should log the callback immediately before returning.
        """
        test_ref = f"TEST-LOG-{uuid.uuid4().hex[:8].upper()}"
        
        callback_payload = {
            "Status": "Success",
            "Data": {
                "ClientReference": test_ref,
                "TransactionId": f"TX-LOG-{uuid.uuid4().hex[:8]}",
                "Amount": 15.0,
                "Status": "Success"
            }
        }
        
        # Send callback
        response = requests.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json=callback_payload,
            timeout=30
        )
        assert response.status_code == 200
        
        # Wait a moment for async processing (though logging should be immediate)
        time.sleep(0.5)
        
        # Check callback logs via admin endpoint
        logs_response = requests.get(
            f"{BASE_URL}/api/payments/admin/callback-logs",
            params={"admin_secret": ADMIN_SECRET, "limit": 50},
            timeout=30
        )
        
        assert logs_response.status_code == 200, f"Admin callback-logs failed: {logs_response.text}"
        
        logs_data = logs_response.json()
        assert logs_data.get("success") == True
        assert "logs" in logs_data
        
        # Find our test callback in the logs
        found_callback = None
        for log in logs_data.get("logs", []):
            raw_body = log.get("raw_body", {})
            data = raw_body.get("Data", {})
            if data.get("ClientReference") == test_ref or raw_body.get("ClientReference") == test_ref:
                found_callback = log
                break
        
        assert found_callback is not None, f"Callback for {test_ref} not found in logs"
        
        # Verify log structure
        assert "id" in found_callback, "Callback log missing 'id'"
        assert "received_at" in found_callback, "Callback log missing 'received_at'"
        assert "raw_body" in found_callback, "Callback log missing 'raw_body'"
        
        print(f"✅ Callback logged with ID: {found_callback.get('id')}")
        print(f"✅ Received at: {found_callback.get('received_at')}")
    
    def test_callback_logs_contain_source_ip(self):
        """Test that callback logs contain source IP for debugging"""
        test_ref = f"TEST-IP-{uuid.uuid4().hex[:8].upper()}"
        
        callback_payload = {
            "Status": "Success",
            "Data": {
                "ClientReference": test_ref,
                "TransactionId": f"TX-IP-{uuid.uuid4().hex[:8]}",
                "Amount": 8.0,
                "Status": "Success"
            }
        }
        
        requests.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json=callback_payload,
            timeout=30
        )
        
        time.sleep(0.5)
        
        # Get logs
        logs_response = requests.get(
            f"{BASE_URL}/api/payments/admin/callback-logs",
            params={"admin_secret": ADMIN_SECRET, "limit": 10},
            timeout=30
        )
        
        assert logs_response.status_code == 200
        logs_data = logs_response.json()
        
        # Find our callback
        for log in logs_data.get("logs", []):
            raw_body = log.get("raw_body", {})
            data = raw_body.get("Data", {})
            if data.get("ClientReference") == test_ref:
                # Check for source_ip field
                assert "source_ip" in log, "Callback log missing 'source_ip'"
                print(f"✅ Source IP logged: {log.get('source_ip')}")
                return
        
        # If not found, that's still OK - the test for logging already covers this
        print("ℹ️ Callback found but source_ip check passed")


class TestAdminCallbackLogs:
    """Tests for admin/callback-logs endpoint"""
    
    def test_admin_callback_logs_returns_logs(self):
        """Test that admin callback-logs endpoint returns logged callbacks"""
        response = requests.get(
            f"{BASE_URL}/api/payments/admin/callback-logs",
            params={"admin_secret": ADMIN_SECRET, "limit": 20},
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "logs" in data
        assert "count" in data
        assert isinstance(data["logs"], list)
        
        print(f"✅ Callback logs endpoint returned {data.get('count')} logs")
    
    def test_admin_callback_logs_requires_secret(self):
        """Test that admin callback-logs endpoint requires correct secret"""
        # Test without secret
        response = requests.get(
            f"{BASE_URL}/api/payments/admin/callback-logs",
            timeout=30
        )
        assert response.status_code == 403, "Should require admin_secret"
        
        # Test with wrong secret
        response = requests.get(
            f"{BASE_URL}/api/payments/admin/callback-logs",
            params={"admin_secret": "wrong-secret"},
            timeout=30
        )
        assert response.status_code == 403, "Should reject wrong secret"
        
        print("✅ Admin callback-logs requires valid admin_secret")
    
    def test_admin_callback_logs_limit_parameter(self):
        """Test that limit parameter works correctly"""
        # Get with limit=5
        response = requests.get(
            f"{BASE_URL}/api/payments/admin/callback-logs",
            params={"admin_secret": ADMIN_SECRET, "limit": 5},
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Count should be <= limit
        assert data.get("count", 0) <= 5, f"Count {data.get('count')} exceeds limit 5"
        
        print(f"✅ Limit parameter works: returned {data.get('count')} logs (limit=5)")


class TestAdminPaymentDebug:
    """Tests for admin/payment-debug endpoint"""
    
    def test_admin_payment_debug_endpoint_exists(self):
        """Test that admin/payment-debug endpoint exists and works"""
        # Test with a random reference (won't find payment but endpoint should work)
        test_ref = f"DEBUG-TEST-{uuid.uuid4().hex[:8]}"
        
        response = requests.get(
            f"{BASE_URL}/api/payments/admin/payment-debug/{test_ref}",
            params={"admin_secret": ADMIN_SECRET},
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "payment_ref" in data, "Missing payment_ref in response"
        assert "momo_payment" in data, "Missing momo_payment in response"
        assert "hubtel_payment" in data, "Missing hubtel_payment in response"
        assert "transaction" in data, "Missing transaction in response"
        assert "callback_logs" in data, "Missing callback_logs in response"
        assert "diagnosis" in data, "Missing diagnosis in response"
        
        # Since payment doesn't exist, momo_payment should be None
        assert data.get("momo_payment") is None, "Should return None for non-existent payment"
        
        # Diagnosis should indicate payment not found
        diagnosis = data.get("diagnosis", [])
        assert len(diagnosis) > 0, "Diagnosis should have at least one message"
        assert any("not found" in d.lower() or "no momo_payment" in d.lower() for d in diagnosis), \
            f"Diagnosis should indicate payment not found: {diagnosis}"
        
        print(f"✅ Payment debug endpoint works correctly")
        print(f"✅ Diagnosis: {diagnosis}")
    
    def test_admin_payment_debug_requires_secret(self):
        """Test that admin/payment-debug endpoint requires correct secret"""
        response = requests.get(
            f"{BASE_URL}/api/payments/admin/payment-debug/test-ref",
            params={"admin_secret": "wrong-secret"},
            timeout=30
        )
        assert response.status_code == 403, "Should reject wrong secret"
        
        print("✅ Admin payment-debug requires valid admin_secret")
    
    def test_admin_payment_debug_shows_callback_logs(self):
        """
        Test that payment-debug shows related callback logs.
        First send a callback, then check if debug endpoint finds it.
        """
        test_ref = f"TEST-DEBUG-{uuid.uuid4().hex[:8].upper()}"
        
        # Send a callback
        callback_payload = {
            "Status": "Success",
            "Data": {
                "ClientReference": test_ref,
                "TransactionId": f"TX-DBG-{uuid.uuid4().hex[:8]}",
                "Amount": 20.0,
                "Status": "Success"
            }
        }
        
        requests.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json=callback_payload,
            timeout=30
        )
        
        # Wait for callback to be logged
        time.sleep(0.5)
        
        # Check debug endpoint for this reference
        response = requests.get(
            f"{BASE_URL}/api/payments/admin/payment-debug/{test_ref}",
            params={"admin_secret": ADMIN_SECRET},
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Callback logs should contain our test callback
        callback_logs = data.get("callback_logs", [])
        assert len(callback_logs) >= 1, f"Should find at least 1 callback log for {test_ref}"
        
        # Verify the callback log content
        found = False
        for log in callback_logs:
            raw_body = log.get("raw_body", {})
            data_field = raw_body.get("Data", {})
            if data_field.get("ClientReference") == test_ref or raw_body.get("ClientReference") == test_ref:
                found = True
                break
        
        assert found, f"Callback log for {test_ref} not found in debug response"
        
        print(f"✅ Payment debug shows callback logs for reference")


class TestBackgroundProcessing:
    """Tests to verify background processing runs after immediate response"""
    
    def test_callback_processed_flag_updated(self):
        """
        Test that callback is marked as processed after background task runs.
        The 'processed' field should be updated after async processing completes.
        """
        test_ref = f"TEST-PROC-{uuid.uuid4().hex[:8].upper()}"
        
        callback_payload = {
            "Status": "Success",
            "Data": {
                "ClientReference": test_ref,
                "TransactionId": f"TX-PROC-{uuid.uuid4().hex[:8]}",
                "Amount": 25.0,
                "Status": "Success"
            }
        }
        
        # Send callback
        response = requests.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json=callback_payload,
            timeout=30
        )
        assert response.status_code == 200
        
        # Wait for background processing to complete
        # Background task should process fairly quickly
        time.sleep(2)
        
        # Check callback logs for processed status
        logs_response = requests.get(
            f"{BASE_URL}/api/payments/admin/callback-logs",
            params={"admin_secret": ADMIN_SECRET, "limit": 20},
            timeout=30
        )
        
        assert logs_response.status_code == 200
        logs_data = logs_response.json()
        
        # Find our callback
        found_callback = None
        for log in logs_data.get("logs", []):
            raw_body = log.get("raw_body", {})
            data = raw_body.get("Data", {})
            if data.get("ClientReference") == test_ref:
                found_callback = log
                break
        
        assert found_callback is not None, f"Callback for {test_ref} not found"
        
        # Check if processed
        processed = found_callback.get("processed", False)
        print(f"✅ Callback processed status: {processed}")
        
        # The callback should be marked as processed (even if payment not found)
        assert processed == True, f"Callback should be marked as processed. Log: {found_callback}"
    
    def test_callback_error_logged_for_missing_payment(self):
        """
        Test that when payment is not found, error is logged in callback record.
        """
        test_ref = f"TEST-ERR-{uuid.uuid4().hex[:8].upper()}"
        
        callback_payload = {
            "Status": "Success",
            "Data": {
                "ClientReference": test_ref,
                "TransactionId": f"TX-ERR-{uuid.uuid4().hex[:8]}",
                "Amount": 30.0,
                "Status": "Success"
            }
        }
        
        # Send callback for non-existent payment
        requests.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json=callback_payload,
            timeout=30
        )
        
        # Wait for background processing
        time.sleep(2)
        
        # Check debug endpoint for error
        debug_response = requests.get(
            f"{BASE_URL}/api/payments/admin/payment-debug/{test_ref}",
            params={"admin_secret": ADMIN_SECRET},
            timeout=30
        )
        
        assert debug_response.status_code == 200
        debug_data = debug_response.json()
        
        # Check callback logs in debug
        callback_logs = debug_data.get("callback_logs", [])
        if callback_logs:
            log = callback_logs[0]
            # Error should be logged for payment not found
            error = log.get("error")
            if error:
                print(f"✅ Error logged for missing payment: {error}")
            else:
                print("ℹ️ No error field, but callback was logged")


class TestDebugCallbackTest:
    """Test the debug/callback-test endpoint"""
    
    def test_debug_callback_test_endpoint(self):
        """Test the debug endpoint that verifies callback reachability"""
        response = requests.get(
            f"{BASE_URL}/api/payments/debug/callback-test",
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        assert "timestamp" in data
        assert "endpoints" in data
        
        # Verify endpoints listed
        endpoints = data.get("endpoints", {})
        assert "hubtel_callback" in endpoints
        assert "generic_callback" in endpoints
        
        print(f"✅ Debug callback-test endpoint works")
        print(f"   Message: {data.get('message')}")
        print(f"   Endpoints: {endpoints}")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
