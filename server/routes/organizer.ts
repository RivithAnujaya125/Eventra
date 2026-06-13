import { Router, Request, Response } from "express";
import { db } from "../firebase";
import { verifyIdToken, isOrganizer } from "../middleware/auth";

const router = Router();

// Add organizer registration endpoint (requires only verifyIdToken, not isOrganizer)
router.post("/register", verifyIdToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    
    const uid = (req as any).user.uid;
    const email = (req as any).user.email || "";
    const { name, businessName, phone, category } = req.body;
    
    if (!name || !businessName || !phone || !category) {
      return res.status(400).json({ error: "All profile fields are required for organizer setup." });
    }
    
    // Save user doc as organizer
    await db.collection("users").doc(uid).set({
      name,
      email,
      role: "organizer",
      businessName,
      phone,
      createdAt: new Date()
    });
    
    // Map their organizer profile to the specified category
    await db.collection("category_organizers").doc(category).set({
      category,
      organizationName: businessName,
      organizerName: name,
      organizerEmail: email,
      organizerPhone: phone,
      organizerUserId: uid,
      updatedAt: new Date()
    });
    
    res.json({ success: true, message: "Organizer account fully registered and category assigned." });
  } catch (error: any) {
    console.error("Error registering organizer:", error);
    res.status(500).json({ error: error.message || "Failed to register organizer profile" });
  }
});

// Hook setup wrapper: ensure that at least one category is assigned or return an error/warning
function getAssigns(req: Request) {
  return (req as any).assignedCategories || [];
}

// 1. GET /api/organizer/assigned-categories
router.get("/assigned-categories", verifyIdToken, isOrganizer, async (req, res) => {
  try {
    const categories = getAssigns(req);
    // Let's also fetch detailed info about their categories from category_organizers
    if (!db) return res.status(503).json({ error: "Database not ready." });
    
    const uid = (req as any).user.uid;
    const snap = await db.collection("category_organizers")
      .where("organizerUserId", "==", uid)
      .get();
    
    const details = snap.docs.map(doc => doc.data());
    res.json({ categories, details });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load assigned categories." });
  }
});

// 2. GET /api/organizer/stats
router.get("/stats", verifyIdToken, isOrganizer, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const categories = getAssigns(req);
    
    if (categories.length === 0) {
      return res.json({
        totalEvents: 0,
        totalRegistrations: 0,
        approvedRegistrations: 0,
        pendingRegistrations: 0,
        grossSales: 0,
        organizerShare: 0,
        platformCommission: 0,
        checkedInCount: 0
      });
    }

    // Load all events in these categories
    const eventsSnap = await db.collection("events")
      .where("category", "in", categories)
      .get();
    
    const events = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const eventIds = events.map(e => e.id);

    if (eventIds.length === 0) {
      return res.json({
        totalEvents: events.length,
        totalRegistrations: 0,
        approvedRegistrations: 0,
        pendingRegistrations: 0,
        grossSales: 0,
        organizerShare: 0,
        platformCommission: 0,
        checkedInCount: 0
      });
    }

    // Load registrations for these eventIds
    // Because 'in' query has 30 limit, we chunk if needed, but standard size usually < 10 for basic use. Let's do a clean load
    let registrations: any[] = [];
    const chunkArray = (arr: string[], size: number) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const eventIdChunks = chunkArray(eventIds, 10);
    for (const chunk of eventIdChunks) {
      const regsSnap = await db.collection("registrations")
        .where("eventId", "in", chunk)
        .get();
      regsSnap.docs.forEach(doc => {
        registrations.push({ id: doc.id, ...doc.data() });
      });
    }

    let grossSales = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let checkedInCount = 0;

    registrations.forEach(reg => {
      const matchingEvent = events.find(e => e.id === reg.eventId);
      const fee = Number(matchingEvent?.fee) || 0;

      if (reg.status === "approved") {
        approvedCount++;
        grossSales += fee;
        if (reg.checkedIn) {
          checkedInCount++;
        }
      } else if (reg.status === "pending") {
        pendingCount++;
      }
    });

    const platformCommission = grossSales * 0.20;
    const organizerShare = grossSales * 0.80;

    res.json({
      totalEvents: events.length,
      totalRegistrations: registrations.length,
      approvedRegistrations: approvedCount,
      pendingRegistrations: pendingCount,
      grossSales,
      organizerShare,
      platformCommission,
      checkedInCount
    });
  } catch (err: any) {
    console.error("Organizer Stats Error:", err);
    res.status(500).json({ error: err.message || "Failed to load stats." });
  }
});

// 3. GET /api/organizer/events - list events under assigned categories
router.get("/events", verifyIdToken, isOrganizer, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const categories = getAssigns(req);
    
    if (categories.length === 0) {
      return res.json([]);
    }

    const eventsSnap = await db.collection("events")
      .where("category", "in", categories)
      .get();
    
    const events = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    // Sort in memory by date
    events.sort((a: any, b: any) => {
      const timeA = a.date?._seconds ? a.date._seconds * 1000 : new Date(a.date).getTime();
      const timeB = b.date?._seconds ? b.date._seconds * 1000 : new Date(b.date).getTime();
      return timeA - timeB;
    });

    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch organizer events." });
  }
});

