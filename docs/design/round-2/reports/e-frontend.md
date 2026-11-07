# Agent E: frontend quality and responsive audit (baseline «Portrait» @ de5319d)

Scope: rendered app plus code review, read-only. Evidence lives in `scratchpad/agent-e/`: screenshots in `shots/`, raw data in `sweep.jsonl`, `contrast.json`, `a11y.log`, `perf.json`, `detect/*.json`, and the scripts that produced them.

**Skills I actually read and applied:**

- Vercel web-design-guidelines: SKILL.md, plus the live `command.md`, which curl fetched fine. Copy saved at `agent-e/command.md`.
- Impeccable v4.8: SKILL.md, `reference/audit.md` (its workflow and 0–4 scoring are used below), `reference/adapt.md` and `reference/polish.md`.
- `impeccable context`. It found PRODUCT.md and no DESIGN.md, and it did not write anything to the repo.
- The Impeccable detector. It ran by URL on the public routes and through `--cdp` against a signed-in Chromium on `/dashboard`, `/new`, `/account`, `/chat/1001`, `/chat/1006` and `/chat/-1002001`, at 1280 and 390 px.

**Rendering:** I used Chromium only, so WebKit behaviour is flagged as unproven wherever it matters.

**Performance build:** I made a production build in a scratch copy of the repo (`agent-e/build/`, served on :3100). The dev server is not representative for bundle size or timings.

**Two method notes:**

- Sharing `harness/state.json` broke: refresh-token rotation plus reuse detection revokes the whole token family as soon as two contexts refresh the same cookie. Each of my processes therefore signed in on its own.
- The production server rejects any Origin other than :3000 (403). I rewrote the Origin header for :3100 test traffic only.

## Implementation Integrity verdict: PASS, with reservations

This is a coherent, product-specific system:

- `tokens.css` has three layers: primitives, semantic tokens, and per-person `data-hue` re-pointing.
- Stylelint enforces the tokens and runs clean (`npx stylelint "apps/web/app/**/*.{css,vue}"` → 0 problems).
- Components contain no hard-coded colours, apart from the country-flag SVGs, which is legitimate.
- No `transition: all` and no `color-mix`.
- Hover styles sit inside `(hover:hover) and (pointer:fine)`. The one exception is `base.css:401 .input__clear:hover`.

Detector results:

- Public routes: 0 findings.
- Signed-in routes, recurring items:
  - **low-contrast**: white initials on avatar gradients, 3.7–4.0:1, which I verified. Also inactive segmented-control labels at 4.1:1.
  - **nested-cards**: `GroupReport` `.signature` ×8. This is a true positive against design-system §6, which says no tiles inside tiles.
  - **cream-palette**: the red «room» `#fff4f3` on `/chat/1001`. I consider this a false positive in spirit, because it is the person's tint and not a reflexive beige.
  - **flat-type-hierarchy**: `/account` at 390. A minor signal.

The reservations are performance, the masonry layout shift, the ARIA misuse of `tablist`, and a contrast floor that the person hues and the neutral ramp do not quite reach.

## What was measured

### Overflow, alignment and truncation

121 page loads: 11 routes at 360, 390, 430, 820, 1024, 1280, 1440 and 1920 in light, plus dark at 390, 820 and 1440.

- **Horizontal overflow:** none at all. On desktop, `scrollWidth − innerWidth` is −6, which is just the custom 6 px scrollbar. No element extends past the viewport outside a clipping container.
- **Long content:** I injected an 80-character chat name and multiplied message counts by about 2,700 (`stress.js`). There was still zero overflow at 360, 1440 and EN-390. Names clamp to two lines on the poster, ellipsize in the sticky header, rows and sidebar, and big numbers fit. This is genuinely robust.
- **Column alignment:**
  - Workspace: the left edge of `#header-page` equals the left edge of `main .page` at every width (280/296/445 px). At 1920, `--page-max-wide` centres the column in the panel at 445 px, while the sidebar logo stays at 12 px.
  - Public pages at 1440: logo x = 117 = content x. Consistent.
  - No mismatch found.

