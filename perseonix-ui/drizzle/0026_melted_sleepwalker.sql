CREATE TABLE "frontline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text,
	"title" text NOT NULL,
	"summary" text,
	"analyst_note" text,
	"dedup_key" text,
	"category" text,
	"severity" text,
	"side" text,
	"region" text,
	"country" text,
	"lat" real,
	"lng" real,
	"source" text,
	"url" text,
	"happened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "frontline_events_created_idx" ON "frontline_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "frontline_events_happened_idx" ON "frontline_events" USING btree ("happened_at");--> statement-breakpoint
CREATE INDEX "frontline_events_category_idx" ON "frontline_events" USING btree ("category");--> statement-breakpoint
CREATE INDEX "frontline_events_severity_idx" ON "frontline_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "frontline_events_dedup_idx" ON "frontline_events" USING btree ("dedup_key");