-- Message Templates (default messages for system templates + org-wide custom templates)
CREATE TABLE IF NOT EXISTS "reflecto-ai-2"."message_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" varchar(50) NOT NULL,
  "template_type" varchar(20),
  "message_category" varchar(50) NOT NULL,
  "order" integer NOT NULL,
  "text" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "reflecto-ai-2"."users"("id"),
  "is_public" boolean DEFAULT true NOT NULL
);

CREATE UNIQUE INDEX "idx_msg_template_category_order"
  ON "reflecto-ai-2"."message_templates"("template_id", "message_category", "order");

-- Custom Template Messages (user-customizable messages per custom template)
CREATE TABLE IF NOT EXISTS "reflecto-ai-2"."custom_template_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "custom_template_id" uuid NOT NULL REFERENCES "reflecto-ai-2"."custom_templates"("id") ON DELETE CASCADE,
  "message_category" varchar(50) NOT NULL,
  "order" integer NOT NULL,
  "text" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp
);

CREATE UNIQUE INDEX "idx_custom_msg_template_category_order"
  ON "reflecto-ai-2"."custom_template_messages"("custom_template_id", "message_category", "order");
