# SDM REWARDS - Documentation Complète du Système

## Vue d'Ensemble

**SDM Rewards** est une plateforme de fidélisation et de cashback multi-utilisateurs permettant aux commerçants d'offrir des récompenses à leurs clients. Le système comprend trois interfaces principales : Admin, Marchand et Client.

**URL Production:** `https://sdmrewards.com`

---

## Architecture du Système

```
┌─────────────────────────────────────────────────────────────────┐
│                        SDM REWARDS                               │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   ADMIN         │   MARCHAND      │         CLIENT              │
│   Dashboard     │   Dashboard     │         Dashboard           │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                     API Backend (FastAPI)                        │
├─────────────────────────────────────────────────────────────────┤
│                     Base de données MongoDB                      │
└─────────────────────────────────────────────────────────────────┘
```

---

# 1. DASHBOARD ADMINISTRATEUR

## Accès
- URL: `/admin{DDMMYY}` (ex: `/admin130326` pour le 13/03/2026)
- Authentification par email/mot de passe
- Protection par code PIN pour les paramètres sensibles

## Fonctionnalités Principales

### 1.1 Vue d'Ensemble (Overview)
- **Statistiques globales en temps réel:**
  - Nombre total de clients et clients actifs
  - Nombre total de marchands et marchands actifs
  - Marchands en attente d'approbation
  - Volume de transactions journalier/mensuel
  - Cashback total distribué

- **Analyse des méthodes de paiement:**
  - Répartition Cash vs Mobile Money (MoMo)
  - Graphiques de tendances

- **Statistiques mensuelles:**
  - Sélection par mois
  - Nouveaux clients/marchands
  - Ventes de cartes
  - Volume de transactions

### 1.2 Gestion des Clients
- **Liste des clients** avec recherche par nom, téléphone, username
- **Actions disponibles par client:**
  - Voir les détails et transactions
  - Activer/Suspendre/Bloquer le compte
  - Envoyer un SMS
  - Réinitialiser le mot de passe
  - Modifier les limites (retrait, transaction, journalier)
  - Supprimer le compte

- **Création manuelle de client:**
  - Nom complet, téléphone, username
  - Email (optionnel)
  - Type de carte
  - Génération de mot de passe temporaire

### 1.3 Gestion des Marchands
- **Liste des marchands** avec recherche
- **États possibles:** En attente, Actif, Suspendu, Bloqué, Rejeté

- **Actions disponibles:**
  - Approuver/Rejeter les nouvelles inscriptions
  - Voir les transactions et statistiques
  - Modifier la localisation (adresse, Google Maps)
  - Envoyer un SMS
  - Réinitialiser le mot de passe
  - Gérer le compte de débit (limite, paramètres)
  - Suspendre/Bloquer/Supprimer

- **Compte de débit marchand:**
  - Définir la limite de débit pour paiements cash
  - Jours de règlement
  - Débloquer les comptes bloqués

### 1.4 SEO & Analytics
- Suivi des performances SEO
- Analyses de trafic
- Métriques de conversion

### 1.5 Paramètres (Settings)

#### 1.5.1 Gestion des Types de Cartes
- **Types disponibles:** Silver, Gold, Platinum, Diamond, Business
- Configuration par carte:
  - Prix de vente
  - Durée de validité
  - Bonus de bienvenue
  - Avantages/bénéfices

#### 1.5.2 Commissions de la Plateforme
- Taux de commission global
- Commissions par service:
  - Airtime (recharge téléphone)
  - Data (forfaits internet)
  - ECG (électricité)
  - Paiement marchand
  - Retrait

#### 1.5.3 Bonus de Parrainage
- Bonus de bienvenue pour le parrainé
- Bonus pour le parrain

#### 1.5.4 Envoi de SMS en Masse
- Destinataires: Tous les clients ou marchands
- Filtres: Tous, Actifs, Inactifs
- Historique des SMS envoyés
- Templates SMS prédéfinis
- SMS programmés

#### 1.5.5 Notifications Push
- Envoi de notifications à tous les abonnés
- Segmentation (Tous, Clients, Marchands)
- Titre, message, URL de redirection

