# Round 2, auditor X: coherence and finished-ness

Lens: one principal product designer asking one question: **does TG Analyzer now look and behave like one finished product, or like parts assembled side by side?**
Method: I signed in myself with `9008880047` in fake mode and analysed Мила, Катя and «Продуктовая команда». I walked every surface on phone 390×844 first, then desktop 1440×900 and tablet 820, in light and dark (the public pages in both themes). I compared with `scratchpad/baseline/` and `scratchpad/after/`. I read the SKILL.md of frontend-design, Impeccable (plus `reference/critique.md`) and apple-design. The Impeccable detector run was denied by the session's permission classifier, so there is no deterministic scan here. This is a single-context design review.
The owner decided that phone sheets go edge to edge and that Share has no privacy line. I did not flag either.

`E/` = `/tmp/claude-0/-home-user-tg-analyzer/fe6473f5-831b-515b-b764-94de7e4eb77b/scratchpad/audit2-x/` (shots in `E/shots/`, composites in `E/tiles/`).

---

## Verdict in one paragraph

The **private report** is now one coherent object. The poster opens it, the poster closes it (`ReportEnding`), the header turns from poster colour into glass, and the «Итоги» cover is the same poster again. That spine is real and good. The coherence stops at the report's edges, though. The **group report** (ECharts axes, pink accent numbers, tiles inside tiles) looks like another product. So do the **quiz** (charcoal hero card on grey), the **public report** (wrong person colour, two «Войти» buttons, a back arrow into nothing), the **404** (charcoal tile) and the **stories' charcoal tiles**. The **front door** says «Зеркало / В цифрах.» while the OG image says «Зеркало ваших переписок». The share sheet has two functional regressions: on first open its «По ссылке» section is missing, and the link step runs off screen. Verdict: **a strong core with an unfinished perimeter**, not yet one product.

---

## 1. The 15 round-1 problems (brief check)

| #                         | Status                             | Evidence / note                                                                                                                                                                                                                                                                                                              |
| ------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Quiz bar order          | **Solved**                         | `E/shots/pubquiz-step0.png`: «Вы» card left, 26 % left; Demo right, 74 % right.                                                                                                                                                                                                                                              |
| 2 Public «Вы» perspective | **Partly**                         | Banner «Это отчёт Demo. «Вы» в нём — Demo» exists (`E/shots/pubrep-light.png`), but the recipient still reads «Вы пишете заметно больше», and when the name is hidden the poster shouts «Собеседник» at display size.                                                                                                        |
| 3 Stories hold/swipe      | **Partly verified**                | Tap-to-advance works (`E/tiles/st1.png`). I did not frame-measure hold or swipe.                                                                                                                                                                                                                                             |
| 4 One sheet mechanic      | **Solved visually**                | Share and the row menu both have a handle and the same anatomy (`E/tiles/f4.png`).                                                                                                                                                                                                                                           |
| 5 Chat row press          | **Solved**                         | Long press shows the hold state and opens the sheet without navigating (`E/shots/flow-light-longpress-*.png`). Leftover: after the sheet closes, a desktop-style «Ещё» tooltip stays stuck on the ⋯ button on touch (`E/tiles/f4.png`, 5th frame).                                                                           |
| 6 Report ending           | **Mostly solved**                  | The ending poster is there (`E/tiles/mila-phone-light-1.png`). The claimed «Итоги» button on the **top** poster does not exist: `components/report/ReportPoster.vue` has no action. On phone, a few pixels of page background show under the ending poster (bottom of both full-page shots).                                 |
| 7 Story cover             | **Solved, new bug**                | The cover is now the poster, but long names break mid-word: «Продуктов / ая команда» (`E/shots/st-light--1002001-0.png`), caused by `overflow-wrap: anywhere` on `.story-slide__display`.                                                                                                                                    |
| 8 Header material         | **Solved (visual)**                | Poster colour, then a hand-off to glass (`E/shots/flow-light-hdr-mid.png`, `-hdr-glass.png`). Not frame-timed.                                                                                                                                                                                                               |
| 9 CLS                     | Not re-measured                    | —                                                                                                                                                                                                                                                                                                                            |
| 10 Contrast               | Not re-measured                    | Heat cells are neutral grey on a pink «room», which looks washed out on phone (`E/tiles/mila-phone-light-1.png`).                                                                                                                                                                                                            |
| 11 Back = pop             | Not tested                         | —                                                                                                                                                                                                                                                                                                                            |
| 12 Bundle / lazy          | **Made worse in behaviour**        | `LazyShareDialog` mounts with `open=true` already set, so `watch(() => props.open)` in `ShareDialog.vue:34` never fires on first open. Links don't load, `canShare` is never set and the «По ссылке» section is missing until the second open (`E/shots/lk-sheet-first.png` vs the second-open text in the run log). **P0.** |
| 13 Clipping               | **Solved**, new clipping elsewhere | «Номинации» is a single column now. But the **link step overflows**: `.share-step` is 502 px wide at 360 and 390, so the three privacy switches sit off screen and «Отключить ссылку» is cut (`E/shots/lk2-1006-link.png`, `E/shots/link-step-360.png`). **P0.**                                                             |
| 14 Nav jitter             | Not measured                       | —                                                                                                                                                                                                                                                                                                                            |
| 15 Error / no-report      | **Partly**                         | Cold load of `/chat/1002` (Мама, no report) shows «Новый анализ», not «Разобрать чат», because `workspace.chats` is empty on a direct load. The header is painted Мама's orange with no name and no poster under it (`E/shots/noreport-phone-light.png`, dark: `-dark.png`).                                                 |

