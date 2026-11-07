// The desktop frame, round 2: five more variants with no «Главная» title, the old «Сводка» inside.
// Helpers (ICONS, rnd, boot) come from report-v2.js.
/* global ICONS, rnd, boot */
Object.assign(ICONS, {
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  sparkles:
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  panel: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
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

/* ─── The old «Сводка» (variant A) ───────────────────────────────────── */
const event = (iconName, title, sub, visual = '', action = '', tone = '') =>
  `<article class="tile ev${tone ? ` tile--${tone}` : ''}"><div class="ev__head">${ic(iconName)}<span>${sub}</span></div><div class="ev__title">${title}</div>${visual}${action ? `<div class="ev__foot">${action}</div>` : ''}</article>`
const PEOPLE = [
  ['Мила', 'av--1', true, 'Пишете на равных · 4 800'],
  ['Мама', 'av--3', true, 'Мама пишет больше · 1 900'],
  ['Продуктовая команда', 'av--5', false, 'Активнее всех Павел · 9 000'],
  ['Дима (работа)', 'av--2', false, 'не разобран'],
]
const summary = (pins = true) => `${
  pins
    ? `<section class="sec"><div class="sec__head"><h2>Закреплённые</h2></div><div class="pins">${PEOPLE.map(
        ([n, a]) => `<div class="pinr">${av(n, `av--lg ${a}`)}<span>${n.split(' ')[0]}</span></div>`,
      ).join('')}</div></section>`
    : ''
}
  <section class="sec"><div class="sec__head"><h2>Главное</h2><span class="hint">ноябрь, 1–8</span></div><div class="evs">
    ${event('sparkles', '3 412 сообщений в 14 чатах', 'Ваш месяц', pulse(40), '', 'ink')}
    ${event('refresh', 'С Милой +1 240 сообщений с прошлого отчёта', 'Мила', '', pill('Обновить отчёт', 'pill--sm'))}
    ${event('help', 'Мама угадала 4 из 5', 'Угадайка', '<div class="dots5"><i class="on"></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i></div>', '', 'lime')}
    ${event('sparkles', '5 000-е сообщение с Милой — через 10 дней', 'Круглые сообщения')}
  </div></section>`

/* ─── Frame parts ────────────────────────────────────────────────────── */
const brand = `<div class="fr__brand">${logo}TG Analyzer</div>`
const me = '<span class="av av--sm av--4">К</span>'
const newBtn = pill('Новый анализ', 'pill--primary', 'plus')
const people = (filter = false) =>
  `${filter ? '<div class="segs segs--sm"><span class="on">Все</span><span>Личные</span><span>Группы</span></div>' : ''}${PEOPLE.slice(
    0,
    3,
  )
    .map(
      ([n, a, , s]) =>
        `<div class="pp">${av(n, `${a} av--sm`)}<div class="li__main"><span class="pp__name">${n}</span><span class="li__sub">${s}</span></div></div>`,
    )
    .join('')}`
const nav = `<div class="side__item on">${ic('grid')}Главная</div><div class="side__item">${ic('plus')}Новый анализ</div><div class="side__head">Отчёты</div>${PEOPLE.slice(
  0,
  3,
)
  .map(([n, a]) => `<div class="side__item">${av(n, `${a} av--xs`)}${n}</div>`)
  .join('')}`

const FRAMES = {
  6: () =>
    `<div class="screen v6"><header class="isl v6__top">${brand}<span class="grow"></span><div class="hdr__end">${newBtn}${me}</div></header><aside class="isl v6__lib"><div class="v6__libhead"><span class="q">Ваши люди</span>${pill('', 'pill--icon pill--sm', 'plus')}</div>${people(true)}</aside><div class="isl v6__main"><div class="fr__main">${summary()}</div></div></div>`,
  7: () =>
    `<div class="screen v7"><aside class="v7__side">${brand}<nav class="fr__nav">${nav}</nav></aside><div class="v7__panel"><header class="v7__bar"><span class="grow"></span>${newBtn}${me}</header><div class="fr__main">${summary()}</div></div></div>`,
  8: () =>
    `<div class="screen fr v8"><header class="fr__head v8__head">${brand}<div class="v8__bar"><div class="hdr__end">${newBtn}${me}</div></div></header><aside class="fr__side v8__side"><nav class="fr__nav">${nav}</nav></aside><div class="fr__main">${summary()}</div></div>`,
  9: () =>
    `<div class="screen v9"><header class="v9__head"><div class="v9__in">${brand}<div class="hdr__end">${newBtn}${me}</div></div></header><div class="v9__stories"><div class="v9__in v9__row">${PEOPLE.concat(
      [
        ['Анна', 'av--4', false],
        ['Олег', '', false],
      ],
    )
      .map(
        ([n, a, fresh]) =>
          `<div class="story${fresh ? ' story--new' : ''}">${av(n, `${a} av--lg`)}<span>${n.split(' ')[0]}</span></div>`,
      )
      .join(
        '',
      )}<div class="story story--add"><span class="av av--lg">${ic('plus')}</span><span>Разобрать</span></div></div></div><div class="fr__main">${summary(false)}</div></div>`,
  10: () => `<div class="v10"><div class="screen fr v10a"><header class="fr__head v10__head"><div class="fr__brand"><span class="pill pill--icon pill--ghost">${ic('panel')}</span>${logo}TG Analyzer</div><div class="fr__bar"><span class="grow"></span>${newBtn}${me}</div></header><aside class="fr__side"><nav class="fr__nav">${nav}</nav></aside><div class="fr__main">${summary()}</div></div>
    <div class="screen v10b"><header class="v10b__head"><span class="pill pill--icon pill--ghost">${ic('panel')}</span>${logo}<span class="grow"></span>${newBtn}${me}</header><aside class="v10b__rail"><span class="rail4__btn on">${ic('grid')}</span><span class="rail4__btn">${ic('plus')}</span><span class="rail4__sep"></span>${PEOPLE.slice(
      0,
      3,
    )
      .map(([n, a]) => av(n, `${a} av--sm`))
      .join('')}</aside><div class="fr__main">${summary()}</div></div></div>`,
}

document.querySelectorAll('[data-frame]').forEach((node) => {
  node.innerHTML = `<div class="frame frame--wide frame--xl">${FRAMES[node.dataset.frame]()}</div>`
})
boot()
drawPulses()
