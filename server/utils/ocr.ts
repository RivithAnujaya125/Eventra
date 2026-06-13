import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("⚠️ GEMINI_API_KEY is not defined. AI automated verification will be suspended, defaulting to manual review.");
      return null;
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

export interface AIVerificationResult {
  isValid: boolean;
  amountPaid: number | null;
  transactionId: string | null;
  confidence: number;
  isPotentiallyFraudulent: boolean;
  reason: string;
}

/**
 * Automates payment proof verification using Gemini 3.5 Multimodal Vision API.
 * Downloads the receipt, converts it to base64, and prompts Gemini to extract details
 * and check for potential image manipulation/fraud.
 * 
 * @param imageUrl - The URL of the uploaded payment screenshot.
 * @param expectedAmount - The fee amount to verify.
 * @returns A structured verification result.
 */
export async function verifyPaymentProof(
  imageUrl: string,
  expectedAmount: number = 0
): Promise<AIVerificationResult> {
  const fallbackResult: AIVerificationResult = {
    isValid: false,
    amountPaid: null,
    transactionId: null,
    confidence: 0,
    isPotentiallyFraudulent: false,
    reason: "Fallback placeholder (manual review required).",
  };

  try {
    console.log(`Starting advanced AI multimodal verification for: ${imageUrl}`);
    const ai = getGeminiClient();
    if (!ai) {
      return {
        ...fallbackResult,
        reason: "Gemini API client not initialized due to missing GEMINI_API_KEY. Manual review required.",
      };
    }

    let mimeType = "image/png";
    let base64Data = "";

    if (imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
        console.log("Detected base64 Data URL for payment proof. Bypassing network fetch.");
      } else {
        throw new Error("Invalid base64 Data URL format");
      }
    } else {
      // Fetch the image from URL
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download payment proof image from ${imageUrl}. Status: ${imageResponse.status}`);
      }

      mimeType = imageResponse.headers.get("content-type") || "image/png";
      const arrayBuffer = await imageResponse.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");
    }

    const prompt = `Analyze this transaction receipt / bank payment screenshot to verify payment of a required registration fee.
Please check the receipt details and compare them against the expected registration fee of LKR ${expectedAmount}.

Evaluate:
1. Is this image a receipt showing a successful bank transfer, deposit, or online payment?
2. Does the amount paid match the expected fee of LKR ${expectedAmount}? (It is valid if the text mentions LKR ${expectedAmount} or ${expectedAmount}).
3. What is the unique transaction ID / Reference ID?
4. Are there any suspicious indicators or signs of image tampering (e.g., photoshopped text, font mismatches, weird alignments, copy-pasting of status badges, fake successful prompts)?
5. Give a reasonable confidence rating (0 to 100) for your analysis.

Be extremely precise. Only confirm isSuccessfulPayment as true if the receipt clearly proves that money was actually sent successfully, and looks genuine.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isSuccessfulPayment: {
              type: Type.BOOLEAN,
              description: "True if the receipt proves a successfully sent payment, matches the expected amount, and has no clear signs of forgery.",
            },
            amountPaid: {
              type: Type.NUMBER,
              description: "The numerical value of the amount paid/transferred as parsed from the receipt (e.g. 500), or null if not readable.",
            },
            transactionId: {
              type: Type.STRING,
              description: "The extracted unique bank reference number, UPI transaction ID, or UTN/Reference number, or null if not present.",
            },
            confidence: {
              type: Type.INTEGER,
              description: "A confidence score from 0 to 100 on how certain the analysis is.",
            },
            isPotentiallyFraudulent: {
              type: Type.BOOLEAN,
              description: "True if there are signs of image tampering, edited text, duplicated overlays, or fake receipt generators.",
            },
            reason: {
              type: Type.STRING,
              description: "A concise but detailed explanation outlining your findings: banking style identified, amount match confirmation, transaction key found, and any potential forgery flags.",
            },
          },
          required: [
            "isSuccessfulPayment",
            "amountPaid",
            "transactionId",
            "confidence",
            "isPotentiallyFraudulent",
            "reason",
          ],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response received from Gemini API.");
    }

    const aiOut = JSON.parse(responseText.trim());
    console.log("AI Receipt Analysis Result:", aiOut);

    // Auto-approve only if payment is success, it's not flagged for potential fraud, and confidence is high
    const isValid = aiOut.isSuccessfulPayment && !aiOut.isPotentiallyFraudulent && aiOut.confidence >= 70;

    return {
      isValid,
      amountPaid: aiOut.amountPaid,
      transactionId: aiOut.transactionId,
      confidence: aiOut.confidence,
      isPotentiallyFraudulent: aiOut.isPotentiallyFraudulent,
      reason: aiOut.reason,
    };
  } catch (error: any) {
    console.error("Advanced AI payment proof evaluation failed:", error);
    return {
      ...fallbackResult,
      reason: `AI process crashed: ${error.message || error}`,
    };
  }
}
