⚠️ DEGRADED: single-context (no sub-agent tool in this run; Assessment A was written before the detector ran, so the detector could not anchor it)

# Agent C: UX and product design audit of TG Analyzer («Portrait» @ de5319d)

Method: the Impeccable `critique` workflow with Nielsen scoring, cognitive load, emotional journey and personas, plus the `clarify`, `onboard`, `distill` and `harden` lenses, and the writing section of frontend-design. I read every one of those SKILL.md and reference files in this run. I walked the journey live in Playwright (Chromium only; no WebKit or Safari, so iOS-specific behaviour such as OTP autofill, the share sheet and safe areas is untested). Phone 390×844 first (spot checks at 360), then desktop 1440×900. I used two fresh accounts: `9007770003` (no 2FA) and `9007770039` (2FA). Destructive actions ran only in the fresh account. All screenshots are in `scratchpad/agent-c/shots/`; the scripts that made them are `scratchpad/agent-c/j*.js`.

Caveat: the dev server was under heavy load (load average about 24). A cold load showed the splash screen for 3.7–6 s, and some loads took more than 8 s. I do not count this as a product finding because it is dev mode on a shared box. A real user would still see the same full-screen splash with no content on a slow network (see H-3).

Deterministic scan: `impeccable detect --json` on `/`, `/login` and `/faq` returned `[]` (clean). It reads only server-rendered markup, so it says nothing about the signed-in app. Every finding below comes from the live walkthrough and the source code.

---

## 1. Measured journey (phone, first-time user)

| Step         | What happened                                                                                                                                                                                                                                                                                                                                            | Evidence                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Landing      | Exactly one screen (`scrollHeight` 844 = viewport). Headline, one-line pitch, «Войти через Telegram», «Пример отчёта», one privacy line, and a phone mockup that is cut off by a fade. Nothing below it.                                                                                                                                                 | `j1-01-landing.png`                                 |
| Phone step   | The «Получить код» button stays disabled until the number is valid; there is no message that says why. A three-segment progress bar shows.                                                                                                                                                                                                               | `j1-03-login-phone.png`                             |
| Code step    | No auto-submit after 5 digits; the user has to tap «Подтвердить код». The resend countdown (1:00) and «Изменить номер» are good.                                                                                                                                                                                                                         | `j1-05-login-code.png`                              |
| Wrong code   | The error appears at the bottom of the card, under a 5-line privacy note, about 300 px below the OTP cells. The cells do not turn red and the wrong digits stay in them.                                                                                                                                                                                 | `j1-06-login-wrong-code.png`                        |
| 2FA step     | «Облачный пароль / Пароль 2FA». There is no back or «Изменить номер» link and no «забыли пароль?» help. The error «Неверный пароль.» gives no next step.                                                                                                                                                                                                 | `j4-password-wrong.png`                             |
| First home   | A 3-step explainer card fills the first viewport. «С кого начать» has pinned chats, each with «Анализ», and the full chat list follows. Mila and Mama appear twice (in pinned and in the list).                                                                                                                                                          | `j1-07-first-home.png`, `j1-08-first-home-full.png` |
| Analysis     | The demo finished in about 2 s and then opened the report on its own. I mocked a slow run, and the progress UI is excellent: «Читаем «Мила» · Дошли до 4 марта 2025 г. · Прочитано 1 900 из 4 800, ещё около 2 минут · Можно закрыть вкладку». The same progress shows on home, `/new` (row with % and «Отменить»), the header chip and the report page. | `j3-progress_new.png`, `j3-progress_dashboard.png`  |
| Report opens | A toast («Отчёт готов») sits over the part navigation on the coloured poster for several seconds.                                                                                                                                                                                                                                                        | `j2-03-after.png`                                   |

- **Taps to first insight:** 4 taps (CTA → Получить код → Подтвердить код → Анализ) plus typing the phone number and the code. That is good. It drops to 3 if the OTP auto-submits.
- **Time to first report:** about 12 s of interaction plus analysis time. The demo takes about 2 s; the real ETA is shown as minutes.
- **Scroll to answers on phone (CSS px, report «Мила», 5525 px ≈ 6.5 screens):** «Кто пишет больше» starts at ≈470, just inside the first screen. «Время» starts at 2834 px (3.4 screens) and «О чём» at 4575 px (5.4 screens). The group report is 7254 px (8.6 screens): «Общение» starts at 3154 and «Время» at 5634, and «Фирменные слова участников» alone is 1312 px tall.

