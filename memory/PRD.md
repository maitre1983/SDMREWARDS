# SDM REWARDS - Product Requirements Document

## Overview
SDM REWARDS is a digital loyalty and cashback platform for Ghana, featuring VIP card purchases, QR payments, referral bonuses, and comprehensive admin/merchant dashboards.

## Core Requirements
- **Language:** English (primary) with French option available
- **Theme:** Dark fintech aesthetic with blue/gold accents
- **Authentication:** JWT-based with OTP verification via BulkClix
- **Payments:** BulkClix Mobile Money (MoMo) integration - LIVE

## System Status
**PRODUCTION MODE** - All BulkClix integrations are live:
- `PAYMENT_TEST_MODE=false`
- `SMS_TEST_MODE=false`

## Tech Stack
- **Backend:** FastAPI, MongoDB (motor), JWT, Pydantic
- **Frontend:** React, Tailwind CSS, Shadcn/UI, recharts, qrcode.react
- **Mobile:** React Native (CashPaymentScreen tested and working)
- **3rd Party:** BulkClix (payments, SMS, OTP, Airtime, Data Bundles), OneSignal (push notifications)
- **AI/LLM:** Emergent LLM Key (OpenAI GPT-5.2 for SEO analysis)

---

## Completed Features (Updated 2026-03-11)

### Platform Language & SEO (100%) - COMPLETED 2026-03-11
- [x] **English as Primary Language** - Entire platform translated to English
- [x] **Advanced SEO Optimization** - Sitemap, robots.txt, meta tags, structured data
- [x] **AI-Powered SEO Dashboard** - Keyword analysis, content generation, recommendations

### Mobile App Cash Payment (100%) - TESTED 2026-03-11
- [x] Backend endpoints verified and working:
  - `/api/merchants/debit-account` - Returns merchant debit account status
  - `/api/merchants/debit-history` - Returns cash transaction history
  - `/api/merchants/search-customer` - Finds customers by phone
  - `/api/merchants/cash-transaction` - Records cash payments
  - `/api/merchants/topup-debit-account` - Top up debit balance

### Cash Payment Confirmation Feature - COMPLETED & TESTED 2026-03-11
Fraud prevention system for cash payments:
- **Flow**: Client pays cash → Status: `pending_confirmation` → Merchant confirms → Cashback credited
- **Limits**: Max 3 pending confirmations per customer (enforced)
- **Timeout**: Auto-expires after 72 hours if not confirmed
- **Rejection**: Customer notified via SMS if merchant rejects payment
- **Merchant UI**: New "Pending Confirmations" section in Cash tab with Confirm/Reject buttons
- **Client UI**: Shows "Awaiting Confirmation" status and pending cashback amount
- **Admin**: Pending count shown in dashboard overview
- **Testing**: 100% pass rate - all flows verified (see /app/test_reports/iteration_48.json)

### 🔴 BUG FIX: Merchant Debit Account Debiting - FIXED & TESTED 2026-03-11
**Critical Financial Bug Fixed:**
- **Problem**: When a merchant confirmed a cash payment, the client received cashback but the merchant's `debit_account.balance` was NOT debited
- **Root Cause**: The `confirm_cash_payment` endpoint in `/app/backend/routers/merchants.py` was missing the `$inc: {"debit_account.balance": -cashback_amount}` in the db.merchants update
- **Fix**: Added `"debit_account.balance": -cashback_amount` to the `$inc` operation at line 1365
- **Testing**: 100% pass rate - verified with 2 transactions (see /app/test_reports/iteration_49.json)

### ✅ NEW: Push Notification for Pending Cash Payments - IMPLEMENTED 2026-03-11
**Feature**: Merchants receive a OneSignal push notification when a client initiates a cash payment.
- **Implementation**: Added notification in `/app/backend/routers/payments.py` (function `initiate_cash_payment`)
- **Notification content**: "💵 Pending Cash Payment - {client_name} paid GHS {amount} in cash. Please confirm receipt."
- **Data payload**: Includes `transaction_id`, `amount`, `client_name`, `cashback_amount` for deep linking
- **Note**: Requires merchant to have registered their device with OneSignal to receive notifications

