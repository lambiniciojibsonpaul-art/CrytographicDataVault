import dotenv from 'dotenv';
import VaultService from './vaultService.js';

dotenv.config();

console.log('Creating VaultService...');
const vault = new VaultService(process.env.MASTER_ENCRYPTION_KEY, 5000);

console.log('Checking dataStore:', vault.dataStore);
console.log('dataStore.store type:', typeof vault.dataStore.store);

console.log('\nTrying to store data...');
try {
  const result = vault.store({ test: 'data' });
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error);
}

vault.destroy();
