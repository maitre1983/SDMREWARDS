# SDM Rewards - Integration API Documentation

## Overview

The SDM Rewards Integration API allows Point of Sale (POS) systems and third-party applications to integrate with the SDM Rewards loyalty platform. This enables merchants to automatically award and redeem points for their customers.

**Base URL:** `https://web-boost-seo.emergent.host/api/integration`

**API Version:** 1.0.0

---

## Authentication

The API supports two authentication methods:

### 1. API Key Authentication (Recommended for POS)

Every request must include these headers:
- `X-API-Key`: Your API key (starts with `sdm_live_`)
- `X-Merchant-ID`: Your merchant ID

```bash
curl -X GET "https://web-boost-seo.emergent.host/api/integration/customer/balance?phone=+233551234567" \
  -H "X-API-Key: sdm_live_your_api_key_here" \
  -H "X-Merchant-ID: your_merchant_id"
```

### 2. OAuth 2.0 (For Web Applications)

Use the standard OAuth 2.0 flow with merchant credentials.

---

## Getting Started

### Step 1: Create an API Key

Log into your merchant dashboard and navigate to **Settings → API Keys**, or use the API:

```bash
curl -X POST "https://web-boost-seo.emergent.host/api/integration/keys/create" \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main POS System",
    "description": "API key for store POS"
  }'
```

**Response:**
```json
{
  "key_id": "key_abc123def456",
  "name": "Main POS System",
  "api_key": "sdm_live_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456",
  "created_at": "2024-01-15T10:30:00Z",
  "is_active": true
}
```

⚠️ **Important:** The `api_key` is only shown once. Store it securely!

---

## Endpoints

### Points Operations

#### Award Points to Customer

Award loyalty points when a customer makes a purchase.

**Endpoint:** `POST /points/award`

**Request:**
```json
{
  "customer_phone": "+233551234567",
  "points": 100,
  "transaction_amount": 50.00,
  "reference": "INV-2024-001",
  "description": "Purchase at Main Branch"
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "txn_abc123def456gh",
  "customer_phone": "+233551234567",
  "points_awarded": 100,
  "new_balance": 1250,
  "timestamp": "2024-01-15T10:30:00Z",
  "reference": "INV-2024-001"
}
```

**cURL Example:**
```bash
curl -X POST "https://web-boost-seo.emergent.host/api/integration/points/award" \
  -H "X-API-Key: sdm_live_your_api_key" \
  -H "X-Merchant-ID: your_merchant_id" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_phone": "+233551234567",
    "points": 100,
    "transaction_amount": 50.00,
    "reference": "INV-2024-001"
  }'
```

---

#### Redeem Points

Redeem points from a customer's account for discounts or rewards.

**Endpoint:** `POST /points/redeem`

**Request:**
```json
{
  "customer_phone": "+233551234567",
  "points": 50,
  "reference": "REDEEM-001",
  "description": "Discount on purchase"
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "txn_xyz789abc123",
  "customer_phone": "+233551234567",
  "points_redeemed": 50,
  "new_balance": 1200,
  "timestamp": "2024-01-15T11:00:00Z",
  "reference": "REDEEM-001"
}
```

**cURL Example:**
```bash
curl -X POST "https://web-boost-seo.emergent.host/api/integration/points/redeem" \
  -H "X-API-Key: sdm_live_your_api_key" \
  -H "X-Merchant-ID: your_merchant_id" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_phone": "+233551234567",
    "points": 50
  }'
```

---

### Customer Information

#### Get Customer Balance

Check a customer's current points balance.

**Endpoint:** `GET /customer/balance?phone={phone_number}`

**Response:**
```json
{
  "success": true,
  "customer": {
    "phone": "+233551234567",
    "full_name": "John Doe",
    "current_points": 1200,
    "lifetime_points": 5000,
    "tier": "Gold",
    "member_since": "2023-06-15T00:00:00Z",
    "status": "active"
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://web-boost-seo.emergent.host/api/integration/customer/balance?phone=+233551234567" \
  -H "X-API-Key: sdm_live_your_api_key" \
  -H "X-Merchant-ID: your_merchant_id"
```

---

#### Get Transaction History

Retrieve a customer's transaction history.

