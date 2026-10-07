# TG Analyzer — дизайн-система

Дата: 2026-10-07. Направление: iOS 26 / Liquid Glass. Данные и графики остаются плотными непрозрачными поверхностями; стекло применяется только к навигации, меню, модалкам, sheet и тостам.

## Палитры

### A — Lime graphite

Исторический бренд: графитовый фон `#12131a`, лайм `#b7ef4a`, вторая серия `#40d9c4`. Контраст основного текста `#f5f7ff` на фоне — 17:1; вторичного `#aeb5c6` — 8.6:1.

### B — Indigo glass (выбрана)

Тёмная тема: фон `#11131c`, surface `#1a1d29`, текст `#f6f7ff`, secondary `#b5bad0`, accent `#9da8ff`, accent-2 `#3bd6c6`. Светлая тема: фон `#f6f7fc`, surface `#ffffff`, текст `#181b2a`, secondary `#545b73`, accent `#4455d9`, accent-2 `#067f78`. Основной текст имеет контраст выше 4.5:1, крупный и статусный — выше 3:1.

## Токены и типографика

- Семантические CSS-токены покрывают цвета, поверхности, разделители, статусы, blur, радиусы, тени, z-index, spacing 4/8px и motion 120/200/320/480ms.
- Шрифт: `Inter`, `-apple-system`, BlinkMacSystemFont, SF Pro, system-ui; цифры используют `font-variant-numeric: tabular-nums`.
- Шкала: display `clamp(2rem, 5vw, 4.25rem)`, h1 `clamp(1.75rem, 3vw, 2.5rem)`, h2 `clamp(1.375rem, 2vw, 1.75rem)`, body 1rem, callout .9375rem, footnote .8125rem, caption .75rem.

## Motion и доступность

- Анимируются только `opacity` и `transform`; касание снижает scale до .97, переходы используют View Transitions с безопасным fallback.
- `prefers-reduced-motion`, `prefers-reduced-transparency` и `prefers-contrast: more` упрощают motion и отключают blur.
- Focus ring, keyboard navigation, live-regions, labels, scaleable viewport и tap targets не менее 44px являются обязательными для всех UI-компонентов.

## Экраны и компоненты

Поток пользователя: login/onboarding → dashboard/chat picker → live progress → report → history → profile/settings. Каждый экран поддерживает loading, empty, error, success и partial.

Базовый набор: Button, IconButton, Input, OtpInput, Select, SegmentedControl, Card, GlassPanel, BottomSheet, Modal, Toast, Tooltip, Skeleton, EmptyState, ErrorState, Badge, Avatar, ListRow, linear/circular Progress, KPI, ChartCard, ThemeToggle, TabBar и Sidebar.

## Зафиксированные проблемы до редизайна

- Viewport блокирует browser zoom; интерфейс использует моноширинные метрики и подписи.
- В mobile действует верхняя навигация, а не доступный нижний tab bar; страницы используют жёсткие границы и несколько вложенных карточек.
- Ошибка dashboard показывает сырой технический текст `Not a valid string`.
- Текущая тема только тёмная, вторичная типографика недостаточно контрастна, а графики используют сливающуюся вторую серию.
- В login загружаются флаги с внешнего `flagcdn.com`; отсутствуют manifest, корректный OG image и theme-aware meta.

Baseline на синтетических данных хранится в `docs/design/before/`; в финале фазы рядом будут сохранены after-снимки и visual regression fixtures.
