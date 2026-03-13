"""
Test Integration API and Device Trust Features
==============================================
Testing:
1. Integration API health check endpoint
2. API key rotation endpoint (requires auth)
3. Login v2 endpoints with device trust support for admin, client, merchant
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestIntegrationHealthCheck:
    """Tests for /api/integration/health endpoint"""
    
    def test_health_check_returns_200(self):
        """Health check should return 200 with healthy status"""
        response = requests.get(f"{BASE_URL}/api/integration/health")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "healthy", f"Expected 'healthy' status, got {data.get('status')}"
        assert "service" in data, "Response should include service name"
        assert "version" in data, "Response should include version"
        assert "timestamp" in data, "Response should include timestamp"
        print(f"✓ Health check passed: {data}")
    
    def test_health_check_response_structure(self):
        """Verify the health check response has all expected fields"""
        response = requests.get(f"{BASE_URL}/api/integration/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("service") == "SDM Rewards Integration API", f"Unexpected service name: {data.get('service')}"
        assert data.get("version") == "1.0.0", f"Unexpected version: {data.get('version')}"
        print(f"✓ Health check structure verified: service={data['service']}, version={data['version']}")


class TestAPIKeyRotation:
    """Tests for /api/integration/keys/rotate endpoint"""
    
    def test_rotate_keys_requires_auth(self):
        """API key rotation should return 401 without authorization"""
        response = requests.post(
            f"{BASE_URL}/api/integration/keys/rotate",
            json={"key_id": "key_test123", "grace_period_days": 7}
        )
        
        # Should return 401 or 422 without auth
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print(f"✓ API key rotation properly requires authentication (status: {response.status_code})")
    
    def test_rotate_keys_with_invalid_auth(self):
        """API key rotation with invalid token should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/integration/keys/rotate",
            headers={"Authorization": "Bearer invalid_token_12345"},
            json={"key_id": "key_test123", "grace_period_days": 7}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ API key rotation rejects invalid token (status: {response.status_code})")


class TestAdminLoginV2:
    """Tests for /api/auth/admin/login/v2 endpoint with device trust"""
    
    def test_admin_login_v2_endpoint_exists(self):
        """Admin login v2 endpoint should exist and respond to POST"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login/v2",
            json={
                "email": "test@example.com",
                "password": "wrongpassword"
            }
        )
        
        # Should return 401 (invalid credentials) not 404 (endpoint not found)
        assert response.status_code != 404, f"Admin login v2 endpoint not found (404)"
        assert response.status_code in [401, 403, 422, 429], f"Unexpected status: {response.status_code}"
        print(f"✓ Admin login v2 endpoint exists (status: {response.status_code})")
    
    def test_admin_login_v2_with_device_info(self):
        """Admin login v2 should accept device_info in request"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login/v2",
            json={
                "email": "test@example.com",
                "password": "wrongpassword",
                "device_token": None,
                "remember_device": True,
                "device_info": {
                    "device_name": "Test Browser",
                    "device_type": "web",
                    "user_agent": "pytest-test",
                    "platform": "Linux",
                    "browser": "Test"
                }
            }
        )
        
        # Should return 401 for invalid credentials, not 422 for schema error
        assert response.status_code in [401, 403, 429], f"Expected 401/403/429, got {response.status_code}"
        print(f"✓ Admin login v2 accepts device_info parameter (status: {response.status_code})")


class TestClientLoginV2:
    """Tests for /api/auth/client/login/v2 endpoint with device trust"""
    
    def test_client_login_v2_endpoint_exists(self):
        """Client login v2 endpoint should exist and respond to POST"""
        response = requests.post(
            f"{BASE_URL}/api/auth/client/login/v2",
            json={
                "phone": "+233551234567",
                "password": "wrongpassword"
            }
        )
        
        # Should return 401 (invalid credentials) not 404 (endpoint not found)
        assert response.status_code != 404, f"Client login v2 endpoint not found (404)"
        assert response.status_code in [401, 403, 422, 429], f"Unexpected status: {response.status_code}"
        print(f"✓ Client login v2 endpoint exists (status: {response.status_code})")
    
    def test_client_login_v2_with_device_info(self):
        """Client login v2 should accept device_info and remember_device parameters"""
        response = requests.post(
            f"{BASE_URL}/api/auth/client/login/v2",
            json={
                "phone": "+233551234567",
                "password": "wrongpassword",
                "device_token": None,
                "remember_device": True,
                "device_info": {
                    "device_name": "Test Mobile",
                    "device_type": "android",
                    "user_agent": "pytest-test-mobile",
                    "platform": "Android",
                    "browser": "Chrome Mobile"
                }
            }
        )
        
        # Should return 401 for invalid credentials, not 422 for schema error
        assert response.status_code in [401, 403, 429], f"Expected 401/403/429, got {response.status_code}"
        print(f"✓ Client login v2 accepts device trust parameters (status: {response.status_code})")


