# SDM REWARDS - Product Requirements Document

## Overview
SDM REWARDS is a digital loyalty and cashback platform for Ghana, featuring VIP card purchases, QR payments, referral bonuses, and comprehensive admin/merchant dashboards.

## Core Requirements
- **Language:** English (fully migrated from French)
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
- **3rd Party:** BulkClix (payments, SMS, OTP, Airtime, Data Bundles)

---

## Completed Features

### Authentication & Users (100%)
- [x] Client registration with OTP verification
- [x] Merchant registration with OTP verification  
- [x] Admin authentication with dynamic URL
- [x] Super admin account management
- [x] JWT token-based sessions

### Admin Dashboard (95%)
- [x] Advanced analytics (commissions, service fees, monthly drill-down)
- [x] Client management (view, edit, activate/deactivate)
- [x] Merchant management (view, edit, activate/deactivate)
- [x] Settings panel (cards, commissions, SMS templates, security)
- [x] Monthly analytics with month picker
- [x] Super admin PIN change functionality
- [x] Partial refactoring (Overview, Clients, Merchants tabs extracted)
- [x] Merchant payouts management (view payout history)
- [ ] Settings tab sub-components extraction (IN PROGRESS)

### Services Hub (100% for implemented services)
- [x] **Airtime Purchase** - BulkClix API integration (MTN, Telecel, AirtelTigo)
- [x] **Data Bundle Purchase** - Real BulkClix API with recipient validation (COMPLETED 2026-03-08)
- [x] **Card Upgrade** - Upgrade membership with MoMo + cashback options
- [x] **MoMo Withdrawal** - Withdraw cashback to mobile money
- [ ] ECG Payment - Waiting for API documentation

### Merchant Auto-Payout System (100%)
- [x] Automatic payout to merchant MoMo on customer payment
- [x] IP whitelist configured (34.170.12.145)
- [x] Payout status tracking (pending, completed, failed)
- [x] Admin view of all merchant payouts
- [x] Merchant view of own payout history
- [x] Bank transfer payout option (COMPLETED 2026-03-08)
- [x] Bank account verification via BulkClix API
- [x] Preferred payout method toggle (MoMo vs Bank)

### Merchant Dashboard (100%)
- [x] Sales statistics and charts
- [x] PIN management
- [x] Cashier CRUD operations
- [x] Business info editing
- [x] Transaction history page with filters, pagination, and export

### Client Dashboard (100%)
- [x] Card validity display (status, days remaining)
- [x] Shareable referral QR code
- [x] Card upgrade workflow
- [x] "INACTIVE" status for users without cards

### Payments & SMS (100%)
- [x] BulkClix MoMo collection (production)
- [x] BulkClix disbursement (production)
- [x] Native OTP via BulkClix API
- [x] SMS notifications (card purchase, referral bonus)
- [x] Card expiry reminder endpoint

### SEO Package (100%)
- [x] robots.txt
- [x] sitemap.xml
- [x] English meta descriptions

---

## In Progress

### P1 - AdminDashboard.jsx Refactoring
**Status:** IN PROGRESS
- [x] Extract Overview tab → `AdminOverview.jsx`
- [x] Extract Clients tab → `AdminClients.jsx`
- [x] Extract Merchants tab → `AdminMerchants.jsx`
- [ ] Extract Settings > Cards → `AdminSettingsCards.jsx`
- [ ] Extract Settings > Commissions → `AdminSettingsCommissions.jsx`
- [ ] Extract Settings > SMS → `AdminSettingsSMS.jsx`
- [ ] Extract Settings > Security → `AdminSettingsSecurity.jsx`
- [ ] Extract Settings > Users → `AdminSettingsUsers.jsx`

---

## Upcoming Tasks (Priority Order)

