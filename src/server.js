import express from 'express';
import dotenv from 'dotenv';
import VaultService from './vaultService.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.MASTER_ENCRYPTION_KEY) {
  console.error('ERROR: MASTER_ENCRYPTION_KEY not set in environment');
  console.error('Generate a key using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
const ROTATION_INTERVAL = parseInt(process.env.KEY_ROTATION_INTERVAL || '3600000', 10);

// Initialize vault service
const vaultService = new VaultService(
  process.env.MASTER_ENCRYPTION_KEY,
  ROTATION_INTERVAL
);

// Create Express app
const app = express();
app.use(express.json());

/**
 * POST /api/vault/store
 * 
 * Encrypts and stores a JSON payload
 * 
 * Request body:
 * {
 *   "data": { ...any JSON object... }
 * }
 * 
 * Response:
 * {
 *   "id": "uuid",
 *   "keyVersion": 1,
 *   "timestamp": "ISO date"
 * }
 */
app.post('/api/vault/store', (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({
        error: 'Missing required field: data'
      });
    }
    
    const result = vaultService.store(data);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('[API] Store error:', error.message);
    res.status(500).json({
      error: 'Failed to store data',
      message: error.message
    });
  }
});

/**
 * GET /api/vault/retrieve?id=<uuid>
 * 
 * Retrieves and decrypts data by ID
 * 
 * Response:
 * {
 *   "data": { ...original JSON object... },
 *   "metadata": {
 *     "keyVersion": 1,
 *     "encryptedAt": "ISO date"
 *   }
 * }
 */
app.get('/api/vault/retrieve', (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({
        error: 'Missing required query parameter: id'
      });
    }
    
    const result = vaultService.retrieve(id);
    
    res.json(result);
  } catch (error) {
    console.error('[API] Retrieve error:', error.message);
    
    if (error.message === 'Record not found') {
      return res.status(404).json({
        error: 'Record not found',
        id: req.query.id
      });
    }
    
    if (error.message.includes('no longer supported')) {
      return res.status(410).json({
        error: 'Key version expired',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to retrieve data',
      message: error.message
    });
  }
});

/**
 * GET /api/vault/stats
 * 
 * Returns vault statistics (for monitoring/debugging)
 */
app.get('/api/vault/stats', (req, res) => {
  try {
    const stats = vaultService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('[API] Stats error:', error.message);
    res.status(500).json({
      error: 'Failed to get stats'
    });
  }
});

/**
 * POST /api/vault/rotate
 * 
 * Manually trigger key rotation (for testing)
 */
app.post('/api/vault/rotate', (req, res) => {
  try {
    vaultService.forceRotation();
    const stats = vaultService.getStats();
    res.json({
      message: 'Key rotation completed',
      keyInfo: stats.keyInfo
    });
  } catch (error) {
    console.error('[API] Rotation error:', error.message);
    res.status(500).json({
      error: 'Failed to rotate key'
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🔐 Cryptographic Data Vault Server Started');
  console.log('='.repeat(60));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Key rotation interval: ${ROTATION_INTERVAL / 1000 / 60} minutes`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   http://localhost:${PORT}/api/vault/store`);
  console.log(`  GET    http://localhost:${PORT}/api/vault/retrieve?id=<id>`);
  console.log(`  GET    http://localhost:${PORT}/api/vault/stats`);
  console.log(`  POST   http://localhost:${PORT}/api/vault/rotate (testing)`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down gracefully...');
  server.close(() => {
    vaultService.destroy();
    console.log('[Server] Shutdown complete');
    process.exit(0);
  });
});

export { app, vaultService };
