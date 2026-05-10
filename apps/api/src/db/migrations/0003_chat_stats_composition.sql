ALTER TABLE "chat_stats" ADD COLUMN "text_message_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "chat_stats" ADD COLUMN "message_composition" jsonb DEFAULT '{"text":0,"media":0,"voice":0,"sticker":0,"file":0}'::jsonb NOT NULL;

UPDATE "chat_stats"
SET
  "text_message_count" = GREATEST(
    COALESCE("total_messages", 0)
      - COALESCE("media_count", 0)
      - COALESCE("voice_count", 0)
      - COALESCE("sticker_count", 0)
      - COALESCE("file_count", 0),
    0
  ),
  "message_composition" = jsonb_build_object(
    'text', GREATEST(
      COALESCE("total_messages", 0)
        - COALESCE("media_count", 0)
        - COALESCE("voice_count", 0)
        - COALESCE("sticker_count", 0)
        - COALESCE("file_count", 0),
      0
    ),
    'media', COALESCE("media_count", 0),
    'voice', COALESCE("voice_count", 0),
    'sticker', COALESCE("sticker_count", 0),
    'file', COALESCE("file_count", 0)
  );