---

## 2. Coherence checklist

### 2.1 One visual language

**The person colour is not one colour per person.**

- Катя is **blue** in the app (`E/tiles/pub2.png` panels 2–4) and **green** on her public report (`E/shots/pubrep-light.png`). `pages/s/[token].vue:23` seeds `hueOf()` from the public summary's chatId, not the owner's. In the quiz, the **owner** Demo gets the blue avatar (`E/shots/pubquiz-step0.png`), which is Катя's colour in the app. «Colour means a person» is broken on exactly the surface the _other_ person sees. **P1.**
- In dark mode the same person is a pastel salmon avatar and a deep-maroon poster (`E/tiles/hna-dark.png` vs `E/shots/mila-phone-dark.png`, desktop `E/tiles/deskdark.png`). Within one theme, those read as two colours. **P2.**

**Group report = a second product** (`E/tiles/group-phone-light-*.png`, `E/tiles/group-desk-*.png`).

- ECharts language: y-axes with 0–800 ticks, gridlines, an area-fill line chart, and a centred bottom legend «● Вы ● Остальные». The private report has axis-less bars and a top-left dot legend. **P1.**
- Values are painted in the **group's** pink («24 вечера», «41 мин», «15% разговоров») right next to people who have their own avatar colours (Мария is violet, Алексей is violet, Сергей is orange). Colour means a group here, a person elsewhere. **P1.**
- Tiles inside tiles, which the system forbids: the boxed «Будит чат» inside «Номинации», eight bordered person cards inside «Фирменные слова участников», and the bordered selected row inside «Кто и как участвует». **P2.**
- «Показатели группы» uses thick full-width black progress bars, a third bar style next to `ReportLine` and `--bar-height` pills. **P2.**
- «Вы» in the member list is a **teal «В»** avatar. In the private report «you» is an **ink «Я»**. **P1** (see 2.2).

**Charcoal / «ink» leftovers from the old language.**

- Story tiles «В день переписки», «Чаще смеётся», «Самый жаркий день», «Ваша доля» and «Звезда реакций» are charcoal cards on the person's poster and room (`E/tiles/st1.png`, `E/tiles/st2.png`). In the report, the emphasis tile is the **poster colour** (`tone="ink"` = poster). The exported artifact and the report disagree on what emphasis looks like. **P1.**
- The quiz intro and result are `tile tile--ink` charcoal cards on a neutral grey page (`E/shots/pubquiz-light.png`). It is the only person-centred surface with no person colour. **P1.**
- The 404 is a charcoal card with a stub pulse (`E/shots/404-phone-light.png`). It's acceptable as a "silence" metaphor but belongs to the old palette. **P3.**
- The code still speaks the old language: `--lime: var(--surface)` aliases (`assets/styles/tokens.css:206-211`), `tile--lime` on onboarding (`pages/dashboard.vue:114`), and comments describing «lime» sides in `ReportLine.vue`, `ReportSideAvatar.vue`, `ReportWordOfChat.vue`, `StorySlide.vue:253,665` and `Avatar.vue:16`. That isn't user-visible, but it is why the next contributor will rebuild a lime tile. **P3.**

**Phone home has no posters.** Desktop and tablet get report mini-posters (`E/shots/home-desktop-light-full.png`, `E/tiles/tab.png`). The phone, the primary device, gets plain rows (`E/tiles/hna-light.png`). The one place the brand repeats across reports is missing where most people look. **P2.**

