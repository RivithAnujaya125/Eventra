import express from "express";
import { db } from "../firebase";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const router = express.Router();

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// POST /api/assistant/chat
router.post("/chat", async (req, res) => {
  try {
    const { message, history, username } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'message' in request body." });
    }

    // 1. Fetch real events to give the AI real-time awareness
    let eventsList = "No active events are currently scheduled.";
    if (db) {
      try {
        const eventsSnap = await db.collection("events").orderBy("date", "asc").get();
        if (!eventsSnap.empty) {
          eventsList = eventsSnap.docs
            .map((doc) => {
              const data = doc.data();
              const dateStr = data.date && data.date.toDate 
                ? data.date.toDate().toDateString() 
                : new Date(data.date).toDateString();
              const price = data.fee ? `LKR ${data.fee.toLocaleString()}` : "Free Admission";
              const slots = (data.capacity || 0) - (data.registeredCount || 0);
              return `- "${data.title}" [ID: ${doc.id}]\n  • Date: ${dateStr}\n  • Location: ${data.location}\n  • Price: ${price}\n  • Category: ${data.category || "General"}\n  • Seats remaining: ${slots > 0 ? slots : "Sold Out"}`;
            })
            .join("\n\n");
        }
      } catch (err) {
        console.error("Failed to query events for assistant context:", err);
      }
    }

    // 2. Build the System Instruction to guide the AI
    const systemInstruction = `You are the Eventra Virtual Assistant, an AI support agent dedicated to helping users register, book, pay, and resolve problems in the Eventra EventPass application.

Our platform (Eventra) features:
- Event Browsing: Users can explore events, categories, locations, and details.
- Event Booking: Users register for an event. If the event has a ticket price (fee > 0), they must pay via direct bank/slip transfer or automated gateway.
- Ticket Page: Upon registering (or paying), a dynamic QR code Ticket is generated.
- Mobile/Gate Entry scanning: Event organizers scan QR Pass tickets to grant admission at the venues, logging the exact entrance of the users instantly.
- AI OCR slip checking: Users upload a screenshot or photo of their payment bank receipt. The backend validates it.

Here is the current real-time listing of active events scheduled on Eventra:
${eventsList}

GUIDELINES FOR YOUR BEHAVIOR:
1. Always be polite, positive, welcoming, and concise in your answers.
2. Format your responses with clean typography, using bullet points and markdown bold text to make answers scannable.
3. If a user asks about what events are available, fetch from the listed active events above. Highlight event dates, prices, and locations. Suggest they register via the homepage or selection.
4. If a user asks about payment slips, instruct them to upload an image of their payment receipt. Let them know our automated OCR processor will analyze it to verify bank transaction details.
5. Do not make up mock events that are not in the list. If they ask about events that do not match, offer to guide them to check other items on our Homepage.
6. The user chatting with you may be named: ${username || "Guest User"}. Address them warmly.
7. Keep answers straightforward. Do NOT expose internal code, database schema, or technical backend structures.`;

    // 3. Setup Gemini API Client (Lazy Init)
    const ai = getGeminiClient();

    // 4. Format Content History for @google/genai SDK
    // The history parameter is expected of format: { role: 'user' | 'model', content: string }
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((turn: any) => {
        if ((turn.role === "user" || turn.role === "model") && turn.content) {
          contents.push({
            role: turn.role,
            parts: [{ text: turn.content }],
          });
        }
      });
    }

    // Append current user message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // 5. Query the model
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I am currently unable to provide a response. Please try again shortly.";

    return res.json({ reply });
  } catch (error: any) {
    console.error("AI Assistant Endpoint Error:", error);
    
    // If the error is missing API key specifically, send a gentle message
    if (error.message && error.message.includes("GEMINI_API_KEY")) {
      return res.status(503).json({
        error: "AI Help Desk is temporarily offline. Please add a valid GEMINI_API_KEY in the application settings.",
      });
    }
    
    return res.status(500).json({ error: "Something went wrong. Please try again later." });
  }
});

export default router;