#### 1.5.6 Gestion des Administrateurs
- Création de sous-administrateurs
- Rôles: Super Admin, Admin Support
- Activation/Désactivation des comptes

#### 1.5.7 Sécurité
- Code PIN pour accès aux paramètres
- Changement de mot de passe avec OTP

---

# 2. DASHBOARD MARCHAND

## Accès
- URL: `/merchant`
- Authentification par numéro de téléphone et mot de passe
- Option "Se souvenir de cet appareil"

## Fonctionnalités Principales

### 2.1 Tableau de Bord Avancé (Home)
- **Statistiques en temps réel:**
  - Revenus du jour/semaine/mois
  - Nombre de transactions
  - Cashback distribué
  - Nouveaux clients

- **Graphiques:**
  - Évolution des ventes
  - Répartition Cash vs MoMo
  - Tendances hebdomadaires

### 2.2 QR Codes
Le marchand dispose de **2 QR codes distincts:**

#### QR Code de Paiement (Vert)
- Permet aux clients de payer
- Génère du cashback automatiquement
- Code unique par marchand

#### QR Code de Recrutement (Violet)
- Permet d'inscrire de nouveaux clients
- Le marchand reçoit une commission de parrainage
- Lien direct vers l'inscription

### 2.3 Gestion des Paiements Cash

#### Confirmations en Attente
- Liste des paiements cash non confirmés
- Délai de confirmation: 72 heures max
- Actions: Confirmer la réception / Rejeter

#### Compte de Débit
- Solde actuel
- Limite de débit autorisée
- Pourcentage d'utilisation
- Historique des débits/crédits
- Option de recharge du compte

### 2.4 Historique des Transactions
- Liste complète des transactions
- Filtres par date, type, statut
- Export des données
- Détails: montant, cashback, méthode de paiement

### 2.5 Paramètres

#### Taux de Cashback
- Configurable de 1% à 20%
- S'applique à toutes les transactions

#### Informations de Paiement
- **Mobile Money:**
  - Numéro MoMo
  - Réseau (MTN, Telecel, AirtelTigo)
  
- **Compte Bancaire:**
  - Sélection de la banque
  - Numéro de compte
  - Vérification du compte (nom du titulaire)
  - Méthode de paiement préférée

#### Relevés Mensuels
- Génération de relevés PDF
- Historique par mois/année

#### Gestion des Caissiers
- Création de comptes caissiers
- Permissions et accès limités
- Activation/Désactivation

#### Informations du Commerce
- Nom de l'entreprise
- Adresse et ville
- Lien Google Maps
- Logo/Photo

#### Sécurité
- Code PIN pour accès aux paramètres
- Changement de mot de passe
- Récupération par SMS/Email

### 2.6 API & Webhooks (Intégration POS)

#### Gestion des Clés API
- Création de clés API pour intégrations tierces
- Paramètres par clé:
  - Nom et description
  - Limite de requêtes (rate limit)
  - Liste blanche d'IPs (IP Whitelist)
- Rotation des clés avec période de grâce
- Révocation des clés

#### Webhooks
- Enregistrement d'URLs de callback
- Événements disponibles:
  - `points_earned` (points gagnés)
  - `points_redeemed` (points utilisés)
  - `customer_registered` (nouveau client)
  - `transaction_completed` (transaction terminée)
- Secret pour validation de signature
- Test des webhooks

---

# 3. DASHBOARD CLIENT

## Accès
- URL: `/client`
- Authentification par téléphone et mot de passe
- Option "Se souvenir de cet appareil"
- Inscription avec code de parrainage (optionnel)

## Fonctionnalités Principales

### 3.1 Accueil (Home)

#### Carte de Solde
- Solde cashback actuel
- Total gagné / Total dépensé
- Type de carte (Silver, Gold, Platinum...)
- Boutons d'actions rapides:
  - Services (airtime, data, ECG)
  - Retrait de cashback
  - Paramètres de paiement

#### Ma Carte
- Affichage visuel de la carte
- Numéro de carte
- Nom du membre
- **Validité:**
  - Date d'activation
  - Date d'expiration
  - Jours restants
  - Barre de progression
- Option de renouvellement si expirée
- Option d'upgrade vers carte supérieure

