# SDM REWARDS - Product Requirements Document

## Project Overview
**SDM (Smart Development Membership)** - Digital loyalty and cashback platform for Ghana

> **IMPORTANT**: SDM is not a bank. It is a network of loyal consumers earning cashback rewards.

---

## CHANGELOG - March 4, 2026 (Session 3) - ARCHITECTURE REBUILD

### Complete System Rebuild
Following user request, the entire application was rebuilt from scratch with a new modular architecture:

**Backend Architecture:**
```
/app/backend/
├── server.py           # Main FastAPI app with lifespan
├── models/
│   └── schemas.py      # Pydantic models (Client, Merchant, Transaction, etc.)
└── routers/
    ├── auth.py         # Authentication (OTP, login, register for client/merchant/admin)
    ├── clients.py      # Client dashboard, cards, transactions, referrals
    ├── merchants.py    # Merchant dashboard, settings, QR codes
    ├── transactions.py # Payment processing (placeholder)
    └── admin.py        # Admin dashboard, user management, settings
```

**Frontend Architecture:**
```
/app/frontend/src/pages/
├── HomePage.jsx          # Landing page with cards display
├── ClientAuthPage.jsx    # Client login/register with OTP
├── ClientDashboard.jsx   # Client wallet, cards, transactions
├── MerchantAuthPage.jsx  # Merchant login/register with OTP
├── MerchantDashboard.jsx # Merchant stats, QR codes, settings
└── AdminDashboard.jsx    # Admin overview, client/merchant management
```

### Features Implemented
1. **Landing Page** - Hero section, features grid, card pricing, how it works
2. **Client Authentication** - Phone + password login, OTP verification for registration
3. **Client Dashboard** - Balance display, card purchase, transaction history, referrals
4. **Merchant Authentication** - Business registration with OTP
5. **Merchant Dashboard** - Revenue stats, QR codes for payment/recruitment, settings
6. **Admin Dashboard** - Platform overview, client/merchant management, settings

### Testing Results (Iteration 22)
- **Backend**: 18/18 tests passed (100%)
- **Frontend**: All pages load, all flows work (100%)

### Bug Fixes During Testing
1. **HTTPException handler** - Fixed to return JSONResponse instead of dict
2. **MongoDB email index** - Fixed sparse index for nullable email fields
3. **QR code field name** - Corrected `qr_code` to `payment_qr_code` in merchant index

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
- Platform commission: 1% - 5% of cashback
- Instant cashback credit after payment

### Referral System
| Who | Amount | When |
|-----|--------|------|
| Welcome Bonus | GHS 1 | New user buys card |
| Referrer Bonus | GHS 3 | Referred user buys card |

### QR Code System
- **Payment QR** - Customers scan to pay merchant
- **Recruitment QR** - New users scan to register with referral

---

## API ENDPOINTS

### Authentication (`/api/auth/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/otp/send` | Send OTP to phone (test mode: code 123456) |
| POST | `/otp/verify` | Verify OTP code |
| POST | `/client/register` | Register new client |
| POST | `/client/login` | Client login |
| POST | `/merchant/register` | Register new merchant |
| POST | `/merchant/login` | Merchant login |
| POST | `/admin/login` | Admin login |
| GET | `/me` | Get current user info |

### Clients (`/api/clients/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Client dashboard data |
| GET | `/cards/available` | List available cards |
| POST | `/cards/purchase` | Purchase membership card |
| GET | `/cards/my-card` | Get client's card |
| GET | `/transactions` | Transaction history |
| GET | `/referrals` | Referral info & list |
| GET | `/qr-code` | Get QR code |
| PUT | `/profile` | Update profile |

### Merchants (`/api/merchants/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Merchant dashboard data |
| GET | `/settings` | Get merchant settings |
| PUT | `/settings/cashback` | Update cashback rate |
| PUT | `/settings/payment` | Update MoMo/Bank info |
| PUT | `/settings/business` | Update business info |
| GET | `/qr-codes` | Get QR codes |
| POST | `/qr-codes/regenerate` | Regenerate QR code |
| GET | `/transactions` | Transaction history |
| POST | `/api/enable` | Enable API access |

