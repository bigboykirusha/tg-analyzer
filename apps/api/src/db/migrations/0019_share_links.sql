-- Links that open a report or a quiz without signing in. One link of each kind per report;
-- deleting the report or the account deletes its links.
CREATE TABLE "share_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token" varchar(32) NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "report_id" uuid NOT NULL REFERENCES "chat_reports"("id") ON DELETE CASCADE,
  "kind" varchar(16) NOT NULL,
  "settings" jsonb,
  "payload" jsonb NOT NULL,
  "result" jsonb,
  "views" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "share_links_token_idx" ON "share_links" ("token");
--> statement-breakpoint
CREATE UNIQUE INDEX "share_links_report_kind_idx" ON "share_links" ("report_id", "kind");
