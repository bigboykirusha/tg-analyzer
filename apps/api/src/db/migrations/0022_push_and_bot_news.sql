-- Personal news («Отчёт готов», «Угадайку прошли», links) goes by web push; the bot keeps only news for everyone.
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "locale" varchar(8) DEFAULT 'ru' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_idx" ON "push_subscriptions" ("endpoint");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_idx" ON "push_subscriptions" ("user_id");
--> statement-breakpoint
-- The bot's audience: whoever pressed Start, signed in on the site or not.
CREATE TABLE IF NOT EXISTS "bot_subscribers" (
  "chat_id" bigint PRIMARY KEY NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "stopped_at" timestamp with time zone
);
--> statement-breakpoint
-- Those who turned the bot on before keep it: their private chat with the bot has their own Telegram id.
INSERT INTO "bot_subscribers" ("chat_id") SELECT "tg_user_id" FROM "users" WHERE "bot_notify" ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "bot_notify";