### P0 - Mobile App Feature Parity (COMPLETED)
- [x] Client Dashboard matching web design - COMPLETED 2026-03-09
- [x] Partners Screen (merchant list) - COMPLETED 2026-03-09
- [x] QR Scanner with payment flow - COMPLETED 2026-03-09
- [x] History Screen - Transaction history with filters - COMPLETED 2026-03-09
- [x] Referrals Screen - QR code sharing, referral list - COMPLETED 2026-03-09
- [x] Services Screen - Airtime & Data Bundle purchases - COMPLETED 2026-03-09
- [x] Withdrawal Screen - Cashback to MoMo - COMPLETED 2026-03-09
- [x] Profile Screen - User settings with modals - COMPLETED 2026-03-09
- [x] Merchant Dashboard - QR code, sales stats - COMPLETED 2026-03-09
- [x] Card Screen - Purchase & Upgrade cards - COMPLETED 2026-03-09
- [x] Merchant History Screen - Full transaction history - COMPLETED 2026-03-09
- [x] Merchant Settings Screen - Business info, cashback rate, payout - COMPLETED 2026-03-09
- [x] Contacts Integration - Invite from phone contacts - COMPLETED 2026-03-09
- [x] Forgot Password - Password reset with OTP for client & merchant - COMPLETED 2026-03-09

### P1 - Services Feature Completion
- [x] Airtime purchase with BulkClix API - COMPLETED
- [x] Data Bundle purchase with BulkClix API - COMPLETED 2026-03-08
- [ ] ECG Payment - Waiting for API documentation from user

### P1 - AdminDashboard.jsx Refactoring (Settings)
- Extract Settings > Cards → `AdminSettingsCards.jsx`
- Extract Settings > Commissions → `AdminSettingsCommissions.jsx`
- Extract Settings > SMS → `AdminSettingsSMS.jsx`
- Extract Settings > Security → `AdminSettingsSecurity.jsx`
- Extract Settings > Users → `AdminSettingsUsers.jsx`

### P1 - ClientDashboard.jsx Refactoring (COMPLETED 2026-03-09)
- [x] MerchantPayModal extracted and wired
- [x] WithdrawalModal extracted and wired
- [x] PaymentSettingsModal extracted and wired
- [x] **Old inline modal code REMOVED** - 842 lines deleted
- [x] Feature flag USE_REFACTORED_MODALS removed
- File reduced from 2696 lines to 1854 lines

### P2 - Backend Refactoring
- [ ] Split `admin.py` (~2661 lines) into smaller files:
  - `admin_clients.py` - Client management endpoints
  - `admin_merchants.py` - Merchant management endpoints
  - `admin_settings.py` - Platform settings endpoints
  - `admin_analytics.py` - Dashboard and analytics endpoints
  - NOTE: Kept as-is for stability. Can be done incrementally when adding new features.

### P2 - Minor Issues
- [x] Fix datetime timezone error in admin.py (settings PIN lock)
- [x] Fix bcrypt attribute error (downgraded to 3.2.2) - COMPLETED 2026-03-09
- [ ] Admin UI for payment provider logos

---

## Future/Backlog
- Mobile Application (React Native)
- Advanced SEO strategies
- Split `payments.py` into collection/disbursement files

---

## Key Files
- `/app/backend/routers/auth.py` - Authentication + OTP (BulkClix native)
- `/app/backend/routers/payments.py` - MoMo payments
- `/app/backend/routers/admin.py` - Admin endpoints (needs refactoring)
- `/app/frontend/src/pages/AdminDashboard.jsx` - Main admin UI (partially refactored)
- `/app/frontend/src/components/admin/` - Extracted admin components

---

## Mobile Application (NEW - 2026-03-09)

### Overview
SDM Rewards mobile app built with **Expo/React Native** for iOS and Android.
Web preview accessible at: `/mobile` path on the main domain.

### Implemented Features
- **Authentication Flow**
  - Welcome screen with animated logo, particles, staggered feature list
  - Login screen with animated form and gradient buttons
  - Registration with OTP verification
  - Secure token storage (expo-secure-store for native, localStorage for web)

- **Client Dashboard (COMPLETED 2026-03-09)**
  - Header with animated logo, greeting message, profile/logout icons
  - Main balance card with gradient, member badge, Total Earned/Spent
  - Action buttons: Services, Withdraw, Settings
  - Stats cards: Referrals count, Bonus Earned (with animations)
  - Recent Activity list with transaction icons
  - Custom bottom navigation: Home, Partners, QR (elevated), History, Referrals

- **Partners Screen (NEW - 2026-03-09)**
  - Search bar with instant filtering
  - City filter chips (All, Accra, Kumasi, Tamale, Takoradi, Cape Coast)
  - Merchant cards with:
    - Business name and type
    - Cashback rate badge
    - Address and phone (clickable to call)
    - "Directions" button (opens Google Maps)
    - "Pay" button (navigates to payment flow)
  - Animated card entrance effects
  - Pull-to-refresh support

