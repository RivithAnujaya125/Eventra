import express from "express";
import { db } from "../firebase";
import { verifyIdToken, isAdmin } from "../middleware/auth";

const router = express.Router();

// GET /api/events — list all events (public)
router.get("/", async (req, res) => {
  try {
    if (!db) {
      console.warn("[Events] Database not ready.");
      return res.status(503).json({ error: "Database not ready." });
    }
    console.log("[Events] Fetching list...");
    const snap = await db.collection("events").orderBy("date", "asc").get();
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(events);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch events." });
  }
});

// GET /api/events/:id — single event (public)
router.get("/:id", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const doc = await db.collection("events").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Event not found." });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch event." });
  }
});

// POST /api/events — create event (admin only)
router.post("/", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const { title, description, date, location, category, fee, capacity, imageUrl } = req.body;
    if (!title || !date || !location) {
      return res.status(400).json({ error: "title, date, and location are required." });
    }
    
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format specified. Please capture a valid calendar format." });
    }

    const ref = await db.collection("events").add({
      title,
      description: description || "",
      date: parsedDate,
      location,
      category: category || "General",
      fee: Number(fee) || 0,
      capacity: Number(capacity) || 50,
      registeredCount: 0,
      imageUrl: imageUrl || "",
      createdAt: new Date(),
    });
    res.status(201).json({ id: ref.id, message: "Event created." });
  } catch (err: any) {
    console.error("POST /api/events Error:", err);
    res.status(500).json({ error: err.message || "Failed to create event." });
  }
});

// PUT /api/events/:id — update event (admin only)
router.put("/:id", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    
    // Check if event exists first
    const eventDoc = await db.collection("events").doc(req.params.id).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found." });
    }

    const allowed = ["title", "description", "date", "location", "category", "fee", "capacity", "imageUrl"];
    const updates: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === "date") {
          const parsedDate = new Date(req.body[key]);
          if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ error: "Invalid date format specified." });
          }
          updates[key] = parsedDate;
        } else if (key === "fee") {
          const parsedFee = Number(req.body[key]);
          updates[key] = isNaN(parsedFee) ? 0 : parsedFee;
        } else if (key === "capacity") {
          const parsedCapacity = Number(req.body[key]);
          updates[key] = isNaN(parsedCapacity) || parsedCapacity < 1 ? 50 : parsedCapacity;
        } else {
          updates[key] = req.body[key];
        }
      }
    }

    await db.collection("events").doc(req.params.id).update(updates);
    res.json({ message: "Event updated successfully." });
  } catch (err: any) {
    console.error("PUT /api/events/:id Error:", err);
    res.status(500).json({ error: err.message || "Failed to update event." });
  }
});

// DELETE /api/events/:id — delete event (admin only)
router.delete("/:id", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    await db.collection("events").doc(req.params.id).delete();
    res.json({ message: "Event deleted." });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to delete event." });
  }
});

export default router;
