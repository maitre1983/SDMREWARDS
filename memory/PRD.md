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

## AI Assistant Layer - Phase 1A - COMPLETED 2026-03-12

### Overview
Intelligent AI layer integrated into the client dashboard, powered by **Gemini 3 Flash** via Emergent LLM Key.

### Features Implemented
- [x] **Spending Analysis Engine** - Analyzes 90 days of transaction history
  - Transaction patterns detection
  - Merchant loyalty tracking
  - Payment method analysis
  - Daily spending averages
  
- [x] **AI-Powered Insights** (Gemini)
  - Personalized spending summaries
  - Pattern identification (3 key observations)
  - Savings tips generation
  - Savings Score (1-100)

- [x] **Merchant Recommendations**
  - AI-generated recommendations based on user history
  - Potential savings tips per merchant
  - New merchant discovery suggestions

- [x] **Basic Fraud Detection**
  - Spending spike detection (3x normal)
  - Rapid successive transaction alerts
  - Large transactions at new merchants
  - Risk score calculation (0-100)

- [x] **Cashback Tips**
  - Referral program suggestions
  - High cashback merchant recommendations
  - Card upgrade suggestions
  - Payment method optimization

- [x] **AI Chat**
  - Real-time conversation with AI assistant
  - Context-aware responses (spending history, balance)
  - Quick suggestion buttons
  - Multi-language support (EN/FR)

- [x] **UI Components**
  - AI Widget on Client Home dashboard
  - Dedicated "My AI Assistant" page
  - 6 navigation tabs: Overview, Spending, Recommendations, Tips, Security, Chat

### API Endpoints Created
- `GET /api/ai/dashboard` - Complete AI dashboard data
- `GET /api/ai/spending-analysis` - Spending patterns analysis
- `GET /api/ai/recommendations` - Merchant recommendations
- `GET /api/ai/cashback-tips` - Personalized savings tips
- `GET /api/ai/fraud-check` - Fraud detection status
- `POST /api/ai/chat` - AI chat conversation
- `GET /api/ai/detect-language` - Language detection helper

### Files Created
- `/app/backend/services/ai_service.py` - Core AI service with Gemini integration
- `/app/backend/routers/ai.py` - AI API endpoints
- `/app/frontend/src/components/client/AIAssistant.jsx` - Main AI Assistant UI
- `/app/frontend/src/components/client/AIWidget.jsx` - Compact widget for home

---

## Smart Notifications System - Phase 1C - COMPLETED 2026-03-12

### Overview
Intelligent notification system that sends proactive alerts to clients via multiple channels.

### Features Implemented
- [x] **Multi-Channel Notifications**
  - Push notifications via OneSignal
  - SMS via BulkClix
  - Email via Resend

- [x] **Notification Preferences**
  - Per-channel enable/disable
  - Per-type enable/disable (cashback, recommendations, security, promotional)
  - Quiet hours configuration

- [x] **Smart Notification Triggers**
  - Cashback opportunity alerts (AI-powered)
  - Security alert notifications
  - Inactive user reminders
  - Weekly spending summaries
  - Instant cashback earned notifications

- [x] **Client UI**
  - Notification settings modal (bell icon in header)
  - Test notification buttons
  - Notification history view
  - Quiet hours configuration

### API Endpoints Created
- `GET /api/notifications/preferences` - Get notification preferences
- `PUT /api/notifications/preferences` - Update preferences
- `GET /api/notifications/history` - Get notification history
- `POST /api/notifications/test` - Send test notification
- `POST /api/notifications/trigger/cashback-opportunities` - Trigger AI recommendation notification
- `POST /api/notifications/trigger/security-check` - Trigger security check
- `POST /api/notifications/trigger/weekly-summary` - Trigger weekly summary
- `POST /api/notifications/admin/process-daily` - Batch process daily notifications
- `POST /api/notifications/admin/process-inactive` - Process inactive user notifications

### Files Created
- `/app/backend/services/notification_service.py` - Core notification service
- `/app/backend/routers/notifications.py` - Notification API endpoints
- `/app/frontend/src/components/client/NotificationSettings.jsx` - Settings UI

---

## Auto Language Detection - Phase 1B - COMPLETED 2026-03-12

### Overview
Automatic language detection based on browser/phone settings with server-side persistence.

### Features Implemented
- [x] **Language Detection**
  - From HTTP Accept-Language header
  - From browser's navigator.languages array
  - Priority: browser_languages > accept_language > default (en)

- [x] **Supported Languages**
  - English (en) - Default
  - French (fr)

- [x] **Language Persistence**
  - Auto-detect on first visit
  - Store preference in database
  - Manual override via settings
  - Sync across devices

- [x] **React Integration**
  - LanguageContext provider
  - useLanguage hook
  - LanguageSelector component
  - Auto-sync after login

- [x] **Translation System**
  - Server-side translation dictionary
  - Dynamic translation loading
  - Common UI translations (dashboard, AI, notifications)

### API Endpoints Created
- `GET /api/language/supported` - Get supported languages
- `GET /api/language/translations/{lang}` - Get UI translations
- `POST /api/language/detect` - Detect language (public)
- `GET /api/language/preference` - Get user's language
- `PUT /api/language/preference` - Set user's language
- `POST /api/language/auto-detect` - Auto-detect and save

### Files Created
- `/app/backend/services/language_service.py` - Language detection service
- `/app/backend/routers/language.py` - Language API endpoints
- `/app/frontend/src/contexts/LanguageContext.jsx` - React context & hook

---

## Scheduled Tasks (Cron Jobs) - COMPLETED 2026-03-12

### Scripts Created
- `/app/backend/scripts/scheduled_tasks.py` - Task runner
- `/app/backend/scripts/crontab.example` - Example crontab configuration

### Available Tasks
- `daily-notifications` - Send daily AI-powered notifications (10:00 AM)
- `inactive-reminders` - Remind inactive users (Mon/Thu 2:00 PM)
- `weekly-summaries` - Weekly spending summaries (Sun 9:00 AM)
- `security-checks` - Fraud detection checks (Daily 3:00 AM)

### Usage
```bash
# Run manually
cd /app/backend && python scripts/scheduled_tasks.py daily-notifications

# Add to crontab
crontab -e
# Add: 0 10 * * * cd /app/backend && python scripts/scheduled_tasks.py daily-notifications
```

---

## Future Tasks (Backlog)

1. **Client Cashback History** - Detailed usage view
2. **ECG Payment** - Full integration
3. **Two-Factor Authentication (2FA)**
4. **AI Phase 1B** - Auto language detection from phone/keyboard
5. **AI Phase 1C** - Smart notifications via Push/SMS/Email

---

## Key Files Modified (2026-03-12)

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
- **Emergent LLM Key:** AI-powered features
  - GPT-5.2 for SEO analysis
  - Gemini 3 Flash for AI Assistant (spending analysis, recommendations, chat)
- **Resend:** Transactional emails from Admin panel
- **Google Analytics 4:** Visitor tracking (placeholder added)