### Contrast

Computed from computed colours with alpha compositing, at 390 px, both themes, 10 routes, and all 7 hues forced on `/chat/1001`. I also checked the token pairs directly.

| Pair                                                              | Ratio                              | Verdict                                            |
| ----------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------- |
| poster vs white type                                              | 6.3–6.5                            | pass                                               |
| 80% white on poster                                               | 4.62–4.76                          | pass, barely                                       |
| mark on white                                                     | 4.61–5.05                          | pass                                               |
| **mark on room** (person-coloured text directly on the page tint) | green 4.39, blue 4.34, teal 4.30   | **fail**                                           |
| dark marks on surface                                             | ≥ 8.1                              | pass                                               |
| `--text-muted` on `--bg`                                          | 4.67                               | pass                                               |
| `--text-muted` on surface                                         | 5.22                               | pass                                               |
| **`--text-muted` on `--segment-track`**                           | 4.07 light; 4.47 dark (on account) | **fail**: every inactive segment                   |
| **inactive segment on poster-tinted track**                       | 3.97                               | **fail**: `ReportNav` over the poster              |
| **white initials on avatar gradient** (glow end)                  | 3.36–3.61                          | **fail**: also detector-confirmed at 3.7–4.0       |
| `--them` outside a report (gray-8) on white                       | 3.26                               | fails if ever used for text                        |
| **`--heat-1`, `--heat-2`, `--chart-neutral` vs white**            | 1.45 / 2.06 / 1.52                 | **fail** WCAG 1.4.11 (3:1 for meaningful graphics) |

On the heat ramp: low-activity days in `ActivityHeatmap` are barely distinguishable from empty ones in light theme, and also in dark (see `sheet-mila-phone-dark.png`).

### Accessibility (manual DOM audit; axe-core not installed)

Working well:

- `lang` is set and titles are good. A skip link is present.
- One `h1` per page and a clean h1 → h2 → h3 outline on reports.
- No unnamed controls, no `img` without `alt`.
- Charts are `role="img"` with an `aria-label`.
- Share dialog:
  - `role="dialog"` with `aria-modal` and a label.
  - Focus goes in, Tab is trapped (12 presses stayed inside), and Esc closes it and returns focus to «Поделиться».
- Chat-row menu: on phone it is a bottom sheet with `role="menu"`, the arrow keys move between `menuitem`s, and Esc returns focus to «Ещё».
- Stories: a labelled dialog with named «Назад» and «Дальше» buttons. Reduced motion turns off auto-advance, which is handled correctly in `ReportStory.vue:966`.
- On phone, Tab never landed on an element covered by the sticky header.

Gaps:

- `role="tablist"`/`tab` is used for things that are not tabs. Details in P1-3.
- Some `role="img"` labels are meaningless: `" / "` three times on `/chat/1001` (`ReportLine` with missing data), and `"2 434 / 2 366"` with no side names.
- The five sparkline labels on the dashboard are all identical («Сообщения по неделям…»).
- Heatmap details are only in `title=` (`ActivityHeatmap.vue:71`), so touch and keyboard users cannot reach them.
- Stories have no `aria-live` region for slide changes.
- Focus rings are `box-shadow` only (`base.css:76`). They vanish in Windows forced-colors mode, and there is no `@media (forced-colors)` fallback.
- Every row's menu button has the same name, «Ещё».

### Touch targets

Many phone controls are 36 px tall:

- primary «Поделиться» (144×36),
- «Новый анализ» in the home header,
- every segment (`.segment` = `--control-sm`),
- «Разобрать чат».

They pass WCAG 2.5.8 (24 px), but not the 44 pt iOS guideline the product claims to follow (`--hit-min: 44px`). `.hit-area` is used only on the account avatar.

