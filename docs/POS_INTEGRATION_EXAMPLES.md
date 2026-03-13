# SDM Rewards - POS Integration Examples

This guide provides ready-to-use integration examples for popular POS systems.

---

## Table of Contents

1. [Square POS](#square-pos)
2. [Clover POS](#clover-pos)
3. [Shopify POS](#shopify-pos)
4. [WooCommerce](#woocommerce)
5. [Generic REST Integration](#generic-rest)
6. [Mobile App Integration](#mobile-app)
7. [Webhook Handling](#webhook-handling)

---

## Square POS

### Node.js Integration

```javascript
// square-sdm-integration.js
const crypto = require('crypto');

class SDMRewardsSquareIntegration {
  constructor(apiKey, merchantId) {
    this.apiKey = apiKey;
    this.merchantId = merchantId;
    this.baseUrl = 'https://web-boost-seo.emergent.host/api/integration';
  }

  async awardPointsOnPayment(squarePayment) {
    const customerPhone = squarePayment.buyer_email_address 
      ? await this.lookupPhoneByEmail(squarePayment.buyer_email_address)
      : squarePayment.note; // Store phone in note field
    
    if (!customerPhone) {
      console.log('No customer phone found for loyalty points');
      return null;
    }

    // Calculate points (1 point per GHS spent)
    const amountInGHS = squarePayment.amount_money.amount / 100;
    const points = Math.floor(amountInGHS);

    try {
      const response = await fetch(`${this.baseUrl}/points/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'X-Merchant-ID': this.merchantId
        },
        body: JSON.stringify({
          customer_phone: customerPhone,
          points: points,
          transaction_amount: amountInGHS,
          reference: squarePayment.id,
          description: `Square payment at ${squarePayment.location_id}`
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`Awarded ${points} points to ${customerPhone}`);
        return result;
      } else {
        console.error('Failed to award points:', result);
        return null;
      }
    } catch (error) {
      console.error('SDM Rewards API error:', error);
      return null;
    }
  }

  async checkCustomerBalance(phone) {
    const response = await fetch(
      `${this.baseUrl}/customer/balance?phone=${encodeURIComponent(phone)}`,
      {
        headers: {
          'X-API-Key': this.apiKey,
          'X-Merchant-ID': this.merchantId
        }
      }
    );
    return response.json();
  }

  async redeemPoints(phone, points, reference) {
    const response = await fetch(`${this.baseUrl}/points/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'X-Merchant-ID': this.merchantId
      },
      body: JSON.stringify({
        customer_phone: phone,
        points: points,
        reference: reference,
        description: 'Square POS redemption'
      })
    });
    return response.json();
  }
}

// Usage with Square Webhooks
const express = require('express');
const app = express();

const sdm = new SDMRewardsSquareIntegration(
  process.env.SDM_API_KEY,
  process.env.SDM_MERCHANT_ID
);

app.post('/square-webhook', express.json(), async (req, res) => {
  const event = req.body;
  
  if (event.type === 'payment.completed') {
    const payment = event.data.object.payment;
    await sdm.awardPointsOnPayment(payment);
  }
  
  res.status(200).send('OK');
});

module.exports = SDMRewardsSquareIntegration;
```

---

## Clover POS

### Java Integration

```java
// SDMRewardsCloverIntegration.java
package com.sdmrewards.clover;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

public class SDMRewardsCloverIntegration {
    private final String apiKey;
    private final String merchantId;
    private final String baseUrl = "https://web-boost-seo.emergent.host/api/integration";
    private final HttpClient httpClient;
    private final Gson gson;

    public SDMRewardsCloverIntegration(String apiKey, String merchantId) {
        this.apiKey = apiKey;
        this.merchantId = merchantId;
        this.httpClient = HttpClient.newHttpClient();
        this.gson = new Gson();
    }

    public JsonObject awardPoints(String customerPhone, int points, 
                                   double transactionAmount, String reference) {
        try {
            JsonObject body = new JsonObject();
            body.addProperty("customer_phone", customerPhone);
            body.addProperty("points", points);
            body.addProperty("transaction_amount", transactionAmount);
            body.addProperty("reference", reference);
            body.addProperty("description", "Clover POS purchase");

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/points/award"))
                .header("Content-Type", "application/json")
                .header("X-API-Key", apiKey)
                .header("X-Merchant-ID", merchantId)
                .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(body)))
                .build();

            HttpResponse<String> response = httpClient.send(request, 
                HttpResponse.BodyHandlers.ofString());
            
            return gson.fromJson(response.body(), JsonObject.class);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public JsonObject getCustomerBalance(String phone) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/customer/balance?phone=" + 
                    java.net.URLEncoder.encode(phone, "UTF-8")))
                .header("X-API-Key", apiKey)
                .header("X-Merchant-ID", merchantId)
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(request, 
                HttpResponse.BodyHandlers.ofString());
            
            return gson.fromJson(response.body(), JsonObject.class);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public JsonObject redeemPoints(String customerPhone, int points, String reference) {
        try {
            JsonObject body = new JsonObject();
            body.addProperty("customer_phone", customerPhone);
            body.addProperty("points", points);
            body.addProperty("reference", reference);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/points/redeem"))
                .header("Content-Type", "application/json")
                .header("X-API-Key", apiKey)
                .header("X-Merchant-ID", merchantId)
                .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(body)))
                .build();

            HttpResponse<String> response = httpClient.send(request, 
                HttpResponse.BodyHandlers.ofString());
            
            return gson.fromJson(response.body(), JsonObject.class);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}

// Usage in Clover App
public class CloverPaymentListener implements PaymentConnector.OnPaymentListener {
    private final SDMRewardsCloverIntegration sdm;

    public CloverPaymentListener() {
        sdm = new SDMRewardsCloverIntegration(
            BuildConfig.SDM_API_KEY,
            BuildConfig.SDM_MERCHANT_ID
        );
    }

    @Override
    public void onPaymentSuccess(Payment payment) {
        String customerPhone = payment.getExternalPaymentId(); // Store phone here
        if (customerPhone != null && !customerPhone.isEmpty()) {
            int points = (int) (payment.getAmount() / 100); // 1 point per GHS
            sdm.awardPoints(customerPhone, points, payment.getAmount() / 100.0, 
                payment.getId());
        }
    }
}
```

---

## Shopify POS

### Shopify Flow / Custom App Integration

```javascript
// shopify-sdm-integration.js
const Shopify = require('@shopify/shopify-api');

class SDMRewardsShopify {
  constructor(apiKey, merchantId) {
    this.apiKey = apiKey;
    this.merchantId = merchantId;
    this.baseUrl = 'https://web-boost-seo.emergent.host/api/integration';
  }

  async handleOrderPaid(order) {
    // Get customer phone from order
    const phone = order.customer?.phone || 
                  order.billing_address?.phone ||
                  order.shipping_address?.phone;
    
    if (!phone) {
      console.log('No phone number found for order:', order.id);
      return;
    }

    // Calculate points (1 point per GHS)
    const totalInGHS = parseFloat(order.total_price);
    const points = Math.floor(totalInGHS);

    try {
      const response = await fetch(`${this.baseUrl}/points/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'X-Merchant-ID': this.merchantId
        },
        body: JSON.stringify({
          customer_phone: this.normalizePhone(phone),
          points: points,
          transaction_amount: totalInGHS,
          reference: `SHOPIFY-${order.id}`,
          description: `Shopify Order #${order.order_number}`
        })
      });

      const result = await response.json();
      console.log('SDM Rewards result:', result);
      
      // Add note to order
      if (result.success) {
        await this.addOrderNote(order.id, 
          `Awarded ${points} SDM Rewards points. New balance: ${result.new_balance}`);
      }
      
      return result;
    } catch (error) {
      console.error('SDM Rewards error:', error);
    }
  }

  normalizePhone(phone) {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '+233' + cleaned.slice(1);
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+233' + cleaned;
    }
    return cleaned;
  }

  async addOrderNote(orderId, note) {
    // Add note via Shopify Admin API
    // Implementation depends on your Shopify app setup
  }
}

