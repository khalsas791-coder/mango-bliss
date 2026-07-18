/**
 * server/firebase.js
 * ─────────────────────────────────────────────────────────
 * Initializes Firebase Admin SDK (singleton, lazy-safe).
 * Exports: db (Firestore), rtdb (Realtime DB), admin
 */

import admin from 'firebase-admin';

let _db = null;
let _rtdb = null;
let _initialized = false;
let _initError = null;

function initFirebase() {
  if (_initialized) return;
  _initialized = true;

  try {
    if (admin.apps.length > 0) {
      _db = admin.firestore();
      _rtdb = admin.database();
      return;
    }

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT env var is missing.');
    }

    // Vercel sometimes wraps the value in quotes — strip them
    const cleaned = raw.trim().replace(/^["']|["']$/g, '');

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(cleaned);
    } catch (parseErr) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT is not valid JSON. ` +
        `First 80 chars: "${cleaned.substring(0, 80)}" — Error: ${parseErr.message}`
      );
    }

    const databaseURL =
      process.env.FIREBASE_DATABASE_URL ||
      `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL,
    });

    _db = admin.firestore();
    _rtdb = admin.database();
    console.log(`✅ [Firebase] Connected → project: ${serviceAccount.project_id}`);
  } catch (err) {
    _initError = err;
    console.error(`❌ [Firebase] Init failed: ${err.message}`);
  }
}

// Run on import
initFirebase();

/**
 * Returns Firestore instance.
 * Throws a descriptive error if init failed.
 */
export function getDb() {
  if (_initError) throw new Error(`Firebase not ready: ${_initError.message}`);
  if (!_db) throw new Error('Firebase Firestore is not initialized.');
  return _db;
}

/**
 * Returns Realtime Database instance.
 */
export function getRtdb() {
  if (_initError) throw new Error(`Firebase not ready: ${_initError.message}`);
  if (!_rtdb) throw new Error('Firebase RTDB is not initialized.');
  return _rtdb;
}

/** Check if Firebase initialized successfully */
export function isFirebaseReady() {
  return !_initError && _db !== null;
}

/** Get init error message (for health endpoint) */
export function getFirebaseError() {
  return _initError ? _initError.message : null;
}

export { admin };
export const db = new Proxy({}, {
  get(_, prop) {
    return (...args) => getDb()[prop](...args);
  }
});
export const rtdb = new Proxy({}, {
  get(_, prop) {
    return (...args) => getRtdb()[prop](...args);
  }
});

export default admin;
