# SDM FINTECH PLATFORM - PRD

## Project Overview
**SDM (Smart Development Membership)** - Réseau de consommateurs fidèles et loyaux du Ghana

> **IMPORTANT**: SDM n'est pas une banque ni un service financier. C'est un réseau d'amis et de consommateurs fidèles et loyaux.

---

## REFERRAL PROGRAM
- **Parrain**: +3 GHS lors de l'achat de carte par le filleul
- **Filleul**: +1 GHS bonus à l'achat de sa carte

---

## VIP MEMBERSHIP CARDS

| Tier | Prix | Cashback Boost | Limite Retrait | Lottery |
|------|------|----------------|----------------|---------|
| **SILVER** | 25 GHS | +0% | 2,500 GHS/mois | x1 |
| **GOLD** | 50 GHS | +0.2% | 2,500 GHS/mois | x2 |
| **PLATINUM** | 100 GHS | +0.5% | 5,000 GHS/mois | x3 |

### Silver Benefits
- Accès aux offres exclusives marchands partenaires
- Accès à l'app SDM (wallet + historique + tracking rewards)
- Accès aux tirages mensuels
- Birthday Bonus

### Gold Benefits (Silver +)
- Cashback boosté (+0.2% sur partenaires)
- Double chance aux tirages mensuels
- Traitement prioritaire des retraits MoMo
- Accès aux Marchands Gold exclusifs

### Platinum Benefits (Silver + Gold +)
- Cashback Premium Boost (+0.5%)
- Triple chance aux tirages majeurs
- Limite de retrait élevée (5000 GHS/mois)
- Programme Ambassadeur
- Accès aux opportunités business & investissements

---

## PHASE 1: FONDATIONS FINTECH ✅ COMPLETE

### Implemented Features (March 2026)

#### 1. Ledger Central avec Double-Entry Accounting
- **Module**: `/app/backend/ledger/`
- **Collections MongoDB**: `wallets`, `ledger_entries`, `ledger_transactions`
- Toutes les opérations financières passent par le ledger
- Audit trail complet

#### 2. Wallets Séparés
| Type | Description |
|------|-------------|
| CLIENT | Portefeuille utilisateur (cashback) |
| MERCHANT | Portefeuille marchand (préfinancé) |
| SDM_OPERATIONS | Compte opérations SDM |
| SDM_COMMISSION | Compte commissions SDM |
| SDM_FLOAT | Compte float Mobile Money |

#### 3. Workflow Dépôt Marchand
```
PENDING → (Admin Confirm) → CONFIRMED → Balance Credited
```

#### 4. Workflow Retrait
```
PENDING → APPROVED → PROCESSING → PAID/FAILED
                  ↘ REJECTED (refund reserved)
```

#### 5. Dashboard Fintech Admin
- **6 onglets**: Overview, Withdrawals, Deposits, Wallets, Ledger, Audit
- Statistiques temps réel
- Actions: Approve/Reject withdrawal, Confirm deposit
- Audit trail visible

---

## PHASE 2: MOTEUR DE TRANSACTION & CONFIG DYNAMIQUE ✅ COMPLETE

### Implemented Features (March 2026)

#### 1. Direct Payment Transaction Flow
Le client paie directement et le système répartit automatiquement :
- **Marchand reçoit**: Paiement - Cashback
- **Client reçoit**: Cashback - Commission SDM (en pending)
- **SDM reçoit**: Commission sur le cashback

**Exemple** (100 GHS, 5% cashback, 2.5% commission):
- Marchand: 95 GHS
- Client: 4.88 GHS (pending)
- SDM Commission: 0.12 GHS

#### 2. Configuration Dynamique Fintech
Paramètres configurables via Admin Dashboard :
| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `sdm_commission_rate` | Commission SDM sur cashback | 2% |
| `withdrawal_fee` | Frais de retrait Mobile Money | 1.0 GHS |
| `cashback_pending_days` | Jours avant disponibilité cashback | 7 jours |
| `float_low_threshold` | Seuil d'alerte jaune | 5000 GHS |
| `float_critical_threshold` | Seuil d'alerte rouge | 1000 GHS |

#### 3. Float Management & Alertes
- Endpoint `/api/sdm/admin/fintech/float/status` retourne :
  - Solde float disponible
  - Niveau d'alerte (OK, LOW, CRITICAL)
  - Ratio de couverture des retraits pending
  - Recommandations automatiques

#### 4. Investor Dashboard
Métriques clés pour investisseurs :
- GMV (Gross Merchandise Value)
- Commissions totales
- Nombre de transactions
- Croissance par période
- Breakdown quotidien

