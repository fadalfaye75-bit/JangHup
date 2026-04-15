import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { 
  initializeFirestore, 
  connectFirestoreEmulator, 
  doc, 
  getDocFromServer, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

/**
 * Senior Architecture Pattern: Singleton Initialization
 * Ensures Firebase is only initialized once and provides safe access to services.
 */

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Services
export const auth = getAuth(app);

/**
 * Initialize Firestore with Modern Persistence API
 * Replaces deprecated enableMultiTabIndexedDbPersistence
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);

export const storage = getStorage(app);

/**
 * Development Emulators Support
 * Automatically connects to local emulators if running in development mode.
 */
if (process.env.NODE_ENV === 'development' && (window as any).FIREBASE_EMULATOR) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}

/**
 * Connection Health Check
 * Verifies Firestore connectivity on boot.
 */
async function validateConnection() {
  try {
    // Attempt to fetch a non-existent doc to test connectivity
    await getDocFromServer(doc(db, '_internal_', 'healthcheck'));
    console.log('🔥 Firebase: Connection established successfully.');
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.error('❌ Firebase: Client is offline. Check your configuration or network.');
    } else if (error.message?.includes('Missing or insufficient permissions')) {
      // This is expected because we don't allow reading _internal_ by default
      console.log('🔥 Firebase: Connection established successfully (verified via rules rejection).');
    } else {
      console.warn('⚠️ Firebase: Health check warning (expected if doc missing):', error.message);
    }
  }
}

validateConnection();

export default app;
