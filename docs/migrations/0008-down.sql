DROP INDEX IF EXISTS refresh_sessions_expires_at_idx;
DROP INDEX IF EXISTS refresh_sessions_user_family_idx;
DROP INDEX IF EXISTS parse_jobs_status_created_idx;
DROP INDEX IF EXISTS parse_jobs_user_created_idx;
DROP INDEX IF EXISTS parse_jobs_bull_job_id_idx;
DROP INDEX IF EXISTS parse_jobs_one_active_user_idx;
DROP INDEX IF EXISTS telegram_sessions_user_id_idx;

ALTER TABLE parse_jobs DROP COLUMN IF EXISTS enqueued_at;
ALTER TABLE parse_jobs DROP COLUMN IF EXISTS enqueue_attempts;
ALTER TABLE parse_jobs DROP COLUMN IF EXISTS requested_chat_ids;
