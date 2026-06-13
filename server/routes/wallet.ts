import express from "express";
import { db } from "../firebase";
import { verifyIdToken } from "../middleware/auth";

const router = express.Router();

// GET /api/wallet - Get wallet balance and transactions
router.get("/", verifyIdToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const user = (req as any).user;

    const walletRef = db.collection("wallets").doc(user.uid);
    const walletDoc = await walletRef.get();

    let balance = 0;
    if (walletDoc.exists) {
      balance = walletDoc.data()?.balance || 0;
    } else {
      // Lazy initialize wallet on first check
      await walletRef.set({
        userId: user.uid,
        userEmail: user.email,
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Retrieve transactions
    const txSnap = await walletRef.collection("transactions")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const transactions = txSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
    }));

    res.json({
      balance,
      transactions
    });
  } catch (err: any) {
    console.error("Error retrieving wallet:", err);
    res.status(500).json({ error: "Failed to load wallet information" });
  }
});

// POST /api/wallet/deposit - Deposit virtual funds with payment method options
router.post("/deposit", verifyIdToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready." });
    const { amount, paymentMethod, cardDetails, kokoDetails } = req.body;
    const user = (req as any).user;

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number greater than 0." });
    }

    let referenceText = "Eventra Points Deposit";
    if (paymentMethod === "card") {
      const last4 = cardDetails?.cardNumber ? cardDetails.cardNumber.slice(-4) : "xxxx";
      referenceText = `EP Deposit via Visa/MasterCard (*${last4})`;
    } else if (paymentMethod === "koko") {
      const parentNum = kokoDetails?.phone ? kokoDetails.phone.slice(-4) : "xxxx";
      referenceText = `EP Deposit via Koko Pay (*${parentNum}) - 3 Interest-Free splits`;
    } else {
      referenceText = `EP Deposit via Digital Gateway`;
    }

    console.log(`Processing top-up of ${depositAmount} Eventra Points via ${paymentMethod} for user ${user.uid}`);

    const walletRef = db.collection("wallets").doc(user.uid);

    let updatedBalance = 0;

    await db.runTransaction(async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      let currentBalance = 0;

      if (walletDoc.exists) {
        currentBalance = walletDoc.data()?.balance || 0;
      }

      updatedBalance = currentBalance + depositAmount;

      transaction.set(walletRef, {
        userId: user.uid,
        userEmail: user.email,
        balance: updatedBalance,
        updatedAt: new Date()
      }, { merge: true });

      // Add transaction log
      const txRef = walletRef.collection("transactions").doc();
      transaction.set(txRef, {
        amount: depositAmount,
        type: "deposit",
        paymentMethod,
        reference: referenceText,
        createdAt: new Date()
      });
    });

    res.json({ balance: updatedBalance, message: `${depositAmount.toLocaleString("en-US")} Eventra Points (EP) added securely using ${paymentMethod.toUpperCase()}!` });
  } catch (err: any) {
    console.error("Deposit error:", err);
    res.status(500).json({ error: "Failed to log deposit transaction" });
  }
});

export default router;
