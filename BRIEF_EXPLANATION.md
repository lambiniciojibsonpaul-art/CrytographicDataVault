## Why AES-256-GCM?

AES-256-GCM is used because it provides both encryption and integrity protection in one operation (AEAD). It automatically detects tampering, and it is safer than older modes like CBC because it avoids padding attacks and requires fewer steps to secure correctly.

## Why Store the IV and Authentication Tag?

-AES-GCM cannot decrypt without the IV and tag.
-The IV must be unique each time to keep encryption safe.
-The auth tag ensures the data wasn’t modified.
Both values are non-secret and safe to store together with the ciphertext.

## How Key Rotation Works

The system automatically generates a new encryption key every 60 minutes.
When a new key is created:
**The old current key becomes the previous key.**
**A fresh key becomes the current key.**
Each stored record includes the key version used to encrypt it, so the system knows exactly which key to use when decrypting.

## Why Only Two Keys Are Kept

Keeping only the current and previous key strikes a balance between security and usability. It allows recent data to remain decryptable while securely retiring older keys. This prevents unbounded key storage and models real-world security policies.

## Cryptographic Mistakes Avoided

The design intentionally avoids common security pitfalls:

**No IV reuse** — every encryption uses a fresh random IV.
**No unauthenticated encryption** — GCM provides built-in integrity.
**No hardcoded keys** — keys come from environment variables.
**No logging of sensitive data** — keys and plaintext are never logged.
**Keys stored as Buffers, not strings.**
**No deterministic or reused IVs.**
**No plaintext saved anywhere** — only encrypted data is stored.
