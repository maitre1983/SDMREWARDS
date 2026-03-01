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
```

### User Features (MVP Phase 1)
- [x] Authentification OTP téléphone
- [x] QR Code unique par utilisateur
- [x] Wallet central (Pending / Available)
- [x] Historique des transactions
- [x] Demande de retrait Mobile Money (manuel)

### Merchant Features (MVP Phase 1)
- [x] Inscription commerce
- [x] Configuration taux cashback (1-20%)
- [x] Gestion du staff
- [x] Scan QR + saisie montant
- [x] Dashboard transactions
- [x] Rapport/Analytics

### Admin Features
- [x] Liste utilisateurs SDM
- [x] Liste merchants
- [x] Validation merchants
- [x] Gestion retraits (manuel)
- [x] Statistiques plateforme

### API Externe (Pour intégration site web)
- POST /api/sdm/external/transaction (API Key + Secret)
- GET /api/sdm/external/user/{phone}

### Business Model
- Commission SDM: 2% sur cashback
- Frais retrait: 1 GHS
- Cashback pending: 7 jours

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
| POST | /api/sdm/merchant/register | - | Inscription |
| POST | /api/sdm/merchant/login | - | Connexion |
| POST | /api/sdm/merchant/transaction | Merchant | Créer transaction |
| GET | /api/sdm/merchant/report | Merchant | Analytics |

---

## PHASE 2 (À venir)
- [ ] API Hubtel SMS OTP
- [ ] API Mobile Money automatique
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
