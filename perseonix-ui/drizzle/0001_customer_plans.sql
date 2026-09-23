CREATE TYPE "public"."customer_plan" AS ENUM('poc', 'licensed');--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "plan" "customer_plan" DEFAULT 'licensed' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "starts_at" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "ends_at" date;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "seat_limit" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;