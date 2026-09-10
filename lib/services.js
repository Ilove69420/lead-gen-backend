// lib/services.js
// Shared setup for Firebase Admin (auth + Firestore) and Google Sheets.
// All secrets come from environment variables — nothing is hardcoded here.

const admin = require("firebase-admin");
const { google } = require("googleapis");

let firebaseApp;
function getFirebaseAdmin() {
  if (!firebaseApp) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin;
}

function getAuth() {
  return getFirebaseAdmin().auth();
}

function getFirestore() {
  return getFirebaseAdmin().firestore();
}

let sheetsClient;
async function getSheets() {
  if (!sheetsClient) {
    const credentials = JSON.parse(process.env.SHEETS_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
  }
  return sheetsClient;
}

function getSheetId() {
  return process.env.SHEET_ID;
}

// Verifies the Firebase ID token sent from the frontend or companion script.
// Returns the decoded token (contains uid, email) or throws.
async function verifyIdToken(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    const err = new Error("Missing Authorization: Bearer <token> header");
    err.statusCode = 401;
    throw err;
  }
  try {
    return await getAuth().verifyIdToken(token);
  } catch (e) {
    const err = new Error("Invalid or expired token");
    err.statusCode = 401;
    throw err;
  }
}

// Looks up a user's role ("admin" | "user") from Firestore.
async function getUserRole(uid) {
  const doc = await getFirestore().collection("users").doc(uid).get();
  if (!doc.exists) return null;
  return doc.data().role || null;
}

// Sheet tab names can't contain: : \ / ? * [ ]  and must be <= 100 chars.
// We build a per-user tab name from their email so it's stable and readable.
function tabNameForUser(email) {
  const safe = email.replace(/[:\\/?*\[\]]/g, "_").slice(0, 90);
  return `user_${safe}`;
}

module.exports = {
  getAuth,
  getFirestore,
  getSheets,
  getSheetId,
  verifyIdToken,
  getUserRole,
  tabNameForUser,
};
