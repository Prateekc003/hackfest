/**
 * lib/firebase.js
 * Initialises Firebase Admin SDK once (singleton pattern for Vercel).
 * Reads credentials from FIREBASE_SERVICE_ACCOUNT env var (JSON string).
 */
const admin = require('firebase-admin');

let db;

function getDB() {
  if (db) return db;

  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  db = admin.firestore();
  return db;
}

function getAuth() {
  if (!admin.apps.length) getDB(); // ensure initialised
  return admin.auth();
}

module.exports = { getDB, getAuth, admin };
