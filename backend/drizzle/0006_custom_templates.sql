CREATE TABLE IF NOT EXISTS "reflecto-ai-2"."custom_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "reflecto-ai-2"."users"("id"),
  "name" varchar(100) NOT NULL,
  "tagline" varchar(200),
  "color" varchar(50) NOT NULL,
  "icon_name" varchar(50) NOT NULL,
  "is_public" boolean DEFAULT false NOT NULL
);
