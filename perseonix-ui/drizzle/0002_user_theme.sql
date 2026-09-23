CREATE TYPE "public"."user_theme" AS ENUM('perseonix', 'dark', 'light');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme" "user_theme" DEFAULT 'perseonix' NOT NULL;