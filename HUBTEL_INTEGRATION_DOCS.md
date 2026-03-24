# SDM REWARDS - Documentation Hubtel Integration

## 1. Sample Callbacks Received from Hubtel

### 1.1 MoMo Payment Collection - Success Callback
**Endpoint:** `POST /api/payments/hubtel/callback`

```json
{
  "ResponseCode": "0000",
  "Message": "success",
  "Data": {
    "Amount": 50.00,
    "AmountAfterCharges": 49.50,
    "Charges": 0.50,
    "TransactionId": "7294856381234567890",
    "ExternalTransactionId": "SDM-PAY-ABC12345-1234567890",
    "ClientReference": "SDM-PAY-ABC12345-1234567890",
    "Description": "Payment to Merchant XYZ",
    "CustomerPhoneNumber": "233241234567",
    "Status": "Success",
    "PaymentType": "MoMo"
  },
  "TransactionId": "7294856381234567890",
  "ClientReference": "SDM-PAY-ABC12345-1234567890"
}
```

### 1.2 MoMo Payment Collection - Failed Callback
```json
{
  "ResponseCode": "4010",
  "Message": "Transaction failed",
  "Data": {
    "Amount": 50.00,
    "TransactionId": "7294856381234567891",
    "ClientReference": "SDM-PAY-ABC12346-1234567891",
    "Status": "Failed",
    "Description": "User declined the transaction"
  },
  "TransactionId": "7294856381234567891",
  "ClientReference": "SDM-PAY-ABC12346-1234567891"
}
```

### 1.3 MoMo Payment Collection - Pending Callback
```json
{
  "ResponseCode": "0001",
  "Message": "pending",
  "Data": {
    "Amount": 100.00,
    "TransactionId": "7294856381234567892",
    "ClientReference": "SDM-PAY-DEF12347-1234567892",
    "Status": "Pending",
    "Description": "Awaiting user approval"
  }
}
```

### 1.4 Send Money (MoMo Transfer) - Success Callback
**Endpoint:** `POST /api/payments/hubtel/transfer-callback`

```json
{
  "ResponseCode": "0000",
  "Message": "success",
  "Data": {
    "Amount": 200.00,
    "AmountDebited": 200.50,
    "TransactionId": "TRF7294856381234567893",
    "ClientReference": "SDM-PAYOUT-MERCH123-1679012345",
    "RecipientNumber": "233241234567",
    "RecipientName": "John Doe",
    "RecipientNetwork": "mtn",
    "Status": "Completed"
  }
}
```

### 1.5 Send Money (MoMo Transfer) - Failed Callback (Insufficient Balance)
```json
{
  "ResponseCode": "4075",
  "Message": "Insufficient prepaid balance",
  "Data": {
    "Amount": 500.00,
    "TransactionId": "TRF7294856381234567894",
    "ClientReference": "SDM-PAYOUT-MERCH124-1679012346",
    "Status": "Failed",
    "Description": "Insufficient prepaid balance. Please top up your Hubtel prepaid account."
  }
}
```

### 1.6 Bank Transfer - Success Callback
**Endpoint:** `POST /api/payments/hubtel/bank-callback`

```json
{
  "ResponseCode": "0000",
  "Message": "Transfer successful",
  "Data": {
    "Amount": 1000.00,
    "TransactionId": "BANK7294856381234567895",
    "ClientReference": "MW-BANK-MERCH125-1679012347",
    "AccountNumber": "1234567890",
    "BankCode": "GCB",
    "AccountName": "JANE DOE",
    "Status": "Completed"
  }
}
```

### 1.7 VAS (Airtime Purchase) - Success Callback
```json
{
  "ResponseCode": "0000",
  "Message": "Airtime purchase successful",
  "Data": {
    "Amount": 10.00,
    "TransactionId": "VAS7294856381234567896",
    "ClientReference": "SDM-AIR-USER123-1679012348",
    "RecipientNumber": "233241234567",
    "Network": "mtn",
    "Status": "Completed"
  }
}
```

---

## 2. Sample Transaction Status Check Responses