### Admin (`/api/admin/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Platform statistics |
| GET | `/clients` | List all clients |
| GET | `/clients/{id}` | Get client details |
| PUT | `/clients/{id}` | Update client |
| PUT | `/clients/{id}/status` | Update client status |
| POST | `/clients/{id}/suspend` | Suspend client |
| POST | `/clients/{id}/activate` | Activate client |
| GET | `/merchants` | List all merchants |
| PUT | `/merchants/{id}/status` | Update merchant status |
| POST | `/merchants/{id}/approve` | Approve merchant |
| GET | `/settings` | Platform configuration |
| PUT | `/settings/commissions` | Update commission rates |
| GET | `/revenue` | Revenue report |

---

## DATABASE SCHEMA

### Collections
- **clients** - Customer accounts
- **merchants** - Partner businesses
- **admins** - Platform administrators
- **transactions** - All financial operations
- **membership_cards** - Active cards
- **referrals** - Referral tracking
- **platform_config** - Platform settings
- **admin_logs** - Admin action logs

### Key Fields
**Client**: id, full_name, username, phone, email, password_hash, status, card_type, cashback_balance, referral_code, qr_code

**Merchant**: id, business_name, owner_name, phone, email, password_hash, status, cashback_rate, payment_qr_code, recruitment_qr_code, momo_number, bank_account

**Transaction**: id, type, status, client_id, merchant_id, amount, cashback_amount, commission_amount, payment_method

---

## TEST CREDENTIALS

### Admin
- URL: `/admin` (redirects to `/admin<DDMMYYYY>`)
- Email: `emileparfait2003@gmail.com`
- Password: `Gerard0103@`

### Test Client
- Phone: `0541234567`
- Password: `TestPass123`

### Test Merchant
- Phone: `0509876543`
- Password: `MerchantPass123`

### OTP Test Mode
- Use code: `123456` for any phone number

---

## MOCKED INTEGRATIONS
- **BulkClix OTP SMS** - In test mode, returns TEST_ request_id
- **BulkClix MoMo Payments** - Not yet integrated

## ACTIVE INTEGRATIONS
- None yet (awaiting configuration)

---

## UPCOMING TASKS (P1)

### Phase 3 - Core Functionality
1. **QR Code Payment Flow**
   - Client scans merchant QR → Enter amount → MoMo prompt
   - Merchant scans client QR → Enter amount → MoMo prompt to client
   
2. **BulkClix MoMo Integration**
   - Reuse existing `/app/backend/services/bulkclix_service.py`
   - Card purchase via MoMo
   - Merchant payment collection

3. **Cashback Calculation**
   - Calculate cashback based on merchant rate
   - Deduct platform commission
   - Credit client wallet

### Phase 4 - Enhanced Features
1. **Partner Directory** - List of active merchants with cashback rates
2. **Transaction Notifications** - SMS/Push for payments and cashback
3. **Multi-language Support** - EN (priority), FR, ZH, AR

### Future Tasks
- Real-time QR code generation
- VIP Lottery system
- Super app services (Airtime, Data, Bills)
- Mobile Money withdrawal
- KYC verification

---

## TECHNICAL NOTES

### Environment Variables
```
# Backend (.env)
MONGO_URL=mongodb://...
DB_NAME=sdm_rewards
JWT_SECRET=...
BULKCLIX_API_KEY=...
BULKCLIX_OTP_USER=...
BULKCLIX_OTP_PASS=...

# Frontend (.env)
REACT_APP_BACKEND_URL=https://...
```

### MongoDB Indexes
- clients: phone (unique), email (unique, sparse), username (unique), referral_code (unique)
- merchants: phone (unique), email (unique, sparse), payment_qr_code (unique)
- transactions: client_id, merchant_id, created_at, type

---

*Last Updated: March 4, 2026*
*Version: 2.0.0 (Architecture Rebuild)*
*Status: ✅ MVP Complete - All auth flows, dashboards functional*
