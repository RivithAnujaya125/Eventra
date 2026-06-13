import { Request, Response, NextFunction } from "express";
import { admin, auth, db } from "../firebase";

/**
 * Middleware: verify Firebase ID token from Authorization header.
 * Attaches decoded token to (req as any).user.
 */
export async function verifyIdToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided." });
  }
  const token = header.split(" ")[1];
  try {
    if (!auth) throw new Error("Auth not initialized");
    const decoded = await auth.verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid token." });
  }
}

/**
 * Middleware: verify admin role (must run after verifyIdToken).
 */
export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!db) throw new Error("Firestore not initialized");
    const userUid = (req as any).user.uid;
    const userEmail = (req as any).user.email;
    
    // Bootstrap admin from metadata
    if (userEmail === "anujayakulathunga15@gmail.com" || userEmail === "hexcipher.dev@gmail.com") {
      return next();
    }

    const userRecord = await db.doc(`users/${userUid}`).get();
    if (!userRecord.exists || userRecord.data()?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required." });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: "Server error during admin verification." });
  }
}

/**
 * Middleware: verify event organizer role (must run after verifyIdToken).
 */
export async function isOrganizer(req: Request, res: Response, next: NextFunction) {
  try {
    if (!db) throw new Error("Firestore not initialized");
    const userUid = (req as any).user.uid;
    const userEmail = (req as any).user.email;

    // Bootstrap check: Admin is also allowed to view organizer dashboard if they want,
    // but primarily we check if role is "organizer" OR they are in category_organizers
    const userRecord = await db.doc(`users/${userUid}`).get();
    const dbRole = userRecord.exists ? userRecord.data()?.role : "user";

    const snap = await db.collection("category_organizers")
      .where("organizerUserId", "==", userUid)
      .get();
    
    const isOrganizerRole = dbRole === "organizer" || dbRole === "admin";
    const hasCategoryMapping = snap.size > 0;

    if (!isOrganizerRole && !hasCategoryMapping) {
      return res.status(403).json({ error: "Forbidden: Event Organizer access required." });
    }

    const assignedCategories: string[] = [];
    snap.forEach(doc => {
      const cat = doc.data().category;
      if (cat) assignedCategories.push(cat);
    });

    // If they are admin but have no categories mapped, we can map them to all categories as a convenience or empty
    if (dbRole === "admin" && assignedCategories.length === 0) {
      // Fetch all unique categories from events or category_organizers
      const catsSnap = await db.collection("category_organizers").get();
      catsSnap.forEach(doc => {
        const cat = doc.data().category;
        if (cat && !assignedCategories.includes(cat)) {
          assignedCategories.push(cat);
        }
      });
    }

    (req as any).assignedCategories = assignedCategories;
    next();
  } catch (err) {
    console.error("isOrganizer Middleware Error:", err);
    return res.status(500).json({ error: "Server error during organizer verification." });
  }
}

