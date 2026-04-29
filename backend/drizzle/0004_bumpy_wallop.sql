CREATE TABLE "reflecto-ai-2"."learning_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" varchar(200) NOT NULL,
	"tech_stack" varchar(100) NOT NULL,
	"difficulty" varchar(20) NOT NULL,
	"lesson_content" text NOT NULL,
	"exercise" json,
	"quiz_questions" json,
	"estimated_read_time" integer DEFAULT 2,
	"ai_model" varchar(50) DEFAULT 'gpt-4',
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflecto-ai-2"."user_learning_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_projects" json DEFAULT '[]'::json,
	"tech_stack" json DEFAULT '[]'::json,
	"domain" varchar(100),
	"learning_goals" text,
	"monthly_objectives" json DEFAULT '[]'::json,
	"preferred_delivery" varchar(20) DEFAULT 'teams',
	"is_active" varchar(10) DEFAULT 'true',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_learning_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "reflecto-ai-2"."user_learning_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_id" uuid,
	"delivered_at" timestamp DEFAULT now() NOT NULL,
	"delivery_method" varchar(20),
	"lesson_viewed" varchar(10) DEFAULT 'false',
	"exercise_completed" varchar(10) DEFAULT 'false',
	"exercise_submission" text,
	"quiz_score" integer,
	"quiz_answers" json,
	"quiz_submitted_at" timestamp,
	"points_earned" integer DEFAULT 0,
	"ai_feedback" text,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reflecto-ai-2"."user_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_points" integer DEFAULT 0,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"badges" json DEFAULT '[]'::json,
	"level" integer DEFAULT 1,
	"last_activity_date" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_rewards_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_learning_profiles" ADD CONSTRAINT "user_learning_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "reflecto-ai-2"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_learning_progress" ADD CONSTRAINT "user_learning_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "reflecto-ai-2"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_learning_progress" ADD CONSTRAINT "user_learning_progress_content_id_learning_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "reflecto-ai-2"."learning_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_rewards" ADD CONSTRAINT "user_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "reflecto-ai-2"."users"("id") ON DELETE no action ON UPDATE no action;