// Cabinet shell on desktop in four variants, the same «Сводка» home inside. Helpers (ICONS, rnd, boot) come from report-v2.js.
/* global ICONS, rnd, boot */
Object.assign(ICONS, {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  sparkles:
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
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

/* ─── The same «Сводка» inside every shell ───────────────────────────── */
const event = (iconName, title, sub, visual = '', action = '', tone = '') =>
  `<article class="tile ev${tone ? ` tile--${tone}` : ''}"><div class="ev__head">${ic(iconName)}<span>${sub}</span></div><div class="ev__title">${title}</div>${visual}${action ? `<div class="ev__foot">${action}</div>` : ''}</article>`
const PINNED = ['Мила', 'Мама', 'Продуктовая команда', 'Дима (работа)']
const summary = (withPins = true) => `${
  withPins
    ? `<section class="sec"><div class="sec__head"><h2>Закреплённые</h2></div><div class="pins">${PINNED.map(
        (n, i) => `<div class="pinr">${av(n, `av--lg av--${i + 1}`)}<span>${n.split(' ')[0]}</span></div>`,
      ).join('')}</div></section>`
    : ''
}
  <section class="sec"><div class="sec__head"><h2>Главное</h2><span class="hint">ноябрь, 1–8</span></div><div class="evs">
    ${event('sparkles', '3 412 сообщений в 14 чатах', 'Ваш месяц', pulse(40), '', 'ink')}
    ${event('refresh', 'С Милой +1 240 сообщений с прошлого отчёта', 'Мила', '', pill('Обновить отчёт', 'pill--sm'))}
    ${event('help', 'Мама угадала 4 из 5', 'Угадайка', '<div class="dots5"><i class="on"></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i></div>', '', 'lime')}
    ${event('sparkles', '5 000-е сообщение с Милой — через 10 дней', 'Круглые сообщения')}
  </div></section>`

const search = `<div class="hsearch">${ic('search')}<span>Поиск чата</span><kbd>/</kbd></div>`
const me = `<span class="av av--sm av--4">К</span>`

/* ─── Shells ─────────────────────────────────────────────────────────── */
const SHELLS = {
  // 1. A header only: the same row as on the public pages.
  1: () =>
    `<div class="screen sh1"><header class="hdr hdr--wide"><div class="hdr__brand">${logo}TG Analyzer</div><nav class="tabs"><span class="on">Главная</span><span>Новый анализ</span><span>Отчёты <b class="cnt">3</b></span></nav><div class="hdr__end">${search}${me}</div></header><div class="col"><div class="hello"><span class="hint">Суббота, 8 ноября</span><h1 class="t-h1x">Привет, Кирилл</h1></div>${summary()}</div></div>`,
  // 2. One surface: the side list and the header share the page background, a hairline between.
  2: () =>
    `<div class="screen sh2"><aside class="rail2"><div class="hdr__brand">${logo}TG Analyzer</div><div class="side__item on">${ic('home')}Главная</div><div class="side__item">${ic('plus')}Новый анализ</div><div class="side__head">Отчёты</div>${[
      'Мила',
      'Мама',
      'Продуктовая команда',
    ]
      .map((n, i) => `<div class="side__item"><span class="av av--xs av--${i + 1}">${n[0]}</span>${n}</div>`)
      .join(
        '',
      )}<div class="rail2__end">${me}<span>Кирилл</span></div></aside><div class="main2"><header class="hdr"><h1 class="t-h1x">Главная</h1><div class="hdr__end">${search}${pill('Новый анализ', 'pill--primary', 'plus')}</div></header><div class="col">${summary()}</div></div></div>`,
  // 3. A floating capsule in the middle of the header.
  3: () =>
    `<div class="screen sh3"><header class="hdr hdr--wide"><div class="hdr__brand">${logo}TG Analyzer</div><nav class="segs capsule"><span class="on">Главная</span><span>Отчёты</span><span>Новый анализ</span></nav><div class="hdr__end">${pill('', 'pill--icon', 'search')}${me}</div></header><div class="col col--narrow"><div class="hello"><span class="hint">Суббота, 8 ноября</span><h1 class="t-h1x">Привет, Кирилл</h1></div>${summary()}</div></div>`,
  // 4. A narrow icon rail and a header.
  4: () =>
    `<div class="screen sh4"><aside class="rail4"><span class="rail4__logo">${logo}</span><span class="rail4__btn on">${ic('home')}</span><span class="rail4__btn">${ic('plus')}</span><span class="rail4__sep"></span>${[
      'Мила',
      'Мама',
      'Продуктовая команда',
    ]
      .map((n, i) => `<span class="av av--sm av--${i + 1}" title="${n}">${n[0]}</span>`)
      .join(
        '',
      )}<span class="rail4__end">${me}</span></aside><div class="main2"><header class="hdr"><h1 class="t-h1x">Главная</h1><div class="hdr__end">${search}${pill('Новый анализ', 'pill--primary', 'plus')}</div></header><div class="col">${summary(false)}</div></div></div>`,
}

document.querySelectorAll('[data-shell]').forEach((node) => {
  node.innerHTML = `<div class="frame frame--wide frame--xl">${SHELLS[node.dataset.shell]()}</div>`
})
boot()
drawPulses()