The 1024 px touch tablet gets the desktop sidebar: 36 px rows and 32 px segments, with no `(pointer:coarse)` adjustment.

### Performance (production build, :3100)

Phone measurements use 4× CPU throttle and a ~16 Mbps / 150 ms network.

| Route                          | FCP    | LCP                          | TBT   | CLS       |
| ------------------------------ | ------ | ---------------------------- | ----- | --------- |
| `/` phone                      | 0.89 s | 0.89 s                       | 2.3 s | 0         |
| `/dashboard` phone             | 0.84 s | 5.6 s (`.home-event__title`) | 1.3 s | **0.140** |
| `/chat/1001` phone             | 0.63 s | **6.9 s** (`.poster__name`)  | 2.7 s | 0.042     |
| `/chat/-1002001` phone         | —      | 6.4 s                        | 2.5 s | 0.100     |
| `/chat/1001` 1440, no throttle | —      | 2.9 s                        | 0.9 s | **0.317** |

At 1440, 0.289 of that CLS comes from `SECTION.report-part` at 2.77 s, plus 0.028 from `.page-container`.

**JS weight:**

- Signed-in routes download about 1.28 MB of raw JS, about 400 KB gzipped.
- The `/chat/:id` page chunk (`DH23gweV.js`) is **624 KB raw / 208 KB gz**. It contains ECharts (only the group report uses it) and the whole `ReportStory`/`StorySlide` stack, which is only needed after the user taps «Смотреть итоги».
- html2canvas (45 KB gz) is correctly lazy.
- zod (`CBNTpKSa.js`, 42 KB gz) is modulepreloaded on every page, the landing page included.

**Fonts:**

- `@fontsource-variable/onest` uses `font-display: swap` and unicode-range subsets. A Russian page pulls cyrillic (16 KB) + latin (34 KB), and the report also pulls symbols (18 KB).
- There is no `<link rel=preload>` and no metric-matched fallback (`size-adjust`). The result is a visible FOUT swap from the system font to Onest; the landing's 0.053 CLS on `DIV.window` is consistent with that.

## Findings by severity

### P1-1: Report masonry causes large layout shift on desktop and tablet

- **Where:** `composables/useMasonry.ts` lays the grid out in JS after the cards render.
- **Evidence:** CLS 0.317 on `/chat/1001` at 1440 (Web Vitals "poor" is above 0.25); 0.289 of it is `section.report-part` moving. Phone CLS is 0.04–0.10.
- **Impact:** the first thing a desktop reader sees is the report jumping.
- **Fix:** keep the part `visibility:hidden` or `opacity:0` until the `ready` ref the composable already exposes is true, then fade in. Or reserve rows with a two-column `grid-auto-flow: dense` fallback. Longer term, use CSS `masonry` behind `@supports`.
- **Command:** `/impeccable optimize`.

### P1-2: The report route is heavy and blocks the main thread on phones

- **Evidence:** the 208 KB gz page chunk bundles ECharts and stories. Throttled phone LCP is 6.9 s and TBT 2.7 s on `/chat/1001`.
- **Impact:** the core moment («open my report in the evening on an iPhone») waits on code that is never used in a private chat.
- **Fix:**
  - Use `defineAsyncComponent` for `GroupReport`'s ECharts charts (or `ChartFrame`).
  - Use it for `ReportStory`/`StorySlide`, loaded only when stories open.
  - Make sure the API call starts before the chunk evaluates. `ssr:false` already forces a client-only render, so the poster cannot show any earlier.
  - Consider leaving zod out of the client bundle on public pages.
- **Command:** `/impeccable optimize`.

### P1-3: `role="tablist"` is used for non-tab controls

- **Where:**
  - `UiSegmentedControl` always renders `tablist`/`tab` (`ui/SegmentedControl.vue:56,72`).
  - `ReportNav` uses it for in-page anchor navigation and scroll-spy.
  - The theme and language choices on `/account` and the chat filter on `/new` use it too.
