import express from "express";
import { db } from "../firebase";
import { verifyIdToken, isAdmin } from "../middleware/auth";
import { verifyPaymentProof } from "../utils/ocr";

const router = express.Router();

// POST /api/registrations — submit registration (auth required)
router.post("/", verifyIdToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const { eventId, name, phone, college, paymentProofUrl, paymentMethod } = req.body;
    const user = (req as any).user;

    if (!eventId || !name || !phone) {
      return res.status(400).json({ error: "eventId, name, and phone are required." });
    }

    // Regex Validation
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(name)) {
      return res.status(400).json({ error: "Name must contain only letters and spaces." });
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: "Phone must be exactly 10 digits." });
    }

    // Check event exists & has capacity
    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) return res.status(404).json({ error: "Event not found." });
    const event = eventDoc.data()!;
    if ((event.registeredCount || 0) >= event.capacity) {
      return res.status(409).json({ error: "Event is full." });
    }

    // Check duplicate
    const existing = await db.collection("registrations")
      .where("eventId", "==", eventId)
      .where("userId", "==", user.uid)
      .get();
    if (!existing.empty) return res.status(409).json({ error: "Already registered." });

    let isWalletPaid = false;
    let finalRegId = "";

    if (event.fee > 0 && paymentMethod === "wallet") {
      try {
        const walletRef = db.collection("wallets").doc(user.uid);
        
        await db.runTransaction(async (transaction) => {
          const walletDoc = await transaction.get(walletRef);
          const currentBalance = walletDoc.exists ? (walletDoc.data()?.balance || 0) : 0;
          if (currentBalance < event.fee) {
            throw new Error("INSUFFICIENT_FUNDS");
          }

          // Read capacity details inside transaction to prevent overbooking
          const eventTransactionDoc = await transaction.get(db.collection("events").doc(eventId));
          const latestEventData = eventTransactionDoc.data() || event;
          if ((latestEventData.registeredCount || 0) >= latestEventData.capacity) {
            throw new Error("EVENT_FULL");
          }

          // Deduct from user wallet balance
          transaction.set(walletRef, {
            balance: currentBalance - event.fee,
            updatedAt: new Date()
          }, { merge: true });

          // Log payment transaction log
          const txRef = walletRef.collection("transactions").doc();
          transaction.set(txRef, {
            amount: -event.fee,
            type: "payment",
            reference: `Pass purchase: ${event.title}`,
            createdAt: new Date()
          });

          // Create approved registration
          const regRef = db.collection("registrations").doc();
          finalRegId = regRef.id;
          transaction.set(regRef, {
            eventId,
            eventTitle: event.title,
            userId: user.uid,
            userEmail: user.email,
            name, 
            phone,
            college: college || "",
            paymentProofUrl: null,
            paymentMethod: "wallet",
            status: "approved",
            createdAt: new Date(),
            aiVerification: {
              status: "verified",
              amountPaid: event.fee,
              transactionId: txRef.id,
              confidence: 1.0,
              isPotentiallyFraudulent: false,
              reason: "Paid in full utilizing virtual wallet balance.",
              verifiedAt: new Date()
            }
          });

          // Increment registeredCount
          transaction.update(db.collection("events").doc(eventId), {
            registeredCount: (latestEventData.registeredCount || 0) + 1,
          });
        });

        isWalletPaid = true;
      } catch (transError: any) {
        if (transError.message === "INSUFFICIENT_FUNDS") {
          return res.status(400).json({ error: "Insufficient Eventra Points (EP) balance. Please visit the 'My Wallet' section of your account profile to acquire points." });
        }
        if (transError.message === "EVENT_FULL") {
          return res.status(409).json({ error: "This event is now fully booked." });
        }
        throw transError;
      }
    }

    if (!isWalletPaid) {
      // Standard flow (either free event or receipt upload)
      const ref = await db.collection("registrations").add({
        eventId,
        eventTitle: event.title,
        userId: user.uid,
        userEmail: user.email,
        name, 
        phone,
        college: college || "",
        paymentProofUrl: paymentProofUrl || null,
        paymentMethod: event.fee > 0 ? "receipt" : "free",
        status: event.fee > 0 ? "pending" : "approved",
        createdAt: new Date(),
      });
      finalRegId = ref.id;

      // Increment registeredCount
      await db.collection("events").doc(eventId).update({
        registeredCount: (event.registeredCount || 0) + 1,
      });

      // Run automated OCR verification in the background
      if (event.fee > 0 && paymentProofUrl) {
        verifyPaymentProof(paymentProofUrl, event.fee)
          .then(async (result) => {
            if (db) {
              await db.collection("registrations").doc(ref.id).update({
                status: result.isValid ? "approved" : "pending",
                aiVerification: {
                  status: result.isValid ? "verified" : "failed",
                  amountPaid: result.amountPaid,
                  transactionId: result.transactionId,
                  confidence: result.confidence,
                  isPotentiallyFraudulent: result.isPotentiallyFraudulent,
                  reason: result.reason,
                  verifiedAt: new Date()
                }
              });
              console.log(`Registration ${ref.id} AI evaluation completed. Auto-approved: ${result.isValid}`);
            }
          })
          .catch(err => console.error("Automated AI verification error:", err));
      }
    }

    res.status(201).json({ id: finalRegId, status: (event.fee > 0 && !isWalletPaid) ? "pending" : "approved" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Registration failed." });
  }
});

