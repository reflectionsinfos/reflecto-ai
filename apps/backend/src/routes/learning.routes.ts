import { Router } from "express";
import { LearningService } from "../services/LearningService";
import { authenticate } from "../middleware/auth";

const router = Router();

// Get user's learning profile
router.get("/profile", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    const userName = req.user?.name;
    
    // Resolve user ID
    const { RecognitionService } = await import("../services/RecognitionService");
    const userId = await RecognitionService.resolveUser(userEmail, userName);
    
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const profile = await LearningService.getProfile(userId);
    res.json(profile || {});
  } catch (error) {
    console.error("Error fetching learning profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Create or update learning profile
router.post("/profile", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    const userName = req.user?.name;
    
    const { RecognitionService } = await import("../services/RecognitionService");
    const userId = await RecognitionService.resolveUser(userEmail, userName);
    
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const profile = await LearningService.upsertProfile(userId, req.body);
    res.json(profile);
  } catch (error) {
    console.error("Error updating learning profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Generate daily lesson (manual trigger for testing, will be automated via cron)
router.post("/generate-lesson", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    const userName = req.user?.name;
    
    const { RecognitionService } = await import("../services/RecognitionService");
    const userId = await RecognitionService.resolveUser(userEmail, userName);
    
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const result = await LearningService.generateDailyLesson(userId);
    res.json(result);
  } catch (error: any) {
    console.error("Error generating lesson:", error);
    res.status(500).json({ error: error.message || "Failed to generate lesson" });
  }
});

// Submit quiz answers
router.post("/submit-quiz", authenticate(), async (req: any, res) => {
  try {
    const { progressId, quizAnswers, exerciseSubmission } = req.body;
    
    if (!progressId || !quizAnswers) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const evaluation = await LearningService.submitQuiz(
      progressId,
      quizAnswers,
      exerciseSubmission
    );
    
    res.json(evaluation);
  } catch (error: any) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({ error: error.message || "Failed to submit quiz" });
  }
});

// Get user stats (rewards, progress)
router.get("/stats", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    const userName = req.user?.name;
    
    const { RecognitionService } = await import("../services/RecognitionService");
    const userId = await RecognitionService.resolveUser(userEmail, userName);
    
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const stats = await LearningService.getUserStats(userId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
