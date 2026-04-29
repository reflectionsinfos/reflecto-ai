import { pgSchema, varchar, text, timestamp, json, uuid } from "drizzle-orm/pg-core";

// Define schema namespace
export const mySchema = pgSchema("reflecto-ai");

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
