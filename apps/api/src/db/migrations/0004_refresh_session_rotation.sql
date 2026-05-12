ALTER TABLE "refresh_sessions" ADD COLUMN "family_id" varchar(255);
ALTER TABLE "refresh_sessions" ADD COLUMN "replaced_by_token_id" varchar(255);
ALTER TABLE "refresh_sessions" ADD COLUMN "rotated_at" timestamp with time zone;
ALTER TABLE "refresh_sessions" ADD COLUMN "grace_until" timestamp with time zone;
ALTER TABLE "refresh_sessions" ADD COLUMN "revoked_at" timestamp with time zone;

UPDATE "refresh_sessions"
SET "family_id" = "token_id"
WHERE "family_id" IS NULL;

ALTER TABLE "refresh_sessions" ALTER COLUMN "family_id" SET NOT NULL;
