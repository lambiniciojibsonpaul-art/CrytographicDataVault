import crypto from 'crypto';

/**
 * KeyManager handles encryption key lifecycle with automatic rotation.
 * 
 * Security Features:
 * - Maintains only current and previous key (N and N-1)
 * - Keys stored as Buffer objects (TypedArrays)
 * - Automatic rotation every 60 minutes (configurable)
 * - Version tracking for key identification
 * - Keys derived from master key using HKDF for key separation
 */
class KeyManager {
  constructor(masterKey, rotationIntervalMs = 60 * 60 * 1000) {
    if (!masterKey || masterKey.length !== 64) {
      throw new Error('Master key must be 64 hex characters (32 bytes)');
    }

    // Store master key as Buffer (never log this)
    this.masterKeyBuffer = Buffer.from(masterKey, 'hex');
    this.rotationIntervalMs = rotationIntervalMs;
    
    // Key versioning
    this.currentVersion = 1;
    this.previousVersion = null;
    
    // Key storage as Buffers
    this.currentKey = null;
    this.previousKey = null;
    
    // Rotation tracking
    this.rotationTimer = null;
    this.lastRotationTime = null;
    
    // Initialize first key
    this._generateInitialKey();
    
    // Start automatic rotation
    this._startRotation();
    
    console.log(`[KeyManager] Initialized with version ${this.currentVersion}`);
    console.log(`[KeyManager] Rotation scheduled every ${rotationIntervalMs / 1000 / 60} minutes`);
  }

  /**
   * Generate initial key from master key using HKDF
   * HKDF ensures key separation and proper key derivation
   */
  _generateInitialKey() {
    const salt = crypto.randomBytes(32);
    const info = Buffer.from(`vault-key-v${this.currentVersion}`);
    
    this.currentKey = crypto.hkdfSync(
      'sha256',
      this.masterKeyBuffer,
      salt,
      info,
      32 // AES-256 requires 32 bytes
    );
    
    this.lastRotationTime = new Date();
  }

  /**
   * Start automatic key rotation timer
   */
  _startRotation() {
    this.rotationTimer = setInterval(() => {
      this.rotateKey();
    }, this.rotationIntervalMs);
  }

  /**
   * Perform key rotation:
   * 1. Move current key to previous
   * 2. Generate new current key
   * 3. Increment version
   * 4. Discard any older keys
   */
  rotateKey() {
    console.log(`[KeyManager] Starting key rotation from version ${this.currentVersion} to ${this.currentVersion + 1}`);
    
    // Move current to previous (this discards the old previous key)
    this.previousKey = this.currentKey;
    this.previousVersion = this.currentVersion;
    
    // Increment version
    this.currentVersion++;
    
    // Generate new current key
    const salt = crypto.randomBytes(32);
    const info = Buffer.from(`vault-key-v${this.currentVersion}`);
    
    this.currentKey = crypto.hkdfSync(
      'sha256',
      this.masterKeyBuffer,
      salt,
      info,
      32
    );
    
    this.lastRotationTime = new Date();
    
    console.log(`[KeyManager] Key rotation completed. Current version: ${this.currentVersion}, Previous version: ${this.previousVersion}`);
  }

  /**
   * Get the current encryption key and its version
   * Used when encrypting new data
   */
  getCurrentKey() {
    return {
      key: this.currentKey,
      version: this.currentVersion
    };
  }

  /**
   * Get key by version for decryption
   * Only supports current and previous key versions
   * 
   * @param {number} version - The key version to retrieve
   * @returns {Buffer|null} The key buffer or null if unsupported
   */
  getKeyByVersion(version) {
    if (version === this.currentVersion) {
      return this.currentKey;
    }
    
    if (version === this.previousVersion && this.previousKey) {
      return this.previousKey;
    }
    
    // Key version too old or invalid
    return null;
  }

  /**
   * Check if a key version is supported for decryption
   */
  isVersionSupported(version) {
    return version === this.currentVersion || 
           (version === this.previousVersion && this.previousKey !== null);
  }

  /**
   * Get information about current key state (for monitoring/testing)
   * NEVER include actual key material in output
   */
  getKeyInfo() {
    return {
      currentVersion: this.currentVersion,
      previousVersion: this.previousVersion,
      lastRotationTime: this.lastRotationTime,
      nextRotationTime: new Date(this.lastRotationTime.getTime() + this.rotationIntervalMs)
    };
  }

  /**
   * Manual rotation trigger (for testing)
   */
  forceRotation() {
    this.rotateKey();
  }

  /**
   * Cleanup - stop rotation timer
   */
  destroy() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
    
    // Zero out keys in memory (best effort)
    if (this.currentKey && Buffer.isBuffer(this.currentKey)) {
      this.currentKey.fill(0);
    }
    if (this.previousKey && Buffer.isBuffer(this.previousKey)) {
      this.previousKey.fill(0);
    }
    if (this.masterKeyBuffer && Buffer.isBuffer(this.masterKeyBuffer)) {
      this.masterKeyBuffer.fill(0);
    }
    
    console.log('[KeyManager] Destroyed and keys cleared from memory');
  }
}

export default KeyManager;
