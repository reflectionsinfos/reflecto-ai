import { Router } from "express";
import { eq } from "drizzle-orm";
import { RecognitionService } from "../services/RecognitionService";
import { authenticate } from "../middleware/auth";
import { db } from "../db";
import { users } from "../db/schema";

const router = Router();

/**
 * @swagger
 * /api/recognition:
 *   post:
 *     summary: Create a new recognition event
 *     description: Creates a Kudos, Shout Out, or Spot Award recognition event sent by the authenticated user.
 *     tags:
 *       - Recognition
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRecognitionRequest'
 *           example:
 *             type: kudos
 *             recipients:
 *               - name: Jane Doe
 *                 email: jane@example.com
 *             metadata:
 *               message: Great job on the release!
 *               category: Teamwork
 *             privacy_level: PUBLIC
 *     responses:
 *       200:
 *         description: Recognition event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecognitionEvent'
 *       500:
 *         description: Failed to create recognition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    const userName = req.user?.name;

    const senderId = await RecognitionService.resolveUser(userEmail, userName);

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

/**
 * @swagger
 * /api/recognition/sent/me:
 *   get:
 *     summary: Get recognitions sent by the current user
 *     description: Returns all recognition events created by the authenticated user.
 *     tags:
 *       - Recognition
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recognition events sent by the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RecognitionEvent'
 *       500:
 *         description: Failed to fetch recognitions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/sent/me", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;

    const senderId = await RecognitionService.resolveUser(userEmail, req.user?.name);

    if (!senderId) {
        return res.json([]);
    }

    const events = await RecognitionService.getSentByUser(senderId);
    res.json(events);
  } catch (error) {
    console.error("Error fetching recognitions:", error);
    res.status(500).json({ error: "Failed to fetch recognitions" });
  }
});

/**
 * @swagger
 * /api/recognition:
 *   get:
 *     summary: Get all recognition events
 *     description: Returns all recognition events across all users (used for admin/team feed views).
 *     tags:
 *       - Recognition
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all recognition events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RecognitionEvent'
 *       500:
 *         description: Failed to fetch recognitions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", authenticate(), async (req: any, res) => {
  try {
    const events = await RecognitionService.getAllEvents();
    res.json(events);
  } catch (error) {
    console.error("Error fetching all recognitions:", error);
    res.status(500).json({ error: "Failed to fetch recognitions" });
  }
});

/**
 * @swagger
 * /api/recognition/{id}:
 *   delete:
 *     summary: Delete a recognition event
 *     description: Deletes a recognition event owned by the authenticated user. Admins can delete any recognition event.
 *     tags:
 *       - Recognition
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recognition event deleted successfully
 *       403:
 *         description: Not authorized to delete this recognition
 *       404:
 *         description: Recognition event not found
 *       500:
 *         description: Failed to delete recognition
 */
router.delete("/:id", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    const { id } = req.params;

    if (!userEmail) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [user] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const event = await RecognitionService.getEventById(id);
    if (!event) {
      return res.status(404).json({ error: "Recognition event not found" });
    }

    const isOwner = event.senderId === user.id;
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Not authorized to delete this recognition" });
    }

    await RecognitionService.deleteEvent(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting recognition:", error);
    res.status(500).json({ error: "Failed to delete recognition" });
  }
});

export default router;
