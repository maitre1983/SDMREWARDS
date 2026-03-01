#!/usr/bin/env python3
import requests
import sys
from datetime import datetime
import json

class SmartDigitalAPITester:
    def __init__(self, base_url="https://web-boost-seo.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.merchant_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_message_id = None
        self.sdm_user_id = None
        self.sdm_merchant_id = None
        self.test_phone = "+233244774451"
        self.test_qr_code = "F5DB92FD-1AE"
        self.test_merchant_api_key = "sdk_7f74de932ade5a6e9bb0a38b5cdaa49b"

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.test_results.append({
            "test": test_name,
            "status": "PASS" if success else "FAIL",
            "details": details
        })
        if success:
            self.tests_passed += 1

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.text else {}
                    self.log_result(name, True, f"Status: {response.status_code}")
                    return True, response_data
                except:
                    self.log_result(name, True, f"Status: {response.status_code}")
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                print(f"❌ Failed - {error_msg}")
                try:
                    error_data = response.json() if response.text else {}
                    print(f"   Response: {error_data}")
                    self.log_result(name, False, f"{error_msg} - Response: {error_data}")
                except:
                    self.log_result(name, False, f"{error_msg} - Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            error_msg = f"Error: {str(e)}"
            print(f"❌ Failed - {error_msg}")
            self.log_result(name, False, error_msg)
            return False, {}

    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n" + "="*50)
        print("TESTING HEALTH ENDPOINTS")
        print("="*50)
        
        # Test root endpoint
        self.run_test("Root API", "GET", "/api/", 200)
        
        # Test health endpoint
        self.run_test("Health Check", "GET", "/api/health", 200)

    def test_contact_submission(self):
        """Test contact form submission"""
        print("\n" + "="*50)
        print("TESTING CONTACT FUNCTIONALITY")
        print("="*50)
        
        test_contact_data = {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "+233123456789",
            "company": "Test Company",
            "service_type": "business",
            "message": "This is a test contact message from automated testing."
        }
        
        success, response = self.run_test(
            "Contact Form Submission",
            "POST",
            "/api/contact",
            200,
            data=test_contact_data
        )
        
        if success and 'id' in response:
            self.created_message_id = response['id']
            print(f"✅ Contact message created with ID: {self.created_message_id}")
        
        return success

    def test_analytics_tracking(self):
        """Test analytics visit tracking"""
        print("\n" + "="*50)
        print("TESTING ANALYTICS TRACKING")
        print("="*50)
        
        # Test visit tracking endpoint
        visit_data = {
            "page": "/",
            "referrer": "https://google.com"
        }
        
        success, response = self.run_test(
            "Visit Tracking",
            "POST",
            "/api/track",
            200,
            data=visit_data
        )
        
        return success

    def test_admin_setup(self):
        """Test admin setup"""
        print("\n" + "="*50)
        print("TESTING ADMIN SETUP")
        print("="*50)
        
        success, response = self.run_test(
            "Admin Setup",
            "POST",
            "/api/admin/setup",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login and store token"""
        print("\n" + "="*50)
        print("TESTING ADMIN LOGIN")
        print("="*50)
        
        login_credentials = {
            "username": "admin",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/api/admin/login",
            200,
            data=login_credentials
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Admin token acquired: {self.token[:20]}...")
            return True
        else:
            print("❌ Failed to get admin token")
            return False

    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        if not self.token:
            print("❌ No admin token available. Skipping admin endpoint tests.")
            return
        
        print("\n" + "="*50)
        print("TESTING ADMIN ENDPOINTS")
        print("="*50)
        
        # Test get all messages
        self.run_test("Get All Messages", "GET", "/api/admin/messages", 200)
        
        # Test get stats
        self.run_test("Get Admin Stats", "GET", "/api/admin/stats", 200)
        
        # Test get analytics
        self.run_test("Get Admin Analytics", "GET", "/api/admin/analytics", 200)
        
        # Test admin operations on created message if available
        if self.created_message_id:
            print(f"\n📧 Testing operations on message: {self.created_message_id}")
            
            # Test get specific message
            self.run_test(
                "Get Specific Message",
                "GET",
                f"/api/admin/messages/{self.created_message_id}",
                200
            )
            
            # Test mark as read
            self.run_test(
                "Mark Message as Read",
                "PUT",
                f"/api/admin/messages/{self.created_message_id}/read",
                200
            )
            
            # Test reply to message
            reply_data = {"reply": "Thank you for your message. We will get back to you soon."}
            self.run_test(
                "Reply to Message",
                "PUT",
                f"/api/admin/messages/{self.created_message_id}/reply",
                200,
                data=reply_data
            )
            
            # Test delete message (optional - commented out to preserve test data)
            # self.run_test(
            #     "Delete Message",
            #     "DELETE",
            #     f"/api/admin/messages/{self.created_message_id}",
            #     200
            # )
        else:
            print("⚠️ No test message ID available for admin operations testing")

    def test_unauthorized_access(self):
        """Test that admin endpoints require authentication"""
        print("\n" + "="*50)
        print("TESTING UNAUTHORIZED ACCESS")
        print("="*50)
        
        # Temporarily clear token
        temp_token = self.token
        self.token = None
        
        # These should fail with 403 or 401
        self.run_test("Unauthorized Messages Access", "GET", "/api/admin/messages", 403)
        self.run_test("Unauthorized Stats Access", "GET", "/api/admin/stats", 403)
        
        # Restore token
        self.token = temp_token

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_run - self.tests_passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if result["status"] == "FAIL":
                    print(f"  - {result['test']}: {result['details']}")
        
        print(f"\n✅ API Base URL: {self.base_url}")
        print(f"📧 Test Message ID: {self.created_message_id}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test function"""
    print("🚀 Starting Smart Digital Solutions API Tests")
    print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = SmartDigitalAPITester()
    
    try:
        # Run all tests in sequence
        tester.test_health_endpoints()
        tester.test_analytics_tracking()
        tester.test_contact_submission()
        tester.test_admin_setup()
        
        if tester.test_admin_login():
            tester.test_admin_endpoints()
            tester.test_unauthorized_access()
        else:
            print("⚠️ Admin login failed - skipping admin endpoint tests")
        
        # Print final summary
        all_passed = tester.print_summary()
        
        return 0 if all_passed else 1
        
    except Exception as e:
        print(f"\n💥 Test suite crashed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())