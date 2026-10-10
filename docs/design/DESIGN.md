# TG Analyzer — дизайн-система

Дата пересмотра: 2026-10-09. Направление: **TG Analyzer reference redesign** из `docs/design_claude`: спокойный аналитический интерфейс с чёткой иерархией, одной поверхностью списка и стеклом только на навигации и оверлеях.

## Концепция

- Плавающая верхняя навигация на desktop и нижняя capsule-навигация на mobile заменяют sidebar.
- Кобальт обозначает основные действия и первую серию данных, коралловый — вторую серию. Статус всегда сопровождается текстом или знаком.
- Chat picker — единый список с поиском и сегментом «Все / С отчётом / Без отчёта»; вложенные карточки запрещены.
- Карточки, top bar и tab bar используют стекло с fallback без blur; остальная поверхность остаётся матовой и читаемой.

## Палитры

Светлая тема: bg `#F5F5F7`, surface `#FFFFFF`, surface-2 `#EDEDF0`, border `#E4E4E8`, text `#1D1D1F`, muted `#6B6B73`, accent `#0A6CFF`, accent-2 `#F2704F`.

Тёмная тема: bg `#0B0B0C`, surface `#1A1A1C`, surface-2 `#2A2A2D`, border `#2E2E32`, text `#F5F5F7`, muted `#9A9AA2`, accent `#4DA3FF`, accent-2 `#FFA38B`.

## Токены и типографика

- Семантические CSS-токены покрывают цвета, поверхности, разделители, статусы, blur, радиусы, тени, z-index, spacing и motion.
- Шрифт: `-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`, `Manrope`, system-ui; цифры используют `font-variant-numeric: tabular-nums`.
- Display-заголовки используют плотный интерлиньяж и отрицательный tracking; служебные labels — uppercase с разрядкой. Моноширинный шрифт оставлен только для технических идентификаторов и времени.

## Motion и доступность

- Анимируются только `opacity` и `transform`; касание снижает scale до .97, переходы используют View Transitions с безопасным fallback.
- `prefers-reduced-motion`, `prefers-reduced-transparency` и `prefers-contrast: more` упрощают motion и отключают blur.
- Focus ring, keyboard navigation, live-regions, labels, scaleable viewport и tap targets не менее 44px являются обязательными для всех UI-компонентов.

## Экраны и компоненты

Поток пользователя: login/onboarding → dashboard/chat picker → live progress → report → history → profile/settings. Каждый экран поддерживает loading, empty, error, success и partial.

Базовый набор: Button, IconButton, Input, OtpInput, Select, SegmentedControl, Card, BottomSheet, Modal, Toast, Skeleton, EmptyState, Badge, Avatar, ListRow, Progress, KPI, ChartCard, ThemeToggle, TabBar и TopBar.

Login использует двухколоночную композицию на desktop и один безопасный flow на mobile. Dashboard, history и report имеют центровку 800/1000px, единый заголовок страницы, общие сегменты и строки.

## Зафиксированные проблемы до редизайна

- Viewport блокирует browser zoom; интерфейс использует моноширинные метрики и подписи.
- В mobile действует верхняя навигация, а не доступный нижний tab bar; страницы используют жёсткие границы и несколько вложенных карточек.
- Ошибка dashboard показывает сырой технический текст `Not a valid string`.
- Текущая тема только тёмная, вторичная типографика недостаточно контрастна, а графики используют сливающуюся вторую серию.
- В login загружаются флаги с внешнего `flagcdn.com`; отсутствуют manifest, корректный OG image и theme-aware meta.

Baseline на синтетических данных хранится в `docs/design/before/`. After-снимки login находятся рядом, а актуальные visual regression fixtures публичных и авторизованных экранов — в `apps/web/tests/e2e/*-snapshots/`.
