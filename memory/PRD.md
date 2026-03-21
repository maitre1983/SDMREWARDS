# SDM REWARDS - Product Requirements Document

## Original Problem Statement
Migration complète des services de paiement de BulkClix vers Hubtel pour la plateforme SDM REWARDS au Ghana. La plateforme offre des récompenses cashback aux clients qui achètent chez des marchands partenaires.

## Architecture
```
/app
├── backend/
│   ├── routers/
│   │   ├── admin/              # Package modulaire ✅
│   │   │   ├── __init__.py     # Routeur principal
│   │   │   └── legacy_routes.py # Routes à extraire
│   │   ├── merchants/          # Package modulaire ✅
│   │   │   ├── __init__.py
│   │   │   └── legacy_routes.py
│   │   ├── payments/           # Package modulaire complet ✅
│   │   │   ├── __init__.py, card.py, callbacks.py, etc.
│   │   ├── admin_modules/      # Modules admin fonctionnels
│   │   │   ├── sms.py          # SMS Hubtel (Simple, Batch, Personalized) ✅
│   │   │   ├── clients.py, merchants.py, etc.
│   │   ├── auth.py             # OTP migré vers Hubtel ✅
│   │   └── services.py         # VAS migré vers Hubtel ✅
│   ├── services/
│   │   ├── hubtel_momo_service.py  # Paiements MoMo ✅
│   │   ├── hubtel_sms_service.py   # SMS (Simple, Batch, Personalized) ✅
│   │   └── hubtel_vas_service.py   # Airtime/Data/ECG ✅
│   ├── tests/
│   │   ├── conftest.py
│   │   └── test_critical_endpoints.py  # 14 tests ✅
│   └── server.py
├── frontend/
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useRoutePreload.js    # Route preloading for fast nav ✅
│   │   │   └── useDataCache.js       # Stale-while-revalidate caching ✅
│   │   └── pages/
│   │       ├── ClientDashboard.jsx
│   │       └── ServicesPage.jsx
│   └── public/
│       └── sw.js                     # Service Worker v3 with API caching ✅
└── mobile/
    └── (Expo app - build Android corrigé)
```

## Completed Features

### 2026-03-21 (Fork) - PERFORMANCE OPTIMIZATION ⚡
- ✅ **Route Preloading System** - Predictive loading based on navigation patterns
  - Created `useRoutePreload.js` hook
  - Preloads likely next pages when current page loads
  - Supports hover/focus preloading for instant navigation
- ✅ **Data Caching Hook** - Stale-while-revalidate pattern for API data
  - Created `useDataCache.js` hook
  - 30-second TTL for cached dashboard data
  - Shows stale data instantly while revalidating in background
- ✅ **Enhanced Service Worker v3**
  - Stale-while-revalidate for dashboard API endpoints
  - Separate API cache with intelligent invalidation
  - Prefetch support via postMessage
- ✅ **Component Memoization** - AdvancedDashboard optimized with:
  - `useMemo` for static data
  - `useCallback` for functions
  - `memo()` wrapped sub-components
- ✅ **Performance Results**:
  - Page load times: **0.12-0.15 seconds** (Target: 2-3 seconds)
  - All routes lazy-loaded with React.lazy()
  - Vendor chunks properly split (~80+ chunks)

### 2026-03-21 (Fork) - WEBSOCKET REAL-TIME SYNC 🔄
- ✅ **Backend WebSocket Router** (`/app/backend/routers/websocket_router.py`)
  - `/api/ws/merchant` - Merchant real-time updates
  - `/api/ws/client` - Client real-time updates
  - `/api/ws/admin` - Admin real-time updates
  - `/api/ws/status` - Connection statistics
  - ConnectionManager class for pub/sub functionality
  - Auto-reconnection and heartbeat support
- ✅ **Frontend WebSocket Service** (`/app/frontend/src/services/webSocketService.js`)
  - Singleton WebSocket manager
  - Automatic reconnection with exponential backoff
  - Event-based subscription system
  - Ping/pong heartbeat to keep connections alive
