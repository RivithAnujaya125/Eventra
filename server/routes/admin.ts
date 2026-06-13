import { Router } from "express";
import { db } from "../firebase";
import { verifyIdToken, isAdmin } from "../middleware/auth";

const router = Router();

// Get overall stats (Admin only)
router.get("/stats", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "DB not initialized" });

    const [eventsSnap, usersSnap, regsSnap] = await Promise.all([
      db.collection("events").get(),
      db.collection("users").get(),
      db.collection("registrations").get()
    ]);

    const stats = {
      totalEvents: eventsSnap.size,
      totalUsers: usersSnap.size,
      totalRegistrations: regsSnap.size,
      pendingRegistrations: regsSnap.docs.filter(d => d.data().status === "pending").length
    };

    res.json(stats);
  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Get all registrations with event details (Admin only)
router.get("/registrations", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "DB not initialized" });

    const regsSnap = await db.collection("registrations").orderBy("createdAt", "desc").get();
    const registrations = await Promise.all(regsSnap.docs.map(async (doc) => {
      const data = doc.data();
      let eventTitle = "Unknown Event";
      try {
        const eventDoc = await db!.collection("events").doc(data.eventId).get();
        if (eventDoc.exists) eventTitle = eventDoc.data()?.title;
      } catch {}
      
      return { id: doc.id, ...data, eventTitle };
    }));

    res.json(registrations);
  } catch (error) {
    console.error("Registrations Error:", error);
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

// POST /api/admin/registrations/:id/refund - refund payment (Admin only)
router.post("/registrations/:id/refund", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    
    const docRef = db.collection("registrations").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Registration not found." });
    }

    const reg = doc.data()!;
    if (reg.status === "refunded") {
      return res.status(400).json({ error: "Registration already refunded." });
    }

    await docRef.update({
      status: "refunded",
      refundedAt: new Date()
    });

    // Optionally decrement registeredCount of associated event to free place
    try {
      const eventDocRef = db.collection("events").doc(reg.eventId);
      const eventDoc = await eventDocRef.get();
      if (eventDoc.exists) {
        const currentCount = eventDoc.data()?.registeredCount || 1;
        await eventDocRef.update({
          registeredCount: Math.max(0, currentCount - 1)
        });
      }
    } catch (eventErr) {
      console.error("Failed to decrement event counter during refund:", eventErr);
    }

    res.json({ success: true, message: "Payment refunded successfully & slot cancelled." });
  } catch (error: any) {
    console.error("Refund error:", error);
    res.status(500).json({ error: `Refund operation failed: ${error.message || error}` });
  }
});

// POST /api/admin/registrations/:id/checkin - check in attendee & log entry (Admin only)
router.post("/registrations/:id/checkin", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    
    const docRef = db.collection("registrations").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(444).json({ error: "Ticket ID invalid or registration not found." });
    }

    const reg = doc.data()!;
    if (reg.status !== "approved") {
      return res.status(400).json({ error: "Payment verification pending. Ticket must be APPROVED before entry is permitted." });
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
      eventTitle: reg.eventTitle,
      attendeeName: reg.name,
      checkedInAt: checkInTime,
      gateOperator: (req as any).user.email || "Gate Terminal",
      status: "success"
    });

    res.json({ 
      success: true, 
      message: "Attendance verified successfully.", 
      checkedInAt: checkInTime,
      attendeeName: reg.name,
      eventTitle: reg.eventTitle
    });
  } catch (error: any) {
    console.error("Check-in error:", error);
    res.status(500).json({ error: `Check-in operation failed: ${error.message || error}` });
  }
});

// GET /api/admin/entry-logs - fetch entrance/check-in logs (Admin only)
router.get("/entry-logs", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const snap = await db.collection("entry_logs").orderBy("checkedInAt", "desc").limit(100).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch event check-in records." });
  }
});

// GET /api/admin/gateway - retrieve current simulated payment configurations
router.get("/gateway", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const configDoc = await db.collection("config").doc("gateway").get();
    if (!configDoc.exists) {
      // Return defaults if not set
      return res.json({
        mode: "test",
        provider: "Direct Bank",
        sandboxKey: "pk_test_sample_129481",
        taxRate: 15,
        serviceFee: 300,
        currencySymbol: "LKR"
      });
    }
    res.json(configDoc.data());
  } catch (err: any) {
    res.status(500).json({ error: `Gateway config fetch failed: ${err.message}` });
  }
});

