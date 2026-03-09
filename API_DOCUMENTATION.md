# SDM REWARDS - Documentation API

## Base URL

```
Production: https://sdmrewards.com/api
Development: http://localhost:8001/api
```

## Authentification

L'API utilise JWT (JSON Web Tokens) pour l'authentification. Incluez le token dans le header :

```
Authorization: Bearer <token>
```

---

## Endpoints Publics (Sans Authentification)

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "SDM REWARDS API",
  "version": "2.0.0",
  "timestamp": "2026-03-09T12:00:00Z"
}
```

---

### Liste des Types de Cartes

```http
GET /api/public/card-types
```

**Response:**
```json
{
  "card_types": [
    {
      "slug": "silver",
      "name": "Silver Card",
      "price": 25,
      "duration_days": 365,
      "welcome_bonus": 1,
      "cashback_rate": 5,
      "benefits": ["Access to SDM cashback network", "..."]
    }
  ],
  "platform_info": {
    "referral_bonus": 3,
    "min_withdrawal": 5
  }
}
```

---

### Liste des Marchands

```http
GET /api/public/merchants
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| city | string | Filtrer par ville |
| search | string | Recherche par nom |
| page | int | Page (défaut: 1) |
| limit | int | Limite (défaut: 50) |

**Response:**
```json
{
  "merchants": [
    {
      "id": "merchant_123",
      "business_name": "Shop ABC",
      "business_type": "Retail",
      "city": "Accra",
      "phone": "+233555123456",
      "cashback_rate": 5,
      "google_maps_url": "https://maps.google.com/..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_count": 150,
    "total_pages": 3
  }
}
```

---

### Liste des Banques

```http
GET /api/public/banks
```

**Response:**
```json
{
  "success": true,
  "banks": [
    {"code": "GCB", "name": "GCB Bank"},
    {"code": "ECOBANK", "name": "Ecobank Ghana"}
  ]
}
```

---

## Authentification

### Envoyer OTP (Client)

```http
POST /api/auth/client/send-otp
```

**Body:**
```json
{
  "phone": "0555123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

---

### Vérifier OTP & Login (Client)

```http
POST /api/auth/client/verify-otp
```

**Body:**
```json
{
  "phone": "0555123456",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "client_123",
    "phone": "0555123456",
    "full_name": "John Doe",
    "cashback_balance": 125.50,
    "card_type": "gold",
    "card_status": "active"
  }
}
```

---

### Inscription Client

```http
POST /api/auth/client/register
```

**Body:**
```json
{
  "phone": "0555123456",
  "password": "secure123",
  "full_name": "John Doe",
  "email": "john@example.com",
  "card_type": "silver",
  "referral_code": "REF123",
  "payment_method": "momo",
  "momo_network": "MTN"
}
```

---

### Login Client (Mot de passe)

```http
POST /api/auth/client/login
```

**Body:**
```json
{
  "phone": "0555123456",
  "password": "secure123"
}
```

---

### Réinitialisation Mot de Passe

```http
POST /api/auth/client/reset-password
```

**Body:**
```json
{
  "phone": "0555123456",
  "otp": "123456",
  "new_password": "newsecure123"
}
```

---

## Endpoints Marchands

### Inscription Marchand

```http
POST /api/auth/merchant/register
```

**Body:**
```json
{
  "phone": "0555123456",
  "password": "secure123",
  "business_name": "My Shop",
  "business_type": "Retail",
  "city": "Accra",
  "business_address": "123 Main Street",
  "momo_network": "MTN",
  "momo_number": "0555123456"
}
```

---

### Login Marchand

```http
POST /api/auth/merchant/login
```

**Body:**
```json
{
  "phone": "0555123456",
  "password": "secure123"
}
```

---

### Dashboard Marchand

```http
GET /api/merchants/dashboard
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "merchant": {
    "id": "merchant_123",
    "business_name": "My Shop",
    "cashback_rate": 5,
    "qr_code": "MYSHOP001",
    "status": "active"
  },
  "stats": {
    "total_sales": 15000,
    "total_transactions": 150,
    "total_cashback_paid": 750,
    "today_sales": 500
  }
}
```

---

### Historique Transactions Marchand

```http
GET /api/merchants/transactions
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | int | Page |
| limit | int | Limite |
| start_date | string | Date début (YYYY-MM-DD) |
| end_date | string | Date fin |

---

### Mettre à jour Paramètres Marchand

```http
PUT /api/merchants/settings
```

**Body:**
```json
{
  "cashback_rate": 7,
  "business_address": "456 New Street",
  "momo_network": "Telecel",
  "momo_number": "0555999888"
}
```

---

## Endpoints Clients

### Dashboard Client

```http
GET /api/clients/dashboard
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "client": {
    "id": "client_123",
    "full_name": "John Doe",
    "phone": "0555123456",
    "cashback_balance": 125.50,
    "card_type": "gold",
    "card_status": "active",
    "card_expires_at": "2027-03-09T00:00:00Z",
    "referral_code": "JOHN123"
  },
  "stats": {
    "total_spent": 5000,
    "total_cashback_earned": 250,
    "total_referrals": 5,
    "referral_bonus_earned": 15
  },
  "recent_transactions": []
}
```

