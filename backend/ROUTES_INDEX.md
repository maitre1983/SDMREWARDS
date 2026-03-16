# SDM REWARDS - API Routes Index
# Generated for developer reference

## ADMIN ROUTES (/api/admin)
```
GET    /dashboard/stats          - Dashboard statistics
GET    /dashboard/recent-activity - Recent activity
GET    /admins                   - List all admins  
POST   /admins                   - Create new admin
DELETE /admins/{admin_id}        - Delete admin

# Client Management
GET    /clients                  - List clients
GET    /clients/{client_id}      - Get client details
PUT    /clients/{client_id}      - Update client
PUT    /clients/{client_id}/status - Update client status
POST   /clients/create-manual    - Create client manually
DELETE /clients/{client_id}      - Delete client

# Merchant Management  
GET    /merchants                - List merchants
GET    /merchants/{merchant_id}  - Get merchant details
PUT    /merchants/{merchant_id}  - Update merchant
PUT    /merchants/{merchant_id}/status - Update merchant status
POST   /merchants/create-manual  - Create merchant manually
DELETE /merchants/{merchant_id}  - Delete merchant

# Platform Settings
GET    /settings                 - Get all settings
PUT    /settings/card-prices     - Update card prices
PUT    /settings/commissions     - Update commissions
PUT    /settings/referral-bonuses - Update referral bonuses
GET    /settings/card-types      - Get card types
POST   /settings/card-types      - Create card type
PUT    /settings/card-types/{id} - Update card type

# SMS & Communications
POST   /sms/send                 - Send SMS
POST   /sms/send-bulk            - Send bulk SMS
GET    /sms/templates            - Get SMS templates
POST   /sms/templates            - Create template

# MoMo Verification
POST   /momo/verify              - Verify MoMo number
GET    /momo/verifications       - List verifications
```

## MERCHANT ROUTES (/api/merchants)
```
# Dashboard & Stats
GET    /dashboard                - Merchant dashboard
GET    /stats                    - Merchant statistics
GET    /transactions             - Transaction history
GET    /transactions/export      - Export transactions

# Payment Operations
POST   /collect                  - Collect payment from client
GET    /payments/{payment_id}    - Get payment status

# Debit Account (Cash Acceptance)
GET    /debit-account            - Get debit account info
POST   /debit-account/topup      - Top up debit account
POST   /debit-account/pay        - Pay using debit account
GET    /debit-account/transactions - Debit transactions

# Withdrawal
POST   /withdraw                 - Withdraw earnings
GET    /withdrawals              - List withdrawals

# Settings
GET    /settings                 - Get settings
PUT    /settings                 - Update settings
POST   /settings/pin/set         - Set transaction PIN
POST   /settings/pin/change      - Change PIN
POST   /settings/pin/forgot      - Reset PIN

# API Keys (External Integration)
GET    /api-keys                 - List API keys
POST   /api-keys                 - Generate new API key
DELETE /api-keys/{key_id}        - Revoke API key
```

## PAYMENT ROUTES (/api/payments)
```
# Card Purchase & Upgrade
POST   /card/initiate            - Initiate card purchase
GET    /card/status/{reference}  - Check payment status
POST   /cards/upgrade            - Upgrade card (client route)

# Merchant Payments
POST   /merchant/initiate        - Client pays merchant
POST   /merchant/collect         - Merchant collects payment
GET    /merchant/status/{ref}    - Check payment status

# Withdrawals  
POST   /cashback/withdraw        - Withdraw cashback
GET    /withdrawal/status/{id}   - Check withdrawal status
POST   /withdrawal/callback      - Hubtel callback

# Callbacks (Hubtel)
POST   /hubtel/callback          - Collection callback
POST   /hubtel/checkout/callback - Checkout callback
POST   /hubtel/transfer-callback - Transfer callback
```

## CLIENT SERVICES (/api/services)
```
# Airtime
POST   /airtime/purchase         - Buy airtime (Hubtel VAS)
GET    /airtime/networks         - Get networks

# Data Bundles
GET    /data/bundles             - Get available bundles
POST   /data/purchase            - Buy data bundle (Hubtel VAS)

# ECG (Electricity)
POST   /ecg/pay                  - Pay ECG bill (Hubtel VAS)

# Withdrawals
POST   /withdrawal/initiate      - Withdraw to MoMo (Hubtel Send)
GET    /withdrawal/status/{id}   - Check status

# History
GET    /transactions             - Transaction history
```

## CLIENT ROUTES (/api/clients)
```
# Dashboard
GET    /dashboard                - Client dashboard
GET    /profile                  - Get profile
PUT    /profile                  - Update profile

# Cards
GET    /cards                    - List cards
POST   /cards/purchase           - Purchase card
POST   /cards/upgrade            - Upgrade card

# Transactions
GET    /transactions             - Transaction history
GET    /cashback/history         - Cashback history

# Referrals
GET    /referrals                - Referral stats
GET    /referrals/code           - Get referral code
```

## AUTH ROUTES (/api/auth)
```
# Client Auth
POST   /client/register          - Register client
POST   /client/login             - Login client
POST   /client/verify-otp        - Verify OTP
POST   /client/resend-otp        - Resend OTP

# Merchant Auth  
POST   /merchant/register        - Register merchant
POST   /merchant/login           - Login merchant

# Admin Auth
POST   /admin/login              - Login admin

# Password Reset
POST   /forgot-password          - Request reset
POST   /reset-password           - Reset password
```

---
Last updated: 2026-03-16
