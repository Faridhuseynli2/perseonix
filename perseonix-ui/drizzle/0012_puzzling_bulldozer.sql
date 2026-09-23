CREATE TABLE "brand_case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"body" text,
	"author_id" uuid,
	"author_name" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_case_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"title" text NOT NULL,
	"domain" text,
	"severity" text NOT NULL,
	"source" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"owner_type" text NOT NULL,
	"seq" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"status" text DEFAULT 'open' NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"asset_id" uuid,
	"detection_id" uuid,
	"domain" text,
	"asset_domain" text,
	"assignee_id" uuid,
	"assignee_name" text,
	"opened_by_id" uuid,
	"opened_by_name" text,
	"closed_by_id" uuid,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_case_events" ADD CONSTRAINT "brand_case_events_case_id_brand_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."brand_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_case_events" ADD CONSTRAINT "brand_case_events_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_case_notifications" ADD CONSTRAINT "brand_case_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_cases" ADD CONSTRAINT "brand_cases_asset_id_protected_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."protected_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_cases" ADD CONSTRAINT "brand_cases_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_cases" ADD CONSTRAINT "brand_cases_opened_by_id_users_id_fk" FOREIGN KEY ("opened_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_cases" ADD CONSTRAINT "brand_cases_closed_by_id_users_id_fk" FOREIGN KEY ("closed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_case_events_case_idx" ON "brand_case_events" USING btree ("case_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_case_notifications_user_case_key" ON "brand_case_notifications" USING btree ("user_id","case_id");--> statement-breakpoint
CREATE INDEX "brand_case_notifications_user_created_idx" ON "brand_case_notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_cases_owner_seq_key" ON "brand_cases" USING btree ("owner_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_cases_owner_detection_key" ON "brand_cases" USING btree ("owner_id","detection_id");--> statement-breakpoint
CREATE INDEX "brand_cases_owner_status_idx" ON "brand_cases" USING btree ("owner_id","status");