- **Evidence:** no `tab` has `aria-controls`, and no `tabpanel` exists anywhere (see `a11y.log`).
- **Impact:** a screen reader announces "tab, 1 of 3, selected" and the user expects a panel to switch. Instead the page scrolls, or a preference changes.
- **Fix:**
  - `ReportNav` should be a `<nav>` of links with `aria-current="location"`.
  - Preferences and filters should be `role="radiogroup"`/`radio`.
  - Keep `tablist` as an opt-in prop for real tabs.
- **Note:** the e2e tests rely on `role=tab` (CLAUDE.md), so the tests must change too.
- **Command:** `/impeccable harden`.

### P1-4: Contrast failures inside the system tokens

These are measured, not guessed:

1. **Inactive segments:** `--text-muted` on `--segment-track` is 4.07:1 (light) and 4.47:1 (dark). This affects every segmented control: the report nav, filters and settings. Over the poster it drops to 3.97.
2. **Avatar initials:** white on the gradient's glow end is 3.4–3.6:1 at 12–14 px. These are the people's identity marks. Darken `--hue-*-glow` or shorten the gradient.
3. **Person-coloured text on the room:** `mark` on `room` is 4.30–4.39 for teal, blue and green. The comment in `tokens.css` promises ≥ 4.6 on white only, but marks are also used on the room.
4. **Heatmap ramp and neutral chart bars:** below 3:1 against the tile (WCAG 1.4.11). Low-activity days are invisible.

**Fix:** retune `--segment-track` (or use `--text` at 70% on a lighter track), the glows, the room tints and the `--heat-1/2` steps. Then add a contrast unit test over all 7 hues × 2 themes; the token pairs are deterministic.

**Command:** `/impeccable colorize` (tune), then `/impeccable audit`.

### P2-1: Phone controls are smaller than the 44 pt target the system claims

The 36 px figures and the controls affected are listed under Touch targets above.

- **Fix:** add `@media (pointer:coarse) { --control-sm: 44px }`, or apply `.hit-area` systematically to `UiButton size="sm"` and `.segment`.
- **Command:** `/impeccable adapt`.

### P2-2: Tablet portrait (820) feels compressed, not designed

- **Evidence:** at 820, «Отчёты» uses three card columns about 247 px wide (`home-820-light.png`).
- **Impact:**
  - Titles and date ranges truncate: «Продуктовая ко…», «янв. 2026 – нояб. 2…» (7 truncations measured).
  - Pinned «Продуктовая» is cut.
  - The «Ваши 30 дней» tile is stretched to its neighbour's height, leaving about 120 px of empty white.
- **Fix:** use two columns between 641 and 1100 px, or put the date range on its own line. Let «Главное» tiles size to their content (`align-items:start`).

### P2-3: Phone 360 truncates the information users actually need

- **Evidence:**
  - On `/new`, report rows show «Обновлён 2…» even in the short variant.
  - The page-bar lede «Выберите чат, посчитаем за мину…» is ellipsized in the header (`new-360-light.png`).
- **Impact:** a truncated "updated" time conveys nothing.
- **Fix:** use a relative short form («22 мин») or drop the word «Обновлён». On phone, hide the lede or let it wrap.

### P2-4: Long names are repeated in full inside answers

With an 80-character name, «Кто пишет больше» renders the full name in an h2 that runs 5 lines, and the home event label wraps to 4 lines (`sheet-stress-360.png`). There is no overflow, but the rhythm breaks.

- **Fix:** use the first name or a short form (the first word, capped at about 24 characters) in the answer sentences; keep the full name on the poster.

### P2-5: Long-press on chat rows does not work on iOS Safari (code-reviewed, not proven)

