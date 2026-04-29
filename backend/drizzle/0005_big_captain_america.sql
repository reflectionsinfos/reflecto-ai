CREATE TABLE "reflecto-ai-2"."inferred_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"skill_name" varchar(100) NOT NULL,
	"proficiency_level" integer DEFAULT 0,
	"lessons_completed" integer DEFAULT 0,
	"last_practiced_at" timestamp,
	"source" varchar(50) DEFAULT 'LEARNING_PATH',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_learning_profiles" ADD COLUMN "organizational_priorities" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_learning_profiles" ADD COLUMN "manager_notes" text;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_learning_profiles" ADD COLUMN "status" varchar(20) DEFAULT 'DRAFT';--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_learning_profiles" ADD COLUMN "submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_learning_profiles" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_learning_profiles" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_learning_profiles" ADD COLUMN "revision_comments" text;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."inferred_skills" ADD CONSTRAINT "inferred_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "reflecto-ai-2"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_learning_profiles" ADD CONSTRAINT "user_learning_profiles_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "reflecto-ai-2"."users"("id") ON DELETE no action ON UPDATE no action;