- ✅ **React WebSocket Hooks** (`/app/frontend/src/hooks/useWebSocket.js`)
  - `useWebSocket` - Generic hook
  - `useMerchantWebSocket` - Merchant-specific
  - `useClientWebSocket` - Client-specific
  - `useAdminWebSocket` - Admin-specific
- ✅ **WebSocket Connection Indicator** (`/app/frontend/src/components/WebSocketIndicator.jsx`)
  - Visual status indicator in dashboard headers
  - Shows: Connected (green pulse), Connecting (amber), Offline (gray)
- ✅ **Dashboard Integration**
  - MerchantDashboard: Auto-refresh on payment_received events
  - ClientDashboard: Auto-refresh on balance_update events
  - Toast notifications for real-time events
- ✅ **Event Types Supported**:
  - `payment_received` - New payment notification
  - `balance_update` - Cashback balance changed
  - `dashboard_refresh` - Request to refresh data
  - `payout_update` - Payout status changed
  - `heartbeat` - Keep-alive ping

### 2026-03-21 (Current Session) - MERCHANT WITHDRAWAL SYSTEM
- ✅ **Merchant Withdrawal Tab** - New "Withdrawal" tab in Settings showing:
  - **Balance Cards**: Available balance, Pending, Total Received
  - **Manual Withdraw**: Button to withdraw funds to configured MoMo/Bank
  - **Automatic Withdraw**: Toggle and settings for scheduled payouts
- ✅ **Balance Calculation Fixed** - Now correctly aggregates from all payment sources:
  - transactions, cash_payments, momo_payments collections
  - Uses `$ifNull` to handle missing `merchant_amount` field
- ✅ **Auto-Withdrawal Worker** - Background service for scheduled withdrawals:
  - Instant: Process immediately after each payment
  - Daily: Process at midnight
  - Weekly: Process every Sunday
  - File: `/app/backend/services/auto_withdrawal_worker.py`
  - Task endpoint: `POST /api/tasks/process-auto-withdrawals`
- ✅ **Admin Withdrawal History** - Admin can view all merchant withdrawals:
  - Endpoint: `GET /api/admin/merchant-withdrawals`
  - Shows: merchant name, amount, date/time, status, payout method
  - Stats: completed, pending, processing, failed counts and amounts

### 2026-03-21 (Fork 2) - MANUAL WITHDRAW UI REFINEMENT
- ✅ **Quick Amount Buttons** - Added 50, 100, 500, TOUT buttons for fast selection
  - Buttons dynamically filter based on available balance (only show if <= balance)
  - TOUT button sets amount to full available balance
- ✅ **Custom Amount Input** - GHS-prefixed input for manual entry
- ✅ **Destination Display** - Shows MoMo network/number or Bank info based on settings
- ✅ **Code Cleanup** - Removed unused `showManualWithdraw` state variable
- ✅ **Balance API Fix** - Fixed 404 bug in `/api/merchants/balance` endpoint
  - Root cause: Empty projection result evaluating to falsy
  - Fix: Check merchant existence with simple id projection first
- ✅ **French Labels** - UI uses French: 'Retirer', 'Montant à retirer', 'TOUT', etc.

### 2026-03-21 (Fork 2 - Part 2) - AUTO-WITHDRAWAL CRON JOB
- ✅ **Auto-Withdrawal Worker Integration** - Worker starts automatically with server
  - Runs every hour checking for daily/weekly scheduled withdrawals
  - Daily: Processes at midnight UTC
  - Weekly: Processes on Sunday at midnight UTC
- ✅ **Instant Withdrawal Trigger** - Called after each successful merchant payment
  - Merchants with `frequency: "instant"` get paid immediately after customer pays
- ✅ **New API Endpoints:**
  - `POST /api/tasks/process-auto-withdrawals` - Manual trigger for scheduled withdrawals
  - `POST /api/tasks/process-instant-withdrawals` - Manual trigger for instant withdrawals  
  - `GET /api/tasks/auto-withdrawal-status` - Check worker status and merchant counts
- ✅ **Cron Script Created** - `/app/backend/scripts/cron_auto_withdrawals.sh`
  - For external cron/scheduler to call every hour in production
