/**
 * server/firebase.js
 * ─────────────────────────────────────────────────────────
 * Initializes Firebase Admin SDK (singleton).
 * Exports:
 *   db       → Firestore instance
 *   rtdb     → Realtime Database instance
 *   admin    → full firebase-admin namespace
 */

import admin from 'firebase-admin';

let firebaseApp;

function initFirebase() {
  if (admin.apps.length > 0) return admin.apps[0];

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountEnv) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT environment variable is not set. ' +
      'Please add your Firebase service account JSON to Vercel environment variables.'
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountEnv);
  } catch (e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON. Please check the value.');
  }

  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com` ||
    'https://mango-169d3-default-rtdb.firebaseio.com';

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL
  });

  console.log(`✅ [Firebase] Initialized project: ${serviceAccount.project_id}`);
  return firebaseApp;
}

// Initialize on first import
initFirebase();

/** Firestore instance */
export const db = admin.firestore();

/** Realtime Database instance */
export const rtdb = admin.database();

export default admin;
