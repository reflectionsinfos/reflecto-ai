import { Router } from "express";
import { LearningService } from "../services/LearningService";
import { authenticate } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * /api/learning/profile:
 *   get:
 *     summary: Get the current user's learning profile
 *     description: Returns the authenticated user's tech growth / learning profile including tech stack, goals, and objectives.
 *     tags:
 *       - Learning
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's learning profile (empty object if not yet created)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LearningProfile'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to fetch profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/profile", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    const userName = req.user?.name;

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

/**
 * @swagger
 * /api/learning/profile:
 *   post:
 *     summary: Create or update the current user's learning profile
 *     description: Upserts the authenticated user's tech growth plan. Submitting also triggers the manager approval workflow when status is set to SUBMITTED.
 *     tags:
 *       - Learning
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LearningProfileInput'
 *           example:
 *             techStack: ["React", "Node.js", "PostgreSQL"]
 *             domain: Full Stack
 *             learningGoals: Improve system design skills
 *             monthlyObjectives: ["Complete DSA course", "Build a side project"]
 *             status: SUBMITTED
 *     responses:
 *       200:
 *         description: Updated learning profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LearningProfile'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to update profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/learning/generate-lesson:
 *   post:
 *     summary: Generate a daily lesson for the current user
 *     description: Triggers AI-powered lesson generation based on the user's learning profile and tech stack. Intended for manual testing; in production this is triggered by a cron job.
 *     tags:
 *       - Learning
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Generated lesson and progress record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonResult'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to generate lesson
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/learning/submit-quiz:
 *   post:
 *     summary: Submit quiz answers for a lesson
 *     description: Submits the user's quiz answers and optional exercise submission for AI evaluation and points calculation.
 *     tags:
 *       - Learning
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuizSubmission'
 *           example:
 *             progressId: 3fa85f64-5717-4562-b3fc-2c963f66afa6
 *             quizAnswers: ["A", "C", "B"]
 *             exerciseSubmission: "const fn = () => { ... }"
 *     responses:
 *       200:
 *         description: Quiz evaluation result with score and AI feedback
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizResult'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to submit quiz
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/learning/stats:
 *   get:
 *     summary: Get the current user's learning stats
 *     description: Returns the authenticated user's rewards summary including total points, streak, badges, and level.
 *     tags:
 *       - Learning
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User learning stats and rewards
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LearningStats'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to fetch stats
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/learning/recent-lessons:
 *   get:
 *     summary: Get recent lessons for the current user
 *     description: Returns the 5 most recent lesson progress records for the authenticated user, including lesson content and completion status.
 *     tags:
 *       - Learning
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recent lesson progress records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LessonProgress'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to fetch recent lessons
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/recent-lessons", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    const userName = req.user?.name;

    const { RecognitionService } = await import("../services/RecognitionService");
    const userId = await RecognitionService.resolveUser(userEmail, userName);

    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const lessons = await LearningService.getRecentLessons(userId, 5);
    res.json(lessons);
  } catch (error) {
    console.error("Error fetching recent lessons:", error);
    res.status(500).json({ error: "Failed to fetch recent lessons" });
  }
});

export default router;
