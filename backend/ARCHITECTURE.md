# Backend Architecture Documentation

## Current State
`server.py` contains 5200+ lines of code with all routes and models.

## Refactoring Plan

### Phase 1: Models Extraction (Priority: High)
Create `/app/backend/models/` directory with:
- `base.py` - Common base classes
- `users.py` - SDMUser, AdminUser
- `merchants.py` - SDMMerchant, MerchantMembershipCardType
- `vip.py` - VIPCardType, VIPMembership
- `partners.py` - SDMPartner
- `lottery.py` - SDMLottery, LotteryParticipant
- `fintech.py` - Wallet, Transaction models
- `notifications.py` - Notification models

### Phase 2: Router Extraction (Priority: Medium)
Create `/app/backend/routers/` with:
```
routers/
├── __init__.py
├── auth.py          # Admin/User authentication
├── users.py         # SDM User routes (~300 lines)
├── merchants.py     # Merchant routes (~250 lines)
├── services.py      # Super App services (~350 lines)
├── vip.py           # VIP Cards (~200 lines)
├── partners.py      # Partners (~100 lines)
├── lottery.py       # Lottery + Scheduler (~400 lines)
├── fintech.py       # Ledger/Wallets (~350 lines)
├── notifications.py # Notifications (~200 lines)
└── admin.py         # Admin misc (~150 lines)
```

### Phase 3: Services Extraction (Priority: Low)
Create `/app/backend/services/` with:
- `bulkclix_service.py` - Already exists
- `lottery_scheduler.py` - Scheduler logic
- `wallet_service.py` - Wallet operations
- `notification_service.py` - Notification logic

## Current server.py Sections

| Line Range | Section | Lines | Priority |
|------------|---------|-------|----------|
| 139-198 | Core Models | 60 | Medium |
| 199-261 | SDM Models | 62 | High |
| 262-311 | VIP Models | 50 | High |
| 312-341 | Partner Models | 30 | Low |
| 342-522 | Lottery Models | 180 | Medium |
| 523-624 | Request Models | 100 | Low |
| 625-723 | Helpers | 100 | Low |
| 724-800 | Auth | 75 | High |
| 800-933 | Original Routes | 133 | Low |
| 934-1221 | User Routes | 287 | High |
| 1222-1467 | Merchant Routes | 245 | High |
| 1468-1531 | Card Types | 63 | Low |
| 1532-1750 | Membership | 218 | Medium |
| 1751-1904 | Admin Routes | 153 | Medium |
| 1905-1998 | External API | 93 | Low |
| 1999-2334 | Fintech API | 335 | High |
| 2335-2433 | Admin Data | 98 | Low |
| 2434-2586 | Investor | 152 | Low |
| 2587-2749 | Float Mgmt | 162 | Medium |
| 2750-3037 | Notifications | 287 | Medium |
| 3038-3194 | Client Notif | 156 | Low |
| 3195-3331 | Push Notif | 136 | Low |
| 3332-3406 | Services | 74 | High |
| 3407-3664 | User Services | 257 | High |
| 3665-3906 | Admin Services | 241 | Medium |
| 3907-4087 | VIP Admin | 180 | Medium |
| 4088-4183 | Partners Admin | 95 | Low |
| 4184-4522 | Lottery Admin | 338 | Medium |
| 4523-4691 | Auto Lottery | 168 | Medium |
| 4692-4842 | User VIP | 150 | Medium |
| 4843-4920 | Promotions | 77 | Low |
| 4921-5102 | Leaderboard | 181 | Low |
| 5103-5266 | Scheduler | 163 | Medium |

## Recommended Extraction Order
1. **Models** - Create models package first
2. **Auth** - Extract authentication helpers
3. **User Routes** - Most frequently used
4. **Services** - Super App services
5. **Lottery** - Complex but isolated
6. **Fintech** - Ledger operations

## Dependencies to Consider
- All routes depend on `db` (MongoDB client)
- Auth dependencies (`get_current_admin`, `get_sdm_user`)
- Ledger module (`/app/backend/ledger/`)
- BulkClix service (`/app/backend/services/bulkclix_service.py`)

## Testing Strategy
After each extraction:
1. Run existing tests
2. Verify all endpoints with curl
3. Check frontend functionality
4. Monitor backend logs

## Notes
- Keep `server.py` as main entry point
- Use `include_router()` for new routers
- Maintain backward compatibility
- Document all changes in CHANGELOG.md
