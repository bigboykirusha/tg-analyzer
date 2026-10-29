-- 0015: teams — members with roles, invitation links, shared reports and an audit log.
CREATE TABLE IF NOT EXISTS "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"plan" varchar(20) DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teams_owner_idx" ON "teams" ("owner_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_members" (
	"team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE cascade,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"role" varchar(20) NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_team_id_user_id_pk" PRIMARY KEY ("team_id", "user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_members_user_idx" ON "team_members" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE cascade,
	"token_hash" varchar(64) NOT NULL UNIQUE,
	"role" varchar(20) NOT NULL,
	"created_by" uuid REFERENCES "users"("id") ON DELETE set null,
	"uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_invites_team_idx" ON "team_invites" ("team_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_reports" (
	"team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE cascade,
	"report_id" uuid NOT NULL REFERENCES "chat_reports"("id") ON DELETE cascade,
	"shared_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"shared_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_reports_team_id_report_id_pk" PRIMARY KEY ("team_id", "report_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_reports_report_idx" ON "team_reports" ("report_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE cascade,
	"actor_id" uuid REFERENCES "users"("id") ON DELETE set null,
	"subject_id" uuid REFERENCES "users"("id") ON DELETE set null,
	"action" varchar(40) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_audit_log_team_created_idx" ON "team_audit_log" ("team_id", "created_at");