### 2.1 Status Check Endpoint
**Endpoint:** `POST /api/payments/check-status/{payment_id}`

### 2.2 Successful Payment Status Response
```json
{
  "success": true,
  "payment_id": "pay_abc123456",
  "status": "completed",
  "message": "Payment confirmed! Cashback has been credited to your account.",
  "amount": 50.00,
  "merchant": "Mama's Kitchen",
  "created_at": "2026-03-21T10:30:00.000Z",
  "completed_at": "2026-03-21T10:30:45.000Z"
}
```

### 2.3 Pending Payment Status Response
```json
{
  "success": true,
  "payment_id": "pay_def456789",
  "status": "pending",
  "message": "Payment is pending. Please complete the MoMo prompt on your phone.",
  "amount": 100.00,
  "merchant": "Kofi's Store",
  "created_at": "2026-03-21T11:00:00.000Z",
  "completed_at": null
}
```

### 2.4 Failed Payment Status Response
```json
{
  "success": true,
  "payment_id": "pay_ghi789012",
  "status": "failed",
  "message": "Payment failed or was declined. Please try again.",
  "amount": 75.00,
  "merchant": "City Electronics",
  "created_at": "2026-03-21T11:30:00.000Z",
  "completed_at": null
}
```

### 2.5 Poll Status Endpoint Response (for Frontend Polling)
**Endpoint:** `GET /api/payments/poll-status/{payment_id}`

```json
{
  "success": true,
  "status": "completed",
  "should_poll": false,
  "completed": true,
  "failed": false,
  "message": "Payment successful! Cashback credited.",
  "source": "database"
}
```

### 2.6 Poll Status - Still Processing
```json
{
  "success": true,
  "status": "processing",
  "should_poll": true,
  "completed": false,
  "failed": false,
  "message": "Processing payment...",
  "source": "database"
}
```

---

## 3. App Links (Live)

### Production URLs
- **Web App:** https://sdmrewards.com
- **API Base URL:** https://sdmrewards.com/api

### Callback URLs to Configure in Hubtel Dashboard
```
Payment Collection Callback:
https://sdmrewards.com/api/payments/hubtel/callback

Send Money (Transfer) Callback:
https://sdmrewards.com/api/payments/hubtel/transfer-callback

Bank Transfer Callback:
https://sdmrewards.com/api/payments/hubtel/bank-callback
```

### Preview Environment (for Testing)
- **Web App:** https://web-boost-seo.preview.emergentagent.com
- **API Base URL:** https://web-boost-seo.preview.emergentagent.com/api

### Preview Callback URLs (for Testing)
```
Payment Collection Callback:
https://web-boost-seo.preview.emergentagent.com/api/payments/hubtel/callback

Send Money (Transfer) Callback:
https://web-boost-seo.preview.emergentagent.com/api/payments/hubtel/transfer-callback
```

---

## 4. Response Codes Reference

| ResponseCode | Meaning | Action |
|--------------|---------|--------|
| `0000` | Success | Payment completed, credit cashback |
| `0001` | Pending | Wait for user approval, continue polling |
| `2001` | Processing | Transaction in progress |
| `4010` | Transaction Failed | User declined or insufficient funds |
| `4075` | Insufficient Prepaid Balance | Top up Hubtel prepaid account |
| `4030` | Invalid Account | Check recipient number/account |
| `5001` | System Error | Retry after delay |

---

## 5. Our Callback Response Format

We acknowledge all callbacks immediately with:
```json
{
  "ResponseCode": "0000",
  "Message": "Callback received"
}
```

This ensures Hubtel does not retry the callback. We process the payment asynchronously in the background.

---

## 6. API Authentication

All API calls to Hubtel use Basic Authentication:
- **Client ID:** (Configured in HUBTEL_CLIENT_ID)
- **Client Secret:** (Configured in HUBTEL_CLIENT_SECRET)

```
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
```

---

## 7. Contact

For technical support regarding this integration:
- **App Support:** support@sdmrewards.com
- **Developer:** GIT NFT GHANA Ltd

