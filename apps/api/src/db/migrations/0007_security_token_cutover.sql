-- Security cutover for purpose-bound version 2 access/refresh tokens.
-- Existing cookies were issued without the required version/family claims and must re-authenticate.
UPDATE refresh_sessions
SET revoked_at = now()
WHERE revoked_at IS NULL;
