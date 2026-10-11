# Environment reference

Copy `.env.example` to `.env` for local development. Never deploy that file or use its illustrative values as production credentials.

| Variable                                        | Required   | Purpose                                                                |
| ----------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                                  | yes        | PostgreSQL connection string, private to API and worker.               |
| `REDIS_URL`                                     | yes        | Redis connection string, private to API and worker.                    |
| `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`          | yes        | Credentials issued at my.telegram.org.                                 |
| `SESSION_ENCRYPTION_KEY`                        | yes        | Exactly 64 hexadecimal characters; encrypts Telegram session material. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`              | yes        | Separate random strings of at least 32 characters.                     |
| `CORS_ORIGIN`                                   | yes        | Comma-separated exact browser origins; no wildcard in production.      |
| `COOKIE_SECURE`                                 | production | `true` behind HTTPS.                                                   |
| `COOKIE_SAME_SITE`                              | no         | `lax` for sibling subdomains; `none` only with `COOKIE_SECURE=true`.   |
| `COOKIE_DOMAIN`                                 | no         | Normally unset, keeping the refresh cookie host-only.                  |
| `API_HOST`, `API_PORT` / `PORT`                 | no         | API bind address and port; hosting platforms commonly set `PORT`.      |
| `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW` | no         | Login/refresh rate-limit policy.                                       |
| `FULL_PARSE_COOLDOWN_HOURS`                     | no         | Cooldown for full chat reparses.                                       |
| `DATA_RETENTION_DAYS`                           | no         | Retention horizon used by cleanup work.                                |

Generate secrets with a cryptographically secure source, for example `openssl rand -hex 32` for the encryption key and `openssl rand -base64 48` for JWT secrets. Set values in the secret manager of each deployment service; API and worker require the same server-side values. Variables beginning `NUXT_PUBLIC_` are visible to every browser and must never contain credentials.
