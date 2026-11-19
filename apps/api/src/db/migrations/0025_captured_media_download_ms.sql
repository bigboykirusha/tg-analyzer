-- How long each kept file took to download, without the pauses for analyses (19.11).
ALTER TABLE "captured_media" ADD COLUMN IF NOT EXISTS "download_ms" integer DEFAULT 0 NOT NULL;