- ✅ **Hubtel APIs Used:**
  - MoMo: `POST https://smp.hubtel.com/api/merchants/{Prepaid_Deposit_ID}/send/mobilemoney`
  - Bank: `POST https://smp.hubtel.com/api/merchants/{Hubtel_Prepaid_Deposit_ID}/send/bank/gh/{BankCode}`

### 2026-03-21 (Fork 2 - Part 3) - SIMPLIFIED PAYOUT SYSTEM
- ✅ **Removed Auto-Withdrawal Complexity** - SDM ne garde pas l'argent du marchand
  - Supprimé le système d'auto-withdrawal (redondant avec auto-payout)
  - Supprimé l'appel à `process_instant_withdrawals()` du flux de paiement
- ✅ **Simplified UI** - MerchantWithdrawal.jsx simplifié:
  - Bannière "Paiements Automatiques Activés" montrant la destination configurée
  - Cartes de solde (Disponible, En Attente, Total Reçu)
  - Section retrait manuel (uniquement si solde > 5 GHS)
  - Historique des paiements
- ✅ **Auto-Payout via `_process_merchant_payout()`** - Fonctionne après chaque paiement client:
  - Vérifie `preferred_payout_method` (momo ou bank)
  - Crée un enregistrement dans `merchant_payouts`
  - Envoie via Hubtel Send Money API
  - Status géré via callback (processing → completed/failed)
- ✅ **Transfer Callback Improvements:**
  - Met à jour le solde marchand quand payout confirmé "completed"
  - Gère les références SDM-PAYOUT-XXXXXXXX
- ✅ **SMS Notification** - Marchand notifié après chaque payout réussi

### 2026-03-21 (Fork 2 - Part 4) - ENGLISH TRANSLATION, RESPONSIVE & PWA
- ✅ **English Translation (Priority Language):**
  - MerchantWithdrawal.jsx - fully translated
  - MerchantDashboard.jsx - tabs, labels, messages
  - AdvancedDashboard.jsx - periods, stats, charts
  - PinModal.jsx - verification prompts
  - ClientDashboard.jsx - balance card, headers
  - Various admin components
  - Default language changed to English in LanguageContext
- ✅ **Responsive Design Improvements:**
  - Mobile-first padding: `px-3 sm:px-4`, `p-4 sm:p-6`
  - Header: truncated business name, smaller icons on mobile
  - Balance cards: responsive text sizes `text-2xl sm:text-3xl`
  - QR codes: responsive sizing `w-[150px] sm:w-[180px]`
  - Touch-friendly buttons with `p-1` or `p-2` padding
- ✅ **PWA (Progressive Web App) Setup:**
  - `/public/manifest.json` - app name, icons, shortcuts, theme colors
  - `/public/sw.js` - service worker with offline caching
  - `index.html` - PWA meta tags, apple-mobile-web-app-capable
  - Service worker registration on page load
  - App installable from browser (Add to Home Screen)
- ✅ **Cleanup:**
  - Removed "Relevés" (Statements) tab from merchant dashboard
  - Removed BulkClix from .env and config.py completely

### 2026-03-21 (Fork 2 - Part 5) - PWA INSTALL BUTTON, DATA SYNC & TIME DISPLAY
- ✅ **PWA Install Button Visible:**
  - Created `/components/PWAInstallPrompt.jsx` component
  - Shows floating banner on all pages when installable
  - Supports iOS with "How to Install" instructions
  - Icon-only and button variants for headers
  - Auto-dismissible per session
- ✅ **Mini Accounting Data Sync Fixed:**
  - Updated `/api/merchants/dashboard/summary` to aggregate from ALL sources
  - Now checks: `transactions`, `momo_payments`, `cash_payments`
  - Includes `merchant_withdrawals` in total paid out
  - Returns unique customer count
- ✅ **Time Added to All Transaction Histories:**
  - Format: `DD Mon HH:MM` (e.g., "21 Mar 14:35")
  - Updated: ClientDashboard, MerchantDashboard, AdminDashboard
  - Updated: PayoutHistory, MerchantWithdrawal
  - Created `/utils/dateFormat.js` utility

