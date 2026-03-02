# SDM FINTECH PLATFORM - PRD

## Project Overview
**SDM (Smart Development Membership)** - Network of loyal consumers in Ghana

> **IMPORTANT**: SDM is not a bank or financial service. It is a network of friends and loyal consumers.

---

## MULTILINGUAL SUPPORT ✅
| Language | Code | Direction | Status |
|----------|------|-----------|--------|
| English | EN | LTR | ✅ Default |
| French | FR | LTR | ✅ Active |
| Arabic | AR | RTL | ✅ Active |
| Chinese | ZH | LTR | ✅ Active |

---

## AUTO LOTTERY SCHEDULER ✅ (March 2026)

### Configuration
- **Schedule**: 1st of each month at 00:05 UTC
- **Default Prize**: 500 GHS (configurable)
- **Auto-Activate**: Enrolls all active VIP members automatically

### Features
- Automatic lottery creation on the 1st of each month
- Configurable default prize amount via admin dashboard
- Toggle auto-activation (enroll VIP members automatically)
- Manual trigger button for testing
- Scheduler logs and status monitoring
- No duplicate lotteries (checks for existing month)

### Admin UI
- Status indicator (green = active)
- Next run date display
- Configuration form (Status, Prize, Auto-Activate)
- "Trigger Now" button for manual execution
- Recent scheduler logs

---

## VIP MEMBERSHIP CARDS

| Tier | Price | Cashback Boost | Withdrawal Limit | Lottery |
|------|-------|----------------|------------------|---------|
| **SILVER** | 25 GHS | +0% | 2,500 GHS/month | x1 |
| **GOLD** | 50 GHS | +0.2% | 2,500 GHS/month | x2 |
| **PLATINUM** | 100 GHS | +0.5% | 5,000 GHS/month | x3 |

---

## IMPLEMENTED FEATURES

### Core Platform (Phase 1-5)
- Central Ledger with Double-Entry Accounting
- Transaction Engine with Idempotency
- Super App Services (SIMULATED)
- VIP Card System (3 tiers)
- Partner Directory & Promotions

### VIP Lottery (Phase 6)
- 5 winners: 40%, 25%, 15%, 12%, 8%
- VIP tier multipliers

### Multilingual & Branding (Phase 7)
- 4 Languages (EN, FR, AR, ZH)
- RTL Support for Arabic
- New SDM Rewards Logo

### Auto Lottery Scheduler (Phase 8) ✅
- APScheduler integration
- Monthly auto-creation
- Admin configuration UI

---

## KEY API ENDPOINTS

### Scheduler
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sdm/admin/scheduler/status | Get scheduler status & next run |
| GET | /api/sdm/admin/scheduler/logs | Get execution logs |
| GET | /api/sdm/admin/lottery-config | Get auto config |
| PUT | /api/sdm/admin/lottery-config | Update config |
| POST | /api/sdm/admin/lottery/trigger-monthly | Manual trigger |

---

## UPCOMING TASKS (P1)

### SEO & Public Pages
- Public partner directory
- Landing page optimization

### Birthday Bonus
- Auto bonus for VIP members

### Backend Refactoring (CRITICAL)
- Split `server.py` (5200+ lines)

---

## TEST CREDENTIALS
- **Admin**: admin / Gerard0103@
- **Client**: 0000000000 / OTP: 000000

---

## MOCKED INTEGRATIONS
- BulkClix API
- Hubtel SMS
- OneSignal (PENDING)

---

*Last Updated: March 2026*
*Phase 8 Complete - Auto Lottery Scheduler*
