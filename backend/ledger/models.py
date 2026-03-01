"""
SDM FINTECH LEDGER MODELS
========================
Double-entry accounting system for SDM platform.
Designed for MongoDB with ACID transactions, easily migratable to PostgreSQL.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# =====================================================
# ENUMS
# =====================================================

class EntityType(str, Enum):
    CLIENT = "CLIENT"
    MERCHANT = "MERCHANT"
    SDM_OPERATIONS = "SDM_OPERATIONS"
    SDM_COMMISSION = "SDM_COMMISSION"
    SDM_FLOAT = "SDM_FLOAT"
    EXTERNAL = "EXTERNAL"


class TransactionType(str, Enum):
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    CASHBACK_CREDIT = "CASHBACK_CREDIT"
    CASHBACK_DEBIT = "CASHBACK_DEBIT"
    COMMISSION = "COMMISSION"
    REFUND = "REFUND"
    ADJUSTMENT = "ADJUSTMENT"
    TRANSFER = "TRANSFER"
    FEE = "FEE"
    MEMBERSHIP_PURCHASE = "MEMBERSHIP_PURCHASE"
    REFERRAL_BONUS = "REFERRAL_BONUS"
    WELCOME_BONUS = "WELCOME_BONUS"
    # Service transactions
    AIRTIME_PURCHASE = "AIRTIME_PURCHASE"
    DATA_PURCHASE = "DATA_PURCHASE"
    BILL_PAYMENT = "BILL_PAYMENT"
    CASHBACK_WITHDRAWAL = "CASHBACK_WITHDRAWAL"
    SERVICE_PAYMENT = "SERVICE_PAYMENT"


class TransactionStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REVERSED = "REVERSED"
    CANCELLED = "CANCELLED"


class WithdrawalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PROCESSING = "PROCESSING"
    PAID = "PAID"
    FAILED = "FAILED"
    REJECTED = "REJECTED"


class EntryType(str, Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"


# =====================================================
# WALLET MODEL
# =====================================================

class Wallet(BaseModel):
    """
    Central wallet for any entity (Client, Merchant, SDM accounts).
    All financial operations go through wallets.
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_type: EntityType
    entity_id: str  # Reference to MongoDB document (sdm_users.id or sdm_merchants.id)
    entity_name: Optional[str] = None
    currency: str = "GHS"
    
    # Balances
    available_balance: float = 0.0  # Can be withdrawn/spent
    pending_balance: float = 0.0     # Awaiting clearance (e.g., cashback pending period)
    reserved_balance: float = 0.0    # Blocked for pending transactions
    
    # Limits
    daily_limit: float = 10000.0
    monthly_limit: float = 100000.0
    min_balance: float = 0.0  # Minimum required balance (for merchants)
    
    # Daily tracking
    daily_spent: float = 0.0
    daily_spent_date: Optional[str] = None
    monthly_spent: float = 0.0
    monthly_spent_month: Optional[str] = None
    
    # Status
    status: str = "ACTIVE"  # ACTIVE, BLOCKED, SUSPENDED, CLOSED
    block_reason: Optional[str] = None
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    def total_balance(self) -> float:
        return self.available_balance + self.pending_balance
    
    def can_debit(self, amount: float) -> bool:
        return self.available_balance >= amount and self.status == "ACTIVE"


# =====================================================
# LEDGER ENTRY MODEL
# =====================================================

