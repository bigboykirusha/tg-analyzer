-- Quota accounting must survive clearing the visible analysis history.
CREATE TABLE "analysis_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "analysis_usage_user_created_idx" ON "analysis_usage" ("user_id", "created_at");
--> statement-breakpoint
INSERT INTO "analysis_usage" ("id", "user_id", "created_at")
SELECT "id", "user_id", "created_at" FROM "parse_jobs"
WHERE "created_at" > now() - interval '24 hours';
