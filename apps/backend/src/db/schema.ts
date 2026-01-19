import { pgSchema, varchar, text, timestamp, json, uuid, boolean } from "drizzle-orm/pg-core";

// Define schema namespace
export const mySchema = pgSchema("reflecto-ai");

// Tenants Table
export const tenants = mySchema.table("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users Table
export const users = mySchema.table("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).default('user').notNull(), // 'admin' | 'user'
  tenantId: uuid("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Kudos Cards Table
export const kudosCards = mySchema.table("kudos_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientName: varchar("recipient_name", { length: 255 }).notNull(),
  creatorName: varchar("creator_name", { length: 255 }).notNull(),
  creatorEmail: varchar("creator_email", { length: 255 }).notNull(),
  template: varchar("template", { length: 255 }).notNull(),
  templateId: varchar("template_id", { length: 255 }),
  message: text("message").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  cardData: json("card_data").notNull(),
  imageBlob: text("image_blob"), // Storing base64 string
  
  tenantId: uuid("tenant_id").references(() => tenants.id),
  userId: uuid("user_id").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// History Table
export const kudosHistory = mySchema.table("kudos_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: varchar("action", { length: 50 }).notNull(),
  cardId: uuid("card_id").references(() => kudosCards.id, { onDelete: 'cascade' }),
  recipientName: varchar("recipient_name", { length: 255 }),
  creatorName: varchar("creator_name", { length: 255 }),
  creatorEmail: varchar("creator_email", { length: 255 }),
  template: varchar("template", { length: 255 }),
  metadata: json("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
