CREATE TABLE "news_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"source" text,
	"summary" text,
	"severity" text,
	"category" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"label" text
);
--> statement-breakpoint
ALTER TABLE "news_mentions" ADD CONSTRAINT "news_mentions_article_id_news_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."news_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "news_articles_url_key" ON "news_articles" USING btree ("url");--> statement-breakpoint
CREATE INDEX "news_articles_published_idx" ON "news_articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "news_articles_severity_idx" ON "news_articles" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "news_mentions_kind_value_idx" ON "news_mentions" USING btree ("kind","value");--> statement-breakpoint
CREATE INDEX "news_mentions_article_idx" ON "news_mentions" USING btree ("article_id");