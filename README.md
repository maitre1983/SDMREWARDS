# SDM REWARDS - Plateforme de Fidélité et Cashback

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Mobile-green.svg)

## Description

**SDM REWARDS** (Smart Development Membership) est une plateforme complète de fidélité et cashback pour le marché ghanéen. Elle permet aux clients de gagner du cashback lors de leurs achats chez les marchands partenaires, et offre des services financiers comme l'achat d'airtime, de forfaits data, et le retrait vers Mobile Money.

## Architecture

```
sdm-rewards/
├── backend/          # API FastAPI (Python)
├── frontend/         # Application Web (React)
└── mobile/           # Application Mobile (React Native/Expo)
```

## Technologies

| Composant | Technologies |
|-----------|-------------|
| **Backend** | FastAPI, MongoDB, Motor, JWT, Pydantic |
| **Frontend Web** | React 18, Tailwind CSS, Shadcn/UI, Recharts |
| **Mobile** | React Native, Expo SDK 52, React Navigation |
| **Paiements** | BulkClix (MoMo, SMS, Airtime, Data) |
| **Base de données** | MongoDB Atlas |

## Fonctionnalités

### Pour les Clients
- Inscription/Connexion avec vérification OTP
- Achat de cartes de fidélité (Silver, Gold, Platinum, Diamond)
- Scanner QR pour payer chez les marchands
- Cashback automatique sur chaque paiement
- Système de parrainage avec bonus
- Services : Airtime, Data Bundles
- Retrait cashback vers MoMo ou compte bancaire

### Pour les Marchands
- Dashboard avec statistiques de ventes
- QR code unique pour recevoir les paiements
- Configuration du taux de cashback
- Auto-payout vers MoMo
- Gestion des caissiers

### Pour l'Admin
- Dashboard analytique complet
- Gestion des clients et marchands
- Configuration des cartes et tarifs
- Envoi SMS en masse
- Logs et sécurité

## Installation Rapide

### Prérequis
- Python 3.10+
- Node.js 18+
- MongoDB
- Compte BulkClix (pour les paiements)

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
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/
DB_NAME=sdm_rewards

# JWT
JWT_SECRET=your-secret-key

# BulkClix API
BULKCLIX_API_KEY=your-api-key
BULKCLIX_API_SECRET=your-api-secret
BULKCLIX_SENDER_ID=SDMREWARDS

# Mode Test (true/false)
PAYMENT_TEST_MODE=false
SMS_TEST_MODE=false
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=https://your-api-domain.com
```

## Documentation API

Voir le fichier [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) pour la documentation complète de l'API.

## Structure des Dossiers

### Backend
```
backend/
├── server.py              # Point d'entrée FastAPI
├── routers/
│   ├── admin.py          # Routes admin
│   ├── auth.py           # Authentification
│   ├── clients.py        # Gestion clients
│   ├── merchants.py      # Gestion marchands
│   ├── payments.py       # Paiements BulkClix
│   └── services.py       # Airtime, Data
├── services/
│   ├── bulkclix_service.py
│   └── sms_service.py
└── models/
```

### Frontend
```
frontend/src/
├── pages/
│   ├── HomePage.jsx
│   ├── AdminDashboard.jsx
│   ├── ClientDashboard.jsx
│   └── MerchantDashboard.jsx
├── components/
│   ├── admin/
│   ├── client/
│   ├── merchant/
│   └── ui/              # Shadcn components
└── context/
```

### Mobile
```
mobile/src/
├── screens/
│   ├── auth/            # Welcome, Login, Register
│   ├── client/          # 10 écrans client
│   └── merchant/        # 3 écrans merchant
├── components/
├── contexts/
├── services/
└── utils/
```

## Sécurité

- Authentification JWT
- Vérification OTP par SMS
- Headers de sécurité HTTP (CSP, HSTS, X-Frame-Options)
- Hachage des mots de passe (bcrypt)
- Protection CORS

## Déploiement

### Production Web
1. Build le frontend : `yarn build`
2. Déployer le backend sur un serveur avec supervisord
3. Configurer Nginx comme reverse proxy
4. Configurer SSL/TLS (TLS 1.2+)

### Production Mobile
```bash
# Android App Bundle pour Play Store
npx eas build -p android --profile production

# iOS pour App Store
npx eas build -p ios --profile production
```

## Support

- **Email**: support@sdmrewards.com
- **Site**: https://sdmrewards.com

## Licence

Ce logiciel est propriétaire. Tous droits réservés © 2024-2026 GIT NFT GHANA Ltd.
