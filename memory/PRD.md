# SDM REWARDS - Product Requirements Document

## Project Overview
**SDM (Smart Development Membership)** - Digital loyalty and cashback platform for Ghana

---

## CHANGELOG

### March 5, 2026 - AdminDashboard.jsx Refactoring ✅

**Refactoring completed - File reduced from 3556 to 2949 lines (-17%)**

**New Modular Components Created:**
- `AdminOverview.jsx` (~300 lines) - Overview tab with all statistics, charts, Monthly Analytics
- `AdminClients.jsx` (~150 lines) - Clients management table with actions
- `AdminMerchants.jsx` (~175 lines) - Merchants management table with actions

**Files Structure After Refactoring:**
```
/app/frontend/src/components/admin/
├── AdminOverview.jsx       # NEW - Overview statistics
├── AdminClients.jsx        # NEW - Clients management
├── AdminMerchants.jsx      # NEW - Merchants management
├── CardTypesManager.jsx    # Card types CRUD
├── ServiceFeesAnalytics.jsx # Commissions & fees
└── SDMCommissionsPanel.jsx # (Optional future split)
```

**Benefits:**
- Better code organization and maintainability
- Easier debugging and feature additions
- Reusable components
- Reduced main file complexity

---

### March 5, 2026 - Monthly Analytics Selector & PIN Bug Fix ✅

**1. Monthly Growth → Monthly Analytics Selector:**
- Replaced "Monthly Growth (Last 6 Months)" grid with a dropdown month selector
- New input type="month" with data-testid="month-selector"
- Admin can select any month to view analytics
- Displays: Transactions, Volume, New Clients, New Merchants, Cashback Paid, Card Sales

**2. Admin PIN Change Bug Fix:**
- Fixed: Super admin couldn't change PIN despite correct credentials
- Root cause: Email comparison wasn't case-insensitive
- Fix: Added `.lower()` to email comparison in `/api/admin/settings/change-pin`

**New Endpoint:**
- `GET /api/admin/analytics/monthly?month=YYYY-MM` - Returns analytics for specific month

**Tests:** 100% (9/9 backend, 100% frontend)

---

### March 5, 2026 - English Language Migration ✅

**System-wide English Translation:**
- All SEO meta tags (title, description, og:*, twitter:*)
- Schema.org JSON-LD structured data
- SMS notification templates (card expiring, referral bonus, etc.)
- Backend API error messages
- Frontend UI text (Client Dashboard, Merchant components)
- Duration labels ("1 year", "2 years", "6 months" instead of French)

**Files Modified:**
- `/app/frontend/public/index.html` - SEO meta tags
- `/app/frontend/src/components/client/ReferralQRCode.jsx` - UI text
- `/app/frontend/src/pages/ClientDashboard.jsx` - All UI text
- `/app/frontend/src/components/merchant/PinSettings.jsx` - UI text
- `/app/frontend/src/components/merchant/ForgotPinModal.jsx` - UI text
- `/app/backend/routers/clients.py` - Error messages, duration formatting
- `/app/backend/routers/payments.py` - SMS messages
- `/app/backend/services/sms_service.py` - Notification templates
- `/app/backend/server.py` - Duration formatting

---

### March 5, 2026 - SMS Notifications & SEO Package ✅

**1. Notifications SMS pour 3 événements:**
- **Parrainage** : SMS envoyé quand un filleul achète une carte (`notify_referral_bonus`)
- **Paiement reçu** : SMS avec détails du cashback gagné (`notify_payment_received`)
- **Expiration carte** : Rappels à 7, 3 et 1 jour(s) avant expiration (`notify_card_expiring`, `notify_card_expired`)

**Nouvel Endpoint API:**
- `POST /api/tasks/card-expiration-reminders` - Tâche pour envoyer les rappels d'expiration (à appeler par cron job quotidien)

**2. Package SEO Complet:**
- **robots.txt** : Bloque /admin et /api/, référence le sitemap
- **sitemap.xml** : 11 URLs indexées (homepage, client, merchant, legal pages)
- **Meta Tags** : title, description, keywords, robots, author
- **Open Graph** : og:title, og:description, og:image, og:url pour Facebook/LinkedIn
- **Twitter Cards** : summary_large_image pour partage Twitter
- **Schema.org JSON-LD** :
  - `Organization` : SDM Rewards, GIT NFT GHANA Ltd
  - `WebApplication` : FinanceApplication, GHS 25-500
  - `FAQPage` : 3 questions fréquentes

**Tests:** 100% réussite (13/13 backend)

---

### March 5, 2026 - Client Space Enhancements ✅

**1. QR Code de Parrainage (Referral QR Code):**
- Nouveau composant `/app/frontend/src/components/client/ReferralQRCode.jsx`
- QR code avec logo SDM au centre
- Lien de parrainage encodé: `{origin}/client?ref={referralCode}`
- Bouton "Télécharger" pour sauvegarder en PNG avec branding
- Bouton "Partager" utilisant l'API Web Share native
- Options de partage: WhatsApp, SMS, Email, Telegram, Copier le lien
- Section "Comment ça marche?" avec étapes numérotées
- Tout en français

