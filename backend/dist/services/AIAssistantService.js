"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAssistantService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
class AIAssistantService {
    /**
     * Generate a recognition message using Gemini
     */
    static async generateMessage(request) {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 200,
            }
        });
        let contextPrompt = "";
        if (request.type === "Kudos") {
            contextPrompt = `Write a short, appreciative Kudos card message for ${request.recipientName}. 
      Category: ${request.category || "General"}.`;
        }
        else if (request.type === "Shout Out") {
            contextPrompt = `Write an announcement/shout-out style message for ${request.recipientName}.
      Context: ${request.category || "General Announcement"}.`;
        }
        else {
            contextPrompt = `Write a formal Spot Award appreciation message for ${request.recipientName}.
      Award Category: ${request.category || "Excellence"}.`;
        }
        const prompt = `You are a helpful assistant helping a user write a recognition message.
    
    Task: ${contextPrompt}
    User's Rough Draft/Keywords: "${request.draft || "Great job, thanks for the hard work"}"
    Tone: ${request.tone || "inspiring"}
    
    Constraints:
    - For Kudos: EXTREMELY SHORT. Maximum 115 characters. Absolute hard limit.
    - For Spot Awards: EXTREMELY SHORT. Maximum 115 characters. Absolute hard limit.
    - For Shout Outs: Under 400 characters.
    - Be specific and warm.
    - Fix grammar and make it sound polished.
    - Do not include "Subject:" lines or placeholders like [Name].
    
    Return ONLY the message text.`;
        try {
            const result = await model.generateContent(prompt);
            const message = result.response.text().trim();
            return message;
        }
        catch (error) {
            console.error("Gemini message generation failed:", error);
            throw new Error("Failed to generate message");
        }
    }
}
exports.AIAssistantService = AIAssistantService;
