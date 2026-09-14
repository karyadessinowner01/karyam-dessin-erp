import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function readServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (encoded) {
    try {
      return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    } catch {
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) return null;

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export function getFirebaseAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const serviceAccount = readServiceAccount();
  if (!serviceAccount) return null;

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export function getAdminDb() {
  const app = getFirebaseAdminApp();
  return app ? getFirestore(app) : null;
}

export async function verifyFirebaseIdToken(idToken: string) {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  return getAuth(app).verifyIdToken(idToken);
}
