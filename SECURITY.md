# Security Documentation

## Cryptographic Design Decisions

This document explains the security reasoning behind the cryptographic data vault implementation.

---

## 1. Why AES-256-GCM?

**Decision**: Use AES-256-GCM (Galois/Counter Mode) for all encryption operations.

**Reasoning**:

### Authenticated Encryption with Associated Data (AEAD)

- **Confidentiality**: AES-256 provides strong encryption (256-bit key = 2^256 possible keys)
- **Integrity**: GCM mode produces an authentication tag that detects tampering
- **Combined operation**: Single operation provides both encryption and authentication
- **Performance**: GCM is highly efficient, especially with hardware acceleration

### Why NOT other modes?

| Mode        | Why Avoided                                                            |
| ----------- | ---------------------------------------------------------------------- |
| **AES-CBC** | No built-in integrity protection; vulnerable to padding oracle attacks |
| **AES-CTR** | No authentication; attacker can flip bits without detection            |
| **AES-ECB** | Deterministic; identical plaintexts produce identical ciphertexts      |

### GCM Authentication Benefits

```
Encryption:  Plaintext + Key + IV → Ciphertext + Tag
Decryption:  Ciphertext + Key + IV + Tag → Plaintext OR error

If ANY of the following are modified:
- Ciphertext
- IV
- Authentication Tag
- Wrong key used

Result: Decryption fails immediately
```

**Conclusion**: AES-256-GCM is the industry standard for authenticated encryption and prevents both confidentiality and integrity attacks.

---

## 2. Why Store IV and Authentication Tag?

**Decision**: Store IV (12 bytes) and authentication tag (16 bytes) alongside ciphertext.

**Reasoning**:

### Initialization Vector (IV) Requirements

- **Must be unique** for each encryption under the same key
- **Must be unpredictable** (cryptographically random)
- **Not secret**: Safe to store in plaintext with ciphertext
- **Required for decryption**: Decryption algorithm needs the exact IV used during encryption

### Authentication Tag Requirements

- **Proves integrity**: Verifies data hasn't been tampered with
- **Binds to ciphertext**: Tag mathematically linked to both ciphertext and key
- **Required for decryption**: GCM mode requires tag to verify before decrypting
- **Not secret**: Safe to store, but cannot be computed without the key

### Storage Structure

```javascript
{
  ciphertext: "base64...",  // The encrypted data
  iv: "base64...",          // 12 bytes, unique per encryption
  tag: "base64..."          // 16 bytes, proves integrity
}
```

**What happens if we don't store them?**

- No IV → Cannot decrypt (wrong IV produces garbage)
- No tag → Cannot verify integrity (vulnerable to tampering)

---

## 3. How Key Rotation Works

**Decision**: Rotate keys every 60 minutes, keeping only current (N) and previous (N-1) versions.

**Reasoning**:

### Key Rotation Benefits

1. **Limits exposure**: If a key is compromised, only data from that rotation window is at risk
2. **Reduces attack surface**: Less time for attackers to exploit a single key
3. **Cryptographic hygiene**: Industry best practice for long-running systems
4. **Key retirement**: Forces migration away from potentially weakened keys

### Rotation Process

```
Time T=0:   Current=v1, Previous=null
            Store data with v1

Time T=60:  Rotation!
            Current=v2, Previous=v1
            New data uses v2
            Old data (v1) still readable

Time T=120: Rotation!
            Current=v3, Previous=v2
            New data uses v3
            v2 data readable
            v1 data NO LONGER READABLE (by design)
```

### Why Only Two Keys?

**Security Policy**: Balance between availability and security.

| Approach                    | Pros                                                                                 | Cons                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **Keep all keys forever**   | All data always readable                                                             | Unbounded key storage; compromised old key affects all historical data |
| **Keep only current key**   | Minimal storage                                                                      | Data unreadable immediately after rotation                             |
| **Keep current + previous** | ✓ Reasonable availability window<br>✓ Bounded key storage<br>✓ Forces data migration | Requires application awareness                                         |

**Decision rationale**:

- 2-hour decryption window (current + previous) is sufficient for most operational scenarios
- Forces applications to re-encrypt old data if long-term storage needed
- Prevents indefinite accumulation of cryptographic risk

---

## 4. Why Only Current and Previous Keys?

**Decision**: Support decryption only for data encrypted with current or previous key version.

**Reasoning**:

### Secure Key Retirement

- **Time-bound risk**: Limits how long a compromised key remains useful
- **Forced migration**: Applications must re-encrypt or migrate old data
- **No infinite history**: Prevents unbounded growth of key material

### Real-World Analogy

Think of password rotation policies:

- Current password: Active, can be used
- Previous password: Grace period for in-flight operations
- Older passwords: Rejected (security policy)

### Implementation

```javascript
function getKeyByVersion(version) {
  if (version === currentVersion) return currentKey;
  if (version === previousVersion) return previousKey;
  return null; // Too old - security policy enforced
}
```

### Operational Impact

- Data encrypted at T+0 remains readable until T+120
- After T+120, application should:
  - Re-encrypt if data still needed
  - Accept data loss (intended for ephemeral data)
  - Archive to separate long-term storage

---

## 5. Cryptographic Mistakes Avoided

