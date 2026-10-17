-- 0009: one JSON report document per chat, single-chat analysis jobs, removal of unused aggregates.
-- Everything dropped here is either derived from chat reports or was never read by the application.

CREATE TABLE "chat_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tg_chat_id" bigint NOT NULL,
  "title" varchar(500) NOT NULL,
  "chat_type" varchar(20) NOT NULL,
  "total_messages" integer NOT NULL,
  "first_message_at" timestamp with time zone,
  "last_message_at" timestamp with time zone,
  "analyzed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "report" jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "chat_reports_user_chat_idx" ON "chat_reports" ("user_id", "tg_chat_id");
--> statement-breakpoint
CREATE INDEX "chat_reports_user_analyzed_idx" ON "chat_reports" ("user_id", "analyzed_at");
--> statement-breakpoint
CREATE FUNCTION pg_temp.iso_utc(value timestamptz) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN value IS NULL THEN 'null'::jsonb
    ELSE to_jsonb(to_char(value AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) END
$$;
--> statement-breakpoint
CREATE FUNCTION pg_temp.directional(counts jsonb, fallback_total jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'sent', COALESCE((counts->>'sent')::int, 0),
    'received', COALESCE((counts->>'received')::int, 0),
    'total', COALESCE((counts->>'total')::int, (fallback_total#>>'{}')::int, 0)
  )
$$;
--> statement-breakpoint
INSERT INTO "chat_reports" (
  "user_id", "tg_chat_id", "title", "chat_type", "total_messages",
  "first_message_at", "last_message_at", "analyzed_at", "report"
)
SELECT
  cs.user_id,
  cs.tg_chat_id,
  COALESCE(NULLIF(cs.chat_name, ''), cs.tg_chat_id::text),
  COALESCE(cs.chat_type, 'unknown'),
  cs.total_messages,
  cs.first_message_at,
  cs.last_message_at,
  COALESCE(cs.parsed_at, cs.updated_at),
  jsonb_build_object(
    'version', 2,
    'timeZone', u.timezone,
    'totals', jsonb_build_object(
      'messages', cs.total_messages,
      'sent', cs.sent_messages,
      'received', cs.received_messages,
      'chars', cs.total_chars,
      'words', cs.total_words,
      'textMessages', cs.text_message_count
    ),
    'composition', CASE
      WHEN COALESCE((cs.message_composition->>'text')::int, 0) + COALESCE((cs.message_composition->>'media')::int, 0)
         + COALESCE((cs.message_composition->>'voice')::int, 0) + COALESCE((cs.message_composition->>'sticker')::int, 0)
         + COALESCE((cs.message_composition->>'file')::int, 0) > 0
        THEN cs.message_composition
      ELSE jsonb_build_object(
        'text', GREATEST(cs.total_messages - cs.media_count - cs.voice_count - cs.sticker_count - cs.file_count, 0),
        'media', cs.media_count, 'voice', cs.voice_count, 'sticker', cs.sticker_count, 'file', cs.file_count)
    END,
    'period', jsonb_build_object(
      'firstMessageAt', pg_temp.iso_utc(cs.first_message_at),
      'lastMessageAt', pg_temp.iso_utc(cs.last_message_at)
    ),
    'activity', jsonb_build_object(
      'hourly', (SELECT jsonb_agg(pg_temp.directional(cs.hourly_activity_split->(h::text), cs.hourly_activity->(h::text)) ORDER BY h)
                 FROM generate_series(0, 23) AS h),
      'weekday', (SELECT jsonb_agg(pg_temp.directional(cs.weekday_activity->(d::text), NULL) ORDER BY d)
                  FROM generate_series(0, 6) AS d),
      'daily', cs.daily_activity_json,
      'monthly', cs.monthly_activity
    ),
    'vocabulary', jsonb_build_object(
      'topWords', cs.top_words,
      'topWordsBySender', cs.top_words_by_sender,
      'uniqueWordsBySender', cs.unique_words_by_sender,
      'topEmoji', cs.top_emoji,
      'topEmojiBySender', cs.top_emoji_by_sender,
      'wordsPerMessage', cs.words_per_message
    ),
    'responses', cs.response_stats || jsonb_build_object(
      'responseRate', cs.response_rate::float8,
      'iWriteFirstPct', cs.i_write_first_pct
    ),
    'facts', jsonb_build_object(
      'activeDays', COALESCE((cs.conversation_facts->>'activeDays')::int, 0),
      'longestGap', COALESCE(cs.conversation_facts->'longestGap', 'null'::jsonb),
      'mostActiveDate', CASE WHEN cs.conversation_facts#>>'{mostActiveDate,date}' IS NULL THEN 'null'::jsonb
                             ELSE cs.conversation_facts->'mostActiveDate' END,
      'maxStreak', CASE WHEN jsonb_typeof(cs.conversation_facts->'maxStreak') = 'object' THEN cs.conversation_facts->'maxStreak'
                        ELSE jsonb_build_object('days', COALESCE((cs.conversation_facts->>'maxStreakDays')::int, 0),
                                                'startDate', NULL, 'endDate', NULL) END,
      'silencesOver30Days', COALESCE(cs.conversation_facts->'silencePeriodsOver30Days', '[]'::jsonb),
      'trend', COALESCE(cs.conversation_facts->>'trend', 'unknown'),
      'mostActiveMonth', COALESCE(cs.conversation_facts->'mostActiveMonth', 'null'::jsonb)
    ),
    'sessions', COALESCE(cs.conversation_facts->'sessionStats', jsonb_build_object(
      'totalSessions', 0, 'averageSessionMessages', 0, 'averageSessionDurationSec', NULL,
      'longestSessionMessages', 0, 'longestSessionDurationSec', NULL, 'sessionsPerActiveWeek', 0,
      'nightSessionsPct', NULL, 'highlights', '[]'::jsonb)),
    'relationship', COALESCE(cs.conversation_facts->'relationshipScore', 'null'::jsonb),
    'health', COALESCE(cs.health_score, 'null'::jsonb),
    'group', CASE WHEN cs.chat_type = 'group' THEN jsonb_build_object(
      'participants', cs.group_participants,
      'topPairs', cs.group_top_pairs,
      'health', COALESCE(cs.group_health, 'null'::jsonb),
      'sharedVocabulary', cs.shared_vocabulary,
      'uniqueGroupWords', cs.unique_group_words
    ) ELSE 'null'::jsonb END
  )
FROM "chat_stats" cs
JOIN "users" u ON u.id = cs.user_id;
--> statement-breakpoint
DROP TABLE "chat_stats";
--> statement-breakpoint
DROP TABLE "global_stats";
--> statement-breakpoint
DROP TABLE "daily_activity";
--> statement-breakpoint
DROP INDEX IF EXISTS "parse_jobs_bull_job_id_idx";
--> statement-breakpoint
ALTER TABLE "parse_jobs"
  DROP COLUMN "bull_job_id",
  DROP COLUMN "requested_chat_ids",
  DROP COLUMN "enqueue_attempts",
  DROP COLUMN "enqueued_at",
  DROP COLUMN "total_chats",
  DROP COLUMN "parsed_chats";
--> statement-breakpoint
ALTER TABLE "telegram_sessions"
  DROP COLUMN "dc_id",
  DROP COLUMN "expires_at";
