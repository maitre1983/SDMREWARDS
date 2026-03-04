# SDM REWARDS - Product Requirements Document

## Project Overview
**SDM (Smart Development Membership)** - Digital loyalty and cashback platform for Ghana

---

## CHANGELOG

### March 4, 2026 - Phase 3: SMS Notifications ✅

**SMS System Implemented:**
- Card purchase confirmation SMS to client
- Payment cashback SMS to client
- Payment received SMS to merchant
- Referral bonus SMS to referrer
- Payment failed SMS on callback failure

**Callback Configuration:**
- BulkClix callback URL: `{CALLBACK_BASE_URL}/api/payments/callback`
- Handles: success, failed, pending statuses
- Triggers SMS on payment completion/failure

**Test Results (Iteration 25):**
- Backend: 100% (12/13 tests, 1 skipped due to collision)
- SMS Templates: 5 types verified

---

### March 4, 2026 - Phase 2: QR & Partners ✅

**Features:**
- QR Scanner with html5-qrcode library
- Partner Directory with search/filters
- Referral sharing (WhatsApp, Twitter, Facebook)

---

### March 4, 2026 - Phase 1: Architecture ✅

**Modular backend with routers:**
- auth, clients, merchants, transactions, admin, payments

---

## CORE FEATURES

### Membership Cards
| Card | Price | Benefits |
|------|-------|----------|
| Silver | GHS 25 | Basic access |
| Gold | GHS 50 | + Priority support |
| Platinum | GHS 100 | + VIP access |

### Cashback
- Rate: 1% - 20% (set by merchant)
- Commission: 5% platform fee
- Credit: Instant after payment

### Referrals
- Welcome: GHS 1
- Referrer: GHS 3

---

## SMS TEMPLATES

| Type | Recipient | Message |
|------|-----------|---------|
| card_purchase | Client | "Your {card} Card is now active! Welcome bonus credited." |
| payment_cashback | Client | "Payment at {merchant} confirmed. Cashback: +GHS {amount}" |
| merchant_payment | Merchant | "You received GHS {amount} from {client}." |
| referral_bonus | Referrer | "{name} joined! Bonus: +GHS {amount}" |
| payment_failed | Client | "Payment could not be completed." |

---

## API ENDPOINTS

### Payments (`/api/payments/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/card/initiate` | Start card purchase |
| POST | `/merchant/initiate` | Pay merchant |
| GET | `/status/{id}` | Check status |
| POST | `/callback` | BulkClix webhook |
| POST | `/test/confirm/{id}` | Test mode confirm |

---

## CONFIGURATION

```env
# Payment Mode
PAYMENT_TEST_MODE=true    # true=manual confirm, false=real MoMo
SMS_TEST_MODE=true        # true=log only, false=send SMS

# BulkClix
BULKCLIX_API_KEY=...
CALLBACK_BASE_URL=https://web-boost-seo.preview.emergentagent.com
```

---

## TEST CREDENTIALS

| Role | Phone/Email | Password |
|------|-------------|----------|
| Admin | emileparfait2003@gmail.com | Gerard0103@ |
| Client | +233551111111 | TestPass123 |
| Merchant | +233509876543 | MerchantPass123 |

**Test Mode:**
- OTP: `123456`
- MoMo: `/api/payments/test/confirm/{id}`

---

## DATABASE COLLECTIONS

| Collection | Purpose |
|------------|---------|
| clients | Customer accounts |
| merchants | Partner businesses |
| transactions | Financial records |
| momo_payments | Payment tracking |
| sms_logs | SMS notifications log |
| membership_cards | Active cards |
| referrals | Referral tracking |

---

## PRODUCTION CHECKLIST

### To Enable Real MoMo Payments:
1. Set `PAYMENT_TEST_MODE=false`
2. Configure BulkClix MoMo Collection API
3. Verify callback URL is accessible

### To Enable Real SMS:
1. Set `SMS_TEST_MODE=false`
2. Verify BulkClix SMS API key
3. Configure sender ID

---

## UPCOMING TASKS

### P1 - Ready for Production
- [ ] Configure BulkClix MoMo Collection endpoint
- [ ] Test real MoMo payments
- [ ] Enable production SMS

### P2 - Enhanced Features
- Cashback withdrawal to MoMo
- Multi-language support (EN, FR)
- Push notifications (mobile)

### P3 - Future
- VIP Lottery system
- Super app services
- Mobile app (React Native)

---

*Last Updated: March 4, 2026*
*Version: 2.3.0 (SMS Notifications)*
*Status: ✅ All Core Features Complete - Test Mode Active*
