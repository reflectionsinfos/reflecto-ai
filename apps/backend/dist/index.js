"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./middleware/auth");
const errorHandler_1 = require("./middleware/errorHandler");
// Import Routes
const tenant_routes_1 = __importDefault(require("./routes/tenant.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const card_routes_1 = __importDefault(require("./routes/card.routes"));
// Swagger
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "10mb" })); // Increase limit for base64 images
// Initialize Authentication Middleware
app.use((0, auth_1.initializeAuth)());
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
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.specs));
// Mount Module Routes
app.use("/api/tenants", tenant_routes_1.default);
app.use("/api/users", user_routes_1.default);
app.use("/api/cards", card_routes_1.default);
// Global Error Handler
app.use(errorHandler_1.errorHandler);
// Start Server
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
