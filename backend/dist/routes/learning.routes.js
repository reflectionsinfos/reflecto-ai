"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const LearningService_1 = require("../services/LearningService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get user's learning profile
router.get("/profile", (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const userEmail = req.user?.email || req.user?.preferred_username;
        const userName = req.user?.name;
        // Resolve user ID
        const { RecognitionService } = await Promise.resolve().then(() => __importStar(require("../services/RecognitionService")));
        const userId = await RecognitionService.resolveUser(userEmail, userName);
        if (!userId) {
            return res.status(404).json({ error: "User not found" });
        }
        const profile = await LearningService_1.LearningService.getProfile(userId);
        res.json(profile || {});
    }
    catch (error) {
        console.error("Error fetching learning profile:", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});
// Create or update learning profile
router.post("/profile", (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const userEmail = req.user?.email || req.user?.preferred_username;
        const userName = req.user?.name;
        const { RecognitionService } = await Promise.resolve().then(() => __importStar(require("../services/RecognitionService")));
        const userId = await RecognitionService.resolveUser(userEmail, userName);
        if (!userId) {
            return res.status(404).json({ error: "User not found" });
        }
        const profile = await LearningService_1.LearningService.upsertProfile(userId, req.body);
        res.json(profile);
    }
    catch (error) {
        console.error("Error updating learning profile:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});
// Generate daily lesson (manual trigger for testing, will be automated via cron)
router.post("/generate-lesson", (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const userEmail = req.user?.email || req.user?.preferred_username;
        const userName = req.user?.name;
        const { RecognitionService } = await Promise.resolve().then(() => __importStar(require("../services/RecognitionService")));
        const userId = await RecognitionService.resolveUser(userEmail, userName);
        if (!userId) {
            return res.status(404).json({ error: "User not found" });
        }
        const result = await LearningService_1.LearningService.generateDailyLesson(userId);
        res.json(result);
    }
    catch (error) {
        console.error("Error generating lesson:", error);
        res.status(500).json({ error: error.message || "Failed to generate lesson" });
    }
});
// Submit quiz answers
router.post("/submit-quiz", (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const { progressId, quizAnswers, exerciseSubmission } = req.body;
        if (!progressId || !quizAnswers) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const evaluation = await LearningService_1.LearningService.submitQuiz(progressId, quizAnswers, exerciseSubmission);
        res.json(evaluation);
    }
    catch (error) {
        console.error("Error submitting quiz:", error);
        res.status(500).json({ error: error.message || "Failed to submit quiz" });
    }
});
// Get user stats (rewards, progress)
router.get("/stats", (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const userEmail = req.user?.email || req.user?.preferred_username;
        const userName = req.user?.name;
        const { RecognitionService } = await Promise.resolve().then(() => __importStar(require("../services/RecognitionService")));
        const userId = await RecognitionService.resolveUser(userEmail, userName);
        if (!userId) {
            return res.status(404).json({ error: "User not found" });
        }
        const stats = await LearningService_1.LearningService.getUserStats(userId);
        res.json(stats);
    }
    catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});
// Get recent lessons
router.get("/recent-lessons", (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const userEmail = req.user?.email || req.user?.preferred_username;
        const userName = req.user?.name;
        const { RecognitionService } = await Promise.resolve().then(() => __importStar(require("../services/RecognitionService")));
        const userId = await RecognitionService.resolveUser(userEmail, userName);
        if (!userId) {
            return res.status(404).json({ error: "User not found" });
        }
        const lessons = await LearningService_1.LearningService.getRecentLessons(userId, 5);
        res.json(lessons);
    }
    catch (error) {
        console.error("Error fetching recent lessons:", error);
        res.status(500).json({ error: "Failed to fetch recent lessons" });
    }
});
exports.default = router;
