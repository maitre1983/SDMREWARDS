# SDM REWARDS - Mobile App

## 🚀 Quick Start pour générer l'APK

### Prérequis
- Node.js 18+ installé
- Compte Expo gratuit (https://expo.dev/signup)

### Étapes

1. **Installer les dépendances**
```bash
npm install
```

2. **Se connecter à Expo**
```bash
npx eas login
```

3. **Générer l'APK de test**
```bash
npx eas build -p android --profile preview
```

4. **Attendre le build** (~10-15 minutes)
   - Un lien sera affiché pour télécharger l'APK

### Pour la Production (Google Play Store)

1. **Modifier l'URL de l'API** dans `src/services/api.js` :
```javascript
const API_BASE_URL = 'https://votre-domaine-production.com/api';
```

2. **Incrémenter la version** dans `app.json` :
```json
"version": "1.0.1",
"android": { "versionCode": 2 }
```

3. **Builder pour production (AAB)**
```bash
npx eas build -p android --profile production
```

4. **Uploader sur Google Play Console**

### Configuration importante

- **Package name**: `com.sdmrewards.app`
- **Permissions**: Camera, Contacts
- **Min SDK**: 21 (Android 5.0)

