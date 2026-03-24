# SDM REWARDS - Documentation Intégration Hubtel

> **Document de conformité pour l'intégration avec Hubtel Payment APIs**
> Basé sur la documentation officielle Hubtel: https://developers.hubtel.com

---

## 1. Receive Money API - Callback Responses

### 1.1 Endpoint de Callback (Votre Serveur)
**URL:** `POST /api/payments/hubtel/callback`

Le callback est envoyé par Hubtel à votre serveur environ **30 secondes** après l'initiation de la transaction pour fournir le statut final.

### 1.2 Callback - Transaction Réussie (ResponseCode: 0000)
```json
{
  "ResponseCode": "0000",
  "Data": {
    "Amount": 50.00,
    "Charges": 0.50,
    "AmountAfterCharges": 49.50,
    "Description": "The MTN Mobile Money payment has been approved and processed successfully",
    "TransactionId": "7294856381234567890",
    "ClientReference": "SDM-PAY-ABC12345-1234567890",
    "ExternalTransactionId": "MP240321.1234.A00001",
    "TransactionStatus": "Success"
  }
}
```

### 1.3 Callback - Transaction en Attente (ResponseCode: 0001)
```json
{
  "ResponseCode": "0001",
  "Message": "Transaction pending. Expect callback request for final state",
  "Data": {
    "Amount": 100.00,
    "TransactionId": "7294856381234567892",
    "ClientReference": "SDM-PAY-DEF12347-1234567892",
    "TransactionStatus": "Pending",
    "Description": "Awaiting customer approval via *170#"
  }
}
```

### 1.4 Callback - Transaction Échouée
```json
{
  "ResponseCode": "4010",
  "Message": "Transaction failed",
  "Data": {
    "Amount": 50.00,
    "TransactionId": "7294856381234567891",
    "ClientReference": "SDM-PAY-ABC12346-1234567891",
    "TransactionStatus": "Failed",
    "Description": "User declined the transaction or insufficient funds"
  }
}
```

---

## 2. Send Money API - Callback Responses

### 2.1 Endpoint de Callback (Votre Serveur)
**URL:** `POST /api/payments/hubtel/transfer-callback`

### 2.2 Paramètres du Callback Send Money

| Paramètre | Type | Description |
|-----------|------|-------------|
| `ResponseCode` | String | Code de statut de la transaction |
| `Description` | String | Description du ResponseCode |
| `Amount` | Number | Montant envoyé |
| `Charges` | Number | Frais de transaction |
| `PrepaidAmountDebited` | Number | Montant débité du compte prépayé Hubtel |
| `ClientReference` | String | Référence fournie lors de la requête |
| `TransactionId` | String | Identifiant unique Hubtel |
| `ExternalTransactionId` | String | Référence du fournisseur mobile money (Telco) |

### 2.3 Callback Send Money - Succès
```json
{
  "ResponseCode": "0000",
  "Description": "Transfer successful",
  "Data": {
    "Amount": 200.00,
    "Charges": 2.00,
    "PrepaidAmountDebited": 202.00,
    "TransactionId": "TRF7294856381234567893",
    "ClientReference": "SDM-PAYOUT-MERCH123-1679012345",
    "ExternalTransactionId": "MP240321.5678.B00002",
    "RecipientNumber": "233241234567",
    "RecipientName": "JOHN DOE"
  }
}
```

### 2.4 Callback Send Money - Solde Insuffisant
```json
{
  "ResponseCode": "4075",
  "Description": "Insufficient prepaid balance",
  "Data": {
    "Amount": 500.00,
    "TransactionId": "TRF7294856381234567894",
    "ClientReference": "SDM-PAYOUT-MERCH124-1679012346",
    "Description": "Insufficient prepaid balance. Please top up your Hubtel prepaid account."
  }
}
```

---

## 3. Status Check API - Responses

### 3.1 Endpoint de Vérification de Statut
**URL Hubtel:** 
```
GET https://rmsc.hubtel.com/v1/merchantaccount/merchants/{accountNumber}/transactions/status?hubtelTransactionId={transactionId}
```

Ou avec ClientReference:
```
GET https://rmsc.hubtel.com/v1/merchantaccount/merchants/{accountNumber}/transactions/status?clientReference={clientReference}
```

