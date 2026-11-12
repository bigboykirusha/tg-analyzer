-- «Уведомления»: a report ready, an analysis failed, a quiz answered, a report link opened or about to expire.
-- The chat's name and numbers only; deleting the report or the account deletes them.
CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "report_id" uuid REFERENCES "chat_reports"("id") ON DELETE CASCADE,
  "kind" varchar(32) NOT NULL,
  "data" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" ("user_id", "created_at");
