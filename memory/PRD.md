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

### AdminDashboard Refactoring - PARTIALLY COMPLETED 2026-03-11
Created modular settings components (not yet integrated):
- [x] `/app/frontend/src/components/admin/AdminSettings.jsx` (160 lines)
- [x] `/app/frontend/src/components/admin/settings/SettingsCards.jsx` (230 lines)
- [x] `/app/frontend/src/components/admin/settings/SettingsServices.jsx` (158 lines)
- [x] `/app/frontend/src/components/admin/settings/SettingsReferrals.jsx` (141 lines)
- [x] `/app/frontend/src/components/admin/settings/SettingsDebit.jsx` (296 lines)
- [x] `/app/frontend/src/components/admin/settings/SettingsUsers.jsx` (299 lines)
- [x] `/app/frontend/src/components/admin/settings/SettingsSMS.jsx` (300 lines)
- [x] `/app/frontend/src/components/admin/settings/SettingsSecurity.jsx` (272 lines)
- [x] `/app/frontend/src/components/admin/settings/SettingsAdmins.jsx` (230 lines)

**Note:** Components created and lint-free. Full integration pending future session.
AdminDashboard.jsx remains at 3836 lines - settings section to be replaced in future refactoring.

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

### P1 - Complete AdminDashboard Refactoring
Replace settings section in AdminDashboard.jsx with:
```jsx
{activeTab === 'settings' && (
  <AdminSettings 
    token={token} 
    admin={admin}
    pinVerified={pinVerified}
    setPinVerified={setPinVerified}
    setShowPinModal={setShowPinModal}
  />
)}
```
This will reduce AdminDashboard.jsx from ~3836 to ~1800 lines.

### P2 - Google Analytics Setup
Replace `GA_MEASUREMENT_ID` placeholder in `/app/frontend/public/index.html` with actual tracking ID.

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