### 3.2 Status Check - Transaction Réussie
```json
{
  "ResponseCode": "0000",
  "Message": "Success",
  "Data": {
    "TransactionId": "7294856381234567890",
    "ClientReference": "SDM-PAY-ABC12345-1234567890",
    "Amount": 50.00,
    "Charges": 0.50,
    "AmountAfterCharges": 49.50,
    "Description": "The Vodafone Cash payment has been approved and processed successfully",
    "TransactionStatus": "Success",
    "InvoiceStatus": "Success",
    "NetworkTransactionId": "MP240321.1234.A00001",
    "StartDate": "2024-03-21T10:30:00Z",
    "Meta": {
      "Commission": 0.0560
    }
  }
}
```

### 3.3 Status Check - Transaction en Attente
```json
{
  "ResponseCode": "0001",
  "Message": "Transaction pending. Expect callback request for final state",
  "Data": {
    "TransactionId": "7294856381234567892",
    "ClientReference": "SDM-PAY-DEF12347-1234567892",
    "Amount": 100.00,
    "TransactionStatus": "Pending",
    "Description": "Awaiting customer approval"
  }
}
```

### 3.4 Status Check - Transaction Échouée
```json
{
  "ResponseCode": "4010",
  "Message": "Transaction failed",
  "Data": {
    "TransactionId": "7294856381234567891",
    "ClientReference": "SDM-PAY-ABC12346-1234567891",
    "Amount": 75.00,
    "TransactionStatus": "Failed",
    "Description": "Transaction declined by user"
  }
}
```

---

## 4. Codes de Réponse Hubtel (Référence Officielle)

| ResponseCode | Signification | Action Requise |
|--------------|---------------|----------------|
| `0000` | Succès | Transaction complétée, créditer le cashback |
| `0001` | En attente | Attendre l'approbation client, callback à venir |
| `2001` | En cours | Transaction en traitement |
| `4010` | Échec | Déclinée par l'utilisateur ou fonds insuffisants |
| `4030` | Compte invalide | Vérifier le numéro du destinataire |
| `4075` | Solde prépayé insuffisant | Recharger le compte prépayé Hubtel |
| `5001` | Erreur système | Réessayer après un délai |

---

## 5. Notre Réponse aux Callbacks Hubtel

Nous accusons réception immédiate de tous les callbacks avec:
```json
{
  "ResponseCode": "0000",
  "Message": "Callback received and processed"
}
```

Cela évite les retentatives de Hubtel. Le traitement est effectué de manière asynchrone en arrière-plan.

---

## 6. URLs de l'Application (Production)

### URLs de Production
- **Application Web:** https://sdmrewards.com
- **URL API de Base:** https://sdmrewards.com/api

### URLs de Callback à Configurer dans Hubtel Dashboard

```
Callback Receive Money (Collection):
https://sdmrewards.com/api/payments/hubtel/callback

Callback Send Money (Transfert):
https://sdmrewards.com/api/payments/hubtel/transfer-callback

Callback Transfert Bancaire:
https://sdmrewards.com/api/payments/hubtel/bank-callback
```

### Environnement de Prévisualisation (Test)
- **Application Web:** https://web-boost-seo.preview.emergentagent.com
- **URL API de Base:** https://web-boost-seo.preview.emergentagent.com/api

---

## 7. Authentification API

Toutes les requêtes vers Hubtel utilisent l'**Authentification Basic**:

```
Authorization: Basic {base64(CLIENT_ID:CLIENT_SECRET)}
```

**Configuration requise:**
- `HUBTEL_CLIENT_ID` - Votre Client ID Hubtel
- `HUBTEL_CLIENT_SECRET` - Votre Client Secret Hubtel

---

## 8. Flux d'Intégration

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Client initie paiement sur SDM Rewards                      │
├─────────────────────────────────────────────────────────────────┤
│  2. SDM envoie POST à Hubtel Receive Money API                  │
│     → Reçoit ResponseCode 0001 (Pending)                        │
├─────────────────────────────────────────────────────────────────┤
│  3. Client approuve via *170# (MTN) ou USSD (autres réseaux)    │
├─────────────────────────────────────────────────────────────────┤
│  4. Hubtel envoie callback POST à notre endpoint                │
│     → ResponseCode 0000 = Succès                                │
│     → ResponseCode 4010 = Échec                                 │
├─────────────────────────────────────────────────────────────────┤
│  5. SDM traite le callback et crédite le cashback si succès     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Contact

Pour le support technique concernant cette intégration:
- **Support App:** support@sdmrewards.com
- **Développeur:** GIT NFT GHANA Ltd

---

**Document généré le:** Décembre 2025
**Version:** 2.0 (Conforme documentation officielle Hubtel)