---

### Historique Transactions Client

```http
GET /api/clients/transactions
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | int | Page |
| limit | int | Limite |
| type | string | Type: payment, cashback, withdrawal, referral |

---

### Achat/Upgrade Carte

```http
POST /api/clients/cards/purchase
```

**Body:**
```json
{
  "card_type": "gold",
  "payment_method": "momo",
  "momo_phone": "0555123456",
  "momo_network": "MTN",
  "use_cashback": false,
  "cashback_amount": 0
}
```

**Response:**
```json
{
  "success": true,
  "payment_id": "PAY_123456",
  "status": "pending",
  "amount": 50,
  "message": "Approve the MoMo prompt on your phone"
}
```

---

### Vérifier Statut Paiement

```http
GET /api/payments/status/{payment_id}
```

---

### Liste des Parrainages

```http
GET /api/clients/referrals
```

**Response:**
```json
{
  "referral_code": "JOHN123",
  "referral_link": "https://sdmrewards.com/register?ref=JOHN123",
  "total_referrals": 5,
  "total_bonus_earned": 15,
  "referrals": [
    {
      "name": "Jane Doe",
      "phone": "055****456",
      "joined_at": "2026-03-01T10:00:00Z",
      "bonus_earned": 3
    }
  ]
}
```

---

## Paiements

### Payer un Marchand

```http
POST /api/payments/merchant
```

**Body:**
```json
{
  "merchant_id": "merchant_123",
  "amount": 100,
  "momo_phone": "0555123456",
  "momo_network": "MTN"
}
```

**Response:**
```json
{
  "success": true,
  "payment_id": "PAY_789",
  "status": "pending",
  "amount": 100,
  "cashback_preview": 4.75,
  "message": "Approve the MoMo prompt"
}
```

---

### Retrait Cashback

```http
POST /api/payments/withdraw
```

**Body:**
```json
{
  "amount": 50,
  "method": "momo",
  "momo_phone": "0555123456",
  "momo_network": "MTN"
}
```

---

## Services

### Achat Airtime

```http
POST /api/services/airtime/purchase
```

**Body:**
```json
{
  "phone": "0555123456",
  "network": "MTN",
  "amount": 10
}
```

---

### Liste des Forfaits Data

```http
GET /api/services/data-bundles/{network}
```

**Networks:** MTN, Telecel, AirtelTigo

---

### Achat Data Bundle

```http
POST /api/services/data-bundles/purchase
```

**Body:**
```json
{
  "phone": "0555123456",
  "network": "MTN",
  "bundle_code": "MTN_1GB_7D",
  "amount": 10
}
```

---

## Admin

### Login Admin

```http
POST /api/admin/login
```

**Body:**
```json
{
  "email": "admin@sdmrewards.com",
  "password": "adminpass"
}
```

---

### Dashboard Admin

```http
GET /api/admin/dashboard
```

**Headers:** `Authorization: Bearer <admin_token>`

---

### Liste des Clients

```http
GET /api/admin/clients
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | int | Page |
| limit | int | Limite |
| search | string | Recherche |
| status | string | Statut: active, inactive |

---

### Réinitialiser Mot de Passe Client

```http
POST /api/admin/clients/{client_id}/reset-password
```

**Body:**
```json
{
  "new_password": "newpassword123"
}
```

---

### Liste des Marchands

```http
GET /api/admin/merchants
```

---

### Réinitialiser Mot de Passe Marchand

```http
POST /api/admin/merchants/{merchant_id}/reset-password
```

**Body:**
```json
{
  "new_password": "newpassword123"
}
```

---

### Envoyer SMS en Masse

```http
POST /api/admin/sms/bulk
```

**Body:**
```json
{
  "recipients": "all_clients",
  "message": "Special offer! Get 10% extra cashback today."
}
```

---

## Codes d'Erreur

| Code | Description |
|------|-------------|
| 200 | Succès |
| 201 | Créé |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Accès refusé |
| 404 | Non trouvé |
| 422 | Erreur de validation |
| 500 | Erreur serveur |

---

## Rate Limiting

- **Standard:** 100 requêtes/minute
- **OTP:** 5 requêtes/minute par numéro
- **Paiements:** 10 requêtes/minute par utilisateur

---

## Webhooks BulkClix

### Callback Paiement

```http
POST /api/payments/callback
```

Configuré dans le dashboard BulkClix.

---

## Environnement de Test

En mode test (`PAYMENT_TEST_MODE=true`):
- OTP de test: `123456`
- Les paiements ne sont pas réellement traités
- Confirmez les paiements avec `POST /api/payments/test-confirm/{payment_id}`

---

## Support

Pour toute question technique:
- Email: tech@sdmrewards.com
- Documentation: https://docs.sdmrewards.com
