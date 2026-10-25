-- 0014: per-user privacy setting — sign out of Telegram after every analysis.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disconnect_after_analysis" boolean DEFAULT false NOT NULL;
