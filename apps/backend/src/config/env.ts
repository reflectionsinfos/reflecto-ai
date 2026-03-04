import dotenv from "dotenv";

// Load environment-specific file first (DATABASE_URL, FRONTEND_URL)
// then shared .env as fallback (AZURE_*, GEMINI_*, PORT)
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
dotenv.config({ path: envFile });
dotenv.config();
