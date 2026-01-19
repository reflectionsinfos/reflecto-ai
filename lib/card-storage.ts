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
  private readonly CARDS_KEY = "kudos_cards"
  private readonly HISTORY_KEY = "kudos_history"

  // Card Management
  getAllCards(): StoredCard[] {
    if (typeof window === "undefined") return []

    try {
      const cards = localStorage.getItem(this.CARDS_KEY)
      return cards ? JSON.parse(cards) : []
    } catch (error) {
      console.error("Error loading cards:", error)
      return []
    }
  }

  getCardsByUser(userEmail: string): StoredCard[] {
    return this.getAllCards().filter((card) => card.creatorEmail === userEmail)
  }

  getCardById(id: string): StoredCard | null {
    const cards = this.getAllCards()
    return cards.find((card) => card.id === id) || null
  }

  saveCard(card: StoredCard): void {
    if (typeof window === "undefined") return

    try {
      const cards = this.getAllCards()
      const existingIndex = cards.findIndex((c) => c.id === card.id)

      if (existingIndex >= 0) {
        cards[existingIndex] = card
      } else {
        cards.push(card)
      }

      localStorage.setItem(this.CARDS_KEY, JSON.stringify(cards))

      // Log creation to history
      this.logHistory({
        id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action: "create",
        cardId: card.id,
        recipientName: card.recipientName,
        creatorName: card.creatorName,
        creatorEmail: card.creatorEmail,
        template: card.template,
        timestamp: new Date().toISOString(),
        metadata: {
          templateId: card.templateId,
        },
      })
    } catch (error) {
      console.error("Error saving card:", error)
      throw new Error("Failed to save card")
    }
  }

  deleteCard(cardId: string, deletedBy: { name: string; email: string }): boolean {
    if (typeof window === "undefined") return false

    try {
      const cards = this.getAllCards()
      const cardIndex = cards.findIndex((card) => card.id === cardId)

      if (cardIndex === -1) return false

      const deletedCard = cards[cardIndex]
      cards.splice(cardIndex, 1)

      localStorage.setItem(this.CARDS_KEY, JSON.stringify(cards))

      // Log deletion to history
      this.logHistory({
        id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action: "delete",
        cardId: deletedCard.id,
        recipientName: deletedCard.recipientName,
        creatorName: deletedCard.creatorName,
        creatorEmail: deletedCard.creatorEmail,
        template: deletedCard.template,
        timestamp: new Date().toISOString(),
        metadata: {
          deletedBy: deletedBy.name,
          deletedByEmail: deletedBy.email,
        },
      })

      return true
    } catch (error) {
      console.error("Error deleting card:", error)
      return false
    }
  }

  // History Management
  getHistory(): HistoryEntry[] {
    if (typeof window === "undefined") return []

    try {
      const history = localStorage.getItem(this.HISTORY_KEY)
      return history ? JSON.parse(history) : []
    } catch (error) {
      console.error("Error loading history:", error)
      return []
    }
  }

  logHistory(entry: HistoryEntry): void {
    if (typeof window === "undefined") return

    try {
      const history = this.getHistory()
      history.unshift(entry) // Add to beginning for chronological order

      // Keep only last 1000 entries to prevent storage bloat
      if (history.length > 1000) {
        history.splice(1000)
      }

      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history))
    } catch (error) {
      console.error("Error logging history:", error)
    }
  }

  logDownload(cardId: string, downloadedBy: { name: string; email: string }): void {
    const card = this.getCardById(cardId)
    if (!card) return

    this.logHistory({
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: "download",
      cardId: card.id,
      recipientName: card.recipientName,
      creatorName: card.creatorName,
      creatorEmail: card.creatorEmail,
      template: card.template,
      timestamp: new Date().toISOString(),
      metadata: {
        downloadedBy: downloadedBy.name,
        downloadedByEmail: downloadedBy.email,
      },
    })
  }

  // Analytics helpers
  getCardStats() {
    const cards = this.getAllCards()
    const history = this.getHistory()

    const totalCards = cards.length
    const totalCreators = new Set(cards.map((c) => c.creatorEmail)).size
    const templateCounts = cards.reduce(
      (acc, card) => {
        acc[card.template] = (acc[card.template] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const recentActivity = history.slice(0, 10)

    return {
      totalCards,
      totalCreators,
      templateCounts,
      recentActivity,
      totalActions: history.length,
    }
  }

  // Utility methods
  generateCardId(): string {
    return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async cardToBase64(canvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        } else {
          resolve("")
        }
      }, "image/png")
    })
  }
}

// Export singleton instance
export const cardStorage = new CardStorageManager()
