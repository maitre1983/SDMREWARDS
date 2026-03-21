# SDM REWARDS - Plateforme de Fidélité et Cashback

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20PWA%20%7C%20Mobile-green.svg)

## Description

**SDM REWARDS** (Smart Development Membership) est une plateforme complète de fidélité et cashback pour le marché ghanéen. Elle permet aux clients de gagner du cashback lors de leurs achats chez les marchands partenaires, et offre des services financiers comme l'achat d'airtime, de forfaits data, et le retrait vers Mobile Money.

## Architecture

```
sdm-rewards/
├── backend/          # API FastAPI (Python)
│   ├── routers/
│   │   ├── admin/           # Package modulaire admin
│   │   ├── merchants/       # Package modulaire marchands
│   │   ├── payments/        # Package modulaire paiements
│   │   └── websocket_router.py  # WebSocket temps réel
│   └── services/
│       ├── hubtel_momo_service.py
│       ├── hubtel_sms_service.py
│       └── hubtel_vas_service.py
├── frontend/         # Application Web React + PWA
│   ├── public/
│   │   ├── manifest.json    # Configuration PWA
│   │   └── sw.js            # Service Worker v3
│   └── src/
│       ├── hooks/           # Custom hooks (WebSocket, Cache, etc.)
│       └── services/        # WebSocket, Sync services
└── mobile/           # Application Mobile (React Native/Expo)
```

## Technologies

| Composant | Technologies |
|-----------|-------------|
| **Backend** | FastAPI, MongoDB, Motor, JWT, Pydantic, WebSockets |
| **Frontend Web** | React 19, Tailwind CSS, Shadcn/UI, Recharts, PWA |
| **Mobile** | React Native, Expo SDK 52, React Navigation |
| **Paiements** | Hubtel (MoMo Collection, Disbursement, VAS) |
| **SMS** | Hubtel SMS API (Simple, Batch, Personalized) |
| **Base de données** | MongoDB |
| **Temps réel** | WebSockets, SSE (Server-Sent Events) |

## Fonctionnalités

### Pour les Clients
- Inscription/Connexion avec vérification OTP (Hubtel SMS)
- Achat de cartes de fidélité (Silver, Gold, Platinum, Diamond, Business)
- Scanner QR pour payer chez les marchands
- Paiement hybride : Cashback + MoMo
- Paiement en espèces avec confirmation marchand
- Cashback automatique sur chaque paiement
- Système de parrainage avec bonus
- Services : Airtime, Data Bundles, ECG Prepaid
- Retrait cashback vers MoMo ou compte bancaire
- Vérification du nom MoMo/Bank avant retrait
- PWA installable sur mobile/desktop

### Pour les Marchands
- Dashboard analytique avancé avec graphiques
- Mini Accounting (agrège transactions, momo_payments, cash_payments)
- QR codes : Paiement + Recrutement clients
- Configuration du taux de cashback (1-20%)
- **Paiement automatique instantané** après chaque transaction client
- Configuration destination payout (MoMo ou Bank)
- Gestion des caissiers avec permissions
- Confirmation des paiements espèces
- Compte de débit pour cashback espèces
- Historique des payouts avec statistiques
- Notifications temps réel via WebSocket
- PIN de sécurité pour accès aux paramètres

### Pour l'Admin
- Dashboard analytique complet
- Gestion des clients et marchands
- Configuration des cartes et tarifs
- Limites de retrait globales et individuelles
- Suivi d'utilisation des retraits
- Envoi SMS en masse (Simple, Batch, Personalized)
- Templates SMS prédéfinis
- Historique des payouts marchands
- Logs et sécurité

## Performance & PWA

### Optimisations Implémentées
- **Code Splitting** : Toutes les pages chargées avec `React.lazy()`
- **Route Preloading** : Préchargement prédictif des pages suivantes
- **Data Caching** : Pattern stale-while-revalidate pour les APIs
- **Service Worker v3** : Cache intelligent avec invalidation automatique
- **Component Memoization** : `useMemo`, `useCallback`, `memo()`

### Résultats Performance
| Page | Temps de chargement |
|------|---------------------|
| Accueil | ~0.13s |
| Merchant Login | ~0.12s |
| Client Auth | ~0.15s |

### PWA Features
- Installation sur mobile (Add to Home Screen)
- Bouton d'installation visible dans l'app
- Icônes et splash screen personnalisés
- Mode hors ligne basique
- Notifications push (configuration OneSignal disponible)

## WebSocket Real-time

### Endpoints
| Endpoint | Description |
|----------|-------------|
| `/api/ws/merchant` | Temps réel marchand |
| `/api/ws/client` | Temps réel client |
| `/api/ws/admin` | Temps réel admin |
| `/api/ws/status` | Statistiques connexions |

### Événements
- `payment_received` - Nouveau paiement (marchand)
- `balance_update` - Solde cashback modifié (client)
- `dashboard_refresh` - Demande de rafraîchissement
- `payout_update` - Statut payout changé
- `heartbeat` - Keep-alive (45s)

## Installation Rapide

### Prérequis
- Python 3.10+
- Node.js 18+
- MongoDB
- Compte Hubtel (pour les paiements et SMS)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # ou `venv\Scripts\activate` sur Windows
pip install -r requirements.txt

# Configuration
cp .env.example .env
# Éditez .env avec vos credentials

# Lancement
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Web

```bash
cd frontend
yarn install
yarn start

# Build production
yarn build
```

### Mobile

```bash
cd mobile
npm install
npx expo start

# Pour générer l'APK Android
npx eas build -p android --profile preview
```