### 2026-03-20 - MERCHANT NOTIFICATIONS + PAYOUTS + VERIFICATION
- ✅ **Real-time Payment Notifications via SSE** - Merchants receive instant notifications when payments are received
- ✅ **Automatic Merchant Payouts** - When customers pay (MoMo/Cashback/Hybrid), merchants receive funds instantly to their configured MoMo
- ✅ **Bank Transfer Support** - Merchants can now receive payouts via bank transfer
  - Added `send_bank()` function in `hubtel_momo_service.py`
  - Added `_process_bank_payout()` in `processing.py`
  - Ghana bank codes mapped (GCB, Ecobank, Stanbic, Absa, etc.)
- ✅ **Payout History UI** - New "Payouts" tab in Settings showing:
  - Total received, pending, failed amounts
  - Payout breakdown by method (MoMo vs Bank)
  - Filterable and paginated payout list
  - Mobile-responsive design
- ✅ **MoMo & Bank Account Verification via Hubtel API**:
  - **Merchant MoMo Verification** - In Settings > Payment, merchants can verify their MoMo number to see the registered account name
  - **Merchant Bank Verification** - Verify bank account number and see account holder name before saving
  - **Client MoMo Verification** - In Withdrawal modal, clients can verify their MoMo number before withdrawing
  - **Bank Dropdown** - 21 Ghana banks available in dropdown with codes
  - **API Endpoints:**
    - `GET /api/verify/banks` - List all Ghana banks (no auth required)
    - `POST /api/verify/momo/verify` - Verify client MoMo number
    - `POST /api/verify/momo/verify/merchant` - Verify merchant MoMo number
    - `POST /api/verify/bank/verify` - Verify bank account
  - **Files Created:**
    - `/app/backend/routers/verification.py` - New verification API router
    - `/app/frontend/src/components/merchant/PayoutHistory.jsx`
  - **Files Modified:**
    - `/app/backend/services/hubtel_momo_service.py` - Added `send_bank()` and `GHANA_BANK_CODES`
    - `/app/backend/routers/payments/processing.py` - Separated MoMo and Bank payout logic
    - `/app/backend/routers/merchants/legacy_routes.py` - Enhanced `/payouts` API with stats
    - `/app/frontend/src/pages/MerchantDashboard.jsx` - Added "Payouts" tab
  - **Implementation:**
    - Backend: New SSE router at `/api/notifications/sse/` with two endpoints:
      - `GET /api/notifications/sse/status` - Check active SSE connections
      - `GET /api/notifications/sse/merchant?token=` - SSE stream for authenticated merchants
    - Integration: `notify_merchant_payment()` called in `process_merchant_payment()` after successful payment
    - Frontend: 
      - `sseNotificationService.js` - Singleton for EventSource management with reconnection
      - `useSSENotifications.js` - React hook for SSE subscription
      - `PaymentNotificationToast.jsx` - Toast component with sound alerts
      - Integration in `MerchantDashboard.jsx` - Live notification indicator
  - **Files Created:**
    - `/app/backend/routers/notifications_sse.py`
    - `/app/frontend/src/services/sseNotificationService.js`
    - `/app/frontend/src/hooks/useSSENotifications.js`
    - `/app/frontend/src/components/merchant/PaymentNotificationToast.jsx`
  - **Files Modified:**
    - `/app/backend/routers/payments/processing.py` - Added SSE notification call
    - `/app/backend/server.py` - Registered SSE router
    - `/app/backend/services/notification_service.py` - Added SmartNotificationService alias
    - `/app/frontend/src/pages/MerchantDashboard.jsx` - Added PaymentNotificationToast component
  - **Testing:** 10/10 backend tests passed, frontend components load without errors

### 2026-03-19 (Previous Session) - PAYMENT CALLBACK OPTIMIZATION
- ✅ **Critical Callback Performance Fix** - Redesigned endpoint to return immediately
  - **Problem:** Callback endpoint took 19+ seconds to respond, causing Hubtel webhooks to timeout
  - **Solution:** Implemented FastAPI BackgroundTasks for async processing
  - **New Flow:**
    1. Receive callback from Hubtel
    2. Log minimal data to `callback_logs` collection
    3. Return HTTP 200 immediately (< 500ms)
    4. Process payment in background (payment lookup, status update, cashback)
  - **Performance:**
    - Before: 19.6 seconds response time
    - After: ~0.2 seconds response time (95%+ improvement)
  - **Files Modified:**
    - `/app/backend/routers/payments/callbacks.py` - Added `process_callback_async()` background function
  - **Testing:** 13/13 tests passed

