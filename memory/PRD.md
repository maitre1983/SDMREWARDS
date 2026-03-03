# SDM FINTECH PLATFORM - PRD

## Project Overview
**SDM (Smart Development Membership)** - Network of loyal consumers in Ghana

> **IMPORTANT**: SDM is not a bank or financial service. It is a network of friends and loyal consumers.

---

## REFERRAL SYSTEM (Updated March 3, 2026)

### Referral Bonus Rules
| Who | Amount | When Paid |
|-----|--------|-----------|
| Referrer (Parrain) | GHS 3 | When referred user purchases membership card |
| New User (Filleul) | GHS 1 | When they purchase their membership card |

### Key Changes
- **Bonuses are ONLY paid when the referred user purchases a membership card**
- **Inscription is "pending" until card purchase** (`membership_status: pending → active`)
- **Card payment must be via Mobile Money or Card** (no cash)

### APIs
- `GET /api/sdm/user/referrals?period=all|day|week|month|year` - User's referral history with filters
- `GET /api/sdm/admin/referrals?period=all|day|week|month|year` - Admin: Complete referral history

### Admin Referral Dashboard
New panel in Admin Dashboard showing:
- Completed referrals (who referred who)
- Pending referrals (registered but no card yet)
- Total bonus paid
- Filters by period (day/week/month/year)

---

## PAYMENT SYSTEM (Phase 1 - COMPLETE)

### Payment Methods
| Method | Status | Notes |
|--------|--------|-------|
| Mobile Money | ✅ SIMULATED | Bulkclix API (pending real credentials) |
| Card Payment | ✅ SIMULATED | Bulkclix API (pending real credentials) |
| Cash | ✅ COMPLETE | Client confirmation required |

### Payment Flow
1. **Client Scans Merchant QR** OR **Merchant Scans Client QR**
2. Amount + Payment Method selected
3. Split calculated (Cashback → SDM Commission → Client)
4. For MoMo/Card: SIMULATED auto-confirmation
5. For Cash: Client must confirm via app notification
6. Funds split: Client wallet credited, Merchant settled

### Split Formula
```
Amount: 1000 GHS @ 10% Cashback
- Total Cashback: 100 GHS (10% of amount)
- SDM Commission: 10 GHS (10% of cashback)
- Client Receives: 90 GHS
- Merchant Receives: 900 GHS
```

### Merchant Settlement Configuration
- **Mobile Money**: Network (MTN/Vodafone/AirtelTigo) + Phone
- **Bank Account**: Bank Name + Account Number + Account Name
- **Settlement Mode**: Instant or Daily batch

### Cash Debit System
- Merchants have a "Cash Debit Balance" (can go negative)
- Default limit: 5000 GHS
- Grace period before blocking: 3 days
- Daily job at 00:00 UTC checks balances

### APIs Implemented
- `POST /api/sdm/payments/initiate` - Client initiates payment
- `POST /api/sdm/payments/merchant-initiate` - Merchant initiates payment
- `POST /api/sdm/payments/confirm-cash` - Client confirms cash payment
- `GET /api/sdm/payments/pending` - Client pending payments
- `GET /api/sdm/payments/history` - Client payment history
- `GET /api/sdm/merchant/payments` - Merchant payment history
- `GET /api/sdm/merchant/qr-code` - Merchant QR code
- `GET /api/sdm/merchant/cash-balance` - Merchant cash balance
- `POST /api/sdm/payments/webhook/bulkclix` - Webhook endpoint

---

### Referral QR Code (NEW - March 3, 2026)
- Each user has a scannable QR code containing their referral link
- QR code visible via "Show QR Code" button in the Invite tab
- When scanned, opens the SDM registration page with the referral code pre-filled
- Uses `qrcode.react` library with SDM logo embedded

---

## BACKEND REFACTORING (P0 - Planned)

### Current State
- `server.py`: **7600+ lines** (monolithic)
- Existing router files: `/app/backend/routers/` (mostly placeholders)

### Target Architecture
```
/app/backend/
├── server.py           # Main app, imports routers
├── models/             # Pydantic models
├── routers/
│   ├── auth.py         # OTP, login, register
│   ├── users.py        # User profile, wallet, transactions
│   ├── merchants.py    # Merchant dashboard, settings
│   ├── payments.py     # MoMo, Card, Cash payments
│   ├── admin.py        # Admin controls
│   ├── vip.py          # VIP cards, lottery
│   └── services.py     # Airtime, data, bills
└── services/
    ├── bulkclix.py     # OTP & Payment service
    └── ledger.py       # Financial ledger
```

### Migration Strategy
1. Create models package with shared Pydantic models
2. Migrate routes one section at a time
3. Test each migration before proceeding
4. Keep server.py functional during migration

---

## ADMIN CONTROLS (Phase 2 - COMPLETE)

