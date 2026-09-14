/**
 * Firestore-backed Zustand Storage Adapter
 *
 * Replaces localStorage with Firestore for real-time cross-device sync.
 * - getItem(): reads the ERP state from Firestore document `erp-data/{uid}`
 * - setItem(): writes the ERP state to Firestore (debounced)
 * - onSnapshot(): listens for external changes and updates local state in real-time
 *
 * When Firebase is not configured, falls back to localStorage.
 */

import type { StateStorage } from 'zustand/middleware';
import {
  doc, setDoc, getDoc, onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, ERP_DATA_COLLECTION } from '@/lib/firebase';

/** Current authenticated user's UID — set by the auth flow */
let currentUid: string | null = null;

/** Track the active onSnapshot listener so we can clean it up */
let snapshotUnsub: Unsubscribe | null = null;

/** Debounce write timer */
let writeTimer: ReturnType<typeof setTimeout> | null = null;
const WRITE_DEBOUNCE_MS = 800;

/** External callback that the store registers to receive remote updates */
let externalSyncCallback: ((state: any) => void) | null = null;

/** Flag to prevent write-back when we're applying a remote update */
let applyingRemoteUpdate = false;

function parsePersistedState(value: unknown): any | null {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value);
    return parsed?.state && typeof parsed.state === 'object' ? parsed.state : parsed;
  } catch (err) {
    console.error('[Firestore] Failed to parse remote state:', err);
    return null;
  }
}

/** Set the current user UID (called after Firebase Auth login) */
export function setCurrentUserUid(uid: string | null) {
  // If user changed, tear down old listener
  if (currentUid !== uid) {
    if (snapshotUnsub) {
      snapshotUnsub();
      snapshotUnsub = null;
    }
  }
  currentUid = uid;
}

/** Register a callback to be called when a remote update arrives via onSnapshot */
export function onRemoteUpdate(callback: (state: any) => void): void {
  externalSyncCallback = callback;
}

/** Start listening for real-time updates from Firestore */
export function startRealtimeSync() {
  if (!isFirebaseConfigured() || !db || !currentUid) return;
  if (snapshotUnsub) snapshotUnsub(); // clean up previous

  const docRef = doc(db, ERP_DATA_COLLECTION, currentUid);
  snapshotUnsub = onSnapshot(docRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    if (data && data.state) {
      const parsedState = parsePersistedState(data.state);
      if (!parsedState) return;

      // Mark that we're applying a remote update so we don't write back
      applyingRemoteUpdate = true;
      if (externalSyncCallback) {
        externalSyncCallback(parsedState);
      }
      // Reset flag after a tick
      setTimeout(() => { applyingRemoteUpdate = false; }, 100);
    }
  }, (err) => {
    console.error('[Firestore] onSnapshot error:', err);
  });
}

/** Stop real-time sync */
export function stopRealtimeSync() {
  if (snapshotUnsub) {
    snapshotUnsub();
    snapshotUnsub = null;
  }
}

/** Check if we should skip writing (because we're applying a remote update) */
export function isApplyingRemoteUpdate(): boolean {
  return applyingRemoteUpdate;
}

// ============ Firestore Storage Adapter ============
export const firestoreStorage: StateStorage = {
  async getItem(name: string): Promise<string | null> {
    // If Firebase not configured, fall back to localStorage
    if (!isFirebaseConfigured() || !db || !currentUid) {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(name);
      }
      return null;
    }

    try {
      const docRef = doc(db, ERP_DATA_COLLECTION, currentUid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const state = typeof data?.state === 'string' ? data.state : null;
        if (state && typeof window !== 'undefined') {
          window.localStorage.setItem(name, state);
        }
        return state ?? (typeof window !== 'undefined' ? window.localStorage.getItem(name) : null);
      }
      return typeof window !== 'undefined' ? window.localStorage.getItem(name) : null;
    } catch (err) {
      console.error('[Firestore] getItem error:', err);
      return typeof window !== 'undefined' ? window.localStorage.getItem(name) : null;
    }
  },

  async setItem(name: string, value: string): Promise<void> {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(name, value);
    }

    // Skip cloud write if applying a remote update (prevents infinite loop)
    if (applyingRemoteUpdate) return;

    if (!isFirebaseConfigured() || !db || !currentUid) {
      return;
    }

    // Debounce writes to avoid excessive Firestore calls
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(async () => {
      try {
        const docRef = doc(db, ERP_DATA_COLLECTION, currentUid);
        await setDoc(docRef, {
          state: value,
          updatedAt: new Date().toISOString(),
          uid: currentUid,
        }, { merge: false });
      } catch (err) {
        console.error('[Firestore] setItem error:', err);
        // Fall back to localStorage on error
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(name, value);
        }
      }
    }, WRITE_DEBOUNCE_MS);
  },

  async removeItem(name: string): Promise<void> {
    if (!isFirebaseConfigured() || !db || !currentUid) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(name);
      }
      return;
    }

    // We don't actually delete the Firestore document (data retention);
    // instead we clear the state. If needed, a separate purge function can be added.
    try {
      const docRef = doc(db, ERP_DATA_COLLECTION, currentUid);
      await setDoc(docRef, {
        state: null,
        updatedAt: new Date().toISOString(),
        uid: currentUid,
      }, { merge: false });
    } catch (err) {
      console.error('[Firestore] removeItem error:', err);
    }
  },
};