- ✅ **Admin Diagnostic Endpoints** - For production debugging
  - `GET /api/payments/admin/callback-logs` - View ALL callbacks that reached server
  - `GET /api/payments/admin/payment-debug/{ref}` - Comprehensive payment diagnosis
  - `GET /api/payments/admin/pending-payments` - List payments waiting for confirmation
  - `POST /api/payments/admin/force-complete/{ref}` - Emergency manual completion (backup only)

### 2026-03-19 (Earlier) - PAYMENT CONFIRMATION FIX
- ✅ **Critical Payment Confirmation Bug Fixed** - Complete overhaul of payment confirmation system
  - **Root Cause:** Multiple issues causing payments to be approved by MoMo but not confirmed in the system:
    1. Hubtel status check API returning 403 Forbidden (IP whitelisting issue)
    2. Poll-status endpoint not checking database before calling external API
    3. Missing error handling for database bool() check on MongoDB objects
    4. `complete_payment` not being triggered consistently
  - **Solutions Implemented:**
    1. Poll-status endpoint now checks `momo_payments` and `hubtel_payments` collections FIRST
    2. Added fallback logic - if Hubtel API returns 403, rely on database status set by webhooks
    3. Hubtel callback handler (`/api/payments/hubtel/callback`) enhanced with extensive logging
    4. `complete_payment` function now has idempotency checks to prevent double-crediting
    5. Added automatic trigger of `complete_payment` when poll-status finds completed payment
  - **Files Modified:**
    - `/app/backend/routers/payments/callbacks.py` - Enhanced poll-status and webhook handling
    - `/app/backend/routers/payments/processing.py` - Added logging and idempotency checks
    - `/app/backend/services/hubtel_momo_service.py` - Improved status check with database-first approach
    - `/app/backend/services/payment_reconciliation_service.py` - Better error handling
  - **Testing:** 32/32 backend tests passed (test_payment_confirmation_system.py)
  - **Verified Flow:** MoMo payment → Hubtel → callback → complete_payment → transaction recorded → cashback credited

### 2026-03-18 (Previous Session)
- ✅ **Client Withdrawal Limits (Global)** - Centralized control system for client withdrawals
  - Backend: `withdrawal_limits_service.py` with `effective_limit = MIN(global_limit, user_limit)`
  - API: `GET/PUT /api/admin/withdrawal-limits` endpoints
  - Frontend: `SettingsLimits.jsx` component with MoMo and Bank limit configuration
  - New "Withdrawal Limits" tab in Admin Settings dashboard
  - Full test coverage (6 backend tests, frontend E2E verified)
- ✅ **Usage Tracking Dashboard** - Real-time monitoring of client withdrawal activity
  - Backend: `get_all_clients_usage()` method for aggregated usage statistics
  - API: `GET /api/admin/withdrawal-limits/usage` with sort/filter/threshold params
  - Frontend: `UsageTrackingDashboard.jsx` with:
    - Summary cards (Active Clients, At Limit, Approaching Limit, Daily Volume)
    - Client table with color-coded progress bars (green/blue/yellow/red)
    - Search by name/phone/email
    - Sort by usage volume or percentage
    - Filter "At-Risk Only" (clients at >=80% of limits)
  - Sub-tabs in SettingsLimits: "Configure Limits" and "Usage Tracking"

### 2026-03-16 (Session 3)
- ✅ **Intégration Hubtel SMS Batch Personalized** - `POST /api/admin/sms/bulk/personalized` créé et testé
- ✅ **Interface UI SMS Personnalisés** - Modal complet dans le SMS Center
- ✅ **Templates SMS Prédéfinis** - 12 templates (tous en anglais)
- ✅ **Programmation d'envoi SMS** - Fonctionnalité de scheduling complète
- ✅ **Interface Services simplifiée** - Suppression du sélecteur Network, bandeau "Paid from Cashback Balance"
- ✅ **Traduction complète en anglais** - Admin dashboard, SMS templates, notifications, pages de paiement

