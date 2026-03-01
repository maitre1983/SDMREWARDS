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
        
        # Use appropriate token based on endpoint
        if 'Authorization' not in test_headers:
            if '/api/admin/' in endpoint and self.admin_token:
                test_headers['Authorization'] = f'Bearer {self.admin_token}'
            elif '/api/sdm/user/' in endpoint and self.user_token:
                test_headers['Authorization'] = f'Bearer {self.user_token}'  
            elif '/api/sdm/merchant/' in endpoint and self.merchant_token:
                test_headers['Authorization'] = f'Bearer {self.merchant_token}'

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
            "password": "Gerard0103@"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/api/admin/login",
            200,
            data=login_credentials
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"✅ Admin token acquired: {self.admin_token[:20]}...")
            return True
        else:
            print("❌ Failed to get admin token")
            return False

    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        if not self.admin_token:
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
        temp_token = self.admin_token
        self.admin_token = None
        
        # These should fail with 403 or 401
        self.run_test("Unauthorized Messages Access", "GET", "/api/admin/messages", 403)
        self.run_test("Unauthorized Stats Access", "GET", "/api/admin/stats", 403)
        
        # Restore token
        self.admin_token = temp_token

    def test_sdm_auth_flow(self):
        """Test SDM OTP authentication flow"""
        print("\n" + "="*50)
        print("TESTING SDM AUTH FLOW")
        print("="*50)
        
        # Test send OTP
        otp_request = {"phone": self.test_phone}
        success, response = self.run_test(
            "SDM Send OTP",
            "POST", 
            "/api/sdm/auth/send-otp",
            200,
            data=otp_request
        )
        
        if not success:
            return False
            
        debug_otp = response.get('debug_otp')
        if not debug_otp:
            print("❌ No debug OTP found in response")
            return False
            
        print(f"✅ Debug OTP received: {debug_otp}")
        
        # Test verify OTP
        verify_request = {
            "phone": self.test_phone,
            "otp_code": debug_otp
        }
        success, response = self.run_test(
            "SDM Verify OTP",
            "POST",
            "/api/sdm/auth/verify-otp", 
            200,
            data=verify_request
        )
        
        if success and 'access_token' in response:
            self.user_token = response['access_token']
            self.sdm_user_id = response.get('user', {}).get('id')
            print(f"✅ SDM User token acquired: {self.user_token[:20]}...")
            print(f"✅ SDM User ID: {self.sdm_user_id}")
            return True
        else:
            print("❌ Failed to verify OTP and get user token")
            return False

    def test_sdm_user_endpoints(self):
        """Test SDM user endpoints"""
        if not self.user_token:
            print("❌ No user token available. Skipping user endpoint tests.")
            return
            
        print("\n" + "="*50)
        print("TESTING SDM USER ENDPOINTS") 
        print("="*50)
        
        # Test user profile
        self.run_test("SDM User Profile", "GET", "/api/sdm/user/profile", 200)
        
        # Test user wallet
        self.run_test("SDM User Wallet", "GET", "/api/sdm/user/wallet", 200)
        
        # Test user transactions
        self.run_test("SDM User Transactions", "GET", "/api/sdm/user/transactions", 200)

    def test_sdm_merchant_registration(self):
        """Test SDM merchant registration"""
        print("\n" + "="*50)
        print("TESTING SDM MERCHANT REGISTRATION")
        print("="*50)
        
        merchant_data = {
            "business_name": "Test Restaurant",
            "business_type": "restaurant", 
            "phone": "+233123456789",
            "email": "test@restaurant.com",
            "address": "Test Street, Accra",
            "city": "Accra",
            "cashback_rate": 0.05
        }
        
        success, response = self.run_test(
            "SDM Merchant Registration",
            "POST",
            "/api/sdm/merchant/register",
            200,
            data=merchant_data
        )
        
        if success and 'access_token' in response:
            self.merchant_token = response['access_token']
            self.sdm_merchant_id = response.get('merchant_id')
            print(f"✅ Merchant token acquired: {self.merchant_token[:20]}...")
            print(f"✅ Merchant ID: {self.sdm_merchant_id}")
            return True
        else:
            print("❌ Failed to register merchant")
            return False

    def test_sdm_merchant_endpoints(self):
        """Test SDM merchant endpoints"""
        if not self.merchant_token:
            print("❌ No merchant token available. Skipping merchant endpoint tests.")
            return
            
        print("\n" + "="*50)
        print("TESTING SDM MERCHANT ENDPOINTS")
        print("="*50)
        
        # Test merchant profile
        self.run_test("SDM Merchant Profile", "GET", "/api/sdm/merchant/profile", 200)
        
        # Test merchant transactions
        self.run_test("SDM Merchant Transactions", "GET", "/api/sdm/merchant/transactions", 200)
        
        # Test merchant report
        self.run_test("SDM Merchant Report", "GET", "/api/sdm/merchant/report?days=30", 200)

    def test_sdm_transaction_creation(self):
        """Test SDM transaction creation"""
        if not self.merchant_token or not self.sdm_user_id:
            print("❌ Missing merchant token or user ID. Skipping transaction tests.")
            return
            
        print("\n" + "="*50)
        print("TESTING SDM TRANSACTION CREATION")
        print("="*50)
        
        transaction_data = {
            "user_qr_code": self.test_qr_code,
            "amount": 50.00,
            "notes": "Test transaction from automated testing"
        }
        
        success, response = self.run_test(
            "SDM Create Transaction",
            "POST",
            "/api/sdm/merchant/transaction",
            200,
            data=transaction_data
        )
        
        if success:
            print(f"✅ Transaction created: {response.get('transaction_id')}")
            print(f"✅ Cashback amount: GHS {response.get('cashback_amount')}")
        
        return success

    def test_sdm_external_api(self):
        """Test SDM external API with test merchant credentials"""
        print("\n" + "="*50)
        print("TESTING SDM EXTERNAL API")
        print("="*50)
        
        # Test external user lookup
        headers = {
            "X-API-Key": self.test_merchant_api_key
        }
        
        success, response = self.run_test(
            "SDM External User Lookup",
            "GET",
            f"/api/sdm/external/user/{self.test_phone}",
            200,
            headers=headers
        )
        
        if success:
            print(f"✅ User exists: {response.get('exists')}")
        
        # Test external transaction creation
        if success and response.get('exists'):
            external_headers = {
                "X-API-Key": self.test_merchant_api_key,
                "X-API-Secret": "test_secret_key"  # This might fail but we'll test the endpoint
            }
            
            transaction_data = {
                "user_phone": self.test_phone,
                "amount": 25.00,
                "reference": "External API test transaction"
            }
            
            # This might fail due to invalid secret but tests the endpoint
            self.run_test(
                "SDM External Transaction",
                "POST", 
                "/api/sdm/external/transaction",
                401,  # Expect 401 due to invalid secret
                data=transaction_data,
                headers=external_headers
            )

    def test_admin_sdm_endpoints(self):
        """Test admin SDM management endpoints"""
        if not self.admin_token:
            print("❌ No admin token available. Skipping admin SDM tests.")
            return
            
        print("\n" + "="*50)
        print("TESTING ADMIN SDM ENDPOINTS")
        print("="*50)
        
        # Test admin get SDM users
        self.run_test("Admin Get SDM Users", "GET", "/api/sdm/admin/users", 200)
        
        # Test admin get SDM merchants  
        self.run_test("Admin Get SDM Merchants", "GET", "/api/sdm/admin/merchants", 200)
        
        # Test admin get SDM transactions
        self.run_test("Admin Get SDM Transactions", "GET", "/api/sdm/admin/transactions", 200)
        
        # Test admin get SDM stats
        self.run_test("Admin Get SDM Stats", "GET", "/api/sdm/admin/sdm-stats", 200)
        
        # Test admin get withdrawals
        self.run_test("Admin Get Withdrawals", "GET", "/api/sdm/admin/withdrawals", 200)

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
        
        # Test SDM authentication flow
        if tester.test_sdm_auth_flow():
            tester.test_sdm_user_endpoints()
        else:
            print("⚠️ SDM auth failed - skipping user endpoint tests")
        
        # Test SDM merchant registration and endpoints
        if tester.test_sdm_merchant_registration():
            tester.test_sdm_merchant_endpoints()
            
            # Test transaction creation (requires both user and merchant)
            if tester.user_token and tester.merchant_token:
                tester.test_sdm_transaction_creation()
        else:
            print("⚠️ Merchant registration failed - skipping merchant endpoint tests")
            
        # Test external API endpoints
        tester.test_sdm_external_api()
        
        # Test admin functionality
        if tester.test_admin_login():
            tester.test_admin_endpoints()
            tester.test_admin_sdm_endpoints()
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