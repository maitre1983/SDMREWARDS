# Instructions de Déploiement pour SDM Rewards

## Problème Identifié
Le site `sdmrewards.com` utilise un build ancien avec une URL backend incorrecte/tronquée.

## Solution: Re-déployer le Frontend

### Option 1: Via Emergent Platform (Recommandé)
1. Cliquez sur "Deploy" dans l'interface Emergent
2. Téléchargez le nouveau build
3. Uploadez sur Namecheap

### Option 2: Build Manuel
```bash
# Dans le dossier frontend
cd /app/frontend

# Installer les dépendances
yarn install

# Créer le build de production
yarn build

# Le dossier 'build' contient les fichiers à déployer
```

### Fichiers à Uploader sur Namecheap
Tout le contenu du dossier `/app/frontend/build/`:
- index.html
- static/ (tout le dossier)
- manifest.json
- favicon.ico
- etc.

## Vérification Post-Déploiement

1. **Ouvrir la console développeur** (F12) sur `sdmrewards.com`
2. **Vérifier les logs**: Vous devriez voir:
   ```
   [SDM Rewards] API URL resolved to: https://web-boost-seo.preview.emergentagent.com
   ```
3. **Tester Forgot Password**: Doit fonctionner sans erreur "Network error"

## Configuration Correcte

Le fichier `/app/frontend/src/config/api.js` est maintenant configuré pour:
- **sdmrewards.com** → `https://web-boost-seo.preview.emergentagent.com`
- **preview.emergentagent.com** → URL d'origine
- **localhost** → `http://localhost:8001`

## URLs Backend Valides
- Preview: `https://web-boost-seo.preview.emergentagent.com`
- Les deux sont configurés dans CORS

## Si le Problème Persiste

1. **Vider le cache du navigateur** complètement
2. **Tester en navigation privée**
3. **Vérifier les headers CORS** dans la console (onglet Network)

## Contact Support
Si après re-déploiement le problème persiste, vérifiez:
- Que TOUS les fichiers du dossier `build/` ont été uploadés
- Qu'aucun fichier `.htaccess` ne bloque les requêtes
- Que le cache CDN de Namecheap est vidé
