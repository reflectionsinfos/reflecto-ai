// Quick test script to verify Gemini API key
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function testGemini() {
  console.log("Testing Gemini API...");
  console.log("API Key:", process.env.GEMINI_API_KEY ? "Set (length: " + process.env.GEMINI_API_KEY.length + ")" : "NOT SET");
  
  try {
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
    const result = await model.generateContent("Say hello in one word");
    const response = result.response;
    console.log("✅ Success! Response:", response.text());
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("Status:", error.status);
    console.error("Full error:", error);
  }
}

testGemini();
