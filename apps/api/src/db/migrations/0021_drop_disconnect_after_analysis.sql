-- «Sign out of Telegram after every analysis» never had a switch on the site and is gone from the code.
ALTER TABLE "users" DROP COLUMN IF EXISTS "disconnect_after_analysis";
