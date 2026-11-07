⚠️ DEGRADED: single-context (I am a sub-agent with no sub-agent/Task tool, so Impeccable critique Assessment A (design review) and Assessment B (detector) ran one after the other in one context. I finished A before reading any detector output.)

# Agent B: Visual design critique (art direction), baseline «Portrait» @ de5319d

Auditor: Agent B, visual design critic. Read-only.
Skills read this run: frontend-design SKILL.md, Impeccable SKILL.md with reference/critique.md, typeset.md, colorize.md and craft-floor.md, emil-design-eng SKILL.md.
Evidence lives in `scratchpad/baseline/` and `scratchpad/agent-b/`. I used my own session (phone 9007770012) and analysed Мила and «Продуктовая команда» in it.
The shared `harness/state.json` session had already expired when I started (`/chat/1001` redirected to `/login`), and my own session expired once during the run. I signed in again each time.

---

## Verdict in one paragraph

Portrait has one real idea: **the report opens as a poster in the other person's colour, with their name set huge and the conversation drawn as a mirrored waveform.** That idea is specific to this product and could become memorable. Everything around it is a careful, competent, and fairly anonymous iOS-settings/SaaS kit:

- grey `#F2F2F5` canvas;
- white 24 px-radius cards;
- grey 14 px question, bold 22 px answer, black-vs-colour pill bar, repeated about 15 times per report;
- an ECharts dashboard in group reports;
- a stat-tile layout in «Итоги».

The poster idea stops at the poster's bottom edge (y≈397 px on desktop). The parts that matter most emotionally do not carry it:

