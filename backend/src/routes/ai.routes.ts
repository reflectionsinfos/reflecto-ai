import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { AIAssistantService } from "../services/AIAssistantService";

const router = Router();

/**
 * @swagger
 * /api/ai/generate-message:
 *   post:
 *     summary: Generate an AI-powered recognition message
 *     description: Uses Google Gemini to draft a recognition message for Kudos, Shout Out, or Spot Award based on the provided context.
 *     tags:
 *       - AI
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateMessageRequest'
 *           example:
 *             type: kudos
 *             recipientName: Jane Doe
 *             category: Teamwork
 *             draft: She helped the team during the sprint
 *             tone: warm
 *     responses:
 *       200:
 *         description: Successfully generated message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Jane's dedication during the sprint was truly inspiring..."
 *       400:
 *         description: Missing required field - type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to generate message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/generate-message", authenticate(), async (req: any, res) => {
  try {
    const { type, recipientName, category, draft, tone } = req.body;

    if (!type) {
      return res.status(400).json({ error: "Type is required" });
    }

    const message = await AIAssistantService.generateMessage({
      type,
      recipientName: recipientName || "the team",
      category,
      draft,
      tone
    });

    res.json({ message });
  } catch (error: any) {
    console.error("Error generating message:", error);
    res.status(500).json({ error: "Failed to generate message" });
  }
});

export default router;
