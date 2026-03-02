# SDM FINTECH PLATFORM - PRD

## Project Overview
**SDM (Smart Development Membership)** - Network of loyal consumers in Ghana

> **IMPORTANT**: SDM is not a bank or financial service. It is a network of friends and loyal consumers.

---

## MULTILINGUAL SUPPORT ✅ (March 2026)
| Language | Code | Direction | Status |
|----------|------|-----------|--------|
| English | EN | LTR | ✅ Default |
| French | FR | LTR | ✅ Active |
| Arabic | AR | RTL | ✅ Active |
| Chinese | ZH | LTR | ✅ Active |

Language selector available on:
- SDM Client (buttons variant)
- SDM Merchant (buttons variant)
- Admin Dashboard (dropdown variant)
- Landing Page (navbar dropdown)

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

---

## IMPLEMENTED FEATURES

### Phase 1-5: Core Platform
- Central Ledger with Double-Entry Accounting
- Merchant & Client Wallets
- Transaction Engine with Idempotency
- Super App Services (SIMULATED)
- VIP Card System (3 tiers)
- Partner Directory
- Promotions Engine
- Leaderboards

### Phase 6: VIP Lottery ✅
- Monthly VIP Lottery Draws
- 5 winners per draw: 40%, 25%, 15%, 12%, 8%
- VIP tier multipliers (Silver x1, Gold x2, Platinum x3)
- Public result announcements

### Phase 7: Multilingual & Branding ✅ (March 2026)
- **New SDM Rewards Logo** - Integrated on all pages
- **4 Languages**: English, French, Arabic, Chinese
- **RTL Support** for Arabic
- **Auto Monthly Lottery**: 
  - Default prize: 500 GHS
  - Auto-activate and enroll VIP members
  - Configurable via admin

---

## UPCOMING TASKS (P1)

### SEO & Public Pages
- Public partner directory (no login)
- Landing page optimization
- Meta tags

### Birthday Bonus
- Auto bonus for VIP members during birthday month

### Backend Refactoring (CRITICAL)
Split `server.py` (5000+ lines) into:
- `routers/auth.py`
- `routers/services.py`
- `routers/vip.py`
- `routers/partners.py`
- `routers/lottery.py`
- `routers/admin.py`

---

## FUTURE TASKS (P2/P3)

### P2
- Real BulkClix API Integration
- OneSignal Push Notifications
- KYC Implementation

### P3
- Physical Cards
- Anti-fraud Engine
- Multi-currency Support

---

## KEY API ENDPOINTS

### Auto Lottery
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/sdm/admin/lottery-config | Admin | Get auto lottery config |
| PUT | /api/sdm/admin/lottery-config | Admin | Update config (amount, enabled) |
| POST | /api/sdm/admin/lottery/trigger-monthly | Admin | Manually trigger monthly lottery |

### VIP Lottery
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/sdm/admin/lotteries | Admin | List all |
| POST | /api/sdm/admin/lotteries | Admin | Create |
| PATCH | /api/sdm/admin/lotteries/{id}/activate | Admin | Activate |
| POST | /api/sdm/admin/lotteries/{id}/draw | Admin | Draw |
| POST | /api/sdm/admin/lotteries/{id}/announce | Admin | Announce |

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
| BulkClix API | MOCKED |
| Hubtel SMS | MOCKED |
| OneSignal | PENDING |

---

## TEST REPORTS
- `/app/test_reports/iteration_12.json` - Latest (Multilingual + Logo)
- `/app/backend/tests/test_multilingual_lottery.py`
- `/app/backend/tests/test_lottery_system.py`

---

*Last Updated: March 2026*
*Phase 7 Complete - Multilingual & Auto Lottery*
