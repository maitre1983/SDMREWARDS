"""
SDM FINTECH LEDGER SERVICE
==========================
Core ledger engine with double-entry accounting.
All financial operations MUST go through this service.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple
import secrets
from motor.motor_asyncio import AsyncIOMotorDatabase

from .models import (
    Wallet, LedgerEntry, LedgerTransaction, WithdrawalRequest,
    MerchantDeposit, DailyReconciliation, AuditLog,
    EntityType, TransactionType, TransactionStatus, WithdrawalStatus, EntryType
)


class LedgerService:
    """
    Central ledger service for all financial operations.
    Implements double-entry accounting with audit trail.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        
        # Collections
        self.wallets = db.wallets
        self.ledger_entries = db.ledger_entries
        self.ledger_transactions = db.ledger_transactions
        self.withdrawal_requests = db.withdrawal_requests
        self.merchant_deposits = db.merchant_deposits
        self.daily_reconciliation = db.daily_reconciliation
        self.audit_logs = db.audit_logs
    
    # =====================================================
    # REFERENCE GENERATION
    # =====================================================
    
    def generate_reference(self, prefix: str = "TXN") -> str:
        """Generate unique transaction reference."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        random_part = secrets.token_hex(4).upper()
        return f"{prefix}{timestamp}{random_part}"
    
    # =====================================================
    # WALLET OPERATIONS
    # =====================================================
    
    async def create_wallet(
        self,
        entity_type: EntityType,
        entity_id: str,
        entity_name: Optional[str] = None,
        min_balance: float = 0.0,
        performed_by: str = "SYSTEM"
    ) -> Wallet:
        """Create a new wallet for an entity."""
        
        # Check if wallet already exists
        existing = await self.wallets.find_one({
            "entity_type": entity_type.value,
            "entity_id": entity_id
        })
        if existing:
            return Wallet(**existing)
        
        wallet = Wallet(
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            min_balance=min_balance
        )
        
        await self.wallets.insert_one(wallet.model_dump())
        
        # Audit log
        await self._audit_log(
            action="CREATE_WALLET",
            entity_type="wallet",
            entity_id=wallet.id,
            new_values={"entity_type": entity_type.value, "entity_id": entity_id},
            performed_by=performed_by
        )
        
        return wallet
    
    async def get_wallet(self, wallet_id: str) -> Optional[Wallet]:
        """Get wallet by ID."""
        doc = await self.wallets.find_one({"id": wallet_id}, {"_id": 0})
        return Wallet(**doc) if doc else None
    
    async def get_wallet_by_entity(
        self,
        entity_type: EntityType,
        entity_id: str
    ) -> Optional[Wallet]:
        """Get wallet by entity type and ID."""
        doc = await self.wallets.find_one({
            "entity_type": entity_type.value,
            "entity_id": entity_id
        }, {"_id": 0})
        return Wallet(**doc) if doc else None
    
    async def get_or_create_wallet(
        self,
        entity_type: EntityType,
        entity_id: str,
        entity_name: Optional[str] = None
    ) -> Wallet:
        """Get existing wallet or create new one."""
        wallet = await self.get_wallet_by_entity(entity_type, entity_id)
        if not wallet:
            wallet = await self.create_wallet(entity_type, entity_id, entity_name)
        return wallet
    
    async def update_wallet_balance(
        self,
        wallet_id: str,
        available_delta: float = 0,
        pending_delta: float = 0,
        reserved_delta: float = 0
    ) -> Wallet:
        """Update wallet balances atomically."""
        result = await self.wallets.find_one_and_update(
            {"id": wallet_id},
            {
                "$inc": {
                    "available_balance": available_delta,
                    "pending_balance": pending_delta,
                    "reserved_balance": reserved_delta
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            return_document=True
        )
        return Wallet(**{k: v for k, v in result.items() if k != "_id"})
    
    # =====================================================
    # SDM SYSTEM WALLETS
    # =====================================================
    
    async def get_sdm_operations_wallet(self) -> Wallet:
        """Get or create SDM operations wallet."""
        return await self.get_or_create_wallet(
            EntityType.SDM_OPERATIONS,
            "SDM_OPS",
            "SDM Operations"
        )
    
    async def get_sdm_commission_wallet(self) -> Wallet:
        """Get or create SDM commission wallet."""
        return await self.get_or_create_wallet(
            EntityType.SDM_COMMISSION,
            "SDM_COMM",
            "SDM Commission"
        )
    
    async def get_sdm_float_wallet(self) -> Wallet:
        """Get or create SDM float wallet (for Mobile Money)."""
        return await self.get_or_create_wallet(
            EntityType.SDM_FLOAT,
            "SDM_FLOAT",
            "SDM Float"
        )
    
    # =====================================================
    # DOUBLE-ENTRY TRANSACTIONS
    # =====================================================
    
    async def create_double_entry_transaction(
        self,
        transaction_type: TransactionType,
        source_wallet: Wallet,
        destination_wallet: Wallet,
        amount: float,
        fee_amount: float = 0.0,
        description: str = "",
        metadata: Dict[str, Any] = None,
        created_by: str = "SYSTEM",
        ip_address: Optional[str] = None
    ) -> Tuple[LedgerTransaction, List[LedgerEntry]]:
        """
        Create a double-entry transaction.
        Debits source wallet, credits destination wallet.
        Returns transaction and entries.
        """
        
        if amount <= 0:
            raise ValueError("Amount must be positive")
        
        if not source_wallet.can_debit(amount + fee_amount):
            raise ValueError(f"Insufficient balance in source wallet. Available: {source_wallet.available_balance}, Required: {amount + fee_amount}")
        
        net_amount = amount - fee_amount
        reference = self.generate_reference()
        
        # Create transaction record
        transaction = LedgerTransaction(
            reference_id=reference,
            transaction_type=transaction_type,
            status=TransactionStatus.COMPLETED,
            source_wallet_id=source_wallet.id,
            destination_wallet_id=destination_wallet.id,
            amount=amount,
            fee_amount=fee_amount,
            net_amount=net_amount,
            metadata=metadata or {},
            created_by=created_by,
            ip_address=ip_address,
            completed_at=datetime.now(timezone.utc).isoformat()
        )
        
        # Get current balances
        source_balance_before = source_wallet.available_balance
        dest_balance_before = destination_wallet.available_balance
        
        # Update wallets
        source_wallet = await self.update_wallet_balance(
            source_wallet.id,
            available_delta=-amount
        )
        destination_wallet = await self.update_wallet_balance(
            destination_wallet.id,
            available_delta=net_amount
        )
        
        # Create ledger entries
        debit_entry = LedgerEntry(
            transaction_id=transaction.id,
            wallet_id=source_wallet.id,
            wallet_entity_type=source_wallet.entity_type,
            wallet_entity_id=source_wallet.entity_id,
            entry_type=EntryType.DEBIT,
            amount=amount,
            balance_before=source_balance_before,
            balance_after=source_wallet.available_balance,
            description=f"{description} - Debit"
        )
        
        credit_entry = LedgerEntry(
            transaction_id=transaction.id,
            wallet_id=destination_wallet.id,
            wallet_entity_type=destination_wallet.entity_type,
            wallet_entity_id=destination_wallet.entity_id,
            entry_type=EntryType.CREDIT,
            amount=net_amount,
            balance_before=dest_balance_before,
            balance_after=destination_wallet.available_balance,
            description=f"{description} - Credit"
        )
        
        entries = [debit_entry, credit_entry]
        
        # Handle fee (credit to SDM commission)
        if fee_amount > 0:
            commission_wallet = await self.get_sdm_commission_wallet()
            fee_balance_before = commission_wallet.available_balance
            commission_wallet = await self.update_wallet_balance(
                commission_wallet.id,
                available_delta=fee_amount
            )
            
            fee_entry = LedgerEntry(
                transaction_id=transaction.id,
                wallet_id=commission_wallet.id,
                wallet_entity_type=commission_wallet.entity_type,
                wallet_entity_id=commission_wallet.entity_id,
                entry_type=EntryType.CREDIT,
                amount=fee_amount,
                balance_before=fee_balance_before,
                balance_after=commission_wallet.available_balance,
                description=f"{description} - Fee"
            )
            entries.append(fee_entry)
        
        # Save to database
        await self.ledger_transactions.insert_one(transaction.model_dump())
        await self.ledger_entries.insert_many([e.model_dump() for e in entries])
        
        # Audit log
        await self._audit_log(
            action="CREATE_TRANSACTION",
            entity_type="ledger_transaction",
            entity_id=transaction.id,
            new_values={
                "type": transaction_type.value,
                "amount": amount,
                "source": source_wallet.entity_id,
                "destination": destination_wallet.entity_id
            },
            performed_by=created_by,
            ip_address=ip_address
        )
        
        return transaction, entries
    
    # =====================================================
    # CASHBACK TRANSACTION (Main business flow)
    # =====================================================
    
    async def process_cashback_transaction(
        self,
        merchant_id: str,
        client_id: str,
        transaction_amount: float,
        cashback_rate: float,
        commission_rate: float = 0.02,
        pending_days: int = 7,
        metadata: Dict[str, Any] = None,
        created_by: str = "SYSTEM"
    ) -> Dict[str, Any]:
        """
        Process a cashback transaction.
        1. Check merchant has sufficient pre-funded balance
        2. Debit merchant wallet (gross cashback)
        3. Credit client wallet (pending)
        4. Credit SDM commission wallet
        5. Schedule pending → available conversion
        
        Returns transaction details.
        """
        
        # Calculate amounts
        gross_cashback = round(transaction_amount * cashback_rate, 2)
        sdm_commission = round(gross_cashback * commission_rate, 2)
        net_cashback = round(gross_cashback - sdm_commission, 2)
        
        # Get wallets
        merchant_wallet = await self.get_wallet_by_entity(EntityType.MERCHANT, merchant_id)
        if not merchant_wallet:
            raise ValueError("Merchant wallet not found")
        
        client_wallet = await self.get_wallet_by_entity(EntityType.CLIENT, client_id)
        if not client_wallet:
            # Auto-create client wallet
            client_wallet = await self.create_wallet(EntityType.CLIENT, client_id)
        
        sdm_commission_wallet = await self.get_sdm_commission_wallet()
        
        # Check merchant balance
        if merchant_wallet.available_balance < gross_cashback:
            raise ValueError(f"Merchant has insufficient pre-funded balance. Available: {merchant_wallet.available_balance}, Required: {gross_cashback}")
        
        # Generate reference
        reference = self.generate_reference("CB")
        available_date = (datetime.now(timezone.utc) + timedelta(days=pending_days)).isoformat()
        
        # Get balances before
        merchant_balance_before = merchant_wallet.available_balance
        client_balance_before = client_wallet.pending_balance
        commission_balance_before = sdm_commission_wallet.available_balance
        
        # 1. Debit merchant (gross cashback)
        merchant_wallet = await self.update_wallet_balance(
            merchant_wallet.id,
            available_delta=-gross_cashback
        )
        
        # 2. Credit client (pending)
        client_wallet = await self.update_wallet_balance(
            client_wallet.id,
            pending_delta=net_cashback
        )
        
        # 3. Credit SDM commission
        sdm_commission_wallet = await self.update_wallet_balance(
            sdm_commission_wallet.id,
            available_delta=sdm_commission
        )
        
        # Create transaction record
        transaction = LedgerTransaction(
            reference_id=reference,
            transaction_type=TransactionType.CASHBACK_CREDIT,
            status=TransactionStatus.COMPLETED,
            source_wallet_id=merchant_wallet.id,
            destination_wallet_id=client_wallet.id,
            amount=gross_cashback,
            fee_amount=sdm_commission,
            net_amount=net_cashback,
            metadata={
                **(metadata or {}),
                "merchant_id": merchant_id,
                "client_id": client_id,
                "transaction_amount": transaction_amount,
                "cashback_rate": cashback_rate,
                "commission_rate": commission_rate,
                "available_date": available_date
            },
            created_by=created_by,
            completed_at=datetime.now(timezone.utc).isoformat()
        )
        
        # Create ledger entries
        entries = [
            LedgerEntry(
                transaction_id=transaction.id,
                wallet_id=merchant_wallet.id,
                wallet_entity_type=EntityType.MERCHANT,
                wallet_entity_id=merchant_id,
                entry_type=EntryType.DEBIT,
                amount=gross_cashback,
                balance_before=merchant_balance_before,
                balance_after=merchant_wallet.available_balance,
                description=f"Cashback debit for transaction {reference}"
            ),
            LedgerEntry(
                transaction_id=transaction.id,
                wallet_id=client_wallet.id,
                wallet_entity_type=EntityType.CLIENT,
                wallet_entity_id=client_id,
                entry_type=EntryType.CREDIT,
                amount=net_cashback,
                balance_before=client_balance_before,
                balance_after=client_wallet.pending_balance,
                description=f"Cashback credit (pending) for transaction {reference}"
            ),
            LedgerEntry(
                transaction_id=transaction.id,
                wallet_id=sdm_commission_wallet.id,
                wallet_entity_type=EntityType.SDM_COMMISSION,
                wallet_entity_id="SDM_COMM",
                entry_type=EntryType.CREDIT,
                amount=sdm_commission,
                balance_before=commission_balance_before,
                balance_after=sdm_commission_wallet.available_balance,
                description=f"Commission for transaction {reference}"
            )
        ]
        
        # Save to database
        await self.ledger_transactions.insert_one(transaction.model_dump())
        await self.ledger_entries.insert_many([e.model_dump() for e in entries])
        
        return {
            "transaction_id": transaction.id,
            "reference": reference,
            "gross_cashback": gross_cashback,
            "net_cashback": net_cashback,
            "sdm_commission": sdm_commission,
            "available_date": available_date,
            "merchant_balance_after": merchant_wallet.available_balance,
            "client_pending_balance": client_wallet.pending_balance
        }
    
    # =====================================================
    # DIRECT PAYMENT TRANSACTION (Client pays, system splits)
    # =====================================================
    
    async def process_direct_payment_transaction(
        self,
        merchant_id: str,
        client_id: str,
        payment_amount: float,
        cashback_rate: float,
        commission_rate: float = 0.02,
        pending_days: int = 7,
        payment_method: str = "MOBILE_MONEY",
        payment_reference: Optional[str] = None,
        metadata: Dict[str, Any] = None,
        created_by: str = "SYSTEM"
    ) -> Dict[str, Any]:
        """
        Process a direct payment transaction where client pays directly.
        The system automatically splits the payment:
        1. Merchant receives: payment_amount - cashback_amount
        2. Client receives: cashback_amount - SDM commission (pending)
        3. SDM receives: commission
        
        Flow:
        1. Client pays payment_amount
        2. System calculates splits
        3. Credit merchant wallet (net after cashback)
        4. Credit client wallet (cashback - commission, pending)
        5. Credit SDM commission wallet
        
        Returns transaction details with all splits.
        """
        
        # Calculate amounts
        cashback_amount = round(payment_amount * cashback_rate, 2)
        sdm_commission = round(cashback_amount * commission_rate, 2)
        net_cashback = round(cashback_amount - sdm_commission, 2)
        merchant_net = round(payment_amount - cashback_amount, 2)
        
        # Get or create wallets
        merchant_wallet = await self.get_wallet_by_entity(EntityType.MERCHANT, merchant_id)
        if not merchant_wallet:
            raise ValueError("Merchant wallet not found")
        
        client_wallet = await self.get_wallet_by_entity(EntityType.CLIENT, client_id)
        if not client_wallet:
            client_wallet = await self.create_wallet(EntityType.CLIENT, client_id)
        
        sdm_commission_wallet = await self.get_sdm_commission_wallet()
        sdm_float_wallet = await self.get_sdm_float_wallet()
        
        # Generate reference
        reference = self.generate_reference("PAY")
        available_date = (datetime.now(timezone.utc) + timedelta(days=pending_days)).isoformat()
        
        # Get balances before
        merchant_balance_before = merchant_wallet.available_balance
        client_balance_before = client_wallet.pending_balance
        commission_balance_before = sdm_commission_wallet.available_balance
        float_balance_before = sdm_float_wallet.available_balance
        
        # 1. Credit Float (incoming payment)
        sdm_float_wallet = await self.update_wallet_balance(
            sdm_float_wallet.id,
            available_delta=payment_amount
        )
        
        # 2. Credit merchant (net after cashback)
        merchant_wallet = await self.update_wallet_balance(
            merchant_wallet.id,
            available_delta=merchant_net
        )
        
        # 3. Credit client (cashback - commission, pending)
        client_wallet = await self.update_wallet_balance(
            client_wallet.id,
            pending_delta=net_cashback
        )
        
        # 4. Credit SDM commission
        sdm_commission_wallet = await self.update_wallet_balance(
            sdm_commission_wallet.id,
            available_delta=sdm_commission
        )
        
        # Create transaction record
        transaction = LedgerTransaction(
            reference_id=reference,
            transaction_type=TransactionType.CASHBACK_CREDIT,
            status=TransactionStatus.COMPLETED,
            source_wallet_id=sdm_float_wallet.id,
            destination_wallet_id=merchant_wallet.id,
            external_reference=payment_reference,
            amount=payment_amount,
            fee_amount=sdm_commission,
            net_amount=merchant_net,
            metadata={
                **(metadata or {}),
                "flow_type": "DIRECT_PAYMENT",
                "merchant_id": merchant_id,
                "client_id": client_id,
                "payment_amount": payment_amount,
                "payment_method": payment_method,
                "cashback_rate": cashback_rate,
                "commission_rate": commission_rate,
                "merchant_net": merchant_net,
                "cashback_amount": cashback_amount,
                "net_cashback": net_cashback,
                "available_date": available_date
            },
            created_by=created_by,
            completed_at=datetime.now(timezone.utc).isoformat()
        )
        
        # Create ledger entries (double-entry)
        entries = [
            # Float receives payment
            LedgerEntry(
                transaction_id=transaction.id,
                wallet_id=sdm_float_wallet.id,
                wallet_entity_type=EntityType.SDM_FLOAT,
                wallet_entity_id="SDM_FLOAT",
                entry_type=EntryType.CREDIT,
                amount=payment_amount,
                balance_before=float_balance_before,
                balance_after=sdm_float_wallet.available_balance,
                description=f"Payment received {reference}"
            ),
            # Merchant receives net
            LedgerEntry(
                transaction_id=transaction.id,
                wallet_id=merchant_wallet.id,
                wallet_entity_type=EntityType.MERCHANT,
                wallet_entity_id=merchant_id,
                entry_type=EntryType.CREDIT,
                amount=merchant_net,
                balance_before=merchant_balance_before,
                balance_after=merchant_wallet.available_balance,
                description=f"Payment credit (net after cashback) {reference}"
            ),
            # Client receives cashback (pending)
            LedgerEntry(
                transaction_id=transaction.id,
                wallet_id=client_wallet.id,
                wallet_entity_type=EntityType.CLIENT,
                wallet_entity_id=client_id,
                entry_type=EntryType.CREDIT,
                amount=net_cashback,
                balance_before=client_balance_before,
                balance_after=client_wallet.pending_balance,
                description=f"Cashback credit (pending) {reference}"
            ),
            # SDM receives commission
            LedgerEntry(
                transaction_id=transaction.id,
                wallet_id=sdm_commission_wallet.id,
                wallet_entity_type=EntityType.SDM_COMMISSION,
                wallet_entity_id="SDM_COMM",
                entry_type=EntryType.CREDIT,
                amount=sdm_commission,
                balance_before=commission_balance_before,
                balance_after=sdm_commission_wallet.available_balance,
                description=f"Commission credit {reference}"
            )
        ]
        
        # Save to database
        await self.ledger_transactions.insert_one(transaction.model_dump())
        await self.ledger_entries.insert_many([e.model_dump() for e in entries])
        
        # Audit log
        await self._audit_log(
            action="DIRECT_PAYMENT_TRANSACTION",
            entity_type="ledger_transaction",
            entity_id=transaction.id,
            new_values={
                "payment_amount": payment_amount,
                "merchant_net": merchant_net,
                "net_cashback": net_cashback,
                "sdm_commission": sdm_commission,
                "merchant_id": merchant_id,
                "client_id": client_id
            },
            performed_by=created_by
        )
        
        return {
            "transaction_id": transaction.id,
            "reference": reference,
            "payment_amount": payment_amount,
            "splits": {
                "merchant_receives": merchant_net,
                "client_cashback": net_cashback,
                "sdm_commission": sdm_commission,
                "total_verified": round(merchant_net + net_cashback + sdm_commission, 2)
            },
            "cashback_rate": cashback_rate,
            "commission_rate": commission_rate,
            "available_date": available_date,
            "merchant_balance_after": merchant_wallet.available_balance,
            "client_pending_balance": client_wallet.pending_balance
        }
    
    # =====================================================
    # WITHDRAWAL WITH FLOAT VERIFICATION
    # =====================================================
    
    async def approve_withdrawal_with_float_check(
        self,
        withdrawal_id: str,
        approved_by: str,
        admin_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Approve withdrawal with float balance verification.
        Ensures SDM_FLOAT has sufficient balance before approving.
        """
        
        doc = await self.withdrawal_requests.find_one({"id": withdrawal_id}, {"_id": 0})
        if not doc:
            raise ValueError("Withdrawal not found")
        
        withdrawal = WithdrawalRequest(**doc)
        
        if withdrawal.status != WithdrawalStatus.PENDING:
            raise ValueError(f"Withdrawal is {withdrawal.status}, cannot approve")
        
        # Check float balance
        float_wallet = await self.get_sdm_float_wallet()
        if float_wallet.available_balance < withdrawal.net_amount:
            raise ValueError(
                f"Insufficient float balance. Float: {float_wallet.available_balance}, "
                f"Required: {withdrawal.net_amount}. Please top up the float wallet."
            )
        
        # Reserve float for this withdrawal
        await self.update_wallet_balance(
            float_wallet.id,
            available_delta=-withdrawal.net_amount,
            reserved_delta=withdrawal.net_amount
        )
        
        now = datetime.now(timezone.utc).isoformat()
        
        await self.withdrawal_requests.update_one(
            {"id": withdrawal_id},
            {
                "$set": {
                    "status": WithdrawalStatus.APPROVED.value,
                    "approved_at": now,
                    "approved_by": approved_by,
                    "admin_notes": admin_notes
                }
            }
        )
        
        # Audit log
        await self._audit_log(
            action="APPROVE_WITHDRAWAL_WITH_FLOAT_CHECK",
            entity_type="withdrawal_request",
            entity_id=withdrawal_id,
            old_values={"status": "PENDING"},
            new_values={
                "status": "APPROVED",
                "float_reserved": withdrawal.net_amount,
                "float_balance_after": float_wallet.available_balance - withdrawal.net_amount
            },
            performed_by=approved_by
        )
        
        return {
            "withdrawal_id": withdrawal_id,
            "status": "APPROVED",
            "amount": withdrawal.amount,
            "net_amount": withdrawal.net_amount,
            "float_reserved": withdrawal.net_amount,
            "float_balance_remaining": float_wallet.available_balance - withdrawal.net_amount
        }
    
    async def complete_withdrawal_with_momo(
        self,
        withdrawal_id: str,
        provider_reference: str,
        provider_status: str = "SUCCESS"
    ) -> Dict[str, Any]:
        """
        Complete withdrawal after Mobile Money API confirmation.
        Releases reserved float and finalizes the transaction.
        """
        
        doc = await self.withdrawal_requests.find_one({"id": withdrawal_id}, {"_id": 0})
        if not doc:
            raise ValueError("Withdrawal not found")
        
        withdrawal = WithdrawalRequest(**doc)
        
        if withdrawal.status not in [WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING]:
            raise ValueError(f"Withdrawal is {withdrawal.status}, cannot complete")
        
        # Get wallets
        wallet = await self.get_wallet(withdrawal.wallet_id)
        float_wallet = await self.get_sdm_float_wallet()
        
        # Release reserved balance from user wallet (already reserved at request time)
        await self.update_wallet_balance(
            withdrawal.wallet_id,
            reserved_delta=-withdrawal.amount
        )
        
        # Release reserved float (was reserved at approval)
        await self.update_wallet_balance(
            float_wallet.id,
            reserved_delta=-withdrawal.net_amount
        )
        
        # Create ledger transaction
        reference = self.generate_reference("WTH")
        
        transaction = LedgerTransaction(
            reference_id=reference,
            transaction_type=TransactionType.WITHDRAWAL,
            status=TransactionStatus.COMPLETED,
            source_wallet_id=wallet.id,
            destination_wallet_id=float_wallet.id,
            external_reference=provider_reference,
            amount=withdrawal.amount,
            fee_amount=withdrawal.fee,
            net_amount=withdrawal.net_amount,
            metadata={
                "withdrawal_id": withdrawal_id,
                "provider": withdrawal.provider,
                "phone": withdrawal.phone_number,
                "momo_status": provider_status
            },
            completed_at=datetime.now(timezone.utc).isoformat()
        )
        
        await self.ledger_transactions.insert_one(transaction.model_dump())
        
        now = datetime.now(timezone.utc).isoformat()
        
        await self.withdrawal_requests.update_one(
            {"id": withdrawal_id},
            {
                "$set": {
                    "status": WithdrawalStatus.PAID.value,
                    "completed_at": now,
                    "provider_reference": provider_reference,
                    "provider_status": provider_status,
                    "transaction_id": transaction.id
                }
            }
        )
        
        # Audit log
        await self._audit_log(
            action="COMPLETE_WITHDRAWAL_MOMO",
            entity_type="withdrawal_request",
            entity_id=withdrawal_id,
            new_values={
                "status": "PAID",
                "provider_reference": provider_reference,
                "net_amount": withdrawal.net_amount
            },
            performed_by="MOMO_API"
        )
        
        return {
            "withdrawal_id": withdrawal_id,
            "transaction_id": transaction.id,
            "reference": reference,
            "status": "PAID",
            "amount": withdrawal.amount,
            "fee": withdrawal.fee,
            "net_amount": withdrawal.net_amount,
            "provider": withdrawal.provider,
            "provider_reference": provider_reference
        }
    
    async def get_float_status(self) -> Dict[str, Any]:
        """Get float wallet status with alert levels."""
        
        float_wallet = await self.get_sdm_float_wallet()
        
        # Get pending withdrawals total
        pending_pipeline = [
            {"$match": {"status": {"$in": [WithdrawalStatus.PENDING.value, WithdrawalStatus.APPROVED.value]}}},
            {"$group": {"_id": None, "total": {"$sum": "$net_amount"}, "count": {"$sum": 1}}}
        ]
        pending_result = await self.withdrawal_requests.aggregate(pending_pipeline).to_list(1)
        pending_total = pending_result[0] if pending_result else {"total": 0, "count": 0}
        
        # Thresholds
        LOW_THRESHOLD = 5000  # GHS
        CRITICAL_THRESHOLD = 1000  # GHS
        
        # Calculate coverage ratio
        coverage = float_wallet.available_balance / pending_total["total"] if pending_total["total"] > 0 else float("inf")
        
        # Determine alert level
        alert_level = "OK"
        if float_wallet.available_balance < CRITICAL_THRESHOLD:
            alert_level = "CRITICAL"
        elif float_wallet.available_balance < LOW_THRESHOLD:
            alert_level = "LOW"
        
        return {
            "float_balance": float_wallet.available_balance,
            "reserved_balance": float_wallet.reserved_balance,
            "pending_withdrawals": {
                "count": pending_total.get("count", 0),
                "total_amount": round(pending_total.get("total", 0), 2)
            },
            "coverage_ratio": round(coverage, 2) if coverage != float("inf") else "∞",
            "alert_level": alert_level,
            "thresholds": {
                "low": LOW_THRESHOLD,
                "critical": CRITICAL_THRESHOLD
            },
            "can_process_withdrawals": float_wallet.available_balance >= pending_total.get("total", 0)
        }
    
    # =====================================================
    # MERCHANT DEPOSIT (Pre-funding)
    # =====================================================
    
    async def create_merchant_deposit(
        self,
        merchant_id: str,
        amount: float,
        deposit_method: str,
        provider: Optional[str] = None,
        provider_reference: Optional[str] = None,
        notes: Optional[str] = None,
        created_by: str = "SYSTEM"
    ) -> MerchantDeposit:
        """
        Create a merchant deposit request.
        Status: PENDING until confirmed by admin.
        """
        
        merchant_wallet = await self.get_wallet_by_entity(EntityType.MERCHANT, merchant_id)
        if not merchant_wallet:
            raise ValueError("Merchant wallet not found")
        
        deposit = MerchantDeposit(
            merchant_id=merchant_id,
            wallet_id=merchant_wallet.id,
            amount=amount,
            deposit_method=deposit_method,
            provider=provider,
            provider_reference=provider_reference,
            notes=notes
        )
        
        await self.merchant_deposits.insert_one(deposit.model_dump())
        
        return deposit
    
    async def confirm_merchant_deposit(
        self,
        deposit_id: str,
        confirmed_by: str
    ) -> Dict[str, Any]:
        """
        Confirm a merchant deposit and credit their wallet.
        """
        
        deposit_doc = await self.merchant_deposits.find_one({"id": deposit_id}, {"_id": 0})
        if not deposit_doc:
            raise ValueError("Deposit not found")
        
        deposit = MerchantDeposit(**deposit_doc)
        
        if deposit.status != "PENDING":
            raise ValueError(f"Deposit is already {deposit.status}")
        
        # Get wallets
        merchant_wallet = await self.get_wallet(deposit.wallet_id)
        sdm_float_wallet = await self.get_sdm_float_wallet()
        
        # Create transaction
        reference = self.generate_reference("DEP")
        
        # Credit merchant wallet
        merchant_balance_before = merchant_wallet.available_balance
        merchant_wallet = await self.update_wallet_balance(
            merchant_wallet.id,
            available_delta=deposit.amount
        )
        
        # Create transaction record
        transaction = LedgerTransaction(
            reference_id=reference,
            transaction_type=TransactionType.DEPOSIT,
            status=TransactionStatus.COMPLETED,
            source_wallet_id=sdm_float_wallet.id,
            destination_wallet_id=merchant_wallet.id,
            amount=deposit.amount,
            fee_amount=0,
            net_amount=deposit.amount,
            metadata={
                "deposit_id": deposit_id,
                "deposit_method": deposit.deposit_method,
                "provider": deposit.provider,
                "provider_reference": deposit.provider_reference
            },
            created_by=confirmed_by,
            completed_at=datetime.now(timezone.utc).isoformat()
        )
        
        # Create ledger entry
        entry = LedgerEntry(
            transaction_id=transaction.id,
            wallet_id=merchant_wallet.id,
            wallet_entity_type=EntityType.MERCHANT,
            wallet_entity_id=deposit.merchant_id,
            entry_type=EntryType.CREDIT,
            amount=deposit.amount,
            balance_before=merchant_balance_before,
            balance_after=merchant_wallet.available_balance,
            description=f"Deposit confirmation {reference}"
        )
        
        # Update deposit status
        now = datetime.now(timezone.utc).isoformat()
        await self.merchant_deposits.update_one(
            {"id": deposit_id},
            {
                "$set": {
                    "status": "CONFIRMED",
                    "confirmed_at": now,
                    "confirmed_by": confirmed_by,
                    "transaction_id": transaction.id
                }
            }
        )
        
        # Save transaction and entry
        await self.ledger_transactions.insert_one(transaction.model_dump())
        await self.ledger_entries.insert_one(entry.model_dump())
        
        # Audit log
        await self._audit_log(
            action="CONFIRM_DEPOSIT",
            entity_type="merchant_deposit",
            entity_id=deposit_id,
            new_values={"status": "CONFIRMED", "amount": deposit.amount},
            performed_by=confirmed_by
        )
        
        return {
            "deposit_id": deposit_id,
            "transaction_id": transaction.id,
            "reference": reference,
            "amount": deposit.amount,
            "merchant_balance_after": merchant_wallet.available_balance
        }
    
    # =====================================================
    # WITHDRAWAL WORKFLOW
    # =====================================================
    
    async def create_withdrawal_request(
        self,
        entity_type: EntityType,
        entity_id: str,
        amount: float,
        provider: str,
        phone_number: str,
        account_name: Optional[str] = None,
        fee: float = 1.0
    ) -> WithdrawalRequest:
        """
        Create a withdrawal request.
        Reserves the amount in wallet until processed.
        """
        
        wallet = await self.get_wallet_by_entity(entity_type, entity_id)
        if not wallet:
            raise ValueError("Wallet not found")
        
        net_amount = amount - fee
        
        if wallet.available_balance < amount:
            raise ValueError(f"Insufficient balance. Available: {wallet.available_balance}, Requested: {amount}")
        
        # Reserve the amount
        await self.update_wallet_balance(
            wallet.id,
            available_delta=-amount,
            reserved_delta=amount
        )
        
        withdrawal = WithdrawalRequest(
            wallet_id=wallet.id,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=wallet.entity_name,
            amount=amount,
            fee=fee,
            net_amount=net_amount,
            provider=provider.upper(),
            phone_number=phone_number,
            account_name=account_name
        )
        
        await self.withdrawal_requests.insert_one(withdrawal.model_dump())
        
        return withdrawal
    
    async def approve_withdrawal(
        self,
        withdrawal_id: str,
        approved_by: str,
        admin_notes: Optional[str] = None
    ) -> WithdrawalRequest:
        """
        Approve a withdrawal request.
        Next step: Processing (calling Mobile Money API).
        """
        
        doc = await self.withdrawal_requests.find_one({"id": withdrawal_id}, {"_id": 0})
        if not doc:
            raise ValueError("Withdrawal not found")
        
        withdrawal = WithdrawalRequest(**doc)
        
        if withdrawal.status != WithdrawalStatus.PENDING:
            raise ValueError(f"Withdrawal is {withdrawal.status}, cannot approve")
        
        now = datetime.now(timezone.utc).isoformat()
        
        await self.withdrawal_requests.update_one(
            {"id": withdrawal_id},
            {
                "$set": {
                    "status": WithdrawalStatus.APPROVED.value,
                    "approved_at": now,
                    "approved_by": approved_by,
                    "admin_notes": admin_notes
                }
            }
        )
        
        # Audit log
        await self._audit_log(
            action="APPROVE_WITHDRAWAL",
            entity_type="withdrawal_request",
            entity_id=withdrawal_id,
            old_values={"status": "PENDING"},
            new_values={"status": "APPROVED"},
            performed_by=approved_by
        )
        
        withdrawal.status = WithdrawalStatus.APPROVED
        withdrawal.approved_at = now
        withdrawal.approved_by = approved_by
        
        return withdrawal
    
    async def reject_withdrawal(
        self,
        withdrawal_id: str,
        rejected_by: str,
        rejection_reason: str
    ) -> WithdrawalRequest:
        """
        Reject a withdrawal request.
        Returns reserved amount to available balance.
        """
        
        doc = await self.withdrawal_requests.find_one({"id": withdrawal_id}, {"_id": 0})
        if not doc:
            raise ValueError("Withdrawal not found")
        
        withdrawal = WithdrawalRequest(**doc)
        
        if withdrawal.status not in [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED]:
            raise ValueError(f"Withdrawal is {withdrawal.status}, cannot reject")
        
        # Return reserved amount to available
        await self.update_wallet_balance(
            withdrawal.wallet_id,
            available_delta=withdrawal.amount,
            reserved_delta=-withdrawal.amount
        )
        
        now = datetime.now(timezone.utc).isoformat()
        
        await self.withdrawal_requests.update_one(
            {"id": withdrawal_id},
            {
                "$set": {
                    "status": WithdrawalStatus.REJECTED.value,
                    "completed_at": now,
                    "rejection_reason": rejection_reason
                }
            }
        )
        
        # Audit log
        await self._audit_log(
            action="REJECT_WITHDRAWAL",
            entity_type="withdrawal_request",
            entity_id=withdrawal_id,
            new_values={"status": "REJECTED", "reason": rejection_reason},
            performed_by=rejected_by
        )
        
        withdrawal.status = WithdrawalStatus.REJECTED
        withdrawal.rejection_reason = rejection_reason
        
        return withdrawal
    
    async def complete_withdrawal(
        self,
        withdrawal_id: str,
        provider_reference: str,
        provider_status: str = "SUCCESS"
    ) -> WithdrawalRequest:
        """
        Mark withdrawal as paid after Mobile Money confirmation.
        Moves reserved balance out of system.
        """
        
        doc = await self.withdrawal_requests.find_one({"id": withdrawal_id}, {"_id": 0})
        if not doc:
            raise ValueError("Withdrawal not found")
        
        withdrawal = WithdrawalRequest(**doc)
        
        if withdrawal.status not in [WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING]:
            raise ValueError(f"Withdrawal is {withdrawal.status}, cannot complete")
        
        # Release reserved balance (money has left the system)
        await self.update_wallet_balance(
            withdrawal.wallet_id,
            reserved_delta=-withdrawal.amount
        )
        
        # Create ledger transaction
        reference = self.generate_reference("WTH")
        wallet = await self.get_wallet(withdrawal.wallet_id)
        sdm_float = await self.get_sdm_float_wallet()
        
        transaction = LedgerTransaction(
            reference_id=reference,
            transaction_type=TransactionType.WITHDRAWAL,
            status=TransactionStatus.COMPLETED,
            source_wallet_id=wallet.id,
            destination_wallet_id=sdm_float.id,  # External (MoMo)
            external_reference=provider_reference,
            amount=withdrawal.amount,
            fee_amount=withdrawal.fee,
            net_amount=withdrawal.net_amount,
            metadata={
                "withdrawal_id": withdrawal_id,
                "provider": withdrawal.provider,
                "phone": withdrawal.phone_number
            },
            completed_at=datetime.now(timezone.utc).isoformat()
        )
        
        await self.ledger_transactions.insert_one(transaction.model_dump())
        
        now = datetime.now(timezone.utc).isoformat()
        
        await self.withdrawal_requests.update_one(
            {"id": withdrawal_id},
            {
                "$set": {
                    "status": WithdrawalStatus.PAID.value,
                    "completed_at": now,
                    "provider_reference": provider_reference,
                    "provider_status": provider_status,
                    "transaction_id": transaction.id
                }
            }
        )
        
        withdrawal.status = WithdrawalStatus.PAID
        withdrawal.completed_at = now
        withdrawal.provider_reference = provider_reference
        
        return withdrawal
    
    # =====================================================
    # PENDING → AVAILABLE CONVERSION
    # =====================================================
    
    async def process_pending_to_available(self) -> Dict[str, Any]:
        """
        Convert pending balances to available based on available_date.
        Run this as a scheduled job (e.g., every hour).
        """
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Find transactions where pending should become available
        query = {
            "transaction_type": TransactionType.CASHBACK_CREDIT.value,
            "status": TransactionStatus.COMPLETED.value,
            "metadata.available_date": {"$lte": now},
            "metadata.converted_to_available": {"$ne": True}
        }
        
        transactions = await self.ledger_transactions.find(query, {"_id": 0}).to_list(1000)
        
        converted_count = 0
        total_converted = 0.0
        
        for txn in transactions:
            client_id = txn["metadata"].get("client_id")
            net_cashback = txn["net_amount"]
            
            if client_id and net_cashback > 0:
                wallet = await self.get_wallet_by_entity(EntityType.CLIENT, client_id)
                if wallet and wallet.pending_balance >= net_cashback:
                    # Move from pending to available
                    await self.update_wallet_balance(
                        wallet.id,
                        pending_delta=-net_cashback,
                        available_delta=net_cashback
                    )
                    
                    # Mark as converted
                    await self.ledger_transactions.update_one(
                        {"id": txn["id"]},
                        {"$set": {"metadata.converted_to_available": True}}
                    )
                    
                    converted_count += 1
                    total_converted += net_cashback
        
        return {
            "converted_count": converted_count,
            "total_converted": total_converted,
            "processed_at": now
        }
    
    # =====================================================
    # REPORTING
    # =====================================================
    
    async def get_financial_summary(self) -> Dict[str, Any]:
        """Get platform-wide financial summary."""
        
        # Get SDM wallets
        ops_wallet = await self.get_sdm_operations_wallet()
        comm_wallet = await self.get_sdm_commission_wallet()
        float_wallet = await self.get_sdm_float_wallet()
        
        # Aggregate client balances
        client_agg = await self.wallets.aggregate([
            {"$match": {"entity_type": EntityType.CLIENT.value, "status": "ACTIVE"}},
            {"$group": {
                "_id": None,
                "total_available": {"$sum": "$available_balance"},
                "total_pending": {"$sum": "$pending_balance"},
                "count": {"$sum": 1}
            }}
        ]).to_list(1)
        
        # Aggregate merchant balances
        merchant_agg = await self.wallets.aggregate([
            {"$match": {"entity_type": EntityType.MERCHANT.value, "status": "ACTIVE"}},
            {"$group": {
                "_id": None,
                "total_available": {"$sum": "$available_balance"},
                "count": {"$sum": 1}
            }}
        ]).to_list(1)
        
        # Transaction stats
        txn_agg = await self.ledger_transactions.aggregate([
            {"$match": {"status": TransactionStatus.COMPLETED.value}},
            {"$group": {
                "_id": "$transaction_type",
                "count": {"$sum": 1},
                "total_amount": {"$sum": "$amount"},
                "total_fees": {"$sum": "$fee_amount"}
            }}
        ]).to_list(100)
        
        # Pending withdrawals
        pending_withdrawals = await self.withdrawal_requests.count_documents({
            "status": {"$in": [WithdrawalStatus.PENDING.value, WithdrawalStatus.APPROVED.value]}
        })
        
        client_data = client_agg[0] if client_agg else {"total_available": 0, "total_pending": 0, "count": 0}
        merchant_data = merchant_agg[0] if merchant_agg else {"total_available": 0, "count": 0}
        
        return {
            "sdm_wallets": {
                "operations": ops_wallet.available_balance,
                "commission": comm_wallet.available_balance,
                "float": float_wallet.available_balance
            },
            "client_wallets": {
                "count": client_data["count"],
                "total_available": client_data["total_available"],
                "total_pending": client_data["total_pending"]
            },
            "merchant_wallets": {
                "count": merchant_data["count"],
                "total_available": merchant_data["total_available"]
            },
            "transactions_by_type": {t["_id"]: {"count": t["count"], "amount": t["total_amount"], "fees": t["total_fees"]} for t in txn_agg},
            "pending_withdrawals": pending_withdrawals,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    # =====================================================
    # AUDIT LOG
    # =====================================================
    
    async def _audit_log(
        self,
        action: str,
        entity_type: str,
        entity_id: str,
        old_values: Dict[str, Any] = None,
        new_values: Dict[str, Any] = None,
        performed_by: str = "SYSTEM",
        ip_address: Optional[str] = None
    ):
        """Create an audit log entry."""
        log = AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            performed_by=performed_by,
            ip_address=ip_address
        )
        await self.audit_logs.insert_one(log.model_dump())
