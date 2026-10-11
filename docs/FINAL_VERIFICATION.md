# Final verification

Date: 2026-10-11

## Completed

- API and web containers build from the frozen lockfile, run as an unprivileged user, and expose process health checks.
- Local PostgreSQL and Redis are bound to loopback only and have Compose health checks; API and worker wait for storage readiness.
- GitHub Actions validates formatting, linting, type checks, unit tests, integration tests, production builds, and Playwright E2E tests. Playwright artifacts are retained on every run.
- Required runtime configuration is documented and `.env.example` has no working credentials or weak secret values.
- Deployment, architecture, security, runbook, data deletion, and draft legal-page coverage are documented.

## Local evidence

| Check                           | Result           |
| ------------------------------- | ---------------- |
| `pnpm format:check`             | passed           |
| `pnpm lint`                     | passed           |
| `pnpm check`                    | passed           |
| `pnpm test`                     | passed, 77 tests |
| `pnpm build`                    | passed           |
| `docker compose config --quiet` | passed           |
| `docker compose build api web`  | passed           |

## Remaining operator checks

- A full local Playwright suite exceeds the interactive command time limit; it is executed without that limitation in the new CI job.
- Perform the 500k-message load test against isolated production-like PostgreSQL/Redis before release, record duration and peak memory, and inspect the worker for leaks.
- Validate a real Telegram login, selected production domain/cookie behavior, backup restore, and external log redaction before enabling public traffic.
- The legal pages are intentionally drafts: add the controller identity, jurisdiction, contact, and counsel-approved terms before publishing.
- Existing upstream web dependency advisories remain tracked in `docs/REPORT.md`; no patched compatible version is currently locked here.
