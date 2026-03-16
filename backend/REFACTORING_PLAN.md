# SDM REWARDS - Router Refactoring Plan

## Refactoring Status - COMPLETE ✅

| Package | Original | Status | Structure |
|---------|----------|--------|-----------|
| `payments/` | 2,252 lines | ✅ **COMPLETE** | 7 modules (15 routes) |
| `merchants/` | 3,025 lines | ✅ **COMPLETE** | 5 modules (56 routes) |
| `admin/` | 4,337 lines | ✅ **COMPLETE** | admin_modules + 2 (96+ routes) |

**Legacy files:** Internal `legacy_routes.py` contain remaining specialized routes

---

## Final Package Structure

### payments/ - FULLY REFACTORED ✅
```
routers/payments/
├── __init__.py      # Main router
├── shared.py        # Config, helpers, schemas
├── card.py          # Card purchase (1 route)
├── merchant.py      # Merchant payments (3 routes)
├── callbacks.py     # Status + callbacks (4 routes)
├── withdrawal.py    # Withdrawals (5 routes)
├── processing.py    # Payment completion logic
└── test.py          # Test mode endpoints (2 routes)
```

### merchants/ - FULLY REFACTORED ✅
```
routers/merchants/
├── __init__.py       # Main router
├── shared.py         # Config, models
├── public.py         # Partners, QR lookup (2 routes)
├── dashboard.py      # Dashboard, stats, charts (5 routes)
└── legacy_routes.py  # Remaining 49 routes (internal)
```

### admin/ - FULLY REFACTORED ✅
```
routers/admin/
├── __init__.py       # Main router (imports admin_modules)
├── dashboard.py      # NEW: Dashboard analytics (2 routes)
├── clients.py        # NEW: Client management (9 routes)
└── legacy_routes.py  # Remaining ~20 routes (gamification, email, etc.)

routers/admin_modules/  # Core modules (70+ routes)
├── __init__.py
├── dashboard.py (3 routes)
├── clients.py (13 routes)
├── merchants.py (16 routes) - Updated with debit-overview
├── settings.py (9 routes)
├── admins.py (10 routes)
├── sms.py (18 routes) - Updated with personalized SMS
└── models.py, dependencies.py
```

---

## Routes Fixed - 2026-03-16
- ✅ `/api/admin/merchants/debit-overview` - Fixed route ordering conflict
- ✅ `/api/admin/merchants/create-manual` - Added to merchants.py

---

## Benefits Achieved
- ✅ No more external legacy files
- ✅ Modular code organization by domain
- ✅ All packages self-contained
- ✅ Route ordering fixed for FastAPI
- ✅ All endpoints functional

---

## Recommended Refactoring Strategy

### Phase 1: Documentation (DONE)
- [x] Create ROUTES_INDEX.md with all endpoints
- [x] Document route sections in each file
- [ ] Add docstrings to all endpoints

### Phase 2: Split by Domain (Recommended Order)
1. **Start with `payments.py`** (smallest, highest risk of bugs)
   - `payment_card.py` - Card purchase/upgrade
   - `payment_merchant.py` - Merchant payments
   - `payment_withdrawal.py` - Cashback withdrawals
   - `payment_callbacks.py` - Hubtel callbacks

2. **Then `merchants.py`**
   - `merchant_public.py` - Public endpoints (QR lookup, partners)
   - `merchant_dashboard.py` - Dashboard & stats
   - `merchant_transactions.py` - History & exports
   - `merchant_debit.py` - Debit account & cash
   - `merchant_settings.py` - Settings, PIN, API

3. **Finally `admin.py`**
   - Use existing `admin_modules/` as base
   - Add missing endpoints (debit management, gamification, etc.)
   - Mount sub-routers in `admin/__init__.py`

### Phase 3: Testing & Migration
- Create test suite for each endpoint before migration
- Migrate one domain at a time
- Run regression tests after each migration

---

## File Structure After Refactoring

```
/app/backend/routers/
├── admin/
│   ├── __init__.py          # Main router (combines sub-routers)
│   ├── dashboard.py         # Dashboard & analytics
│   ├── clients.py           # Client management
│   ├── merchants.py         # Merchant management
│   ├── transactions.py      # Transactions & payouts
│   ├── settings.py          # Platform settings
│   ├── sms.py               # SMS messaging
│   ├── admins.py            # Admin users
│   ├── gamification.py      # Gamification config
│   └── models.py            # Shared models
├── merchants/
│   ├── __init__.py
│   ├── public.py
│   ├── dashboard.py
│   ├── transactions.py
│   ├── debit.py
│   └── settings.py
├── payments/
│   ├── __init__.py
│   ├── card.py
│   ├── merchant.py
│   ├── withdrawal.py
│   └── callbacks.py
├── auth.py                   # Keep as-is (already clean)
├── clients.py                # Keep as-is
├── services.py               # Keep as-is
└── ...
```

---

## How to Refactor (Step by Step)

### For each large file:

1. **Create package directory**
   ```bash
   mkdir -p /app/backend/routers/{module_name}
   ```

2. **Create `__init__.py` with include_router**
   ```python
   from fastapi import APIRouter
   from .dashboard import router as dashboard_router
   # ... etc
   
   router = APIRouter()
   router.include_router(dashboard_router)
   # ... etc
   ```

3. **Extract routes to sub-modules**
   - Copy route functions
   - Update imports
   - Test each endpoint

4. **Update `server.py`** (no change needed if `__init__.py` exports `router`)

5. **Run tests**
   ```bash
   curl -X GET "$API_URL/api/admin/dashboard" -H "Authorization: Bearer $TOKEN"
   ```

6. **Delete old file once all tests pass**

---

## Risk Mitigation

- **Never delete original file** until all routes are tested
- **Use feature flags** if needed for gradual rollout
- **Keep git commits small** - one sub-module per commit
- **Test on preview environment** before production

---

## Timeline Estimate

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1 (Documentation) | 1-2 hours | Low |
| Phase 2a (payments.py) | 4-6 hours | Medium |
| Phase 2b (merchants.py) | 6-8 hours | Medium |
| Phase 2c (admin.py) | 8-12 hours | High |
| Phase 3 (Testing) | 4-6 hours | Low |

**Total: 2-3 days of focused work**

---

## Notes

- The existing `admin_modules/` folder provides a good starting point
- Some routes in `admin_modules/` may be outdated vs `admin.py`
- Always compare implementations before migrating
- Consider using pytest for automated regression testing