#### Statistiques Rapides
- Nombre de parrainages
- Total des bonus gagnés

#### Activité Récente
- 5 dernières transactions

### 3.2 Scanner QR (Payer)

#### Scanner pour Payer
- Ouverture de la caméra
- Scan du QR code marchand
- Modal de paiement avec:
  - Informations du marchand
  - Montant à payer
  - Méthode de paiement:
    - **MoMo:** Prompt envoyé au téléphone
    - **Cash:** Paiement en attente de confirmation marchand
    - **Cashback:** Utiliser le solde cashback
    - **Hybride:** Combinaison cashback + MoMo

#### Parcourir les Partenaires
- Liste des marchands partenaires
- Recherche par nom
- Filtres par ville
- Informations: adresse, taux de cashback
- Navigation vers Google Maps

#### Mon QR Code
- QR code personnel du client
- Peut être scanné par un marchand

### 3.3 Historique des Transactions
- Liste complète et détaillée
- Types de transactions:
  - Cashback gagné
  - Paiement effectué
  - Bonus de bienvenue
  - Bonus de parrainage
  - Achat de carte
- Statuts: Complété, En attente, Rejeté, Expiré

### 3.4 Parrainages

#### Statistiques
- Total de parrainages
- Parrainages actifs
- Montant total des bonus

#### QR Code de Parrainage
- QR code unique
- Lien de parrainage
- Partage sur:
  - WhatsApp
  - Facebook
  - Twitter
  - Copier le lien

#### Liste des Parrainés
- Nom et date d'inscription
- Statut: Actif ou En attente (achat de carte)
- Bonus reçu

### 3.5 Services
Page dédiée pour les services VAS (Value Added Services):

#### Recharge Téléphone (Airtime)
- Sélection du réseau (MTN, Telecel, AirtelTigo)
- Numéro de téléphone
- Montant
- Paiement via MoMo ou solde cashback

#### Forfaits Internet (Data)
- Sélection du réseau
- Packages disponibles avec prix
- Paiement

#### Électricité (ECG)
- Numéro de compteur
- Montant
- Paiement

### 3.6 Assistant IA
- Chatbot intelligent
- Réponses aux questions fréquentes
- Conseils personnalisés
- Support multilingue

### 3.7 Missions
- Objectifs à accomplir
- Récompenses à débloquer
- Progression et badges

### 3.8 Profil & Paramètres
- Informations personnelles
- Langue préférée
- Paramètres de paiement:
  - Numéro MoMo
  - Compte bancaire
  - Méthode de retrait préférée
- Notifications

### 3.9 Achat et Upgrade de Carte

#### Achat Initial
- Liste des cartes disponibles
- Prix et durée
- Avantages de chaque carte
- Paiement via MoMo

#### Upgrade de Carte
- Options d'upgrade disponibles
- Prix de la nouvelle carte
- Bonus de bienvenue
- Possibilité d'utiliser le cashback en déduction

---

# 4. INTÉGRATION POS (Point de Vente)

## Documentation API
- Documentation complète: `/docs/INTEGRATION_API.md`
- Exemples POS: `/docs/POS_INTEGRATION_EXAMPLES.md`

## Endpoints Principaux

### Authentification
```
Header: X-API-Key: sdm_live_xxxx
Header: X-Merchant-ID: your_merchant_id
```

### Points
- `POST /api/integration/points/award` - Attribuer des points
- `POST /api/integration/points/redeem` - Utiliser des points

### Client
- `GET /api/integration/customer/balance` - Vérifier le solde
- `GET /api/integration/customer/transactions` - Historique

### Webhooks
- `POST /api/integration/webhooks/register` - Enregistrer un webhook
- Signature HMAC-SHA256 pour validation

### Sécurité
- Rate limiting par clé API
- IP Whitelisting optionnel
- Rotation des clés avec période de grâce

---

# 5. FONCTIONNALITÉS DE SÉCURITÉ

## Authentification
- Tokens JWT avec expiration
- Option "Se souvenir de cet appareil" (Device Trust)
- 2FA disponible pour admin

## Protection par PIN
- Admin: PIN requis pour accès aux paramètres
- Marchand: PIN optionnel pour paramètres sensibles

