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
- **3rd Party:** BulkClix (payments, SMS, OTP)

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
- [ ] Settings tab sub-components extraction (IN PROGRESS)

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

### P1 - Services Feature Completion
- Complete UI for Airtime, Data, ECG, Merchant Payments
- Implement backend logic with BulkClix APIs (waiting for documentation)

### P1 - AdminDashboard.jsx Refactoring (Settings)
- Extract Settings > Cards → `AdminSettingsCards.jsx`
- Extract Settings > Commissions → `AdminSettingsCommissions.jsx`
- Extract Settings > SMS → `AdminSettingsSMS.jsx`
- Extract Settings > Security → `AdminSettingsSecurity.jsx`
- Extract Settings > Users → `AdminSettingsUsers.jsx`

### P2 - Backend Refactoring
- Split `admin.py` (>2400 lines) into:
  - `admin_analytics.py`
  - `admin_settings.py`
  - `admin_users.py`

### P2 - Minor Issues
- [x] Fix datetime timezone error in admin.py (settings PIN lock)
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

## Recent Changes (2026-03-07)
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
