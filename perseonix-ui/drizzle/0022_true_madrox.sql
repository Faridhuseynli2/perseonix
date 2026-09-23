ALTER TABLE "news_articles" ADD COLUMN "dedup_key" text;--> statement-breakpoint
CREATE INDEX "news_articles_dedup_idx" ON "news_articles" USING btree ("dedup_key");