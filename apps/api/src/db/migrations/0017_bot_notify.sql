-- 0017: the user pressed Start in our bot and wants «the report is ready» there.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bot_notify" boolean DEFAULT false NOT NULL;
