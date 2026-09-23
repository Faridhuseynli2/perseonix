CREATE TABLE "ransomware_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"victim_id" uuid NOT NULL,
	"victim" text NOT NULL,
	"group_name" text NOT NULL,
	"country" text,
	"sector" text,
	"watch_label" text,
	"discovered" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ransomware_watches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"country" text,
	"sector" text,
	"group_slug" text,
	"group_name" text,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ransomware_notifications" ADD CONSTRAINT "ransomware_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ransomware_watches" ADD CONSTRAINT "ransomware_watches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ransomware_notifications_user_victim_key" ON "ransomware_notifications" USING btree ("user_id","victim_id");--> statement-breakpoint
CREATE INDEX "ransomware_notifications_user_created_idx" ON "ransomware_notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ransomware_watches_user_idx" ON "ransomware_watches" USING btree ("user_id");