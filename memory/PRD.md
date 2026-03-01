# Smart Digital Solutions & SDM - PRD

## Project Overview
1. **Smart Digital Solutions** - Site vitrine professionnel marketing pour agence web
2. **SDM (Smart Development Membership)** - Plateforme Fintech de cashback multi-commerces au Ghana

---

## SMART DIGITAL SOLUTIONS

### Features Implemented
- Site vitrine multilingue (EN/FR/AR/ZH) avec RTL
- Design premium bleu corporate avec animations
- Sections: Hero, Why Website, Services, SDM, Pricing, Portfolio, Bonus, Contact
- Formulaire de contact avec notifications email (Resend)
- Dashboard admin avec gestion messages + analytics visites
- Bouton WhatsApp + numéro appel
- Logo personnalisé

### Access
- Site: `/` 
- Admin Login: `/admin`
- Admin Dashboard: `/admin280226`
- Credentials: admin / Gerard0103@

---

## SDM - SMART DEVELOPMENT MEMBERSHIP

### Overview
Système centralisé de fidélité et cashback connectant restaurants, salons, spas, hôtels et commerces au Ghana.

### Architecture
```
Client App → SDM API ← Merchant Dashboard
                ↓
         Central Wallet
         (Pending → Available → Withdrawn)
                ↓
    Membership Cards (linked to merchants)
         (Bronze → Silver → Gold levels)
```

### User Features (MVP Complete)
- [x] Authentification OTP téléphone
- [x] QR Code unique par utilisateur
- [x] Wallet central (Pending / Available)
- [x] Historique des transactions
- [x] Demande de retrait Mobile Money (manuel)
- [x] **NEW: Achat de cartes de membre**
- [x] **NEW: Visualisation des cartes disponibles**
- [x] **NEW: Niveaux de parrainage (Bronze, Silver, Gold)**

### Merchant Features (MVP Complete)
- [x] Inscription commerce
- [x] Configuration taux cashback (1-20%)
- [x] Gestion du staff
- [x] Scan QR + saisie montant
- [x] Dashboard transactions
- [x] Rapport/Analytics
- [x] **NEW: Création de types de cartes de membre**
- [x] **NEW: Gestion des membres actifs**

### Admin Features (MVP Complete)
- [x] Liste utilisateurs SDM
- [x] Liste merchants
- [x] Validation merchants
- [x] Gestion retraits (manuel)
- [x] Statistiques plateforme
- [x] **NEW: Configuration SDM (bonus, niveaux, validité)**
- [x] **NEW: Vue des types de cartes**
- [x] **NEW: Vue des adhésions**

### Membership Card System (NEW - Dec 2025)
- Cartes liées aux commerçants partenaires
- Chaque commerçant peut créer ses propres types de cartes
- Prix, validité, bonus de bienvenue et de parrainage configurables par carte
- Achat via wallet ou Mobile Money (simulé)
- Bonus de parrainage payé lors de l'achat de carte (si referrer actif)

### Referral Level System (NEW - Dec 2025)
| Level  | Min Referrals | Bonus par parrainage |
|--------|---------------|----------------------|
| Bronze | 0             | 5 GHS                |
| Silver | 5             | 7 GHS                |
| Gold   | 15            | 10 GHS               |

### API Externe (Pour intégration site web)
- POST /api/sdm/external/transaction (API Key + Secret)
- GET /api/sdm/external/user/{phone}

### Business Model
- Commission SDM: 2% sur cashback
- Frais retrait: 1 GHS
- Cashback pending: 7 jours
- Revenue des cartes: partagé entre plateforme et commerçant

### Access URLs
- Client App: `/sdm/client`
- Merchant Dashboard: `/sdm/merchant`

---

## TECHNICAL STACK

### Backend
- FastAPI (Python)
- MongoDB (Motor async)
- JWT Authentication
- Resend (Email)
- Hubtel (SMS OTP - à configurer)
- QR Code generation (qrcode library)

### Frontend
- React 19
- Tailwind CSS + Shadcn UI
- Framer Motion (animations)
- Axios

### API Endpoints SDM
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/sdm/auth/send-otp | - | Envoi OTP |
| POST | /api/sdm/auth/verify-otp | - | Vérification + login |
| GET | /api/sdm/user/profile | User | Profil + QR |
| GET | /api/sdm/user/wallet | User | Solde wallet |
| GET | /api/sdm/user/transactions | User | Historique |
| POST | /api/sdm/user/withdraw | User | Demande retrait |
| GET | /api/sdm/user/available-cards | User | Cartes disponibles |
| GET | /api/sdm/user/memberships | User | Mes cartes |
| POST | /api/sdm/user/purchase-membership | User | Acheter carte |
| POST | /api/sdm/merchant/register | - | Inscription |
| POST | /api/sdm/merchant/login | - | Connexion |
| POST | /api/sdm/merchant/transaction | Merchant | Créer transaction |
| GET | /api/sdm/merchant/report | Merchant | Analytics |
| POST | /api/sdm/merchant/card-types | Merchant | Créer type carte |
| GET | /api/sdm/merchant/card-types | Merchant | Lister types cartes |
| PUT | /api/sdm/merchant/card-types/{id} | Merchant | Modifier |
| DELETE | /api/sdm/merchant/card-types/{id} | Merchant | Supprimer |
| GET | /api/sdm/merchant/memberships | Merchant | Membres actifs |
| GET | /api/sdm/admin/config | Admin | Config SDM |
| PUT | /api/sdm/admin/config | Admin | Modifier config |
| GET | /api/sdm/admin/sdm-stats | Admin | Stats plateforme |
| GET | /api/sdm/admin/memberships | Admin | Toutes adhésions |
| GET | /api/sdm/admin/card-types | Admin | Tous types cartes |

---

## Completed - December 2025
- [x] Backend: Système complet de cartes de membre liées aux commerçants
- [x] Backend: Configuration SDM admin (bonus, niveaux, validité)
- [x] Backend: Statistiques détaillées (revenus adhésions, bonus payés)
- [x] Frontend Admin: Panneau SDM Platform avec 4 onglets
- [x] Frontend Client: Onglet Cards pour voir et acheter des cartes
- [x] Frontend Merchant: Gestion des types de cartes de membre
- [x] Tests: 100% de succès (19/19 backend, UI flows OK)

---

## PHASE 2 (À venir)
- [ ] API Hubtel SMS OTP (clés requises)
- [ ] API Mobile Money automatique (paiement réel)
- [ ] Intégration POS
- [ ] Notifications push
- [ ] Newsletter marketing
- [ ] App mobile native

## Environment Variables
```
HUBTEL_CLIENT_ID=
HUBTEL_CLIENT_SECRET=
HUBTEL_SENDER_ID=SDM
SDM_COMMISSION_RATE=0.02
CASHBACK_PENDING_DAYS=7
WITHDRAWAL_FEE=1.0
```

## Notes Techniques
- Mobile Money payment est **SIMULÉ** - Hubtel sera intégré plus tard
- Les commerçants doivent être **vérifiés** par l'admin avant que leurs cartes apparaissent aux utilisateurs
- Le bonus de parrainage est payé **uniquement** lors de l'achat d'une carte de membre
