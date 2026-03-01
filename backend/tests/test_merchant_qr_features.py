"""
Test suite for SDM Merchant QR Scanner and Transaction History features
- API /api/sdm/merchant/login with JSON body
- Transaction CRUD and history
- Transaction filters and search
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_MERCHANT_PHONE = "233246283156"
TEST_MERCHANT_API_KEY = "sdk_af10983a3524c11d21c39dfe2fbf4660"
TEST_USER_QR = "789CB4A3-6E4"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Gerard0103@"


class TestMerchantLogin:
    """Test merchant login endpoint with JSON body"""
    
    def test_merchant_login_success(self):
        """Test merchant login with valid credentials - JSON body"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/login",
            json={"phone": TEST_MERCHANT_PHONE, "api_key": TEST_MERCHANT_API_KEY}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "merchant" in data, "Missing merchant in response"
        assert data["merchant"]["phone"] == f"+{TEST_MERCHANT_PHONE}", f"Phone mismatch: {data['merchant']['phone']}"
        print(f"✅ Merchant login successful: {data['merchant']['business_name']}")
    
    def test_merchant_login_invalid_credentials(self):
        """Test merchant login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/login",
            json={"phone": "233000000000", "api_key": "invalid_key"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid credentials correctly rejected")
    
    def test_merchant_login_missing_fields(self):
        """Test merchant login with missing fields"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/login",
            json={"phone": TEST_MERCHANT_PHONE}  # Missing api_key
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✅ Missing fields correctly rejected")


class TestMerchantTransactions:
    """Test merchant transaction endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get merchant token"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/login",
            json={"phone": TEST_MERCHANT_PHONE, "api_key": TEST_MERCHANT_API_KEY}
        )
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.merchant = response.json()["merchant"]
    
    def test_get_transactions_default(self):
        """Test fetching transactions with default limit"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/transactions",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✅ Retrieved {len(data)} transactions (default limit)")
    
    def test_get_transactions_with_limit(self):
        """Test fetching transactions with custom limit - supports 20, 50, 100, 500"""
        for limit in [20, 50, 100]:
            response = requests.get(
                f"{BASE_URL}/api/sdm/merchant/transactions?limit={limit}",
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            # Response should not exceed limit
            assert len(data) <= limit, f"Got {len(data)} items with limit {limit}"
            print(f"✅ Retrieved transactions with limit={limit}: {len(data)} items")
    
    def test_get_merchant_report(self):
        """Test fetching merchant report with statistics"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/report?days=30",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Check required fields for transaction statistics
        assert "total_transactions" in data, "Missing total_transactions"
        assert "total_amount" in data, "Missing total_amount (Total Sales)"
        assert "total_cashback" in data, "Missing total_cashback"
        assert "average_transaction" in data, "Missing average_transaction (Avg)"
        
        print(f"✅ Merchant Report: {data['total_transactions']} txns, Total: GHS {data['total_amount']}, Cashback: GHS {data['total_cashback']}, Avg: GHS {data['average_transaction']}")
    
    def test_get_merchant_profile(self):
        """Test fetching merchant profile"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/profile",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "business_name" in data
        assert "cashback_rate" in data
        assert "total_transactions" in data
        print(f"✅ Merchant profile: {data['business_name']}, Rate: {data['cashback_rate']*100}%")


class TestCreateTransaction:
    """Test creating transactions with QR code"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get merchant token, also get a valid user QR"""
        # Get merchant token
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/login",
            json={"phone": TEST_MERCHANT_PHONE, "api_key": TEST_MERCHANT_API_KEY}
        )
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get admin token to find a valid user QR
        admin_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        if admin_response.status_code == 200:
            admin_token = admin_response.json()["access_token"]
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            users_response = requests.get(
                f"{BASE_URL}/api/sdm/admin/users",
                headers=admin_headers
            )
            if users_response.status_code == 200 and len(users_response.json()) > 0:
                self.valid_qr = users_response.json()[0].get("qr_code")
            else:
                self.valid_qr = None
        else:
            self.valid_qr = None
    
    def test_create_transaction_invalid_qr(self):
        """Test creating transaction with invalid QR code"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/transaction",
            headers=self.headers,
            json={"user_qr_code": "INVALID-QR-CODE", "amount": 100}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Invalid QR code correctly rejected")
    
    def test_create_transaction_with_notes(self):
        """Test creating transaction with optional notes field"""
        if not self.valid_qr:
            pytest.skip("No valid user QR found")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/transaction",
            headers=self.headers,
            json={
                "user_qr_code": self.valid_qr,
                "amount": 50.00,
                "notes": "Table 5, Order #TEST123"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "transaction_id" in data
        assert "cashback_amount" in data
        print(f"✅ Transaction created with notes: {data['transaction_id']}, Cashback: GHS {data['cashback_amount']}")
    
    def test_create_transaction_success(self):
        """Test creating a successful transaction"""
        if not self.valid_qr:
            pytest.skip("No valid user QR found")
        
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/transaction",
            headers=self.headers,
            json={"user_qr_code": self.valid_qr, "amount": 100.00}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "transaction_id" in data
        assert "cashback_amount" in data
        assert data["amount"] == 100.00
        print(f"✅ Transaction created: {data['transaction_id']}, Amount: GHS {data['amount']}, Cashback: GHS {data['cashback_amount']}")


class TestMerchantCardTypes:
    """Test merchant card types management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get merchant token"""
        response = requests.post(
            f"{BASE_URL}/api/sdm/merchant/login",
            json={"phone": TEST_MERCHANT_PHONE, "api_key": TEST_MERCHANT_API_KEY}
        )
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_card_types(self):
        """Test fetching merchant card types"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/card-types",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} card types")
    
    def test_get_memberships(self):
        """Test fetching merchant memberships"""
        response = requests.get(
            f"{BASE_URL}/api/sdm/merchant/memberships",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} active memberships")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