### ❌ Mistake 1: IV Reuse

**Why dangerous**: Reusing an IV with the same key leaks information about plaintext.

**How we avoid it**:

```javascript
// EVERY encryption generates fresh random IV
const iv = crypto.randomBytes(12);
```

### ❌ Mistake 2: No Authentication

**Why dangerous**: Without authentication, attackers can modify ciphertext undetected.

**How we avoid it**: Using AES-GCM (AEAD mode) which includes authentication tag.

### ❌ Mistake 3: Hardcoded Keys

**Why dangerous**: Keys in source code can be extracted from version control, logs, binaries.

**How we avoid it**:

```javascript
// Keys loaded from environment variables only
const masterKey = process.env.MASTER_ENCRYPTION_KEY;
```

### ❌ Mistake 4: Logging Sensitive Data

**Why dangerous**: Keys or plaintext in logs can be exposed through log aggregation, backups.

**How we avoid it**:

```javascript
// Never log keys or plaintext
console.log("[Encryption] Operation completed"); // ✓ Safe
// console.log('Key:', key); // ❌ NEVER DO THIS
```

### ❌ Mistake 5: Storing Keys as Strings

**Why dangerous**: Strings are immutable in JavaScript, harder to zero out from memory.

**How we avoid it**:

```javascript
// Keys stored as Buffers (TypedArrays)
this.currentKey = Buffer.from(keyData);

// Can be zeroed on cleanup
this.currentKey.fill(0);
```

### ❌ Mistake 6: Deterministic IVs

**Why dangerous**: Predictable IVs (like counters) can leak information.

**How we avoid it**:

```javascript
// Cryptographically random IVs
const iv = crypto.randomBytes(12); // Not derived or counted
```

### ❌ Mistake 7: Storing Plaintext

**Why dangerous**: Defeats the purpose of encryption.

**How we avoid it**:

- Encrypt immediately upon receipt
- Store only ciphertext + metadata
- Decrypt only when needed for response
- Never persist plaintext to disk or logs

---

## 6. Security Best Practices Implemented

### ✅ Defense in Depth

- AEAD mode (confidentiality + integrity)
- Key versioning (rotation + retirement)
- Environment-based secrets (no hardcoding)
- Minimal key history (only 2 versions)

### ✅ Cryptographic Hygiene

- Unique IVs per operation
- Cryptographically random generation
- Proper key derivation (HKDF)
- Buffer-based key storage

### ✅ Operational Security

- No sensitive logging
- Graceful key rotation
- Clear error messages (without leaking details)
- Memory cleanup on shutdown

### ✅ Compliance Ready

- Follows NIST guidelines for AES-GCM
- Key rotation aligns with OWASP recommendations
- Suitable foundation for PCI-DSS, HIPAA compliance

---

## 7. Known Limitations (By Design)

### This is NOT Production-Ready

This implementation is for **educational and assessment purposes**. Production systems need:

1. **Secure Key Storage**: Use HSM, KMS (AWS KMS, Azure Key Vault, GCP Cloud KMS)
2. **Persistent Storage**: Encrypted database, not in-memory Map
3. **Key Backup**: Encrypted key backups for disaster recovery
4. **Audit Logging**: Tamper-proof logs of all cryptographic operations
5. **Rate Limiting**: Prevent brute-force attacks
6. **Monitoring**: Detect anomalies in encryption/decryption patterns
7. **Key Ceremony**: Proper key generation and distribution procedures

### Threat Model

This implementation protects against:

- ✅ Eavesdropping on stored data
- ✅ Tampering with encrypted data
- ✅ Long-term key exposure (via rotation)

This implementation does NOT protect against:

- ❌ Memory dumps of running process (keys in RAM)
- ❌ Side-channel attacks (timing, power analysis)
- ❌ Compromised system (attacker with root access)
- ❌ Social engineering attacks

---

## 8. Verification Scenarios

### ✅ Scenario 1: Immediate Decryption (T+0)

```
Encrypt at: Time T, Key version 1
Decrypt at: Time T, Key version 1
Result: SUCCESS (same key)
```

### ✅ Scenario 2: After One Rotation (T+65)

```
Encrypt at: Time T, Key version 1
Rotation:   T+60, Key version 2 (previous=1)
Decrypt at: T+65, Key version 2 (current)
Result: SUCCESS (previous key still available)
```

### ❌ Scenario 3: After Two Rotations (T+125)

```
Encrypt at: Time T, Key version 1
Rotation:   T+60, Key version 2 (previous=1)
Rotation:   T+120, Key version 3 (previous=2)
Decrypt at: T+125, Key version 3 (current)
Result: FAILURE (version 1 no longer supported)
Error: "Key version 1 is no longer supported. Current: 3, Previous: 2"
```

---

## Conclusion

This implementation demonstrates **secure cryptographic thinking** by:

1. Choosing the right algorithm (AES-256-GCM for AEAD)
2. Proper IV and tag management (unique, random, stored)
3. Thoughtful key rotation (automatic, time-based, limited history)
4. Secure coding practices (no logging, Buffer storage, environment secrets)
5. Clear security boundaries (intentional limitations, explicit threat model)

The goal is not production-level cryptography, but rather to show **understanding of cryptographic principles** and **security-conscious design**.