- the shareable stories (the cover slide is charcoal grey, not the person's colour);
- the home page (white cards; `design-system.md §11` says «плитки в цвете людей», but they are white);
- the brand mark (an equaliser icon whose lime "them" bars no longer mean anything).

The product is technically tidy: the Impeccable detector found 0 issues. But it reads as **"a well-built analytics app that is tinted per person"**, not **"a private, slightly tender object about you and Мила."**

---

## Design specificity (Impeccable Assessment A, before detector)

**Could an unrelated product use this unchanged?**

- **Poster: no.** It is authored. The name at `100.8px/96.8px w600 ls −4.5px` (measured on `/chat/1001`) and the mirrored pulse are specific to this product.
- **Report body: yes.** Swap the copy and the cards could be a fitness app ("Кто пишет больше" → "Steps this week"). The skill's calibration list describes the body almost word for word: trait 4, "content chopped into identical rounded cards, one border-radius on everything regardless of hierarchy".
- **Landing: largely yes.** The headline "Ваши переписки. В цифрах." is the category default, and so is the composition: H1 on the left, product card floating on the right with a soft shadow.
- **Login, /new, account: yes.** They are deliberately neutral (principle §1, «интерфейс спокоен»). The choice is defensible, but these screens have zero brand: no mark beyond the 28 px logo, and no trace of the waveform or the poster.

**Detector (Assessment B):**

- `impeccable detect --json` against the URLs `/`, `/login`, `/faq` and `/example` returned `[]` (exit 0). `/dashboard` is auth-gated, so the detector saw only the login redirect.
- A source scan of `app/components`, `app/pages` and `app/layouts` also returned `[]`.
- The detector found nothing that I missed, and I found no false positives.
- My main findings are compositional and about the brand. They are outside what a pattern detector checks. A clean scan is the floor, not proof of quality.
- The browser overlay was not injected. It needs `live-server` and a `[Human]` tab, and this audit is read-only with nobody watching, so no overlay exists.

---

## What is genuinely strong (keep these)

1. **The poster** (`ReportPoster.vue` + `ReportPulse.vue`).
   - The giant name in white on the person's colour works at every size: `baseline/report-mila--desktop--light.png` and `report-mila--phone--light.png`.
   - The mirrored waveform (you above the line, them below) is the best visual metaphor in the product. It is a conversation, literally. It also scales to the 404 page as a pulse that goes flat, which is a lovely small idea (`baseline/404--desktop--light.png`).
2. **The scroll-collapse header.** After the poster, `AppHeader` becomes glass with a red «М» avatar and «Мила» (`agent-b/shots/report-scrolled.png`). It is a proper HIG "large title → inline title" moment and very well executed.
3. **The FAQ privacy table** (`baseline/faq--desktop--light--full.png`). «Читаем / Храним / Не храним / Не делаем / Отключить нас / Удалить всё» is the most honest-looking screen in the product. It is plain, specific and trustworthy.
4. **Number setting.**
   - Tabular figures everywhere.
   - `51 / 49` with a grey slash and the person's colour on their number is a clean, ownable device.
   - Thin-space thousands («4 800», «2 434») are correct for Russian.
5. **Milestones timeline on the poster tile** («1-е → 100-е → 1 000-е → 5 000-е, около 20 ноября»). It is the only card in the body that tells a _story_ and not a ratio. The dashed "future" dot is a good detail.

---

## Priority issues

### [P1] 1. «Итоги», the most shareable and emotional artefact, abandons the poster idea

**Where.** `ReportStory.vue` / `StorySlide.vue`. Evidence: `agent-b/shots/story-phone-light-0…3.png`, the exported PNGs `agent-b/shots/export-tg-analyzer-{overview,starts,time,words}.png`, and the contact sheet `agent-b/shots/export-contact.png`.

**What is wrong:**

- **The cover is a charcoal `#1C1C1E` slide** with "Вместе вы написали **4 800** сообщений". This is the hero-metric template (big number, small label, supporting stat tiles) that frontend-design names as the default to avoid. Мила's red appears only in one 330×140 tile («В день переписки 23») and in the lower half of the pulse.
- **Мила's name is never large.** It appears only at caption size in «Demo & Мила». The single strongest element of the report, the giant name, is missing from the artefact people actually post.
- **Background temperature changes on every slide:** charcoal, then pink room, then **neutral grey `#F2F2F5`** («Ваше время»: there is no person colour at all; it looks like a settings screen), then poster red. None of the four is a rule; it reads as alternation for its own sake.
- **Body = white rounded cards on a coloured field.** That is the SaaS card kit again, this time inside a 9:16 frame. Three of the tiles say «Поровну» in identical 64 px type (slide 2 twice, slide 4 twice). That is visually dead.
- **Wasted vertical space.** About 300 px at the top and about 250 px at the bottom of the 1688 px phone frame are empty (`story-phone-light-1.png`). The content block floats in the middle instead of using the poster format.
- **Export is slow.** «Сохранить картинками» took about 20–70 s in headless Chromium before four downloads arrived, with a spinner only on the in-story «Поделиться» button (`agent-b/shots/after-export.png`). That is outside my brief, but users will feel it.

**Why it matters.** The story image is the product's only billboard. Right now it looks like any "year in review" from a fitness or banking app. It does not look like _your conversation with Мила_.

**Fix.**

- Make every slide a poster in Мила's colour (`--story-*` already exists): one huge statement per slide, set at display scale.
  - Cover: «Мила» at roughly 25 cqmin, with the waveform full-bleed as the visual.
  - Next: «4 800» as the second beat.
- Drop the white cards inside slides. Use type plus one drawing per slide (waveform, clock, word).
- When the answer is «Поровну», say it once per deck, not four times.

**Commands:** `/impeccable bolder`, `/impeccable layout`.

### [P1] 2. The report body is one card type repeated 15+ times: rhythm without melody

**Where.** `ReportSection.vue`, `ReportLine.vue`, `PrivateReport.vue`. Evidence: `baseline/report-mila--desktop--light--full.png` and the phone crops `agent-b/crops/report-mila--phone--light--full-{1..4}.png`.

**What is wrong:**

- Every card has the same anatomy: grey 14 px question → 22/600 answer → `ReportLine` bar.
- `ReportLine` appears **13 times** in Мила's private report:
  - writes more;
  - questions (twice as dot rows);
  - stickers;
  - reactions;
  - voice;
  - good morning ×2;
  - first and last ×2;
  - six emoji rows.
- Measured type distribution on `/chat/1001`: 88 text nodes at `14px/20px w400`, 18 at `22px/28px w600`, only 3 at the 64 px figure. The page _reads_ as small grey text punctuated by identical bars.
- Every answer is phrased as balance («Пишете на равных», «Отвечаете синхронно», «Спрашиваете в унисон», «Идеальный баланс», «Стикерами — на равных», «Говорите поровну», «Заботитесь поровну»). Combined with the identical layout, the page gives the reader no peaks.

**Why it matters.** This is Impeccable's "visual noise floor": everything has the same weight. A relationship report should have a few big moments and quiet connective tissue. The peak-end rule fails as well: the page ends on an emoji bar list with blank room below (`…-4.png`). There is no closing beat and no invitation to «Итоги».

**Fix.** Give the three parts a dramaturgy:

- **Each part gets one hero card** with a different form: a full-width poster tile, an oversized figure, or a drawing.
  - «Вы двое»: the 51/49 split drawn as two waveforms or two columns at full card height.
  - «Время»: the day clock.
  - «О чём»: the word.
- **Collapse the four "even" cards** into one «Где вы совпадаете» list. Reserve the big type for asymmetries («Точку чаще ставит Мила» is the only interesting answer in «Вы двое» and it is buried at the bottom).
- **End the report** with a coloured closing poster («Итоги: Мила» → Смотреть).

**Commands:** `/impeccable layout`, `/impeccable distill`.

### [P1] 3. Colour-per-person is diluted: 7 families, muted, near-identical rooms, and "you" broken in groups

**Where.** `tokens.css` lines 68–137, `lib/hue.ts`, `GroupReport.vue`.

**Evidence of collision:**

- `/new` (`baseline/new--desktop--light--full.png`): Мила, Анна Петрова and Семья are all red. Олег and «Продуктовая команда» are both pink. Мама and «Бег по утрам» are both orange.
- On home, the bars in «Ваши 30 дней» use the same red for Мила and Анна Петрова (`home--desktop--light--full.png`). The colour _cannot_ identify a person when a third of the list shares it.

**The families are near-identical in practice:**

- Posters are all darkened to the same mid-dark band: red `#a8353a`, pink `#9f3960`, orange `#9c470d`. Red and pink are hard to tell apart side by side.
- Light rooms are almost the same: `#fff4f3` (red), `#fef4f6` (pink), `#fef5f0` (orange).
- Dark rooms (`#130b0b`, `#120b0d`, `#120b08`) are essentially black.
- So the "room" carries almost no identity; only the poster does. I agree with the earlier choice that colour = person, but at this saturation the colour reads as **"wine/brick theme"**, not as **Telegram's** bright avatar gradient that users actually recognise.

**"You" is broken in group reports:**

- In «Кто и как участвует», «Вы» has a **teal "В" avatar** like everyone else (`agent-b/crops/group-desk-0.png`). That contradicts rule 2, «Вы» всегда чернила.
- Members also collide: Сергей/Наташа are both orange and Мария/Алексей are both violet, with 8 members over 7 families.

**Theme inconsistency.** In dark mode the avatars switch to pastel fills with dark letters (sidebar in `baseline/account--desktop--dark.png`, home `crops/hues.png`). Мила is brick-red in light and salmon in dark, so a person's identity changes with the theme.

**Fix.**

- Keep the 7 families (Telegram parity is a good story) but **brighten the posters to Telegram's actual gradient endpoints**, and use a two-stop gradient on the poster, the same as the avatar. That makes the colour feel _borrowed from Telegram_ and not like a brand palette.
- Make the room tint perceptibly different per family, or drop the "room" concept and let the poster carry identity.
- Fix «Вы» to ink in group lists.
- Keep one avatar treatment in both themes.

**Commands:** `/impeccable colorize`.

### [P1] 4. Group report is a different product: default ECharts dashboard and admin tables

**Where.** `GroupReport.vue`, `components/report/group/*`, `charts/*`. Evidence: `agent-b/crops/group-desk-1.png`, `baseline/report-group--desktop--light--full.png`.

**What is wrong:**

- **«Темп группы» is a stock ECharts line+area chart**: grey fill, gridlines every 100, axis ticks «29 апр.…28 окт.». It has no answer headline, which breaks the card grammar used everywhere else.
- **«Недельный ритм»** is a grey column chart with a y-axis up to 1 500.
- **«Активность по часам»**: «Вы» in black is almost invisible next to pink «Остальные».
- **«Показатели группы»** is four KPI progress bars («Равномерность участия 98%», «Регулярность 100%», «Кто остался 100%»). That is an admin console.
- **Sergey's detail panel has misaligned baselines** («1 173» has about 30 px above it, «154» about 10 px, «2,4» and «только что» float). The figure size is inconsistent: «только что» is set in bold 22 px as if it were a number.

**Why it matters.** Group chats (family, friends) are just as emotional as private ones. Here the private report's custom drawing vocabulary (pill bars, stacked hour bars, heat squares) gives way to library defaults. The product looks stitched together (Nielsen 4).

**Fix.**

- Redraw tempo and weekly rhythm with the private report's own marks: a waveform for tempo, stacked pill columns for days. Hide axes; label only the peaks.
- Give every card an answer line.
- Turn «Показатели группы» into sentences («Все 8 пишут каждую неделю — никто не выпал»), with one figure each.

**Commands:** `/impeccable layout`, `/impeccable distill`.

### [P2] 5. The brand mark is a leftover with no meaning, and the brand has no name or voice

**Where.** `components/brand/BrandMark.vue`.

- The mark's own comment says: _«lime bars below are theirs, the same as in every report»_. Lime no longer means "them" anywhere; `--lime-brand` is now "только логотип" (design-system §2). The logo encodes a rule the product dropped.
- At 28 px it reads as an **audio equaliser / podcast icon** (`baseline/landing--desktop--light.png`, top-left).
- The lime is the only brand colour, and it appears in 3 px slivers. Nothing else on any screen shares it, so the brand has no colour.
- The wordmark «TG Analyzer» is in Onest 500 at body size. It is descriptive and generic, and it borrows Telegram's initials.
- The actual promise («Зеркало ваших переписок» in CLAUDE.md) never appears as a visual idea or a line anywhere on the landing.

**Fix.**

- Redraw the mark from the product's real metaphor: **two mirrored waveforms meeting at a line**, which is the poster pulse itself, in ink with no lime. Or commit to lime as the _brand_ colour on public pages (landing CTA field, story footer) so it means something.
- Consider a product name with warmth. At minimum, put «Зеркало ваших переписок» in the hero.

**Commands:** `/impeccable shape` (brand), `/impeccable bolder`.

### [P2] 6. The landing is one screen of category-default composition, and the phone version looks unfinished

**Where.** `pages/index.vue`, `landing/ProductWindow.vue`, `landing/PhoneMockup.vue`. Evidence: `baseline/landing--desktop--light.png`, `landing--phone--light.png`.

**Desktop:**

- The headline «Ваши переписки. В цифрах.» is generic. "In numbers" is exactly the analytics-SaaS frame that makes this feel like a dashboard and not a mirror.
- The composition is a left headline plus a floating product card with `--shadow` on grey.
- The page is a single 900 px screen. There is no second beat showing the waveform, stories or privacy.

**Phone:**

- The `PhoneMockup` is **cut by a fade mid-sentence** («5 078 сообщений, март 2026 – / сент. 2026» dissolving). It looks like a rendering bug, not a design choice.
- The poster in the mockup is shown only as a pink-to-white gradient smear.
- The privacy line wraps to an orphan «одной кнопкой.»

**Fix.**

- Lead with the poster _itself_, full-bleed, in a real person colour, with the waveform animating once (the one authored motion moment). Put the headline over it in display type.
- On phone, show a complete mini poster, not a cropped device.
- Add one scroll beat showing three posters in three colours: "у каждого свой цвет — как в Telegram". That is the strongest pitch the product has.

**Commands:** `/impeccable bolder`, `/impeccable adapt`.

### [P2] 7. Neutral surfaces are sterile, and the cool sidebar clashes with the warm room

**Where:** `layouts/workspace.vue`, `AppSidebar.vue`, `tokens.css`.

- **Temperature clash.** Measured `body` on `/chat/1001` is `rgb(255,244,243)` (warm room), but the sidebar stays `rgb(247,247,249)` (cool grey). On desktop the poster runs edge to edge _next to_ a cold grey column (`report-mila--desktop--light.png`), so the report looks like a coloured iframe inside a settings app.
- **No material.** The control screens (`home`, `new`, `account`, `login`) are `#F2F2F5` + `#FFFFFF` + `#1C1C1E`: no grain, no warmth, no tint. Principle §1 («цвет приносит человек») is coherent, but the neutral it chose is the iOS Settings grey. The visit begins in the most generic material possible, in the evening, about a partner or a mother.
- **Fix.**
  - Tint the sidebar with the room on report pages (it is already per-subtree `data-hue`), or put the report on its own full-window surface.
  - Give the neutral base a faint warm cast and a slightly darker ink, so the calm reads as "paper/evening" and not "System Preferences".

**Commands:** `/impeccable colorize`, `/impeccable quieter` (keep it calm, just not clinical).

### [P2] 8. Home is three identical white-card rows; the most personal screen is the least personal

**Where.** `pages/dashboard.vue`, `dashboard/*`. Evidence: `baseline/home--desktop--light--full.png`, `home--phone--light--full.png`.

- **«Главное» cards are plain white**, while design-system §11 says «плитки в цвете людей» (CLAUDE.md now says white tiles with the person's avatar and colour, so the two docs disagree; colour shows only in a 20 px avatar and bars). The «Ваши 30 дней» card has about 100 px of dead space at its bottom.
- **«Отчёты»** is a 4-column grid with one orphan card on row two (Мила). Each card has a grey barcode "pulse" whose meaning is unlabeled and which reads as noise. Catch's 3-tick pulse looks empty.
- **Pinned avatars are large initial circles** — the most stock pattern possible. Real Telegram photos are presumably unavailable in demo, but the initial treatment is the same everywhere: sidebar, rows, pinned, story.
- **Middle-dot meta strings.** «Группа · 420 сообщений» (phone home) and «Обновлён 4 минуты назад · 4 800 сообщений» (/new) break the project's own rule §10.6 («без строк через «·»») and are a frontend-design calibration tell.
- **Fix.** Make each report card a _mini poster_ in the person's colour: name in display weight and the waveform in white. Home then becomes a wall of people, the "что я уже узнал" gallery, and not a file browser.

**Commands:** `/impeccable layout`, `/impeccable colorize`.

### [P2] 9. Typography: Onest is a reasonable face, used timidly below the poster

- **Onest Variable fits the product.** It is Cyrillic-first, its humanist-geometric shapes are friendly, and its numerals are good. Cyrillic quality is good (к, ж, д and ф render cleanly at 100 px).
- **I would keep it, but it carries no voice outside the poster.** Every role between 12 and 22 px uses the same neutral cut. Measured nodes on the report: 88 at 14 px, 34 at 12 px, 33 at 15 px. A third of all text is 12–15 px grey.
- **The weight story is muddled.** Docs now agree on 400/500/600 and the app uses 600 for headings and figures. But stories use **400 for the huge numbers and words** («4 800», «По очереди», «Поровну»), while the report uses 600 for the same role. The same fact in the same face looks like two brands.
- **Display tracking −0.045em at 100 px** is at the craft-floor limit (−0.04em). It is tight but fine for the name. On «Weekend plans» and «Продуктовая команда» (`crops/hues.png`, group desktop) the long name at 104 px dominates and starts to look like a heading on a SaaS marketing page.
- **Fix.**
  - Pick one figure weight for numbers across the report and stories (600 or a deliberate 300 "light display").
  - Raise the card question to `--text-body` in `--text` colour, so the questions read as warm human questions, not grey labels.
  - Scale the poster name by length.

**Commands:** `/impeccable typeset`.

### [P3] 10. Craft details

- **ShareDialog bottom padding.** On desktop the privacy line «…их нет и у нас.» touches the dialog's bottom edge (`agent-b/shots/share-desktop-light.png`). On the phone sheet the lock line is clipped by the sheet edge (`share-phone-light.png`).
- **Poster legend.** «● Вы ● Мила» uses two white dots of nearly the same tint, so the legend cannot be decoded. Above/below the line is the code, so say that, or drop the legend.
- **Emoji rows.** «Любимые эмодзи» glues the emoji to the count with no gap («☀️73»), see `crops/report-mila--phone--light--full-4.png`. «Ваш словарь» shows a heading, a hairline, then an empty band before «Общие»: a slot for missing "only you / only Мила" rows.
- **Records grid on phone.** The third record orphans under a two-column split with a vertical rule, so the layout looks broken (`…-2.png`).
- **Header at 360 px (group).** The chrome takes about 200 px (about 26 % of a 780 px viewport). The name truncates to «Продукто…» because «Поделиться» keeps its label (`agent-b/shots/group-360.png`). Make Share icon-only below 400 px.
- **Sparse pulses.** On short chats (Катя, 130 messages; Weekend plans) the poster pulse is a sparse barcode of 15 ticks on a long line, and it reads as broken data (`crops/hues.png`). Use a coarser bucket or a different mark when there are fewer than about 30 buckets.
- **Login.** The 3-step progress bar plus a centred white card on grey is the generic auth template. This is where trust is decided, and the only brand trace is the 28 px logo.

---

## Nielsen heuristic scores (critique.md scale 0–4)

| #         | Heuristic                       | Score     | Key issue                                                                                                                 |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of system status     | 3         | Glass header shows location. Story export has a 20–70 s wait with only a button spinner.                                  |
| 2         | Match system / real world       | 3         | Plain Russian. «Продолжение общения», «быстрый подхват» and «Ядро» in groups are analyst jargon.                          |
| 3         | User control and freedom        | 3         | Back, Esc and close everywhere. Stories close on an outside click (desktop), which is easy to trigger by accident.        |
| 4         | Consistency and standards       | 2         | Private vs group chart vocabularies. «Вы» teal in groups. Avatar treatment and figure weight change by theme and surface. |
| 5         | Error prevention                | 3         | Destructive actions isolated in the account.                                                                              |
| 6         | Recognition over recall         | 3         | Labelled nav. The home pulse barcode and poster legend are unexplained.                                                   |
| 7         | Flexibility and efficiency      | 3         | Right-click/long-press row menus, segmented nav, keyboard focus.                                                          |
| 8         | Aesthetic and minimalist design | 2         | Clean, but no hierarchy of moments: 13 identical bars and four «Поровну» tiles.                                           |
| 9         | Error recovery                  | 3         | 404 is clear and on-brand.                                                                                                |
| 10        | Help and documentation          | 3         | FAQ table is excellent. No contextual help on group metrics.                                                              |
| **Total** |                                 | **28/40** | **Good (70 %).** Solid foundation; the weak areas are aesthetic hierarchy and consistency.                                |

**Cognitive load checklist:** 2 failures (moderate): visual hierarchy (body), and minimal choices (the group "Номинации" grid shows 6 equal cells, each with 3 lines).

**Emotional journey:** the peak is the poster (high). After that comes a long plateau of identical cards (valley) and an abrupt end (no end beat). Stories should be the second peak, but the cover is the flattest slide.

**Persona red flags:**

- **Casey (iPhone, evening, one hand):**
  - The primary share action sits top-right, out of thumb reach.
  - The 200 px sticky chrome at 360 px.
  - The story save is slow.
- **Jordan (first-timer from the landing):**
  - The phone hero mockup looks broken (cut mid-sentence), and it is the first product image Jordan sees.
  - "В цифрах" sets an analytics expectation, not a personal one.
- **Project persona "Аня, 27, after a fight with her partner":** she opens the report wanting _one_ truth. She gets seven «поровну» answers in the same layout and no headline insight. The single asymmetric finding («Точку чаще ставит Мила») is the last card of the part.

---

## What to reconsider in Portrait (independent view)

| System decision            | Keep / change                                       | Why                                                                                                                                                          |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Onest                      | **Keep**                                            | It fits and has good Cyrillic. Fix the weight story and give mid-scale roles more presence.                                                                  |
| 7 Telegram colour families | **Keep the concept, change the execution**          | Brighten to Telegram's real gradients. Fix «Вы» in groups. Accept collisions, but never let colour be the only identifier in lists.                          |
| "Room" tinted background   | **Change**                                          | Too faint to read (rooms ≈ identical across red, pink and orange), and it clashes with the cool sidebar. Commit (visible tint, sidebar included) or drop it. |
| Neutral control surfaces   | **Change**                                          | Calm is right; iOS-Settings grey is not. Warm the base slightly.                                                                                             |
| Poster → report transition | **Keep and extend**                                 | Carry the poster into home cards, the story cover, the landing hero and the report ending.                                                                   |
| Card rhythm / masonry      | **Change**                                          | Two-column masonry of same-anatomy cards produces the "dashboard" read. Introduce full-width hero tiles per part and collapse the even cards.                |
| Header/nav                 | **Keep on desktop; tighten on phone**               | Glass collapse is excellent. Icon-only Share under 400 px.                                                                                                   |
| Mobile                     | **Designed for the poster, compressed in the body** | Phone cards are desktop cards in one column. The milestone tile and heatmap are the only parts that feel composed for the phone.                             |

---

## The strongest visual idea, and how far it could go

**The conversation as a mirrored waveform on the other person's colour.** It already appears in four places: the poster, the 404, the logo's intent, and the story pulse. It is one metaphor that could become the whole identity:

- **Logo:** two waveform halves meeting at a line, which a person could recognise in a Telegram story.
- **Landing:** a full-bleed poster whose waveform draws itself once. That is the single authored motion moment.
- **Home:** every report as a small poster tile with its own pulse, making a gallery of people.
- **Report:** chapters marked _on the waveform_ (it already has `computeChapters`). Tapping a chapter scrolls to it, so the poster becomes the navigation.
- **Stories:** each slide is a crop or zoom of the same waveform (the cover shows all of it; «Ваше время» shows one day; «Слово» marks where «good» peaked), always on the person's colour.
- **Group:** one waveform per member stacked like a choir score. That would be far more distinctive than the ECharts line.
- **End of report:** the waveform again with «Продолжение следует» and the story CTA.

Pushed this far, the product stops being "TG Analyzer with a coloured header" and becomes a recognisable object: _a portrait of a conversation_.

---

## Top 10 issues (ranked)

1. **[P1]** «Итоги» drop the poster idea. The cover is charcoal, the name is never large, the backgrounds change at random, and the slides are white stat cards with «Поровну» ×4 (`ReportStory.vue`, `StorySlide.vue`).
2. **[P1]** The report body is one card anatomy repeated with 13 `ReportLine` bars and no hero moments or ending (`ReportSection.vue`, `PrivateReport.vue`).
3. **[P1]** The group report uses default ECharts and an admin KPI vocabulary, inconsistent with private reports (`GroupReport.vue`, `charts/*`).
4. **[P1]** Person colour is diluted: muted posters, indistinguishable rooms, list collisions, «Вы» teal in groups, and a different avatar look in dark mode (`tokens.css` 68–137, `lib/hue.ts`).
5. **[P2]** The brand mark encodes a dropped rule (lime = them) and reads as an equaliser. There is no name or voice, and the product promise is invisible (`BrandMark.vue`).
6. **[P2]** The landing uses the category-default headline and composition. On phone the hero mockup is cut mid-text (`index.vue`, `PhoneMockup.vue`).
7. **[P2]** Neutral surfaces are iOS-Settings sterile, and the cool sidebar sits next to the warm room on the report (`workspace.vue`, `AppSidebar.vue`).
8. **[P2]** Home is white cards and initials. The «Главное» tiles are not in person colour (design-system §11 and CLAUDE.md disagree), there is an orphan grid card, and the barcode pulses are unexplained (`dashboard/*`).
9. **[P2]** Typography is timid below the poster (a third of the text is 12–15 px grey), and figure weights differ between report (600) and stories (400).
10. **[P3]** Craft details:
    - ShareDialog has no bottom padding;
    - the poster legend dots cannot be told apart;
    - emoji collide with their counts;
    - the «Словарь» has an empty slot;
    - the phone records grid has an orphan;
    - the header is crowded at 360 px;
    - sparse pulses on short chats;
    - «·» meta strings that break §10.6.

## Scores (1–10)

| Dimension                         | Score | Justification                                                                                                                                       |
| --------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand identity / point of view    | 5     | One authored idea (poster + waveform). The logo is meaningless now, the name is generic, and there is no voice outside the report header.           |
| Typography                        | 6     | Good face and number setting. The scale is correct but timid, and weights are inconsistent across report and stories.                               |
| Composition and proportion        | 5     | The poster is well proportioned. The body is two-column masonry of equal cards, the landing is one screen, and the stories leave about 30 % empty.  |
| Negative space and rhythm         | 5     | Consistent spacing tokens, but the rhythm is metronomic. No crescendo, no ending, dead space inside cards.                                          |
| Colour system and materials       | 5     | A strong concept executed too muted. Rooms are imperceptible, neutrals are sterile, there are collisions, and the dark avatars change identity.     |
| Surface hierarchy                 | 6     | HIG-correct (flat content, raised overlays, glass toolbar), but every content surface is the same white card.                                       |
| Iconography and illustration      | 5     | Lucide is consistent. The landing mockups are generic and the phone one looks broken. Initial avatars everywhere.                                   |
| Component consistency             | 5     | The private report is consistent internally. The group report, stories and home each have their own dialect.                                        |
| Emotional impact and memorability | 4     | The poster delivers a moment for about one screen. The rest feels like an analytics SaaS, and the shareable artefact is the least personal surface. |
| Craft / polish floor              | 7     | Detector clean, no horizontal overflow at 360 px (scrollWidth 360), good focus and motion discipline. A handful of clipped and orphaned details.    |

**Questions to consider (for the owner):**

- What if the poster were the product, not the header?
- Is "В цифрах" the promise, or is "зеркало" the promise?
- If a user posts one image of Мила to Instagram, should anyone be able to tell it is _Мила's_ colour without reading?

Questions skipped: I am a sub-agent, and the caller merges the findings and asks the owner.
