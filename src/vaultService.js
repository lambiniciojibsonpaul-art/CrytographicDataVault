import KeyManager from './keyManager.js';
import EncryptionService from './encryptionService.js';
import DataStore from './dataStore.js';

/**
 * VaultService orchestrates encryption, storage, and key management.
 * This is the core business logic that ties everything together.
 */
class VaultService {
  constructor(masterKey, rotationIntervalMs) {
    this.keyManager = new KeyManager(masterKey, rotationIntervalMs);
    this.encryptionService = new EncryptionService();
    this.dataStore = new DataStore();
    
    console.log('[VaultService] Initialized');
  }

  /**
   * Encrypt and store a JSON payload
   * 
   * @param {Object} data - The JSON data to encrypt and store
   * @returns {Object} Storage result with ID and metadata
   */
  store(data) {
    try {
      // Get current encryption key and version
      const { key, version } = this.keyManager.getCurrentKey();
      
      // Encrypt the data
      const encryptedData = this.encryptionService.encrypt(data, key);
      
      // Serialize for storage
      const serialized = this.encryptionService.serialize(encryptedData);
      
      // Store in data store
      const id = this.dataStore.store(serialized, version);
      
      return {
        id,
        keyVersion: version,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('[VaultService] Store operation failed:', error.message);
      throw new Error('Failed to store data');
    }
  }

  /**
   * Retrieve and decrypt data by ID
   * 
   * @param {string} id - The record ID
   * @returns {Object} Decrypted data with metadata
   * @throws {Error} If record not found or decryption fails
   */
  retrieve(id) {
    try {
      // Retrieve encrypted record
      const record = this.dataStore.retrieve(id);
      
      if (!record) {
        throw new Error('Record not found');
      }
      
      // Check if key version is still supported
      if (!this.keyManager.isVersionSupported(record.keyVersion)) {
        throw new Error(
          `Key version ${record.keyVersion} is no longer supported. ` +
          `Current: ${this.keyManager.getCurrentKey().version}, ` +
          `Previous: ${this.keyManager.getKeyInfo().previousVersion}`
        );
      }
      
      // Get the appropriate key for this version
      const key = this.keyManager.getKeyByVersion(record.keyVersion);
      
      if (!key) {
        throw new Error('Decryption key not available');
      }
      
      // Deserialize encrypted data
      const encryptedData = this.encryptionService.deserialize({
        ciphertext: record.ciphertext,
        iv: record.iv,
        tag: record.tag
      });
      
      // Decrypt the data
      const decryptedData = this.encryptionService.decrypt(
        encryptedData.ciphertext,
        encryptedData.iv,
        encryptedData.tag,
        key
      );
      
      return {
        data: decryptedData,
        metadata: {
          keyVersion: record.keyVersion,
          encryptedAt: record.timestamp
        }
      };
    } catch (error) {
      console.error('[VaultService] Retrieve operation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get vault statistics (for monitoring)
   */
  getStats() {
    return {
      keyInfo: this.keyManager.getKeyInfo(),
      storeStats: this.dataStore.getStats()
    };
  }

  /**
   * Force key rotation (for testing)
   */
  forceRotation() {
    this.keyManager.forceRotation();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.keyManager.destroy();
    this.dataStore.clear();
    console.log('[VaultService] Destroyed');
  }
}

export default VaultService;
