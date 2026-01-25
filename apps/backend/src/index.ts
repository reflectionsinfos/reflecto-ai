import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";

// Import Routes
import tenantRoutes from "./routes/tenant.routes";
import userRoutes from "./routes/user.routes";
import recognitionRoutes from "./routes/recognition.routes";
import learningRoutes from "./routes/learning.routes";

// Swagger
import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "10mb" })); // Increase limit for base64 images

// Initialize Authentication Middleware
app.use(initializeAuth());

// Routes

// Health Check (Public - No Auth Required)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Redirect root to docs
app.get("/", (req, res) => {
  res.redirect("/api-docs");
});


// Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs)
);

// Mount Module Routes
app.use("/api/tenants", tenantRoutes);
app.use("/api/users", userRoutes);
app.use("/api/recognition", recognitionRoutes);
app.use("/api/learning", learningRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
