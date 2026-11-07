# Agent A — Apple Design Director audit (baseline «Portrait» @ de5319d)

**Lens:** does TG Analyzer feel at home on iPhone and iPad, judged against Apple's design principles and the HIG, without turning the site into a fake iOS app.

**Method and honesty notes**

- I read these in full during this run: `skills/emilkowalski_skills/skills/apple-design/SKILL.md`, Impeccable `reference/ios.md` and `reference/critique.md` (the heuristics, cognitive-load and severity sections).
- HIG: I fetched 16 pages as JSON from developer.apple.com (`agent-a/hig/*.txt`). I read **Sheets, Tab bars, Dark Mode** and the Dynamic Type sections of **Typography** closely. I skimmed Layout, Materials, Motion, Modality, Menus, Context menus, Segmented controls, Buttons, Sidebars, Toolbars, Color and Accessibility. The Navigation bars page returned 404.
- Everything ran in Chromium with iPhone (390×844 @2x, touch), iPad (820×1180) and desktop emulation, against the live demo stack. **No Safari or WebKit was available.** Where a finding depends on iOS Safari behaviour (`contextmenu`, `:active`, `touch-action`, `theme-color`, standalone mode), it is marked _[WebKit — verify on device]_.
- The shared session expired midway. For mutating work I signed in fresh as `9007770001`, then used the refreshed harness state for read-only checks.
- Scripts and screenshots are in `scratchpad/agent-a/`.

---

## 1. Verdict in one paragraph

Portrait is the most Apple-literate web product I've audited in a while:

- The dark theme uses the exact iOS grouped palette: `#000` ground, `#1c1c1e` cards, `#2c2c2e` fills.
- The account page reads as a Settings-style inset grouped list.
- On scroll, the report's poster collapses into an inline title over a glass bar. That is a faithful adaptation of HIG's large title → inline title.
- Menus on phone become real bottom sheets with a grabber, velocity-aware drag-to-dismiss and rubber-banding.
- Reduced motion is handled thoughtfully.
- Touch targets are almost all ≥44 px.

Where it breaks is **behaviour, not looks**. The surfaces resemble iOS, but several don't behave like it:

- The back chevron pushes instead of popping, so the edge-swipe back gesture loops into the report.
- The most important sheet (Share) can't be swiped away, while lesser sheets can.
- The "long-press like Telegram" row menu almost certainly never fires on iPhone.
- Pressed states probably don't render on iOS Safari at all.
- Type is locked in px, so it ignores every text-size preference.
- There is no answer to Reduce Transparency or Increase Contrast.

An iPhone user will find it beautiful on first look and slightly "off" by the third gesture. That gap is the job.

---

## 2. What is genuinely strong — preserve

1. **Dark appearance is correct Apple grey.** `tokens.css`:
   - `--night-0 #000` ground, `--night-1 #1c1c1e` surface, `--night-3 #2c2c2e` fills, `--night-12 #f5f5f7` text. This is `systemGroupedBackground` / `secondarySystemGroupedBackground` almost verbatim.
   - The person's "room" in dark is a barely tinted near-black (`--hue-red-room-d #130b0b`), and posters go deep (`#6a2023`) rather than glowing. Restrained and correct.
   - Muted text measures 5.9:1 on `#1c1c1e`.
2. **Large title → inline title on the report.**
   - Over the poster, the header takes the poster's colour and the name is huge (`--text-display`).
   - After the poster, the bar turns to glass (`rgba(255,255,255,.72)` + `saturate(1.8) blur(20px)`) with avatar and name inline (`rep-light-scroll700.png`).
   - This is the HIG pattern translated well, and better than most native apps.
3. **`UiBottomSheet` is real iOS physics** (`components/ui/BottomSheet.vue`):
   - Grabber, 1:1 drag, velocity flick (0.5 px/ms), a 30% close share and sqrt rubber-band on upward drag.
   - Used for the row menu on phone (`rowmenu-phone.png`), which reads like an action sheet with a red destructive row.
4. **Settings-shaped account page** (`baseline/account--phone--light--full.png`):
   - Inset grouped sections with small grey headers («Оформление», «Данные»).
   - Value-on-the-right rows («Тексты сообщений — Не храним»), chevron rows and a red destructive row.
   - Exactly how Apple Account / Settings is built, and the privacy row is a lovely touch.
