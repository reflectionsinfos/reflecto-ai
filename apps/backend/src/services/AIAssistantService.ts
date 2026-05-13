import { GoogleGenAI } from "@google/genai";
 
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});
 
export interface GenerateMessageRequest {
  type: "Kudos" | "Shout Out" | "Spot Award";
  recipientName: string;
  category?: string;
  draft?: string;
  tone?: "professional" | "casual" | "funny" | "inspiring";
}
 
export class AIAssistantService {
  /**
   * Generate a recognition message using Gemini
   */
  static async generateMessage(
    request: GenerateMessageRequest
  ): Promise<string> {
    const cleanedDraft = (request.draft || "")
      .replace(/-/g, ", ")
      .replace(/\s+/g, " ")
      .trim();
 
    let contextPrompt = "";
 
    if (request.type === "Kudos") {
      contextPrompt = `
Write a warm and professional Kudos appreciation message.
The tone should feel inspiring, polished, and meaningful.
`;
    } else if (request.type === "Shout Out") {
      contextPrompt = `
Write an energetic and professional shout-out message suitable for team announcements.
`;
    } else {
      contextPrompt = `
Write a formal and impactful Spot Award recognition message.
`;
    }
 
    const prompt = `
You are a senior corporate recognition writer.
 
Your task is to rewrite and enhance the user's rough message into ONE polished, complete, and professional appreciation message.
 
${contextPrompt}
 
DETAILS:
- Recipient: ${request.recipientName}
- Category: ${request.category || "General"}
- Tone: ${request.tone || "inspiring"}
- User Input: "${cleanedDraft}"
 
STRICT RULES:
- MUST be ONE complete sentence
- MUST end properly with punctuation
- MUST NEVER be incomplete or abruptly cut
- MUST NEVER contain "..."
- MUST sound natural and human
- MUST improve grammar, flow, and professionalism
- MUST include appreciation and impact
- MUST keep the original meaning of the user's message
- MUST NOT repeat the recipient name multiple times
- MUST NOT generate headings, quotes, bullet points, or extra formatting
 
CONTENT REQUIREMENTS:
- Mention at least 2 positive qualities
- Mention the positive impact created
- Make the message emotionally warm but corporate-professional
 
LENGTH RULES:
- Minimum 180 characters
- Maximum 250 characters
- Keep the response concise but complete
 
GOOD EXAMPLE:
"Siona, your empathy, dedication, and proactive support consistently create meaningful customer experiences, and your ability to solve challenges with clarity and care leaves a lasting positive impact on both customers and the team."
 
Return ONLY the final completed sentence.
`;
 
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.5,
          maxOutputTokens: 900,
        },
      });
 
      let message =
        response.candidates?.[0]?.content?.parts?.[0]?.text || "";
 
      message = message
        .replace(/\.\.\.+/g, ".")
        .replace(/\s+/g, " ")
        .trim();
 
      // Ensure message ends properly
      if (
        message &&
        !message.endsWith(".") &&
        !message.endsWith("!") &&
        !message.endsWith("?")
      ) {
        message += ".";
      }
 
      return message;
    } catch (error) {
      console.error("Gemini message generation failed:", error);
      throw new Error("Failed to generate message");
    }
  }
}