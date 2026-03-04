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
| Mobile Money | ✅ REAL | BulkClix API - Real payments with webhook confirmation |
| Card Payment | ❌ Disabled | Not yet implemented - returns error |
| Cash | ✅ COMPLETE | Client confirmation required |

### Payment Flow (CORRECTED - March 3, 2026)
**Le cashback n'est crédité qu'APRÈS l'approbation du paiement par le client.**

**Deux modes de paiement:**

#### Mode 1: Client scanne QR Marchand (NEW - March 4, 2026)
1. **Client ouvre l'app** → Onglet Wallet → "Scanner le QR Marchand"
2. **Client scanne le QR code du marchand**
3. **Système affiche les infos du marchand** (nom, taux cashback)
4. **Client entre le montant** et voit le cashback prévu
5. **Client clique "Payer"** → Prompt MoMo envoyé
6. **Client approuve sur son téléphone**
7. Webhook reçu → Marchand payé → Commission SDM → Cashback crédité

#### Mode 2: Marchand scanne QR Client
1. **Marchand scanne le QR code du client**
2. **Marchand entre le montant**
3. **Système envoie prompt MoMo au client**
4. **Client approuve sur son téléphone**
5. Webhook reçu → Marchand payé → Commission SDM → Cashback crédité

### API Endpoints pour paiements client
- `GET /api/sdm/merchant/by-qr/{qr_code}` - Récupère les infos du marchand par QR code
- `POST /api/sdm/client/pay-merchant` - Client initie un paiement vers marchand

### Webhooks
- `/api/sdm/payments/webhook/transaction` - Pour le flux `/merchant/transaction`
- `/api/sdm/payments/webhook/legacy` - Pour le flux `/payments/initiate` et `/payments/merchant-initiate`

### Split Formula
```
Amount: 1000 GHS @ 10% Cashback
- Total Cashback: 100 GHS (10% of amount)
- SDM Commission: 2-20 GHS (configurable 2-20% of cashback)
- Client Receives: 80-98 GHS (immediately available AFTER approval)
- Merchant Receives: 900 GHS (via MoMo transfer)
```

### Commission Configuration (Updated March 3, 2026)
- **Taux de commission SDM**: Paramétrable entre 0.5% et 20%
- Modifiable par le super_admin dans l'onglet "Commissions SDM"
- API: `GET/PUT /api/sdm/admin/commission-rate`

### Service Fees Configuration (NEW - March 3, 2026)
Tous les frais de services sont maintenant dynamiques et configurables depuis l'admin:
- **Airtime Fee**: 2% par défaut (configurable)
- **Data Fee**: 2% par défaut (configurable)
- **Bill Pay Fee**: 2% par défaut (configurable)
- **MoMo Withdraw Fee**: 1% + 1 GHS flat (configurables)

Configuration via:
- **Admin Panel**: Fintech Ledger → Config
- **API**: `PUT /api/sdm/admin/config` avec les champs:
  - `airtime_fee_percent`
  - `data_fee_percent`
  - `bill_fee_percent`
  - `momo_withdraw_fee_percent`
  - `momo_withdraw_fee_flat`
- **Client API**: `GET /api/sdm/user/services/fees` (public)

### Flow des frais:
1. Client initie un service (Airtime, Data, Bill, MoMo Withdraw)
2. Système récupère les frais dynamiques de la config
3. Frais SDM calculés et affichés au client AVANT validation
4. Frais enregistrés dans `sdm_commissions` comme revenu SDM
5. Client débité du montant + frais

### Merchant Dashboard (Updated March 4, 2026)
**Historique des transactions complet:**
- Toutes les transactions sont visibles (de toutes les collections: sdm_transactions, pending_payments, sdm_payments)
- Affichage: Date, heure, montant, Client ID, cashback, statut
- Détails étendus au clic: taux cashback, méthode de paiement

**Statistiques (jour/semaine/mois/total):**
- Ventes Aujourd'hui
- Ventes Cette Semaine
- Ventes Ce Mois
- Total Cashback distribué
- Nombre de transactions par période

**API Endpoints:**
- `GET /api/sdm/merchant/transactions` - Liste complète des transactions
- `GET /api/sdm/merchant/report` - Statistiques jour/semaine/mois/total

### Cashback Instantané (Updated March 4, 2026)
- **PLUS DE STATUT "PENDING"** - Tout est instantané
- Cashback crédité immédiatement dans `wallet_available`
- Commissions SDM enregistrées immédiatement
- Transactions marquées comme "completed" dès le webhook reçu

### Partner Directory (Updated March 4, 2026)
- Liste cliquable des partenaires dans l'onglet "Our Partners"
- Au clic, affichage d'un modal avec:
  - Nom et logo du partenaire
  - Taux de cashback
  - **Numéro de téléphone** (cliquable pour appeler)
  - **Adresse et localisation** (lien vers Google Maps si GPS disponible)
  - Horaires d'ouverture
  - Bouton "Payer chez ce marchand"
- API `/api/sdm/partners` inclut: phone, address, city, gps_location, qr_code, business_hours

