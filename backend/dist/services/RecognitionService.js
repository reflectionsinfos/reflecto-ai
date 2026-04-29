"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecognitionService = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class RecognitionService {
    /**
     * Ensure user exists in DB and return their ID
     */
    static async resolveUser(email, name) {
        if (!email)
            return null;
        const existing = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email));
        if (existing.length > 0) {
            return existing[0].id;
        }
        // Create new user if not found
        // Note: Tenant ID is null for now or default
        const [newUser] = await db_1.db.insert(schema_1.users).values({
            email,
            name: name || email.split('@')[0],
            role: 'user'
        }).returning();
        return newUser.id;
    }
    /**
     * Create a new recognition event (Kudos, ShoutOut, etc)
     */
    static async createEvent(data) {
        const [event] = await db_1.db.insert(schema_1.recognitionEvents).values(data).returning();
        return event;
    }
    /**
     * Get all recognition events sent by a user
     */
    static async getSentByUser(userId) {
        return db_1.db.select().from(schema_1.recognitionEvents).where((0, drizzle_orm_1.eq)(schema_1.recognitionEvents.senderId, userId));
    }
    /**
     * Get all recognition events (Admin/Global View)
     */
    static async getAllEvents() {
        return db_1.db.select().from(schema_1.recognitionEvents);
    }
}
exports.RecognitionService = RecognitionService;
