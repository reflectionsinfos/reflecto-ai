import { pgSchema, varchar, text, timestamp, json, uuid, integer } from "drizzle-orm/pg-core";

// Define schema namespace
export const mySchema = pgSchema("reflecto-ai-2");

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

// --- Talent Intelligence Platform Tables ---

// Unified Recognition Events
export const recognitionEvents = mySchema.table("recognition_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  senderId: uuid("sender_id").references(() => users.id),
  recipients: json("recipients").$type<string[]>().notNull(), // Array of User IDs
  type: varchar("type", { length: 50 }).notNull(), // 'KUDOS', 'SHOUT_OUT', etc.
  imageBlob: text("image_blob"), // Store base64 or URL of the generated poster
  metadata: json("metadata").default({}).notNull(),
  privacyLevel: varchar("privacy_level", { length: 20 }).default('PUBLIC').notNull(),
});

// User Competencies (Inferred or Manual)
export const userCompetencies = mySchema.table("user_competencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  competency: varchar("competency", { length: 100 }).notNull(),
  level: integer("level"), // 1-5
  source: varchar("source", { length: 50 }).default('INFERRED').notNull(),
});

// User Narratives (Source for Vectors)
export const userNarratives = mySchema.table("user_narratives", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  // embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Evidence Logs (Signals)
export const evidenceLogs = mySchema.table("evidence_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 50 }).notNull(), // 'KUDOS', 'NARRATIVE'
  content: text("content").notNull(),
  // embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
