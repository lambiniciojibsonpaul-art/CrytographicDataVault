# Cryptographic Data Vault with Key Rotation

A secure Node.js service that encrypts, stores, retrieves, and decrypts JSON payloads using AES-256-GCM with automatic key rotation.

## Features

- **Strong Authenticated Encryption**: AES-256-GCM with unique IVs per operation
- **Automatic Key Rotation**: Keys rotate every 60 minutes (configurable)
- **Key Versioning**: Supports current and previous key for decryption
- **Secure Key Management**: Keys from environment variables, stored as Buffers
- **REST API**: Simple endpoints for storing and retrieving encrypted data

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file from template:

```bash
copy .env.example .env
```

3. Generate a secure master key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Update `.env` with your generated key

## Running

Start the server:

```bash
npm start
```

Run tests:

```bash
npm test
```

## API Endpoints

### POST /api/vault/store

Encrypts and stores JSON payload.

**Request:**

```json
{
  "data": {
    "username": "alice",
    "email": "alice@example.com"
  }
}
```

**Response:**

```json
{
  "id": "uuid-here",
  "keyVersion": 1,
  "timestamp": "2025-12-02T10:00:00.000Z"
}
```

### GET /api/vault/retrieve?id=<id>

Retrieves and decrypts data by ID.

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

## Security Features

See SECURITY.md for detailed explanation of cryptographic practices and design decisions.
