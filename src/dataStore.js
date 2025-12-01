import crypto from 'crypto';

/**
 * DataStore manages encrypted data storage in memory.
 * 
 * Storage Structure:
 * id -> {
 *   keyVersion: number,        // Which key version encrypted this
 *   ciphertext: string,         // Base64 encoded ciphertext
 *   iv: string,                 // Base64 encoded initialization vector
 *   tag: string,                // Base64 encoded authentication tag
 *   timestamp: Date,            // When this was encrypted
 *   metadata: Object            // Optional additional metadata
 * }
 * 
 * Security Notes:
 * - Never stores plaintext
 * - All encryption metadata preserved for decryption
 * - In-memory storage (production would use encrypted database)
 */
class DataStore {
  constructor() {
    this.storage = new Map();
    console.log('[DataStore] Initialized in-memory storage');
  }

  /**
   * Store encrypted data with metadata
   * 
   * @param {Object} encryptedData - Serialized encrypted data
   * @param {number} keyVersion - Version of key used for encryption
   * @param {Object} metadata - Optional additional metadata
   * @returns {string} Unique ID for the stored record
   */
  store(encryptedData, keyVersion, metadata = {}) {
    // Generate unique ID for this record
    const id = crypto.randomUUID();
    
    // Create storage record
    const record = {
      id,
      keyVersion,
      ciphertext: encryptedData.ciphertext,
      iv: encryptedData.iv,
      tag: encryptedData.tag,
      timestamp: new Date(),
      metadata
    };
    
    // Store in memory
    this.storage.set(id, record);
    
    console.log(`[DataStore] Stored record ${id} (key version: ${keyVersion})`);
    
    return id;
  }

  /**
   * Retrieve encrypted data by ID
   * 
   * @param {string} id - The record ID
   * @returns {Object|null} The encrypted record or null if not found
   */
  retrieve(id) {
    const record = this.storage.get(id);
    
    if (!record) {
      console.log(`[DataStore] Record ${id} not found`);
      return null;
    }
    
    console.log(`[DataStore] Retrieved record ${id} (key version: ${record.keyVersion})`);
    
    return record;
  }

  /**
   * Delete a record by ID
   * 
   * @param {string} id - The record ID
   * @returns {boolean} True if deleted, false if not found
   */
  delete(id) {
    const deleted = this.storage.delete(id);
    
    if (deleted) {
      console.log(`[DataStore] Deleted record ${id}`);
    }
    
    return deleted;
  }

  /**
   * Get all record IDs (for testing/debugging)
   */
  getAllIds() {
    return Array.from(this.storage.keys());
  }

  /**
   * Get store statistics
   */
  getStats() {
    const records = Array.from(this.storage.values());
    const versionCounts = {};
    
    records.forEach(record => {
      versionCounts[record.keyVersion] = (versionCounts[record.keyVersion] || 0) + 1;
    });
    
    return {
      totalRecords: this.storage.size,
      recordsByVersion: versionCounts,
      oldestRecord: records.length > 0 
        ? records.reduce((oldest, r) => r.timestamp < oldest.timestamp ? r : oldest).timestamp
        : null
    };
  }

  /**
   * Clear all records (for testing)
   */
  clear() {
    this.storage.clear();
    console.log('[DataStore] All records cleared');
  }
}

export default DataStore;
