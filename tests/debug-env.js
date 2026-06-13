// Debug: Check FIREBASE_SERVICE_ACCOUNT env var parsing
import dotenv from "dotenv";
dotenv.config();

const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
console.log("FIREBASE_SERVICE_ACCOUNT set:", !!sa);
console.log("Raw length:", sa ? sa.length : 0);

if (sa) {
  try {
    const parsed = JSON.parse(sa);
    console.log("✅ JSON parsed successfully");
    console.log("  project_id:", parsed.project_id);
    console.log("  client_email:", parsed.client_email);
    console.log("  has private_key:", !!parsed.private_key);
    console.log("  private_key starts with:", parsed.private_key?.substring(0, 40));
  } catch (e) {
    console.log("❌ JSON parse error:", e.message);
    console.log("First 200 chars of raw value:", sa.substring(0, 200));
  }
} else {
  console.log("❌ FIREBASE_SERVICE_ACCOUNT is not set or empty");
}
