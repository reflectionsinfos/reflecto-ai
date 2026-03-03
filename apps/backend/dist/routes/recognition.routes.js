"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RecognitionService_1 = require("../services/RecognitionService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Create new recognition
router.post("/", (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const userEmail = req.user?.email || req.user?.preferred_username;
        const userName = req.user?.name;
        // Resolve user ID from DB (create if missing)
        const senderId = await RecognitionService_1.RecognitionService.resolveUser(userEmail, userName); // Need non-null
        const eventData = {
            ...req.body,
            senderId: senderId,
        };
        const event = await RecognitionService_1.RecognitionService.createEvent(eventData);
        res.json(event);
    }
    catch (error) {
        console.error("Error creating recognition:", error);
        res.status(500).json({ error: "Failed to create recognition" });
    }
});
// Get sent by current user
router.get("/sent/me", (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const userEmail = req.user?.email || req.user?.preferred_username;
        // Resolve internal User ID
        const senderId = await RecognitionService_1.RecognitionService.resolveUser(userEmail, req.user?.name);
        if (!senderId) {
            return res.json([]); // No user found = no cards
        }
        const events = await RecognitionService_1.RecognitionService.getSentByUser(senderId);
        res.json(events);
    }
    catch (error) {
        console.error("Error fetching recognitions:", error);
        res.status(500).json({ error: "Failed to fetch recognitions" });
    }
});
// Get all recognitions
router.get("/", (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const events = await RecognitionService_1.RecognitionService.getAllEvents();
        res.json(events);
    }
    catch (error) {
        console.error("Error fetching all recognitions:", error);
        res.status(500).json({ error: "Failed to fetch recognitions" });
    }
});
exports.default = router;
