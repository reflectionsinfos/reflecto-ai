import { apiClient } from "./api-client";

export interface StoredCard {
  id: string
  recipientName: string
  creatorName: string
  creatorEmail: string
  template: string
  templateId: string
  message: string
  createdAt: string
  thumbnailUrl: string
  cardData: any
  imageBlob?: string
  recipientType?: string
  recipientEmails?: string[]
}

// Map Backend Event to Frontend Card
const mapEventToCard = (event: any): StoredCard => {
    return {
        id: event.id,
 
        recipientName:
            event.metadata?.recipientName || "Unknown",
 
        creatorName:
            event.metadata?.creatorName ||
            event.metadata?.cardData?.creatorName ||
            "Unknown User",
 
        creatorEmail:
            event.metadata?.creatorEmail ||
            event.metadata?.cardData?.creatorEmail ||
            event.senderEmail ||
            event.senderId ||
            "",
 
        template:
            event.metadata?.template || "Custom",
 
        templateId:
            event.metadata?.templateId || "",
 
        message:
            event.metadata?.message || "",
 
        createdAt:
            event.createdAt,
 
        thumbnailUrl:
            event.metadata?.thumbnailUrl ||
            event.imageBlob ||
            "",
 
        cardData:
            event.metadata?.cardData || {},
 
        imageBlob:
            event.imageBlob,
 
        recipientType:
            event.metadata?.recipientType ||
            (event.type === "KUDOS" ? "individual" : "team"),
 
        recipientEmails:
            event.recipients || [],
    }
}

class CardStorageManager {
  // --- Updated to use Unified Recognition API ---

  async getAllCards(): Promise<StoredCard[]> {
    try {
        const events = await apiClient.get<any[]>("/recognition");
        return events.map(mapEventToCard);
    } catch (error) {
       console.error("Error loading cards:", error);
       return [];
    }
  }

  async getCardsByUser(userEmail: string): Promise<StoredCard[]> {
    // Phase 2 Update: Use /sent/me to ensure we resolve the correct internal ID via the token
    const endpoint = `/recognition/sent/me`; 
    try {
        const events = await apiClient.get<any[]>(endpoint);
        return events.map(mapEventToCard);
    } catch (error) {
        console.error("Error loading user cards:", error);
        return [];
    }
  }

  async saveCard(card: StoredCard): Promise<StoredCard> {
    try {
      // Map Frontend Card -> Backend Event
      const payload = {
          type: "KUDOS",
          recipients: card.recipientEmails || [], 
          imageBlob: null, // We no longer save the massive base64 string to the DB
          metadata: {
              recipientName: card.recipientName,
              recipientType: card.recipientType,
              creatorName: card.creatorName,
              creatorEmail: card.creatorEmail,
              template: card.template,
              templateId: card.templateId,
              message: card.message,
              thumbnailUrl: card.thumbnailUrl,
              cardData: card.cardData
          },
          privacyLevel: "PUBLIC"
      };

      const event: any = await apiClient.post("/recognition", payload);
      return mapEventToCard(event);
    } catch (error: any) {
      console.error("Error saving card:", error);
      throw new Error("Failed to save card");
    }
  }

  async deleteCard(cardId: string, deletedBy: { name: string; email: string }): Promise<boolean> {
    try {
      await apiClient.delete(`/recognition/${cardId}`);
      return true;
    } catch (error) {
      console.error("Error deleting card:", error);
      return false;
    }
  }
  
  // Helpers
  logDownload(cardId: string, user: any) {}
}

export const cardStorage = new CardStorageManager();
