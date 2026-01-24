import { db } from "../db";
import { recognitionEvents, users } from "../db/schema";
import { eq } from "drizzle-orm";

export class RecognitionService {
  /**
   * Ensure user exists in DB and return their ID
   */
  static async resolveUser(email: string, name: string) {
      if (!email) return null;
      
      const existing = await db.select().from(users).where(eq(users.email, email));
      if (existing.length > 0) {
          return existing[0].id;
      }

      // Create new user if not found
      // Note: Tenant ID is null for now or default
      const [newUser] = await db.insert(users).values({
          email,
          name: name || email.split('@')[0],
          role: 'user'
      }).returning();
      
      return newUser.id;
  }

  /**
   * Create a new recognition event (Kudos, ShoutOut, etc)
   */
  static async createEvent(data: typeof recognitionEvents.$inferInsert) {
    const [event] = await db.insert(recognitionEvents).values(data).returning();
    return event;
  }

  /**
   * Get all recognition events sent by a user
   */
  static async getSentByUser(userId: string) {
    return db.select().from(recognitionEvents).where(eq(recognitionEvents.senderId, userId));
  }
}
