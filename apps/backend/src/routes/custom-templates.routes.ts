import { Router } from "express";
import { db } from "../db";
import { customTemplates, users } from "../db/schema";
import { authenticate } from "../middleware/auth";
import { eq, or } from "drizzle-orm";

const router = Router();

/**
 * GET /api/custom-templates
 * Returns the authenticated user's own custom templates plus all public templates.
 */
router.get("/", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;

    // Resolve user id
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const rows = await db
      .select()
      .from(customTemplates)
      .where(or(eq(customTemplates.createdBy, user.id), eq(customTemplates.isPublic, true)));

    res.json(rows);
  } catch (error) {
    console.error("Error fetching custom templates:", error);
    res.status(500).json({ error: "Failed to fetch custom templates" });
  }
});

/**
 * POST /api/custom-templates
 * Creates a new custom template for the authenticated user.
 * Body: { name, tagline?, color, iconName, isPublic? }
 */
router.post("/", authenticate(), async (req: any, res) => {
  try {
    const userEmail = req.user?.email || req.user?.preferred_username;
    const userName = req.user?.name;

    const { name, tagline, color, iconName, isPublic } = req.body;

    if (!name || !color || !iconName) {
      return res.status(400).json({ error: "name, color, and iconName are required" });
    }

    // Resolve (or create) user
    let [user] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (!user) {
      const [created] = await db
        .insert(users)
        .values({ email: userEmail, name: userName || userEmail, role: "user" })
        .returning({ id: users.id, role: users.role });
      user = created;
    }

    // Only admins can create public templates
    const effectiveIsPublic = user.role === "admin" ? (isPublic ?? false) : false;

    const [row] = await db
      .insert(customTemplates)
      .values({
        createdBy: user.id,
        name: name.trim(),
        tagline: tagline?.trim() || null,
        color,
        iconName,
        isPublic: effectiveIsPublic,
      })
      .returning();

    res.status(201).json(row);
  } catch (error) {
    console.error("Error creating custom template:", error);
    res.status(500).json({ error: "Failed to create custom template" });
  }
});

/**
 * DELETE /api/custom-templates/:id
 * Deletes a custom template. Users can only delete their own; admins can delete any.
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

    const [template] = await db
      .select({ id: customTemplates.id, createdBy: customTemplates.createdBy })
      .from(customTemplates)
      .where(eq(customTemplates.id, id))
      .limit(1);

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (template.createdBy !== user.id && user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to delete this template" });
    }

    await db.delete(customTemplates).where(eq(customTemplates.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting custom template:", error);
    res.status(500).json({ error: "Failed to delete custom template" });
  }
});

export default router;
