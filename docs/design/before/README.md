# Browser baseline capture

Captured with Playwright + Microsoft Edge at 360, 390, 768, 1024 and 1280 CSS px on 2026-10-07. The files for `login`, `dashboard`, `history` and `chat-sample` show the actual route responses at all five widths.

The protected pages use a synthetic account and isolated PostgreSQL/Redis. No real Telegram credentials or user data were used. `dashboard` records the unavailable test-Telegram error state, `history` records its empty state, and `chat-sample` records invalid/missing report handling. Code-entry and 2FA states were not exercised.