5. **Home as a Health-style Summary.**
   - Pinned people work like pinned conversations in Messages.
   - «Главное» works like Health highlights: one sentence, one number, show-only-when-meaningful.
   - Report list rows have chevrons. Familiar without being a copy.
6. **Motion discipline.**
   - `--spring-snappy` is a sampled critically-damped spring (damping 1, response 0.35).
   - The press scale is 0.97 / 0.985 with a 90 ms press-in.
   - Reduced motion keeps opacity fades and a slower spinner instead of killing everything (`base.css` ~l.640). That matches the apple-design guidance ("gentler, not none").
7. **Touch targets and zoom resilience.**
   - Across report, home, `/new`, account, landing and login, the only sub-44 px interactive elements were segmented controls (36 px; iOS's own are 32 pt, so acceptable) and the skip link.
   - Page zoom equivalent to 150% on an iPhone (260 px CSS width) produces no horizontal scroll on report, group report, home or `/new` (`w260_chat_1001.png`).
8. **Semantics.**
   - The report has one h1 (name), h2 per part and h3 per card. That is a clean VoiceOver rotor.
   - The pulse is `role="img"` with a meaningful label. ECharts frames carry `role="img"` and a label.
   - The stories viewer is `role="dialog" aria-modal`. OTP uses `autocomplete="one-time-code"` and `inputmode="numeric"`.

---

## 3. Findings (each with evidence and fix)

### F1 [P1] The back chevron pushes instead of popping, so edge-swipe back loops

- **Where:** `components/ui/PageBar.vue` l.37 — `<NuxtLink v-if="back" :to="back">`. Used on report, `/new` and account.
- **Evidence:** `agent-a/t8.js`.
  - Path: `/new` → open Мила's report → tap ‹ → lands on **/dashboard** (not `/new`, where the user came from).
  - Then browser back (what iOS left-edge swipe does) → **back on /chat/1001**.
  - `history.length` grows each loop.
- **Why it matters:** On iPhone, back means pop. ios.md: _"Edge-swipe back stays alive… muscle memory."_ Here the two back mechanisms disagree, and the swipe sends you forward into the screen you just left. This is the single most "ported from a website" behaviour in the product.
- **Fix:** In `PageBar`, if `history.state.back` exists and is same-origin (Vue Router sets it), call `router.back()`. Only fall back to `navigateTo(back, { replace: true })` for deep links.

### F2 [P1] The Share sheet can't be swiped down, unlike every other sheet

- **Where:** `ShareDialog.vue` → `UiModalDialog`. On ≤640 px it is restyled as a floating bottom panel (`ModalDialog.vue` l.205+): no grabber, no drag handlers.
- **Evidence:** `share.png` (sheet over the poster). A synthetic touch-swipe of 380 px from the top edge leaves it open (`t3.js`: "dialog after swipe down: still open"). The row menu, built on `UiBottomSheet`, does close on swipe.
- **Why it matters:**
  - HIG Sheets: _"Support swiping to dismiss a sheet. People expect to swipe vertically… Include a grabber in a resizable sheet."_
  - Two sheet species that look the same but behave differently break HIG Consistency and apple-design §4 ("things that look the same must behave the same").
  - Share is the most-used sheet in the product.
- **Fix:** On phones, render `UiModalDialog` (and therefore `ConfirmDialog`) through the `BottomSheet` drag behaviour: one sheet primitive. Keep a medium detent for Share (preview plus 3 rows fit), and allow expanding to large when «По ссылке» opens the link step.

### F3 [P1 · WebKit — verify on device] Pressed feedback probably never shows on iPhone

- **Where:** `base.css` l.63, `Button.vue` l.81, `ListRow.vue` l.186 and `PageBar.vue` l.71 set `-webkit-tap-highlight-color: transparent`. Feedback relies on `:active` (`Button.vue` l.183, `ListRow.vue` l.204).
- **Evidence:** No `touchstart` listener exists outside the stories viewer (grep of `app/`). iOS Safari only applies `:active` when a touch listener is registered on the element or an ancestor.
- **Why it matters:** The system grey flash is removed and the replacement may never fire, so every tap could be silent. apple-design §1: _"Respond on pointer-down… waiting for touch-up to show feedback feels dead."_ This compounds F8, where the stale screen stays up during navigation.
- **Fix:** One line in a client plugin: `document.addEventListener('touchstart', () => {}, { passive: true })`. Then verify on a real iPhone that `.btn:active`, `.list-row:active` and chat rows depress.

### F4 [P2 · WebKit] "Long press opens the row menu, like Telegram" doesn't work on iPhone

- **Where:** `components/dashboard/ChatRow.vue` l.48–61 rely on `@contextmenu`.
- **Evidence:** iOS Safari doesn't dispatch `contextmenu` on long-press. On an `<a>` (the row is a `NuxtLink`), long-press shows Safari's own link-preview callout instead. Desktop right-click works but anchors the menu to the "…" button, not the pointer (`rowmenu-desktop-dark.png`). macOS context menus open at the cursor.
- **Why it matters:** The documented gesture is absent on the primary platform, and the user gets a browser preview of a private report URL instead.
- **Fix:**
  - Implement long-press with pointer events: ~500 ms, cancel on >10 px move. Add `-webkit-touch-callout: none` and `user-select: none` on `.chat-row`, then open the existing `BottomSheet`.
  - Consider a trailing swipe action («Обновить», «Удалить») on rows, as in Mail and Messages.
  - On desktop, position the popover at the pointer.

### F5 [P2] Type is locked in px: no Dynamic Type or text-size equivalent

- **Where:** `tokens.css` `--text-*` are all px (e.g. `--text-body: 400 16px/24px`). Only 2 of 914 CSS rules use rem/em.
- **Evidence:** Setting `html { font-size: 32px }` changes nothing (`t5.js`: before = after for every sampled element). Page zoom works (F7 strength), but text-only scaling (Chrome/Android font size, Firefox "zoom text only", reader preferences) is ignored.
- **Why it matters:** HIG Typography: _"Dynamic Type… lets people adjust the size of visible text… Keep text truncation to a minimum as font size increases."_ apple-design §15: _"Scale layout with the text — spacing in rem/em, not fixed px."_ The evening, in-bed reading context makes this more relevant, not less.
- **Fix:**
  - Convert `--text-*` and `--space-*` to rem and keep px values as comments.
  - On Apple devices, opt into Dynamic Type with `@supports (font: -apple-system-body) { html { font: -apple-system-body; } }` plus `body { font-family: var(--font-sans) }`. This keeps Onest but honours the iOS text-size setting.
  - Then test at 200%: the two-column «Номинации» grid (F11) and the segmented controls (F10) will need to wrap or stack.

### F6 [P2] No Reduce Transparency or Increase Contrast; some chart steps are nearly invisible

- **Where:** No `prefers-reduced-transparency`, `prefers-contrast` or `forced-colors` anywhere in `app/` (grep).
  - Glass bars: `--toolbar-glass rgba(242,242,245,.8)` / `rgba(255,255,255,.72)` over coloured rooms.
  - Measured: `--heat-1 #d6d6dc` vs `--heat-0 #e9e9ed` = **1.2:1**; `--chart-neutral #d1d1d6` on white = **1.5:1**; `--them` neutral `#8e8e93` on white = 3.3:1.
- **Why it matters:** HIG Dark Mode / Accessibility say to test with Increase Contrast and Reduce Transparency on, both separately and together. apple-design §14 names all three signals. The activity calendar's low end is effectively invisible to many people in sunlight.
- **Fix:** Add both media blocks to `tokens.css` as token overrides only:
  - Reduced transparency: `--toolbar-glass` becomes opaque `--bg`/`--room` and `--glass-filter: none`.
  - More contrast: darker `--text-muted`, `--border` → `--border-strong`, a steeper `--heat-*` ramp (≥1.5:1 between steps, ≥3:1 from heat-0 to heat-4) and a hairline on cards.

### F7 [P2] Two sheet grammars and two segmented-control meanings

- **Segmented control, two meanings.** The same `UiSegmentedControl` look is:
  - a true view filter on `/new` (Все / Личные / Группы);
  - a scroll-spy jump bar on the report («Вы двое / Время / О чём», `role="tab"`, `ReportNav.vue`).
  - In iOS, a segmented control swaps content in place. On the report, tapping «Время» scrolls 3–4 screens, and the selection lags the visible heading: at scrollY 2600 the «Время» h2 is on screen while «Вы двое» is still selected (`rep-dark-scroll2600.png`).
- **The report header carries a full pill button.** It holds «Поделиться» with the Lucide `Share2` "three nodes" glyph, which is the Android share metaphor. The iOS one is `Share` (square with arrow up).
- **Why it matters:** HIG Segmented controls / Tab bars say "use to navigate, not for actions" and keep metaphors consistent. Unfamiliar glyphs cost recognition.
- **Fix:**
  - Restyle the report's part nav as a quiet text-tab strip with an underline or capsule highlight. Or make it a true segmented switch that shows one part at a time; this deserves a test. Health on iPhone uses the latter mental model.
  - Fix the spy threshold so selection changes when a part's h2 crosses the bar's bottom edge.
  - Use the `Share` (box-arrow-up) icon. On phone, consider an icon-only share button (44 px, labelled) so the nav bar isn't dominated by a white pill.

### F8 [P2] Navigation into a report gives no immediate feedback

- **Evidence:** I delayed `GET /api/v1/reports/1001` by 5 s and tapped Мила's link from home. At 400 ms the old dashboard is still fully on screen, with only Nuxt's 2 px top bar (`loading-light-nav.png`). There's no skeleton push and no pressed row.
- **Why it matters:** Apple's push transition is instant, and content fills in. Combined with F3, a slow network means "did my tap register?". The `ReportSkeleton` component exists but isn't shown during the route transition.
- **Fix:** Navigate first and render `ReportSkeleton` (poster block in the person's hue plus card skeletons), then fetch. The hue is known from the chat id (`lib/hue.ts`), so the poster colour can appear immediately. That gives a lovely continuity from the avatar.

### F9 [P2] iPad portrait is a stretched iPhone

- **Evidence:** `baseline/report-mila--tablet--light.png` (820 px):
  - single column, 772 px cards with 14 px text;
  - a 772 px-wide segmented control;
  - no sidebar (sidebar and masonry start at 901 px, `workspace.vue` l.82).
- **Why it matters:** HIG Layout / Sidebars: iPad apps adapt to regular width. Health on iPad shows two columns and Settings shows a split view. 820 px comfortably holds two 380 px columns.
- **Fix:**
  - Start `useMasonry` two-column at ~700 px.
  - In 700–900 px, offer the sidebar as an overlay toggled from the header (an iPadOS-style sidebar button), rather than nothing.
  - Cap segmented controls at ~360 px.

### F10 [P2] Safe areas only cover top and bottom; viewport-fit=cover makes the sides your job

- **Where:** `nuxt.config.ts` sets `viewport-fit=cover`. `env(safe-area-inset-left/right)` appears only in `spa-loading-template.html`. `--page-gutter` on phones is 16 px.
- **Why it matters:** In iPhone landscape the sensor housing inset is ~47–59 pt. Poster text, back chevron and card edges will sit under the notch or Dynamic Island. ios.md: _"No controls under the notch… or rounded corners."_ _[Can't emulate env() in Chromium — verify on device.]_
- **Fix:** Use `--page-gutter: max(var(--space-4), env(safe-area-inset-left))`, and the same for right, in the ≤1024 px blocks. Keep poster backgrounds full-bleed.

### F11 [P2] Truncation and clipping on iPhone

- **Account:** `baseline/account--phone--light--full.png`. The «Тема» segment «Как в системе» is clipped mid-word with no ellipsis. Three long Russian labels don't fit a 3-segment control at 390 px.
  - iOS would use a menu row: «Оформление — Как в системе ›» opening a checkmark list, as in Settings → Display.
- **Group report:** `baseline/report-group--phone--dark.png`. In «Номинации», the right column text is cut at the card edge («0,1 ответа на сообщен…», «Дальше: Наташа, Сергей…»).
  - HIG: _"Avoid truncating text in scrollable regions."_ Stack the two columns below ~420 px.
- **Login at 260 px** (zoomed): the country chevron overlaps the phone placeholder («(✓23)»).

### F12 [P3] Appearance override in two places, and theme-color ignores the person's colour

- **Two override places:** The footer moon icon and the avatar menu toggle light/dark and write a cookie. One tap silently stops following the system.
  - HIG Dark Mode: _"Avoid offering an app-specific appearance setting."_ On the web, a setting is defensible, but it should live only in Account («Как в системе» default) and never as a one-tap toggle that hides the system option.
- **Static theme-color:** `theme-color` is static `#f2f2f5` / `#000` (`app.vue` l.38). Over a red poster, Safari 15–18's tinted toolbar and a standalone PWA's status bar show a grey band above the poster.
  - Set it per `data-hue` to `--poster` while the poster is under the bar.
- **Standalone mode:** No `apple-mobile-web-app-status-bar-style` / `-title` exist for standalone mode (iOS 26 opens home-screen sites as web apps by default).

### F13 [P3] Stories viewer: gestures are end-state, not tracked

- **Where:** `ReportStory.vue` l.562–616. It resolves swipes only at touchend; nothing follows the finger. `touch-action: pan-y pinch-zoom` (l.917) hands vertical pans to the browser.
- **Evidence:** In Chromium, a 450 px swipe-down did not close the viewer ("after swipe down stories: true"), although the code intends it. Horizontal swipe and tap zones work.
- **Why it matters:** apple-design §2/§10 say "touch and content move together… avoid recognizers that only report a final state". Photos Memories and Music Replay follow the finger on both axes.
- **Fix:**
  - Set `touch-action: none` on the stage.
  - Translate the slide 1:1 horizontally (with rubber-band at the ends).
  - Scale and translate the whole viewer down on vertical drag, with the velocity-close logic already in `BottomSheet`.
- The close button is 36×36: give it a 44 px hit area.

### F14 [P3] OTP doesn't auto-submit and doesn't take focus

- **Evidence:** After the phone step, `document.activeElement` is `<body>` (`login.js`). After typing 5 digits the page stays on `/login` until «Подтвердить код» is tapped.
- **Why:** iOS one-time-code flows (and Telegram's own) submit on the last digit.
- **Fix:** Auto-submit on the 5th digit and focus the first cell on step change. Desktop keyboards benefit too.

---

## 4. Reconsider in the Portrait system (from an Apple lens)

- **Onest.** Keep it. It gives the posters, figures and exported 1080×1920 stories a voice SF wouldn't, and its Cyrillic is good. What matters more is making it scale (F5). Weight 600 for titles and figures is correct; the CLAUDE.md "400/500 only" line is stale.
- **Seven Telegram colour families per person.** Strong idea and very Apple ("content brings the colour, chrome stays neutral", like Music's album-tinted Now Playing). The risk is collisions: Мила and Анна Петрова are both red on home (`dash-after.png`), so the 30-day bars show two identical red bars. Within one screen that lists several people, de-duplicate by shifting the second same-hue person to the nearest unused family. Telegram users won't notice; the chart will stop lying.
- **Neutral surfaces.** Right. In light mode, white cards on a pale tinted room is iOS grouped style. In dark mode on desktop, pure `#000` behind an opaque black sidebar feels like a phone stretched to a monitor. macOS uses `#1e1e1e` windows and translucent grey sidebars. Consider `--bg: --night-1`-ish for ≥901 px.
- **Poster → report transition.** It is the best moment in the product, so keep it. The bar is tall, though: back plus pill plus segmented control is 104 px sticky, ~12% of an iPhone 15 screen. Let the segment strip collapse into the inline title bar on scroll-down and reappear on scroll-up, as Safari's bars do.
- **Header and navigation.** No tab bar on iPhone is the right call: there are two real destinations (Сводка and Новый анализ), and a tab bar for two sections is weak. But "Новый анализ" as a black pill in the home nav bar plus a logo tile on the left is web chrome. iOS would put a `+` (44 px, labelled) at trailing and drop the logo from the nav bar once signed in.
- **Card rhythm.** Mobile mostly feels designed, not compressed: the card padding drops to 16 px, the figure scales to 52 px and the report reads as one well-paced scroll. The «Номинации» two-column grid is the exception (F11).

---

## 5. Benchmarks (from knowledge; can't run iOS here)

- **Health Summary:**
  - Its highlights are one sentence plus one chart, with "Show All" drilling down. «Главное» matches this.
  - What Health does better: tapping a highlight pushes a detail screen with a large title. Here, home events mostly don't lead anywhere except the analyse CTA.
- **Screen Time / Music Replay:**
  - The poster with a big number and a mirrored pulse is on par.
  - Replay lets you scrub the year. The pulse could take a touch scrubber with a value callout, the most Apple-native delight available here.
- **Photos Memories:** stories follow the finger and the viewer shrinks back into its thumbnail on dismiss. The Share sheet's preview thumbnail is the natural origin for the stories viewer (apple-design §7, "emerge from where it came").
- **Settings / Apple Account:** the account page already matches. Only the appearance and segment issue remains (F11).
- **Messages:** pinned avatars match. Long-press and swipe actions on rows don't (F4).

---

## Top 10 issues

1. **[P1] F1** — Back chevron pushes `/dashboard` instead of popping, so iOS edge-swipe loops back into the report (`PageBar.vue` l.37).
2. **[P1] F2** — Share sheet (`UiModalDialog` on phone) has no grabber and no swipe-to-dismiss; inconsistent with `UiBottomSheet`.
3. **[P1] F3** — `:active` feedback likely never fires on iOS Safari (no touchstart listener, tap highlight removed) _[verify on device]_.
4. **[P2] F5** — px-locked type and spacing: no Dynamic Type or text-size scaling (root 16→32 px changed nothing).
5. **[P2] F4** — Long-press row menu relies on `contextmenu`, which iOS doesn't fire; Safari's link preview appears instead.
6. **[P2] F6** — No Reduce Transparency or Increase Contrast; heat ramp steps at 1.2:1.
7. **[P2] F8** — Tapping a report keeps the old screen up until data arrives; the hue-coloured skeleton isn't used.
8. **[P2] F7** — Segmented control means "filter" on `/new` and "scroll jump" on the report; scroll-spy lags; Android share glyph.
9. **[P2] F9 / F10** — iPad portrait is a stretched phone (sidebar and columns only ≥901 px); landscape iPhone side safe areas unhandled.
10. **[P2] F11** — Truncation and clipping at 390 px: «Как в системе» segment, group «Номинации» columns.

## Scores (1–10)

| Dimension                                        | Score | Justification                                                                                                                                |
| ------------------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual fidelity to Apple aesthetics (light/dark) | 8     | Grouped palettes, restrained colour, correct dark greys; desktop pure black and heavy pills hold it back.                                    |
| Navigation and IA (iPhone mental model)          | 5     | Sensible hub-and-spoke and large → inline title, but back pushes, edge-swipe loops, and the segmented control has two meanings.              |
| Sheets, menus, modality                          | 6     | `BottomSheet` is excellent; Share (the key sheet) doesn't drag; the right-click menu isn't at the pointer; long-press is missing on iOS.     |
| Gestures and direct manipulation                 | 4     | Only `BottomSheet` tracks the finger; the stories viewer resolves at release; no swipe actions; long-press unsupported on iOS.               |
| Typography and hierarchy                         | 7     | Clear 10-role scale, size-specific tracking, good outline; zero text scaling.                                                                |
| Touch targets and safe areas                     | 7     | ≥44 px almost everywhere, top and bottom insets handled; side insets missing with `viewport-fit=cover`.                                      |
| Feedback and states                              | 5     | Good error state and progress in the header; navigation has no immediate feedback; press states likely invisible on iOS.                     |
| Accessibility (VoiceOver, prefs)                 | 6     | Clean headings and labelled charts, reduced motion done well; no Reduce Transparency, Increase Contrast or text scaling; weak heat contrast. |
| Motion                                           | 8     | Critically damped springs, symmetric sheet, thoughtful reduced motion; the stories viewer lacks interactive tracking.                        |
| iPad adaptation                                  | 5     | Landscape gets a proper sidebar and two columns; portrait is a stretched phone.                                                              |
| **Overall "feels at home on iPhone"**            | **6** | Looks native at rest, but the third gesture gives it away. F1–F5 are mostly small, mechanical fixes that would move this to an 8.            |