## 2. Design specificity verdict

Portrait is clearly authored for this product, more than most. The person's Telegram colour floods the poster and the room, the name is set at display size, and the mirrored «pulse» shows you above and them below. It feels like a portrait of a relationship, not a SaaS dashboard. The analysis-progress banner («Дошли до 4 марта 2025») is product-specific and lovely.

The weakness sits below the poster. The body is the generic «stack of identical white cards, each one a question plus a bar». Each card is fine on its own. Together, nothing in the body has the poster's confidence, and on a balanced chat nearly every card says the same thing (see P1-1).

## 3. Nielsen heuristics

| #         | Heuristic                       | Score     | Key issue                                                                                                                                                                                                                               |
| --------- | ------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of system status     | 3         | Analysis progress is best-in-class. But the cold splash shows no content, the report toast covers the navigation, and the wrong-code error appears far from the field.                                                                  |
| 2         | Match system / real world       | 2         | The group report speaks analyst («Продолжение общения — доля серий сообщений одного автора…», «быстрый подхват», «0,1 ответа на сообщение», «Ядро»). The public link calls the recipient «Собеседник» and addresses the sender as «Вы». |
| 3         | User control and freedom        | 2         | No way back from the 2FA step. A report you cannot load is a dead end («Выберите этот чат в «Новом анализе»» instead of «Разобрать»). Refresh is hidden in a row menu on another screen.                                                |
| 4         | Consistency and standards       | 2         | Five verbs for one action. «Главная», «Главное» and «Сводка». «Итоги» lives behind «Поделиться». Bar order is reversed against the cards in the quiz. «Я» vs «Вы». The public page header shows two «Войти» buttons.                    |
| 5         | Error prevention                | 3         | Deletes are confirmed with consequences spelled out («Сотрём всё… сообщения в Telegram останутся»). The quiz's «Показать счёт» toggle is on by default.                                                                                 |
| 6         | Recognition rather than recall  | 2         | The way to view your own «Итоги» is only inside «Поделиться». On a phone `/new` row the analysed status is cut off («Обновлён 6 мин. …») and the message count is missing, although desktop shows it.                                   |
| 7         | Flexibility and efficiency      | 2         | No OTP auto-submit. Unanalysed rows are not tappable (only the small «Анализ» button). No reanalyse on the report itself.                                                                                                               |
| 8         | Aesthetic and minimalist design | 3         | The poster and hierarchy are strong. The body repeats «поровну» and is long. The group report piles nested cards and an 8-person word list.                                                                                             |
| 9         | Error recovery                  | 2         | «Что-то пошло не так. Попробуйте ещё раз.» everywhere. One failed `/reports` call blanks the whole home, including «Новый анализ». «Неверный пароль.» gives no hint.                                                                    |
| 10        | Help and documentation          | 3         | The FAQ «Приватность и вопросы» (Читаем / Храним / Не храним / Не делаем) is clear and honest, but the landing barely links to it. The report has almost no contextual «why».                                                           |
| **Total** |                                 | **24/40** | **Acceptable**: the craft is strong, but the IA and copy work is unfinished.                                                                                                                                                            |

Cognitive load: 3 of 8 checklist items fail, which is moderate. The failures are minimal choices (the first home shows explainer + pinned + search + filter + 12 rows at once), visual hierarchy in the body (every card has the same weight), and progressive disclosure (the group report shows everything expanded).

Emotional journey: the peak is the poster with the name and pulse, then «Итоги». The valley is right after it, where a run of 50/50 cards («на равных», «синхронно», «в унисон», «идеальный баланс», «поровну», «поровну») makes the report feel like a vending machine. The end of the report is a bare emoji table with no closing thought, no «what next», and no prompt to share or to look at another chat. The peak-end rule is not used.

---

## 4. Priority issues

### P1-1. The report answers «who does X more», not the questions people actually bring

