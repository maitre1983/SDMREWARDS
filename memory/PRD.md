# SDM FINTECH PLATFORM - PRD

## Project Overview
**SDM (Smart Development Membership)** - Network of loyal consumers in Ghana

> **IMPORTANT**: SDM is not a bank or financial service. It is a network of friends and loyal consumers.

---

## REFERRAL PROGRAM
- **Referrer**: +3 GHS when referral buys a card
- **Referee**: +1 GHS bonus on first card purchase

---

## VIP MEMBERSHIP CARDS

| Tier | Price | Cashback Boost | Withdrawal Limit | Lottery |
|------|-------|----------------|------------------|---------|
| **SILVER** | 25 GHS | +0% | 2,500 GHS/month | x1 |
| **GOLD** | 50 GHS | +0.2% | 2,500 GHS/month | x2 |
| **PLATINUM** | 100 GHS | +0.5% | 5,000 GHS/month | x3 |

### Silver Benefits
- Access to exclusive partner merchant offers
- SDM app access (wallet + history + rewards tracking)
- Access to monthly lottery draws
- Birthday Bonus

### Gold Benefits (Silver +)
- Boosted cashback (+0.2% at partners)
- Double chance at monthly draws
- Priority withdrawal processing
- Access to Gold-exclusive merchants

### Platinum Benefits (Silver + Gold +)
- Premium cashback boost (+0.5%)
- Triple chance at major draws
- Elevated withdrawal limit (5000 GHS/month)
- Ambassador Program
- Access to business & investment opportunities

---

## PHASE 1-5: IMPLEMENTED FEATURES ✅

### Phase 1: Core Fintech Foundation
- Central Ledger with Double-Entry Accounting
- Separated Wallets (CLIENT, MERCHANT, SDM_OPERATIONS, SDM_COMMISSION, SDM_FLOAT)
- Merchant Deposit Workflow
- Withdrawal Workflow with Admin Approval

### Phase 2: Transaction Engine & Dynamic Config
- Direct Payment Transaction Flow
- Dynamic Fintech Configuration
- Float Management & Alerts
- Investor Dashboard

### Phase 2.5: Notification System
- Float Alert System (Webhook + Email)
- Client Notification System
- Extended Admin Dashboard

### Phase 3: Push Notifications (OneSignal)
- Backend Push Service (MOCKED - awaiting keys)
- Device Registration
- Segmented Notifications

### Phase 4: Super App Services
- BulkClix Integration (SIMULATED)
  - Airtime Purchase
  - Data Bundles
  - Bill Payment (ECG, GWCL, DSTV, GOTV)
  - MoMo Withdrawal
- Transaction Engine with Idempotency
- Monthly Limits & Controls
- Client Super App UI

### Phase 4B: Promotions & Leaderboard
- Promotion Engine (% discounts on services)
- Day-of-week conditions
- Top Clients Leaderboard (Cashback & Services)
- Winner Announcements

### Phase 5: VIP Cards & Partners ✅
- 3-tier VIP System (Silver, Gold, Platinum)
- Admin-managed card types
- Client VIP purchase/upgrade
- Partner Directory
- Referral Bonus System

### Phase 6: VIP Lottery System ✅ (March 2026)
- Monthly VIP Lottery Draws
- Prize pool configurable by admin (fixed amount or % of commissions)
- 5 winners per draw with distribution: 40%, 25%, 15%, 12%, 8%
- VIP tier multipliers for entries (Silver x1, Gold x2, Platinum x3)
- Automatic enrollment of active VIP members
- Prize distribution to winners' ledger wallets
- Public result announcements
- Full English UI translation

---

## UPCOMING TASKS (P1)

### SEO & Public Pages
- Create public partner directory (no login required)
- Landing page for new user acquisition
- Meta tags and SEO optimization

### Birthday Bonus
- Automatic bonus for VIP members during birthday month
- Integration with VIP benefits system

### Backend Refactoring (CRITICAL)
- Split `/app/backend/server.py` (4500+ lines) into APIRouters:
  - `routers/auth.py` - Authentication
  - `routers/users.py` - User management
  - `routers/services.py` - Super App services
  - `routers/vip.py` - VIP card management
  - `routers/partners.py` - Partner directory
  - `routers/lottery.py` - Lottery system
  - `routers/admin.py` - Admin operations

---

## FUTURE TASKS (P2/P3)

### P2
- Real BulkClix API Integration
- OneSignal Push Notifications Activation
- KYC Implementation

### P3
- Physical Cards
- Anti-fraud Engine
- Multi-currency Support (USD, NGN)
- Webhooks for Merchants

---

## TECHNICAL STACK

### Backend
- FastAPI (Python)
- MongoDB with ACID transactions
- Ledger module: `/app/backend/ledger/`
- Services module: `/app/backend/services/`

### Frontend
- React 19
- Tailwind CSS + Shadcn UI
- FintechDashboard: `/app/frontend/src/components/admin/FintechDashboard.jsx`
- SDMClientPage: `/app/frontend/src/pages/SDMClientPage.jsx`

### Collections
- `wallets` - All wallets
- `ledger_entries` - Accounting entries (DEBIT/CREDIT)
- `ledger_transactions` - Main transactions
- `vip_card_types` - VIP card configurations
- `vip_memberships` - User VIP memberships
- `sdm_partners` - Partner merchants
- `lotteries` - Lottery draws
- `lottery_participants` - Lottery entries
- `notifications` - In-app notifications
- `service_transactions` - Super App transactions
- `service_promotions` - Promotions

---

## KEY API ENDPOINTS

### VIP Lottery
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/sdm/admin/lotteries | Admin | List all lotteries |
| POST | /api/sdm/admin/lotteries | Admin | Create lottery |
| PATCH | /api/sdm/admin/lotteries/{id}/activate | Admin | Activate & enroll VIP |
| POST | /api/sdm/admin/lotteries/{id}/draw | Admin | Draw 5 winners |
| POST | /api/sdm/admin/lotteries/{id}/announce | Admin | Announce results |
| GET | /api/sdm/user/lotteries | User | User lottery view |
| GET | /api/sdm/lotteries/results | Public | Announced results |

### Testing Helpers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/sdm/admin/test/create-vip-users | Create test VIP users |
| POST | /api/sdm/admin/lotteries/{id}/add-test-participants | Add participants |
| POST | /api/sdm/admin/fintech/users/credit | Credit test user |

---

## ACCESS URLS

| Page | URL |
|------|-----|
| Landing | / |
| Admin Login | /admin |
| Admin Dashboard | /admin280226 |
| SDM Client | /sdm/client |
| SDM Merchant | /sdm/merchant |

### Test Credentials
- **Admin**: admin / Gerard0103@
- **Test Client**: 0000000000 / OTP: 000000

---

## MOCKED INTEGRATIONS

| Service | Status |
|---------|--------|
| Mobile Money Payout | MOCKED - Admin marks as PAID |
| Hubtel SMS OTP | MOCKED - Debug OTP shown |
| BulkClix API | MOCKED - Simulation mode |
| OneSignal Push | PENDING - Awaiting keys |

---

## TEST REPORTS
- `/app/test_reports/iteration_11.json` - Latest (VIP Lottery)
- `/app/backend/tests/test_lottery_system.py` - Lottery test suite

---

*Last Updated: March 2026*
*Phase 6 (VIP Lottery) Complete - Full English UI*