#### 5. Dashboard Admin Étendu
- **9 onglets**: Investor, Overview, Withdrawals, Deposits, Float, Wallets, Ledger, Config, Audit
- Export CSV/JSON des transactions
- Purge des données de test

### New API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/sdm/admin/fintech/investor-dashboard | Admin | Métriques investisseur |
| GET | /api/sdm/admin/fintech/float/status | Admin | Status float avec alertes |
| PUT | /api/sdm/admin/config | Admin | Update config fintech |
| POST | /api/sdm/admin/fintech/purge-test-data | Admin | Purger données test |
| GET | /api/sdm/admin/fintech/ledger/export | Admin | Export ledger CSV/JSON |
| POST | /api/sdm/admin/notifications | Admin | Créer notification |
| GET | /api/sdm/admin/notifications | Admin | Liste notifications |
| DELETE | /api/sdm/admin/notifications/{id} | Admin | Supprimer notification |
| GET | /api/sdm/admin/float-alerts | Admin | Historique alertes float |
| POST | /api/sdm/admin/float-alerts/test | Admin | Tester alertes |
| POST | /api/sdm/admin/float-alerts/{id}/acknowledge | Admin | Acquitter alerte |
| GET | /api/sdm/user/notifications | User | Mes notifications |
| POST | /api/sdm/user/notifications/{id}/read | User | Marquer lu |
| GET | /api/sdm/user/notifications/unread-count | User | Compteur non-lus |

### Tests: 100% Success
- Backend: 32/32 tests passés (Phase 2 complet)
- Frontend: All 11 dashboard tabs functional

---

## PHASE 2.5: NOTIFICATION SYSTEM ✅ COMPLETE

### Implemented Features (March 2026)

#### 1. Float Alert System (Webhook + Email)
- **Configuration dynamique** : Webhook URL et emails depuis le dashboard
- **Types d'alertes** : LOW (seuil bas) et CRITICAL (seuil critique)
- **Historique** : Suivi des alertes avec status webhook/email
- **Acknowledge** : Possibilité d'acquitter les alertes

#### 2. Client Notification System
- **Types** : system, promo, alert, info
- **Priorités** : low, normal, high, urgent
- **Recipients** : all (tous), clients (clients seulement), merchants (marchands)
- **Fonctionnalités client** : Voir notifications, marquer lu, compteur non-lus

#### 3. Dashboard Admin Étendu
- **11 onglets** : Investor, Overview, Withdrawals, Deposits, Float, Wallets, Notifications, Alerts, Ledger, Config, Audit
- **Onglet Notifications** : Formulaire création, liste avec suppression
- **Onglet Alerts** : Configuration webhook/email, historique, test

### Collections MongoDB Ajoutées
- `notifications`: Notifications envoyées aux utilisateurs
- `float_alerts`: Historique des alertes float

---

## PHASE 3: PUSH NOTIFICATIONS (OneSignal) ✅ COMPLETE

### Implemented Features (March 2026)

#### 1. Backend Push Service
- **Module**: `/app/backend/push_notifications.py`
- **Mode**: Simulation (OneSignal pas encore configuré)
- Enregistrement des devices (player_id, platform)
- Envoi de notifications segmentées (all, clients, merchants)
- Statistiques push en temps réel

#### 2. Client/Merchant Device Registration
- Les utilisateurs peuvent s'abonner aux push notifications
- Stockage des devices dans MongoDB (`push_devices`)
- Désabonnement disponible

#### 3. Admin Dashboard Integration
- **Stats Push** : is_configured, active_devices, clients, merchants
- **Envoi Push** : Checkbox "Send as Push Notification" dans le formulaire
- **Mode simulation** : Fonctionne même sans OneSignal configuré

### Configuration OneSignal (À faire)
```env
# Dans backend/.env
ONESIGNAL_APP_ID=votre_app_id
ONESIGNAL_API_KEY=votre_api_key

# Dans frontend/.env
REACT_APP_ONESIGNAL_APP_ID=votre_app_id
```

### New API Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/sdm/admin/push/stats | Admin | Statistiques push |
| POST | /api/sdm/admin/push/test | Admin | Tester le système push |
| POST | /api/sdm/admin/push/send | Admin | Envoyer push notification |
| POST | /api/sdm/user/push/register | User | Enregistrer device |
| POST | /api/sdm/user/push/unregister | User | Désabonner device |
| GET | /api/sdm/user/push/devices | User | Lister mes devices |
| POST | /api/sdm/merchant/push/register | Merchant | Enregistrer device |

### Tests: 100% Success
- Backend: 18/18 tests passés
- Frontend: All Push UI components verified

---

## PHASE 4: SUPER APP SERVICES ✅ COMPLETE

### Implemented Features (March 2026)

