-- 0011: analyses queue up. One job runs per user at a time; a chat can be queued only once.
DROP INDEX IF EXISTS "parse_jobs_one_active_user_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "parse_jobs_one_running_user_idx" ON "parse_jobs" ("user_id") WHERE "status" = 'running';
--> statement-breakpoint
CREATE UNIQUE INDEX "parse_jobs_active_chat_idx" ON "parse_jobs" ("user_id", "chat_id") WHERE "status" IN ('pending', 'running');
