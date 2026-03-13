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
- `transaction_completed` - Triggered when any transaction is completed

---

### Webhook Payload Format

When an event occurs, SDM Rewards sends a POST request to your webhook URL:

```json
{
  "event": "points_earned",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "customer_phone": "+233551234567",
    "points": 100,
    "new_balance": 1250,
    "transaction_id": "txn_abc123def456",
    "reference": "INV-2024-001"
  }
}
```

**Headers Sent:**
| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-SDM-Event` | Event type (e.g., `points_earned`) |
| `X-SDM-Timestamp` | ISO 8601 timestamp |
| `X-SDM-Signature` | HMAC-SHA256 signature for verification |
| `X-SDM-Webhook-ID` | Your webhook ID |

---

### Webhook Signature Verification

**IMPORTANT:** Always verify webhook signatures to ensure requests are legitimate.

SDM Rewards signs each webhook payload using HMAC-SHA256 with your webhook secret.

#### How Signatures Work

1. SDM Rewards creates a signature by hashing the JSON payload with your secret
2. The signature is sent in the `X-SDM-Signature` header
3. You recreate the signature and compare it

#### Verification Examples

**Node.js:**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express middleware
app.post('/webhooks/sdm', express.json(), (req, res) => {
  const signature = req.headers['x-sdm-signature'];
  const webhookSecret = process.env.SDM_WEBHOOK_SECRET;
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }
  
  if (!verifyWebhookSignature(req.body, signature, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Signature verified - process the event
  const { event, data, timestamp } = req.body;
  
  switch (event) {
    case 'points_earned':
      console.log(`Customer ${data.customer_phone} earned ${data.points} points`);
      break;
    case 'points_redeemed':
      console.log(`Customer ${data.customer_phone} redeemed ${data.points} points`);
      break;
  }
  
  res.status(200).json({ received: true });
});
```

**Python (Flask):**
```python
import hmac
import hashlib
import json
from flask import Flask, request, jsonify

app = Flask(__name__)
WEBHOOK_SECRET = "your_webhook_secret"

def verify_signature(payload, signature):
    """Verify HMAC-SHA256 signature"""
    expected = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        json.dumps(payload, separators=(',', ':')).encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

@app.route('/webhooks/sdm', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-SDM-Signature')
    
    if not signature:
        return jsonify({"error": "Missing signature"}), 401
    
    if not verify_signature(request.json, signature):
        return jsonify({"error": "Invalid signature"}), 401
    
    # Signature verified - process the event
    event = request.json.get('event')
    data = request.json.get('data')
    
    if event == 'points_earned':
        print(f"Points earned: {data}")
    elif event == 'points_redeemed':
        print(f"Points redeemed: {data}")
    
    return jsonify({"received": True}), 200
```

**PHP:**
```php
<?php
function verifyWebhookSignature($payload, $signature, $secret) {
    $expectedSignature = hash_hmac(
        'sha256', 
        json_encode($payload, JSON_UNESCAPED_SLASHES), 
        $secret
    );
    return hash_equals($expectedSignature, $signature);
}

// Handle incoming webhook
$payload = json_decode(file_get_contents('php://input'), true);
$signature = $_SERVER['HTTP_X_SDM_SIGNATURE'] ?? '';
$secret = getenv('SDM_WEBHOOK_SECRET');

if (empty($signature)) {
    http_response_code(401);
    echo json_encode(['error' => 'Missing signature']);
    exit;
}

if (!verifyWebhookSignature($payload, $signature, $secret)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Process verified webhook
$event = $payload['event'];
$data = $payload['data'];

switch ($event) {
    case 'points_earned':
        // Handle points earned
        break;
    case 'points_redeemed':
        // Handle points redeemed
        break;
}

http_response_code(200);
echo json_encode(['received' => true]);
```

**Java:**
```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;

public class WebhookVerifier {
    
    public static boolean verifySignature(String payload, String signature, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                secret.getBytes("UTF-8"), "HmacSHA256"
            );
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(payload.getBytes("UTF-8"));
            
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            
            return MessageDigest.isEqual(
                hexString.toString().getBytes(),
                signature.getBytes()
            );
        } catch (Exception e) {
            return false;
        }
    }
}
```

#### Best Practices for Webhook Handling

1. **Always verify signatures** - Never skip verification, even in development
2. **Respond quickly** - Return 200 within 30 seconds to avoid retries
3. **Process asynchronously** - Queue long-running tasks and respond immediately
4. **Handle duplicates** - Use `transaction_id` to detect duplicate events
5. **Log everything** - Keep logs of received webhooks for debugging
6. **Secure your endpoint** - Use HTTPS only, never expose webhook secrets

#### Retry Policy

If your endpoint fails to respond with 2xx status, SDM Rewards will retry:
- **Attempt 1:** Immediate
- **Attempt 2:** After 1 minute
- **Attempt 3:** After 5 minutes

After 3 failed attempts, the webhook delivery is marked as failed.

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

## API Key Security Features

### IP Whitelisting

Restrict API key usage to specific IP addresses for enhanced security.

**Creating a key with IP whitelist:**
```bash
curl -X POST "https://web-boost-seo.emergent.host/api/integration/keys/create" \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "POS System",
    "description": "Restricted to store network",
    "allowed_ips": ["192.168.1.100", "10.0.0.50"],
    "rate_limit": 100
  }'
```

**Notes:**
- If `allowed_ips` is empty or not provided, the key works from any IP
- Requests from non-whitelisted IPs return `403 IP_NOT_ALLOWED`
- Use CIDR notation for IP ranges if needed

---

### API Key Rotation

Rotate API keys without service interruption using grace periods.

**Rotate a key:**
```bash
curl -X POST "https://web-boost-seo.emergent.host/api/integration/keys/rotate" \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key_id": "key_abc123def456",
    "grace_period_days": 7
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "API key rotated successfully. Old key valid until 2024-01-22 10:30 UTC",
  "old_key_id": "key_abc123def456",
  "new_key_id": "key_xyz789ghi012",
  "new_api_key": "sdm_live_NewApiKeyHere123456789",
  "grace_period_end": "2024-01-22T10:30:00Z",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Grace Period:**
- During the grace period, **both old and new keys work**
- Default: 7 days, Maximum: 30 days
- Update your systems to use the new key, then let the old one expire

**Extend grace period:**
```bash
curl -X POST "https://web-boost-seo.emergent.host/api/integration/keys/key_abc123def456/extend-grace?days=14" \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN"
```

**Recommended rotation workflow:**
1. Call `/keys/rotate` with desired grace period
2. Store the new API key securely
3. Update your POS/integration to use the new key
4. Test the new key
5. Let the old key expire naturally (or revoke it early)

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
