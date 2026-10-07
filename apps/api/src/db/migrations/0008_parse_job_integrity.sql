DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM telegram_sessions GROUP BY user_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration 0008 aborted: duplicate telegram_sessions.user_id values must be resolved explicitly';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM parse_jobs
     WHERE status IN ('pending', 'running')
     GROUP BY user_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration 0008 aborted: users with multiple active parse jobs must be resolved explicitly';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM parse_jobs
     WHERE bull_job_id IS NOT NULL
     GROUP BY bull_job_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration 0008 aborted: duplicate parse_jobs.bull_job_id values must be resolved explicitly';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE parse_jobs ADD COLUMN IF NOT EXISTS requested_chat_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE parse_jobs ADD COLUMN IF NOT EXISTS enqueue_attempts integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE parse_jobs ADD COLUMN IF NOT EXISTS enqueued_at timestamp with time zone;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS telegram_sessions_user_id_idx ON telegram_sessions(user_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS parse_jobs_one_active_user_idx ON parse_jobs(user_id) WHERE status IN ('pending', 'running');
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS parse_jobs_bull_job_id_idx ON parse_jobs(bull_job_id) WHERE bull_job_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS parse_jobs_user_created_idx ON parse_jobs(user_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS parse_jobs_status_created_idx ON parse_jobs(status, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS refresh_sessions_user_family_idx ON refresh_sessions(user_id, family_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS refresh_sessions_expires_at_idx ON refresh_sessions(expires_at);