class LedgerEntry(BaseModel):
    """
    Individual ledger entry. Every transaction creates at least 2 entries (double-entry).
    DEBIT: Money going out of wallet
    CREDIT: Money coming into wallet
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: str  # Parent transaction
    
    # Account affected
    wallet_id: str
    wallet_entity_type: EntityType
    wallet_entity_id: str
    
    # Entry details
    entry_type: EntryType  # DEBIT or CREDIT
    amount: float  # Always positive
    balance_before: float
    balance_after: float
    
    # Description
    description: str
    
    # Audit
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# =====================================================
# LEDGER TRANSACTION MODEL
# =====================================================

class LedgerTransaction(BaseModel):
    """
    Master transaction record. Groups related ledger entries.
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Reference
    reference_id: str  # Human-readable: TXN2024030112345678
    external_reference: Optional[str] = None  # Mobile Money reference
    
    # Type and status
    transaction_type: TransactionType
    status: TransactionStatus = TransactionStatus.PENDING
    
    # Parties
    source_wallet_id: Optional[str] = None
    destination_wallet_id: Optional[str] = None
    
    # Amounts
    amount: float
    fee_amount: float = 0.0
    net_amount: float
    
    # Currency
    currency: str = "GHS"
    
    # Business context
    metadata: Dict[str, Any] = Field(default_factory=dict)
    # Example metadata:
    # - For cashback: {"merchant_id": "xxx", "original_transaction": "xxx", "cashback_rate": 0.05}
    # - For withdrawal: {"provider": "MTN", "phone": "+233xxx"}
    
    # Audit trail
    created_by: Optional[str] = None  # User/System who initiated
    approved_by: Optional[str] = None  # Admin who approved (for withdrawals)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
    
    # Anti-fraud
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    risk_score: int = 0
    fraud_flags: List[str] = Field(default_factory=list)


# =====================================================
# WITHDRAWAL REQUEST MODEL
# =====================================================

class WithdrawalRequest(BaseModel):
    """
    Withdrawal request with approval workflow.
    Status flow: PENDING → APPROVED → PROCESSING → PAID/FAILED
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: Optional[str] = None  # Created when approved
    
    # Requester
    wallet_id: str
    entity_type: EntityType
    entity_id: str
    entity_name: Optional[str] = None
    
    # Amounts
    amount: float
    fee: float = 1.0  # GHS
    net_amount: float  # amount - fee
    
    # Destination Mobile Money
    provider: str  # MTN, VODAFONE, AIRTELTIGO
    phone_number: str
    account_name: Optional[str] = None
    
    # Workflow status
    status: WithdrawalStatus = WithdrawalStatus.PENDING
    
    # Timestamps
    requested_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None
    processing_started_at: Optional[str] = None
    completed_at: Optional[str] = None
    
    # Mobile Money response
    provider_reference: Optional[str] = None
    provider_status: Optional[str] = None
    provider_message: Optional[str] = None
    
    # Notes
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    # Retry tracking
    retry_count: int = 0
    last_retry_at: Optional[str] = None


# =====================================================
# MERCHANT DEPOSIT MODEL
# =====================================================

class MerchantDeposit(BaseModel):
    """
    Pre-funding deposit from merchant.
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: Optional[str] = None
    
    merchant_id: str
    wallet_id: str
    
    # Amount
    amount: float
    
    # Source
    deposit_method: str  # MOBILE_MONEY, BANK_TRANSFER, CASH
    provider: Optional[str] = None  # MTN, VODAFONE, BANK_NAME
    provider_reference: Optional[str] = None
    
    # Status
    status: str = "PENDING"  # PENDING, CONFIRMED, REJECTED
    
    # Timestamps
    requested_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    confirmed_at: Optional[str] = None
    confirmed_by: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None


# =====================================================
# DAILY RECONCILIATION MODEL
# =====================================================

class DailyReconciliation(BaseModel):
    """
    Daily reconciliation record for audit.
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reconciliation_date: str  # YYYY-MM-DD
    
    # Totals
    total_transactions: int = 0
    total_cashback_given: float = 0.0
    total_commission_earned: float = 0.0
    total_deposits: float = 0.0
    total_withdrawals: float = 0.0
    
    # End of day balances
    total_client_balances: float = 0.0
    total_merchant_balances: float = 0.0
    sdm_operations_balance: float = 0.0
    sdm_commission_balance: float = 0.0
    
    # Verification
    is_balanced: bool = False
    discrepancy_amount: float = 0.0
    discrepancy_notes: Optional[str] = None
    
    # Audit
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None


# =====================================================
# AUDIT LOG MODEL
# =====================================================

class AuditLog(BaseModel):
    """
    Audit log for all sensitive operations.
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Action
    action: str  # CREATE_WALLET, UPDATE_BALANCE, APPROVE_WITHDRAWAL, etc.
    entity_type: str  # wallet, transaction, withdrawal, etc.
    entity_id: str
    
    # Changes
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    
    # Actor
    performed_by: str  # User ID or "SYSTEM"
    performed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    # Context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