- **QR Scanner Screen (ENHANCED 2026-03-09)**
  - Camera-based QR scanning with permission handling
  - Direct payment modal when merchant passed from Partners
  - Payment form: phone, network selector, amount
  - Cashback preview calculation
  - Payment status tracking (pending, success, failed)
  - Test mode support for development

- **Merchant Features**
  - Home dashboard with QR code display
  - Sales statistics and transaction list
  - QR code sharing functionality
  - Bottom tab navigation

### Technical Stack
- Expo SDK 55
- React Navigation (Stack + Bottom Tabs)
- expo-camera for QR scanning
- react-native-qrcode-svg for QR generation
- expo-linear-gradient for gradient backgrounds
- expo-secure-store for secure storage (native)
- localStorage fallback for web
- axios for API calls
- Animated API for smooth transitions

### Project Structure
```
/app/mobile/
├── App.js                    # Main entry + navigation
├── app.json                  # Expo config
├── src/
│   ├── components/Common.js  # Reusable UI components
│   ├── contexts/AuthContext.js
│   ├── services/api.js       # API service layer (with publicAPI)
│   ├── utils/constants.js    # Theme & helpers
│   └── screens/
│       ├── auth/             # Welcome, Login, Register
│       ├── client/
│       │   ├── HomeScreen.js      # Dashboard (animated)
│       │   ├── PartnersScreen.js  # Merchant list (NEW)
│       │   └── QRScannerScreen.js # Scanner + payment modal
│       └── merchant/         # Merchant screens
│       ├── client/           # Home, QRScanner
│       └── merchant/         # Home
```

### Completed Screens
- [x] History Screen - Transaction history with filters - COMPLETED 2026-03-09
- [x] Profile Screen - User settings with modals - COMPLETED 2026-03-09
- [x] Services Screen - Airtime & Data Bundle purchases - COMPLETED 2026-03-09
- [x] Withdrawal Screen - Cashback to MoMo - COMPLETED 2026-03-09
- [x] Referrals Screen - QR code sharing, referral list - COMPLETED 2026-03-09
- [x] Card Screen - Purchase & Upgrade membership cards - COMPLETED 2026-03-09

### How to Run
```bash
cd /app/mobile
npm install
npx expo start
```

---

## Recent Changes (2026-03-09)
- **✅ Mobile Card Purchase/Upgrade Feature (COMPLETED):**
  - Implemented full UI in `/app/mobile/src/screens/client/CardScreen.js`
  - Shows available cards: Silver, Gold, Platinum, Diamond
  - Current card badge with expiration date
  - Available cashback display
  - Purchase modal with 3 payment methods:
    - Mobile Money (full amount)
    - Full Cashback (when balance sufficient)
    - Combined (partial cashback + MoMo for remainder)
  - Network selector for MoMo payments
  - Payment summary breakdown
  - Backend fix: Added cashback deduction in card purchase endpoint
  - Tested: Purchase with cashback works (50 GHS balance → Silver card purchase → 26 GHS remaining)
  - Tested: Upgrade with combined payment (cashback + MoMo pending)

- **✅ Merchant Mobile Features (COMPLETED):**
  - Created dedicated `/app/mobile/src/screens/merchant/HistoryScreen.js`:
    - Full transaction history with search and filters
    - Date filters (All Time, Today, This Week, This Month)
    - Stats summary (Total Sales, Transactions, Cashback Paid)
    - Export transactions via share
  - Created dedicated `/app/mobile/src/screens/merchant/SettingsScreen.js`:
    - Business Information editing
    - Cashback Rate management (0-50%)
    - Payout Settings (MoMo network & number)
    - PIN change placeholder
    - Help & Support link
    - Logout with confirmation

- **✅ Forgot Password Feature (COMPLETED):**
  - Created `/app/mobile/src/screens/auth/ForgotPasswordScreen.js`
  - 3-step flow: Phone → OTP → New Password
  - Progress bar showing current step
  - Password validation with visual hints
  - Success screen with navigation back to login
  - Backend endpoints added in `/app/backend/routers/auth.py`:
    - `POST /api/auth/client/reset-password`
    - `POST /api/auth/merchant/reset-password`
  - Test mode: Use OTP `123456` when BulkClix not configured
  - "Forgot Password?" link added to LoginScreen

