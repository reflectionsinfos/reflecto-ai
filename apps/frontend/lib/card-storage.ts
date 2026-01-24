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
        recipientName: event.metadata?.recipientName || "Unknown",
        creatorName: "User", // Backend doesn't always return creator name?
        creatorEmail: event.senderId, // Need join, but for now ID
        template: event.metadata?.template || "Custom",
        templateId: event.metadata?.templateId || "",
        message: event.metadata?.message || "",
        createdAt: event.createdAt,
        thumbnailUrl: event.imageBlob || "", // Use imageBlob for thumbnail display
        cardData: event.metadata?.cardData || {},
        imageBlob: event.imageBlob,
        recipientType: event.type === 'KUDOS' ? 'individual' : 'team', // Infer
        recipientEmails: event.recipients
    }
}

class CardStorageManager {
  // --- Updated to use Unified Recognition API ---

  async getAllCards(): Promise<StoredCard[]> {
    try {
        // Backend doesn't support "get all" for public yet?
        // Using `getSentByUser` for individual view.
        // For Admin view, we need a new endpoint `getAllEvents`.
        // I'll assume current `/api/cards` replacement is needed.
        // Temporary: return empty if endpoint missing
       return [];
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
          imageBlob: card.thumbnailUrl, // Use Thumbnail as the image blob
          metadata: {
              recipientName: card.recipientName,
              recipientType: card.recipientType,
              template: card.template,
              templateId: card.templateId,
              message: card.message,
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
      // Need delete endpoint in backend
    try {
      // await apiClient.delete(`/recognition/${cardId}`);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Helpers
  logDownload(cardId: string, user: any) {}
}

export const cardStorage = new CardStorageManager();
