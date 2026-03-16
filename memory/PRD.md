# SDM REWARDS - Product Requirements Document

## Original Problem Statement
Migration complète des services de paiement de BulkClix vers Hubtel pour la plateforme SDM REWARDS au Ghana. La plateforme offre des récompenses cashback aux clients qui achètent chez des marchands partenaires.

## Architecture
```
/app
├── backend/
│   ├── routers/
│   │   ├── admin.py        # 4300+ lignes (à refactorer)
│   │   ├── auth.py         # OTP migré vers Hubtel ✅
│   │   ├── merchants.py    # 3000+ lignes (à refactorer)
│   │   ├── payments.py     # 2200+ lignes (à refactorer)
│   │   └── services.py     # VAS migré vers Hubtel ✅
│   ├── services/
│   │   ├── hubtel_momo_service.py  # Paiements MoMo ✅
│   │   ├── hubtel_sms_service.py   # SMS OTP ✅
│   │   └── hubtel_vas_service.py   # Airtime/Data/ECG ✅
│   └── server.py
├── frontend/
│   └── src/pages/
│       ├── ClientDashboard.jsx
│       └── ServicesPage.jsx
└── mobile/
    └── (Expo app - build Android corrigé)
```

## Completed Features

### 2026-03-16
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

### P1 - Refactoring Routeurs (Planifié - Voir REFACTORING_PLAN.md)
- [ ] Créer tests pytest pour endpoints critiques (prérequis)
- [ ] Diviser `payments.py` en sous-modules (cards, momo, vas, callbacks)
- [ ] Diviser `merchants.py` en sous-modules (public, dashboard, transactions, debit, settings)
- [ ] Utiliser `admin_modules/` existant + compléter 29 endpoints manquants

**Note**: Module `admin_modules/` existe déjà avec 64/93 endpoints. Migration progressive recommandée.

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
| `POST /api/services/airtime/purchase` | ✅ | Achat crédit Airtime |
| `POST /api/services/data/purchase` | ✅ | Achat forfait Data |
| `POST /api/clients/cards/upgrade` | ✅ | Mise à niveau carte |
| `POST /api/services/cashback/withdraw` | ⚠️ BLOQUÉ | Retrait MoMo (403 en prod) |

## Technical Notes

### Solution Curl pour API Hubtel
La fonction `_execute_curl_command` dans `hubtel_momo_service.py` utilise `subprocess` avec `curl --http1.1 --ignore-content-length` pour contourner les problèmes de réponses tronquées de l'API Hubtel.

### Rate Limiting OTP
- 3 requêtes OTP/minute par IP
- 3 tentatives de vérification par OTP
- Expiration OTP: 10 minutes
