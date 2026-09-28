CREATE TABLE "news_incident_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"body" text,
	"author_id" uuid,
	"author_name" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_incident_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"title" text NOT NULL,
	"severity" text NOT NULL,
	"source" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"owner_type" text NOT NULL,
	"seq" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"status" text DEFAULT 'open' NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"article_id" uuid,
	"article_title" text,
	"article_url" text,
	"category" text,
	"sla_due_at" timestamp with time zone,
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
ALTER TABLE "news_incident_events" ADD CONSTRAINT "news_incident_events_incident_id_news_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."news_incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_incident_events" ADD CONSTRAINT "news_incident_events_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_incident_notifications" ADD CONSTRAINT "news_incident_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_incidents" ADD CONSTRAINT "news_incidents_article_id_news_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."news_articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_incidents" ADD CONSTRAINT "news_incidents_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_incidents" ADD CONSTRAINT "news_incidents_opened_by_id_users_id_fk" FOREIGN KEY ("opened_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_incidents" ADD CONSTRAINT "news_incidents_closed_by_id_users_id_fk" FOREIGN KEY ("closed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "news_incident_events_incident_idx" ON "news_incident_events" USING btree ("incident_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "news_incident_notifications_user_incident_key" ON "news_incident_notifications" USING btree ("user_id","incident_id");--> statement-breakpoint
CREATE INDEX "news_incident_notifications_user_created_idx" ON "news_incident_notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "news_incidents_owner_seq_key" ON "news_incidents" USING btree ("owner_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "news_incidents_owner_article_key" ON "news_incidents" USING btree ("owner_id","article_id");--> statement-breakpoint
CREATE INDEX "news_incidents_owner_status_idx" ON "news_incidents" USING btree ("owner_id","status");