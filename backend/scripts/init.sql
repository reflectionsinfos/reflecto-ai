-- ============================================================
-- ReflectoAI -- Fresh Deployment Script
-- Schema: reflecto-ai-2
-- Generated from: drizzle/0000 → 0005 (squashed)
-- Run this on a clean PostgreSQL database for a fresh install.
-- ============================================================

-- Enable pgvector extension if needed in future
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Schema
CREATE SCHEMA IF NOT EXISTS "reflecto-ai-2";

-- ============================================================
-- Core: Tenants & Users
-- ============================================================

CREATE TABLE "reflecto-ai-2"."tenants" (
    "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name"       varchar(255) NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "reflecto-ai-2"."users" (
    "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email"      varchar(255) NOT NULL,
    "name"       varchar(255) NOT NULL,
    "role"       varchar(50) DEFAULT 'user' NOT NULL,
    "tenant_id"  uuid,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "users_email_unique" UNIQUE ("email")
);

ALTER TABLE "reflecto-ai-2"."users"
    ADD CONSTRAINT "users_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "reflecto-ai-2"."tenants"("id");

-- ============================================================
-- Recognition
-- ============================================================

CREATE TABLE "reflecto-ai-2"."recognition_events" (
    "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at"    timestamp DEFAULT now() NOT NULL,
    "sender_id"     uuid,
    "recipients"    json NOT NULL,
    "type"          varchar(50) NOT NULL,
    "metadata"      json DEFAULT '{}'::json NOT NULL,
    "privacy_level" varchar(20) DEFAULT 'PUBLIC' NOT NULL,
    "image_blob"    text
);

ALTER TABLE "reflecto-ai-2"."recognition_events"
    ADD CONSTRAINT "recognition_events_sender_id_users_id_fk"
    FOREIGN KEY ("sender_id") REFERENCES "reflecto-ai-2"."users"("id");

-- ============================================================
-- Custom Templates (user-defined kudos card templates)
-- ============================================================

CREATE TABLE IF NOT EXISTS "reflecto-ai-2"."custom_templates" (
    "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at"  timestamp DEFAULT now() NOT NULL,
    "created_by"  uuid NOT NULL,
    "name"        varchar(100) NOT NULL,
    "tagline"     varchar(200),
    "color"       varchar(50) NOT NULL,
    "icon_name"   varchar(50) NOT NULL,
    "is_public"   boolean DEFAULT false NOT NULL
);

ALTER TABLE "reflecto-ai-2"."custom_templates"
    ADD CONSTRAINT "custom_templates_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "reflecto-ai-2"."users"("id");

-- ============================================================
-- Talent Intelligence: Evidence & Competencies
-- ============================================================

CREATE TABLE "reflecto-ai-2"."evidence_logs" (
    "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "type"       varchar(50) NOT NULL,
    "content"    text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "reflecto-ai-2"."user_competencies" (
    "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id"    uuid NOT NULL,
    "competency" varchar(100) NOT NULL,
    "level"      integer,
    "source"     varchar(50) DEFAULT 'INFERRED' NOT NULL
);

CREATE TABLE "reflecto-ai-2"."user_narratives" (
    "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id"    uuid NOT NULL,
    "content"    text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "reflecto-ai-2"."user_competencies"
    ADD CONSTRAINT "user_competencies_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "reflecto-ai-2"."users"("id");

ALTER TABLE "reflecto-ai-2"."user_narratives"
    ADD CONSTRAINT "user_narratives_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "reflecto-ai-2"."users"("id");

-- ============================================================
-- Learning Platform
-- ============================================================

CREATE TABLE "reflecto-ai-2"."learning_content" (
    "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "topic"               varchar(200) NOT NULL,
    "tech_stack"          varchar(100) NOT NULL,
    "difficulty"          varchar(20) NOT NULL,
    "lesson_content"      text NOT NULL,
    "exercise"            json,
    "quiz_questions"      json,
    "estimated_read_time" integer DEFAULT 2,
    "ai_model"            varchar(50) DEFAULT 'gpt-4',
    "generated_at"        timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "reflecto-ai-2"."user_learning_profiles" (
    "id"                      uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id"                 uuid NOT NULL,
    "current_projects"        json DEFAULT '[]'::json,
    "tech_stack"              json DEFAULT '[]'::json,
    "domain"                  varchar(100),
    "learning_goals"          text,
    "monthly_objectives"      json DEFAULT '[]'::json,
    "preferred_delivery"      varchar(20) DEFAULT 'teams',
    "is_active"               varchar(10) DEFAULT 'true',
    "organizational_priorities" json DEFAULT '[]'::json,
    "manager_notes"           text,
    "status"                  varchar(20) DEFAULT 'DRAFT',
    "submitted_at"            timestamp,
    "approved_by"             uuid,
    "approved_at"             timestamp,
    "revision_comments"       text,
    "created_at"              timestamp DEFAULT now() NOT NULL,
    "updated_at"              timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "user_learning_profiles_user_id_unique" UNIQUE ("user_id")
);

CREATE TABLE "reflecto-ai-2"."user_learning_progress" (
    "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id"             uuid NOT NULL,
    "content_id"          uuid,
    "delivered_at"        timestamp DEFAULT now() NOT NULL,
    "delivery_method"     varchar(20),
    "lesson_viewed"       varchar(10) DEFAULT 'false',
    "exercise_completed"  varchar(10) DEFAULT 'false',
    "exercise_submission" text,
    "quiz_score"          integer,
    "quiz_answers"        json,
    "quiz_submitted_at"   timestamp,
    "points_earned"       integer DEFAULT 0,
    "ai_feedback"         text,
    "completed_at"        timestamp
);

CREATE TABLE "reflecto-ai-2"."user_rewards" (
    "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id"            uuid NOT NULL,
    "total_points"       integer DEFAULT 0,
    "current_streak"     integer DEFAULT 0,
    "longest_streak"     integer DEFAULT 0,
    "badges"             json DEFAULT '[]'::json,
    "level"              integer DEFAULT 1,
    "last_activity_date" timestamp,
    "updated_at"         timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "user_rewards_user_id_unique" UNIQUE ("user_id")
);

CREATE TABLE "reflecto-ai-2"."inferred_skills" (
    "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id"          uuid NOT NULL,
    "skill_name"       varchar(100) NOT NULL,
    "proficiency_level" integer DEFAULT 0,
    "lessons_completed" integer DEFAULT 0,
    "last_practiced_at" timestamp,
    "source"           varchar(50) DEFAULT 'LEARNING_PATH',
    "updated_at"       timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "reflecto-ai-2"."user_learning_profiles"
    ADD CONSTRAINT "user_learning_profiles_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "reflecto-ai-2"."users"("id");

ALTER TABLE "reflecto-ai-2"."user_learning_profiles"
    ADD CONSTRAINT "user_learning_profiles_approved_by_users_id_fk"
    FOREIGN KEY ("approved_by") REFERENCES "reflecto-ai-2"."users"("id");

ALTER TABLE "reflecto-ai-2"."user_learning_progress"
    ADD CONSTRAINT "user_learning_progress_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "reflecto-ai-2"."users"("id");

ALTER TABLE "reflecto-ai-2"."user_learning_progress"
    ADD CONSTRAINT "user_learning_progress_content_id_learning_content_id_fk"
    FOREIGN KEY ("content_id") REFERENCES "reflecto-ai-2"."learning_content"("id");

ALTER TABLE "reflecto-ai-2"."user_rewards"
    ADD CONSTRAINT "user_rewards_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "reflecto-ai-2"."users"("id");

ALTER TABLE "reflecto-ai-2"."inferred_skills"
    ADD CONSTRAINT "inferred_skills_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "reflecto-ai-2"."users"("id");