// POST /api/admin/gateway - update current simulated payment configurations
router.post("/gateway", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const payload = req.body;
    await db.collection("config").doc("gateway").set(payload, { merge: true });
    res.json({ success: true, message: "Payment setup and taxation adjustments saved successfully." });
  } catch (err: any) {
    res.status(500).json({ error: `Gateway save failed: ${err.message}` });
  }
});

// GET /api/admin/organizer-requests - retrieve all inquiries (Admin only)
router.get("/organizer-requests", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const snap = await db.collection("organizer_requests").orderBy("createdAt", "desc").get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load requests" });
  }
});

// POST /api/admin/organizer-requests - submit an organizer request (auth required for any student user)
router.post("/organizer-requests", verifyIdToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const { name, email, phone, organizationName, proposedEventCategory, proposedEventTitle, proposedEventDescription, proposedEventFee, proposedEventCapacity } = req.body;
    const userUid = (req as any).user.uid;

    if (!name || !email || !phone || !organizationName || !proposedEventCategory) {
      return res.status(400).json({ error: "Contact name, email, phone, organization, and category are required." });
    }

    const ref = await db.collection("organizer_requests").add({
      userId: userUid,
      name,
      email,
      phone,
      organizationName,
      proposedEventCategory,
      proposedEventTitle: proposedEventTitle || "",
      proposedEventDescription: proposedEventDescription || "",
      proposedEventFee: Number(proposedEventFee) || 0,
      proposedEventCapacity: Number(proposedEventCapacity) || 100,
      status: "pending",
      createdAt: new Date()
    });

    res.status(201).json({ id: ref.id, message: "Your organizer request and event proposal have been submitted for Admin review." });
  } catch (err: any) {
    console.error("POST /organizer-requests error:", err);
    res.status(500).json({ error: err.message || "Failed to submit proposal." });
  }
});

// POST /api/admin/organizer-requests/:id/status - approve or reject proposal (Admin only)
router.post("/organizer-requests/:id/status", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const { status } = req.body;
    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status parameters" });
    }

    const docRef = db.collection("organizer_requests").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Request not found" });
    }
    const requestData = doc.data()!;
    await docRef.update({ status, updatedAt: new Date() });

    if (status === "approved") {
      // Map this organizer to their proposed category
      await db.collection("category_organizers").doc(requestData.proposedEventCategory).set({
        category: requestData.proposedEventCategory,
        organizationName: requestData.organizationName,
        organizerName: requestData.name,
        organizerEmail: requestData.email,
        organizerPhone: requestData.phone,
        organizerUserId: requestData.userId,
        updatedAt: new Date()
      });

      // Optionally auto-create their proposed event
      if (requestData.proposedEventTitle) {
        const parsedDate = new Date();
        parsedDate.setDate(parsedDate.getDate() + 14); // 2 weeks default
        await db.collection("events").add({
          title: requestData.proposedEventTitle,
          description: requestData.proposedEventDescription || `Organized workshop hosted by ${requestData.organizationName}`,
          date: parsedDate,
          location: "Main Auditorium",
          category: requestData.proposedEventCategory,
          fee: Number(requestData.proposedEventFee) || 0,
          capacity: Number(requestData.proposedEventCapacity) || 100,
          registeredCount: 0,
          imageUrl: "",
          createdAt: new Date(),
        });
      }
    }

    res.json({ success: true, message: `Request successfully ${status}.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update request status" });
  }
});

// GET /api/admin/category-organizers - load category assignments (Auth users)
router.get("/category-organizers", verifyIdToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const snap = await db.collection("category_organizers").get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch catalog structures" });
  }
});

// POST /api/admin/category-organizers/manual - manually update catalog mapping (Admin only)
router.post("/category-organizers/manual", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const { category, organizationName, organizerName, organizerEmail, organizerPhone, organizerUserId } = req.body;
    if (!category || !organizationName || !organizerEmail) {
      return res.status(400).json({ error: "Category, organization, and contact email are required." });
    }

    await db.collection("category_organizers").doc(category).set({
      category,
      organizationName,
      organizerName: organizerName || "",
      organizerEmail,
      organizerPhone: organizerPhone || "",
      organizerUserId: organizerUserId || "",
      updatedAt: new Date()
    });

    res.json({ success: true, message: `Successfully mapped ${organizationName} to ${category} category.` });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to map category organizer" });
  }
});

// DELETE /api/admin/category-organizers/:id - remove mapping manually (Admin only)
router.delete("/category-organizers/:id", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    await db.collection("category_organizers").doc(req.params.id).delete();
    res.json({ success: true, message: "Mapping deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete mapping" });
  }
});

export default router;