// Webhook handler for Shopify
const express = require('express');
const app = express();

const sdm = new SDMRewardsShopify(
  process.env.SDM_API_KEY,
  process.env.SDM_MERCHANT_ID
);

app.post('/shopify/orders/paid', express.json(), async (req, res) => {
  const order = req.body;
  await sdm.handleOrderPaid(order);
  res.status(200).send('OK');
});

module.exports = SDMRewardsShopify;
```

---

## WooCommerce

### PHP Plugin Integration

```php
<?php
/**
 * Plugin Name: SDM Rewards for WooCommerce
 * Description: Integrate SDM Rewards loyalty program with WooCommerce
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

class SDM_Rewards_WooCommerce {
    private $api_key;
    private $merchant_id;
    private $base_url = 'https://web-boost-seo.emergent.host/api/integration';

    public function __construct() {
        $this->api_key = get_option('sdm_rewards_api_key');
        $this->merchant_id = get_option('sdm_rewards_merchant_id');
        
        // Hook into order completion
        add_action('woocommerce_order_status_completed', [$this, 'award_points_on_order']);
        add_action('woocommerce_order_status_processing', [$this, 'award_points_on_order']);
        
        // Admin settings
        add_action('admin_menu', [$this, 'add_admin_menu']);
    }

    public function award_points_on_order($order_id) {
        $order = wc_get_order($order_id);
        
        // Check if points already awarded
        if ($order->get_meta('_sdm_points_awarded')) {
            return;
        }

        $phone = $order->get_billing_phone();
        if (empty($phone)) {
            return;
        }

        // Calculate points (1 point per GHS)
        $total = floatval($order->get_total());
        $points = floor($total);

        $result = $this->api_request('/points/award', [
            'customer_phone' => $this->normalize_phone($phone),
            'points' => $points,
            'transaction_amount' => $total,
            'reference' => 'WOO-' . $order_id,
            'description' => 'WooCommerce Order #' . $order->get_order_number()
        ]);

        if ($result && isset($result['success']) && $result['success']) {
            $order->update_meta_data('_sdm_points_awarded', $points);
            $order->update_meta_data('_sdm_new_balance', $result['new_balance']);
            $order->add_order_note(sprintf(
                'SDM Rewards: Awarded %d points. New balance: %d',
                $points,
                $result['new_balance']
            ));
            $order->save();
        }
    }

    public function get_customer_balance($phone) {
        return $this->api_request('/customer/balance?phone=' . urlencode($phone), null, 'GET');
    }

    public function redeem_points($phone, $points, $reference) {
        return $this->api_request('/points/redeem', [
            'customer_phone' => $this->normalize_phone($phone),
            'points' => $points,
            'reference' => $reference
        ]);
    }

    private function api_request($endpoint, $data = null, $method = 'POST') {
        $url = $this->base_url . $endpoint;
        
        $args = [
            'headers' => [
                'Content-Type' => 'application/json',
                'X-API-Key' => $this->api_key,
                'X-Merchant-ID' => $this->merchant_id
            ],
            'timeout' => 30
        ];

        if ($method === 'POST' && $data) {
            $args['body'] = json_encode($data);
            $response = wp_remote_post($url, $args);
        } else {
            $response = wp_remote_get($url, $args);
        }

        if (is_wp_error($response)) {
            error_log('SDM Rewards API Error: ' . $response->get_error_message());
            return null;
        }

        return json_decode(wp_remote_retrieve_body($response), true);
    }

    private function normalize_phone($phone) {
        $phone = preg_replace('/[\s\-\(\)]/', '', $phone);
        if (strpos($phone, '0') === 0) {
            $phone = '+233' . substr($phone, 1);
        } elseif (strpos($phone, '+') !== 0) {
            $phone = '+233' . $phone;
        }
        return $phone;
    }

    public function add_admin_menu() {
        add_options_page(
            'SDM Rewards Settings',
            'SDM Rewards',
            'manage_options',
            'sdm-rewards',
            [$this, 'settings_page']
        );
    }

    public function settings_page() {
        if (isset($_POST['sdm_save_settings'])) {
            update_option('sdm_rewards_api_key', sanitize_text_field($_POST['api_key']));
            update_option('sdm_rewards_merchant_id', sanitize_text_field($_POST['merchant_id']));
            echo '<div class="updated"><p>Settings saved!</p></div>';
        }
        ?>
        <div class="wrap">
            <h1>SDM Rewards Settings</h1>
            <form method="post">
                <table class="form-table">
                    <tr>
                        <th>API Key</th>
                        <td>
                            <input type="text" name="api_key" 
                                   value="<?php echo esc_attr(get_option('sdm_rewards_api_key')); ?>" 
                                   class="regular-text">
                        </td>
                    </tr>
                    <tr>
                        <th>Merchant ID</th>
                        <td>
                            <input type="text" name="merchant_id" 
                                   value="<?php echo esc_attr(get_option('sdm_rewards_merchant_id')); ?>" 
                                   class="regular-text">
                        </td>
                    </tr>
                </table>
                <p class="submit">
                    <input type="submit" name="sdm_save_settings" 
                           class="button-primary" value="Save Settings">
                </p>
            </form>
        </div>
        <?php
    }
}

new SDM_Rewards_WooCommerce();
```

---

## Generic REST Integration

### Python

```python
# sdm_rewards.py
import requests
import hashlib
import hmac
from typing import Optional, Dict, Any

class SDMRewardsClient:
    """SDM Rewards API Client for Python applications"""
    
    def __init__(self, api_key: str, merchant_id: str):
        self.api_key = api_key
        self.merchant_id = merchant_id
        self.base_url = "https://web-boost-seo.emergent.host/api/integration"
        self.session = requests.Session()
        self.session.headers.update({
            "X-API-Key": api_key,
            "X-Merchant-ID": merchant_id,
            "Content-Type": "application/json"
        })
    
    def award_points(
        self,
        customer_phone: str,
        points: int,
        transaction_amount: Optional[float] = None,
        reference: Optional[str] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Award points to a customer"""
        payload = {
            "customer_phone": self._normalize_phone(customer_phone),
            "points": points
        }
        if transaction_amount:
            payload["transaction_amount"] = transaction_amount
        if reference:
            payload["reference"] = reference
        if description:
            payload["description"] = description
            
        response = self.session.post(f"{self.base_url}/points/award", json=payload)
        return response.json()
    
    def redeem_points(
        self,
        customer_phone: str,
        points: int,
        reference: Optional[str] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Redeem points from a customer"""
        payload = {
            "customer_phone": self._normalize_phone(customer_phone),
            "points": points
        }
        if reference:
            payload["reference"] = reference
        if description:
            payload["description"] = description
            
        response = self.session.post(f"{self.base_url}/points/redeem", json=payload)
        return response.json()
    
    def get_balance(self, customer_phone: str) -> Dict[str, Any]:
        """Get customer's current balance"""
        phone = self._normalize_phone(customer_phone)
        response = self.session.get(f"{self.base_url}/customer/balance", 
                                    params={"phone": phone})
        return response.json()
    
    def get_transactions(
        self,
        customer_phone: str,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get customer's transaction history"""
        phone = self._normalize_phone(customer_phone)
        response = self.session.get(
            f"{self.base_url}/customer/transactions",
            params={"phone": phone, "limit": limit, "offset": offset}
        )
        return response.json()
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone to +233 format"""
        phone = phone.replace(" ", "").replace("-", "")
        if phone.startswith("0"):
            return "+233" + phone[1:]
        elif not phone.startswith("+"):
            return "+233" + phone
        return phone


# Usage Example
if __name__ == "__main__":
    client = SDMRewardsClient(
        api_key="sdm_live_your_api_key",
        merchant_id="your_merchant_id"
    )
    
    # Check balance
    balance = client.get_balance("+233551234567")
    print(f"Current balance: {balance['customer']['current_points']} points")
    
    # Award points
    result = client.award_points(
        customer_phone="+233551234567",
        points=100,
        transaction_amount=50.0,
        reference="ORDER-12345"
    )
    print(f"Awarded points. New balance: {result['new_balance']}")
```

### cURL Examples

```bash
#!/bin/bash
# sdm-rewards-cli.sh

SDM_API_KEY="sdm_live_your_api_key"
SDM_MERCHANT_ID="your_merchant_id"
SDM_BASE_URL="https://web-boost-seo.emergent.host/api/integration"

# Check customer balance
check_balance() {
    curl -s -X GET "$SDM_BASE_URL/customer/balance?phone=$1" \
        -H "X-API-Key: $SDM_API_KEY" \
        -H "X-Merchant-ID: $SDM_MERCHANT_ID"
}

# Award points
award_points() {
    curl -s -X POST "$SDM_BASE_URL/points/award" \
        -H "X-API-Key: $SDM_API_KEY" \
        -H "X-Merchant-ID: $SDM_MERCHANT_ID" \
        -H "Content-Type: application/json" \
        -d "{
            \"customer_phone\": \"$1\",
            \"points\": $2,
            \"reference\": \"$3\"
        }"
}

# Redeem points
redeem_points() {
    curl -s -X POST "$SDM_BASE_URL/points/redeem" \
        -H "X-API-Key: $SDM_API_KEY" \
        -H "X-Merchant-ID: $SDM_MERCHANT_ID" \
        -H "Content-Type: application/json" \
        -d "{
            \"customer_phone\": \"$1\",
            \"points\": $2,
            \"reference\": \"$3\"
        }"
}

# Usage:
# ./sdm-rewards-cli.sh balance +233551234567
# ./sdm-rewards-cli.sh award +233551234567 100 "ORDER-123"
# ./sdm-rewards-cli.sh redeem +233551234567 50 "REDEEM-123"

case "$1" in
    balance) check_balance "$2" ;;
    award) award_points "$2" "$3" "$4" ;;
    redeem) redeem_points "$2" "$3" "$4" ;;
    *) echo "Usage: $0 {balance|award|redeem} [args...]" ;;
esac
```

---

## Mobile App Integration

### React Native

```javascript
// sdm-rewards-sdk.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class SDMRewardsSDK {
  constructor(apiKey, merchantId) {
    this.apiKey = apiKey;
    this.merchantId = merchantId;
    this.baseUrl = 'https://web-boost-seo.emergent.host/api/integration';
  }

  async request(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'X-Merchant-ID': this.merchantId,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      return await response.json();
    } catch (error) {
      console.error('SDM API Error:', error);
      throw error;
    }
  }

  async awardPoints(customerPhone, points, transactionAmount, reference) {
    return this.request('/points/award', 'POST', {
      customer_phone: customerPhone,
      points,
      transaction_amount: transactionAmount,
      reference,
    });
  }

  async redeemPoints(customerPhone, points, reference) {
    return this.request('/points/redeem', 'POST', {
      customer_phone: customerPhone,
      points,
      reference,
    });
  }

  async getBalance(customerPhone) {
    return this.request(`/customer/balance?phone=${encodeURIComponent(customerPhone)}`);
  }

  async getTransactions(customerPhone, limit = 20) {
    return this.request(
      `/customer/transactions?phone=${encodeURIComponent(customerPhone)}&limit=${limit}`
    );
  }
}

export default SDMRewardsSDK;
```

---

## Webhook Handling

### Node.js Webhook Receiver

```javascript
// webhook-handler.js
const crypto = require('crypto');
const express = require('express');

class SDMWebhookHandler {
  constructor(webhookSecret) {
    this.secret = webhookSecret;
  }

  verifySignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  createMiddleware() {
    return (req, res, next) => {
      const signature = req.headers['x-sdm-signature'];
      
      if (!signature) {
        return res.status(401).json({ error: 'Missing signature' });
      }

      if (!this.verifySignature(req.body, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      next();
    };
  }
}

// Usage
const app = express();
const webhookHandler = new SDMWebhookHandler(process.env.SDM_WEBHOOK_SECRET);

app.post('/webhooks/sdm', 
  express.json(),
  webhookHandler.createMiddleware(),
  (req, res) => {
    const { event, data, timestamp } = req.body;

    switch (event) {
      case 'points_earned':
        console.log(`Customer ${data.customer_phone} earned ${data.points} points`);
        // Update your local records, send notification, etc.
        break;
        
      case 'points_redeemed':
        console.log(`Customer ${data.customer_phone} redeemed ${data.points} points`);
        // Process redemption in your system
        break;
        
      case 'customer_registered':
        console.log(`New customer registered: ${data.customer_phone}`);
        // Welcome email, sync to CRM, etc.
        break;
    }

    res.status(200).json({ received: true });
  }
);

module.exports = SDMWebhookHandler;
```

### Python Webhook Receiver (Flask)

```python
# webhook_receiver.py
import hmac
import hashlib
from flask import Flask, request, jsonify

app = Flask(__name__)
WEBHOOK_SECRET = "your_webhook_secret"

def verify_signature(payload, signature):
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

@app.route('/webhooks/sdm', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-SDM-Signature')
    
    if not signature:
        return jsonify({"error": "Missing signature"}), 401
    
    if not verify_signature(request.data, signature):
        return jsonify({"error": "Invalid signature"}), 401
    
    data = request.json
    event = data.get('event')
    payload = data.get('data')
    
    if event == 'points_earned':
        print(f"Points earned: {payload}")
        # Handle points earned
        
    elif event == 'points_redeemed':
        print(f"Points redeemed: {payload}")
        # Handle points redeemed
        
    elif event == 'customer_registered':
        print(f"New customer: {payload}")
        # Handle new customer
    
    return jsonify({"received": True}), 200

if __name__ == '__main__':
    app.run(port=5000)
```

---

## Support

For integration support:
- Documentation: https://sdmrewards.com/api-docs
- Email: developers@sdmrewards.com
- Swagger UI: https://web-boost-seo.emergent.host/docs