- **Where:** `ChatRow.vue` relies only on `@contextmenu`, but the docs promise «долгое нажатие».
- **Why:** iOS Safari does not dispatch `contextmenu` on long-press. On a link (`.chat-row__main` is a `NuxtLink`), iOS shows its own link preview instead.
- **What is not affected:** Android Chrome works, and the «Ещё» button still works.
- **Fix:** a pointer-events long-press timer plus `-webkit-touch-callout:none` on the row.
- **Verification:** needs a real iPhone; Chromium emulation cannot prove this.

### P2-6: Landscape safe areas are missing

- **Where:** the viewport uses `viewport-fit=cover`, and top/bottom insets are handled. No `safe-area-inset-left`/`-right` exists anywhere.
- **Impact:** on a landscape iPhone, the 16–24 px gutter puts content under the notch or Dynamic Island.
- **Fix:** `--page-gutter: max(var(--space-4), env(safe-area-inset-left))`, plus the right inset. This is WebKit-only and unverified here.

### P2-7: Screen-reader output of the data

- Several `ReportLine` images are labelled `" / "`.
- Value pairs do not name the sides.
- The five dashboard sparklines share one label.
- **Fix:** build each label as «Вы 2 434, Мила 2 366», use «нет данных» for empties, and add the chat name to each sparkline.

### P2-8: Forced-colors and high-contrast mode

Focus is `box-shadow` only, so it is invisible in Windows High Contrast.

- **Fix:** add `outline: 2px solid transparent` alongside the shadow; forced-colors then paints the outline. Or add an `@media (forced-colors: active)` block.

### P3

- `base.css:401 .input__clear:hover` sits outside the hover media query.
- `GroupReport` `.signature` nests cards (detector ×8) against §6.
- No font preload or metric-matched fallback: add `size-adjust` on the Onest fallback and preload the cyrillic woff2.
- The «/» separator in «51 / 49» is 1.5:1. It is decorative, but `aria-hidden` is advisable if it is read.
- Seven hues for many people means unrelated people share a colour: Мила and Анна Петрова are both red in «Ваши 30 дней». This is acceptable only because the names sit next to the bars. Never rely on colour alone there.

## Browser compatibility risks (Chromium cannot prove these)

1. `linear()` spring: there is an `@supports` fallback. OK.
2. `backdrop-filter`: prefixed with `-webkit-`. OK.
3. `text-wrap: balance/pretty` (16 uses): degrades gracefully.
4. `:has()` (11 uses): fine on Safari ≥15.4. Check that none of them is load-bearing for layout.
5. `cqmin` in stories: html2canvas export of container units is the known fragile point; the codebase already guards it with a separate still copy. Not exercised here on WebKit.
6. `100dvh`, `svh` and `vh` mixed (`9vh`, `6vh`, `4vh` in landing): on iOS, `vh` uses the large viewport, which affects the hero height.
7. `scrollbar-gutter`: Safari support is recent.
8. The `contextmenu` long-press (P2-5).
9. The landscape notch (P2-6).

## What is strong and should be preserved

- Zero horizontal overflow from 360 to 1920 px, even under 80-character names and seven-digit counts.
- A real token architecture enforced by Stylelint; the per-person `data-hue` cascade is elegant and cheap.
- One column alignment for header, page bar and content at every width; layout-owned page rhythm.
- Strong dialog, menu and sheet behaviour: focus trap and focus return, sheets on phone, `overscroll-behavior: contain`, safe-area bottom padding.
- Thoughtful reduced-motion handling. It softens rather than kills, and story auto-advance is disabled.
- Tabular numerals, `Intl` formatting and non-breaking units are consistently applied.
- The «you are ink, they are their hue» encoding reads instantly in both themes, and dark mode is properly designed (raised greys, light marks), not inverted.

## Reconsider in Portrait

