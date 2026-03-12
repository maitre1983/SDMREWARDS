# SDM REWARDS - Scripts de Déploiement

## Vue d'ensemble

Ce dossier contient les scripts d'automatisation pour le déploiement et la maintenance de l'application SDM REWARDS.

## Scripts Disponibles

### 1. `deploy_mobile.sh` - Déploiement Mobile Complet

Script complet pour construire et déployer l'application mobile Expo vers le serveur backend.

```bash
# Déploiement standard
./scripts/deploy_mobile.sh

# Avec options
./scripts/deploy_mobile.sh --clean      # Build propre (réinstalle les dépendances)
./scripts/deploy_mobile.sh --verbose    # Affiche les détails
./scripts/deploy_mobile.sh --skip-deps  # Ignore l'installation des dépendances
./scripts/deploy_mobile.sh --no-optimize # Ignore l'optimisation des assets
```

**Ce que fait le script :**
1. Vérifie les prérequis (Node.js, npm)
2. Installe les dépendances npm
3. Build l'export web Expo
4. Optimise les assets (si disponible)
5. Sauvegarde le déploiement actuel
6. Déploie vers `/app/backend/static/mobile/`
7. Vérifie le déploiement

### 2. `quick_mobile_update.sh` - Mise à Jour Rapide

Script simplifié pour les petites modifications (ne réinstalle pas les dépendances).

```bash
./scripts/quick_mobile_update.sh
```

## Utilisation via Makefile

Un Makefile est disponible à la racine du projet pour des raccourcis :

```bash
cd /app

# Mobile
make mobile-deploy   # Déploiement complet
make mobile-quick    # Mise à jour rapide
make mobile-clean    # Nettoyer les artifacts

# Serveur
make backend-restart  # Redémarrer le backend
make frontend-restart # Redémarrer le frontend
make restart-all      # Redémarrer tous les services

# Logs
make logs            # Voir tous les logs récents
make backend-logs    # Logs backend uniquement
make frontend-logs   # Logs frontend uniquement

# Tests
make test-api        # Tester la santé de l'API
make test-mobile     # Tester l'URL mobile
```

## URLs

- **Application Mobile Web:** `https://[domaine]/api/mobile`
- **API Backend:** `https://[domaine]/api/`
- **Frontend Web:** `https://[domaine]/`

## Structure des Fichiers

```
/app/
├── scripts/
│   ├── deploy_mobile.sh      # Déploiement complet
│   ├── quick_mobile_update.sh # Mise à jour rapide
│   └── README.md              # Cette documentation
├── Makefile                   # Raccourcis make
├── mobile/                    # Code source mobile Expo
│   ├── src/
│   ├── App.js
│   └── package.json
└── backend/
    └── static/
        └── mobile/            # Build mobile déployé
```

## Logs

Les logs de déploiement sont sauvegardés dans :
- `/tmp/mobile_deploy_YYYYMMDD_HHMMSS.log`

## Rollback

En cas de problème, le script conserve une sauvegarde dans :
- `/app/backend/static/mobile_backup/`

Pour restaurer manuellement :
```bash
rm -rf /app/backend/static/mobile
cp -r /app/backend/static/mobile_backup /app/backend/static/mobile
```

## Troubleshooting

### Le build échoue
```bash
# Nettoyer et reconstruire
cd /app/mobile
rm -rf node_modules dist web-build .expo
npm install --legacy-peer-deps
npx expo export --platform web
```

### L'app mobile n'est pas accessible
```bash
# Vérifier que les fichiers sont présents
ls -la /app/backend/static/mobile/

# Vérifier les logs backend
tail -50 /var/log/supervisor/backend.err.log

# Redémarrer le backend si nécessaire
sudo supervisorctl restart backend
```

### Erreur de permissions
```bash
chmod -R 755 /app/backend/static/mobile
```
