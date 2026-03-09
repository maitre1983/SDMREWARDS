# SDM REWARDS - Guide Complet du Projet Mobile

## 📁 Structure des Dossiers à Créer

```
sdm-rewards-mobile/
├── assets/
│   ├── icon.png (1024x1024)
│   ├── adaptive-icon.png (1024x1024)
│   ├── splash-icon.png (1284x2778)
│   └── favicon.png (48x48)
├── src/
│   ├── components/
│   │   └── Common.js
│   ├── contexts/
│   │   └── AuthContext.js
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── WelcomeScreen.js
│   │   │   ├── LoginScreen.js
│   │   │   ├── RegisterScreen.js
│   │   │   └── ForgotPasswordScreen.js
│   │   ├── client/
│   │   │   ├── HomeScreen.js
│   │   │   ├── PartnersScreen.js
│   │   │   ├── QRScannerScreen.js
│   │   │   ├── HistoryScreen.js
│   │   │   ├── ReferralsScreen.js
│   │   │   ├── ServicesScreen.js
│   │   │   ├── WithdrawalScreen.js
│   │   │   ├── ProfileScreen.js
│   │   │   ├── CardScreen.js
│   │   │   └── ContactsScreen.js
│   │   └── merchant/
│   │       ├── HomeScreen.js
│   │       ├── HistoryScreen.js
│   │       └── SettingsScreen.js
│   ├── services/
│   │   └── api.js
│   └── utils/
│       └── constants.js
├── App.js
├── index.js
├── app.json
├── eas.json
├── package.json
├── babel.config.js
└── metro.config.js
```

---

## 📦 FICHIERS DE CONFIGURATION

### 1. package.json
```json
{
  "name": "sdm-rewards-mobile",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@expo/vector-icons": "^14.0.4",
    "@react-navigation/bottom-tabs": "^7.2.0",
    "@react-navigation/native": "^7.0.14",
    "@react-navigation/stack": "^7.1.1",
    "axios": "^1.7.9",
    "expo": "~52.0.23",
    "expo-barcode-scanner": "~13.0.1",
    "expo-camera": "~16.0.10",
    "expo-contacts": "~14.0.1",
    "expo-linear-gradient": "~14.0.1",
    "expo-secure-store": "~14.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.5",
    "react-native-gesture-handler": "~2.20.2",
    "react-native-qrcode-svg": "^6.3.12",
    "react-native-reanimated": "~3.16.1",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "react-native-svg": "^15.8.0",
    "react-native-worklets": "^0.7.4"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2"
  },
  "private": true
}
```

### 2. app.json
```json
{
  "expo": {
    "name": "SDM Rewards",
    "slug": "sdm-rewards",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#0F172A"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.sdmrewards.app",
      "infoPlist": {
        "NSCameraUsageDescription": "SDM Rewards needs camera access to scan merchant QR codes for payments."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0F172A"
      },
      "package": "com.sdmrewards.app",
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.READ_CONTACTS"
      ],
      "versionCode": 1
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "SDM Rewards needs camera access to scan merchant QR codes."
        }
      ],
      [
        "expo-barcode-scanner",
        {
          "cameraPermission": "SDM Rewards needs camera access to scan QR codes."
        }
      ],
      [
        "expo-contacts",
        {
          "contactsPermission": "SDM Rewards needs access to your contacts to invite friends and see who's already a member."
        }
      ],
      "expo-secure-store"
    ],
    "extra": {
      "eas": {
        "projectId": "sdm-rewards"
      }
    }
  }
}
```

### 3. eas.json
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 4. babel.config.js
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

### 5. metro.config.js
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
```

### 6. index.js
```javascript
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
```

---

## 🚀 INSTRUCTIONS D'INSTALLATION

### Étape 1: Créer le projet
```bash
mkdir sdm-rewards-mobile
cd sdm-rewards-mobile
```

### Étape 2: Créer les fichiers de config
Copiez les fichiers package.json, app.json, eas.json, babel.config.js, metro.config.js, index.js

### Étape 3: Créer la structure des dossiers
```bash
mkdir -p src/components src/contexts src/screens/auth src/screens/client src/screens/merchant src/services src/utils assets
```

### Étape 4: Installer les dépendances
```bash
npm install
```

### Étape 5: Copier les fichiers source
Copiez tous les fichiers .js dans leurs dossiers respectifs

### Étape 6: Ajouter les icônes
Ajoutez vos images dans le dossier assets/

### Étape 7: Générer l'APK
```bash
npx eas login
npx eas build -p android --profile preview
```

---

## ⚠️ CONFIGURATION IMPORTANTE

Avant de déployer en production, modifiez l'URL de l'API dans `src/services/api.js`:

```javascript
// Ligne 8 - Changez cette URL vers votre serveur de production
const API_BASE_URL = 'https://votre-domaine-production.com/api';
```

