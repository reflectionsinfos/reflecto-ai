import { db } from "../db";
import { kudosCards, kudosHistory } from "../db/schema";
import { ensureUserAndTenant } from "../db/utils";
import { eq, desc } from "drizzle-orm";
import { AppError } from "../middleware/errorHandler";

interface CreateCardDTO {
  recipientName: string;
  recipientType: string;
  recipientEmails: string[];
  creatorName: string;
  creatorEmail: string;
  template: string;
  templateId: string;
  message: string;
  thumbnailUrl: string;
  cardData: any;
}

interface UserContext {
  email: string;
  name: string;
  tid: string;
}

export const cardService = {
  async createCard(cardData: CreateCardDTO, user: UserContext) {
    console.log("Debug: req.user received:", user);

    let tenantId: string | undefined;
    let userId: string | undefined;

    if (user) {
        try {
            console.log("Debug: Attempting to sync user/tenant...");
            const syncResult = await ensureUserAndTenant({
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
        } catch (syncError) {
            console.error("User Sync Error:", syncError);
            throw new AppError("Failed to synchronize user profile", 500);
        }
    } else {
        console.log("Debug: No user object found in request!");
    }

    if (!userId || !tenantId) {
        console.error("Debug: Missing UserID or TenantID despite sync attempt. userId:", userId, "tenantId:", tenantId);
        throw new AppError("Failed to resolve user or tenant. Please try again.", 500);
    }

    // Validate recipient logic
    const recipientType = cardData.recipientType || 'individual';
    const recipientEmails = Array.isArray(cardData.recipientEmails) ? cardData.recipientEmails : [];

    if (recipientType === 'individual' && recipientEmails.length > 1) {
        throw new AppError("Individual cards can only have one recipient.", 400);
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

    const [card] = await db.insert(kudosCards).values(insertValues).returning();
    
    // Log history
    await db.insert(kudosHistory).values({
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

  async getAllCards(tenantId?: string) {
    let query = db.select().from(kudosCards).orderBy(desc(kudosCards.createdAt));
    const allCards = await query;
    
    if (tenantId) {
        return allCards.filter(c => c.tenantId === tenantId);
    }
    return allCards;
  },

  async getUserCards(email: string) {
    return await db.select().from(kudosCards)
        .where(eq(kudosCards.creatorEmail, email))
        .orderBy(desc(kudosCards.createdAt));
  },

  async deleteCard(id: string, deletedBy?: any) {
    const [cardToDelete] = await db.select().from(kudosCards).where(eq(kudosCards.id, id));
    
    if (!cardToDelete) {
        throw new AppError("Card not found", 404);
    }

    await db.delete(kudosCards).where(eq(kudosCards.id, id));
    
    // Log history
    // Note: We cannot link to the cardId because it was just deleted
    // and the FK constraint would fail (or cascade delete this log).
    await db.insert(kudosHistory).values({
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