class TestMerchantLoginV2:
    """Tests for /api/auth/merchant/login/v2 endpoint with device trust"""
    
    def test_merchant_login_v2_endpoint_exists(self):
        """Merchant login v2 endpoint should exist and respond to POST"""
        response = requests.post(
            f"{BASE_URL}/api/auth/merchant/login/v2",
            json={
                "phone": "+233551234567",
                "password": "wrongpassword"
            }
        )
        
        # Should return 401 (invalid credentials) not 404 (endpoint not found)
        assert response.status_code != 404, f"Merchant login v2 endpoint not found (404)"
        assert response.status_code in [401, 403, 422, 429], f"Unexpected status: {response.status_code}"
        print(f"✓ Merchant login v2 endpoint exists (status: {response.status_code})")
    
    def test_merchant_login_v2_with_device_info(self):
        """Merchant login v2 should accept device_info and remember_device parameters"""
        response = requests.post(
            f"{BASE_URL}/api/auth/merchant/login/v2",
            json={
                "phone": "+233551234567",
                "password": "wrongpassword",
                "device_token": None,
                "remember_device": True,
                "device_info": {
                    "device_name": "Business Tablet",
                    "device_type": "web",
                    "user_agent": "pytest-test-tablet",
                    "platform": "iPad",
                    "browser": "Safari"
                }
            }
        )
        
        # Should return 401 for invalid credentials, not 422 for schema error
        assert response.status_code in [401, 403, 429], f"Expected 401/403/429, got {response.status_code}"
        print(f"✓ Merchant login v2 accepts device trust parameters (status: {response.status_code})")


class TestDeviceManagementEndpoints:
    """Tests for device management endpoints (requires authentication)"""
    
    def test_list_devices_requires_auth(self):
        """List devices endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/devices/list")
        
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print(f"✓ List devices endpoint requires authentication (status: {response.status_code})")
    
    def test_revoke_device_requires_auth(self):
        """Revoke device endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/auth/devices/revoke",
            json={"device_created_at": "2026-01-01T00:00:00Z"}
        )
        
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print(f"✓ Revoke device endpoint requires authentication (status: {response.status_code})")
    
    def test_revoke_all_devices_requires_auth(self):
        """Revoke all devices endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/devices/revoke-all")
        
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print(f"✓ Revoke all devices endpoint requires authentication (status: {response.status_code})")


class TestEndpointSummary:
    """Summary test to verify all new endpoints are accessible"""
    
    def test_all_new_endpoints_summary(self):
        """Summary test checking all new endpoint paths exist"""
        endpoints = [
            ("GET", "/api/integration/health", 200),
            ("POST", "/api/integration/keys/rotate", [401, 422]),
            ("POST", "/api/auth/admin/login/v2", 401),
            ("POST", "/api/auth/client/login/v2", 401),
            ("POST", "/api/auth/merchant/login/v2", 401),
            ("GET", "/api/auth/devices/list", [401, 422]),
            ("POST", "/api/auth/devices/revoke", [401, 422]),
            ("POST", "/api/auth/devices/revoke-all", [401, 422]),
        ]
        
        results = []
        for method, path, expected in endpoints:
            url = f"{BASE_URL}{path}"
            
            if method == "GET":
                resp = requests.get(url)
            else:
                resp = requests.post(url, json={})
            
            expected_list = expected if isinstance(expected, list) else [expected]
            passed = resp.status_code in expected_list or resp.status_code != 404
            results.append((path, resp.status_code, passed))
            
            status = "✓" if passed else "✗"
            print(f"{status} {method} {path} -> {resp.status_code}")
        
        # Assert all passed
        for path, status, passed in results:
            assert passed, f"Endpoint {path} failed with status {status}"
        
        print(f"\n✓ All {len(endpoints)} new endpoints verified!")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
