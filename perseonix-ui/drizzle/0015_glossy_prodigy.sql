CREATE TABLE "cves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cve_id" text NOT NULL,
	"title" text,
	"summary" text,
	"severity" text NOT NULL,
	"cvss" real,
	"kev" boolean DEFAULT false NOT NULL,
	"vendor" text,
	"product" text,
	"published" timestamp with time zone,
	"source_url" text,
	"refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector_key" text NOT NULL,
	"received" integer DEFAULT 0 NOT NULL,
	"added" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cves_cve_id_key" ON "cves" USING btree ("cve_id");--> statement-breakpoint
CREATE INDEX "cves_severity_idx" ON "cves" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "cves_published_idx" ON "cves" USING btree ("published");--> statement-breakpoint
CREATE INDEX "ingest_runs_connector_idx" ON "ingest_runs" USING btree ("connector_key","created_at");