## Mot de Passe Oublié
- Réinitialisation par SMS (OTP)
- Flux sécurisé multi-étapes

## API
- Clés API avec préfixe identifiable
- Hachage des clés en base
- Rate limiting (100 req/min par défaut)
- IP Whitelisting

---

# 6. MÉTHODES DE PAIEMENT

## Mobile Money (MoMo)
- **Réseaux supportés:**
  - MTN MoMo
  - Telecel (ex-Vodafone)
  - AirtelTigo

- **Flux de paiement:**
  1. Client initie le paiement
  2. Prompt envoyé au téléphone
  3. Client approuve sur son téléphone
  4. Confirmation automatique
  5. Cashback crédité instantanément

## Paiement Cash
- Client scanne le QR marchand
- Sélectionne "Cash" comme méthode
- Marchand reçoit notification
- Marchand confirme réception (max 72h)
- Cashback crédité après confirmation
- Débit automatique du compte marchand

## Paiement par Cashback
- Utiliser le solde cashback pour payer
- Mode hybride: Cashback + MoMo

## Virement Bancaire
- Pour les marchands (payouts)
- Vérification du compte avant activation

---

# 7. SYSTÈME DE CASHBACK

## Comment ça fonctionne
1. Client paie chez un marchand partenaire
2. Le marchand a configuré son taux de cashback (1-20%)
3. Le cashback est calculé automatiquement
4. Le montant est crédité sur le compte client

## Exemple
- Achat: GHS 100
- Taux marchand: 5%
- Cashback client: GHS 5

## Utilisation du Cashback
- Paiement chez les marchands
- Achat de services (airtime, data)
- Retrait vers MoMo/Banque (frais applicables)
- Upgrade de carte

---

# 8. SYSTÈME DE PARRAINAGE

## Flux de Parrainage
1. Client existant partage son code/QR
2. Nouveau client s'inscrit avec le code
3. Nouveau client achète une carte
4. Les deux reçoivent leurs bonus

## Bonus (configurables par admin)
- **Parrainé:** Bonus de bienvenue (ex: GHS 1)
- **Parrain:** Commission (ex: GHS 3)

## Suivi
- Statistiques de parrainage par client
- Historique des bonus distribués

---

# 9. CARTES DE FIDÉLITÉ

## Types de Cartes

| Type | Prix | Durée | Bonus Bienvenue |
|------|------|-------|-----------------|
| Silver | 25 GHS | 1 an | 1 GHS |
| Gold | 50 GHS | 1 an | 2 GHS |
| Platinum | 100 GHS | 2 ans | 3 GHS |
| Diamond | Variable | Variable | Variable |
| Business | Variable | Variable | Variable |

## Validité
- Chaque carte a une durée de validité
- Notifications d'expiration
- Renouvellement possible
- Upgrade vers carte supérieure disponible

---

# 10. NOTIFICATIONS

## Types
- **SMS:** Transactions, promotions, alertes
- **Push:** Notifications web/mobile
- **In-App:** Alertes dans l'application

## Déclencheurs
- Nouveau paiement reçu (marchand)
- Cashback crédité (client)
- Confirmation requise (cash)
- Expiration de carte
- Nouveaux parrainages

---

# 11. MULTILINGUE

## Langues Supportées
- Français
- English
- Autres (configurable)

## Implémentation
- Détection automatique
- Sélection manuelle
- Synchronisation avec le serveur

---

# 12. RAPPORTS & ANALYTICS

## Admin
- Statistiques globales
- Rapports mensuels
- Analyses des tendances
- Métriques SEO

## Marchand
- Revenus quotidiens/hebdomadaires/mensuels
- Graphiques de performance
- Relevés mensuels (PDF)
- Répartition des méthodes de paiement

## Client
- Historique des transactions
- Suivi du cashback
- Statistiques de parrainage

---

# 13. SUPPORT TECHNIQUE

## Contact
- Email: support@sdmrewards.com
- Documentation API: `/docs`

## Ressources
- Guide d'intégration POS
- FAQ
- Conditions d'utilisation
- Politique de confidentialité

---

**Version:** 1.0.0
**Dernière mise à jour:** Mars 2026
