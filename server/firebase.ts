import "dotenv/config";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Safely load firebase config dynamically to prevent ES modules JSON import issues on Vercel
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (configErr) {
  console.error("Error reading firebase-applet-config.json:", configErr);
}

let db: FirebaseFirestore.Firestore | null = null;
let auth: admin.auth.Auth | null = null;
let appInitialized = false;

try {
  if (admin.apps.length === 0) {
    const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saEnv) {
      try {
        const serviceAccount = JSON.parse(saEnv);
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        console.log("Initializing Firebase Admin with Service Account for project:", serviceAccount.project_id);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        appInitialized = true;
      } catch (e) {
        console.error("Invalid FIREBASE_SERVICE_ACCOUNT JSON:", e);
      }
    }

    if (!appInitialized && firebaseConfig.projectId) {
      // Fallback to default credentials if running in a managed environment
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
      appInitialized = true;
      console.log("Firebase Admin Initialized using project defaults.");
    }
  } else {
    appInitialized = true;
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}

try {
  if (appInitialized) {
    const dbId = (firebaseConfig as any).firestoreDatabaseId;
    // Use the databaseId if specified in config
    db = dbId ? getFirestore(dbId) : getFirestore();
    auth = admin.auth();
  }
} catch (servicesError) {
  console.error("Firebase Services (Firestore/Auth) initialization failed:", servicesError);
  db = null;
  auth = null;
}

export { admin, db, auth };
