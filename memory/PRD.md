# SDM REWARDS - Product Requirements Document

## Project Overview
**SDM (Smart Development Membership)** - Digital loyalty and cashback platform for Ghana

> **IMPORTANT**: SDM is not a bank. It is a network of loyal consumers earning cashback rewards.

---

## CHANGELOG

### March 4, 2026 - Phase 2 Complete ✅

**QR Scanner & Partner Directory:**
- QR Scanner integration with html5-qrcode library
- "Scan to Pay Merchant" button opens camera scanner
- Partner Directory page with search and category filters
- Merchant detail modal with "Pay This Merchant" action

**Referral Sharing:**
- Share buttons: WhatsApp, Twitter, Facebook, Copy Link
- Native share API integration for mobile devices
- Deep link generation for referral codes

**Testing Results (Iteration 24):**
- Backend: 100% (20/20 tests)
- Frontend: 95% (all core features working)

---

### March 4, 2026 - MoMo Payment Integration ✅

**VIP Card Purchase Flow:**
- Payment modal with MoMo phone input
- Test mode with manual confirmation
- Welcome bonus (GHS 1) on activation

**Merchant Payment Flow:**
- Scan QR → Enter amount → Cashback preview → Pay
- Cashback calculation: merchant_rate - 5% commission
- Net cashback credited instantly

---

## CORE FEATURES

### Membership Cards
| Card | Price | Benefits |
|------|-------|----------|
| Silver | GHS 25 | All partner access, cashback, referrals |
| Gold | GHS 50 | + Priority support, exclusive offers |
| Platinum | GHS 100 | + VIP access, birthday bonus |

### Cashback System
- Merchants set rate: 1% - 20%
- Platform commission: 5% of cashback
- Instant credit after payment

### Referral Bonuses
- Welcome Bonus: GHS 1 (on card purchase)
- Referrer Bonus: GHS 3 (per successful referral)

---

## USER FLOWS

### Client Card Purchase
1. Login/Register with phone + OTP
2. Select card tier (Silver/Gold/Platinum)
3. Enter MoMo number
4. Approve MoMo prompt
5. Card activated + Welcome bonus credited

### Client Payment at Merchant
1. Open QR Code tab
2. Tap "Scan to Pay Merchant"
3. Scan merchant's QR code
4. Enter payment amount (see cashback preview)
5. Tap "Pay with MoMo"
6. Approve MoMo prompt
7. Payment complete + Cashback credited

### Referral Sharing
1. Open Referrals tab
2. See referral code and stats
3. Tap share button (WhatsApp/Twitter/Facebook/Copy)
4. Friend registers with referral code
5. Both receive bonuses when friend buys card

---

## API ENDPOINTS

### Authentication (`/api/auth/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/otp/send` | Send OTP |
| POST | `/client/register` | Register client |
| POST | `/client/login` | Client login |
| POST | `/merchant/register` | Register merchant |
| POST | `/merchant/login` | Merchant login |
| POST | `/admin/login` | Admin login |

### Payments (`/api/payments/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/card/initiate` | Start card purchase |
| POST | `/merchant/initiate` | Pay merchant |
| GET | `/status/{id}` | Check payment |
| POST | `/test/confirm/{id}` | [TEST] Confirm |

### Merchants (`/api/merchants/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/partners` | List active partners |
| GET | `/by-qr/{code}` | Lookup by QR |
| GET | `/me` | Merchant dashboard |

### Clients (`/api/clients/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Dashboard |
| GET | `/cards/available` | Card options |
| GET | `/transactions` | History |
| GET | `/referrals` | Referral info |

---

## PAGES

| Route | Page | Features |
|-------|------|----------|
| `/` | Landing | Hero, features, pricing |
| `/client` | Client Auth | Login/Register |
| `/client/dashboard` | Client Dashboard | Balance, QR, History, Referrals |
| `/client/partners` | Partner Directory | Search, filters, merchant list |
| `/merchant` | Merchant Auth | Login/Register |
| `/merchant/dashboard` | Merchant Dashboard | Stats, QR codes, settings |
| `/admin` | Admin Dashboard | Users, merchants, settings |

---

## TEST CREDENTIALS

| Role | Phone/Email | Password |
|------|-------------|----------|
| Admin | emileparfait2003@gmail.com | Gerard0103@ |
| Client (Gold) | +233541234567 | TestPass123 |
| Client (Platinum) | +233551234567 | TestPass123 |
| Merchant | +233509876543 | MerchantPass123 |

**Test Mode:**
- OTP: Use code `123456`
- MoMo: Use `/api/payments/test/confirm/{id}`

---

## TECH STACK

**Backend:**
- FastAPI + Pydantic
- MongoDB (motor)
- JWT Authentication

**Frontend:**
- React + Tailwind CSS
- Shadcn/UI components
- html5-qrcode (scanner)
- qrcode.react (generator)

**Integrations:**
- BulkClix (OTP SMS, MoMo) - TEST MODE

---

## UPCOMING TASKS

### P1 - Production Ready
1. Disable test mode (`PAYMENT_TEST_MODE=false`)
2. Configure BulkClix callback URL
3. Real MoMo payment testing
4. SMS notifications

### P2 - Enhanced Features
1. Transaction notifications (SMS/Push)
2. Cashback withdrawal to MoMo
3. Multi-language support (EN, FR)
4. Analytics dashboard

### P3 - Future
- VIP Lottery system
- Super app services
- Mobile app (React Native)

---

*Last Updated: March 4, 2026*
*Version: 2.2.0 (Phase 2 Complete)*
*Status: ✅ QR Scanner, Partner Directory, Referral Sharing - All Working*