- **Where:** `components/report/PrivateReport.vue`, `ReportDuel` (`duel/*`); evidence `b-mila-0..3.png`.
- **What:** «Вы двое» is 9 near-identical duels. On the flagship demo chat (Мила, 51/49) the answers read «Пишете на равных», «Отвечаете синхронно», «по очереди», «поровну», «Спрашиваете в унисон», «Стикерами — на равных», «Идеальный баланс», «Говорите поровну», «Заботитесь поровну». People open this app in the evening asking things like: «Is this fading? Who's more invested now than before? When are we closest? Did something change in the spring?» The data for that exists (pulse, chapters, the «С прошлого анализа» strip), but it is only drawn in the poster. There is no card that answers «how has it changed» in words. The CLAUDE.md product brief promises «динамика».
- **Why it matters:** this is the core value. A report full of «even» answers feels like there is nothing to discover, and that kills both sharing and coming back.
- **Fix:** open with a 2–3 line written synthesis under the poster, built from the most deviant metrics: «Вы пишете первыми в 3 из 4 разговоров; с сентября Мила отвечает в 2 раза быстрее; ваше время — 21–00». Rank the duel cards by how far they deviate. Fold all the «even» results into one «В остальном — на равных» row. Add a «Как менялось» card (by chapter: volume, reply speed, who starts).
- **Commands:** `/impeccable distill`, `/impeccable clarify`.

### P1-2. Shared artefacts address the wrong person and contradict themselves

- **Public report `/s/:token`** (`pages/s/[token].vue`, `j7-pub-report.png`). The link is meant for the other person, but it opens with the giant poster title «Собеседник» (name hidden by default) and then says «Вы пишете заметно больше», «Вопросы задаёте только вы». Here «Вы» is the sender, while the reader is Катя. Only a small line («Открыт по ссылке от Demo») hints at this.
- **Public quiz** (`components/share/PublicQuiz.vue`, `j7-quiz-2.png`). Here «Вы» means the reader, so the two shared artefacts use opposite meanings of «Вы».
- **Quiz reveal bar.** The reveal says «Demo — 74% против 26%» with the Demo card on the left, but the bar under it puts **26%** on the left and 74% on the right. The bar keeps the «you are left» rule while the cards put the sender left, so the numbers sit under the wrong person on all 3 questions (`j8-q*.png`). This is the viral surface, and it shows a visible contradiction.
- **Public page header (phone).** Logo, a back chevron that goes nowhere useful, and **two «Войти» buttons** side by side (`j7-pub-report.png`).
- **Fix:** write the public report in the third person with both names («Demo пишет заметно больше»), or let the recipient pick «Я — Катя» so «Вы» means them. Make the quiz bar order follow the card order. Header: logo plus one «Сделать свой отчёт».
- **Commands:** `/impeccable clarify`, `/impeccable harden`.

### P1-3. «Итоги» is hidden behind «Поделиться», and the terminology wobbles

