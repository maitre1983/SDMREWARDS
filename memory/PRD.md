# SDM FINTECH PLATFORM - PRD

## Project Overview
**SDM (Smart Development Membership)** - Network of loyal consumers in Ghana

> **IMPORTANT**: SDM is not a bank or financial service. It is a network of friends and loyal consumers.

---

## BACKEND ARCHITECTURE (Refactored)

### Directory Structure
```
/app/backend/
├── server.py          # Main entry point (5200+ lines - to be split)
├── core/              # ✅ NEW - Shared utilities
│   ├── config.py      # Database, JWT, API keys
│   ├── dependencies.py # Auth dependencies
│   └── utils.py       # Helper functions
├── models/            # ✅ NEW - Extracted Pydantic models
│   ├── base.py        # Core models (Contact, Admin, Visit)
│   ├── users.py       # SDMUser model
│   ├── merchants.py   # Merchant models
│   ├── vip.py         # VIP membership models
│   ├── partners.py    # Partner models
│   ├── lottery.py     # Lottery models
│   └── services.py    # Service transaction models
├── routers/           # ✅ NEW - Route separation
│   ├── auth.py        # Auth routes (template ready)
│   └── lottery.py     # Lottery routes (template)
├── ledger/            # Double-entry accounting
├── services/          # External services
│   └── bulkclix_service.py
├── tests/             # Test files
├── ARCHITECTURE.md    # ✅ NEW - Architecture documentation
└── CHANGELOG.md       # ✅ NEW - Version changelog
```

### Refactoring Status
| Component | Status | Lines |
|-----------|--------|-------|
| Models | ✅ Extracted | ~300 |
| Auth Routes | 🔄 In server.py | ~75 |
| User Routes | 🔄 In server.py | ~287 |
| Merchant Routes | 🔄 In server.py | ~245 |
| Service Routes | 🔄 In server.py | ~350 |
| VIP Routes | 🔄 In server.py | ~200 |
| Lottery Routes | 🔄 In server.py | ~400 |
| Fintech Routes | 🔄 In server.py | ~350 |

---

## MULTILINGUAL SUPPORT ✅
| Language | Code | Direction |
|----------|------|-----------|
| English | EN | LTR ✅ Default |
| French | FR | LTR ✅ |
| Arabic | AR | RTL ✅ |
| Chinese | ZH | LTR ✅ |

---

## AUTO LOTTERY SCHEDULER ✅
- **Schedule**: 1st of each month @ 00:05 UTC
- **Default Prize**: 500 GHS (configurable)
- **Auto-Activate**: Enrolls VIP members automatically

---

## VIP MEMBERSHIP CARDS
| Tier | Price | Boost | Limit | Lottery |
|------|-------|-------|-------|---------|
| SILVER | 25 | +0% | 2,500 | x1 |
| GOLD | 50 | +0.2% | 2,500 | x2 |
| PLATINUM | 100 | +0.5% | 5,000 | x3 |

---

## IMPLEMENTED FEATURES
- ✅ Central Ledger (Double-Entry)
- ✅ Super App Services (SIMULATED)
- ✅ VIP Card System (3 tiers)
- ✅ Partner Directory
- ✅ Promotions Engine
- ✅ Leaderboards
- ✅ VIP Lottery (5 winners)
- ✅ Multilingual (4 languages - EN default)
- ✅ Auto Lottery Scheduler
- ✅ Models Package Extraction
- ✅ SDM Rewards Landing Page
- ✅ Core Package (config, utils, dependencies)
- ✅ Merchant Card Management Removed
- ✅ BulkClix OTP SMS Integration (Real)
- ✅ Client: Phone + Password + Full Name Registration
- ✅ Merchant: Phone + Password + GPS Address Registration
- ✅ Favicon & Title (www.sdmrewards.com)
- ✅ "Made with Emergent" Badge Removed
- ✅ English Priority Language (all pages translated)
- ✅ Password Reset via OTP
- ✅ Dynamic Admin URL (/admin<DDMMYY>) - Security enhancement
- ✅ Session Persistence (localStorage tokens for admin, client, merchant)

---

## UPCOMING TASKS (P1)

### Complete Backend Refactoring
- Extract routes from server.py to routers/
- Import models from models package
- Test all endpoints after each extraction

### SEO & Public Pages
- Public partner directory
- Landing optimization

### Birthday Bonus
- Auto bonus for VIP members

### Auto-read OTP (Web OTP API)
- Investigate Web OTP API for supported browsers
- Requires HTTPS and user permission

### Contact Sync
- Requires native mobile capabilities (not possible in web app)
- Consider PWA or native app implementation

---

## TEST CREDENTIALS
- **Admin**: `/admin` -> redirects to `/admin<DDMMYY>` (e.g., `/admin020326`)
  - Username: `admin`
  - Password: `Gerard0103@`
- **Client**: `/sdm/client`
  - Phone: `0000000000`
  - Password: `TestPass123`
  - OTP (for registration): `0000`
- **Merchant**: `/sdm/merchant`
  - Phone: `0000000000`
  - OTP (for registration): `0000`

---

## MOCKED INTEGRATIONS
- BulkClix API (services - airtime, data, bills)
- OneSignal (PENDING)

## ACTIVE INTEGRATIONS
- BulkClix API (OTP SMS - Real)

---

*Last Updated: March 2, 2026*
*Dynamic Admin URL Tested and Working*
*Session Persistence Verified*
