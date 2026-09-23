ALTER TABLE "cves" ADD COLUMN "cvss_vector" text;--> statement-breakpoint
ALTER TABLE "cves" ADD COLUMN "cwe" text;--> statement-breakpoint
ALTER TABLE "cves" ADD COLUMN "epss" real;--> statement-breakpoint
ALTER TABLE "cves" ADD COLUMN "epss_percentile" real;--> statement-breakpoint
ALTER TABLE "cves" ADD COLUMN "description" text;