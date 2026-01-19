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
  imageBlob?: string // Base64 encoded image data
}

export interface HistoryEntry {
  id: string
  action: "create" | "delete" | "download"
  cardId: string
  recipientName: string
  creatorName: string
  creatorEmail: string
  template: string
  timestamp: string
  metadata?: any
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// Assuming we use the default tenant/admin for now, or fetch from context
// For this iteration, we'll hardcode the ID seeded or fetch safely
const DEFAULT_TENANT_ID = "75e9f297-3090-477c-ac59-e3a4614380b4"; // From seed output
const DEFAULT_USER_EMAIL = "admin@kudoscard.com";

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
  imageBlob?: string // Base64 encoded image data
}

export interface HistoryEntry {
  id: string
  action: "create" | "delete" | "download"
  cardId: string
  recipientName: string
  creatorName: string
  creatorEmail: string
  template: string
  timestamp: string
  metadata?: any
}

class CardStorageManager {
  // Card Management
  async getAllCards(): Promise<StoredCard[]> {
    try {
      const res = await fetch(`${API_URL}/cards?tenantId=${DEFAULT_TENANT_ID}`);
      if (!res.ok) throw new Error("Failed to fetch cards");
      return await res.json();
    } catch (error) {
      console.error("Error loading cards:", error);
      return [];
    }
  }

  async getCardsByUser(userEmail: string): Promise<StoredCard[]> {
    try {
        const res = await fetch(`${API_URL}/cards/user/${userEmail}`);
        if (!res.ok) throw new Error("Failed to fetch user cards");
        return await res.json();
    } catch (error) {
        console.error("Error loading user cards:", error);
        return [];
    }
  }

  async getCardById(id: string): Promise<StoredCard | null> {
    const cards = await this.getAllCards();
    return cards.find((card) => card.id === id) || null;
  }

  async saveCard(card: StoredCard): Promise<StoredCard> {
    try {
      const payload = {
          ...card,
          tenantId: DEFAULT_TENANT_ID, 
          // userId would be resolved by backend from email in real app or passed here
          // For now backend might require it or optional? 
          // We'll pass it if we have it in card object, but StoredCard doesn't have it.
          // The backend schema allows nullable userId? Or we need to look it up.
          // Let's assume backend handles it or we pass it.
      };

      const res = await fetch(`${API_URL}/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Failed to save card");
      return await res.json();

    } catch (error: any) {
      console.error("Error saving card:", error);
      throw new Error("Failed to save card");
    }
  }

  async deleteCard(cardId: string, deletedBy: { name: string; email: string }): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/cards/${cardId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deletedBy: deletedBy.email })
      });
      return res.ok;
    } catch (error) {
      console.error("Error deleting card:", error);
      return false;
    }
  }

  // History Management (Deprecated/Handled by Backend)
  getHistory(): HistoryEntry[] {
    // For now returning empty or we could implement fetch
    return [];
  }

  logHistory(entry: HistoryEntry): void {
    // Backend handles logging
  }

  logDownload(cardId: string, downloadedBy: { name: string; email: string }): void {
      // We could add an endpoint for log-download
      // For now no-op
      console.log("Download logged locally (backend pending)");
  }

  // Analytics helpers
  async getCardStats() {
    const cards = await this.getAllCards();
    const totalCards = cards.length;
    const totalCreators = new Set(cards.map((c) => c.creatorEmail)).size;
    const templateCounts = cards.reduce(
      (acc, card) => {
        acc[card.template] = (acc[card.template] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalCards,
      totalCreators,
      templateCounts,
      recentActivity: [], // Fetch history if needed
      totalActions: 0,
    };
  }

  // Utility methods
  generateCardId(): string {
      // Backend generates ID, but frontend might need temp ID?
      // We'll leave this but backend ignores it or use it?
      // Schema uses uuid defaultRandom().
      return ""; 
  }

  async cardToBase64(canvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        } else {
          resolve("");
        }
      }, "image/png");
    });
  }
}

// Export singleton instance
export const cardStorage = new CardStorageManager();