**Section-heading styles: three for one job.** Home has «Главное» / «Отчёты» in bold `.t-h3`. Account has «Оформление» / «Данные» as small grey iOS-group captions (`E/tiles/hna-light.png` panel 3). The report has quiet-grey questions. **P2.**

**Header patterns.** /new is title, subtitle and avatar on the right. Account is back, avatar on the **left**, then the title (`E/tiles/hna-light.png`). The report is back and Share, with the name hidden over the poster. The public report shows the logo, a back arrow, a white «Войти» and an outlined «Войти» (`E/shots/pubrep-light.png`). **P1** for the public page, **P2** for account.

### 2.2 One logic

- **One action, five verbs.** «Анализ» (row button), «Разобрать чат» (home tile, example, `report.analyseHere`), «Новый анализ» (header, empty state), «Обновить отчёт» (row menu), «Разобрать свою переписку» (quiz CTA), «Открыть» / «Открыть отчёт» (phone / desktop /new). Round 1 flagged this; it is unchanged. **P1.**
- **You: «Вы» / «Я» / «В» / «Demo».** The legend and copy say «Вы». The side avatar says «Я» (`i18n/ru.ts:490 report.youInitial`). The group list says teal «В». The stories cover says «Demo & Мила» with a «D» (`E/tiles/st1.png`). The quiz says «Я / Вы». One person, four marks. **P1.**
- **Home / Главная / Главное / Сводка.** The sidebar says «Главная», the section says «Главное», CLAUDE.md calls the page «Сводка». «Главная» and «Главное» side by side on one desktop screen (`E/shots/home-desktop-light-full.png`) read as a typo. **P2.**
- **One fact, two phrasings across report and stories.** Reply speed is «Отвечаете синхронно» in the report and «Отвечаете одинаково быстро» on the slide. The word card is «Слово вашей переписки» vs «Слово переписки «good»», with quotes on one and not the other. «Ваше время» heads a **group** slide. **P2.**
- **One fact, four date formats for the span.** «с 14 апреля 2026 г.» (poster), «апр. 2026 – нояб. 2026» (home card, story header), «март 2026 – сент. 2026» (landing mockup), «с марта 2026 г.» (OG). **P2.**
- **Primary per screen.** The report header «Поделиться» flips between a white pill over the poster and a black pill over glass. The ending adds a white «Смотреть итоги». The share sheet adds a black «Смотреть итоги». On phone at the end of the report, two primaries are visible at once (`E/tiles/f1.png` panel 3). **P2.**
- **Endings are three different patterns:** the private report ends in a poster, the example and the public report end in a white tile with a black «Разобрать чат» / CTA (`E/tiles/example-phone-light-1.png`), and the group ends in a poster. The example is the product's showroom and should end the way the product does. **P2.**
- **Middle dots** remain where the rules ban them: «Группа · 9 000 сообщений» (home rows), «Вопрос 1 из 3 · Мимо» (quiz). **P3.**
- **Dead ends.** The account row «Отчёты 3» has no chevron and goes nowhere. On the public report, «<» back goes nowhere for a first-time visitor arriving from Telegram. The no-report page sends you to the list instead of analysing this chat. **P2.**

### 2.3 Finished-ness

