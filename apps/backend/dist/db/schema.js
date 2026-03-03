"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferredSkills = exports.userRewards = exports.userLearningProgress = exports.learningContent = exports.userLearningProfiles = exports.evidenceLogs = exports.userNarratives = exports.userCompetencies = exports.recognitionEvents = exports.users = exports.tenants = exports.mySchema = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// Define schema namespace
exports.mySchema = (0, pg_core_1.pgSchema)("reflecto-ai-2");
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
// --- Talent Intelligence Platform Tables ---
// Unified Recognition Events
exports.recognitionEvents = exports.mySchema.table("recognition_events", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    senderId: (0, pg_core_1.uuid)("sender_id").references(() => exports.users.id),
    recipients: (0, pg_core_1.json)("recipients").$type().notNull(), // Array of User IDs
    type: (0, pg_core_1.varchar)("type", { length: 50 }).notNull(), // 'KUDOS', 'SHOUT_OUT', etc.
    imageBlob: (0, pg_core_1.text)("image_blob"), // Store base64 or URL of the generated poster
    metadata: (0, pg_core_1.json)("metadata").default({}).notNull(),
    privacyLevel: (0, pg_core_1.varchar)("privacy_level", { length: 20 }).default('PUBLIC').notNull(),
});
// User Competencies (Inferred or Manual)
exports.userCompetencies = exports.mySchema.table("user_competencies", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id).notNull(),
    competency: (0, pg_core_1.varchar)("competency", { length: 100 }).notNull(),
    level: (0, pg_core_1.integer)("level"), // 1-5
    source: (0, pg_core_1.varchar)("source", { length: 50 }).default('INFERRED').notNull(),
});
// User Narratives (Source for Vectors)
exports.userNarratives = exports.mySchema.table("user_narratives", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id).notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    // embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Evidence Logs (Signals)
exports.evidenceLogs = exports.mySchema.table("evidence_logs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    type: (0, pg_core_1.varchar)("type", { length: 50 }).notNull(), // 'KUDOS', 'NARRATIVE'
    content: (0, pg_core_1.text)("content").notNull(),
    // embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// --- Tech Growth Plan Tables ---
// User Learning Profile (Tech stack, projects, goals)
exports.userLearningProfiles = exports.mySchema.table("user_learning_profiles", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id).notNull().unique(),
    currentProjects: (0, pg_core_1.json)("current_projects").$type().default([]),
    techStack: (0, pg_core_1.json)("tech_stack").$type().default([]),
    domain: (0, pg_core_1.varchar)("domain", { length: 100 }),
    learningGoals: (0, pg_core_1.text)("learning_goals"),
    monthlyObjectives: (0, pg_core_1.json)("monthly_objectives").$type().default([]),
    // Organizational Alignment
    organizationalPriorities: (0, pg_core_1.json)("organizational_priorities").$type().default([]), // Company/dept focus areas
    managerNotes: (0, pg_core_1.text)("manager_notes"), // Manager's input on learning direction
    // Approval Workflow
    status: (0, pg_core_1.varchar)("status", { length: 20 }).default('DRAFT'), // 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REVISION_REQUESTED'
    submittedAt: (0, pg_core_1.timestamp)("submitted_at"),
    approvedBy: (0, pg_core_1.uuid)("approved_by").references(() => exports.users.id), // Manager's user ID
    approvedAt: (0, pg_core_1.timestamp)("approved_at"),
    revisionComments: (0, pg_core_1.text)("revision_comments"),
    preferredDelivery: (0, pg_core_1.varchar)("preferred_delivery", { length: 20 }).default('teams'), // 'teams', 'email', 'both'
    isActive: (0, pg_core_1.varchar)("is_active", { length: 10 }).default('true'),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// AI-Generated Learning Content
exports.learningContent = exports.mySchema.table("learning_content", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    topic: (0, pg_core_1.varchar)("topic", { length: 200 }).notNull(),
    techStack: (0, pg_core_1.varchar)("tech_stack", { length: 100 }).notNull(),
    difficulty: (0, pg_core_1.varchar)("difficulty", { length: 20 }).notNull(), // 'beginner', 'intermediate', 'advanced'
    lessonContent: (0, pg_core_1.text)("lesson_content").notNull(), // Markdown format
    exercise: (0, pg_core_1.json)("exercise").$type(),
    quizQuestions: (0, pg_core_1.json)("quiz_questions").$type(),
    estimatedReadTime: (0, pg_core_1.integer)("estimated_read_time").default(2), // minutes
    aiModel: (0, pg_core_1.varchar)("ai_model", { length: 50 }).default('gpt-4'),
    generatedAt: (0, pg_core_1.timestamp)("generated_at").defaultNow().notNull(),
});
// User Learning Progress (Daily tracking)
exports.userLearningProgress = exports.mySchema.table("user_learning_progress", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id).notNull(),
    contentId: (0, pg_core_1.uuid)("content_id").references(() => exports.learningContent.id),
    deliveredAt: (0, pg_core_1.timestamp)("delivered_at").defaultNow().notNull(),
    deliveryMethod: (0, pg_core_1.varchar)("delivery_method", { length: 20 }), // 'teams', 'email'
    lessonViewed: (0, pg_core_1.varchar)("lesson_viewed", { length: 10 }).default('false'),
    exerciseCompleted: (0, pg_core_1.varchar)("exercise_completed", { length: 10 }).default('false'),
    exerciseSubmission: (0, pg_core_1.text)("exercise_submission"),
    quizScore: (0, pg_core_1.integer)("quiz_score"), // 0-100
    quizAnswers: (0, pg_core_1.json)("quiz_answers").$type(), // Array of selected option indices
    quizSubmittedAt: (0, pg_core_1.timestamp)("quiz_submitted_at"),
    pointsEarned: (0, pg_core_1.integer)("points_earned").default(0),
    aiFeedback: (0, pg_core_1.text)("ai_feedback"),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
});
// User Rewards & Gamification
exports.userRewards = exports.mySchema.table("user_rewards", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id).notNull().unique(),
    totalPoints: (0, pg_core_1.integer)("total_points").default(0),
    currentStreak: (0, pg_core_1.integer)("current_streak").default(0), // Consecutive days
    longestStreak: (0, pg_core_1.integer)("longest_streak").default(0),
    badges: (0, pg_core_1.json)("badges").$type().default([]),
    level: (0, pg_core_1.integer)("level").default(1),
    lastActivityDate: (0, pg_core_1.timestamp)("last_activity_date"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Inferred Skills (Auto-populated from learning progress)
exports.inferredSkills = exports.mySchema.table("inferred_skills", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id).notNull(),
    skillName: (0, pg_core_1.varchar)("skill_name", { length: 100 }).notNull(),
    proficiencyLevel: (0, pg_core_1.integer)("proficiency_level").default(0), // 0-100
    lessonsCompleted: (0, pg_core_1.integer)("lessons_completed").default(0),
    lastPracticedAt: (0, pg_core_1.timestamp)("last_practiced_at"),
    source: (0, pg_core_1.varchar)("source", { length: 50 }).default('LEARNING_PATH'), // 'LEARNING_PATH', 'KUDOS', 'PROJECT'
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
