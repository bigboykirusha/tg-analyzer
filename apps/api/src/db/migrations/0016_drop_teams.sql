-- 0016: teams were withdrawn; drop their tables where 0015 already created them.
DROP TABLE IF EXISTS "team_audit_log";
--> statement-breakpoint
DROP TABLE IF EXISTS "team_reports";
--> statement-breakpoint
DROP TABLE IF EXISTS "team_invites";
--> statement-breakpoint
DROP TABLE IF EXISTS "team_members";
--> statement-breakpoint
DROP TABLE IF EXISTS "teams";