### 2026-03-16 (Session 2)
- ✅ **Règles de paiement corrigées** - Airtime/Data/ECG: cashback only | Upgrade carte: cashback/MoMo/hybride
- ✅ **Tests automatisés créés** - 14 tests pytest pour endpoints critiques (OTP, services, upgrade, auth)
- ✅ **Documentation tests** - `test_critical_endpoints.py`, `conftest.py`, `pytest.ini`

### 2026-03-16 (Session 1)
- ✅ **Migration OTP Hubtel SMS** - Système OTP complet (envoi, vérification, inscription, reset password) testé et validé
- ✅ **Migration VAS Hubtel** - Airtime, Data, ECG fonctionnels
- ✅ **Correction mise à niveau carte** - Bug unicode résolu avec solution curl
- ✅ **Build Android Mobile** - async-storage downgrade + plugin Maven
- ✅ **Bouton Buy Card** - Défilement vers section achat fonctionnel

### Précédent
- ✅ Migration paiements MoMo vers Hubtel
- ✅ Suppression code BulkClix obsolète
- ✅ Nettoyage fichiers routeurs (code mort supprimé)

## In Progress / Upcoming Tasks

### P1 - Refactoring Routeurs - ✅ TERMINÉ
**Tous les fichiers volumineux refactorés en packages autonomes:**

| Package | Modules | Routes | Fichiers Legacy |
|---------|---------|--------|-----------------|
| `payments/` | 7 | 15 | ❌ Aucun |
| `merchants/` | 4 | 56 | `legacy_routes.py` (interne) |
| `admin/` | admin_modules + 1 | 96 | `legacy_routes.py` (interne) |

**Fichiers legacy externes supprimés:** ✅
- ~~`merchants_legacy.py`~~ → `merchants/legacy_routes.py`
- ~~`admin_legacy.py`~~ → `admin/legacy_routes.py`

**Tests:** 14/14 passent ✅

### P2 - Migration BulkClix - ✅ TERMINÉ
- ✅ `notification_service.py` - SMS now uses Hubtel SMS API
- ✅ `config.py` - BulkClix variables marked as DEPRECATED
- ✅ `hubtel_momo_service.py` - Comments updated
- ✅ `hubtel_vas_service.py` - Comments updated
- ✅ `sms_provider` default changed from "bulkclix" to "hubtel"
- ✅ `routers/auth.py` - Admin password reset OTP migrated to Hubtel SMS
- ✅ `routers/payments/shared.py` - is_test_mode() now checks Hubtel config
- ✅ `routers/payments/callbacks.py` - Updated comments
- ✅ `routers/payments/processing.py` - Updated imports
- ✅ `routers/merchants/legacy_routes.py` - Bank services now use HubtelBankService
- ✅ `server.py` - Public banks endpoint now uses HubtelBankService

## Blocked Issues (User Action Required)

### Retraits MoMo - 403 Forbidden
- **Cause:** IP serveur de production non whitelistée par Hubtel
- **Action:** Contacter support Hubtel avec IPs du serveur
- **Endpoint:** `smp.hubtel.com`

### Vérification Nom MoMo
- **Cause:** API "MSISDN Name Query" non activée sur compte Hubtel
- **Action:** Contacter support Hubtel pour activation

## Backlog (P3)

- [ ] Interface gestion appareils de confiance
- [ ] Whitelisting IP dans dashboard marchand  
- [ ] Full WebSocket implementation for all dashboards (upgrade from SSE)

## Known Issues - RESOLVED
### 2026-03-20
- ✅ **Hubtel RMP 403 Error** - RESOLVED: IP whitelisting by Hubtel fixed the issue
- ✅ **Hubtel SMP 500 Error** - RESOLVED: `RecipientName` field is REQUIRED (was causing 500 instead of proper validation error)
- ✅ **Withdrawal Failed Bug** - RESOLVED: `max_withdrawal` variable was undefined in `/app/backend/routers/services.py`, causing NameError crash

## Key API Endpoints

