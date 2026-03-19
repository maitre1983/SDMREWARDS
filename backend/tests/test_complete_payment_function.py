"""
SDM REWARDS - Payment Complete Function Test
=============================================
Direct database test to verify complete_payment function works correctly.
Creates a test payment in momo_payments and triggers completion.
"""

import pytest
import asyncio
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import requests
import os

# Test data
TEST_PREFIX = "COMPLETE_TEST_"
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://web-boost-seo.preview.emergentagent.com").rstrip("/")


@pytest.fixture
async def db_client():
    """Create MongoDB client - function scoped"""
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['test_database']
    yield db
    # No need to close - will be garbage collected


@pytest.mark.asyncio
async def test_complete_payment_creates_transaction(db_client):
    """
    Test that complete_payment creates a transaction record.
    
    Flow:
    1. Create test client
    2. Create test merchant
    3. Create test momo_payment
    4. Call complete_payment
    5. Verify transaction is created
    """
    db = db_client
    
    # Create unique IDs
    test_id = uuid.uuid4().hex[:8]
    client_id = f"{TEST_PREFIX}CLIENT_{test_id}"
    merchant_id = f"{TEST_PREFIX}MERCHANT_{test_id}"
    payment_id = f"{TEST_PREFIX}PAY_{test_id}"
    payment_ref = f"SDM-PAY-{test_id}"
    
    try:
        # Create test client
        test_client = {
            "id": client_id,
            "full_name": f"Test Client {test_id}",
            "phone": f"055{test_id[:7]}",
            "email": f"test_{test_id}@test.com",
            "status": "active",
            "card_type": "silver",
            "cashback_balance": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.clients.insert_one(test_client)
        
        # Create test merchant
        test_merchant = {
            "id": merchant_id,
            "business_name": f"Test Merchant {test_id}",
            "phone": f"024{test_id[:7]}",
            "momo_number": f"024{test_id[:7]}",
            "momo_network": "MTN",
            "cashback_rate": 5,
            "status": "active",
            "payment_qr_code": f"SDM-M-{test_id.upper()}",
            "total_volume": 0,
            "total_transactions": 0,
            "total_cashback_given": 0,
            "pending_balance": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.merchants.insert_one(test_merchant)
        
        # Create test momo_payment
        test_payment = {
            "id": payment_id,
            "reference": payment_ref,
            "client_reference": payment_ref,
            "type": "merchant_payment",
            "client_id": client_id,
            "merchant_id": merchant_id,
            "phone": test_client["phone"],
            "amount": 100.0,
            "status": "pending",
            "metadata": {
                "merchant_id": merchant_id,
                "expected_cashback": 5.0
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.momo_payments.insert_one(test_payment)
        
        # Import and call complete_payment
        import sys
        sys.path.insert(0, '/app/backend')
        from routers.payments.shared import set_db
        set_db(db)
        
        from routers.payments.processing import complete_payment
        
        # Call complete_payment
        await complete_payment(payment_id)
        
        # Verify payment status updated
        updated_payment = await db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
        assert updated_payment["status"] == "success", f"Payment status not updated: {updated_payment['status']}"
        assert "completed_at" in updated_payment, "completed_at not set"
        
        # Verify transaction created
        transaction = await db.transactions.find_one({"payment_reference": payment_ref}, {"_id": 0})
        assert transaction is not None, "Transaction not created"
        assert transaction["type"] == "merchant_payment"
        assert transaction["status"] == "completed"
        assert transaction["amount"] == 100.0
        assert "cashback_amount" in transaction
        
        # Verify cashback credited to client
        updated_client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        assert updated_client["cashback_balance"] > 0, "Cashback not credited to client"
        
        print(f"✅ complete_payment created transaction: {transaction['id']}")
        print(f"✅ Client cashback balance: {updated_client['cashback_balance']}")
        
    finally:
        # Cleanup
        await db.momo_payments.delete_one({"id": payment_id})
        await db.transactions.delete_one({"payment_reference": payment_ref})
        await db.clients.delete_one({"id": client_id})
        await db.merchants.delete_one({"id": merchant_id})


@pytest.mark.asyncio
async def test_complete_payment_idempotent(db_client):
    """
    Test that complete_payment is idempotent (safe to call multiple times).
    Should not double-credit cashback.
    """
    db = db_client
    
    # Create unique IDs
    test_id = uuid.uuid4().hex[:8]
    client_id = f"{TEST_PREFIX}IDEMP_CLIENT_{test_id}"
    merchant_id = f"{TEST_PREFIX}IDEMP_MERCHANT_{test_id}"
    payment_id = f"{TEST_PREFIX}IDEMP_PAY_{test_id}"
    payment_ref = f"SDM-IDEMP-{test_id}"
    
    try:
        # Create test client
        test_client = {
            "id": client_id,
            "full_name": f"Test Client {test_id}",
            "phone": f"055{test_id[:7]}",
            "status": "active",
            "card_type": "silver",
            "cashback_balance": 10.0,  # Starting balance
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.clients.insert_one(test_client)
        
        # Create test merchant
        test_merchant = {
            "id": merchant_id,
            "business_name": f"Test Merchant {test_id}",
            "phone": f"024{test_id[:7]}",
            "cashback_rate": 5,
            "status": "active",
            "payment_qr_code": f"SDM-M-{test_id.upper()}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.merchants.insert_one(test_merchant)
        
        # Create test payment (already completed)
        test_payment = {
            "id": payment_id,
            "reference": payment_ref,
            "client_reference": payment_ref,
            "type": "merchant_payment",
            "client_id": client_id,
            "merchant_id": merchant_id,
            "phone": test_client["phone"],
            "amount": 100.0,
            "status": "success",  # Already completed
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {"merchant_id": merchant_id},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.momo_payments.insert_one(test_payment)
        
        # Create existing transaction (simulating already processed)
        existing_txn = {
            "id": str(uuid.uuid4()),
            "type": "merchant_payment",
            "client_id": client_id,
            "merchant_id": merchant_id,
            "amount": 100.0,
            "cashback_amount": 5.0,
            "payment_reference": payment_ref,
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.transactions.insert_one(existing_txn)
        
        # Credit cashback manually (simulating already processed)
        await db.clients.update_one(
            {"id": client_id},
            {"$inc": {"cashback_balance": 4.75}}  # Net cashback after commission
        )
        
        # Get balance before duplicate call
        client_before = await db.clients.find_one({"id": client_id}, {"_id": 0})
        balance_before = client_before["cashback_balance"]
        
        # Import and call complete_payment
        import sys
        sys.path.insert(0, '/app/backend')
        from routers.payments.shared import set_db
        set_db(db)
        
        from routers.payments.processing import complete_payment
        
        # Call complete_payment AGAIN (should be idempotent)
        await complete_payment(payment_id)
        
        # Verify balance didn't change (no double-credit)
        client_after = await db.clients.find_one({"id": client_id}, {"_id": 0})
        balance_after = client_after["cashback_balance"]
        
        assert balance_before == balance_after, f"Double credit! Before: {balance_before}, After: {balance_after}"
        
        # Verify no duplicate transaction
        txn_count = await db.transactions.count_documents({"payment_reference": payment_ref})
        assert txn_count == 1, f"Duplicate transaction created! Count: {txn_count}"
        
        print(f"✅ complete_payment is idempotent - balance unchanged: {balance_after}")
        
    finally:
        # Cleanup
        await db.momo_payments.delete_one({"id": payment_id})
        await db.transactions.delete_many({"payment_reference": payment_ref})
        await db.clients.delete_one({"id": client_id})
        await db.merchants.delete_one({"id": merchant_id})


@pytest.mark.asyncio
async def test_callback_triggers_complete_payment(db_client):
    """
    Test that a successful Hubtel callback triggers complete_payment.
    Simulates receiving a webhook callback.
    """
    db = db_client
    
    # Create unique IDs
    test_id = uuid.uuid4().hex[:8]
    client_id = f"{TEST_PREFIX}CALLBACK_CLIENT_{test_id}"
    merchant_id = f"{TEST_PREFIX}CALLBACK_MERCHANT_{test_id}"
    payment_id = f"{TEST_PREFIX}CALLBACK_PAY_{test_id}"
    payment_ref = f"SDM-CALLBACK-{test_id}"
    
    try:
        # Create test client
        test_client = {
            "id": client_id,
            "full_name": f"Test Client {test_id}",
            "phone": f"055{test_id[:7]}",
            "status": "active",
            "card_type": "silver",
            "cashback_balance": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.clients.insert_one(test_client)
        
        # Create test merchant
        test_merchant = {
            "id": merchant_id,
            "business_name": f"Test Merchant {test_id}",
            "phone": f"024{test_id[:7]}",
            "cashback_rate": 5,
            "status": "active",
            "payment_qr_code": f"SDM-M-{test_id.upper()}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.merchants.insert_one(test_merchant)
        
        # Create pending momo_payment
        test_payment = {
            "id": payment_id,
            "reference": payment_ref,
            "client_reference": payment_ref,
            "type": "merchant_payment",
            "client_id": client_id,
            "merchant_id": merchant_id,
            "phone": test_client["phone"],
            "amount": 50.0,
            "status": "pending",
            "metadata": {"merchant_id": merchant_id},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.momo_payments.insert_one(test_payment)
        
        # Also create hubtel_payments record
        hubtel_payment = {
            "id": str(uuid.uuid4()),
            "client_reference": payment_ref,
            "phone": test_client["phone"],
            "amount": 50.0,
            "status": "pending",
            "type": "momo_collection",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.hubtel_payments.insert_one(hubtel_payment)
        
        # Simulate callback via HTTP request
        callback_data = {
            "ResponseCode": "0000",
            "Status": "Success",
            "Data": {
                "ClientReference": payment_ref,
                "TransactionId": f"TX_{test_id}",
                "Amount": 50.0
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/payments/hubtel/callback",
            json=callback_data
        )
        
        assert response.status_code == 200, f"Callback failed: {response.text}"
        
        # Wait a moment for processing
        await asyncio.sleep(0.5)
        
        # Verify payment status updated
        updated_payment = await db.momo_payments.find_one({"id": payment_id}, {"_id": 0})
        assert updated_payment["status"] == "success", f"Payment not marked success: {updated_payment['status']}"
        
        # Verify transaction created
        transaction = await db.transactions.find_one({"payment_reference": payment_ref}, {"_id": 0})
        assert transaction is not None, "Transaction not created after callback"
        
        # Verify cashback credited
        updated_client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        assert updated_client["cashback_balance"] > 0, "Cashback not credited"
        
        print(f"✅ Callback triggered complete_payment successfully")
        print(f"✅ Transaction ID: {transaction['id']}")
        print(f"✅ Client cashback: {updated_client['cashback_balance']}")
        
    finally:
        # Cleanup
        await db.momo_payments.delete_one({"id": payment_id})
        await db.hubtel_payments.delete_one({"client_reference": payment_ref})
        await db.transactions.delete_many({"payment_reference": payment_ref})
        await db.clients.delete_one({"id": client_id})
        await db.merchants.delete_one({"id": merchant_id})


@pytest.mark.asyncio
async def test_poll_status_triggers_complete_payment(db_client):
    """
    Test that poll-status triggers complete_payment when payment is marked completed.
    """
    db = db_client
    
    # Create unique IDs
    test_id = uuid.uuid4().hex[:8]
    client_id = f"{TEST_PREFIX}POLL_CLIENT_{test_id}"
    merchant_id = f"{TEST_PREFIX}POLL_MERCHANT_{test_id}"
    payment_id = f"{TEST_PREFIX}POLL_PAY_{test_id}"
    payment_ref = f"SDM-POLL-{test_id}"
    
    try:
        # Create test client
        test_client = {
            "id": client_id,
            "full_name": f"Test Client {test_id}",
            "phone": f"055{test_id[:7]}",
            "status": "active",
            "card_type": "silver",
            "cashback_balance": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.clients.insert_one(test_client)
        
        # Create test merchant
        test_merchant = {
            "id": merchant_id,
            "business_name": f"Test Merchant {test_id}",
            "phone": f"024{test_id[:7]}",
            "cashback_rate": 5,
            "status": "active",
            "payment_qr_code": f"SDM-M-{test_id.upper()}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.merchants.insert_one(test_merchant)
        
        # Create payment that is already marked completed (simulating webhook received)
        test_payment = {
            "id": payment_id,
            "reference": payment_ref,
            "client_reference": payment_ref,
            "type": "merchant_payment",
            "client_id": client_id,
            "merchant_id": merchant_id,
            "phone": test_client["phone"],
            "amount": 75.0,
            "status": "completed",  # Already completed by webhook
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {"merchant_id": merchant_id},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.momo_payments.insert_one(test_payment)
        
        # Call poll-status via HTTP
        response = requests.get(f"{BASE_URL}/api/payments/poll-status/{payment_ref}")
        
        assert response.status_code == 200, f"Poll-status failed: {response.text}"
        data = response.json()
        
        # Should return completed status
        assert data.get("status") == "completed", f"Expected completed, got: {data.get('status')}"
        assert data.get("should_poll") is False, f"should_poll should be False: {data}"
        
        # Wait for complete_payment to process
        await asyncio.sleep(0.5)
        
        # Verify transaction was created by poll-status triggering complete_payment
        transaction = await db.transactions.find_one({"payment_reference": payment_ref}, {"_id": 0})
        assert transaction is not None, "Transaction not created by poll-status"
        
        # Verify cashback credited
        updated_client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        assert updated_client["cashback_balance"] > 0, "Cashback not credited by poll-status"
        
        print(f"✅ Poll-status triggered complete_payment successfully")
        print(f"✅ Transaction ID: {transaction['id']}")
        print(f"✅ Client cashback: {updated_client['cashback_balance']}")
        
    finally:
        # Cleanup
        await db.momo_payments.delete_one({"id": payment_id})
        await db.transactions.delete_many({"payment_reference": payment_ref})
        await db.clients.delete_one({"id": client_id})
        await db.merchants.delete_one({"id": merchant_id})


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-s"])
