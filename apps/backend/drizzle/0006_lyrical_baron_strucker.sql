CREATE TABLE "reflecto-ai-2"."custom_template_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"custom_template_id" uuid NOT NULL,
	"message_category" varchar(50) NOT NULL,
	"order" integer NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reflecto-ai-2"."custom_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"tagline" varchar(200),
	"color" varchar(50) NOT NULL,
	"icon_name" varchar(50) NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"background_image_blob" text
);
--> statement-breakpoint
CREATE TABLE "reflecto-ai-2"."message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar(50) NOT NULL,
	"template_type" varchar(20),
	"message_category" varchar(50) NOT NULL,
	"order" integer NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"is_public" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."users" ADD COLUMN "azure_oid" varchar(100);--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."custom_template_messages" ADD CONSTRAINT "custom_template_messages_custom_template_id_custom_templates_id_fk" FOREIGN KEY ("custom_template_id") REFERENCES "reflecto-ai-2"."custom_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."custom_templates" ADD CONSTRAINT "custom_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "reflecto-ai-2"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."message_templates" ADD CONSTRAINT "message_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "reflecto-ai-2"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflecto-ai-2"."users" ADD CONSTRAINT "users_azure_oid_unique" UNIQUE("azure_oid");