import express from "express";
import { db } from "../firebase";
import { verifyIdToken } from "../middleware/auth";

const router = express.Router();

// GET /api/wishlist - Get all events wishlisted by the authenticated user
router.get("/", verifyIdToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const user = (req as any).user;

    const snap = await db.collection("wishlists")
      .where("userId", "==", user.uid)
      .get();

    const wishlistDocs = snap.docs.map(doc => doc.data());
    if (wishlistDocs.length === 0) {
      return res.json([]);
    }

    const eventIds = wishlistDocs.map(item => item.eventId);
    // Fetch all unique events in batches of 30 or simply map them from the DB
    const eventsPromise = eventIds.map(async (id: string) => {
      const doc = await db.collection("events").doc(id).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    });

    const events = (await Promise.all(eventsPromise)).filter(e => e !== null);

    res.json(events);
  } catch (err: any) {
    console.error("Error fetching wishlist:", err);
    res.status(500).json({ error: "Failed to fetch wishlist items." });
  }
});

// GET /api/wishlist/check/:eventId - Check if a single event is wishlisted
router.get("/check/:eventId", verifyIdToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const user = (req as any).user;
    const { eventId } = req.params;

    const snap = await db.collection("wishlists")
      .where("userId", "==", user.uid)
      .where("eventId", "==", eventId)
      .limit(1)
      .get();

    res.json({ wishlisted: !snap.empty });
  } catch (err: any) {
    console.error("Error checking wishlist status:", err);
    res.status(500).json({ error: "Failed to verify wishlist status." });
  }
});

// POST /api/wishlist/toggle - Toggle wishlist status for an event (add or remove)
router.post("/toggle", verifyIdToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const user = (req as any).user;
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required." });
    }

    // Verify event exists
    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found." });
    }

    const snap = await db.collection("wishlists")
      .where("userId", "==", user.uid)
      .where("eventId", "==", eventId)
      .limit(1)
      .get();

    if (!snap.empty) {
      // Already wishlisted, so remove it
      const docId = snap.docs[0].id;
      await db.collection("wishlists").doc(docId).delete();
      return res.json({ wishlisted: false, message: "Removed from your wishlist." });
    } else {
      // Not wishlisted, so add it
      await db.collection("wishlists").add({
        userId: user.uid,
        eventId,
        createdAt: new Date()
      });
      return res.json({ wishlisted: true, message: "Added to your wishlist!" });
    }
  } catch (err: any) {
    console.error("Error toggling wishlist status:", err);
    res.status(500).json({ error: "Failed to update wishlist." });
  }
});

export default router;
