// «Сводка» home in four layouts inside the current shell (full-width header, sidebar under it).
// Helpers (ICONS, rnd, boot) come from report-v2.js.
/* global ICONS, rnd, boot */
Object.assign(ICONS, {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  sparkles:
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
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

/* ─── The current shell: one header across, the sidebar under it ─────── */
function shell(phone, body) {
  if (phone)
    return `<div class="screen"><div class="phone-top">${logo}<span class="grow"></span>${pill('Новый анализ', 'pill--primary pill--sm', 'plus')}<span class="av av--sm av--4">К</span></div><div class="content">${body}</div></div>`
  const reports = ['Мила', 'Мама', 'Продуктовая команда']
    .map((n, i) => `<div class="side__item"><span class="av av--xs av--${i + 1}">${n[0]}</span>${n}</div>`)
    .join('')
  return `<div class="screen cur"><header class="cur__hdr"><div class="cur__brand">${logo}TG Analyzer</div><div class="cur__bar"><h1 class="cur__title">Главная</h1>${pill('Новый анализ', 'pill--primary', 'plus')}<span class="av av--sm av--4">К</span></div></header><aside class="cur__side"><div class="side__item on">${ic('grid')}Главная</div><div class="side__item">${ic('plus')}Новый анализ</div><div class="side__head">Личные</div>${reports}</aside><div class="cur__main">${body}</div></div>`
}

const MONTH_TOP = [
  ['Мила', 'av--1', 1240],
  ['Дима (работа)', 'av--2', 612],
  ['Мама', 'av--3', 540],
]
const monthTile = (phone, big = true) =>
  `<section class="tile tile--ink mtile${big ? '' : ' mtile--slim'}"><div class="mtile__copy"><span class="q">Ваш ноябрь</span><span class="mtile__num num">3 412</span><span class="hint">сообщений в 14 личных чатах · вы пишете 47%</span></div>${big ? pulse(phone ? 36 : 48) : ''}${
    big
      ? `<ol class="mtop">${MONTH_TOP.map(([n, a, c], i) => `<li><b>${i + 1}</b>${av(n, `${a} av--sm`)}<span>${n}</span><span class="num">${c}</span></li>`).join('')}</ol>`
      : ''
  }</section>`

/* ─── 1. Month large, events as rows ─────────────────────────────────── */
const row = (iconName, title, sub, action) =>
  `<div class="erow"><span class="icon-box">${ic(iconName)}</span><div class="li__main"><span class="li__title wrap">${title}</span><span class="li__sub">${sub}</span></div>${action}</div>`
const EVENTS = () => [
  row('refresh', 'С Милой +1 240 сообщений', 'с отчёта 3 октября', pill('Обновить', 'pill--sm')),
  row('help', 'Мама угадала 4 из 5', 'угадайка · вчера', pill('Смотреть', 'pill--sm')),
  row('sparkles', '5 000-е сообщение с Милой', 'примерно через 10 дней', ''),
  row('user', 'Дима (работа) не разобран', '612 сообщений за месяц', pill('Разобрать', 'pill--sm')),
]
const V1 = (phone) =>
  shell(
    phone,
    `<div class="v1${phone ? ' v1--m' : ''}">${monthTile(phone)}<section class="tile erows"><div class="sec__head"><h2 class="q">Что нового</h2><span class="hint">4</span></div>${EVENTS().join('')}</section></div>`,
  )

/* ─── 2. People, not events ──────────────────────────────────────────── */
const person = (name, a, status, facts, action, tone = '') =>
  `<article class="tile pcard${tone ? ` tile--${tone}` : ''}"><div class="pcard__head">${av(name, `${a} av--lg`)}<div class="li__main"><span class="li__title">${name}</span><span class="li__sub">${status}</span></div>${ic('chevron')}</div><ul class="pcard__facts">${facts.map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('')}</ul>${action ? `<div class="pcard__foot">${action}</div>` : ''}</article>`
const V2 = (phone) =>
  shell(
    phone,
    `${monthTile(phone, false)}<section class="sec"><div class="sec__head"><h2>Закреплённые</h2><span class="hint">${ic('pin')}из Telegram</span></div><div class="pcards${phone ? ' pcards--m' : ''}">
      ${person(
        'Мила',
        'av--1',
        'отчёт от 3 октября',
        [
          ['Новых сообщений', '+1 240'],
          ['5 000-е сообщение', 'через 10 дней'],
        ],
        pill('Обновить отчёт', 'pill--sm', 'refresh'),
      )}
      ${person(
        'Мама',
        'av--3',
        'отчёт вчера',
        [
          ['Угадайка', '4 из 5'],
          ['Кто пишет больше', 'Мама, 58%'],
        ],
        pill('Смотреть ответы', 'pill--sm'),
        'lime',
      )}
      ${person(
        'Продуктовая команда',
        'av--5',
        'группа · отчёт неделю назад',
        [
          ['Новых сообщений', '+310'],
          ['Активнее всех', 'Павел'],
        ],
        pill('Обновить отчёт', 'pill--sm', 'refresh'),
      )}
      ${person(
        'Дима (работа)',
        'av--2',
        'не разобран',
        [
          ['За месяц', '612 сообщений'],
          ['Вы пишете', '44%'],
        ],
        pill('Разобрать', 'pill--sm pill--primary'),
        'grey',
      )}
    </div></section>`,
  )

/* ─── 3. Bento ───────────────────────────────────────────────────────── */
const V3 = (phone) =>
  shell(
    phone,
    `<div class="bento3${phone ? ' bento3--m' : ''}">
      <div class="b-month">${monthTile(phone)}</div>
      <section class="tile tile--lime b-quiz"><span class="q">${ic('help')} Угадайка</span><div class="answer">Мама угадала 4 из 5</div><div class="dots5"><i class="on"></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i></div></section>
      <section class="tile b-small"><span class="hint">${ic('refresh')} Мила</span><div class="answer">+1 240 с прошлого отчёта</div>${pill('Обновить', 'pill--sm')}</section>
      <section class="tile b-pins"><span class="q">Закреплённые</span><div class="pinrow">${[
        ['Мила', 'av--1', '+1 240'],
        ['Мама', 'av--3', '4 из 5'],
        ['Команда', 'av--5', '+310'],
        ['Дима', 'av--2', 'нет отчёта'],
      ]
        .map(
          ([n, a, s]) =>
            `<div class="pinx">${av(n, `${a} av--lg`)}<span class="li__title">${n}</span><span class="hint">${s}</span></div>`,
        )
        .join('')}</div></section>
      <section class="tile b-small"><span class="hint">${ic('sparkles')} Круглые сообщения</span><div class="answer">5 000-е с Милой через 10 дней</div></section>
    </div>`,
  )

/* ─── 4. Feed by days, month on the side ─────────────────────────────── */
const day = (title, items) =>
  `<div class="day"><span class="day__title">${title}</span><div class="tile erows">${items.join('')}</div></div>`
const side4 = `<aside class="side4">${monthTile(false)}<section class="tile"><span class="q">Закреплённые</span><div class="list">${[
  ['Мила', 'av--1', '+1 240 новых'],
  ['Мама', 'av--3', 'угадала 4 из 5'],
  ['Дима (работа)', 'av--2', 'не разобран'],
]
  .map(
    ([n, a, s]) =>
      `<div class="li">${av(n, a)}<div class="li__main"><span class="li__title">${n}</span><span class="li__sub">${s}</span></div></div>`,
  )
  .join('')}</div></section></aside>`
const V4 = (phone) => {
  const [r1, r2, r3, r4] = EVENTS()
  const feed = `<div class="feed">${day('Сегодня', [r1])}${day('На этой неделе', [r2, r3])}${day('Раньше', [r4])}</div>`
  return shell(phone, phone ? `${monthTile(true)}${feed}` : `<div class="v4">${feed}${side4}</div>`)
}

const frame = (cls, html) => `<div class="frame ${cls}">${html}</div>`
const SCREENS = { 1: V1, 2: V2, 3: V3, 4: V4 }
document.querySelectorAll('[data-screen]').forEach((node) => {
  const draw = SCREENS[node.dataset.screen]
  node.innerHTML = frame('frame--wide frame--xl', draw(false)) + frame('frame--phone', draw(true))
})
boot()
drawPulses()
