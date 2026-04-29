-- Add background image support to custom templates
ALTER TABLE "reflecto-ai-2"."custom_templates"
ADD COLUMN "background_image_blob" text;
