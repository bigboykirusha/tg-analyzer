# Browser baseline capture

Captured with Playwright + Microsoft Edge at 360, 390, 768, 1024 and 1280 CSS px on 2026-10-07. The files for `login`, `dashboard`, `history` and `chat-sample` show the actual route responses at all five widths.

Nuxt returned HTTP 500 at every width with `Either manifest or precomputed data must be provided` (including the production Nitro build). These are diagnostic captures of the broken renderer, not screenshots of the product UI. No layout, contrast, focus, tap-target or state judgment should be inferred from them. Repeat the baseline after the renderer starts successfully and add dashboard/history/chat screenshots using a synthetic test account.

