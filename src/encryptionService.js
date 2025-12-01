import crypto from 'crypto';

/**
 * EncryptionService provides AES-256-GCM encryption and decryption.
 * 
 * Security Features:
 * - AES-256-GCM: Authenticated Encryption with Associated Data (AEAD)
 * - Unique IV per encryption (12 bytes, cryptographically random)
 * - Authentication tag for integrity verification (16 bytes)
 * - No IV reuse under the same key
 * - Proper handling of encryption metadata (IV + tag + ciphertext)
 * 
 * Why AES-256-GCM?
 * - Provides both confidentiality (encryption) AND integrity (authentication)
 * - Detects tampering or wrong key during decryption
 * - Industry standard for authenticated encryption
 * - Faster than encrypt-then-MAC approaches
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.ivLength = 12; // 96 bits (recommended for GCM)
    this.tagLength = 16; // 128 bits (default auth tag size)
  }

  /**
   * Encrypt a JSON payload using AES-256-GCM
   * 
   * @param {Object} data - The data to encrypt
   * @param {Buffer} key - The encryption key (32 bytes for AES-256)
   * @returns {Object} Encrypted data with metadata
   * {
   *   ciphertext: Buffer,
   *   iv: Buffer,
   *   tag: Buffer
   * }
   */
  encrypt(data, key) {
    try {
      // Generate a unique random IV for this encryption
      // CRITICAL: Never reuse an IV with the same key
      const iv = crypto.randomBytes(this.ivLength);
      
      // Convert data to JSON string, then to Buffer
      const plaintext = JSON.stringify(data);
      const plaintextBuffer = Buffer.from(plaintext, 'utf8');
      
      // Create cipher with the key and IV
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // Encrypt the data
      const ciphertext = Buffer.concat([
        cipher.update(plaintextBuffer),
        cipher.final()
      ]);
      
      // Get the authentication tag (GCM produces this automatically)
      // This tag authenticates both the ciphertext and any additional data
      const tag = cipher.getAuthTag();
      
      // Return all components needed for decryption
      // All stored as Buffers to avoid encoding issues
      return {
        ciphertext,
        iv,
        tag
      };
    } catch (error) {
      // Never log the actual data or key
      console.error('[EncryptionService] Encryption failed:', error.message);
      throw new Error('Encryption operation failed');
    }
  }

  /**
   * Decrypt data encrypted with AES-256-GCM
   * 
   * @param {Buffer} ciphertext - The encrypted data
   * @param {Buffer} iv - The initialization vector used during encryption
   * @param {Buffer} tag - The authentication tag from encryption
   * @param {Buffer} key - The decryption key (must match encryption key)
   * @returns {Object} The original decrypted data
   * @throws {Error} If decryption fails (wrong key, tampered data, or invalid tag)
   */
  decrypt(ciphertext, iv, tag, key) {
    try {
      // Create decipher with the key and IV
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      
      // Set the authentication tag
      // If the tag doesn't match, decryption will fail (integrity check)
      decipher.setAuthTag(tag);
      
      // Decrypt the data
      const plaintextBuffer = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final() // This will throw if authentication fails
      ]);
      
      // Convert Buffer back to string and parse JSON
      const plaintext = plaintextBuffer.toString('utf8');
      const data = JSON.parse(plaintext);
      
      return data;
    } catch (error) {
      // Decryption failures can indicate:
      // - Wrong key
      // - Tampered data
      // - Corrupted ciphertext
      // - Invalid authentication tag
      console.error('[EncryptionService] Decryption failed:', error.message);
      
      if (error.message.includes('Unsupported state or unable to authenticate data')) {
        throw new Error('Decryption failed: Invalid key or tampered data');
      }
      
      throw new Error('Decryption operation failed');
    }
  }

  /**
   * Serialize encrypted data for storage
   * Converts Buffers to base64 for JSON storage
   * 
   * @param {Object} encryptedData - The result from encrypt()
   * @returns {Object} Serialized version suitable for JSON storage
   */
  serialize(encryptedData) {
    return {
      ciphertext: encryptedData.ciphertext.toString('base64'),
      iv: encryptedData.iv.toString('base64'),
      tag: encryptedData.tag.toString('base64')
    };
  }

  /**
   * Deserialize encrypted data from storage
   * Converts base64 strings back to Buffers
   * 
   * @param {Object} serializedData - Serialized encrypted data
   * @returns {Object} Deserialized version with Buffers
   */
  deserialize(serializedData) {
    return {
      ciphertext: Buffer.from(serializedData.ciphertext, 'base64'),
      iv: Buffer.from(serializedData.iv, 'base64'),
      tag: Buffer.from(serializedData.tag, 'base64')
    };
  }
}

export default EncryptionService;
