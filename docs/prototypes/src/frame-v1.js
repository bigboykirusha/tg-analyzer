// The desktop frame (header and left block) in five variants, the old «Сводка» (variant A) inside.
// Helpers (ICONS, rnd, line, boot) come from report-v2.js.
/* global ICONS, rnd, boot */
Object.assign(ICONS, {
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  sparkles:
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
})
const ic = (name) => `<i data-icon="${name}"></i>`
const pill = (label, kind = '', iconName = '') =>
  `<span class="pill ${kind}">${iconName ? ic(iconName) : ''}${label}</span>`
const av = (name, cls = '') => `<span class="av ${cls}">${name[0]}</span>`
const logo = '<span class="logo-mark"><i></i><i></i><i></i></span>'
const pulse = (height) =>
  `<svg class="pulse-mini" data-h="${height}" preserveAspectRatio="none" style="height:${height}px"></svg>`
function drawPulses() {
  document.querySelectorAll('svg.pulse-mini[data-h]').forEach((svg) => {
    const n = Math.max(8, Math.floor(svg.getBoundingClientRect().width / 3))
    let lines = `<line class="axis" x1="0" x2="${n}" y1="50" y2="50"/>`
    for (let i = 0; i < n; i++) {
      const base = 0.35 + 0.45 * Math.abs(Math.sin(i * 0.11)) + rnd() * 0.25
      lines += `<line class="u" x1="${i + 0.5}" x2="${i + 0.5}" y1="49" y2="${49 - Math.min(48, base * 46)}"/><line class="t" x1="${i + 0.5}" x2="${i + 0.5}" y1="51" y2="${51 + Math.min(48, base * (0.7 + rnd() * 0.5) * 44)}"/>`
    }
    svg.setAttribute('viewBox', `0 0 ${n} 100`)
    svg.innerHTML = lines
  })
}

/* ─── The old «Сводка» (variant A), unchanged ────────────────────────── */
const event = (iconName, title, sub, visual = '', action = '', tone = '') =>
  `<article class="tile ev${tone ? ` tile--${tone}` : ''}"><div class="ev__head">${ic(iconName)}<span>${sub}</span></div><div class="ev__title">${title}</div>${visual}${action ? `<div class="ev__foot">${action}</div>` : ''}</article>`
const REPORTS = [
  ['Мила', 'av--1', 'Пишете на равных · 4 800'],
  ['Мама', 'av--3', 'Мама пишет больше · 1 900'],
  ['Продуктовая команда', 'av--5', 'Активнее всех Павел · 9 000'],
]
const summary = `<section class="sec"><div class="sec__head"><h2>Закреплённые</h2></div><div class="pins">${[
  'Мила',
  'Мама',
  'Продуктовая команда',
  'Дима (работа)',
]
  .map((n, i) => `<div class="pinr">${av(n, `av--lg av--${i + 1}`)}<span>${n.split(' ')[0]}</span></div>`)
  .join('')}</div></section>
  <section class="sec"><div class="sec__head"><h2>Главное</h2><span class="hint">ноябрь, 1–8</span></div><div class="evs">
    ${event('sparkles', '3 412 сообщений в 14 чатах', 'Ваш месяц', pulse(40), '', 'ink')}
    ${event('refresh', 'С Милой +1 240 сообщений с прошлого отчёта', 'Мила', '', pill('Обновить отчёт', 'pill--sm'))}
    ${event('help', 'Мама угадала 4 из 5', 'Угадайка', '<div class="dots5"><i class="on"></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i></div>', '', 'lime')}
    ${event('sparkles', '5 000-е сообщение с Милой — через 10 дней', 'Круглые сообщения')}
  </div></section>
  <section class="sec"><div class="sec__head"><h2>Отчёты</h2></div><div class="tile rows">${REPORTS.map(
    ([n, a, s]) =>
      `<div class="li">${av(n, a)}<div class="li__main"><span class="li__title">${n}</span><span class="li__sub">${s}</span></div><div class="w200">${pulse(26)}</div>${ic('chevron')}</div>`,
  ).join('')}</div></section>`

/* ─── Frame parts ────────────────────────────────────────────────────── */
const brand = `<div class="fr__brand">${logo}TG Analyzer</div>`
const nav = (dark = false) =>
  `<nav class="fr__nav${dark ? ' fr__nav--dark' : ''}"><div class="side__item on">${ic('grid')}Главная</div><div class="side__item">${ic('plus')}Новый анализ</div><div class="side__head">Личные</div>${REPORTS.slice(
    0,
    2,
  )
    .map(([n, a]) => `<div class="side__item">${av(n, `${a} av--xs`)}${n}</div>`)
    .join(
      '',
    )}<div class="side__head">Группы</div><div class="side__item">${av('П', 'av--5 av--xs')}Продуктовая команда</div></nav>`
const bar = `<div class="fr__bar"><h1 class="fr__title">Главная</h1>${pill('Новый анализ', 'pill--primary', 'plus')}<span class="av av--sm av--4">К</span></div>`

const FRAMES = {
  1: () =>
    `<div class="screen fr fr1"><header class="fr__head">${brand}${bar}</header><aside class="fr__side">${nav()}</aside><div class="fr__main">${summary}</div></div>`,
  2: () =>
    `<div class="screen fr fr2"><header class="fr__head">${brand}${bar}</header><aside class="fr__side">${nav()}</aside><div class="fr__sheet"><div class="fr__main">${summary}</div></div></div>`,
  3: () =>
    `<div class="screen fr fr3"><header class="fr__head">${brand}${bar}</header><aside class="fr__side">${nav()}</aside><div class="fr__main">${summary}</div></div>`,
  4: () =>
    `<div class="screen fr fr4"><aside class="fr__card">${brand}${nav()}<div class="fr__me"><span class="av av--sm av--4">К</span>Кирилл</div></aside><div class="fr__right"><header class="fr__head">${bar}</header><div class="fr__main">${summary}</div></div></div>`,
  5: () =>
    `<div class="screen fr fr5"><aside class="fr__dark">${brand}${nav(true)}<div class="fr__me"><span class="av av--sm av--4">К</span>Кирилл</div></aside><div class="fr__right"><header class="fr__head">${bar}</header><div class="fr__main">${summary}</div></div></div>`,
}

document.querySelectorAll('[data-frame]').forEach((node) => {
  node.innerHTML = `<div class="frame frame--wide frame--xl">${FRAMES[node.dataset.frame]()}</div>`
})
boot()
drawPulses()
