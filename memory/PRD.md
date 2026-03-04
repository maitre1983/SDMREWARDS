# SDM REWARDS - Product Requirements Document

## Project Overview
**SDM (Smart Development Membership)** - Digital loyalty and cashback platform for Ghana

> **IMPORTANT**: SDM is not a bank. It is a network of loyal consumers earning cashback rewards.

---

## CHANGELOG

### March 4, 2026 (Session 3) - MoMo Payment Integration ✅

**VIP Card Purchase with Mobile Money:**
- Implemented complete MoMo payment flow for card purchases
- Payment modal with phone input and summary
- Test mode with manual confirmation endpoint
- Welcome bonus (GHS 1) credited on activation
- Transaction history updated automatically

**Payment API Endpoints:**
- `POST /api/payments/card/initiate` - Initiate card purchase
- `POST /api/payments/merchant/initiate` - Pay at merchant (earn cashback)
- `GET /api/payments/status/{id}` - Check payment status
- `POST /api/payments/callback` - BulkClix webhook
- `POST /api/payments/test/confirm/{id}` - Test mode confirmation
- `POST /api/payments/test/fail/{id}` - Test mode failure

**Testing Results (Iteration 23):**
- Backend: 100% (11/11 tests passed)
- Frontend: 100% - Full payment flow working

---

### March 4, 2026 (Session 3) - Architecture Rebuild ✅

**Complete system rebuilt with modular architecture:**

```
/app/backend/
├── server.py           # Main FastAPI app with lifespan
├── models/
│   └── schemas.py      # Pydantic models
├── routers/
│   ├── auth.py         # Authentication
│   ├── clients.py      # Client dashboard, cards, referrals
│   ├── merchants.py    # Merchant dashboard, settings
│   ├── transactions.py # Transaction history
│   ├── admin.py        # Admin management
│   └── payments.py     # MoMo payments (NEW)
└── services/
    ├── bulkclix_service.py     # Airtime, Data, Withdrawals
    └── momo_payment_service.py # MoMo collection (NEW)
```

---

## CORE FEATURES

### Membership Cards
| Card | Price | Color | Benefits |
|------|-------|-------|----------|
| Silver | GHS 25 | #C0C0C0 | All partner access, cashback, referrals |
| Gold | GHS 50 | #FFD700 | + Priority support, exclusive offers |
| Platinum | GHS 100 | #E5E4E2 | + VIP access, birthday bonus |

### Cashback System
- Merchants set cashback rate: 1% - 20%
- Platform commission: 5% of cashback
- Instant cashback credit after payment

### Referral System
| Who | Amount | When |
|-----|--------|------|
| Welcome Bonus | GHS 1 | New user buys card |
| Referrer Bonus | GHS 3 | Referred user buys card |

### Payment Flow
1. **Card Purchase:**
   - Client clicks "Buy" on card
   - Modal shows MoMo phone input
   - Client clicks "Pay with MoMo"
   - MoMo prompt sent (or test mode)
   - Payment confirmed → Card activated → Welcome bonus credited

2. **Merchant Payment:**
   - Client scans merchant QR (or enters code)
   - Enter payment amount
   - MoMo prompt sent
   - Payment confirmed → Cashback credited (minus platform commission)

---

## API ENDPOINTS

### Authentication (`/api/auth/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/otp/send` | Send OTP to phone |
| POST | `/client/register` | Register new client |
| POST | `/client/login` | Client login |
| POST | `/merchant/register` | Register new merchant |
| POST | `/merchant/login` | Merchant login |
| POST | `/admin/login` | Admin login |
| GET | `/me` | Get current user |

### Payments (`/api/payments/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/card/initiate` | Initiate card purchase payment |
| POST | `/merchant/initiate` | Initiate merchant payment |
| GET | `/status/{id}` | Check payment status |
| POST | `/callback` | BulkClix webhook |
| POST | `/test/confirm/{id}` | [TEST] Confirm payment |
| POST | `/test/fail/{id}` | [TEST] Fail payment |

### Clients (`/api/clients/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Client dashboard |
| GET | `/cards/available` | List card options |
| GET | `/transactions` | Transaction history |
| GET | `/referrals` | Referral info |

### Merchants (`/api/merchants/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Merchant dashboard |
| PUT | `/settings/cashback` | Update cashback rate |
| PUT | `/settings/payment` | Update MoMo/Bank info |

### Admin (`/api/admin/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/clients` | List all clients |
| GET | `/merchants` | List all merchants |
| PUT | `/clients/{id}/status` | Update client status |
| PUT | `/merchants/{id}/status` | Update merchant status |

---

## DATABASE SCHEMA

### Collections
- **clients**: Customer accounts with card info and balance
- **merchants**: Partner businesses with cashback settings
- **admins**: Platform administrators
- **transactions**: All financial operations
- **membership_cards**: Active cards with card numbers
- **momo_payments**: MoMo payment tracking (NEW)
- **referrals**: Referral tracking
- **platform_config**: Platform settings

---

## TEST CREDENTIALS

### Admin
- URL: `/admin`
- Email: `emileparfait2003@gmail.com`
- Password: `Gerard0103@`

### Test Clients
| Phone | Password | Status | Card |
|-------|----------|--------|------|
| +233541234567 | TestPass123 | Active | Gold |
| +233551234567 | TestPass123 | Active | Platinum |
| +23355950104 | TestPass123 | Active | Gold |

### Test Merchant
- Business: Test Shop
- QR Code: `SDM-M-6D343A81`
- Cashback Rate: 5%

### Test Mode
- OTP Code: `123456` (any phone)
- MoMo: Use `/api/payments/test/confirm/{id}`

---

## MOCKED INTEGRATIONS
- **BulkClix OTP SMS** - Test mode (code: 123456)
- **BulkClix MoMo Collection** - Test mode (manual confirm)

## ENVIRONMENT
```
PAYMENT_TEST_MODE=true  # Enable test mode
BULKCLIX_API_KEY=...    # API key configured but test mode enabled
```

---

## UPCOMING TASKS (P1)

### Phase 3 - Enhanced Features
1. **QR Code Scanning** - Camera integration for scanning merchant QR
2. **Partner Directory** - List of merchants with cashback rates
3. **Referral Sharing** - Deep links and social sharing
4. **Transaction Notifications** - SMS/Push alerts

### Phase 4 - Production Ready
1. **Disable Test Mode** - Set `PAYMENT_TEST_MODE=false`
2. **Configure BulkClix Callback URL** - For real payment confirmations
3. **Multi-language Support** - EN, FR, ZH, AR

### Future Tasks
- Real-time QR code generation (QR library)
- Cashback withdrawal to MoMo
- VIP Lottery system
- Super app services (Airtime, Data, Bills)

---

*Last Updated: March 4, 2026*
*Version: 2.1.0 (MoMo Payment Integration)*
*Status: ✅ Card Purchase Flow Complete - Test Mode Active*
