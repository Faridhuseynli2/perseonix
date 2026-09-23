CREATE TABLE "relevance_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"sectors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"country" text,
	"updated_by_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "relevance_profiles" ADD CONSTRAINT "relevance_profiles_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "relevance_profiles_scope_owner_key" ON "relevance_profiles" USING btree ("scope","owner_id");