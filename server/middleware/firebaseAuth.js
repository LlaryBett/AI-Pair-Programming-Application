import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config(); // Load env vars

// Decode service account JSON from base64
const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!base64) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 env variable is missing.");
}

let serviceAccount;

try {
  const json = Buffer.from(base64, "base64").toString("utf8");
  serviceAccount = JSON.parse(json);
} catch (error) {
  console.error("Failed to decode Firebase service account:", error);
  throw error;
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Middleware to verify Firebase ID token
export const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;
    next();
  } catch (err) {
    console.error("Firebase token verification error:", err);
    res.status(401).json({ message: "Invalid Firebase token" });
  }
};