#### 1. Service Backend (BulkClix Integration)
- **Module**: `/app/backend/services/bulkclix_service.py`
- **Mode**: SIMULATION (API BulkClix retourne "Unauthorized" → simulation automatique)
- 4 services disponibles :
  - Achat de crédit téléphonique (Airtime)
  - Achat de forfaits data (Data bundles)
  - Paiement de factures (ECG, GWCL, DSTV, GOTV)
  - Retrait Mobile Money

#### 2. Transaction Engine
- Débit automatique du solde cashback `CLIENT_AVAILABLE`
- Clé d'idempotence pour éviter les doublons
- Statuts : `PENDING`, `SUCCESS`, `FAILED`, `REVERSED`
- Commission dynamique (0.1% par défaut) configurable

#### 3. Limites & Contrôles
- Limite mensuelle : 2500 GHS (configurable)
- Vérification du solde avant transaction
- Détection automatique du réseau téléphonique

#### 4. Interface Client (Super App UI)
- Nouvel onglet "Services" dans `SDMClientPage.jsx`
- Affichage du solde cashback disponible
- 4 formulaires de service avec validation
- Historique des transactions de services

### New API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/sdm/user/services/balance | User | Solde cashback et limite mensuelle |
| GET | /api/sdm/user/services/data-bundles | Public | Forfaits data disponibles |
| POST | /api/sdm/user/services/airtime | User | Achat crédit téléphonique |
| POST | /api/sdm/user/services/data | User | Achat forfait data |
| POST | /api/sdm/user/services/bill | User | Paiement facture |
| POST | /api/sdm/user/services/withdraw | User | Retrait MoMo |
| GET | /api/sdm/user/services/history | User | Historique services |
| GET | /api/sdm/admin/services/stats | Admin | Statistiques services |

### Collections MongoDB Ajoutées
- `service_transactions`: Transactions de services (airtime, data, bills, momo)

### Tests: 100% Success
- Backend: 16/16 tests passés
- Frontend: All Services UI components verified
- Idempotency: Working
- Monthly limit: Enforced

---

## PHASE 4B: PROMOTIONS & LEADERBOARD ✅ COMPLETE

### Implemented Features (March 2026)

#### 1. Système de Promotions
- Réductions en pourcentage sur les services
- Conditions par jour de la semaine (ex: -10% weekend)
- Montant minimum pour activer la promo
- Dates de validité (début/fin)
- Activation/Désactivation par service

#### 2. Leaderboard Top Clients
- **Meilleurs Cashback**: Classement par cashback gagné (semaine/mois/an)
- **Champions Services**: Classement par utilisation des services
- Annonce automatique par notification à tous les clients

#### 3. Interface Admin Enrichie
- **Onglet "Top Clients"**: Visualisation du leaderboard avec bouton "Annoncer les Gagnants"
- **Onglet "Promos"**: Création, modification, activation/désactivation des promotions

#### 4. Interface Client
- Badges de réduction visibles sur les services avec promo active
- Affichage du nom de la promo et économies réalisées après achat

### New API Endpoints (Promotions & Leaderboard)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/sdm/user/services/promotions | User | Promos actives pour le client |
| POST | /api/sdm/admin/promotions | Admin | Créer une promotion |
| GET | /api/sdm/admin/promotions | Admin | Liste des promotions |
| PUT | /api/sdm/admin/promotions/{id} | Admin | Modifier une promo |
| DELETE | /api/sdm/admin/promotions/{id} | Admin | Supprimer une promo |
| PATCH | /api/sdm/admin/promotions/{id}/toggle | Admin | Activer/Désactiver |
| GET | /api/sdm/admin/leaderboard/cashback | Admin | Top clients cashback |
| GET | /api/sdm/admin/leaderboard/services | Admin | Top utilisateurs services |
| POST | /api/sdm/admin/leaderboard/announce | Admin | Annoncer les gagnants |
| POST | /api/sdm/admin/fintech/users/credit | Admin | Créditer un utilisateur (test) |

### Collections MongoDB Ajoutées
- `service_promotions`: Promotions sur les services

### Tests Validés
- Création/modification/suppression de promotions
- Application automatique de la meilleure promo lors d'un achat
- Leaderboard par période (semaine/mois/an)
- Annonce des gagnants via notifications
- Affichage des badges promo côté client

---

## PHASE 5: VIP CARDS & PARTNERS ✅ COMPLETE

### Implemented Features (March 2026)

#### 1. Système de Cartes VIP (Admin-Managed)
- **3 tiers**: Silver (25 GHS), Gold (50 GHS), Platinum (100 GHS)
- Prix, cashback boost, limite retrait configurables par Admin
- Achat/Upgrade depuis l'app client avec cashback
- Bonus parrainage (+3 GHS parrain, +1 GHS filleul) à l'achat de carte

