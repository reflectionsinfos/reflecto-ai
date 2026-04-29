CREATE SCHEMA "reflecto-ai-2";
--> statement-breakpoint
CREATE TABLE "reflecto-ai-2"."evidence_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflecto-ai-2"."kudos_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_name" varchar(255) NOT NULL,
	"recipient_type" varchar(50) DEFAULT 'individual' NOT NULL,
	"recipient_emails" json DEFAULT '[]'::json NOT NULL,
	"creator_name" varchar(255) NOT NULL,
	"creator_email" varchar(255) NOT NULL,
	"template" varchar(255) NOT NULL,
	"template_id" varchar(255),
	"message" text NOT NULL,
	"thumbnail_url" text,
	"card_data" json NOT NULL,
	"image_blob" text,
	"tenant_id" uuid,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflecto-ai-2"."kudos_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" varchar(50) NOT NULL,
	"card_id" uuid,
	"recipient_name" varchar(255),
	"creator_name" varchar(255),
	"creator_email" varchar(255),
	"template" varchar(255),
	"metadata" json,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflecto-ai-2"."recognition_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sender_id" uuid,
	"recipients" json NOT NULL,
	"type" varchar(50) NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"privacy_level" varchar(20) DEFAULT 'PUBLIC' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflecto-ai-2"."tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflecto-ai-2"."user_competencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"competency" varchar(100) NOT NULL,
	"level" integer,
	"source" varchar(50) DEFAULT 'INFERRED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflecto-ai-2"."user_narratives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflecto-ai-2"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"tenant_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."kudos_cards" ADD CONSTRAINT "kudos_cards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "reflecto-ai-2"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."kudos_cards" ADD CONSTRAINT "kudos_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "reflecto-ai-2"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."kudos_history" ADD CONSTRAINT "kudos_history_card_id_kudos_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "reflecto-ai-2"."kudos_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."recognition_events" ADD CONSTRAINT "recognition_events_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "reflecto-ai-2"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_competencies" ADD CONSTRAINT "user_competencies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "reflecto-ai-2"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."user_narratives" ADD CONSTRAINT "user_narratives_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "reflecto-ai-2"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "reflecto-ai-2"."tenants"("id") ON DELETE no action ON UPDATE no action;