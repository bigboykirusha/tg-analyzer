# TG Analyzer — product truth

Captured for design work (Impeccable `init`, from the owner's project brief in `/CLAUDE.md`). Visual decisions live in `docs/design-system.md`, not here.

## What it is

«Зеркало ваших переписок»: a person signs in with Telegram, picks a private chat or a group, and gets an understandable report about that conversation — who writes more, how fast each side replies, the rhythm by hour and day, frequent words and emoji, conversations and how the relationship changed over time. Groups add member roles, connections and a shared vocabulary. «Итоги» are Wrapped-style story slides that can be saved as 1080×1920 images or sent.

## Who uses it, where

Russian-speaking Telegram users (English supported), mostly on a phone, often in the evening, curious about a relationship: a partner, a parent, a friend, a work chat. Emotional, personal, sometimes tender content. They share findings with the other person (link, guess game, story images).

## The promise

Privacy first: message texts are never stored, only an aggregated report; everything can be deleted in one click. The product must feel trustworthy and calm, never creepy or surveillant.

## Surfaces and modes

- Landing, FAQ/privacy, example report — Persuade / Read.
- Sign-in (phone → code → optional password) — Operate, high-stakes trust moment.
- Home («что я уже узнал» + «что ещё можно разобрать»), New analysis (chat list), Account — Operate.
- Report (private / group) — Read: understanding a relationship through numbers.
- «Итоги» stories and the public guess game — Experience / Persuade.

## Hard constraints

- Two sides of a conversation: «you» and «them» must be distinguishable everywhere, consistently, and «you» comes first/left.
- One fact, one home: a metric gives one answer across screens and stories.
- Russian copy is longer than English; long chat names (80+ chars) must not break layouts.
- Phone first (360–430 px with no horizontal scroll), plus tablet and desktop; light and dark.
- e2e selectors: `.chat-row`, `.home-event__analyse`, `.phone-input`, `.otp-input`, buttons «Получить код», «Подтвердить код», «Анализ», «Открыть отчёт», «Поделиться», «Смотреть итоги», role `tab` in the report navigation, `.stories__segment`, `.story-slide__title`.
