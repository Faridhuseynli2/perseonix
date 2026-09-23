ALTER TABLE "phishing_detections" ADD COLUMN "screenshot_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "phishing_detections" ADD COLUMN "offline_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "protected_assets" ADD COLUMN "scan_interval_hours" integer;--> statement-breakpoint
ALTER TABLE "protected_assets" ADD COLUMN "next_scan_at" timestamp with time zone;