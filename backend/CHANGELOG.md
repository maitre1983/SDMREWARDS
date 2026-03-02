# Changelog

All notable changes to the SDM Fintech Platform.

## [Phase 8] - 2026-03-02

### Added
- **Auto Lottery Scheduler**: Automatic monthly lottery creation using APScheduler
  - Runs on 1st of each month at 00:05 UTC
  - Configurable default prize amount (500 GHS default)
  - Auto-activation option to enroll VIP members
  - Admin UI for configuration and manual trigger
  - Scheduler logs and status monitoring

### Changed
- None

### Fixed
- None

---

## [Phase 7] - 2026-03-02

### Added
- **Multilingual Support**: 4 languages (EN, FR, AR, ZH)
  - Language selector on all pages
  - RTL support for Arabic
  - Translation files for SDM client interface
- **New SDM Rewards Logo**: Updated branding across all pages

### Changed
- Updated logo URL to `/sdm-logo.png` on all pages
- Added LanguageSelector component

---

## [Phase 6] - 2026-03-01

### Added
- **VIP Lottery System**
  - Monthly VIP lottery draws
  - 5 winners per draw (40%, 25%, 15%, 12%, 8%)
  - VIP tier multipliers (Silver x1, Gold x2, Platinum x3)
  - Prize distribution to ledger wallets
  - Public result announcements

---

## [Phase 5] - 2026-02-28

### Added
- **VIP Card System**: 3-tier membership (Silver, Gold, Platinum)
- **Partner Directory**: Admin-managed partner merchants
- **Leaderboards**: Top clients by cashback and service usage
- **Promotions Engine**: Percentage discounts on services

---

## [Phase 4] - 2026-02-27

### Added
- **Super App Services** (SIMULATED):
  - Airtime purchase
  - Data bundles
  - Bill payment (ECG, GWCL, DSTV, GOTV)
  - MoMo withdrawal
- **BulkClix Integration** (simulated mode)

---

## [Phase 3] - 2026-02-26

### Added
- **Notification System**: In-app and push notifications
- **Float Alerts**: Webhook + email alerts for low float

---

## [Phase 2] - 2026-02-25

### Added
- **Fintech Ledger**: Double-entry accounting system
- **Wallet Management**: Multiple wallet types
- **Transaction Engine**: Idempotent transactions

---

## [Phase 1] - 2026-02-24

### Added
- Initial platform setup
- Admin authentication
- Basic user management
- Landing page with translations
