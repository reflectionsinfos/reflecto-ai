import { pgSchema, varchar, text, timestamp, json, uuid, integer, boolean } from "drizzle-orm/pg-core";

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
  azureOid: varchar("azure_oid", { length: 100 }).unique(), // immutable Azure Object ID — primary lookup key
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).default('user').notNull(), // 'admin' | 'user'
  tenantId: uuid("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Custom Templates (user-defined kudos card templates)
export const customTemplates = mySchema.table("custom_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  tagline: varchar("tagline", { length: 200 }),
  color: varchar("color", { length: 50 }).notNull(),    // e.g. "blue", "teal"
  iconName: varchar("icon_name", { length: 50 }).notNull(), // e.g. "Star", "Trophy"
  isPublic: boolean("is_public").default(false).notNull(),  // admin can share org-wide
  backgroundImageBlob: text("background_image_blob"), // Base64-encoded background image, nullable
});

// Message Templates (default messages for system templates + org-wide custom templates)
export const messageTemplates = mySchema.table("message_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: varchar("template_id", { length: 50 }).notNull(), // "customer-centricity", "agility", or custom template UUID
  templateType: varchar("template_type", { length: 20 }), // "system" or "custom"
  messageCategory: varchar("message_category", { length: 50 }).notNull(), // "individual" or "team"
  order: integer("order").notNull(), // 1-5, for consistent UI ordering
  text: text("text").notNull(), // The actual message
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id), // NULL for system defaults
  isPublic: boolean("is_public").default(true).notNull(),
});

// Custom Template Messages (user-customizable messages per custom template)
export const customTemplateMessages = mySchema.table("custom_template_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  customTemplateId: uuid("custom_template_id")
    .references(() => customTemplates.id, { onDelete: "cascade" })
    .notNull(),
  messageCategory: varchar("message_category", { length: 50 }).notNull(), // "individual" or "team"
  order: integer("order").notNull(), // 1-5
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
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

// --- Tech Growth Plan Tables ---

// User Learning Profile (Tech stack, projects, goals)
export const userLearningProfiles = mySchema.table("user_learning_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  currentProjects: json("current_projects").$type<string[]>().default([]),
  techStack: json("tech_stack").$type<string[]>().default([]),
  domain: varchar("domain", { length: 100 }),
  learningGoals: text("learning_goals"),
  monthlyObjectives: json("monthly_objectives").$type<{month: string, goals: string[]}[]>().default([]),
  
  // Organizational Alignment
  organizationalPriorities: json("organizational_priorities").$type<string[]>().default([]), // Company/dept focus areas
  managerNotes: text("manager_notes"), // Manager's input on learning direction
  
  // Approval Workflow
  status: varchar("status", { length: 20 }).default('DRAFT'), // 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REVISION_REQUESTED'
  submittedAt: timestamp("submitted_at"),
  approvedBy: uuid("approved_by").references(() => users.id), // Manager's user ID
  approvedAt: timestamp("approved_at"),
  revisionComments: text("revision_comments"),
  
  preferredDelivery: varchar("preferred_delivery", { length: 20 }).default('teams'), // 'teams', 'email', 'both'
  isActive: varchar("is_active", { length: 10 }).default('true'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI-Generated Learning Content
export const learningContent = mySchema.table("learning_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  topic: varchar("topic", { length: 200 }).notNull(),
  techStack: varchar("tech_stack", { length: 100 }).notNull(),
  difficulty: varchar("difficulty", { length: 20 }).notNull(), // 'beginner', 'intermediate', 'advanced'
  lessonContent: text("lesson_content").notNull(), // Markdown format
  exercise: json("exercise").$type<{question: string, hints: string[], solution?: string}>(),
  quizQuestions: json("quiz_questions").$type<{question: string, options: string[], correctIndex: number, explanation: string}[]>(),
  estimatedReadTime: integer("estimated_read_time").default(2), // minutes
  aiModel: varchar("ai_model", { length: 50 }).default('gpt-4'),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

// User Learning Progress (Daily tracking)
export const userLearningProgress = mySchema.table("user_learning_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  contentId: uuid("content_id").references(() => learningContent.id),
  deliveredAt: timestamp("delivered_at").defaultNow().notNull(),
  deliveryMethod: varchar("delivery_method", { length: 20 }), // 'teams', 'email'
  lessonViewed: varchar("lesson_viewed", { length: 10 }).default('false'),
  exerciseCompleted: varchar("exercise_completed", { length: 10 }).default('false'),
  exerciseSubmission: text("exercise_submission"),
  quizScore: integer("quiz_score"), // 0-100
  quizAnswers: json("quiz_answers").$type<number[]>(), // Array of selected option indices
  quizSubmittedAt: timestamp("quiz_submitted_at"),
  pointsEarned: integer("points_earned").default(0),
  aiFeedback: text("ai_feedback"),
  completedAt: timestamp("completed_at"),
});

// User Rewards & Gamification
export const userRewards = mySchema.table("user_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  totalPoints: integer("total_points").default(0),
  currentStreak: integer("current_streak").default(0), // Consecutive days
  longestStreak: integer("longest_streak").default(0),
  badges: json("badges").$type<{id: string, name: string, earnedAt: string}[]>().default([]),
  level: integer("level").default(1),
  lastActivityDate: timestamp("last_activity_date"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inferred Skills (Auto-populated from learning progress)
export const inferredSkills = mySchema.table("inferred_skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  skillName: varchar("skill_name", { length: 100 }).notNull(),
  proficiencyLevel: integer("proficiency_level").default(0), // 0-100
  lessonsCompleted: integer("lessons_completed").default(0),
  lastPracticedAt: timestamp("last_practiced_at"),
  source: varchar("source", { length: 50 }).default('LEARNING_PATH'), // 'LEARNING_PATH', 'KUDOS', 'PROJECT'
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