// 4. POST /api/organizer/events - create event under assigned category
router.post("/events", verifyIdToken, isOrganizer, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const categories = getAssigns(req);
    const { title, description, date, location, category, fee, capacity, imageUrl } = req.body;

    if (!title || !date || !location || !category) {
      return res.status(400).json({ error: "Title, date, location, and category are required." });
    }

    if (!categories.includes(category)) {
      return res.status(403).json({ error: `Forbidden: You are not an exclusive organizer for category: ${category}` });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format." });
    }

    const ref = await db.collection("events").add({
      title,
      description: description || "",
      date: parsedDate,
      location,
      category,
      fee: Number(fee) || 0,
      capacity: Number(capacity) || 50,
      registeredCount: 0,
      imageUrl: imageUrl || "",
      createdAt: new Date(),
    });

    res.status(201).json({ id: ref.id, message: "Event created successfully inside your exclusive category." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create event." });
  }
});

// 5. PUT /api/organizer/events/:id - update event under assigned category
router.put("/events/:id", verifyIdToken, isOrganizer, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const categories = getAssigns(req);
    
    const docRef = db.collection("events").doc(req.params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Event not found." });
    }

    const originalCategory = docSnap.data()?.category;
    if (!categories.includes(originalCategory)) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to edit events in this category." });
    }

    // If they want to change the category, make sure the target category is also in their list
    if (req.body.category && !categories.includes(req.body.category)) {
      return res.status(403).json({ error: `Forbidden: You are not authorized to transfer events to category: ${req.body.category}` });
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

    await docRef.update(updates);
    res.json({ message: "Event updated successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update event." });
  }
});

// 6. DELETE /api/organizer/events/:id - delete event under assigned category
router.delete("/events/:id", verifyIdToken, isOrganizer, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const categories = getAssigns(req);
    
    const docRef = db.collection("events").doc(req.params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Event not found." });
    }

    const originalCategory = docSnap.data()?.category;
    if (!categories.includes(originalCategory)) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to delete events in this category." });
    }

    await docRef.delete();
    res.json({ message: "Event deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete event." });
  }
});

// 7. GET /api/organizer/registrations - list all registrants for organizer's events
router.get("/registrations", verifyIdToken, isOrganizer, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const categories = getAssigns(req);

    if (categories.length === 0) {
      return res.json([]);
    }

    // Load events
    const eventsSnap = await db.collection("events")
      .where("category", "in", categories)
      .get();
    
    const events = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const eventIds = events.map(e => e.id);

    if (eventIds.length === 0) {
      return res.json([]);
    }

    let registrations: any[] = [];
    const chunkArray = (arr: string[], size: number) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const eventIdChunks = chunkArray(eventIds, 10);
    for (const chunk of eventIdChunks) {
      const regsSnap = await db.collection("registrations")
        .where("eventId", "in", chunk)
        .get();
      regsSnap.docs.forEach(doc => {
        const data = doc.data();
        const ev = events.find(e => e.id === data.eventId);
        registrations.push({ 
          id: doc.id, 
          ...data,
          eventTitle: ev?.title || data.eventTitle || "Unknown Event",
          eventCategory: ev?.category || ""
        });
      });
    }

    // Sort by registration date
    registrations.sort((a, b) => {
      const timeA = a.createdAt?._seconds ? a.createdAt._seconds * 1000 : new Date(a.createdAt).getTime();
      const timeB = b.createdAt?._seconds ? b.createdAt._seconds * 1000 : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    res.json(registrations);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch registrations." });
  }
});

// 8. PATCH /api/organizer/registrations/:id/status - approve/reject receipt
router.patch("/registrations/:id/status", verifyIdToken, isOrganizer, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const categories = getAssigns(req);
    const { status } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const regRef = db.collection("registrations").doc(req.params.id);
    const regSnap = await regRef.get();

    if (!regSnap.exists) {
      return res.status(404).json({ error: "Registration not found." });
    }

    const regData = regSnap.data()!;
    // Confirm event category permissions
    const eventDoc = await db.collection("events").doc(regData.eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Associated event not found." });
    }

    if (!categories.includes(eventDoc.data()?.category)) {
      return res.status(403).json({ error: "Forbidden: You do not own this category." });
    }

    await regRef.update({ status });
    res.json({ message: `Registration successfully updated to ${status}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update registration status." });
  }
});

// 9. POST /api/organizer/registrations/:id/checkin - check in attendee for event
router.post("/registrations/:id/checkin", verifyIdToken, isOrganizer, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const categories = getAssigns(req);

    const docRef = db.collection("registrations").doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Ticket ID invalid or registration not found." });
    }

    const reg = docSnap.data()!;
    
    // Check if the event matches organizer categories
    const eventDoc = await db.collection("events").doc(reg.eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Associated event not found." });
    }

    if (!categories.includes(eventDoc.data()?.category)) {
      return res.status(403).json({ error: "Forbidden: You do not own this category." });
    }

    if (reg.status !== "approved") {
      return res.status(400).json({ error: "Payment verification pending. Ticket must be APPROVED before check-in is permitted." });
    }

    if (reg.checkedIn) {
      return res.status(409).json({ 
        error: "Duplicate entry blocked!", 
        checkedInAt: reg.checkedInAt, 
        attendeeName: reg.name,
        eventTitle: reg.eventTitle
      });
    }

    const checkInTime = new Date();
    await docRef.update({
      checkedIn: true,
      checkedInAt: checkInTime
    });

    // Create entry log document
    await db.collection("entry_logs").add({
      registrationId: req.params.id,
      eventId: reg.eventId,
      eventTitle: reg.eventTitle || eventDoc.data()?.title,
      attendeeName: reg.name,
      checkedInAt: checkInTime,
      gateOperator: (req as any).user.email || "Organizer Terminal",
      status: "success"
    });

    res.json({ 
      success: true, 
      message: "Attendance verified successfully inside organizer circle.", 
      checkedInAt: checkInTime,
      attendeeName: reg.name,
      eventTitle: reg.eventTitle || eventDoc.data()?.title
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to check in registration." });
  }
});

export default router;
