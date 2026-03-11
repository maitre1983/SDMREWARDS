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
- **3rd Party:** BulkClix (payments, SMS, OTP, Airtime, Data Bundles), OneSignal (push notifications)
- **AI/LLM:** Emergent LLM Key (OpenAI GPT-5.2 for SEO analysis)

---

## Completed Features (Updated 2026-03-11)

### Platform Language & SEO (100%) - COMPLETED 2026-03-11
- [x] **English as Primary Language** - Entire platform translated to English
  - User Dashboard, Merchant Dashboard, Admin Dashboard
  - All front-end pages, menus, notifications, system messages
  - Registration and payment pages
  - Date formatting changed from fr-FR to en-US
  - Language selector (EN/FR flags) retained for bilingual support
  
- [x] **Advanced SEO Optimization**
  - XML Sitemap generation (`/api/seo/sitemap.xml`) - 10 indexed pages
  - Robots.txt configuration (`/api/seo/robots.txt`)
  - Proper H1, H2, H3 heading structure
  - Meta tags optimization (title, description, keywords)
  - Open Graph tags for social sharing
  - Schema.org structured data (Organization, FAQPage, Product, LocalBusiness)
  - Target keywords: cashback, rewards, loyalty programs, mobile payments, fintech Ghana
  
- [x] **AI-Powered SEO Features** (Emergent LLM Key integration)
  - Keyword performance analysis (`/api/seo/keywords/suggestions`)
  - SEO optimization recommendations (`/api/seo/analyze`)
  - AI-assisted content generation (`/api/seo/content/generate`)
  - SEO analysis history tracking (`/api/seo/history`)
  - Admin SEO Dashboard with 4 tabs: Overview, Keywords, AI Analysis, Content Generator
  
- [x] **Analytics Integration**
  - Google Analytics 4 script placeholder added (needs GA_MEASUREMENT_ID)
  - Custom analytics in SEO Dashboard (indexed pages, target keywords, schema types)

### Flexible Payment System (100%) - COMPLETED 2026-03-10
- [x] Four payment methods for merchants: MoMo, Cash, Cashback, Hybrid
- [x] Services (Airtime, Data, ECG) - Cashback only payments
- [x] Payment method badges on all transaction tables
- [x] Admin "Cashback Ecosystem" metrics

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
- [x] SEO & Analytics tab with AI features
- [ ] Settings tab sub-components extraction (IN PROGRESS)

### Services Hub (100% for implemented services)
- [x] **Airtime Purchase** - BulkClix API integration (MTN, Telecel, AirtelTigo)
- [x] **Data Bundle Purchase** - Real BulkClix API with recipient validation
- [x] **Card Upgrade** - Upgrade membership with MoMo + cashback options
- [x] **MoMo Withdrawal** - Withdraw cashback to mobile money
- [ ] ECG Payment - Waiting for API documentation

### Merchant Auto-Payout System (100%)
- [x] Automatic payout to merchant MoMo on customer payment
- [x] IP whitelist configured (34.170.12.145)
- [x] Payout status tracking (pending, completed, failed)
- [x] Admin view of all merchant payouts
- [x] Merchant view of own payout history
- [x] Bank transfer payout option
- [x] Bank account verification via BulkClix API
- [x] Preferred payout method toggle (MoMo vs Bank)

### Merchant Dashboard (100%)
- [x] Sales statistics and charts (English labels)
- [x] PIN management (English UI)
- [x] Cashier CRUD operations (English UI)
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

---

## In Progress / Upcoming

### P1 - Mobile App React Native Testing
- Test CashPaymentScreen.js functionality
- Verify payment flows on mobile

### P2 - AdminDashboard.jsx Refactoring
The file is ~4000 lines and needs to be broken into:
- [ ] Extract `AdminSettings.jsx` component
- [ ] Extract settings sub-tabs into separate components
- [ ] Create custom hooks for state management

---

## Future Tasks (Backlog)

1. **Client Cashback History** - Detailed view of where/when cashback was used
2. **Automated Debit Alert** - SMS at 75% debit limit for merchants
3. **Merchant Statements** - Monthly financial statement generation
4. **ECG Payment** - Full integration when API available
5. **Two-Factor Authentication (2FA)**
6. **Google Analytics Setup** - Replace GA_MEASUREMENT_ID placeholder with actual tracking ID

---

## Key API Endpoints

### SEO Endpoints (New)
- `GET /api/seo/sitemap.xml` - XML sitemap for crawlers
- `GET /api/seo/robots.txt` - Robots.txt configuration
- `GET /api/seo/analytics/overview` - SEO metrics overview
- `GET /api/seo/keywords/suggestions` - AI keyword suggestions
- `POST /api/seo/analyze` - AI-powered SEO analysis
- `POST /api/seo/content/generate` - AI content generation
- `GET /api/seo/history` - SEO analysis history

### Payment Endpoints
- `POST /api/payments/merchant` - Process MoMo payment
- `POST /api/payments/merchant/cash` - Record cash payment
- `POST /api/payments/merchant/cashback` - Process cashback/hybrid payment

### Admin Endpoints
- `GET /api/admin/dashboard` - Dashboard overview with cashback ecosystem
- `GET /api/admin/merchants/debit-overview` - Merchant debit account stats

---

## Database Schema

### Key Collections
- `clients` - User accounts with cashback_balance
- `merchants` - Merchant accounts with debit_account sub-document
- `transactions` - Payment records with payment_method field
- `seo_analyses` - AI SEO analysis history

---

## Test Credentials

**Admin:**
- URL: `/admin{DDMMYY}` (e.g., `/admin110326`)
- Email: emileparfait2003@gmail.com
- Password: password

**Client:**
- Phone: +233555861556
- Password: 000000

**Merchant:**
- Phone: +233555123456
- Password: 000000

---

## Files of Reference

### Modified in this session (2026-03-11)
- `/app/backend/routers/seo.py` - New SEO router with AI features
- `/app/frontend/src/components/admin/SEODashboard.jsx` - New SEO dashboard
- `/app/frontend/src/pages/AdminDashboard.jsx` - Added SEO tab
- `/app/frontend/src/components/merchant/PinSettings.jsx` - Translated to English
- `/app/frontend/src/components/merchant/CashierManager.jsx` - Translated to English
- `/app/frontend/src/components/merchant/ForgotPinModal.jsx` - Translated to English
- `/app/frontend/src/components/admin/SDMCommissionsPanel.jsx` - Translated to English
- `/app/frontend/src/components/admin/CardTypesManager.jsx` - Translated to English
- `/app/frontend/public/index.html` - Added GA4 placeholder

---

## 3rd Party Integrations
- **BulkClix:** SMS, Payments, OTP, Airtime, Data Bundles
- **OneSignal:** Web push notifications
- **Emergent LLM Key:** AI-powered SEO analysis (GPT-5.2)
- **Google Analytics 4:** Visitor tracking (placeholder added)