| Endpoint | Status | Description |
|----------|--------|-------------|
| `GET /api/notifications/sse/status` | ✅ **NEW** | Check active SSE connections |
| `GET /api/notifications/sse/merchant` | ✅ **NEW** | SSE stream for merchant notifications |
| `GET /api/admin/withdrawal-limits` | ✅ | Get global withdrawal limits |
| `PUT /api/admin/withdrawal-limits` | ✅ **NEW** | Update global withdrawal limits |
| `GET /api/admin/withdrawal-limits/user/{id}` | ✅ **NEW** | Get user's effective limits |
| `PUT /api/admin/withdrawal-limits/user/{id}` | ✅ **NEW** | Set individual user limits |
| `GET /api/admin/withdrawal-limits/usage` | ✅ **NEW** | Usage tracking dashboard data |
| `POST /api/auth/otp/send` | ✅ | Envoi OTP via Hubtel SMS |
| `POST /api/auth/otp/verify` | ✅ | Vérification OTP |
| `POST /api/auth/client/register` | ✅ | Inscription client avec OTP |
| `POST /api/auth/client/reset-password` | ✅ | Reset password client |
| `POST /api/auth/merchant/register` | ✅ | Inscription marchand avec OTP |
| `POST /api/auth/merchant/reset-password` | ✅ | Reset password marchand |
| `POST /api/services/airtime/purchase` | ✅ | Achat crédit Airtime (cashback only) |
| `POST /api/services/data/purchase` | ✅ | Achat forfait Data (cashback only) |
| `POST /api/clients/cards/upgrade` | ✅ | Mise à niveau carte |
| `POST /api/admin/sms/send` | ✅ | Envoi SMS individuel |
| `POST /api/admin/sms/bulk/clients` | ✅ | SMS en masse aux clients |
| `POST /api/admin/sms/bulk/merchants` | ✅ | SMS en masse aux marchands |
| `POST /api/admin/sms/bulk/personalized` | ✅ **NEW** | SMS personnalisés en masse |
| `POST /api/services/cashback/withdraw` | ⚠️ BLOQUÉ | Retrait MoMo (403 en prod) |

## Technical Notes

### Payment Confirmation Flow (Updated 2026-03-19)
The payment confirmation now works as follows:
1. **Initiation:** Client initiates payment → `momo_payments` record created with status "pending"
2. **MoMo Prompt:** Hubtel sends prompt to customer phone → `hubtel_payments` record created
3. **Customer Approval:** Customer approves on phone → Hubtel sends callback to `/api/payments/hubtel/callback`
4. **Callback Processing:** Callback handler triggers `complete_payment()` function
5. **Transaction Recording:** `complete_payment()` inserts into `transactions` collection
6. **Cashback Credit:** Client's `cashback_balance` is incremented
7. **UI Update:** Frontend polling (`/api/payments/poll-status/{id}`) detects completed status

**Key Collections:**
- `momo_payments` - Primary payment records (created by merchant.py)
- `hubtel_payments` - Hubtel-specific tracking (created by hubtel_momo_service.py)
- `transactions` - Completed transactions (shown in Recent Activity)

**Fallback Mechanism:**
- If Hubtel API returns 403 for status check, system relies on:
  1. Database status (set by webhook callbacks)
  2. Frontend polling with 3-minute timeout

### Solution Curl pour API Hubtel
La fonction `_execute_curl_command` dans `hubtel_momo_service.py` utilise `subprocess` avec `curl --http1.1 --ignore-content-length` pour contourner les problèmes de réponses tronquées de l'API Hubtel.

### Rate Limiting OTP
- 3 requêtes OTP/minute par IP
- 3 tentatives de vérification par OTP
- Expiration OTP: 10 minutes

### APIs Hubtel SMS Intégrées
| API | Endpoint | Usage |
|-----|----------|-------|
| Simple Send | `POST /v1/messages/send` | OTP, notifications individuelles |
| Batch Simple | `POST /v1/messages/batch/simple/send` | Annonces en masse (même message) |
| Batch Personalized | `POST /v1/messages/batch/personalized/send` | SMS personnalisés en masse |

### Credentials Hubtel SMS
Les credentials sont stockés dans `.env`:
- `HUBTEL_SMS_CLIENT_ID`
- `HUBTEL_SMS_CLIENT_SECRET`
- `HUBTEL_SMS_SENDER_ID` (par défaut: "SDMREWARDS")
