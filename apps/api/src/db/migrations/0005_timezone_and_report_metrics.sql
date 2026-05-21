ALTER TABLE "users" ADD COLUMN "timezone" varchar(64) DEFAULT 'UTC' NOT NULL;

ALTER TABLE "chat_stats" RENAME COLUMN "avg_response_sec" TO "average_my_response_sec";
ALTER TABLE "chat_stats" ADD COLUMN "response_rate" numeric(5,2);
ALTER TABLE "chat_stats" ADD COLUMN "activity_distribution" jsonb DEFAULT '{"night":{"sent":0,"received":0,"total":0},"morning":{"sent":0,"received":0,"total":0},"afternoon":{"sent":0,"received":0,"total":0},"evening":{"sent":0,"received":0,"total":0}}'::jsonb NOT NULL;
ALTER TABLE "chat_stats" ADD COLUMN "composition_stats" jsonb DEFAULT '{"textSharePct":null,"mediaSharePct":null,"voiceSharePct":null,"stickerSharePct":null,"fileSharePct":null,"avgCharsPerTextMessage":null}'::jsonb NOT NULL;
ALTER TABLE "chat_stats" ADD COLUMN "availability_profile" jsonb DEFAULT '{"activeHours":0,"activeHoursPct":0,"concentrationIndex":null,"predictability":"low","peakWindow":null,"secondaryWindow":null}'::jsonb NOT NULL;
ALTER TABLE "chat_stats" ADD COLUMN "health_score" jsonb;

ALTER TABLE "chat_stats"
  ALTER COLUMN "response_stats"
  SET DEFAULT '{"medianMineSec":null,"medianTheirsSec":null,"mineSamples":0,"theirsSamples":0,"mineP25Sec":null,"mineP75Sec":null,"mineP95Sec":null,"theirsP25Sec":null,"theirsP75Sec":null,"theirsP95Sec":null}'::jsonb;

UPDATE "chat_stats"
SET "response_stats" = jsonb_build_object(
  'medianMineSec', COALESCE("response_stats"->'medianMineSec', 'null'::jsonb),
  'medianTheirsSec', COALESCE("response_stats"->'medianTheirsSec', 'null'::jsonb),
  'mineSamples', COALESCE("response_stats"->'mineSamples', '0'::jsonb),
  'theirsSamples', COALESCE("response_stats"->'theirsSamples', '0'::jsonb),
  'mineP25Sec', 'null'::jsonb,
  'mineP75Sec', 'null'::jsonb,
  'mineP95Sec', 'null'::jsonb,
  'theirsP25Sec', 'null'::jsonb,
  'theirsP75Sec', 'null'::jsonb,
  'theirsP95Sec', 'null'::jsonb
);

UPDATE "chat_stats"
SET "conversation_facts" = COALESCE("conversation_facts", '{}'::jsonb) || '{"maxStreak":null}'::jsonb
WHERE NOT COALESCE("conversation_facts", '{}'::jsonb) ? 'maxStreak';
