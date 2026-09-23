ALTER TABLE "ransomware_victims" ADD COLUMN "ransom" text;--> statement-breakpoint
ALTER TABLE "ransomware_victims" ADD COLUMN "data_size" text;--> statement-breakpoint
ALTER TABLE "ransomware_victims" ADD COLUMN "press_source" text;--> statement-breakpoint
ALTER TABLE "ransomware_victims" ADD COLUMN "press_summary" text;--> statement-breakpoint
ALTER TABLE "ransomware_victims" ADD COLUMN "infostealer" jsonb;