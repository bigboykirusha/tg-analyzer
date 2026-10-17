-- 0012: keep the headline numbers of the previous analysis for «what changed».
ALTER TABLE "chat_reports" ADD COLUMN "previous_snapshot" jsonb;
