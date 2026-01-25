import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { AIAssistantService } from "../services/AIAssistantService";

const router = Router();

// Generate a recognition message
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