### SDM Commission Management (NEW - March 3, 2026)
- Onglet "Commissions SDM" dans le tableau de bord admin (super_admin seulement)
- Affiche: Total gagné, Total retiré, Solde disponible
- **Retrait via MoMo**: Le super admin peut retirer les commissions vers son compte MoMo
- API: `GET /api/sdm/admin/commissions`, `POST /api/sdm/admin/commissions/withdraw`

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
1. ✅ **Phase 1**: Extract utility functions to `utils/helpers.py`
2. ✅ **Phase 2**: Extract configuration constants to `config.py`
3. **Phase 3** (Next): Extract auth routes to `routers/auth.py`
4. **Phase 4**: Extract user routes to `routers/users.py`
5. **Phase 5**: Extract merchant routes to `routers/merchants.py`

### Progress
- `server.py`: 7658 → 7565 lines (-93 lines, ~1.2% reduction)
- New files created:
  - `/app/backend/utils/helpers.py` - Utility functions
  - `/app/backend/config.py` - Configuration constants
- Frontend:
  - `/app/frontend/src/components/admin/MessagesPanel.jsx` - Messages with Promos & Notifications
  - `/app/frontend/src/App.js` - Fixed admin routing

### Dashboard Reorganization (March 3, 2026)
- **Moved to Messages Panel**:
  - Inbox (messages)
  - Promotions 
  - Notifications
- **Fintech Ledger** now focuses on financial features only

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

## RECENT FIXES (March 3, 2026)

### Admin Login Playwright Test Fix
- **Issue**: Le test automatisé Playwright pour la connexion admin échouait à cause d'une race condition
- **Root Cause**: 
  1. Les inputs React utilisaient `value` + `onChange` (controlled components) incompatibles avec Playwright `fill()`
  2. Après le login, le dashboard faisait des requêtes API avant que le token soit disponible dans le contexte
  3. Les erreurs 401 déclenchaient un logout automatique qui supprimait le token
- **Solution**:
  1. Modifié `AdminPage.jsx` pour utiliser `useRef` au lieu de `useState` pour les inputs (compatible Playwright)
  2. Stockage du token directement dans localStorage AVANT d'appeler le contexte auth
  3. Ajout d'un état `loginSuccess` pour forcer le re-render vers le dashboard
  4. Modifié `AdminDashboardPage.jsx`:
     - `getHeaders()` lit le token depuis le contexte OU localStorage comme fallback
     - Le logout sur erreur 401 ne se déclenche que si aucun token n'existe dans localStorage
- **Files Modified**:
  - `/app/frontend/src/pages/AdminPage.jsx`
  - `/app/frontend/src/pages/AdminDashboardPage.jsx`

### BulkClix Payment Integration (March 3, 2026)
- **New Feature**: Real MoMo payment integration via BulkClix API
- **Implemented**:
  1. **MoMo Collection** (`/api/sdm/user/vip-cards/purchase`): Initiates payment collection from customer
  2. **Payment Webhook** (`/api/sdm/payments/webhook/vip-card`): Receives payment confirmation and activates membership
  3. **Payment Status Check** (`/api/sdm/user/vip-cards/payment-status/{transaction_id}`): Check payment/membership status
  4. **MoMo Transfer** (`/api/admin/withdrawals/{id}/send-momo`): Admin can send withdrawals via MoMo
  5. **KYC Verification** (`/api/sdm/merchant/verify-momo`): Verify MoMo account name before settlement config
  6. **Merchant Settlement Config** (`/api/sdm/merchant/settlement`): Configure settlement with KYC verification
- **Test Mode**: Disabled - Real payments working with whitelisted IP
- **Files Created**:
  - `/app/backend/services/bulkclix_payment.py`: Payment service with collection, transfer, and KYC
- **Files Modified**:
  - `/app/backend/server.py`: Added payment endpoints and webhook
  - `/app/backend/services/__init__.py`: Export new payment service

### Customer-to-Merchant Payment Flow (March 3, 2026)
- **Critical Fix**: Implemented correct payment flow where customer pays FIRST
- **Flow**:
  1. Customer scans merchant QR → System collects from customer's MoMo
  2. Customer approves payment on phone
  3. Webhook confirms → Merchant receives funds instantly
  4. SDM receives commission
  5. Customer receives cashback
- **New Endpoints**:
  - `POST /api/sdm/merchant/transaction`: Initiates MoMo collection from customer
  - `POST /api/sdm/payments/webhook/transaction`: Processes payment confirmation
  - `GET /api/sdm/merchant/transaction/{id}/status`: Check transaction status
- **Tested**: Real payment of 15 GHS completed in ~8 seconds

### Admin Transaction History Panel (March 3, 2026)
- **New Feature**: Full transaction history for Super Admin
- **Components**:
  - `/app/frontend/src/components/admin/TransactionHistoryPanel.jsx`: New panel
  - Added "Transactions" tab in Admin Dashboard sidebar
- **Endpoints**:
  - `GET /api/sdm/admin/transactions`: Get all transactions with filters
  - `GET /api/sdm/admin/transactions/stats`: Get transaction statistics

### Merchant Settlement Configuration UI (March 3, 2026)
- **New Feature**: Settlement configuration in merchant Settings
- **Includes**:
  - Settlement mode selection (Instant / Daily)
  - Settlement type (MoMo / Bank)
  - MoMo configuration with KYC verification
  - Bank account configuration
- **Backend**: KYC verification via BulkClix when saving MoMo number

---

*Last Updated: March 3, 2026*
*BulkClix Payment Integration: FULLY WORKING - Real payments enabled*
*Customer Payment Flow: Customer pays first, then merchant receives*
*Admin Transaction History: Complete visibility for Super Admin*
*Merchant Settlement Config: MoMo/Bank with KYC verification*
