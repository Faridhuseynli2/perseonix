CREATE TYPE "public"."investigation_kind" AS ENUM('domain', 'ip', 'url');--> statement-breakpoint
CREATE TYPE "public"."investigation_verdict" AS ENUM('malicious', 'suspicious', 'no_known_threats', 'inconclusive');--> statement-breakpoint
CREATE TABLE "investigations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"input" text NOT NULL,
	"query" text NOT NULL,
	"kind" "investigation_kind" NOT NULL,
	"verdict" "investigation_verdict" NOT NULL,
	"signal_count" integer DEFAULT 0 NOT NULL,
	"top_signal" text,
	"report" jsonb NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investigations_org_created_idx" ON "investigations" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "investigations_user_created_idx" ON "investigations" USING btree ("user_id","created_at");