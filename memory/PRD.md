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

## Recent Changes (2026-03-06)
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
