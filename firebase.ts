import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDocFromServer, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from './firebase-applet-config.json';

/**
 * Senior Architecture Pattern: Singleton Initialization
 * Ensures Firebase is only initialized once and provides safe access to services.
 */

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

/**
 * Enable Offline Persistence for Robustness
 * This allows the app to work offline and caches data for faster loads.
 */
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Firebase persistence failed: Multiple tabs open');
  } else if (err.code == 'unimplemented') {
    console.warn('Firebase persistence not supported by browser');
  }
});

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
    } else {
      console.warn('⚠️ Firebase: Health check warning (expected if doc missing):', error.message);
    }
  }
}

validateConnection();

export default app;
