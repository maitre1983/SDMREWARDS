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
- [x] Achat de cartes de membre
- [x] Visualisation des cartes disponibles
- [x] Niveaux de parrainage (Bronze, Silver, Gold)

### Merchant Features (MVP Complete)
- [x] Inscription commerce
- [x] Configuration taux cashback (1-20%)
- [x] Gestion du staff
- [x] **NOUVEAU: Scan QR avec caméra** (html5-qrcode)
- [x] Saisie manuelle du QR code
- [x] Champ Notes optionnel pour les transactions
- [x] **NOUVEAU: Historique complet des transactions**
  - Filtres: All, Pending, Available
  - Recherche par ID ou client
  - Statistiques en temps réel
  - Pagination (20/50/100/500)
  - Détails étendus au clic
- [x] Création de types de cartes de membre
- [x] Gestion des membres actifs

### Admin Features (MVP Complete)
- [x] Liste utilisateurs SDM
- [x] Liste merchants
- [x] Validation merchants
- [x] Gestion retraits (manuel)
- [x] Statistiques plateforme
- [x] Configuration SDM (bonus, niveaux, validité)
- [x] Vue des types de cartes
- [x] Vue des adhésions

### Membership Card System
- Cartes liées aux commerçants partenaires
- Chaque commerçant peut créer ses propres types de cartes
- Prix, validité, bonus de bienvenue et de parrainage configurables par carte
- Achat via wallet ou Mobile Money (simulé)
- Bonus de parrainage payé lors de l'achat de carte (si referrer actif)

### Referral Level System
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
- **html5-qrcode** (Scanner QR caméra)

### New Components (March 2026)
- `/app/frontend/src/components/QRScanner.jsx` - Scanner QR avec caméra

---

## Completed - March 2026
- [x] Scan QR avec caméra (bouton + modal)
- [x] Historique transactions avec filtres/recherche/stats
- [x] Détails étendus au clic sur transaction
- [x] Champ Notes optionnel
- [x] Correction API merchant/login (JSON body)
- [x] Tests: 100% Backend (12/12), 100% Frontend

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
- Scanner QR nécessite permission caméra sur appareil réel