- **Onest:** fine, with good Cyrillic, but it costs a FOUT swap and about 50–70 KB per route. Preload it or ship a metric-matched fallback.
- **7 Telegram hue families:**
  - Keep them, but retune the room, glow and track values to a hard 4.5 floor.
  - Accept that colour cannot identify a person among many; names must always accompany colour.
- **Neutral surfaces:** the white-on-grey and white-on-room tile field is calm, but the heat and neutral ramp is too faint to carry data.
- **Header over the poster:** the segmented nav on a tinted track is the weakest-contrast element in the product.
- **Mobile:** mobile feels designed rather than compressed, with good clamping, a sticky nav and bottom sheets. Tablet 820 is the size that feels compressed.

## Audit Health Score (Impeccable)

| #         | Dimension                | Score     | Key finding                                                                                                        |
| --------- | ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------ |
| 1         | Accessibility            | 2         | Fake tabs; contrast floor misses on segments, initials and heat; weak data labels; good dialogs and focus handling |
| 2         | Performance              | 2         | 208 KB gz report chunk with unused ECharts and stories; phone LCP about 6–7 s; CLS 0.32 on desktop report          |
| 3         | Theming                  | 3         | Excellent token system and dark mode; a few token pairs below AA                                                   |
| 4         | Responsive               | 3         | No overflow anywhere; 36 px touch targets; cramped 820 tablet; no landscape safe areas                             |
| 5         | Implementation integrity | 3         | Coherent and lint-enforced; isolated drift (`signature` nesting, one hover rule)                                   |
| **Total** |                          | **13/20** | **Acceptable**: significant performance and accessibility work needed                                              |

## Top 10 issues (ranked)

1. P1: Masonry layout shift, CLS 0.317 on the desktop report (`useMasonry.ts`).
2. P1: The 208 KB gz `/chat/:id` chunk bundles ECharts and stories; phone LCP 6.9 s, TBT 2.7 s.
3. P1: Segmented control inactive labels at 4.07 (light) and 4.47 (dark), 3.97 over the poster.
4. P1: `tablist`/`tab` used for scroll nav, settings and filters; no panels.
5. P1: Avatar initials at 3.4–3.6:1 on the glow; teal, blue and green marks on the room at 4.3–4.4:1.
6. P2: Heat ramp and neutral bars below 3:1, so low-activity days are invisible.
7. P2: 36 px touch targets on phone; desktop density on the 1024 touch tablet.
8. P2: The 820 tablet uses three narrow report columns with truncation and stretched «Главное» tiles.
9. P2: Long-press unsupported on iOS; landscape notch insets missing (WebKit, unverified).
10. P2: Screen-reader data labels (`" / "`, sides unnamed, identical sparkline labels); box-shadow-only focus in forced-colors.

## Scores (1–10)

| Dimension                           | Score | Why                                                                                           |
| ----------------------------------- | ----- | --------------------------------------------------------------------------------------------- |
| Layout and overflow robustness      | 9     | Zero overflow from 360 to 1920 under stress; aligned columns                                  |
| Responsive adaptation               | 6     | Phone is designed; tablet 820 and 1024-touch are compressed or desktop-dense                  |
| Typography and responsiveness       | 7     | Coherent ramp and tabular numerals; answer sentences balloon with long names; FOUT            |
| Contrast                            | 5     | Text tokens mostly pass; segments, initials, room marks and heat ramp fail                    |
| Accessibility semantics             | 6     | Strong dialogs, menus, headings and skip link; fake tabs and weak chart labels                |
| Component states                    | 7     | Focus, hover, pressed, disabled and loading present; hover correctly gated; forced-colors gap |
| Performance                         | 4     | Bundle and LCP on throttled phones; desktop CLS 0.32                                          |
| Token and design-system consistency | 8     | Stylelint-clean; one stray hover rule; nested signature cards                                 |
| Browser-compatibility hygiene       | 6     | Good fallbacks for `linear()` and backdrop; iOS long-press and landscape safe areas missing   |