**2. Statut "INACTIF" pour les Clients:**
- Nouveau badge "COMPTE INACTIF" orange pour clients sans carte
- Message "Activez votre compte" avec icône
- Description explicative en français
- Bouton "Acheter une carte" avec data-testid

**3. Mise à Niveau de Carte (Card Upgrade):**
- Section "Mise à niveau disponible" pour clients actifs
- Affichage des cartes supérieures disponibles
- Calcul automatique de la différence de prix
- Modal de paiement pour l'upgrade
- Endpoint API: `POST /api/clients/cards/upgrade`
- Transaction enregistrée avec type "card_upgrade"
- SMS de confirmation après upgrade

**Nouveaux Endpoints API:**
- `POST /api/clients/cards/upgrade` - Initier mise à niveau (paie différence)

**Nouveau Composant Frontend:**
- `/app/frontend/src/components/client/ReferralQRCode.jsx`

**Tests:** 100% réussite (14/14 backend, frontend complet)

---

### March 5, 2026 - Card Validity System Implementation ✅

**Calcul Automatique de Validité:**
- Date d'activation (card_purchased_at) stockée à l'achat
- Date d'expiration (card_expires_at) calculée: start_date + duration_days
- Durée en jours (card_duration_days) stockée pour référence

**Endpoints Client:**
- `GET /api/clients/cards/my-card` - Retourne validity avec:
  - is_active, is_expired
  - start_date, end_date (format DD/MM/YYYY)
  - days_remaining, days_used
  - duration_days
- `GET /api/clients/cards/status` - Résumé rapide avec message

**Renouvellement:**
- Client peut racheter une carte si l'ancienne est expirée
- Message d'avertissement si carte expire dans 30 jours

**Dashboard Client (Frontend):**
- Section "Ma Carte" avec informations complètes:
  - Badge statut: "Carte active" (vert) / "Expire dans X jours" (orange) / "Carte expirée" (rouge)
  - Jours restants affiché en gras
  - Dates activation/expiration
  - Barre de progression (jours utilisés / total)
  - Bouton "Renouveler" si expiré

**Synchronisation Globale:**
- Landing page: durées chargées via /api/public/card-types
- Admin Dashboard: card_validity inclus dans détails client
- Cartes disponibles: duration_days et duration_label pour chaque carte

**Tests:** 100% réussite (12/12 backend, frontend complet)

---

### March 5, 2026 - Admin Dashboard Financial & Card Enhancements ✅

**1. Commissions SDM sur Cashback (Overview):**
- Total des commissions prélevées (All Time)
- Filtrable par période (jour/semaine/mois/année)
- Intégré dans la section Financial Highlights

**2. Service Fees Analytics (Overview):**
- 4 types de services: Airtime, Data Bundles, ECG/Électricité, Paiement Marchand
- Affichage: transactions, volume, fees par service
- Top Services (par utilisation) avec barres de progression
- Graphique mensuel des fees

**3. Durée des Cartes (Settings > Card Prices):**
- Champ "Durée" ajouté pour chaque carte (Silver, Gold, Platinum)
- Options: 1 mois, 3 mois, 6 mois, 1 an, 2 ans, 3 ans
- Durées par défaut: Silver=1 an, Gold=1 an, Platinum=2 ans

**4. Création de Nouveaux Types de Cartes:**
- Interface pour créer des cartes personnalisées (ex: Diamond, Business, Student)
- Champs: Nom, Slug, Prix, Durée, Avantages, Couleur
- Carte Diamond créée: GHS 500, 2 ans, 15% cashback

**5. Synchronisation Globale:**
- Landing page affiche les durées dynamiquement via `/api/public/card-types`
- Endpoint public retourne `duration_label` formaté ("1 an", "2 ans", etc.)

**Nouveaux Endpoints API:**
- `GET /api/public/card-types` - Cartes publiques avec durées
- `GET /api/admin/settings/card-types` - Liste complète admin
- `POST /api/admin/settings/card-types` - Créer carte personnalisée
- `PUT /api/admin/settings/card-types/{id}` - Modifier carte
- `DELETE /api/admin/settings/card-types/{id}` - Supprimer carte

**Tests:** 100% réussite (16/16 backend, frontend complet)

---

### March 5, 2026 - Merchant Dashboard Phase 2 Enhancement ✅

**Statistiques Avancées par Période:**
- Sélecteur de période: Aujourd'hui, Semaine, Mois, Année
- 4 cartes de statistiques avec indicateurs de croissance (%)
- Comparaison avec période précédente

**Mini Comptabilité:**
- Total ventes depuis inscription
- Total cashback distribué
- Total transactions & clients uniques
- Breakdown par période (jour/semaine/mois/année)

