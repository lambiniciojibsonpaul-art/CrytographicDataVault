# QUICK START GUIDE

## Overview

This cryptographic data vault demonstrates secure encryption with automatic key rotation using AES-256-GCM.

---

## Step-by-Step Setup

### Step 1: Install Dependencies

```powershell
npm install
```

This installs:

- `express` - Web server for API endpoints
- `dotenv` - Environment variable management

### Step 2: Generate Secure Master Key

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This generates a 256-bit (32 bytes) random key. Copy the output.

### Step 3: Create Environment File

```powershell
copy .env.example .env
```

### Step 4: Configure Environment

Edit `.env` and replace the example key with your generated key:

```env
MASTER_ENCRYPTION_KEY=<your-generated-key-here>
PORT=3000
KEY_ROTATION_INTERVAL=3600000
```

**Important**:

- `KEY_ROTATION_INTERVAL` is in milliseconds
- Default: 3600000 ms = 60 minutes
- For testing, use shorter intervals (e.g., 60000 = 1 minute)

---

## Running the Application

### Start the Server

```powershell
npm start
```

You should see:

```
============================================================
🔐 Cryptographic Data Vault Server Started
============================================================
Server running on http://localhost:3000
Key rotation interval: 60 minutes
...
```

### Run Test Suite

```powershell
npm test
```

This runs comprehensive tests demonstrating:

- Basic encryption/decryption
- Key rotation behavior
- Time-based decryption scenarios
- Security validations

---

## Using the API

### 1. Store Encrypted Data

**Request:**

```powershell
curl -X POST http://localhost:3000/api/vault/store `
  -H "Content-Type: application/json" `
  -d '{"data":{"username":"alice","email":"alice@example.com"}}'
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "keyVersion": 1,
  "timestamp": "2025-12-02T10:00:00.000Z"
}
```

### 2. Retrieve Decrypted Data

**Request:**

```powershell
curl "http://localhost:3000/api/vault/retrieve?id=550e8400-e29b-41d4-a716-446655440000"
```

**Response:**

```json
{
  "data": {
    "username": "alice",
    "email": "alice@example.com"
  },
  "metadata": {
    "keyVersion": 1,
    "encryptedAt": "2025-12-02T10:00:00.000Z"
  }
}
```

### 3. Get Vault Statistics

**Request:**

```powershell
curl http://localhost:3000/api/vault/stats
```

**Response:**

```json
{
  "keyInfo": {
    "currentVersion": 2,
    "previousVersion": 1,
    "lastRotationTime": "2025-12-02T11:00:00.000Z",
    "nextRotationTime": "2025-12-02T12:00:00.000Z"
  },
  "storeStats": {
    "totalRecords": 5,
    "recordsByVersion": {
      "1": 3,
      "2": 2
    }
  }
}
```

### 4. Manual Key Rotation (Testing)

**Request:**

```powershell
curl -X POST http://localhost:3000/api/vault/rotate
```

**Response:**

```json
{
  "message": "Key rotation completed",
  "keyInfo": {
    "currentVersion": 3,
    "previousVersion": 2,
    ...
  }
}
```

---

## Testing Key Rotation Behavior

### Test 1: Data Survives One Rotation ✅

1. Store data at Time T:

```powershell
$result = curl -X POST http://localhost:3000/api/vault/store `
  -H "Content-Type: application/json" `
  -d '{"data":{"test":"value"}}' | ConvertFrom-Json
$id = $result.id
```

2. Wait 65 minutes (or trigger rotation manually)

```powershell
curl -X POST http://localhost:3000/api/vault/rotate
```

3. Retrieve data (should work):

```powershell
curl "http://localhost:3000/api/vault/retrieve?id=$id"
```

**Expected**: ✅ Success (decrypted with previous key)

### Test 2: Data Fails After Two Rotations ❌

1. Store data
2. Rotate twice:

```powershell
curl -X POST http://localhost:3000/api/vault/rotate
curl -X POST http://localhost:3000/api/vault/rotate
```

3. Try to retrieve (should fail):

```powershell
curl "http://localhost:3000/api/vault/retrieve?id=$id"
```

**Expected**: ❌ Error "Key version no longer supported"

---

## Understanding the Output

### Server Logs

```
[KeyManager] Initialized with version 1
[DataStore] Stored record abc-123 (key version: 1)
[KeyManager] Starting key rotation from version 1 to 2
[KeyManager] Key rotation completed. Current: 2, Previous: 1
[DataStore] Retrieved record abc-123 (key version: 1)
```

### Test Suite Output

```
🧪 CRYPTOGRAPHIC DATA VAULT - COMPREHENSIVE TEST SUITE
========================================

TEST 1: Basic Encryption and Decryption
✅ TEST 1 PASSED: Basic operations work correctly

TEST 2: Single Key Rotation
✅ TEST 2 PASSED: Data decrypted after one rotation

TEST 3: Multiple Key Rotations
✅ TEST 3 PASSED: Old keys correctly rejected

...
```

---

## Troubleshooting

### Error: "MASTER_ENCRYPTION_KEY not set"

**Solution**: Create `.env` file with valid key (see Step 2-4)

### Error: "Master key must be 64 hex characters"

**Solution**: Key must be exactly 32 bytes = 64 hexadecimal characters
Generate new key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Error: "Record not found"

**Solution**: Check the ID from store response, ensure it's correct

### Error: "Key version no longer supported"

**Solution**: This is expected behavior after 2+ rotations (security policy)

---

## Next Steps

1. ✅ Run the test suite: `npm test`
2. ✅ Start the server: `npm start`
3. ✅ Try the API endpoints
4. ✅ Read `SECURITY.md` for design decisions
5. ✅ Experiment with different rotation intervals

---

## Key Concepts Demonstrated

✅ **AES-256-GCM**: Authenticated encryption with integrity protection  
✅ **Unique IVs**: Fresh random IV for every encryption  
✅ **Key Rotation**: Automatic time-based key lifecycle  
✅ **Version Tracking**: Support for current + previous key only  
✅ **Secure Practices**: Buffer storage, environment secrets, no logging  
✅ **Time-based Policy**: 2-hour decryption window (configurable)

---
