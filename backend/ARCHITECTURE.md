# SDM Backend Architecture

## Current State
The backend is currently a monolithic `server.py` file with ~5200+ lines containing all routes, models, and business logic.

## Target Architecture

```
/backend
├── core/                    # Shared utilities and config
│   ├── __init__.py
│   ├── config.py           # Database, JWT, API keys config
│   ├── dependencies.py     # FastAPI dependencies (auth)
│   └── utils.py            # Helper functions
│
├── models/                  # Pydantic models (already created)
│   ├── __init__.py
│   ├── base.py
│   ├── users.py
│   ├── merchants.py
│   ├── vip.py
│   ├── partners.py
│   ├── lottery.py
│   └── services.py
│
├── routers/                 # API route handlers
│   ├── __init__.py
│   ├── auth.py             # SDM authentication (OTP)
│   ├── users.py            # User profile, wallet, transactions
│   ├── merchants.py        # Merchant operations
│   ├── admin.py            # Admin dashboard
│   ├── vip.py              # VIP cards & memberships
│   ├── lottery.py          # Lottery system
│   ├── partners.py         # Partner directory
│   ├── services.py         # Airtime, data, bills
│   ├── notifications.py    # Push & in-app notifications
│   └── fintech.py          # Ledger, wallets, withdrawals
│
├── services/               # Business logic services
│   ├── __init__.py
│   ├── bulkclix_service.py # Airtime/data provider
│   └── sms_service.py      # SMS gateway
│
├── ledger/                 # Financial ledger system
│   ├── __init__.py
│   ├── models.py
│   └── service.py
│
└── server.py               # Main FastAPI app (entry point)
```

## Refactoring Progress

### Completed
- [x] Created `/core/` package with config, dependencies, utils
- [x] Created `/routers/auth.py` template (not yet integrated)
- [x] Models package structure exists

### In Progress
- [ ] Extract auth routes from server.py to routers/auth.py
- [ ] Extract user routes
- [ ] Extract merchant routes

### Pending
- [ ] Extract admin routes
- [ ] Extract VIP/lottery routes
- [ ] Extract fintech routes
- [ ] Extract notification routes
- [ ] Full integration and testing

## Migration Strategy

1. **Phase 1 - Core Setup** ✅
   - Create core/ package with shared utilities
   - Test imports work correctly

2. **Phase 2 - Router Extraction** (Current)
   - Extract one router at a time
   - Keep original code in server.py as fallback
   - Test thoroughly after each extraction

3. **Phase 3 - Integration**
   - Import and include extracted routers in server.py
   - Remove duplicate code from server.py
   - Full integration testing

4. **Phase 4 - Cleanup**
   - Remove unused code
   - Update documentation
   - Final testing

## Important Notes

- **Do not break production**: Always ensure the app works before and after changes
- **Incremental changes**: Extract and test one section at a time
- **Test coverage**: Run tests after each extraction
- **Rollback ready**: Keep original code until new code is verified
