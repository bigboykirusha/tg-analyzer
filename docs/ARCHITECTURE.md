# Architecture

```text
Browser (Nuxt web) ── HTTPS / WSS ──> Fastify API ──> PostgreSQL
       │                                   │
       └── public runtime URLs              ├──> Redis (rate limits, tickets, queues)
                                           └──> BullMQ worker ──> Telegram
```

The browser keeps an access token only in memory. A host-only, HttpOnly refresh cookie is owned by the API and is rotated in PostgreSQL. The API validates ownership on every protected resource. WebSocket progress uses a short-lived one-use Redis ticket because browser WebSocket handshakes cannot carry arbitrary authorization headers.

The worker consumes BullMQ parsing and cleanup jobs. PostgreSQL is the durable record; Redis is transient queue, lease, rate-limit, and progress state. The worker publishes a heartbeat which the API includes in `/ready`. `/health` only indicates that the API process is alive.

Telegram session strings are encrypted with AES-GCM before persistence. Aggregated report data, parse jobs, refresh sessions, and Telegram session ciphertext are stored in PostgreSQL. The application does not intentionally persist original message text for reports.