- **P0:** share sheet «По ссылке» is absent on first open; link step overflows the phone (see table, #12/#13).
- **P1:** landing hero «Зеркало / В цифрах.» (`E/shots/landing-phone-light.png`, desktop `E/shots/landing-desktop-light.png`). It's a fragment with an orphan capital «В». The baseline «Ваши переписки. В цифрах.» was grammatical, the en string «A mirror of your chats.» is correct, and the OG says «Зеркало ваших переписок». The new ru string is a half-applied rename. Compare `E/tiles/base-vs-after.png`.
- **P1:** group story cover «Продуктов|ая команда».
- **P2:** on Мила's report, «Ваш словарь» is a question, an empty line, then «Общие» chips. When neither side has unique words, the rows vanish but the divider stays (`E/tiles/mila-phone-light-1.png`). The card also has no answer phrase, unlike the card anatomy everywhere else.
- **P2:** seven consecutive parity answers («на равных», «синхронно», «в унисон», «на равных», «Идеальный баланс», «поровну», «поровну») make «Вы двое» feel like a template on an even chat (`E/tiles/mila-phone-light-0.png`). Round 1 asked for a synthesis and for folding even cards; that hasn't happened.
- **P2:** strange group copy: «24 вечера», «31 утро», «0,1 ответа на сообщение».
- **P2:** /new rows with a report (Открыть + ⋯) truncate their meta to «Обновлён только …» while their neighbours don't. The button column is misaligned (`E/tiles/hna-light.png` panel 2).
- **P3:** first-run home: «С кого начать» puts grey tiles inside a white tile and truncates «Продукто…» (`E/shots/home-firstrun-phone-full.png`). The header «Выберите первый чат» skips the greeting pattern used on the regular home.
- **P3:** the landing mockup (`components/landing/MiniReport.vue`) shows an old meta format and «50 % / 50 %» under the bar, while the real card shows counts.

### 2.4 The brand

- **Mark** (`public/apple-touch-icon.png`, `public/logo.svg`): seven pill strokes, white above and lime below, on a charcoal square. It now rhymes with the report pulse, which is an improvement. But in the app the lower half of the pulse is **the other person's colour**, and in the mark it is lime, a colour that exists nowhere else. The mark still reads «equaliser on a dark app icon» more than «mirror». **P3.**
- **OG image** (`public/og-image.png`) is the best brand artifact: a poster with the name, the meta, the mirrored pulse and «Зеркало ваших переписок». It is consistent with the report.
- **Landing** contradicts the OG at the headline (see above). Its phone mockup shows a fake «TG Analyzer» header with a share circle, a pattern the real report no longer has (the real one has back, nav and a «Поделиться» pill). **P1** for the headline, **P3** for the mockup chrome.
- **Name vs promise:** the wordmark says «TG Analyzer», a tool name, and the promise says «Зеркало». Nothing in the app uses the word «зеркало» after the landing. A low-cost bridge: use «Зеркало ваших переписок» as the subline in `SiteFooter`, the login card and the onboarding. **P3.**

---

## 3. Light/dark and breakpoints

- Light and dark are well matched on neutral screens (`E/tiles/hna-dark.png`). Problems: pastel avatars vs deep posters in dark (above). The 404 is charcoal in light and grey in dark. The quiz card loses its edge in dark (`E/shots/pubquiz-dark.png`).
- Tablet 820 uses the phone header with desktop posters. Report-card meta is truncated («Группа, апр. 2026 – нояб. 2…», `E/tiles/tab.png`). The group «Номинации» is a two-column grid there, while the report is a single column. It's acceptable but uneven.
- No horizontal page scroll at 360–1440 (`scrollWidth` check in `cap.js` output). The only overflow is inside the share link step, which is clipped by the sheet so page checks miss it.

---

## 4. Before / after scores (1–10)

| Dimension                                | Before | After | Why                                                                       |
| ---------------------------------------- | ------ | ----- | ------------------------------------------------------------------------- |
| Private report as one object             | 6      | **8** | Poster → glass header → ending poster → story cover poster: a real spine. |
| Group report coherence with private      | 4      | **4** | Untouched: ECharts defaults, group-pink accents, nested tiles.            |
| Public surfaces (/s report, quiz)        | 4      | **5** | Quiz order fixed. Wrong hue, duplicated CTA and charcoal quiz remain.     |
| Stories ↔ report                         | 5      | **7** | Cover is the poster now. Charcoal tiles and divergent phrasing remain.    |
| Naming / logic consistency               | 5      | **5** | Verbs and «Вы/Я» are unchanged.                                           |
| Brand (mark, landing, OG)                | 5      | **6** | Mark and OG are a step up. Landing headline regressed.                    |
| Finished-ness (bugs, empties, leftovers) | 6      | **5** | New P0s in the share sheet offset the fixes.                              |
| Phone feel (press, sheets, gestures)     | 5      | **7** | Long press, handles and hold work. Stuck tooltip remains.                 |
| **Overall "one product"**                | 5      | **6** | The core is coherent. The perimeter still looks assembled.                |

---

## 5. Ten changes that most increase coherence and finished-ness (ranked)

Paths are under `/home/user/tg-analyzer/apps/web/app`.

1. **P0. Share sheet loads its links on first open.** In `components/report/ShareDialog.vue:33-42`, add `{ immediate: true }` to the `watch(() => props.open, …)` (or call the body in `onMounted` when `props.open`). This fixes the missing «По ссылке» and `canShare` on the first open of the lazily mounted dialog.
2. **P0. Link step fits the phone.** In `components/report/ShareDialog.vue` `.share-step`, add `grid-template-columns: minmax(0, 1fr); min-width: 0;`. In `components/report/ShareLinkStep.vue`, give the URL field and its row `min-width: 0` and the URL text `overflow: hidden; text-overflow: ellipsis`. Re-check at 360 that the three switches and «Отключить ссылку» are visible.
3. **P1. One landing headline = the brand line.** In `i18n/ru.ts:350-351`, set `'landing.title': 'Зеркало'` and `'landing.titleSoft': 'ваших переписок.'` (matching en and the OG). Then align `components/landing/MiniReport.vue` meta with `report.poster.since` and the counts under the bar.
4. **P1. The same person has the same colour on public pages.** Seed the hue from the owner-side chat id. Add `hue` to the public share DTO server-side, or pass the same seed, and use it in `pages/s/[token].vue:23`. For the quiz, set `data-hue` too and render the intro/result cards in `components/share/PublicQuiz.vue:77,143` as `tile` on `--poster` instead of `tile--ink` charcoal. Give the Demo avatar the ink/«you» treatment from the reader's perspective, not the partner's hue.
5. **P1. Public report header: one CTA, no back.** In `pages/s/[token].vue:61`, render `ReportHeader` without the back arrow and without its own «Войти» (add a `public` prop in `components/report/ReportHeader.vue` that hides both), so only `SiteHeader` carries «Войти». Replace the white end tile (`public__end`) with `ReportEnding` in a CTA variant, and do the same in `pages/example.vue`, so every report ends on the poster.
6. **P1. Stories use the report's emphasis.** In `components/report/StorySlide.vue` (around `:264-275`, `:315-316`), make the accent tile on poster and room fields the **poster colour** with on-poster ink, as `tone="ink"` does in the report, not `--story-ink` charcoal. On `.story-slide__display` (`:499`), replace `overflow-wrap: anywhere` with `overflow-wrap: normal; hyphens: auto;` and step the display size down for names over about 12 characters, so «Продуктовая команда» wraps between words.
7. **P1. One mark for «you».** In `i18n/ru.ts:490` (`report.youInitial`) and `components/ui/Avatar.vue:46`, render «you» the same everywhere, either as the ink circle with the user's own initial (as in the header avatar) or with «Вы». Then use it in `components/report/group/GroupMembersTab.vue` (no teal «В») and in the story header (`StorySlide.vue`: «Вы и Мила», not «Demo & Мила»).
8. **P1. One verb per action.** In `i18n/ru.ts`, set `dashboard.analyse` → «Разобрать», keep «Разобрать чат» (`month.analyse`, `report.analyseHere`, `example.cta`), set `dashboard.reanalyse` → «Разобрать заново», and set `dashboard.openShort` and `dashboard.openReport` to the same «Открыть отчёт» (or «Открыть» on both). Rename `sidebar` «Главная» or the section «Главное» → «Сейчас», so the two never sit side by side. Update the e2e selectors that use «Анализ».
9. **P1. The group report speaks the private report's chart and colour language.** In `components/report/charts/ChartFrame.vue`, `DailyVolumeChart.vue`, `WeekdayChart.vue` and `HourlyChart.vue`, hide the y-axis labels and split lines, move the legend to the top-left dot style of `ReportPulse`, and use `--chart-neutral(-strong)` and `--you`. In `components/report/group/GroupAwards.vue:145`, change `color: var(--them-ink)` to `var(--text)`, with the person's avatar carrying the colour. Flatten the nested bordered boxes in `GroupAwards.vue` («Будит чат»), `GroupContentTab.vue` («Фирменные слова» person cards → `.report-rows` with `--divider-*`) and the selected row in `GroupMembersTab.vue`.
10. **P2. No dead or half states.** In `pages/chat/[id].vue:55-56`, when `workspace.chats` is empty, load chats before choosing between «Разобрать чат» and «Новый анализ», and don't colour the header without a `[data-poster]` (`composables/usePosterHeader.ts`). In `components/report/ReportVocabulary.vue`, drop the divider and add an answer phrase when only «Общие» exists. In `components/dashboard/ReportCard.vue:92`, remove the `min-width: 641px` gate so phone home also shows mini-posters. In `components/report/ReportEnding.vue`, fix the page-background sliver below the ending on phone (the negative `margin-bottom` misses part of `--page-bottom`/safe area).

Also worth a quick pass, outside the top 10: retire the `--lime*` aliases and «lime» comments (`assets/styles/tokens.css:206-213`, `pages/dashboard.vue:114`); remove the stuck «Ещё» tooltip on touch (`components/dashboard/ChatRow.vue`, only show on `(hover: hover)`); unify the span date format through one helper used by `ReportPoster`, `ReportCard`, `StorySlide`, `MiniReport` and the OG generator; replace the «·» joins in the home rows and the quiz progress.
