-- 0010: one recent-contacts overview per user for the «Мои люди» page.
CREATE TABLE "people_overviews" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" varchar(20) NOT NULL,
  "scanned_chats" integer DEFAULT 0 NOT NULL,
  "total_chats" integer DEFAULT 0 NOT NULL,
  "contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "computed_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