- **✅ Contacts Integration for Referrals (COMPLETED):**
  - Created `/app/mobile/src/screens/client/ContactsScreen.js`
  - Permission request for contacts access
  - Filters Ghana phone numbers only (+233)
  - Synchronization with existing referrals:
    - Shows "SDM Member" badge for contacts already registered
    - Shows "Invited" badge for pending referrals
    - Allows inviting non-member contacts
  - Multiple selection with bulk invite
  - WhatsApp and SMS quick invite buttons
  - Alphabet index for quick navigation
  - Search contacts by name or phone
  - "Invite from Contacts" button added to Referrals screen


- **✅ SMS Bulk Sending - Verified Working:**
  - Tested bulk SMS to clients endpoint - 12/13 messages sent successfully
  - BulkClix returns campaignId confirming acceptance
  - Failed messages are due to invalid phone numbers in DB (test data)
- **✅ bcrypt Error Fixed:**
  - Downgraded bcrypt from 4.1.3 to 3.2.2
  - No more `AttributeError: module 'bcrypt' has no attribute '__about__'` in logs
- **✅ MoMo Withdrawal Fee Configuration:**
  - Admin Dashboard Service Fees shows all 5 services: Airtime, Data, ECG, Merchant Payment, MoMo Withdrawal
  - Admin can set withdrawal fee type (percentage or fixed) and rate
  - Backend reads fee from platform_config.service_commissions.withdrawal
  - New endpoint: GET /api/payments/withdrawal/fee
  - Withdrawal API now calculates and deducts fee, sends net amount to user
  - WithdrawalModal displays fee breakdown before confirming
- **✅ Service Commissions Loading Fixed:**
  - AdminDashboard now loads service_commissions from config on startup
  - Ensures saved values are displayed correctly when reopening settings
- **✅ Withdrawal SMS Notification:**
  - Automatic SMS sent after successful withdrawal
  - Shows net amount received (without fee details)
  - Works in both test mode and production mode

## Recent Changes (2026-03-08)
- **✅ Merchant Auto-Payout System Verified & Enhanced:**
  - Confirmed merchant receives money immediately when customer pays (via BulkClix disbursement API)
  - Added `merchant_payouts` collection to track all payouts
  - Added `GET /api/merchants/payouts` endpoint for merchant dashboard
  - Added `GET /api/admin/merchant-payouts` endpoint for admin dashboard
  - Payout flow: Customer pays GHS 10 → 5% cashback (GHS 0.50) → Merchant receives GHS 9.50
  - Enhanced logging for debugging payout issues
- **✅ Client Withdrawal Method Choice (MoMo or Bank):**
  - Added "Payment Settings" modal where clients configure their MoMo and Bank account details
  - Withdrawal modal now offers choice between "Mobile Money" (Instant) and "Bank Account" (1-3 days)
  - Clients can set their preferred default withdrawal method
  - Settings button added next to Withdraw button on dashboard
  - Backend endpoints: GET/PUT `/api/clients/payment-settings`
- **✅ Auto-Pay Merchant on Customer Payment:**
  - When a customer pays a merchant, the merchant's share is automatically transferred to their configured MoMo account
  - Uses BulkClix disbursement API (`/payment-api/send/mobilemoney`)
  - Merchant share = Payment Amount - Cashback (e.g., on GHS 100 with 5% cashback, merchant receives GHS 95)
  - SMS notification sent to merchant with payout details
  - Payout records stored in `merchant_payouts` collection for tracking
  - Works with all networks: MTN, Telecel, AirtelTigo
- **✅ Added All Mobile Networks to Merchant Payment Form:**
  - Added phone number input field with placeholder showing registered number
  - Added network selector dropdown with MTN, Telecel, AirtelTigo options
  - Form accessible via QR Code → Browse Partner Merchants → Pay This Merchant
- **✅ Fixed Membership Card Statistics in Admin Dashboard:**
  - Card counts by category (Silver, Gold, Platinum, Diamond) now accurately reflect active clients
  - Changed counting logic from transactions to clients collection for accurate real-time data
  - Added Diamond card category display
  - Revenue now includes both card purchases and upgrades
  - Total = Silver + Gold + Platinum + Diamond (properly synchronized)
- **✅ Fixed Card Upgrade Polling in Services Page:**
  - Added automatic polling (every 3 seconds) to detect payment confirmation
  - Added "I Have Paid - Check Status" button for manual verification
  - Fixed payment status detection so upgrade completes automatically after MoMo confirmation
  - Card level updates immediately after payment is confirmed
