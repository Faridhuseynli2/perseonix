CREATE TABLE "ransomware_groups" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"victim_count" integer DEFAULT 0 NOT NULL,
	"first_seen" timestamp with time zone,
	"last_seen" timestamp with time zone,
	"adversary_slug" text,
	"source_ref" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ransomware_ingestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"groups_seen" integer DEFAULT 0 NOT NULL,
	"victims_seen" integer DEFAULT 0 NOT NULL,
	"victims_added" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"message" text,
	"ran_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ransomware_victims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_slug" text NOT NULL,
	"group_name" text NOT NULL,
	"victim" text NOT NULL,
	"country" text,
	"sector" text,
	"domain" text,
	"description" text,
	"attack_date" date,
	"discovered" timestamp with time zone,
	"published" timestamp with time zone,
	"source_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ransomware_ingestions" ADD CONSTRAINT "ransomware_ingestions_ran_by_id_users_id_fk" FOREIGN KEY ("ran_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ransomware_victims_dedupe_key" ON "ransomware_victims" USING btree ("group_slug","victim","discovered");--> statement-breakpoint
CREATE INDEX "ransomware_victims_discovered_idx" ON "ransomware_victims" USING btree ("discovered");--> statement-breakpoint
CREATE INDEX "ransomware_victims_group_idx" ON "ransomware_victims" USING btree ("group_slug");--> statement-breakpoint
CREATE INDEX "ransomware_victims_country_idx" ON "ransomware_victims" USING btree ("country");--> statement-breakpoint
CREATE INDEX "ransomware_victims_sector_idx" ON "ransomware_victims" USING btree ("sector");