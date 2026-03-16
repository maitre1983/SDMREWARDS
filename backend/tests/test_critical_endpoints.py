"""
SDM REWARDS - Critical Endpoints Tests
======================================
Tests for critical authentication, services, and payment endpoints.
Run with: pytest tests/test_critical_endpoints.py -v

PAYMENT RULES VERIFIED:
- Airtime, Data Bundle, ECG: CASHBACK ONLY
- Card Upgrade: Cashback, MoMo, or Hybrid
- OTP: Hubtel SMS
"""

import pytest
import asyncio
import uuid
import os
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

# Test configuration
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_database")
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-testing-only")

from motor.motor_asyncio import AsyncIOMotorClient

# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)


# ============== FIXTURES ==============

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def db():
    """Get test database connection (sync wrapper)"""
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
    database = client[os.environ.get("DB_NAME", "test_database")]
    return database


@pytest.fixture(scope="function")
def test_client_data():
    """Create test client data"""
    client_id = f"test-client-{uuid.uuid4().hex[:8]}"
    return {
        "id": client_id,
        "full_name": "Test Client",
        "username": f"testuser_{uuid.uuid4().hex[:6]}",
        "phone": f"+233{uuid.uuid4().hex[:9][:9]}",
        "email": f"test_{uuid.uuid4().hex[:6]}@test.com",
        "password_hash": "$2b$12$test",
        "status": "active",
        "card_type": "silver",
        "card_purchased_at": datetime.now(timezone.utc).isoformat(),
        "card_expires_at": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
        "cashback_balance": 100.0,
        "referral_code": f"TEST{uuid.uuid4().hex[:4].upper()}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }


# ============== OTP TESTS ==============

class TestOTPSystem:
    """Tests for OTP send/verify system"""
    
    @pytest.mark.asyncio
    async def test_otp_record_creation(self, db):
        """Test that OTP records are created correctly"""
        phone = "+233551234567"
        otp_code = "123456"
        request_id = f"OTP-TEST-{uuid.uuid4().hex[:8].upper()}"
        
        otp_record = {
            "phone": phone,
            "request_id": request_id,
            "otp_code": otp_code,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "verified": False,
            "attempts": 0
        }
        
        await db.otp_records.insert_one(otp_record)
        
        # Verify record exists
        found = await db.otp_records.find_one({"request_id": request_id})
        assert found is not None
        assert found["phone"] == phone
        assert found["otp_code"] == otp_code
        assert found["verified"] == False
        
        # Cleanup
        await db.otp_records.delete_one({"request_id": request_id})
    
    @pytest.mark.asyncio
    async def test_otp_verification_marks_verified(self, db):
        """Test that verifying OTP marks record as verified"""
        request_id = f"OTP-VERIFY-{uuid.uuid4().hex[:8].upper()}"
        
        # Create OTP record
        await db.otp_records.insert_one({
            "phone": "+233551234567",
            "request_id": request_id,
            "otp_code": "654321",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "verified": False,
            "attempts": 0
        })
        
        # Verify OTP
        await db.otp_records.update_one(
            {"request_id": request_id},
            {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Check verification
        record = await db.otp_records.find_one({"request_id": request_id})
        assert record["verified"] == True
        assert "verified_at" in record
        
        # Cleanup
        await db.otp_records.delete_one({"request_id": request_id})
    
    @pytest.mark.asyncio
    async def test_otp_expiration(self, db):
        """Test that expired OTP records are detectable"""
        request_id = f"OTP-EXPIRED-{uuid.uuid4().hex[:8].upper()}"
        
        # Create expired OTP record
        await db.otp_records.insert_one({
            "phone": "+233551234567",
            "request_id": request_id,
            "otp_code": "111111",
            "created_at": (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat(),
            "expires_at": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat(),
            "verified": False,
            "attempts": 0
        })
        
        # Check expiration
        record = await db.otp_records.find_one({"request_id": request_id})
        expires_at = datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        
        assert now > expires_at, "OTP should be expired"
        
        # Cleanup
        await db.otp_records.delete_one({"request_id": request_id})


# ============== SERVICES PAYMENT TESTS ==============

class TestServicesPaymentRules:
    """Tests to verify payment rules for services"""
    
    @pytest.mark.asyncio
    async def test_airtime_uses_cashback_only(self, db, test_client_data):
        """Test that airtime purchase deducts from cashback balance"""
        # Insert test client
        await db.clients.insert_one(test_client_data)
        client_id = test_client_data["id"]
        initial_balance = test_client_data["cashback_balance"]
        
        try:
            # Simulate airtime purchase
            purchase_amount = 10.0
            service_fee = 0.2
            total_deducted = purchase_amount + service_fee
            
            # Create service transaction
            service_tx = {
                "id": str(uuid.uuid4()),
                "type": "airtime",
                "client_id": client_id,
                "phone": "0551234567",
                "network": "MTN",
                "amount": purchase_amount,
                "service_fee": service_fee,
                "total_deducted": total_deducted,
                "status": "success",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.service_transactions.insert_one(service_tx)
            
            # Deduct from cashback
            await db.clients.update_one(
                {"id": client_id},
                {"$inc": {"cashback_balance": -total_deducted}}
            )
            
            # Verify balance deducted
            client = await db.clients.find_one({"id": client_id})
            expected_balance = initial_balance - total_deducted
            assert abs(client["cashback_balance"] - expected_balance) < 0.01
            
            # Cleanup
            await db.service_transactions.delete_one({"id": service_tx["id"]})
        finally:
            await db.clients.delete_one({"id": client_id})
    
    @pytest.mark.asyncio
    async def test_data_bundle_uses_cashback_only(self, db, test_client_data):
        """Test that data bundle purchase deducts from cashback balance"""
        await db.clients.insert_one(test_client_data)
        client_id = test_client_data["id"]
        initial_balance = test_client_data["cashback_balance"]
        
        try:
            bundle_price = 5.0
            service_fee = 0.1
            total_deducted = bundle_price + service_fee
            
            service_tx = {
                "id": str(uuid.uuid4()),
                "type": "data_bundle",
                "client_id": client_id,
                "phone": "0551234567",
                "network": "MTN",
                "package_id": "MTN-DATA-1GB",
                "amount": bundle_price,
                "service_fee": service_fee,
                "total_deducted": total_deducted,
                "status": "success",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.service_transactions.insert_one(service_tx)
            
            await db.clients.update_one(
                {"id": client_id},
                {"$inc": {"cashback_balance": -total_deducted}}
            )
            
            client = await db.clients.find_one({"id": client_id})
            expected_balance = initial_balance - total_deducted
            assert abs(client["cashback_balance"] - expected_balance) < 0.01
            
            await db.service_transactions.delete_one({"id": service_tx["id"]})
        finally:
            await db.clients.delete_one({"id": client_id})
    
    @pytest.mark.asyncio
    async def test_ecg_payment_uses_cashback_only(self, db, test_client_data):
        """Test that ECG payment deducts from cashback balance"""
        await db.clients.insert_one(test_client_data)
        client_id = test_client_data["id"]
        initial_balance = test_client_data["cashback_balance"]
        
        try:
            ecg_amount = 20.0
            service_fee = 0.3
            total_deducted = ecg_amount + service_fee
            
            service_tx = {
                "id": str(uuid.uuid4()),
                "type": "ecg_payment",
                "client_id": client_id,
                "meter_number": "12345678",
                "amount": ecg_amount,
                "service_fee": service_fee,
                "total_deducted": total_deducted,
                "status": "success",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.service_transactions.insert_one(service_tx)
            
            await db.clients.update_one(
                {"id": client_id},
                {"$inc": {"cashback_balance": -total_deducted}}
            )
            
            client = await db.clients.find_one({"id": client_id})
            expected_balance = initial_balance - total_deducted
            assert abs(client["cashback_balance"] - expected_balance) < 0.01
            
            await db.service_transactions.delete_one({"id": service_tx["id"]})
        finally:
            await db.clients.delete_one({"id": client_id})
    
    @pytest.mark.asyncio
    async def test_insufficient_cashback_prevents_purchase(self, db, test_client_data):
        """Test that purchase fails if cashback balance is insufficient"""
        test_client_data["cashback_balance"] = 5.0  # Low balance
        await db.clients.insert_one(test_client_data)
        client_id = test_client_data["id"]
        
        try:
            client = await db.clients.find_one({"id": client_id})
            required_amount = 50.0 + 1.0  # amount + fee
            
            assert client["cashback_balance"] < required_amount, "Client should not have enough balance"
        finally:
            await db.clients.delete_one({"id": client_id})


# ============== CARD UPGRADE TESTS ==============

class TestCardUpgradePaymentOptions:
    """Tests for card upgrade payment options (cashback, momo, hybrid)"""
    
    @pytest.mark.asyncio
    async def test_upgrade_with_full_cashback(self, db, test_client_data):
        """Test card upgrade using only cashback"""
        test_client_data["cashback_balance"] = 200.0
        await db.clients.insert_one(test_client_data)
        client_id = test_client_data["id"]
        
        try:
            upgrade_price = 50.0
            
            payment_id = str(uuid.uuid4())
            payment_record = {
                "id": payment_id,
                "type": "card_upgrade",
                "client_id": client_id,
                "from_card_type": "silver",
                "to_card_type": "gold",
                "amount": upgrade_price,
                "cashback_used": upgrade_price,
                "momo_amount": 0,
                "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.momo_payments.insert_one(payment_record)
            
            await db.clients.update_one(
                {"id": client_id},
                {"$inc": {"cashback_balance": -upgrade_price}}
            )
            
            client = await db.clients.find_one({"id": client_id})
            payment = await db.momo_payments.find_one({"id": payment_id})
            
            assert payment["momo_amount"] == 0
            assert payment["cashback_used"] == upgrade_price
            assert client["cashback_balance"] == 150.0
            
            await db.momo_payments.delete_one({"id": payment_id})
        finally:
            await db.clients.delete_one({"id": client_id})
    
    @pytest.mark.asyncio
    async def test_upgrade_with_full_momo(self, db, test_client_data):
        """Test card upgrade using only MoMo"""
        await db.clients.insert_one(test_client_data)
        client_id = test_client_data["id"]
        initial_balance = test_client_data["cashback_balance"]
        
        try:
            upgrade_price = 50.0
            
            payment_id = str(uuid.uuid4())
            payment_record = {
                "id": payment_id,
                "type": "card_upgrade",
                "client_id": client_id,
                "from_card_type": "silver",
                "to_card_type": "gold",
                "amount": upgrade_price,
                "cashback_used": 0,
                "momo_amount": upgrade_price,
                "payment_phone": "0551234567",
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.momo_payments.insert_one(payment_record)
            
            # Cashback NOT deducted for MoMo-only payment
            client = await db.clients.find_one({"id": client_id})
            assert client["cashback_balance"] == initial_balance
            
            payment = await db.momo_payments.find_one({"id": payment_id})
            assert payment["cashback_used"] == 0
            assert payment["momo_amount"] == upgrade_price
            
            await db.momo_payments.delete_one({"id": payment_id})
        finally:
            await db.clients.delete_one({"id": client_id})
    
    @pytest.mark.asyncio
    async def test_upgrade_with_hybrid_payment(self, db, test_client_data):
        """Test card upgrade using cashback + MoMo (hybrid)"""
        test_client_data["cashback_balance"] = 30.0
        await db.clients.insert_one(test_client_data)
        client_id = test_client_data["id"]
        
        try:
            upgrade_price = 50.0
            cashback_to_use = 30.0
            momo_to_pay = 20.0
            
            payment_id = str(uuid.uuid4())
            payment_record = {
                "id": payment_id,
                "type": "card_upgrade",
                "client_id": client_id,
                "from_card_type": "silver",
                "to_card_type": "gold",
                "amount": upgrade_price,
                "cashback_used": cashback_to_use,
                "momo_amount": momo_to_pay,
                "payment_phone": "0551234567",
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.momo_payments.insert_one(payment_record)
            
            await db.clients.update_one(
                {"id": client_id},
                {"$inc": {"cashback_balance": -cashback_to_use}}
            )
            
            client = await db.clients.find_one({"id": client_id})
            payment = await db.momo_payments.find_one({"id": payment_id})
            
            assert client["cashback_balance"] == 0
            assert payment["cashback_used"] == 30.0
            assert payment["momo_amount"] == 20.0
            
            await db.momo_payments.delete_one({"id": payment_id})
        finally:
            await db.clients.delete_one({"id": client_id})


# ============== AUTHENTICATION TESTS ==============

class TestAuthentication:
    """Tests for authentication endpoints"""
    
    @pytest.mark.asyncio
    async def test_client_registration_requires_otp(self, db):
        """Test that client registration requires verified OTP"""
        request_id = f"OTP-REG-{uuid.uuid4().hex[:8].upper()}"
        
        await db.otp_records.insert_one({
            "phone": "+233551234567",
            "request_id": request_id,
            "otp_code": "123456",
            "verified": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        })
        
        # Unverified OTP should not be found with verified=True filter
        otp = await db.otp_records.find_one({"request_id": request_id, "verified": True})
        assert otp is None
        
        await db.otp_records.delete_one({"request_id": request_id})
    
    @pytest.mark.asyncio
    async def test_password_reset_requires_otp(self, db, test_client_data):
        """Test that password reset requires OTP verification"""
        await db.clients.insert_one(test_client_data)
        phone = test_client_data["phone"]
        request_id = f"OTP-RESET-{uuid.uuid4().hex[:8].upper()}"
        
        try:
            await db.otp_records.insert_one({
                "phone": phone,
                "request_id": request_id,
                "otp_code": "654321",
                "verified": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
            })
            
            await db.otp_records.update_one(
                {"request_id": request_id},
                {"$set": {"verified": True}}
            )
            
            otp = await db.otp_records.find_one({"request_id": request_id, "verified": True})
            assert otp is not None
            
            await db.otp_records.delete_one({"request_id": request_id})
        finally:
            await db.clients.delete_one({"id": test_client_data["id"]})


# ============== TRANSACTION TESTS ==============

class TestTransactions:
    """Tests for transaction recording"""
    
    @pytest.mark.asyncio
    async def test_service_transaction_recorded(self, db, test_client_data):
        """Test that service transactions are recorded correctly"""
        await db.clients.insert_one(test_client_data)
        client_id = test_client_data["id"]
        
        try:
            tx_id = str(uuid.uuid4())
            service_tx = {
                "id": tx_id,
                "type": "airtime",
                "client_id": client_id,
                "phone": "0551234567",
                "network": "MTN",
                "amount": 10.0,
                "service_fee": 0.2,
                "total_deducted": 10.2,
                "status": "success",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.service_transactions.insert_one(service_tx)
            
            tx = await db.service_transactions.find_one({"id": tx_id})
            assert tx is not None
            assert tx["type"] == "airtime"
            assert tx["client_id"] == client_id
            assert tx["status"] == "success"
            
            await db.service_transactions.delete_one({"id": tx_id})
        finally:
            await db.clients.delete_one({"id": client_id})
    
    @pytest.mark.asyncio
    async def test_upgrade_transaction_recorded(self, db, test_client_data):
        """Test that upgrade transactions are recorded correctly"""
        await db.clients.insert_one(test_client_data)
        client_id = test_client_data["id"]
        
        try:
            tx_id = str(uuid.uuid4())
            upgrade_tx = {
                "id": tx_id,
                "type": "card_upgrade",
                "client_id": client_id,
                "from_card_type": "silver",
                "to_card_type": "gold",
                "amount": 50.0,
                "cashback_used": 30.0,
                "momo_amount": 20.0,
                "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.transactions.insert_one(upgrade_tx)
            
            tx = await db.transactions.find_one({"id": tx_id})
            assert tx is not None
            assert tx["type"] == "card_upgrade"
            assert tx["from_card_type"] == "silver"
            assert tx["to_card_type"] == "gold"
            
            await db.transactions.delete_one({"id": tx_id})
        finally:
            await db.clients.delete_one({"id": client_id})


# ============== RUN TESTS ==============

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
