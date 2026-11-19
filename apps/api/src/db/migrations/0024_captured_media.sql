-- Developers' own photos, videos and video notes kept as files (MEDIA_CAPTURE_USERNAMES, 19.11): one row per message.
CREATE TABLE IF NOT EXISTS "captured_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"tg_chat_id" bigint NOT NULL,
	"message_id" integer NOT NULL,
	"kind" varchar(8) NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"status" varchar(8) DEFAULT 'pending' NOT NULL,
	"path" text,
	"bytes" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"saved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "captured_media_message_idx" ON "captured_media" USING btree ("user_id","tg_chat_id","message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "captured_media_pending_idx" ON "captured_media" USING btree ("user_id","status");
