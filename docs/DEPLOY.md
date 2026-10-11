# Production deployment shape

The web application may run on Vercel, but it must use a custom domain that shares the registered site with the API. The default `*.vercel.app` hostname and an API on another site are not an acceptable production pairing: browsers can treat the refresh cookie as third-party storage and silently block startup refresh.

Use this topology after selecting a domain owned by the product:

| Component            | Example hostname                            | Required behavior                                                                                       |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Nuxt web on Vercel   | `app.example.com`                           | HTTPS; set `NUXT_PUBLIC_API_URL=https://api.example.com` and `NUXT_PUBLIC_WS_URL=wss://api.example.com` |
| Fastify API          | `api.example.com`                           | HTTPS/WSS; allow only the exact web origin in `CORS_ORIGIN`; credentials enabled                        |
| Worker               | private service                             | No public ingress; share PostgreSQL/Redis and Telegram credentials with API                             |
| PostgreSQL and Redis | private managed services or private network | No public ingress; backups and Redis persistence enabled                                                |

Replace `example.com` with the domain approved by the product owner before DNS or production configuration is created. This repository does not assume that the owner has selected or controls a domain yet.

## Refresh cookie and CORS

For `app.example.com` calling `api.example.com`, configure the API with:

```dotenv
NODE_ENV=production
CORS_ORIGIN=https://app.example.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
# Leave COOKIE_DOMAIN unset so the refresh cookie remains host-only to api.example.com.
```

The browser client must send credentialed requests (`credentials: 'include'`). `SameSite=Lax` works for these sibling HTTPS origins because they are cross-origin but same-site. The API must return the exact `Access-Control-Allow-Origin` value and `Access-Control-Allow-Credentials: true`; wildcard origins cannot be used. Keep the cookie host-only unless a reviewed requirement proves that another subdomain needs it. Never set a parent-domain cookie merely to make the browser flow work.

Do not deploy the web at `https://tg-analyzer-web.vercel.app` while the API remains on a different registrable domain and expect silent refresh to work in every browser. A same-site reverse proxy that exposes `/api` and `/ws` under the web hostname is an alternative if the hosting setup can preserve WebSocket upgrades and route requests correctly.

## Reverse proxy and WebSocket ticket logging

The browser obtains an expiring, one-use ticket from the authenticated API and sends it in the WebSocket handshake query because the browser WebSocket API does not allow arbitrary authorization headers. Treat the complete handshake URL as a credential. Configure every layer that can record requests (CDN, Vercel/proxy integration, load balancer, ingress, API gateway, and application host) to omit query strings from access logs, error logs, traces, analytics, and support exports. Log the request path without its query component, status, duration, and a generated request/job identifier instead.

Before enabling production traffic, verify from the hosting provider's actual log configuration that a request to `/ws/parse-progress?ticket=REDACTED-CANARY` is recorded only as `/ws/parse-progress`. Do not use a live ticket for this check. If a real ticket appears in logs, restrict and expire access to those logs, rotate any affected session families if exposure is plausible, and follow [RUNBOOK.md](RUNBOOK.md).

The application redacts query strings in its own logs, but this does not change infrastructure access-log settings. See [SECURITY.md](SECURITY.md) for the session and cookie model and [ENVIRONMENT.md](ENVIRONMENT.md) for the service variables.

## Release order

1. Provision private PostgreSQL and Redis with backups/persistence; restrict network access to API and worker.
2. Set secrets independently in API and worker. Never copy `.env` into a public image or expose server secrets as Nuxt public runtime config.
3. Apply `corepack pnpm db:migrate` against the intended production database before deploying API code that depends on the migration.
4. Deploy API and worker, verify readiness, then publish the web build with the custom API and WebSocket URLs.
5. In a real browser, verify login, reload-triggered refresh, logout, and WebSocket progress on the chosen domain and supported browsers. Local tests do not prove third-party-cookie behavior at the production host.

Rollback and recovery procedures are described in [RUNBOOK.md](RUNBOOK.md). Do not roll back application code across an irreversible schema change without first applying the documented migration down script and stopping API/worker writes.