**Endpoint:** `GET /customer/transactions?phone={phone}&limit={limit}&offset={offset}`

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| phone | string | required | Customer phone number |
| limit | integer | 20 | Number of transactions (1-100) |
| offset | integer | 0 | Pagination offset |

**Response:**
```json
{
  "success": true,
  "customer_phone": "+233551234567",
  "transactions": [
    {
      "id": "txn_abc123",
      "type": "earn",
      "points": 100,
      "balance_after": 1200,
      "created_at": "2024-01-15T10:30:00Z",
      "description": "Purchase at Main Branch"
    },
    {
      "id": "txn_def456",
      "type": "redeem",
      "points": -50,
      "balance_after": 1100,
      "created_at": "2024-01-14T15:00:00Z",
      "description": "Discount redemption"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

### Webhooks

Register webhooks to receive real-time notifications about events.

#### Register Webhook

**Endpoint:** `POST /webhooks/register`

**Request:**
```json
{
  "url": "https://your-system.com/webhooks/sdm",
  "events": ["points_earned", "points_redeemed"],
  "secret": "your_webhook_secret"
}
```

**Response:**
```json
{
  "success": true,
  "webhook_id": "wh_abc123def456",
  "url": "https://your-system.com/webhooks/sdm",
  "events": ["points_earned", "points_redeemed"],
  "secret": "your_webhook_secret"
}
```

**Available Events:**
- `points_earned` - Triggered when a customer earns points
- `points_redeemed` - Triggered when a customer redeems points
- `customer_registered` - Triggered when a new customer registers

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": true,
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is invalid or inactive |
| `API_KEY_EXPIRED` | 401 | API key has expired |
| `IP_NOT_ALLOWED` | 403 | Request from unauthorized IP |
| `CUSTOMER_NOT_FOUND` | 404 | Customer not registered |
| `INSUFFICIENT_POINTS` | 400 | Not enough points to redeem |
| `MERCHANT_NOT_FOUND` | 404 | Merchant account not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## Phone Number Format

Phone numbers can be provided in multiple formats. They will be normalized to the international format:

| Input | Normalized |
|-------|------------|
| `0551234567` | `+233551234567` |
| `233551234567` | `+233551234567` |
| `+233551234567` | `+233551234567` |
| `055 123 4567` | `+233551234567` |

---

## Rate Limits

- Default: 100 requests per minute per API key
- Custom limits can be configured when creating an API key

---

## POS Integration Examples

### Square POS

```javascript
// After a successful payment
const response = await fetch('https://web-boost-seo.emergent.host/api/integration/points/award', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.SDM_API_KEY,
    'X-Merchant-ID': process.env.SDM_MERCHANT_ID,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customer_phone: customerPhone,
    points: Math.floor(transactionTotal),  // 1 point per GHS
    transaction_amount: transactionTotal,
    reference: squarePaymentId
  })
});
```

### Clover POS

```java
// Java integration example
HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://web-boost-seo.emergent.host/api/integration/points/award"))
    .header("X-API-Key", apiKey)
    .header("X-Merchant-ID", merchantId)
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(
        "{\"customer_phone\":\"+233551234567\",\"points\":100}"
    ))
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
```

### Generic REST Integration

```python
import requests

def award_points(customer_phone, points, transaction_amount=None, reference=None):
    response = requests.post(
        'https://web-boost-seo.emergent.host/api/integration/points/award',
        headers={
            'X-API-Key': 'sdm_live_your_api_key',
            'X-Merchant-ID': 'your_merchant_id',
            'Content-Type': 'application/json'
        },
        json={
            'customer_phone': customer_phone,
            'points': points,
            'transaction_amount': transaction_amount,
            'reference': reference
        }
    )
    return response.json()

# Usage
result = award_points('+233551234567', 100, transaction_amount=50.0, reference='INV-001')
print(f"Points awarded! New balance: {result['new_balance']}")
```

---

## Support

For technical support, contact:
- Email: support@sdmrewards.com
- Documentation: https://sdmrewards.com/api-docs

---

## Changelog

### Version 1.0.0 (2024-03-12)
- Initial release
- Points award and redemption endpoints
- Customer balance and transaction history
- API key management
- Webhook support