**Graphiques Analytiques:**
- Graphique à barres avec Recharts
- Évolution ventes (vert) et cashback (orange)
- 3 vues: 7 jours, 4 semaines, 6 mois
- Totaux affichés sous le graphique

**Tests:** 100% réussite (16/16 backend, frontend complet)

---

### March 5, 2026 - Merchant Settings Phase 1 Enhancement ✅

**Protection PIN Optionnelle:**
- Activation/désactivation du PIN par le marchand
- Modal de saisie PIN si activé (verrouillage après 3 tentatives)
- Fonction "Forgot PIN" avec OTP (SMS ou Email)
- Réinitialisation du PIN après vérification OTP

**Gestion des Caissiers:**
- CRUD complet pour les caissiers (créer, modifier, désactiver, supprimer)
- Chaque caissier possède un code unique et un numéro de caisse
- Affichage des statistiques par caissier (transactions, volume)

**Modification Infos Commerce:**
- Édition: Nom, Type, Adresse, Ville, GPS, Google Maps URL
- Note: Téléphone non modifiable par le marchand (admin uniquement)

**Tests:** 100% réussite (26/26 backend, frontend complet)

---

## CORE FEATURES

### Membership Cards
| Card | Price | Duration | Benefits |
|------|-------|----------|----------|
| Silver | GHS 25 | 1 an | Basic access |
| Gold | GHS 50 | 1 an | + Priority support |
| Platinum | GHS 100 | 2 ans | + VIP access |
| Diamond | GHS 500 | 2 ans | + Premium features |

### Cashback
- Rate: 1% - 20% (set by merchant)
- Commission: 5% platform fee
- Credit: Instant after payment

### Referrals
- Welcome: GHS 1
- Referrer: GHS 3

---

## API ENDPOINTS

### Client Cards (`/api/clients/cards/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/available` | List available cards |
| POST | `/purchase` | Purchase new card |
| GET | `/my-card` | Get card with validity |
| GET | `/status` | Quick card status |
| POST | `/upgrade` | **NEW** Upgrade card (pay diff) |

### Payments (`/api/payments/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/card/initiate` | Start card purchase |
| POST | `/merchant/initiate` | Pay merchant |
| GET | `/status/{id}` | Check status |
| POST | `/callback` | BulkClix webhook |
| POST | `/test/confirm/{id}` | Test mode confirm |

---

## CONFIGURATION

```env
# Payment Mode
PAYMENT_TEST_MODE=true    # true=manual confirm, false=real MoMo
SMS_TEST_MODE=true        # true=log only, false=send SMS

# BulkClix
BULKCLIX_API_KEY=...
CALLBACK_BASE_URL=https://web-boost-seo.preview.emergentagent.com
```

---

## TEST CREDENTIALS

| Role | Phone/Email | Password | Status |
|------|-------------|----------|--------|
| Admin | emileparfait2003@gmail.com | Gerard0103@ | super_admin |
| Client (Active) | +233551111111 | TestPass123 | active/diamond |
| Client (Inactive) | +23354313c9801 | TestInactif123 | pending |
| Merchant | +233509876543 | MerchantPass123 | active |

---

## DATABASE COLLECTIONS

| Collection | Purpose |
|------------|---------|
| clients | Customer accounts |
| merchants | Partner businesses |
| transactions | Financial records (incl. card_upgrade) |
| momo_payments | Payment tracking |
| withdrawals | Cashback withdrawals |
| sms_logs | SMS notifications log |
| membership_cards | Active cards |
| referrals | Referral tracking |
| card_types | Custom card types |
| platform_config | Platform settings |

---

## UPCOMING TASKS

### P0 - Blocker (Production Payments)
- [ ] Get valid BulkClix MoMo Collection API key
- [ ] Current API returns 404
- [ ] User needs to provide correct endpoint or API documentation

### P1 - Next Features
- [ ] **Merchant History Page (Phase 3)** - Filterable transaction history with export
- [ ] **Refactor AdminDashboard.jsx** - Break down 3400+ lines into components
- [ ] **Admin UI for Payment Logos** - Frontend component for logo management

### P2 - Enhanced Features
- [ ] Push notifications (OneSignal/Firebase)
- [ ] Advanced SEO (sitemap.xml, robots.txt, structured data)
- [ ] Production deployment guide

### P3 - Future
- [ ] Mobile app (React Native)
- [ ] VIP Lottery system
- [ ] Super app services integration

---

## AREAS NEEDING REFACTORING

1. **AdminDashboard.jsx** (3400+ lines) - Split into:
   - AdminOverview.jsx
   - AdminClients.jsx
   - AdminMerchants.jsx
   - AdminSettings.jsx
   - AdminSMS.jsx

2. **admin.py** (2400+ lines) - Split into:
   - admin_analytics.py
   - admin_settings.py
   - admin_users.py
   - admin_sms.py

---

*Last Updated: March 5, 2026*
*Version: 2.6.0 (Client Space Enhancements)*
*Status: ✅ All Core Features Complete - Test Mode Active*
