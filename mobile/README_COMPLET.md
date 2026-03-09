# 📱 SDM REWARDS - Application Mobile Complète

## 🚀 Installation Rapide (5 minutes)

### Prérequis
- Node.js 18+ installé sur votre ordinateur
- Un compte Expo gratuit (créez-le sur https://expo.dev/signup)

### Étapes

1. **Créez un nouveau dossier et initialisez le projet**
```bash
mkdir sdm-rewards-mobile
cd sdm-rewards-mobile
npx create-expo-app@latest . --template blank
```

2. **Remplacez les fichiers de configuration**
   - Copiez le contenu de `package.json` depuis FULL_PROJECT_GUIDE.md
   - Copiez le contenu de `app.json` depuis FULL_PROJECT_GUIDE.md
   - Copiez le contenu de `eas.json` depuis FULL_PROJECT_GUIDE.md
   - Copiez le contenu de `babel.config.js` depuis FULL_PROJECT_GUIDE.md

3. **Installez les dépendances**
```bash
rm -rf node_modules package-lock.json
npm install
```

4. **Créez la structure des dossiers**
```bash
mkdir -p src/components src/contexts src/screens/auth src/screens/client src/screens/merchant src/services src/utils
```

5. **Copiez les fichiers source**
   - `App.js` → racine du projet
   - `src/utils/constants.js` → depuis FULL_PROJECT_GUIDE.md
   - `src/services/api.js` → depuis FULL_PROJECT_GUIDE.md
   - `src/contexts/AuthContext.js` → depuis FULL_PROJECT_GUIDE.md
   - `src/components/Common.js` → depuis FULL_PROJECT_GUIDE.md
   - Tous les écrans depuis CODE_AUTH_SCREENS.md, CODE_CLIENT_SCREENS.md, CODE_MERCHANT_SCREENS.md

6. **Générez l'APK**
```bash
npx eas login
npx eas build -p android --profile preview
```

7. **Téléchargez l'APK** depuis le lien fourni (~15 minutes)

---

## 📁 Liste des Fichiers de Documentation

| Fichier | Contenu |
|---------|---------|
| `FULL_PROJECT_GUIDE.md` | Configuration + Structure + Instructions |
| `CODE_AUTH_SCREENS.md` | Code des 4 écrans d'authentification |
| `CODE_CLIENT_SCREENS.md` | Code des 10 écrans client |
| `CODE_MERCHANT_SCREENS.md` | Code des 3 écrans merchant |

---

## ⚠️ Configuration Production

Avant de publier sur le Play Store, modifiez l'URL de l'API:

```javascript
// Dans src/services/api.js ligne 10
const API_BASE_URL = 'https://VOTRE-DOMAINE-PRODUCTION.com/api';
```

---

## 📊 Statistiques du Projet

- **Écrans Total**: 17
- **Lignes de Code**: ~14,000
- **Composants Réutilisables**: 6
- **APIs Intégrées**: 30+

---

## 🎨 Fonctionnalités Incluses

### Client
- ✅ Dashboard avec solde cashback
- ✅ Scanner QR pour payer chez les marchands
- ✅ Liste des partenaires marchands
- ✅ Historique des transactions
- ✅ Système de parrainage avec code QR
- ✅ Achat Airtime & Data
- ✅ Retrait cashback vers MoMo
- ✅ Profil utilisateur
- ✅ Achat/Upgrade cartes de fidélité
- ✅ Invitation via contacts téléphone

### Merchant
- ✅ Dashboard avec ventes et QR code
- ✅ Historique des transactions
- ✅ Paramètres business

### Auth
- ✅ Écran de bienvenue
- ✅ Connexion Client/Merchant
- ✅ Inscription avec OTP
- ✅ Mot de passe oublié

