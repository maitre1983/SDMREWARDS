# SDM REWARDS - Configuration de Production

## Environnements

### 🟢 PRODUCTION (LIVE)
- **URL Frontend:** https://sdmrewards.com
- **URL Backend:** https://sdmrewards.com/api (via Emergent)
- **Base de données:** MongoDB `test_database`
- **Statut:** ✅ ACTIF

### 🟡 DÉVELOPPEMENT (TEST)
- **URL Preview:** https://web-boost-seo.preview.emergentagent.com
- **Utilisation:** Tests et développement uniquement
- **⚠️ ATTENTION:** Partage la même base de données que la production

---

## Données de Production (14 Mars 2026)

### Marchands (7)
| Nom | Cashback | Statut |
|-----|----------|--------|
| GREEN THAI MASSAGE | 5% | Actif |
| GIT NFT | 10% | Actif |
| Best In Singapore | 15% | Actif |
| Cubanox | 10% | Actif |
| HORLAP Cafe and Restaurant | 5% | Actif |
| Russian Food | 5% | Actif |
| Li Beirut Restaurant | 5% | Actif |

### Clients: 1
### Admins: 3 (dont 1 super_admin)
### Transactions: 91

---

## Backups

### Backup le Plus Récent
- **Date:** 14 Mars 2026, 13:35
- **Emplacement:** `/app/backups/production_backup_20260314_133459/`
- **Contenu:** Toutes les collections MongoDB (91 transactions, 7 marchands, 3 admins)

### Backup Initial
- **Date:** 14 Mars 2026, 13:31
- **Emplacement:** `/app/backups/production_backup_20260314_133123/`
- **Contenu:** Toutes les collections MongoDB

### Comment Restaurer un Backup
```bash
# Restaurer depuis un backup
mongorestore --db test_database /app/backups/production_backup_YYYYMMDD_HHMMSS/test_database/
```

### Comment Créer un Nouveau Backup
```bash
# Créer un backup manuel
mongodump --db test_database --out /app/backups/backup_$(date +%Y%m%d_%H%M%S)
```

---

## Sécurité

### Accès Admin
- **URL:** https://sdmrewards.com/admin{DDMMYY}
- **Format date:** Jour + Mois + Année (ex: /admin140326 pour le 14/03/26)
- **Super Admin:** emileparfait2003@gmail.com

### Protection de la Base de Données
1. Backups automatiques recommandés (quotidiens)
2. Ne jamais supprimer de données en production sans backup
3. Tester les nouvelles fonctionnalités sur l'environnement preview d'abord

---

## Maintenance

### Re-déploiement
1. Aller dans Emergent → Manage Deployments
2. Cliquer sur "Re-deploy changes"
3. Attendre la confirmation "Deployment Succeeded"

### En cas de problème
1. Vérifier les logs: `tail -f /var/log/supervisor/backend.err.log`
2. Redémarrer les services: `sudo supervisorctl restart backend frontend`
3. Restaurer un backup si nécessaire

---

## Contact Support
- Plateforme: Emergent (app.emergent.sh)
- Documentation: /app/docs/
