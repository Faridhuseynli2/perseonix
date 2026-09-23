CREATE TABLE "adversary_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"group_slug" text NOT NULL,
	"group_name" text NOT NULL,
	"ref_id" text NOT NULL,
	"title" text NOT NULL,
	"vendor" text,
	"year" integer,
	"url" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"user_id" uuid NOT NULL,
	"group_slug" text NOT NULL,
	"group_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_user_id_group_slug_pk" PRIMARY KEY("user_id","group_slug")
);
--> statement-breakpoint
ALTER TABLE "adversary_notifications" ADD CONSTRAINT "adversary_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "adversary_notifications_user_ref_key" ON "adversary_notifications" USING btree ("user_id","ref_id");--> statement-breakpoint
CREATE INDEX "adversary_notifications_user_created_idx" ON "adversary_notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "watchlist_user_idx" ON "watchlist" USING btree ("user_id");