## Configuration (.env)

### Backend (.env)

```env
# MongoDB
MONGO_URL=mongodb://localhost:27017/
DB_NAME=sdm_rewards

# JWT
JWT_SECRET=your-secret-key

# Hubtel Payment API
HUBTEL_CLIENT_ID=your-client-id
HUBTEL_CLIENT_SECRET=your-client-secret
HUBTEL_MERCHANT_ACCOUNT=your-merchant-account
HUBTEL_PREPAID_DEPOSIT_ID=your-prepaid-deposit-id

# Hubtel SMS API
HUBTEL_SMS_CLIENT_ID=your-sms-client-id
HUBTEL_SMS_CLIENT_SECRET=your-sms-client-secret
HUBTEL_SMS_SENDER_ID=SDMREWARDS

# Fixie Proxy (pour Hubtel depuis certains serveurs)
FIXIE_URL=http://fixie:password@proxy.usefixie.com:80

# Mode Test (true/false)
PAYMENT_TEST_MODE=false
SMS_TEST_MODE=false
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=https://your-api-domain.com
```

## API Endpoints Principaux

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/otp/send` | POST | Envoi OTP via Hubtel SMS |
| `/api/auth/otp/verify` | POST | Vérification OTP |
| `/api/auth/client/register` | POST | Inscription client |
| `/api/auth/merchant/register` | POST | Inscription marchand |

### Payments
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments/merchant/initiate` | POST | Paiement MoMo à marchand |
| `/api/payments/merchant/cash` | POST | Paiement espèces à marchand |
| `/api/payments/merchant/cashback` | POST | Paiement cashback/hybride |
| `/api/payments/hubtel/callback` | POST | Webhook Hubtel |
| `/api/payments/hubtel/transfer-callback` | POST | Webhook Hubtel Send Money |

### Services (VAS)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services/airtime/purchase` | POST | Achat crédit téléphone |
| `/api/services/data/purchase` | POST | Achat forfait data |
| `/api/services/cashback/withdraw` | POST | Retrait vers MoMo |

### Verification
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/verify/banks` | GET | Liste banques Ghana |
| `/api/verify/momo/verify` | POST | Vérifier nom compte MoMo |
| `/api/verify/bank/verify` | POST | Vérifier nom compte bancaire |

## Structure des Dossiers

### Backend
```
backend/
├── server.py              # Point d'entrée FastAPI
├── routers/
│   ├── admin/            # Package admin modulaire
│   ├── merchants/        # Package merchants modulaire
│   ├── payments/         # Package payments modulaire
│   │   ├── callbacks.py  # Webhooks Hubtel
│   │   └── processing.py # Logique paiement
│   ├── auth.py           # Authentification + OTP
│   ├── services.py       # Airtime, Data, ECG
│   ├── verification.py   # MoMo/Bank name verification
│   ├── notifications_sse.py  # Server-Sent Events
│   └── websocket_router.py   # WebSocket temps réel
├── services/
│   ├── hubtel_momo_service.py  # Paiements MoMo
│   ├── hubtel_sms_service.py   # SMS (Simple, Batch, Personalized)
│   └── hubtel_vas_service.py   # Airtime/Data/ECG
└── tests/
    └── test_critical_endpoints.py
```

### Frontend
```
frontend/src/
├── pages/
│   ├── HomePage.jsx
│   ├── AdminDashboard.jsx
│   ├── ClientDashboard.jsx
│   ├── MerchantDashboard.jsx
│   └── ServicesPage.jsx
├── components/
│   ├── admin/
│   ├── client/
│   ├── merchant/
│   │   ├── AdvancedDashboard.jsx
│   │   ├── PayoutHistory.jsx
│   │   └── MerchantWithdrawal.jsx
│   ├── ui/              # Shadcn components
│   ├── PWAInstallPrompt.jsx
│   └── WebSocketIndicator.jsx
├── hooks/
│   ├── useWebSocket.js      # WebSocket hook
│   ├── useRoutePreload.js   # Route preloading
│   └── useDataCache.js      # Data caching
├── services/
│   └── webSocketService.js  # WebSocket singleton
└── context/
```

## Sécurité

- Authentification JWT avec expiration
- Vérification OTP par SMS (Hubtel)
- Headers de sécurité HTTP (CSP, HSTS, X-Frame-Options)
- Hachage des mots de passe (bcrypt)
- Protection CORS
- PIN pour accès paramètres marchands
- Limites de retrait configurables
- 2FA disponible (TOTP)

## Déploiement

### Production Web
1. Build le frontend : `yarn build`
2. Déployer le backend avec supervisord
3. Configurer Nginx comme reverse proxy
4. Configurer SSL/TLS (TLS 1.2+)
5. Configurer les webhooks Hubtel vers `/api/payments/hubtel/callback`

### Production Mobile
```bash
# Android App Bundle pour Play Store
npx eas build -p android --profile production

# iOS pour App Store
npx eas build -p ios --profile production
```

## Notes Importantes

### Hubtel Integration
- Les payouts marchands nécessitent un compte prépayé Hubtel avec solde suffisant
- IP du serveur doit être whitelistée par Hubtel pour les API Send Money
- Webhooks configurables dans le dashboard Hubtel

### Test Mode
- Mettre `PAYMENT_TEST_MODE=true` pour simuler les paiements
- Les paiements en mode test peuvent être confirmés manuellement via l'API

## Support

- **Email**: support@sdmrewards.com
- **Site**: https://sdmrewards.com

## Licence

Ce logiciel est propriétaire. Tous droits réservés © 2024-2026 GIT NFT GHANA Ltd.
