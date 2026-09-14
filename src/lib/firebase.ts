/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  PASTE YOUR FIREBASE CONFIG HERE                             ║
 * ║                                                              ║
 * ║  1. Go to https://console.firebase.google.com/              ║
 * ║  2. Create a project → Add Web App (</> icon)               ║
 * ║  3. Copy the config values                                   ║
 * ║  4. Paste them in .env.local (replace YOUR_... values)      ║
 * ║  5. Restart: bun run dev                                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Firebase Initialization — v9+ Modular SDK
 * - Auth (Google + Email/Password)
 * - Firestore (real-time database with offline persistence)
 * - Falls back to localStorage mode when not configured
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  getFirestore, type Firestore, initializeFirestore,
  persistentLocalCache, persistentMultipleTabManager,
} from 'firebase/firestore';

// Read config from Next.js public env vars (must be prefixed with NEXT_PUBLIC_)
// PASTE YOUR FIREBASE CONFIG IN .env.local — see .env.local for instructions
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Check if Firebase is actually configured (not just placeholder values) */
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes('YOUR_') &&
    !firebaseConfig.projectId.includes('YOUR_')
  );
};

// Lazy-initialize Firebase only if configured
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Enable Firestore offline persistence (STEP 6 — OFFLINE SUPPORT)
    // App works without internet and syncs when connection returns.
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // Fallback if persistence already initialized (HMR)
      db = getFirestore(app);
    }

    console.log('[Firebase] Initialized for project:', firebaseConfig.projectId, '| Offline persistence: ON');
  } catch (err) {
    console.error('[Firebase] Initialization failed:', err);
  }
}

export { app, auth, db };

/**
 * Firestore collection path for per-user ERP data.
 * Structure: erp-data/{uid} — one document per user containing the full ERP state.
 * This ensures each user's data is isolated and private (enforced by Firestore rules).
 */
export const ERP_DATA_COLLECTION = 'erp-data';
