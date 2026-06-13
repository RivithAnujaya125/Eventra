/**
 * Eventra API - Live Server Test Suite (Fully Automated Authenticated Mode)
 * =======================================================================
 * Automatically signs in/registers temporary test accounts to run the
 * complete suite of 22 tests (including wallet, registrations, wishlist,
 * admin dashboard, and AI Assistant).
 */

import "dotenv/config";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";

// -------------------------------------------------------------------
// Helper utilities
// -------------------------------------------------------------------
let passCount = 0;
let failCount = 0;
let skipCount = 0;
const results = [];

function log(symbol, label, detail = "") {
  const line = `  ${symbol}  ${label}${detail ? `  →  ${detail}` : ""}`;
  console.log(line);
  results.push({ symbol, label, detail });
}

function pass(label, detail) { passCount++; log("✅", label, detail); }
function fail(label, detail) { failCount++; log("❌", label, detail); }
function skip(label, detail) { skipCount++; log("⏭️ ", label, detail); }

async function request(method, path, { body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

// -------------------------------------------------------------------
// Automated Firebase Auth Token Generator
// -------------------------------------------------------------------
async function getAuthTokens() {
  console.log("⚙️  Initializing Firebase Admin for automated testing...");

  // Load config & service account
  let firebaseConfig = {};
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (err) {
    console.error("Failed to read firebase config:", err);
  }

  const webApiKey = firebaseConfig.apiKey || process.env.GEMINI_API_KEY; // Fallback to Gemini key if same API limits allow
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!saEnv || !webApiKey) {
    console.warn("⚠️  Service account or Web API Key missing. Running in standard/public-only mode.");
    return { userToken: null, adminToken: null };
  }

  try {
    const serviceAccount = JSON.parse(saEnv);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    console.log("🔑 Creating custom tokens for test accounts...");

    // 1. Regular User Token
    const userUid = "test-regular-user-id";
    const customUserToken = await admin.auth().createCustomToken(userUid, {
      email: "testuser@eventra.local",
      email_verified: true
    });

    // 2. Admin User Token (using one of the bootstrap emails from middleware/auth.ts)
    const adminUid = "test-admin-user-id";
    const customAdminToken = await admin.auth().createCustomToken(adminUid, {
      email: "anujayakulathunga15@gmail.com",
      email_verified: true
    });

    // Exchange custom tokens for ID tokens using Firebase Auth REST API
    const exchange = async (customToken) => {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${webApiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: customToken, returnSecureToken: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Exchange failed");
      return data.idToken;
    };

    console.log("🔄 Exchanging custom tokens for ID tokens...");
    const userToken = await exchange(customUserToken);
    const adminToken = await exchange(customAdminToken);

    console.log("✅ Authenticated tokens successfully acquired!");
    return { userToken, adminToken };
  } catch (error) {
    console.error("❌ Failed to automatically generate test tokens:", error.message);
    return { userToken: null, adminToken: null };
  }
}

// -------------------------------------------------------------------
// Test runner
// -------------------------------------------------------------------
async function runTests() {
  console.log("\n══════════════════════════════════════════════");
  console.log("  Eventra API Test Suite  —  " + new Date().toLocaleString());
  console.log("══════════════════════════════════════════════\n");

  const { userToken, adminToken } = await getAuthTokens();

  // ─────────────────────────────────────────────────────────────────
  // 1. INFRASTRUCTURE
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 1. Infrastructure ──────────────────────────");

  // Ping
  try {
    const { status, data } = await request("GET", "/api/ping");
    status === 200 && data?.status === "pong"
      ? pass("GET /api/ping", `200 · node_env=${data.node_env}`)
      : fail("GET /api/ping", `status=${status} body=${JSON.stringify(data)}`);
  } catch (e) { fail("GET /api/ping", e.message); }

  // Health
  try {
    const { status, data } = await request("GET", "/api/health");
    status === 200 && data?.status === "ok"
      ? pass("GET /api/health", `200 · ${data.timestamp}`)
      : fail("GET /api/health", `status=${status}`);
  } catch (e) { fail("GET /api/health", e.message); }

  // ─────────────────────────────────────────────────────────────────
  // 2. EVENTS  (public)
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 2. Events (public) ─────────────────────────");

  let firstEventId = null;

  // List all events
  try {
    const { status, data } = await request("GET", "/api/events");
    if (status === 200 && Array.isArray(data)) {
      pass("GET /api/events", `200 · ${data.length} event(s) returned`);
      if (data.length > 0) firstEventId = data[0].id;
    } else {
      fail("GET /api/events", `status=${status} body=${JSON.stringify(data)}`);
    }
  } catch (e) { fail("GET /api/events", e.message); }

  // Get single event
  if (firstEventId) {
    try {
      const { status, data } = await request("GET", `/api/events/${firstEventId}`);
      status === 200 && data?.id
        ? pass("GET /api/events/:id", `200 · id=${data.id} title="${data.title}"`)
        : fail("GET /api/events/:id", `status=${status}`);
    } catch (e) { fail("GET /api/events/:id", e.message); }
  } else {
    skip("GET /api/events/:id", "No events in DB to test with");
  }

  // Get non-existent event → expect 404
  try {
    const { status } = await request("GET", "/api/events/NONEXISTENT_ID_99999");
    status === 404
      ? pass("GET /api/events/:id (404 check)", "Correctly returns 404 for unknown ID")
      : fail("GET /api/events/:id (404 check)", `Expected 404, got ${status}`);
  } catch (e) { fail("GET /api/events/:id (404 check)", e.message); }

  // ─────────────────────────────────────────────────────────────────
  // 3. EVENTS  (admin-only mutations)
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 3. Events (admin-only mutations) ───────────");

  let createdEventId = null;

  if (!adminToken) {
    skip("POST /api/events", "No adminToken acquired");
    skip("PUT /api/events/:id", "No adminToken acquired");
    skip("DELETE /api/events/:id", "No adminToken acquired");
  } else {
    // Create event
    try {
      const body = {
        title: "Test Event — Auto Generated",
        description: "Created by API test suite",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: "Test Venue, Colombo",
        category: "Tech",
        fee: 0,
        capacity: 20
      };
      const { status, data } = await request("POST", "/api/events", { body, token: adminToken });
      if (status === 201 && data?.id) {
        createdEventId = data.id;
        pass("POST /api/events (admin)", `201 · id=${createdEventId}`);
      } else {
        fail("POST /api/events (admin)", `status=${status} body=${JSON.stringify(data)}`);
      }
    } catch (e) { fail("POST /api/events (admin)", e.message); }

    // Create event — missing required fields → 400
    try {
      const { status } = await request("POST", "/api/events", {
        body: { description: "no title or date" },
        token: adminToken
      });
      status === 400
        ? pass("POST /api/events (validation — missing fields)", "Correctly returns 400")
        : fail("POST /api/events (validation — missing fields)", `Expected 400, got ${status}`);
    } catch (e) { fail("POST /api/events (validation — missing fields)", e.message); }

    // Create event — invalid date → 400
    try {
      const { status } = await request("POST", "/api/events", {
        body: { title: "Bad Date Event", date: "not-a-date", location: "Colombo" },
        token: adminToken
      });
      status === 400
        ? pass("POST /api/events (validation — invalid date)", "Correctly returns 400")
        : fail("POST /api/events (validation — invalid date)", `Expected 400, got ${status}`);
    } catch (e) { fail("POST /api/events (validation — invalid date)", e.message); }

    // Update event
    if (createdEventId) {
      try {
        const { status, data } = await request("PUT", `/api/events/${createdEventId}`, {
          body: { title: "Updated Test Event", capacity: 30 },
          token: adminToken
        });
        status === 200
          ? pass("PUT /api/events/:id (admin)", `200 · ${data?.message}`)
          : fail("PUT /api/events/:id (admin)", `status=${status} body=${JSON.stringify(data)}`);
      } catch (e) { fail("PUT /api/events/:id (admin)", e.message); }

      // Delete created test event (cleanup)
      try {
        const { status, data } = await request("DELETE", `/api/events/${createdEventId}`, { token: adminToken });
        status === 200
          ? pass("DELETE /api/events/:id (admin + cleanup)", `200 · ${data?.message}`)
          : fail("DELETE /api/events/:id (admin)", `status=${status} body=${JSON.stringify(data)}`);
      } catch (e) { fail("DELETE /api/events/:id (admin)", e.message); }
    } else {
      skip("PUT /api/events/:id", "Event creation failed — skipping update");
      skip("DELETE /api/events/:id", "Event creation failed — skipping delete");
    }

    // Unauthenticated → expect 401 / 403
    try {
      const { status } = await request("POST", "/api/events", {
        body: { title: "Hack", date: new Date().toISOString(), location: "x" }
      });
      [401, 403].includes(status)
        ? pass("POST /api/events (no token → 401/403)", `Correctly returns ${status}`)
        : fail("POST /api/events (no token guard)", `Expected 401/403, got ${status}`);
    } catch (e) { fail("POST /api/events (no token guard)", e.message); }
  }

  // ─────────────────────────────────────────────────────────────────
  // 4. REGISTRATIONS
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 4. Registrations ───────────────────────────");

  if (!userToken) {
    skip("GET /api/registrations/mine", "No userToken acquired");
    skip("POST /api/registrations", "No userToken acquired");
  } else {
    // Get user's own registrations
    try {
      const { status, data } = await request("GET", "/api/registrations/mine", { token: userToken });
      status === 200 && Array.isArray(data)
        ? pass("GET /api/registrations/mine", `200 · ${data.length} registration(s)`)
        : fail("GET /api/registrations/mine", `status=${status} body=${JSON.stringify(data)}`);
    } catch (e) { fail("GET /api/registrations/mine", e.message); }

    // POST with missing fields → 400
    try {
      const { status } = await request("POST", "/api/registrations", {
        body: { name: "Test" },
        token: userToken
      });
      status === 400
        ? pass("POST /api/registrations (missing fields → 400)", "Correctly returns 400")
        : fail("POST /api/registrations (missing fields → 400)", `Expected 400, got ${status}`);
    } catch (e) { fail("POST /api/registrations (missing fields → 400)", e.message); }

    // POST with invalid phone → 400
    try {
      const { status, data } = await request("POST", "/api/registrations", {
        body: { eventId: "fake", name: "Valid Name", phone: "123" },
        token: userToken
      });
      status === 400
        ? pass("POST /api/registrations (invalid phone → 400)", "Correctly returns 400")
        : fail("POST /api/registrations (invalid phone → 400)", `Expected 400, got ${status} — ${data?.error}`);
    } catch (e) { fail("POST /api/registrations (invalid phone → 400)", e.message); }

    // POST with invalid name (numbers) → 400
    try {
      const { status } = await request("POST", "/api/registrations", {
        body: { eventId: "fake", name: "Name123", phone: "0712345678" },
        token: userToken
      });
      status === 400
        ? pass("POST /api/registrations (invalid name → 400)", "Correctly returns 400")
        : fail("POST /api/registrations (invalid name → 400)", `Expected 400, got ${status}`);
    } catch (e) { fail("POST /api/registrations (invalid name → 400)", e.message); }

    // Register a valid registration for an event!
    if (firstEventId) {
      try {
        const { status, data } = await request("POST", "/api/registrations", {
          body: { eventId: firstEventId, name: "Test Attendee", phone: "0712345678", college: "Test College" },
          token: userToken
        });
        [201, 409].includes(status)
          ? pass("POST /api/registrations (valid registration)", `${status} · status=${data?.status || "already registered"}`)
          : fail("POST /api/registrations (valid registration)", `status=${status} body=${JSON.stringify(data)}`);
      } catch (e) { fail("POST /api/registrations (valid registration)", e.message); }
    } else {
      skip("POST /api/registrations (valid registration)", "No events in DB to test with");
    }

    // No auth → 401/403
    try {
      const { status } = await request("GET", "/api/registrations/mine");
      [401, 403].includes(status)
        ? pass("GET /api/registrations/mine (no token → 401/403)", `Correctly returns ${status}`)
        : fail("GET /api/registrations/mine (no token guard)", `Expected 401/403, got ${status}`);
    } catch (e) { fail("GET /api/registrations/mine (no token guard)", e.message); }
  }

  // Admin — list all registrations
  if (adminToken) {
    try {
      const { status, data } = await request("GET", "/api/registrations", { token: adminToken });
      status === 200 && Array.isArray(data)
        ? pass("GET /api/registrations (admin)", `200 · ${data.length} total registration(s)`)
        : fail("GET /api/registrations (admin)", `status=${status}`);
    } catch (e) { fail("GET /api/registrations (admin)", e.message); }
  } else {
    skip("GET /api/registrations (admin)", "No adminToken acquired");
  }

  // ─────────────────────────────────────────────────────────────────
  // 5. WALLET
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 5. Wallet ──────────────────────────────────");

  if (!userToken) {
    skip("GET /api/wallet", "No userToken acquired");
    skip("POST /api/wallet/deposit", "No userToken acquired");
  } else {
    // Get wallet info
    try {
      const { status, data } = await request("GET", "/api/wallet", { token: userToken });
      status === 200 && typeof data?.balance === "number"
        ? pass("GET /api/wallet", `200 · balance=${data.balance} EP, txns=${data.transactions?.length || 0}`)
        : fail("GET /api/wallet", `status=${status} body=${JSON.stringify(data)}`);
    } catch (e) { fail("GET /api/wallet", e.message); }

    // Deposit valid amount
    try {
      const { status, data } = await request("POST", "/api/wallet/deposit", {
        body: { amount: 500, paymentMethod: "card", cardDetails: { cardNumber: "4111111111111111" } },
        token: userToken
      });
      status === 200 && typeof data?.balance === "number"
        ? pass("POST /api/wallet/deposit (card)", `200 · new balance=${data.balance} EP`)
        : fail("POST /api/wallet/deposit (card)", `status=${status} body=${JSON.stringify(data)}`);
    } catch (e) { fail("POST /api/wallet/deposit (card)", e.message); }

    // Deposit — invalid amount → 400
    try {
      const { status } = await request("POST", "/api/wallet/deposit", {
        body: { amount: -100, paymentMethod: "card" },
        token: userToken
      });
      status === 400
        ? pass("POST /api/wallet/deposit (negative amount → 400)", "Correctly returns 400")
        : fail("POST /api/wallet/deposit (negative amount → 400)", `Expected 400, got ${status}`);
    } catch (e) { fail("POST /api/wallet/deposit (negative amount → 400)", e.message); }

    // Deposit — zero amount → 400
    try {
      const { status } = await request("POST", "/api/wallet/deposit", {
        body: { amount: 0, paymentMethod: "koko" },
        token: userToken
      });
      status === 400
        ? pass("POST /api/wallet/deposit (zero amount → 400)", "Correctly returns 400")
        : fail("POST /api/wallet/deposit (zero amount → 400)", `Expected 400, got ${status}`);
    } catch (e) { fail("POST /api/wallet/deposit (zero amount → 400)", e.message); }

    // No auth → 401/403
    try {
      const { status } = await request("GET", "/api/wallet");
      [401, 403].includes(status)
        ? pass("GET /api/wallet (no token → 401/403)", `Correctly returns ${status}`)
        : fail("GET /api/wallet (no token guard)", `Expected 401/403, got ${status}`);
    } catch (e) { fail("GET /api/wallet (no token guard)", e.message); }
  }

  // ─────────────────────────────────────────────────────────────────
  // 6. WISHLIST
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 6. Wishlist ────────────────────────────────");

  if (!userToken) {
    skip("GET /api/wishlist", "No userToken acquired");
    skip("POST /api/wishlist/toggle", "No userToken acquired");
  } else {
    // Get wishlist
    try {
      const { status, data } = await request("GET", "/api/wishlist", { token: userToken });
      status === 200 && Array.isArray(data)
        ? pass("GET /api/wishlist", `200 · ${data.length} item(s)`)
        : fail("GET /api/wishlist", `status=${status} body=${JSON.stringify(data)}`);
    } catch (e) { fail("GET /api/wishlist", e.message); }

    // Toggle wishlist with a real event ID
    if (firstEventId) {
      try {
        const { status, data } = await request("POST", "/api/wishlist/toggle", {
          body: { eventId: firstEventId },
          token: userToken
        });
        status === 200 && typeof data?.wishlisted === "boolean"
          ? pass("POST /api/wishlist/toggle", `200 · wishlisted=${data.wishlisted} — ${data.message}`)
          : fail("POST /api/wishlist/toggle", `status=${status} body=${JSON.stringify(data)}`);
      } catch (e) { fail("POST /api/wishlist/toggle", e.message); }

      // Toggle again (should flip)
      try {
        const { status, data } = await request("POST", "/api/wishlist/toggle", {
          body: { eventId: firstEventId },
          token: userToken
        });
        status === 200
          ? pass("POST /api/wishlist/toggle (second toggle — flip)", `200 · wishlisted=${data.wishlisted}`)
          : fail("POST /api/wishlist/toggle (second toggle)", `status=${status}`);
      } catch (e) { fail("POST /api/wishlist/toggle (second toggle)", e.message); }

      // Check wishlist status
      try {
        const { status, data } = await request("GET", `/api/wishlist/check/${firstEventId}`, { token: userToken });
        status === 200 && typeof data?.wishlisted === "boolean"
          ? pass("GET /api/wishlist/check/:eventId", `200 · wishlisted=${data.wishlisted}`)
          : fail("GET /api/wishlist/check/:eventId", `status=${status}`);
      } catch (e) { fail("GET /api/wishlist/check/:eventId", e.message); }
    } else {
      skip("POST /api/wishlist/toggle", "No events in DB to test with");
      skip("GET /api/wishlist/check/:eventId", "No events in DB to test with");
    }

    // Toggle missing eventId → 400
    try {
      const { status } = await request("POST", "/api/wishlist/toggle", {
        body: {},
        token: userToken
      });
      status === 400
        ? pass("POST /api/wishlist/toggle (missing eventId → 400)", "Correctly returns 400")
        : fail("POST /api/wishlist/toggle (missing eventId → 400)", `Expected 400, got ${status}`);
    } catch (e) { fail("POST /api/wishlist/toggle (missing eventId → 400)", e.message); }

    // Toggle non-existent event → 404
    try {
      const { status } = await request("POST", "/api/wishlist/toggle", {
        body: { eventId: "GHOST_EVENT_XYZ" },
        token: userToken
      });
      status === 404
        ? pass("POST /api/wishlist/toggle (ghost eventId → 404)", "Correctly returns 404")
        : fail("POST /api/wishlist/toggle (ghost eventId → 404)", `Expected 404, got ${status}`);
    } catch (e) { fail("POST /api/wishlist/toggle (ghost eventId → 404)", e.message); }
  }

  // ─────────────────────────────────────────────────────────────────
  // 7. ADMIN DASHBOARD
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 7. Admin Dashboard ─────────────────────────");

  if (!adminToken) {
    skip("GET /api/admin/stats", "No adminToken acquired");
    skip("GET /api/admin/registrations", "No adminToken acquired");
    skip("GET /api/admin/entry-logs", "No adminToken acquired");
    skip("GET /api/admin/gateway", "No adminToken acquired");
  } else {
    // Stats
    try {
      const { status, data } = await request("GET", "/api/admin/stats", { token: adminToken });
      status === 200 && typeof data?.totalEvents === "number"
        ? pass("GET /api/admin/stats", `200 · events=${data.totalEvents} users=${data.totalUsers} regs=${data.totalRegistrations} pending=${data.pendingRegistrations}`)
        : fail("GET /api/admin/stats", `status=${status} body=${JSON.stringify(data)}`);
    } catch (e) { fail("GET /api/admin/stats", e.message); }

    // All registrations
    try {
      const { status, data } = await request("GET", "/api/admin/registrations", { token: adminToken });
      status === 200 && Array.isArray(data)
        ? pass("GET /api/admin/registrations", `200 · ${data.length} record(s)`)
        : fail("GET /api/admin/registrations", `status=${status}`);
    } catch (e) { fail("GET /api/admin/registrations", e.message); }

    // Entry logs
    try {
      const { status, data } = await request("GET", "/api/admin/entry-logs", { token: adminToken });
      status === 200 && Array.isArray(data)
        ? pass("GET /api/admin/entry-logs", `200 · ${data.length} log(s)`)
        : fail("GET /api/admin/entry-logs", `status=${status}`);
    } catch (e) { fail("GET /api/admin/entry-logs", e.message); }

    // Gateway config
    try {
      const { status, data } = await request("GET", "/api/admin/gateway", { token: adminToken });
      status === 200
        ? pass("GET /api/admin/gateway", `200 · mode=${data?.mode} provider="${data?.provider}"`)
        : fail("GET /api/admin/gateway", `status=${status}`);
    } catch (e) { fail("GET /api/admin/gateway", e.message); }

    // Save gateway config
    try {
      const { status, data } = await request("POST", "/api/admin/gateway", {
        body: { mode: "test", provider: "Direct Bank", taxRate: 15, serviceFee: 300, currencySymbol: "LKR" },
        token: adminToken
      });
      status === 200 && data?.success
        ? pass("POST /api/admin/gateway", `200 · ${data.message}`)
        : fail("POST /api/admin/gateway", `status=${status} body=${JSON.stringify(data)}`);
    } catch (e) { fail("POST /api/admin/gateway", e.message); }
  }

  // ─────────────────────────────────────────────────────────────────
  // 8. ASSISTANT
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 8. AI Assistant ────────────────────────────");

  // Missing message → 400
  try {
    const { status } = await request("POST", "/api/assistant/chat", { body: {} });
    status === 400
      ? pass("POST /api/assistant/chat (missing message → 400)", "Correctly returns 400")
      : fail("POST /api/assistant/chat (missing message → 400)", `Expected 400, got ${status}`);
  } catch (e) { fail("POST /api/assistant/chat (missing message → 400)", e.message); }

  // Valid message
  try {
    const { status, data } = await request("POST", "/api/assistant/chat", {
      body: { message: "What events are available?", username: "TestUser" }
    });
    status === 200 && data?.reply
      ? pass("POST /api/assistant/chat (valid message)", `200 · Reply: "${data.reply.substring(0, 60)}..."`)
      : fail("POST /api/assistant/chat (valid message)", `status=${status} body=${JSON.stringify(data)}`);
  } catch (e) { fail("POST /api/assistant/chat (valid message)", e.message); }

  // ─────────────────────────────────────────────────────────────────
  // 9. 404 FALLBACK
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 9. Route Fallback ──────────────────────────");
  try {
    const { status } = await request("GET", "/api/nonexistent_route_xyz");
    status === 404
      ? pass("GET /api/* (unknown route → 404)", "Correctly returns 404")
      : fail("GET /api/* (unknown route fallback)", `Expected 404, got ${status}`);
  } catch (e) { fail("GET /api/* (unknown route fallback)", e.message); }

  // ─────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────
  const total = passCount + failCount + skipCount;
  console.log("\n══════════════════════════════════════════════");
  console.log(`  Results: ${total} tests`);
  console.log(`  ✅  Passed  : ${passCount}`);
  console.log(`  ❌  Failed  : ${failCount}`);
  console.log(`  ⏭️   Skipped : ${skipCount}`);
  console.log("══════════════════════════════════════════════\n");

  if (failCount > 0) {
    console.log("Failed tests:");
    results.filter(r => r.symbol === "❌").forEach(r => console.log(`  • ${r.label}  →  ${r.detail}`));
    console.log();
  }

  process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
