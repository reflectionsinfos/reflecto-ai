"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardService = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const utils_1 = require("../db/utils");
const drizzle_orm_1 = require("drizzle-orm");
const errorHandler_1 = require("../middleware/errorHandler");
exports.cardService = {
    async createCard(cardData, user) {
        console.log("Debug: req.user received:", user);
        let tenantId;
        let userId;
        if (user) {
            try {
                console.log("Debug: Attempting to sync user/tenant...");
                const syncResult = await (0, utils_1.ensureUserAndTenant)({
                    email: user.email,
                    name: user.name,
                    tid: user.tid
                });
                tenantId = syncResult.tenantId;
                userId = syncResult.userId;
                console.log("Debug: Sync successful. Local TenantID:", tenantId, "Local UserID:", userId);
                // Enforce Creator Info from Token
                cardData.creatorName = user.name || cardData.creatorName;
                cardData.creatorEmail = user.email || cardData.creatorEmail;
            }
            catch (syncError) {
                console.error("User Sync Error:", syncError);
                throw new errorHandler_1.AppError("Failed to synchronize user profile", 500);
            }
        }
        else {
            console.log("Debug: No user object found in request!");
        }
        if (!userId || !tenantId) {
            console.error("Debug: Missing UserID or TenantID despite sync attempt. userId:", userId, "tenantId:", tenantId);
            throw new errorHandler_1.AppError("Failed to resolve user or tenant. Please try again.", 500);
        }
        // Validate recipient logic
        const recipientType = cardData.recipientType || 'individual';
        const recipientEmails = Array.isArray(cardData.recipientEmails) ? cardData.recipientEmails : [];
        if (recipientType === 'individual' && recipientEmails.length > 1) {
            throw new errorHandler_1.AppError("Individual cards can only have one recipient.", 400);
        }
        const insertValues = {
            recipientName: cardData.recipientName,
            recipientType: recipientType,
            recipientEmails: recipientEmails,
            creatorName: cardData.creatorName,
            creatorEmail: cardData.creatorEmail,
            template: cardData.template,
            templateId: cardData.templateId,
            message: cardData.message,
            thumbnailUrl: cardData.thumbnailUrl,
            cardData: cardData.cardData,
            tenantId: tenantId,
            userId: userId,
        };
        console.log("Debug: Final insertValues (without imageBlob):", {
            ...insertValues,
            thumbnailUrl: insertValues.thumbnailUrl ? `[${insertValues.thumbnailUrl.length} chars]` : null,
            cardData: "[object]"
        });
        const [card] = await db_1.db.insert(schema_1.kudosCards).values(insertValues).returning();
        // Log history
        await db_1.db.insert(schema_1.kudosHistory).values({
            action: "create",
            cardId: card.id,
            recipientName: card.recipientName,
            creatorName: card.creatorName,
            creatorEmail: card.creatorEmail,
            template: card.template,
            metadata: { templateId: card.templateId }
        });
        return card;
    },
    async getAllCards(tenantId) {
        let query = db_1.db.select().from(schema_1.kudosCards).orderBy((0, drizzle_orm_1.desc)(schema_1.kudosCards.createdAt));
        const allCards = await query;
        if (tenantId) {
            return allCards.filter(c => c.tenantId === tenantId);
        }
        return allCards;
    },
    async getUserCards(email) {
        return await db_1.db.select().from(schema_1.kudosCards)
            .where((0, drizzle_orm_1.eq)(schema_1.kudosCards.creatorEmail, email))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.kudosCards.createdAt));
    },
    async deleteCard(id, deletedBy) {
        const [cardToDelete] = await db_1.db.select().from(schema_1.kudosCards).where((0, drizzle_orm_1.eq)(schema_1.kudosCards.id, id));
        if (!cardToDelete) {
            throw new errorHandler_1.AppError("Card not found", 404);
        }
        await db_1.db.delete(schema_1.kudosCards).where((0, drizzle_orm_1.eq)(schema_1.kudosCards.id, id));
        // Log history
        // Note: We cannot link to the cardId because it was just deleted
        // and the FK constraint would fail (or cascade delete this log).
        await db_1.db.insert(schema_1.kudosHistory).values({
            action: "delete",
            cardId: null, // Card is gone
            recipientName: cardToDelete.recipientName,
            creatorName: cardToDelete.creatorName,
            creatorEmail: cardToDelete.creatorEmail,
            template: cardToDelete.template,
            metadata: {
                deletedBy,
                originalCardId: cardToDelete.id // Store ID in metadata for reference
            }
        });
        return { success: true };
    }
};
