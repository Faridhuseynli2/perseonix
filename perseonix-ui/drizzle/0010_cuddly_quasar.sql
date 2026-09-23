CREATE TABLE "brand_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"detection_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"asset_domain" text NOT NULL,
	"severity" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid,
	"screened" integer DEFAULT 0 NOT NULL,
	"resolving" integer DEFAULT 0 NOT NULL,
	"certs" integer DEFAULT 0 NOT NULL,
	"findings" integer DEFAULT 0 NOT NULL,
	"new_findings" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"message" text,
	"ran_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phishing_detections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"kind" text NOT NULL,
	"source" text NOT NULL,
	"resolves" boolean DEFAULT false NOT NULL,
	"ips" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"has_mx" boolean DEFAULT false NOT NULL,
	"has_cert" boolean DEFAULT false NOT NULL,
	"punycode" boolean DEFAULT false NOT NULL,
	"keyword" text,
	"similarity" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"severity" text NOT NULL,
	"issuer" text,
	"first_seen" timestamp with time zone,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protected_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"owner_type" text NOT NULL,
	"created_by_id" uuid,
	"domain" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_scan_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_notifications" ADD CONSTRAINT "brand_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_scans" ADD CONSTRAINT "brand_scans_asset_id_protected_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."protected_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_scans" ADD CONSTRAINT "brand_scans_ran_by_id_users_id_fk" FOREIGN KEY ("ran_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phishing_detections" ADD CONSTRAINT "phishing_detections_asset_id_protected_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."protected_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protected_assets" ADD CONSTRAINT "protected_assets_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_notifications_user_detection_key" ON "brand_notifications" USING btree ("user_id","detection_id");--> statement-breakpoint
CREATE INDEX "brand_notifications_user_created_idx" ON "brand_notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "phishing_detections_asset_domain_key" ON "phishing_detections" USING btree ("asset_id","domain");--> statement-breakpoint
CREATE INDEX "phishing_detections_asset_idx" ON "phishing_detections" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "protected_assets_owner_domain_key" ON "protected_assets" USING btree ("owner_id","domain");