"""
SDM REWARDS - Unified Transaction Service
==========================================
Centralized transaction logging for all financial operations.

This service ensures ALL transactions are:
1. Saved to a unified collection
2. Properly formatted with consistent fields
3. Easily retrievable for users, merchants, and admins
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Optional, List, Literal
from enum import Enum

logger = logging.getLogger(__name__)


class TransactionType(str, Enum):
    """All supported transaction types"""
    AIRTIME = "airtime"
    DATA_BUNDLE = "data_bundle"
    ECG = "ecg"
    WITHDRAWAL = "withdrawal"
    CARD_PURCHASE = "card_purchase"
    CARD_UPGRADE = "card_upgrade"
    CASHBACK_EARNED = "cashback_earned"
    CASHBACK_SPENT = "cashback_spent"
    COMMISSION = "commission"
    BONUS = "bonus"
    REFERRAL = "referral"
    TRANSFER_IN = "transfer_in"
    TRANSFER_OUT = "transfer_out"
    PAYMENT_RECEIVED = "payment_received"


class TransactionStatus(str, Enum):
    """Transaction status values"""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class UnifiedTransactionService:
    """
    Unified transaction logging service.
    
    All financial operations should use this service to ensure
    consistent tracking across the platform.
    """
    
    COLLECTION_NAME = "unified_transactions"
    
    def __init__(self, db=None):
        self.db = db
    
    async def log_transaction(
        self,
        user_id: str,
        transaction_type: TransactionType,
        amount: float,
        status: TransactionStatus = TransactionStatus.PENDING,
        reference: str = None,
        description: str = None,
        metadata: Dict = None,
        merchant_id: str = None,
        provider: str = None,
        provider_reference: str = None,
        fee: float = 0,
        balance_before: float = None,
        balance_after: float = None
    ) -> Dict:
        """
        Log a transaction to the unified collection.
        
        Args:
            user_id: ID of the user performing the transaction
            transaction_type: Type of transaction (airtime, withdrawal, etc.)
            amount: Transaction amount in GHS
            status: Current status (pending, success, failed)
            reference: Unique transaction reference
            description: Human-readable description
            metadata: Additional data specific to the transaction type
            merchant_id: Associated merchant ID (if applicable)
            provider: External provider (hubtel, etc.)
            provider_reference: External transaction ID
            fee: Transaction fee charged
            balance_before: User's balance before transaction
            balance_after: User's balance after transaction
        
        Returns:
            The created transaction record
        """
        transaction_id = str(uuid.uuid4())
        reference = reference or f"TXN-{uuid.uuid4().hex[:12].upper()}"
        now = datetime.now(timezone.utc).isoformat()
        
        transaction = {
            "id": transaction_id,
            "user_id": user_id,
            "type": transaction_type.value if isinstance(transaction_type, TransactionType) else transaction_type,
            "amount": amount,
            "fee": fee,
            "net_amount": amount - fee,
            "status": status.value if isinstance(status, TransactionStatus) else status,
            "reference": reference,
            "description": description or self._generate_description(transaction_type, amount),
            "merchant_id": merchant_id,
            "provider": provider,
            "provider_reference": provider_reference,
            "balance_before": balance_before,
            "balance_after": balance_after,
            "metadata": metadata or {},
            "created_at": now,
            "updated_at": now
        }
        
        if self.db is not None:
            await self.db[self.COLLECTION_NAME].insert_one(transaction)
            logger.info(f"Transaction logged: {transaction_id} - {transaction_type} - {amount} GHS")
        
        return transaction
    
    async def update_transaction(
        self,
        transaction_id: str = None,
        reference: str = None,
        status: TransactionStatus = None,
        provider_reference: str = None,
        metadata_updates: Dict = None,
        balance_after: float = None
    ) -> bool:
        """
        Update an existing transaction.
        
        Args:
            transaction_id: Transaction ID to update
            reference: Or find by reference
            status: New status
            provider_reference: External provider reference
            metadata_updates: Additional metadata to merge
            balance_after: Updated balance after transaction
        
        Returns:
            True if updated, False if not found
        """
        if self.db is None:
            return False
        
        query = {}
        if transaction_id:
            query["id"] = transaction_id
        elif reference:
            query["reference"] = reference
        else:
            return False
        
        updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if status:
            updates["status"] = status.value if isinstance(status, TransactionStatus) else status
        if provider_reference:
            updates["provider_reference"] = provider_reference
        if balance_after is not None:
            updates["balance_after"] = balance_after
        
        if metadata_updates:
            for key, value in metadata_updates.items():
                updates[f"metadata.{key}"] = value
        
        result = await self.db[self.COLLECTION_NAME].update_one(query, {"$set": updates})
        return result.modified_count > 0
    
    async def get_user_transactions(
        self,
        user_id: str,
        transaction_type: str = None,
        status: str = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict]:
        """Get transactions for a specific user."""
        if self.db is None:
            return []
        
        query = {"user_id": user_id}
        if transaction_type:
            query["type"] = transaction_type
        if status:
            query["status"] = status
        
        cursor = self.db[self.COLLECTION_NAME].find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def get_merchant_transactions(
        self,
        merchant_id: str,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict]:
        """Get transactions associated with a merchant."""
        if self.db is None:
            return []
        
        cursor = self.db[self.COLLECTION_NAME].find(
            {"merchant_id": merchant_id},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def get_all_transactions(
        self,
        transaction_type: str = None,
        status: str = None,
        user_id: str = None,
        start_date: str = None,
        end_date: str = None,
        limit: int = 100,
        skip: int = 0
    ) -> Dict:
        """Get all transactions with filters (admin use)."""
        if self.db is None:
            return {"transactions": [], "total": 0}
        
        query = {}
        if transaction_type:
            query["type"] = transaction_type
        if status:
            query["status"] = status
        if user_id:
            query["user_id"] = user_id
        if start_date or end_date:
            query["created_at"] = {}
            if start_date:
                query["created_at"]["$gte"] = start_date
            if end_date:
                query["created_at"]["$lte"] = end_date
        
        total = await self.db[self.COLLECTION_NAME].count_documents(query)
        cursor = self.db[self.COLLECTION_NAME].find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        transactions = await cursor.to_list(length=limit)
        
        return {
            "transactions": transactions,
            "total": total,
            "page": skip // limit + 1 if limit > 0 else 1,
            "pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    
    async def get_transaction_stats(self, user_id: str = None) -> Dict:
        """Get transaction statistics."""
        if self.db is None:
            return {}
        
        match_stage = {}
        if user_id:
            match_stage["user_id"] = user_id
        
        pipeline = [
            {"$match": match_stage} if match_stage else {"$match": {}},
            {
                "$group": {
                    "_id": "$type",
                    "count": {"$sum": 1},
                    "total_amount": {"$sum": "$amount"},
                    "total_fees": {"$sum": "$fee"}
                }
            }
        ]
        
        cursor = self.db[self.COLLECTION_NAME].aggregate(pipeline)
        results = await cursor.to_list(length=100)
        
        stats = {
            "by_type": {r["_id"]: {"count": r["count"], "total": r["total_amount"], "fees": r["total_fees"]} for r in results},
            "total_transactions": sum(r["count"] for r in results),
            "total_volume": sum(r["total_amount"] for r in results)
        }
        
        return stats
    
    def _generate_description(self, transaction_type, amount: float) -> str:
        """Generate human-readable description."""
        descriptions = {
            TransactionType.AIRTIME: f"Airtime purchase - GHS {amount:.2f}",
            TransactionType.DATA_BUNDLE: f"Data bundle purchase - GHS {amount:.2f}",
            TransactionType.ECG: f"ECG payment - GHS {amount:.2f}",
            TransactionType.WITHDRAWAL: f"Cashback withdrawal - GHS {amount:.2f}",
            TransactionType.CARD_PURCHASE: f"Card purchase - GHS {amount:.2f}",
            TransactionType.CARD_UPGRADE: f"Card upgrade - GHS {amount:.2f}",
            TransactionType.CASHBACK_EARNED: f"Cashback earned - GHS {amount:.2f}",
            TransactionType.CASHBACK_SPENT: f"Cashback spent - GHS {amount:.2f}",
            TransactionType.COMMISSION: f"Commission earned - GHS {amount:.2f}",
            TransactionType.BONUS: f"Bonus received - GHS {amount:.2f}",
            TransactionType.REFERRAL: f"Referral bonus - GHS {amount:.2f}",
        }
        
        t_type = transaction_type if isinstance(transaction_type, TransactionType) else TransactionType(transaction_type)
        return descriptions.get(t_type, f"Transaction - GHS {amount:.2f}")


# Singleton instance
_transaction_service = None


def get_transaction_service(db=None) -> UnifiedTransactionService:
    """Get singleton transaction service instance."""
    global _transaction_service
    if _transaction_service is None:
        _transaction_service = UnifiedTransactionService(db)
    elif db is not None and _transaction_service.db is None:
        _transaction_service.db = db
    return _transaction_service