// GET /api/registrations/mine — user's own registrations
router.get("/mine", verifyIdToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const user = (req as any).user;
    const snap = await db.collection("registrations")
      .where("userId", "==", user.uid)
      .get();
    
    const registrations = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    
    // Sort in-memory to bypass standard Firestore composite index limitations
    registrations.sort((a, b) => {
      const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
      const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
      return timeB - timeA;
    });
    
    // Resolve matching event details to prevent empty fields in dashboard view
    const eventIds = Array.from(new Set(registrations.map(r => r.eventId)));
    const eventsMap: Record<string, any> = {};
    
    if (eventIds.length > 0) {
      const eventSnaps = await Promise.all(
        eventIds.map(id => db.collection("events").doc(id).get())
      );
      eventSnaps.forEach(docSnap => {
        if (docSnap.exists) {
          eventsMap[docSnap.id] = docSnap.data();
        }
      });
    }
    
    const populated = registrations.map(r => {
      const event = eventsMap[r.eventId] || {};
      return {
        ...r,
        eventTitle: event.title || r.eventTitle || "Unknown Event",
        eventDate: event.date || null,
        eventLocation: event.location || "N/A"
      };
    });

    res.json(populated);
  } catch (err: any) {
    console.error("Error populating registrations:", err);
    res.status(500).json({ error: err.message || "Failed to fetch registrations." });
  }
});

// GET /api/registrations — all registrations (admin only)
router.get("/", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const { eventId, status } = req.query;
    let q: any = db.collection("registrations").orderBy("createdAt", "desc");
    if (eventId) q = q.where("eventId", "==", eventId);
    if (status) q = q.where("status", "==", status);
    const snap = await q.get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch registrations." });
  }
});

// PATCH /api/registrations/:id/status — approve or reject (admin only)
router.patch("/:id/status", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const { status } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }
    await db.collection("registrations").doc(req.params.id).update({ status });
    res.json({ message: `Registration ${status}.` });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to update status." });
  }
});

// POST /api/registrations/:id/verify — manually run AI payment proof verification (admin only)
router.post("/:id/verify", verifyIdToken, isAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    
    const doc = await db.collection("registrations").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Registration not found." });
    }
    
    const reg = doc.data()!;
    if (!reg.paymentProofUrl) {
      return res.status(400).json({ error: "No payment proof uploaded for this registration." });
    }
    
    // Fetch associated event to get the fee
    const eventDoc = await db.collection("events").doc(reg.eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Associated event not found." });
    }
    const event = eventDoc.data()!;
    
    // Evaluate payment proof using Gemini AI
    const result = await verifyPaymentProof(reg.paymentProofUrl, event.fee || 0);
    
    const updatedStatus = result.isValid ? "approved" : "pending";
    const verificationPayload = {
      status: result.isValid ? "verified" : "failed",
      amountPaid: result.amountPaid,
      transactionId: result.transactionId,
      confidence: result.confidence,
      isPotentiallyFraudulent: result.isPotentiallyFraudulent,
      reason: result.reason,
      verifiedAt: new Date()
    };

    await db.collection("registrations").doc(req.params.id).update({
      status: updatedStatus,
      aiVerification: verificationPayload
    });

    res.json({ 
      success: true, 
      status: updatedStatus,
      aiVerification: verificationPayload
    });
  } catch (err: any) {
    console.error("Manual AI payment proof verification query failed:", err);
    res.status(500).json({ error: `Manual verification failed: ${err.message || err}` });
  }
});

// GET /api/registrations/:id — single registration (auth required, owner or admin)
router.get("/:id", verifyIdToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const user = (req as any).user;
    const doc = await db.collection("registrations").doc(req.params.id).get();
    
    if (!doc.exists) return res.status(404).json({ error: "Registration not found." });
    const registration = doc.data()!;
    
    // Check ownership or admin
    if (registration.userId !== user.uid) {
      const userSnap = await db.collection("users").doc(user.uid).get();
      if (!userSnap.exists || userSnap.data()?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Not your ticket." });
      }
    }
    
    // Fetch event details to include in ticket
    const eventSnap = await db.collection("events").doc(registration.eventId).get();
    const event = eventSnap.data() || {};

    res.json({ 
      id: doc.id, 
      ...registration,
      eventTitle: event.title,
      eventDate: event.date,
      eventLocation: event.location
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch registration." });
  }
});

export default router;
