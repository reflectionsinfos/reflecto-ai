"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const AIAssistantService_1 = require("../services/AIAssistantService");
const router = (0, express_1.Router)();
// Generate a recognition message
router.post("/generate-message", (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const { type, recipientName, category, draft, tone } = req.body;
        if (!type) {
            return res.status(400).json({ error: "Type is required" });
        }
        const message = await AIAssistantService_1.AIAssistantService.generateMessage({
            type,
            recipientName: recipientName || "the team",
            category,
            draft,
            tone
        });
        res.json({ message });
    }
    catch (error) {
        console.error("Error generating message:", error);
        res.status(500).json({ error: "Failed to generate message" });
    }
});
exports.default = router;