### ✅ HomePage UI Improvements - IMPLEMENTED 2026-03-11
**1. CTA Buttons ("I'm a Customer" / "I'm a Merchant") - Made Highly Visible:**
- Increased size (py-8, text-xl, font-bold)
- Distinct colors: Orange gradient for Customer, Green gradient for Merchant
- Added icons (Users, Store) and arrow indicators
- Added hover scale effect and shadow
- Full-width buttons stacked vertically for clarity
- Both English ("I'm a Customer/Merchant") and French ("Je suis Client/Marchand") translations

**2. Services Restructured:**
- Removed individual "Airtime", "Data", "ECG" from home screen
- New structure with 3 main options:
  1. **Pay Merchants with QR** - Scan QR to pay and earn cashback
  2. **Earn Cashback Rewards** - Get rewarded on every purchase
  3. **Pay All Services** - Groups Airtime, Data, ECG and more
- New "What You Can Do" / "Ce Que Vous Pouvez Faire" section
- Responsive design: grid on desktop, stacked on mobile

**Files modified:**
- `/app/frontend/src/pages/HomePage.jsx` - CTA buttons & Quick Services section
- `/app/frontend/src/translations.js` - New translations for services

### ✅ Mobile App (React Native) UI Improvements - IMPLEMENTED 2026-03-11
**WelcomeScreen modifications (`/app/mobile/src/screens/auth/WelcomeScreen.js`):**

