# Что изменилось и почему

## main.css — удалено

### Дублирующие токены (7 штук)

| Удалено | Было алиасом |
|---|---|
| `--accent-dim` | = `--accent-hover` |
| `--accent-muted` | = `--accent-subtle` |
| `--accent-muted-hover` | использовалось 1 раз, inline |
| `--accent-glow-soft` | = `--accent-subtle` |
| `--transition-base` | = `--transition-normal` |
| `--color-success/warning/danger/info` | = `--success/warning/danger/info` |
| `--color-success-muted` и т.п. | = `--success-subtle` и т.п. |

**Что делать:** в коде заменить:
```
--accent-dim        → --accent-hover
--accent-muted      → --accent-subtle
--transition-base   → --transition-normal
--color-success     → --success
--color-warning     → --warning
--color-danger      → --danger
--color-info        → --info
--color-*-muted     → --*-subtle
```

### Дублирующие классы типографики

| Удалено | Заменено |
|---|---|
| `.text-h1` `.text-h2` `.text-h3` | → `.t-h1` `.t-h2` `.t-h3` |
| `.text-body` `.text-body-lg` `.text-body-sm` | → `.t-body` `.t-body-lg` `.t-small` |
| `.text-caption` | → `.t-small` |
| `.text-display` | → `.t-display` |
| `.text-label` | → `.t-label` |
| `.text-mono` `.mono-value` | → `.t-mono` |
| `.screen-reader` | → `.sr-only` |

**Что делать:** grep по проекту и заменить все старые классы.

```bash
# Найти все вхождения
grep -r "text-h1\|text-h2\|text-h3\|text-body\|text-caption\|text-display\|text-label\|text-mono\|mono-value\|screen-reader" src/
```

---

## MetricCard.vue — что изменилось

**Было:**
```css
background: linear-gradient(180deg,
  color-mix(in srgb, var(--bg-elevated) 72%, transparent),
  var(--bg-surface)
);
box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary) 4%, transparent);
gap: 6px; /* хардкод */
```

**Стало:**
```css
background: var(--bg-elevated);
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04); /* то же, без color-mix */
gap: var(--space-2); /* из системы */
```

Убран инлайн `font-size: 24px` на `.metric-value` — теперь наследует `.t-metric` (28px).
На mobile: 22px вместо 21px — ближе к системе.

---

## Button.vue — что изменилось

**Классы:** переименованы с `ui-button / btn-variant` на `btn / btn--variant` (BEM).

**`btn-lg`:** теперь реально отличается от `btn-md`:
- `btn--md`: height 34px, font 13px
- `btn--lg`: height 40px, font 14px

**`font-weight`:** `600 → 500`. 600 — слишком жирно для тёмного UI с маленьким текстом.

**Focus ring:** порядок теней исправлен — сначала offset (`bg-base`), потом цвет (`accent`).

**`:disabled`:** добавлен на уровень стилей через `:not(:disabled)` на hover — теперь не нужен `pointer-events: none` и отдельный блок.

**Spinner:** `border: 2px → 1.5px`, и размер 14px → 13px. Было чуть толстовато.

**Icon sizes:** выровнены с высотой кнопки (14/15/16px вместо 14/16/18px).

---

## tailwind.config.ts — зачем добавлен

Без конфига Tailwind не знает про ваши токены. Это значит:

**Было:**
```html
<div class="gap-[var(--space-4)] bg-[var(--bg-surface)] rounded-[var(--radius-md)]">
```

**Стало:**
```html
<div class="gap-4 bg-bg-surface rounded-md">
```

Все токены прокинуты: цвета, отступы, радиусы, тени, шрифты, переходы.

---

## Правила на будущее

### Токены
- Один токен = одна роль. Не создавать алиасы без причины.
- Новый токен добавляется только в `:root` в `main.css`. Нигде больше.
- Если нужно что-то похожее на существующий токен — использовать `color-mix()` или `opacity` вместо нового токена.

### Типографика
- Только `t-*` классы. Старые `text-*` — удалить.
- Числа, метрики, проценты, длительности → всегда `t-metric`, `t-metric-md`, `t-metric-sm` или `t-mono`.
- `t-label` — только для заголовков секций и подписей карточек. Не злоупотреблять.

### Компоненты
- Именование классов: BEM. `block`, `block__element`, `block--modifier`.
- Хардкод значений (px, числа) только если это физически невозможно выразить через токен.
- `gap: 6px` → нет. `gap: var(--space-2)` (8px) → да, или `var(--space-1)` (4px).

### Tailwind vs CSS
- Структурные утилиты (flex, grid, overflow, position) → Tailwind классы.
- Все визуальные токены (цвета, отступы, радиусы) → либо CSS классы из `main.css`, либо Tailwind через конфиг.
- Никаких `bg-[var(--...)]` или `text-[var(--...)]` — для этого теперь есть конфиг.

### Spacing
- Всегда из шкалы: 4/8/12/16/20/24/32/40/48/64.
- Исключение: 2px для тонких декоративных линий, 1px для border.
- Между уровнями (card padding, section gap, page padding) — разница минимум в 1 шаг шкалы.

### Состояния
- Hover: всегда через `:hover:not(:disabled)` если есть disabled состояние.
- Focus: всегда `focus-visible`, никогда `focus`.
- Disabled: `opacity: 0.4` + `cursor: not-allowed` + `pointer-events: none`.