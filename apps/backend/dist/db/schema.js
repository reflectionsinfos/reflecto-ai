"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kudosHistory = exports.kudosCards = exports.users = exports.tenants = exports.mySchema = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// Define schema namespace
exports.mySchema = (0, pg_core_1.pgSchema)("reflecto-ai");
// Tenants Table
exports.tenants = exports.mySchema.table("tenants", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Users Table
exports.users = exports.mySchema.table("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    role: (0, pg_core_1.varchar)("role", { length: 50 }).default('user').notNull(), // 'admin' | 'user'
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Kudos Cards Table
exports.kudosCards = exports.mySchema.table("kudos_cards", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    recipientName: (0, pg_core_1.varchar)("recipient_name", { length: 255 }).notNull(), // For Team, this can be "Team X" or main contact
    recipientType: (0, pg_core_1.varchar)("recipient_type", { length: 50 }).default('individual').notNull(), // 'individual' | 'team'
    recipientEmails: (0, pg_core_1.json)("recipient_emails").$type().default([]).notNull(), // Array of emails
    creatorName: (0, pg_core_1.varchar)("creator_name", { length: 255 }).notNull(),
    creatorEmail: (0, pg_core_1.varchar)("creator_email", { length: 255 }).notNull(),
    template: (0, pg_core_1.varchar)("template", { length: 255 }).notNull(),
    templateId: (0, pg_core_1.varchar)("template_id", { length: 255 }),
    message: (0, pg_core_1.text)("message").notNull(),
    thumbnailUrl: (0, pg_core_1.text)("thumbnail_url"),
    cardData: (0, pg_core_1.json)("card_data").notNull(),
    imageBlob: (0, pg_core_1.text)("image_blob"), // Storing base64 string
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// History Table
exports.kudosHistory = exports.mySchema.table("kudos_history", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    action: (0, pg_core_1.varchar)("action", { length: 50 }).notNull(),
    cardId: (0, pg_core_1.uuid)("card_id").references(() => exports.kudosCards.id, { onDelete: 'cascade' }),
    recipientName: (0, pg_core_1.varchar)("recipient_name", { length: 255 }),
    creatorName: (0, pg_core_1.varchar)("creator_name", { length: 255 }),
    creatorEmail: (0, pg_core_1.varchar)("creator_email", { length: 255 }),
    template: (0, pg_core_1.varchar)("template", { length: 255 }),
    metadata: (0, pg_core_1.json)("metadata"),
    timestamp: (0, pg_core_1.timestamp)("timestamp").defaultNow().notNull(),
});