#### 2. Gestion des Partenaires
- CRUD complet depuis dashboard Admin
- Catégories: Restaurant, Shop, Hotel, School, Pharmacy, etc.
- Option "Exclusif Gold+" pour partenaires premium
- Liste publique accessible dans l'app client

#### 3. Renommages UI
- "SDM Wallet" → "SDM Rewards"
- "Available Balance" → "My Cash Back Balance"
- Ajout disclaimer: "SDM n'est pas une banque..."

### New API Endpoints (VIP Cards & Partners)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/sdm/admin/vip-cards | Admin | Liste des types de cartes VIP |
| POST | /api/sdm/admin/vip-cards | Admin | Créer un type de carte |
| PUT | /api/sdm/admin/vip-cards/{id} | Admin | Modifier une carte |
| GET | /api/sdm/admin/partners | Admin | Liste des partenaires |
| POST | /api/sdm/admin/partners | Admin | Ajouter un partenaire |
| PUT | /api/sdm/admin/partners/{id} | Admin | Modifier un partenaire |
| DELETE | /api/sdm/admin/partners/{id} | Admin | Supprimer un partenaire |
| GET | /api/sdm/partners | Public | Liste publique des partenaires |
| GET | /api/sdm/user/vip-cards | Public | Cartes VIP disponibles |
| GET | /api/sdm/user/my-vip-membership | User | Ma carte VIP actuelle |
| POST | /api/sdm/user/vip-cards/purchase | User | Acheter/Upgrader carte VIP |

### Collections MongoDB Ajoutées
- `vip_card_types`: Types de cartes VIP (Silver, Gold, Platinum)
- `vip_memberships`: Adhésions VIP des utilisateurs
- `sdm_partners`: Liste des partenaires SDM

---

## PHASE 6: MOBILE MONEY INTEGRATION (À venir)

### Objectifs
- Compte Business MTN MoMo
- Compte Business Vodafone Cash
- Certificats SSL production

---

## PHASE 7: SCALE & SÉCURITÉ (À venir)

### Objectifs
- [ ] Anti-fraud engine (velocity checks, scoring)
- [ ] API Security renforcée (HMAC, rate limiting avancé)
- [ ] Webhooks système pour marchands
- [ ] Reporting financier (P&L, balance sheet, exports)
- [ ] Multi-currency (USD, NGN pour expansion)

---

## TECHNICAL STACK

### Backend
- FastAPI (Python)
- MongoDB with ACID transactions
- Ledger module: `/app/backend/ledger/`
- Services module: `/app/backend/services/`

### Frontend
- React 19
- Tailwind CSS + Shadcn UI
- FintechDashboard: `/app/frontend/src/components/admin/FintechDashboard.jsx`
- SDMClientPage: `/app/frontend/src/pages/SDMClientPage.jsx`

### New Collections (Phase 1-4)
- `wallets` - Tous les portefeuilles
- `ledger_entries` - Écritures comptables (DEBIT/CREDIT)
- `ledger_transactions` - Transactions principales
- `withdrawal_requests` - Demandes de retrait
- `merchant_deposits` - Dépôts marchands
- `audit_logs` - Journal d'audit
- `notifications` - Notifications in-app
- `float_alerts` - Historique alertes float
- `push_devices` - Devices enregistrés pour push
- `service_transactions` - Transactions de services Super App

---

## ACCESS URLS

| Page | URL |
|------|-----|
| Site vitrine | / |
| Admin Login | /admin |
| Admin Dashboard | /admin280226 |
| SDM Client | /sdm/client |
| SDM Merchant | /sdm/merchant |

### Test Credentials
- **Admin**: admin / Gerard0103@
- **Test Client**: +233000000000 (ou 0000000000) / OTP: 000000
- **Test Merchant**: 233246283156 / sdk_af10983a3524c11d21c39dfe2fbf4660

---

## MOCKED INTEGRATIONS

| Service | Status |
|---------|--------|
| Mobile Money Payout (MTN/Vodafone) | MOCKED - Admin marks as PAID manually |
| Hubtel SMS OTP | MOCKED - Debug OTP shown (configure keys for real SMS) |
| BulkClix API (Airtime, Data, Bills, MoMo) | MOCKED - API retourne "Unauthorized", simulation activée |
| OneSignal Push Notifications | PENDING - En attente des clés API utilisateur |

---

## Architecture Document
📄 `/app/docs/SDM_FINTECH_ARCHITECTURE_ROADMAP.md`

---

*Last Updated: March 2026*
*Phase 4 (Super App) Complete - Ready for Phase 5*
