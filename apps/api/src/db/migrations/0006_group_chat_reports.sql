ALTER TABLE "chat_stats" ADD COLUMN "group_participants" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "chat_stats" ADD COLUMN "group_top_pairs" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "chat_stats" ADD COLUMN "group_health" jsonb;
ALTER TABLE "chat_stats" ADD COLUMN "shared_vocabulary" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "chat_stats" ADD COLUMN "unique_group_words" jsonb DEFAULT '[]'::jsonb NOT NULL;
