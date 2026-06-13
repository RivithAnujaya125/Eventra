import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import https from "https";
import fs from "fs";
import path from "path";
import eventRoutes from "./routes/events";
import registrationRoutes from "./routes/registrations";
import adminRoutes from "./routes/admin";
import uploadRoutes from "./routes/upload";
import assistantRoutes from "./routes/assistant";
import walletRoutes from "./routes/wallet";
import wishlistRoutes from "./routes/wishlist";
import organizerRoutes from "./routes/organizer";
import { seedDatabase } from "./seed";

// Load environment variables
dotenv.config();

const app = express();

// Initialize DB seed
seedDatabase().catch(err => console.error("Database seed failed:", err));

// Middleware
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Debug logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.get("/api/ping", (req, res) => res.json({ status: "pong", node_env: process.env.NODE_ENV }));

app.get("/api/image-proxy", (req, res) => {
  const { name } = req.query; // e.g. ?name=banners/xyz.jpg
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Missing name query parameter" });
  }

  // Load storage bucket configuration dynamically from configuration json
  let storageBucket = "eventra-598f6.appspot.com";
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.storageBucket) {
        storageBucket = config.storageBucket;
      }
    }
  } catch (e) {
    console.error("Failed to read storageBucket from configuration:", e);
  }

  const url = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(name)}?alt=media`;

  https.get(url, (stream) => {
    res.statusCode = stream.statusCode || 200;
    for (const [k, v] of Object.entries(stream.headers)) {
      if (v) res.setHeader(k, v);
    }
    stream.pipe(res);
  }).on("error", (e) => {
    console.error("Image-proxy error:", e);
    res.status(502).json({ error: "Failed to fetch image from storage" });
  });
});

console.log("Registering /api/events");
app.use("/api/events", eventRoutes);

console.log("Registering /api/registrations");
app.use("/api/registrations", registrationRoutes);

console.log("Registering /api/admin");
app.use("/api/admin", adminRoutes);

console.log("Registering /api/upload");
app.use("/api/upload", uploadRoutes);

console.log("Registering /api/assistant");
app.use("/api/assistant", assistantRoutes);

console.log("Registering /api/wallet");
app.use("/api/wallet", walletRoutes);

console.log("Registering /api/wishlist");
app.use("/api/wishlist", wishlistRoutes);

console.log("Registering /api/organizer");
app.use("/api/organizer", organizerRoutes);

// Health check (must be before the wildcard fallback)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Fallback for API routes that didn't match anything above
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API route not found", path: req.path });
});

export default app;