### Client Controls
| Action | Description | Status |
|--------|-------------|--------|
| Block | Immediately block account | ✅ |
| Unblock | Restore account access | ✅ |
| Suspend | Temporary suspension | ✅ |
| Unsuspend | Lift suspension | ✅ |
| Freeze Wallet | Prevent withdrawals | ✅ |
| Unfreeze Wallet | Allow withdrawals | ✅ |
| Adjust Balance | Add/Subtract/Set balance | ✅ |
| Delete | Soft delete account | ✅ |

### Merchant Controls
| Action | Description | Status |
|--------|-------------|--------|
| Block | Immediately block merchant | ✅ |
| Unblock | Restore merchant access | ✅ |
| Suspend | Temporary suspension | ✅ |
| Unsuspend | Lift suspension | ✅ |
| Toggle Cash Mode | Enable/Disable cash payments | ✅ |
| Update Cash Limit | Set max negative balance | ✅ |
| Update Grace Period | Days before auto-block | ✅ |
| Update Max Cash Rate | Max cashback % for cash | ✅ |
| **Delete** | **Soft delete merchant (Super Admin only)** | ✅ |

### Partners Visibility Rules
- Blocked, suspended, or deleted merchants are **automatically hidden** from the public partners list
- Clients will no longer see these merchants in their Partners tab
- This filter applies to `/api/sdm/partners` endpoint

### Action Logs
- All admin actions logged with timestamp
- Stores: admin_id, admin_email, target_type, target_id, action, reason
- Previous state saved for rollback reference

### Admin UI
- **Clients Tab**: List with manage button for each
- **Marchands Tab**: List with cash balance, limit, verify buttons
- **Action Logs Tab**: Complete history of admin actions
- **Stats Cards**: Total counts, blocked, deficit warnings

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
- ✅ VIP Card System (3 tiers) - **Dynamic from Admin Dashboard**
- ✅ Partner Directory - **Synced with verified merchants**
- ✅ Promotions Engine
- ✅ Leaderboards
- ✅ VIP Lottery (5 winners)
- ✅ Multilingual (4 languages - EN default)
- ✅ Auto Lottery Scheduler (1st of each month)
- ✅ **Birthday Bonus Scheduler** (Daily @ 8 UTC)
- ✅ Models Package Extraction
- ✅ SDM Rewards Landing Page - **Dynamic VIP Cards**
- ✅ Core Package (config, utils, dependencies)
- ✅ Merchant Card Management Removed
- ✅ BulkClix OTP SMS Integration (Real)
- ✅ **BulkClix Notification SMS** (for merchants)
- ✅ Client: Phone + Password + Full Name + **Birth Date** Registration
- ✅ Merchant: Phone + Password + GPS Address Registration
- ✅ **Merchant Dashboard: Cashback Rate Management** (Settings tab)
- ✅ **Merchant Dashboard: API Credentials Display** (ID, Key, Secret)
- ✅ Favicon & Title (www.sdmrewards.com)
- ✅ "Made with Emergent" Badge Removed
- ✅ English Priority Language (all pages translated)
- ✅ Password Reset via OTP
- ✅ Dynamic Admin URL (/admin<DDMMYY>) - Security enhancement
- ✅ Session Persistence (localStorage tokens for admin, client, merchant)
- ✅ Web OTP API Integration (auto-fill OTP from SMS on Chrome Android)
- ✅ **Admin Panel: Clients & Merchants Management**
- ✅ **Client Portal: Partners Tab** with cashback rates
- ✅ **Landing Page: Lazy Loading** for performance
- ✅ **Login Button** in Navbar

---

## UPCOMING TASKS (P1)

### Complete Backend Refactoring
- Extract routes from server.py to routers/
- Import models from models package
- Test all endpoints after each extraction

### SEO & Public Pages
- Public partner directory
- Landing optimization

### Birthday Bonus ✅ COMPLETE
- Auto bonus job runs daily @ 8 UTC
- Checks for VIP members with birthday today
- Credits configurable bonus amount (default: 5 GHS)
- Sends birthday SMS notification
- Prevents duplicate bonuses per year
- **Birth date field added to client registration form**

### Merchant Notifications ✅ IMPLEMENTED
- SMS sent when merchant registers (pending verification)
- SMS sent when merchant is verified by admin
- Admin notification created for new registrations

### Auto-read OTP (Web OTP API) ✅ IMPLEMENTED
- OTPInput component with Web OTP API support
- Auto-fills OTP code when SMS arrives (Chrome Android)
- Shows "Waiting for SMS..." indicator when listening
- Fallback to manual input on unsupported browsers
- Auto-submits form when OTP is received

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

*Last Updated: March 3, 2026*
*Merchant Dashboard Features Tested and Working*
*Birthday Bonus Feature Complete*
*Admin Management Panel: Create/Delete Admins, Change Passwords*
*Merchant Delete Feature: Super Admin can delete merchants*
*Partners Visibility: Blocked/Suspended/Deleted merchants hidden from clients*
*Referral System: Bonuses paid only on card purchase, Admin history panel added*
*Super Admin Account: emileparfait2003@gmail.com configured at startup*
