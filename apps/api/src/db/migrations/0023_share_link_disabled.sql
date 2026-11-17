-- A link turned off in the account keeps its address: on again, the same link works (17.11).
ALTER TABLE "share_links" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