- **«Итоги» entry point.** The Wrapped stories, the most delightful and most sharable artefact, can only be reached through «Поделиться» → «Смотреть итоги» (`j5-share-dialog.png`; that dialog is titled «Итоги: Катя»). Someone who wants to _watch_ their recap does not think «share». There is also no «Итоги» entry in the report nav, on the home cards, or at the end of the report.
- **One action, five names:** «Анализ» (row), «Разобрать чат» (home tile and example CTA), «Новый анализ» (header/sidebar, and also the label of the not-found CTA), «Обновить отчёт» (menu), and «Открыть» / «Открыть отчёт» (phone and desktop label the same button differently).
- **One screen, three names:** «Главная» (nav and title), «Главное» (a section on that same page), and «Сводка» (the docs' name).
- **Fix:** add a «Итоги ▶» button next to «Поделиться» in the report header (or a poster tap target) and a closing card at the end of the report. Pick one verb, «Разобрать», with «Разобрать заново» for refresh. Rename the «Главное» section (e.g. «Новое»).
- **Commands:** `/impeccable clarify`, `/impeccable distill`.

### P1-4. The group report is long, heavy on jargon, and has a clipped layout

- **Clipping.** «Номинации» is a two-column grid that is cut off at the right edge on 390 and 360 px: «0,1 ответа на сообщен…», «Дальше: Наташа, Серге…»; the elements end at x=396 and x=381 (`j10-group-nominations.png`). The page itself does not scroll sideways, so the text is simply hidden.
- **Jargon.** «Показатели группы»: «Равномерность участия 98%», «Продолжение общения 85% — Доля серий сообщений одного автора, после которых другой участник написал в течение 30 минут…», «Пик одновременной активности 8». «Самые плотные пары»: «201 быстрый подхват». All 8 members carry the role «Ядро» at 12–13%, which is information with no signal.
- **Length.** 8.6 phone screens. «Фирменные слова участников» uses nested bordered cards inside a card (8 of them, 1312 px).
- **Order.** Parts run «Люди / Общение / Время», while the private report runs «Вы двое / Время / О чём». The same concept sits in a different position.
- **Fix:** one column of nominations on phone; plain-language labels («Отвечают друг другу в течение получаса — 85%»). Hide roles when everyone has the same role. Collapse the per-person words into a horizontal chooser. Align part order across report types.
- **Commands:** `/impeccable adapt`, `/impeccable clarify`, `/impeccable distill`.

### P1-5. The trust story ends at one line

- **Where:** landing `pages/index.vue` (`j1-01-landing.png`, the desktop baseline `landing--desktop--light.png`).
- **What:** the product asks a stranger for a **Telegram login** (a full account session, and a «новый вход» alert from Telegram). The landing is a single viewport with «Тексты сообщений не храним. Удалить всё — одной кнопкой.» and a small footer «Приватность» link. The FAQ that actually earns trust (Читаем / Храним / Не храним / Не делаем, `faq--phone--light.png`) is one hidden click away. The best reassurance in the product, «Telegram предупредит о «новом входе» — так бывает всегда… Сеанс можно завершить…», appears only _after_ the phone number is entered.
- **Why it matters:** this is the highest-stakes moment and the most likely drop-off.
- **Fix:** below the hero, add the four FAQ lines verbatim, the «новый вход» heads-up, and a real preview of the report (not a cropped mockup). Show the heads-up on the phone step, not after it.
- **Command:** `/impeccable onboard`.

---

## 5. Further findings (P2/P3)

**Onboarding and login**

- **P2 First home.** The 3-step explainer («Выберите чат / Мы посчитаем / Читайте отчёт») uses the first viewport to describe what the list below already makes obvious (`j1-07`). Better: a single sentence plus «С кого начать» at the top, with pinned chats annotated by size («4 800 сообщений · ≈1 мин»).
- **P2 Chat list.** The list gives no size or recency cue for choosing a good first chat. The order is not by recency (2 ч, 19 ч, 3 дня, 12 дней, 3 ч…; `new--phone--light--full.png`). Tapping the body of an unanalysed row does nothing (`j9`: the URL stayed `/new`).
- **P2 Code step.** No auto-submit at 5 digits, even though `autocomplete="one-time-code"` is set. The error is rendered after the privacy note, not under the cells (`components/auth/CodeStep.vue`, `pages/login.vue`).
- **P2 2FA step.** It has no exit back to the code or number step (`components/auth/PasswordStep.vue`, `j4-password-wrong.png`). The login progress bar always shows 3 segments, although most users never see step 3 (`pages/login.vue:147`).

**States and errors**

- **P2 Home error.** One failed `GET /reports` replaces the whole home with «Не удалось загрузить отчёты · Что-то пошло не так», which removes the greeting, «Главное» and even «Новый анализ» (`j3-err_dashboard-reports.png`). A failing component should fail alone.
- **P2 Report not found.** A chat with no report (`/chat/1003`, a real chat) leads to a dead end: «Для этого чата нет отчёта. Выберите этот чат в «Новом анализе»…» with a «Новый анализ» button (`j3-report-not-analysed.png`, `pages/chat/[id].vue`). The page knows the chat, so it should say «Разобрать Артёма». The header is tinted in the person's colour but shows no name.
- **P2 404 and offline pages.** For a signed-in user they show «Войти» in the header (`j3-404`, `j3-offline-page`). They should show «На главную» / the avatar.
- **P2 Toasts.** «Отчёт готов» covers the report navigation on arrival (`j2-03-after.png`). Once the report has auto-opened, it is redundant.

**Copy**

- **P2 Copy built by concatenation.** `useVersus.ts:81` together with `DuelVoice.vue:61` render «**Вы — Только вы**» (capital mid-sentence and a doubled subject; EN: «You — Only you do it») (`j5-report-scrolled.png`). The same `${figure} — ${note}` pattern is used in `DuelSpeed`, `DuelReactions` and `DuelStickers`. Write full sentences per case.
- **P3 Quiz step.** It shows «3» and then «3 вопроса готовы» (`j5-share-quiz-step.png`). One of the two is enough.
- **P3 Share dialog subtitle.** «Слайды о вашей переписке — как сторис» does not explain anything that «Итоги» plus the preview do not already show.

**Navigation and controls**

- **P2 Phone `/new` analysed rows.** The status is cut off to «Обновлён 6 мин. …» and the message count is dropped, while desktop shows «Обновлён 4 минуты назад · 4 800 сообщений» (`new--phone--light--full.png` vs `new--desktop--light.png`).
- **P2 Reanalyse.** It exists only in the `/new` row «⋯» menu. On the report there is no «обновлено N дней назад · Разобрать заново», so the user has to remember the path.
- **P2 Account.** The theme segmented control is cut off at 390 px: «Как в систем|е» (`account--phone--light--full.png`). The time zone is shown but cannot be changed («Берётся из браузера»), which is fine, but then it is not a setting. The quiz ends with «Показать счёт: Demo» switched on, so publishing the answers is the default.
- **P3 «Я» vs «Вы».** The avatars say «Я», while the legends and answers say «Вы» (stickers, reactions, speed). Pick one for the user's side.
- **P3 Reaction podium.** Each bar carries two numbers, a rank inside the bar and a count above it (`b-mila-1.png`). That is redundant and slows reading.
- **P3 English copy.** It keeps Russian guillemets: «Pick this chat in «New analysis»…» (en `report.notFoundText`). Otherwise length held up at 390 px in my pass (`j9-en-*.png`).

**Colour**

- **P3 «Ваши 30 дней» on home.** Two different people (Мила, Анна Петрова) get the same red bar (`home--phone--light--full.png`). With only 7 colour families, collisions are guaranteed, so colour cannot identify a person on its own. Keep the name next to the bar (as today) and do not rely on colour across tiles.

---

## 6. What is genuinely strong (keep)

1. **Analysis progress** (`AnalysisBanner.vue`). Honest, determinate, time-travel phrasing («Дошли до 4 марта 2025»), an ETA only once it can be estimated, «можно закрыть вкладку», mirrored across home, `/new`, the header chip and the report. Best in the product.
2. **Poster → report.** The name at display size and the mirrored pulse in the person's Telegram colour give the report an identity, and the glass header with the name after scrolling (`j5-report-scrolled.png`) is well-made. Keep the 7 Telegram colour families as the _person_ signal and keep the UI monochrome. Just do not lean on colour alone (see the colour finding).
3. **Destructive actions.** The confirm dialogs name the object, the consequence and what survives («Сами сообщения в Telegram останутся на месте… Итоги тоже удалятся»). The «Отчёт удалён» toast works, and deleting the last report returns home to first-run (`j9-delete-confirm.png`).
4. **Share dialog structure.** Preview, then watch / save, then «По ссылке», with link options as a second step. The link step's privacy controls (name, words, stickers, expiry) are thoughtful (`j5-share-link-step.png`).
5. **FAQ «Приватность и вопросы».** The best copy in the app; promote it.
6. **Onest.** Fine. It reads well in Cyrillic and gives tabular figures. The problem is not the typeface but the sameness of the card bodies.

## 7. What in Portrait to reconsider

- **Card rhythm.** Every card has the same anatomy and weight (grey question, bold answer, bar). Give the report a hierarchy: one lead insight, then the 2–3 cards that deviate most at full size, then the «even» rest compressed.
- **Mobile.** Mobile feels _designed_ at the poster and the progress UI, and _compressed_ elsewhere: the two-column «Номинации», the truncated row status, the clipped segmented theme control, and a phone home that stacks four section types.
- **Navigation.** The sticky three-tab anchor nav on the poster works, and tapping «Время» jumps correctly (scrollY 5515 in the group). But the report has no ending and no «next»: after «Любимые эмодзи» the page just stops. End with «Итоги», «Поделиться» and «Разобрать ещё один чат».
- **Home.** «Главное» is good: «Ваши 30 дней» and «5 000-е сообщение через 13 дней» are reasons to come back. But «Отчёты» is a plain list of counts («4 800 сообщений»). The product promise «что я уже узнал» needs one headline finding per report card.

## 8. Personas

- **Jordan (first-timer).** Hesitates at the Telegram login because nothing above the fold explains the session. Reads a 3-step explainer that repeats what the list shows. Lands on a report where most answers are «поровну» and has no prompt about what to look at.
- **Casey (one-handed, evening).** «Поделиться» and «назад» sit at the top. The «Время» part is 3.4 screens down, and the group's «Время» is 6.7 screens down. The quiz recipient gets a page with two «Войти» buttons.
- **Riley (stress tester).** Found the reversed quiz bar, the «Вы — Только вы» string, the public «Собеседник/Вы» inversion, the home blanking on one 500, and the not-found dead end.
- **Recipient of a link (project persona: the other person in the chat).** Is told «Вы пишете заметно больше» when it was the sender, and sees themselves as «Собеседник». This is a trust and relationship risk, not just a usability one.

## 9. Questions to consider

- What if the first thing under the poster were three sentences you would text a friend about this chat?
- Should «Итоги» be the _default_ way to experience a first report, with the long report as the «подробнее»?
- Is a group report with 20 cards a report, or a reference page? What are the three things a group member actually wants to know?

Questions skipped: this is an independent audit delivered to a coordinator, not an interactive critique session (there are 5 priority issues, but no user is present to answer).

---

## Top 10 issues (ranked)

1. **P1** The public link uses the sender's perspective («Вы пишете…») for the recipient and titles them «Собеседник», while the quiz uses the opposite «Вы». `pages/s/[token].vue`, `PublicQuiz.vue`.
2. **P1** The quiz reveal bar puts the numbers under the wrong person (cards: Demo left; bar: 26% left while Demo has 74%). `PublicQuiz.vue`, `j7-quiz-2.png`.
3. **P1** Report IA: 9 «who does more» duels, mostly «поровну» on balanced chats. No synthesis, no «как менялось», no ending. `PrivateReport.vue`, `ReportDuel`.
4. **P1** «Итоги» can only be reached through «Поделиться». There is no entry from the report header, the end of the report, or home. `ReportHeader.vue`, `ShareDialog.vue`.
5. **P1** The group «Номинации» grid is clipped at 360–390 px. Group jargon («серии», «подхват», «Ядро» for everyone). 8.6 screens long. `group/*`.
6. **P1** The landing is one screen; the trust case (FAQ, the «новый вход» heads-up) is hidden before a Telegram login. `pages/index.vue`, `pages/login.vue`.
7. **P2** Terminology: «Анализ / Разобрать чат / Новый анализ / Обновить отчёт / Открыть(отчёт)»; «Главная / Главное / Сводка».
8. **P2** Failures are not contained: one 500 on `/reports` blanks home. The not-found report page is a dead end instead of offering «Разобрать»; errors are generic everywhere. `dashboard.vue`, `chat/[id].vue`.
9. **P2** Login friction: no OTP auto-submit, wrong-code error far from the cells, no exit from the 2FA step, a 3-step bar shown to people who see only 2 steps.
10. **P2** Phone compression: `/new` analysed rows are cut off and drop the message count; the account theme control is clipped; the public header shows two «Войти»; the toast covers the report nav; «Вы — Только вы» comes from concatenated copy.

## Scores (1–10)

| Dimension                         | Score | Justification                                                                                                                                          |
| --------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Time to first value               | 8     | 4 taps plus 2 inputs to a report, auto-open, honest progress; held back only by OTP friction and an explainer above the fold.                          |
| Onboarding and trust              | 5     | The reassurance copy is good but arrives late. The landing gives one line for a Telegram-session login.                                                |
| Information architecture (report) | 4     | It is organised by metric, not by the questions people bring. No synthesis, no change over time, no ending; the group report is a reference dump.      |
| Navigation and wayfinding         | 7     | The back arrow, sticky anchor tabs, sidebar on desktop and the glass header with the name work. The not-found page and public header are weak spots.   |
| Terminology and copy              | 5     | Warm and plain in places (FAQ, delete dialogs, progress); inconsistent verbs, analyst jargon in groups, concatenation bugs.                            |
| States (loading, empty, error)    | 6     | Progress is excellent and delete confirmations are good. Errors are generic and blank the whole page; the not-found page is a dead end.                |
| Sharing and viral loop            | 5     | Strong dialog structure and privacy controls. Perspective inversion and the reversed bar on public surfaces; the quiz CTA appears only after «Готово». |
| Reasons to return                 | 6     | «Главное» (30 days, next milestone, unanalysed active chat) and «С прошлого анализа» are smart; report cards carry no insight.                         |
| Mobile craft                      | 6     | The poster, progress and sheets feel designed; nominations, row status and the account segmented control feel compressed.                              |
| Visual identity (Portrait)        | 8     | The person-coloured poster and pulse are distinctive and fit the product; the body cards are generic by comparison.                                    |
