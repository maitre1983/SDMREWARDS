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
│   └── src/pages/
│       ├── ClientDashboard.jsx
│       └── ServicesPage.jsx
└── mobile/
    └── (Expo app - build Android corrigé)
```

## Completed Features

### 2026-03-16 (Session 3)
- ✅ **Intégration Hubtel SMS Batch Personalized** - `POST /api/admin/sms/bulk/personalized` créé et testé
  - Endpoint fonctionnel pour envoyer des SMS personnalisés en masse
  - Chaque destinataire reçoit un message unique
  - Utilise l'API Hubtel `POST /v1/messages/batch/personalized/send`
  - Fallback automatique vers envois individuels si l'API batch échoue
- ✅ **Interface UI SMS Personnalisés** - Modal complet dans le SMS Center
  - Zone de composition avec variables dynamiques : `{nom}`, `{cashback}`, `{carte}`
  - Sélecteur de destinataires avec recherche et filtres
  - Aperçu en temps réel des messages personnalisés
  - Support des clients et marchands
- ✅ **Templates SMS Prédéfinis** - 12 templates prêts à l'emploi
  - 💰 Rappel Cashback | 🎂 Anniversaire | 👋 Relance Client Inactif
  - 🎉 Nouvelle Promotion | ⚠️ Expiration Carte | 🌟 Bonus Bienvenue
  - 🤝 Parrainage Réussi | ⬆️ Invitation Upgrade | 🏪 Promo Marchand
  - ❤️ Remerciement | 🎄 Fêtes/Nouvel An | ✏️ Message Personnalisé
- ✅ **Programmation d'envoi SMS** - Fonctionnalité de scheduling complète
  - Option "Programmer l'envoi" avec sélection date/heure
  - Worker de fond qui traite les SMS programmés toutes les 60 secondes
  - Section "SMS Programmés" avec liste, détails et bouton d'annulation
  - Endpoints: `POST /api/admin/sms/schedule/personalized`, `GET /scheduled/personalized`, `DELETE /{id}`

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

### P2 - Migration Restante
- [ ] Migrer `notification_service.py` (références BulkClix)

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
- [ ] Notifications push enrichies

## Key API Endpoints

| Endpoint | Status | Description |
|----------|--------|-------------|
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
