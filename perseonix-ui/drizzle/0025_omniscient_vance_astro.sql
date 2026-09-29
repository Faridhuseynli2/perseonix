CREATE TABLE "c2_ingestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"endpoints_seen" integer DEFAULT 0 NOT NULL,
	"endpoints_added" integer DEFAULT 0 NOT NULL,
	"software_counted" integer DEFAULT 0 NOT NULL,
	"message" text
);
--> statement-breakpoint
CREATE TABLE "c2_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" text NOT NULL,
	"port" integer NOT NULL,
	"software" text NOT NULL,
	"software_name" text NOT NULL,
	"category" text,
	"malware" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"country" text,
	"asn" integer,
	"as_name" text,
	"hostname" text,
	"risk" text DEFAULT 'medium' NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'online' NOT NULL,
	"first_seen" timestamp with time zone,
	"last_seen" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "c2_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day" text NOT NULL,
	"software" text NOT NULL,
	"software_name" text NOT NULL,
	"category" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "c2_ingestions_ran_idx" ON "c2_ingestions" USING btree ("ran_at");--> statement-breakpoint
CREATE UNIQUE INDEX "c2_servers_endpoint_key" ON "c2_servers" USING btree ("ip","port","software");--> statement-breakpoint
CREATE INDEX "c2_servers_software_idx" ON "c2_servers" USING btree ("software");--> statement-breakpoint
CREATE INDEX "c2_servers_lastseen_idx" ON "c2_servers" USING btree ("last_seen");--> statement-breakpoint
CREATE INDEX "c2_servers_first_idx" ON "c2_servers" USING btree ("first_seen");--> statement-breakpoint
CREATE UNIQUE INDEX "c2_snapshots_day_software_key" ON "c2_snapshots" USING btree ("day","software");--> statement-breakpoint
CREATE INDEX "c2_snapshots_day_idx" ON "c2_snapshots" USING btree ("day");