**1. CTA Buttons - Highly Visible:**
- **"I'm a Customer"**: Orange gradient button (#F59E0B → #EA580C), paddingVertical: 22px, fontSize: 20, fontWeight: bold
- **"I'm a Merchant"**: Green gradient button (#10B981 → #059669), same prominent styling
- Both buttons have icons (person/storefront), arrow indicators, and shadow effects
- Uses `LinearGradient` for modern gradient effect

**2. Services Restructured (3 instead of 4):**
- **Pay Merchants with QR** (orange icon)
- **Earn Cashback Rewards** (green icon)
- **Pay All Services** (purple icon) with subText: "Airtime, Data, ECG +more"
- Removed separate "Buy airtime & data" and "ECG Payment" options

### ✅ Mobile App - Pending Confirmations Feature - IMPLEMENTED 2026-03-11
**MerchantHomeScreen now displays pending cash payment confirmations:**

**Files Modified:**
- `/app/mobile/src/services/api.js` - Added 3 new endpoints:
  - `getPendingConfirmations()` - Fetch pending cash payments
  - `confirmCashPayment(transactionId)` - Confirm a cash payment
  - `rejectCashPayment(transactionId, reason)` - Reject a cash payment
  
- `/app/mobile/src/screens/merchant/HomeScreen.js` - Added:
  - State: `pendingConfirmations`, `processingConfirm`
  - Functions: `handleConfirmPayment`, `handleRejectPayment`
  - UI: New "Pending Confirmations" section with badge, customer info, amount, and Confirm/Reject buttons
  - Styles: `pendingSection`, `pendingItem`, `confirmBtn`, `rejectBtn`, etc.

**Backend Endpoints Tested:**
- ✅ `GET /api/merchants/pending-confirmations` - Returns pending transactions
- ✅ `POST /api/merchants/confirm-cash-payment/{id}` - Confirms payment, debits merchant, credits client
- ✅ `POST /api/merchants/reject-cash-payment/{id}` - Rejects payment, notifies client

### ✅ SMS Alert at 75%/90% Debit Limit - IMPLEMENTED 2026-03-11
**Automatic SMS alerts when merchant debit account reaches threshold:**
- **75% Alert**: "⚠️ SDM REWARDS ALERT: Your debit account has reached X% of your limit..."
- **90% Alert**: "🚨 SDM REWARDS URGENT: Your debit account is at X% capacity! Top up NOW..."
- **100% Block**: Account blocked with SMS notification
- Alerts are sent only once per 24 hours per threshold
- Stored in `debit_alerts` collection for tracking

**File Modified:** `/app/backend/routers/merchants.py` (confirm_cash_payment function)

### ✅ Monthly Merchant Statements - IMPLEMENTED 2026-03-11
**Downloadable monthly financial statements for merchants:**

**Backend Endpoints (3 new):**
- `GET /api/merchants/statements` - List available months
- `GET /api/merchants/statements/{year}/{month}` - Detailed statement with:
  - Summary (transactions, sales, cashback, average)
  - Payment methods breakdown
  - Daily summary
  - Transaction list
- `GET /api/merchants/statements/{year}/{month}/download` - Download CSV

**Frontend Component:** `/app/frontend/src/components/merchant/MonthlyStatements.jsx`
- Statement list view with download buttons
- Detailed statement view with all statistics
- CSV download functionality

**Access:** Merchant Dashboard > Settings > Relevés

### AdminDashboard Refactoring - COMPLETED 2026-03-11
Successfully extracted settings section into modular components:
- **AdminDashboard.jsx**: Reduced from 3,837 to 2,866 lines (25% reduction)
- Created 8 modular settings components (2,110 lines total):
  - `AdminSettings.jsx` - Main orchestrator (160 lines)
  - `SettingsCards.jsx` - Card pricing (230 lines)
  - `SettingsServices.jsx` - Service fees (158 lines)
  - `SettingsReferrals.jsx` - Referral bonuses (141 lines)
  - `SettingsDebit.jsx` - Merchant debit management (296 lines)
  - `SettingsUsers.jsx` - Manual user creation (299 lines)
  - `SettingsSMS.jsx` - Bulk SMS & push notifications (300 lines)
  - `SettingsSecurity.jsx` - PIN & password management (272 lines)
  - `SettingsAdmins.jsx` - Admin user management (230 lines)

**Status:** FULLY INTEGRATED AND TESTED ✅

### Flexible Payment System (100%)
- [x] Four payment methods for merchants: MoMo, Cash, Cashback, Hybrid
- [x] Services (Airtime, Data, ECG) - Cashback only payments

### Authentication & Users (100%)
- [x] Client, Merchant, Admin authentication flows
- [x] OTP verification via BulkClix

### Admin Dashboard (95%)
- [x] Overview, Clients, Merchants, SEO tabs
- [x] Settings tab with 8 sub-sections
- [ ] Full refactoring to use modular components

### Services Hub (100% for implemented services)
- [x] Airtime, Data, Card Upgrade, MoMo Withdrawal
- [ ] ECG Payment - Waiting for API documentation

### Merchant Auto-Payout System (100%)
- [x] All payout features implemented and working

---

## Upcoming Tasks

### P1 - Google Analytics Setup
Replace `GA_MEASUREMENT_ID` placeholder in `/app/frontend/public/index.html` with actual tracking ID.

### P2 - Further Code Organization (Optional)
Consider extracting more sections from AdminDashboard.jsx:
- Client/Merchant detail modals
- Transaction history modal
- SMS sending modal

---

## Future Tasks (Backlog)

1. **Client Cashback History** - Detailed usage view
2. **Automated Debit Alert** - SMS at 75% limit
3. **Merchant Statements** - Monthly reports
4. **ECG Payment** - Full integration
5. **Two-Factor Authentication (2FA)**

---

## Key Files Modified (2026-03-11)

### New Files Created
- `/app/backend/routers/seo.py` - SEO API endpoints
- `/app/frontend/src/components/admin/SEODashboard.jsx` - AI SEO dashboard
- `/app/frontend/src/components/admin/AdminSettings.jsx` - Settings orchestrator
- `/app/frontend/src/components/admin/settings/*.jsx` - 8 modular settings components

### Files Translated (French → English)
- `/app/frontend/src/components/merchant/PinSettings.jsx`
- `/app/frontend/src/components/merchant/CashierManager.jsx`
- `/app/frontend/src/components/merchant/ForgotPinModal.jsx`
- `/app/frontend/src/components/admin/SDMCommissionsPanel.jsx`
- `/app/frontend/src/components/admin/CardTypesManager.jsx`
- `/app/frontend/src/components/admin/TransactionHistoryPanel.jsx`
- `/app/frontend/src/components/admin/UsersAndMerchantsPanel.jsx`
- `/app/frontend/src/components/admin/FintechDashboard.jsx`
- `/app/frontend/src/components/merchant/AdvancedDashboard.jsx`

---

## Test Credentials

**Admin:** URL: `/admin{DDMMYY}`, Email: emileparfait2003@gmail.com, Password: password
**Client:** Phone: +233555861556, Password: 000000
**Merchant:** Phone: +233555123456, Password: 000000

---

## 3rd Party Integrations
- **BulkClix:** SMS, Payments, OTP, Airtime, Data Bundles
- **OneSignal:** Web push notifications
- **Emergent LLM Key:** AI-powered SEO analysis (GPT-5.2)
- **Google Analytics 4:** Visitor tracking (placeholder added)
