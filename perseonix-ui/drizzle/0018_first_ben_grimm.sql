ALTER TABLE "cves" ADD COLUMN "affected" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "cves" ADD COLUMN "kev_action" text;--> statement-breakpoint
ALTER TABLE "cves" ADD COLUMN "kev_due_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cves" ADD COLUMN "kev_ransomware" boolean DEFAULT false NOT NULL;