- **✅ Integrated BulkClix Airtime API:**
  - Updated `/api/services/airtime/purchase` to use correct BulkClix endpoint `/airtime-api/sendAirtime`
  - Added proper network ID mapping (MTN, Telecel, AirtelTigo)
  - Tested and confirmed airtime delivery works
- **✅ Card Upgrade in Services Page:**
  - Added Card Upgrade functionality to Services menu (`ServicesPage.jsx`)
  - Clients can upgrade from Silver → Gold → Platinum → Diamond
  - Full payment options: MoMo, Cashback, or combination
  - Payment summary shows breakdown (card price, cashback applied, MoMo amount)
  - Welcome bonus automatically credited upon successful upgrade
  - Tested with 100% pass rate (14/14 backend tests, all frontend features)
- **✅ Fixed Referral Bonus System:**
  - Fixed: Referrer now receives 3 GHS bonus when referred user buys a card
  - Fixed: Referral status now shows "Active" instead of "Pending" when referred user has bought a card
  - Backend: Updated `payments.py` to look up referrer by `referral_code` stored in `referred_by` field
  - Backend: Updated `clients.py` `/referrals` endpoint to sync and return `display_status`
  - Frontend: Updated referral list to show proper status (Pending/Active/Bonus credited)
- **✅ Fixed SMS Sending:**
  - Corrected import from `bulkclix_service` to `sms_service`
  - Added `get_sms()` alias function
  - Fixed BulkClix response parsing to detect `campaignId` for success

## Recent Changes (2026-03-06)
- **✅ Partner Merchant Visibility for Clients:**
  - New "Partners" tab in Client Dashboard shows all active merchants
  - Displays: business name, address, phone (clickable), Google Maps link
  - Search functionality to find specific merchants
  - New public API endpoints: `GET /api/public/merchants`, `GET /api/public/merchants/{id}`
- **✅ Google Maps Location for Merchants:**
  - Merchants can add Google Maps URL in Settings → Business Info
  - Admin Dashboard "Add Merchant Manually" now includes Google Maps URL field
  - Location syncs automatically to Client Dashboard
- **✅ English Language Priority:**
  - Updated `BusinessInfoEditor.jsx` to English (previously French)
  - All dashboards now display in English by default
- **✅ Admin Dashboard ↔ Landing Page Synchronization:**
  - Enhanced `/api/public/card-types` endpoint with complete card data
  - Landing Page now dynamically renders cards from API (prices, bonuses, benefits, durations)
  - Custom cards created in Admin Dashboard auto-appear on Landing Page
  - Auto-refresh every 5 minutes to catch Admin changes
  - Platform info (referral bonus, contact) also synced
- **✅ Membership Upgrade Feature - Enhanced:**
  - Clients now pay FULL PRICE for upgrades (not difference)
  - Added cashback payment option (full or partial)
  - Welcome bonus automatically credited upon upgrade
  - Backend: `clients.py` and `payments.py` updated
  - Frontend: New UI in `ClientDashboard.jsx` with cashback toggle and payment summary
- **✅ Added Merchant Transaction History Page:**
  - New page: `/merchant/history` with full transaction history
  - Features: Pagination, date filters, amount filters, search
  - Export: CSV and JSON formats
  - Summary stats: Total volume, cashback, transaction count
  - Backend endpoints: `GET /api/merchants/transactions/history`, `GET /api/merchants/transactions/export`
- **✅ Added all Ghana Mobile Networks to payment forms:**
  - Updated dropdowns: MTN MoMo, Telecel (ex-Vodafone), AirtelTigo (AT)
  - Files modified: `ClientDashboard.jsx`, `ServicesPage.jsx`, `MerchantDashboard.jsx`
  - Backend: Added `normalize_network()` function, updated `detect_network()` to return TELECEL
  - FAQ updated to reflect correct network names
  - Homepage payment logos updated to use Telecel naming
- **✅ Fixed datetime timezone error in admin.py:**
  - `locked_until` comparison now handles timezone-naive datetimes correctly

## Recent Changes (2025-03-05)
- Fixed OTP bug: Added missing `BULKCLIX_OTP_SENDER_ID` env variable loading in auth.py
- OTP now working with BulkClix native API (HTTP 200 OK confirmed)

---

## Credentials
- Super Admin: `emileparfait2003@gmail.com`
- BulkClix API Key: Configured in `/app/backend/.env`
