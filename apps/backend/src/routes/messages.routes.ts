import { Router } from "express";
import { db } from "../db";
import { messageTemplates, customTemplateMessages, users, customTemplates } from "../db/schema";
import { authenticate } from "../middleware/auth";
import { eq, and } from "drizzle-orm";

const router = Router();

/**
 * GET /api/messages/all
 * Returns all messages for ALL templates (system + any public custom templates).
 * Batch endpoint to reduce network calls.
 * Public - no auth required.
 */
router.get("/all", async (req, res) => {
  try {
    // Fetch all system messages
    const sysMessages = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.templateType, "system"));

    // Group by templateId
    const allMessages: Record<string, { individual: any[]; team: any[] }> = {};

    sysMessages.forEach((msg: any) => {
      if (!allMessages[msg.templateId]) {
        allMessages[msg.templateId] = { individual: [], team: [] };
      }
      allMessages[msg.templateId][msg.messageCategory].push(msg);
    });

    res.json(allMessages);
  } catch (error) {
    console.error("Error fetching all messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * GET /api/messages/template/:templateId
 * Returns all messages for a template (system default or custom template's own messages).
 * Query params: ?category=individual|team (optional filter)
 * Response: { individual: [...], team: [...], source: "system" | "custom" }
 * Public - no auth required.
 */
router.get("/template/:templateId", async (req: any, res) => {
  try {
    const { templateId } = req.params;
    const { category } = req.query;

    // Check if templateId is a UUID (custom template) or a string key (system template)
    const isCustomTemplate = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      templateId
    );

    if (isCustomTemplate) {
      // Fetch messages from custom_template_messages
      let query = db
        .select()
        .from(customTemplateMessages)
        .where(eq(customTemplateMessages.customTemplateId, templateId as any));

      if (category) {
        query = query.where(
          eq(customTemplateMessages.messageCategory, category as string)
        );
      }

      const rows = await (query as any);

      // Group by category
      const grouped: Record<string, any[]> = { individual: [], team: [] };
      rows.forEach((row: any) => {
        if (!grouped[row.messageCategory]) {
          grouped[row.messageCategory] = [];
        }
        grouped[row.messageCategory].push(row);
      });

      return res.json({ ...grouped, source: "custom" });
    } else {
      // Fetch messages from message_templates (system defaults)
      let query = db
        .select()
        .from(messageTemplates)
        .where(eq(messageTemplates.templateId, templateId));

      if (category) {
        query = query.where(
          eq(messageTemplates.messageCategory, category as string)
        );
      }

      const rows = await (query as any);

      // Group by category
      const grouped: Record<string, any[]> = { individual: [], team: [] };
      rows.forEach((row: any) => {
        if (!grouped[row.messageCategory]) {
          grouped[row.messageCategory] = [];
        }
        grouped[row.messageCategory].push(row);
      });

      return res.json({ ...grouped, source: "system" });
    }
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * POST /api/messages
 * Create a new message for a template.
 * Body: { templateId, templateType?, messageCategory, order, text }
 * If templateId is a UUID, creates in custom_template_messages; otherwise in message_templates.
 * Protected - auth required.
 */
router.post("/", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    const { templateId, templateType, messageCategory, order, text } = req.body;

    if (!templateId || !messageCategory || order === undefined || !text) {
      return res.status(400).json({
        error: "templateId, messageCategory, order, and text are required",
      });
    }

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const isCustomTemplate = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      templateId
    );

    if (isCustomTemplate) {
      // Create in custom_template_messages
      // Check if user owns this custom template
      const [template] = await db
        .select({ id: customTemplates.id, createdBy: customTemplates.createdBy })
        .from(customTemplates)
        .where(eq(customTemplates.id, templateId as any))
        .limit(1);

      if (!template) {
        return res.status(404).json({ error: "Custom template not found" });
      }

      if (template.createdBy !== user.id && user.role !== "admin") {
        return res.status(403).json({
          error: "Not authorized to add messages to this template",
        });
      }

      const [row] = await db
        .insert(customTemplateMessages)
        .values({
          customTemplateId: templateId as any,
          messageCategory,
          order: Number(order),
          text: text.trim(),
        })
        .returning();

      return res.status(201).json(row);
    } else {
      // Create in message_templates (admin only)
      if (user.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Only admins can create system messages" });
      }

      const [row] = await db
        .insert(messageTemplates)
        .values({
          templateId,
          templateType: templateType || "system",
          messageCategory,
          order: Number(order),
          text: text.trim(),
          createdBy: user.id,
          isPublic: true,
        })
        .returning();

      return res.status(201).json(row);
    }
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ error: "Failed to create message" });
  }
});

/**
 * PUT /api/messages/:id
 * Update a message (order or text).
 * Body: { order?, text? }
 * Protected - auth required.
 */
router.put("/:id", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    const { id } = req.params;
    const { order, text } = req.body;

    if (!order && !text) {
      return res
        .status(400)
        .json({ error: "At least one of order or text is required" });
    }

    const [user] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Try to find in custom_template_messages first
    const [customMsg] = await db
      .select()
      .from(customTemplateMessages)
      .where(eq(customTemplateMessages.id, id as any))
      .limit(1);

    if (customMsg) {
      // Verify ownership
      const [customTemplate] = await db
        .select({ createdBy: customTemplates.createdBy })
        .from(customTemplates)
        .where(eq(customTemplates.id, customMsg.customTemplateId))
        .limit(1);

      if (
        customTemplate?.createdBy !== user.id &&
        user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ error: "Not authorized to update this message" });
      }

      const updateData: any = {};
      if (order !== undefined) updateData.order = Number(order);
      if (text) updateData.text = text.trim();

      const [updated] = await db
        .update(customTemplateMessages)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(customTemplateMessages.id, id as any))
        .returning();

      return res.json(updated);
    }

    // Try message_templates (admin only)
    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can update system messages" });
    }

    const [sysMsg] = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, id as any))
      .limit(1);

    if (!sysMsg) {
      return res.status(404).json({ error: "Message not found" });
    }

    const updateData: any = {};
    if (order !== undefined) updateData.order = Number(order);
    if (text) updateData.text = text.trim();

    const [updated] = await db
      .update(messageTemplates)
      .set(updateData)
      .where(eq(messageTemplates.id, id as any))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error updating message:", error);
    res.status(500).json({ error: "Failed to update message" });
  }
});

/**
 * DELETE /api/messages/:id
 * Delete a message. Users can only delete their own; admins can delete any.
 * Protected - auth required.
 */
router.delete("/:id", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    const { id } = req.params;

    const [user] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Try to find in custom_template_messages first
    const [customMsg] = await db
      .select()
      .from(customTemplateMessages)
      .where(eq(customTemplateMessages.id, id as any))
      .limit(1);

    if (customMsg) {
      // Verify ownership
      const [customTemplate] = await db
        .select({ createdBy: customTemplates.createdBy })
        .from(customTemplates)
        .where(eq(customTemplates.id, customMsg.customTemplateId))
        .limit(1);

      if (
        customTemplate?.createdBy !== user.id &&
        user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this message" });
      }

      await db
        .delete(customTemplateMessages)
        .where(eq(customTemplateMessages.id, id as any));

      return res.json({ success: true });
    }

    // Try message_templates (admin only)
    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can delete system messages" });
    }

    const [sysMsg] = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, id as any))
      .limit(1);

    if (!sysMsg) {
      return res.status(404).json({ error: "Message not found" });
    }

    await db.delete(messageTemplates).where(eq(messageTemplates.id, id as any));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

export default router;
