ALTER TABLE "parse_jobs" ADD COLUMN "chat_id" bigint;
ALTER TABLE "parse_jobs" ADD COLUMN "chat_name" varchar(500);

ALTER TABLE "chat_stats" ADD COLUMN "parsed_at" timestamp with time zone DEFAULT now();
ALTER TABLE "chat_stats" ADD COLUMN "median_my_response_sec" integer;
ALTER TABLE "chat_stats" ADD COLUMN "median_their_response_sec" integer;
ALTER TABLE "chat_stats" ADD COLUMN "my_words_per_message" numeric(6,2);
ALTER TABLE "chat_stats" ADD COLUMN "their_words_per_message" numeric(6,2);

UPDATE "chat_stats"
SET
  "median_my_response_sec" = "avg_response_sec",
  "parsed_at" = COALESCE("parsed_at", now());
