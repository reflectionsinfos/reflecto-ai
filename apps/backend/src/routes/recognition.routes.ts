import { Router } from "express";
import { RecognitionService } from "../services/RecognitionService";
import { authenticate } from "../middleware/auth";

const router = Router();

// Create new recognition
router.post("/", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    const userName = req.user?.name;
    
    // Resolve user ID from DB (create if missing)
    const senderId = await RecognitionService.resolveUser(userEmail, userName); // Need non-null

    const eventData = {
        ...req.body,
        senderId: senderId,
    };

    const event = await RecognitionService.createEvent(eventData);
    res.json(event);
  } catch (error) {
    console.error("Error creating recognition:", error);
    res.status(500).json({ error: "Failed to create recognition" });
  }
});

// Get sent by current user
router.get("/sent/me", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    
    // Resolve internal User ID
    const senderId = await RecognitionService.resolveUser(userEmail, req.user?.name);
    
    if (!senderId) {
        return res.json([]); // No user found = no cards
    }

    const events = await RecognitionService.getSentByUser(senderId);
    res.json(events);
  } catch (error) {
    console.error("Error fetching recognitions:", error);
    res.status(500).json({ error: "Failed to fetch recognitions" });
  }
});

// Get all recognitions
router.get("/", authenticate(), async (req: any, res) => {
  try {
    const events = await RecognitionService.getAllEvents();
    res.json(events);
  } catch (error) {
    console.error("Error fetching all recognitions:", error);
    res.status(500).json({ error: "Failed to fetch recognitions" });
  }
});

export default router;
