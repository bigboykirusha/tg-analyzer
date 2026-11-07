// Cabinet home in four references, each drawn at desktop and phone size. Helpers (ICONS, rnd, line, boot) come from report-v2.js.
/* global ICONS, rnd, line, boot */
Object.assign(ICONS, {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  sparkles:
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  inbox:
    '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
})
const ic = (name) => `<i data-icon="${name}"></i>`
const pill = (label, kind = '', iconName = '') =>
  `<span class="pill ${kind}">${iconName ? ic(iconName) : ''}${label}</span>`
const av = (name, cls = '') => `<span class="av ${cls}">${name[0]}</span>`

/** Hairline pulse, drawn after layout at one tick per 3 px. */
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

// Demo data: reports and the last 30 days from Telegram.
const REPORTS = [
  {
    name: 'Мила',
    av: 'av--1',
    total: '4 800',
    answer: 'Пишете на равных',
    split: [52, 48],
    reply: '3 мин',
    news: '+1 240',
    tone: 'ink',
  },
  {
    name: 'Мама',
    av: 'av--3',
    total: '1 900',
    answer: 'Мама пишет больше',
    split: [42, 58],
    reply: '3 мин',
    news: '',
    tone: 'lime',
  },
  {
    name: 'Продуктовая команда',
    av: 'av--5',
    total: '9 000',
    answer: 'Активнее всех Павел',
    split: [12, 88],
    reply: '—',
    news: '+310',
    tone: 'grey',
    group: true,
  },
]
const MONTH = [
  ['Мила', 'av--1', 1240, true],
  ['Дима (работа)', 'av--2', 612, false],
  ['Мама', 'av--3', 540, true],
  ['Анна Петрова', 'av--4', 214, false],
  ['Артём Ковалёв', '', 96, false],
]

/* ─── Shell ──────────────────────────────────────────────────────────── */
function cabinet(phone, body, actions = pill('Новый анализ', 'pill--primary', 'plus')) {
  const bar = `<div class="pbar"><div class="grow"><h1>Главная</h1></div>${phone ? '' : actions}</div>`
  if (phone)
    return `<div class="screen"><div class="phone-top"><i class="logo"></i><span class="grow">Главная</span>${pill('', 'pill--primary pill--icon', 'plus')}</div><div class="content">${body}</div></div>`
  const chats = ['Мила', 'Мама', 'Продуктовая команда']
    .map((name, i) => `<div class="side__item"><span class="dot dot--${i + 1}"></span>${name}</div>`)
    .join('')
  return `<div class="screen shell"><aside class="side"><div class="side__brand"><i></i>TG Analyzer</div><div class="side__item on">${ic('home')}Главная</div><div class="side__item">${ic('plus')}Новый анализ</div><div class="side__head">Отчёты</div>${chats}</aside><div class="content">${bar}${body}</div></div>`
}

/* ─── А. Summary ─────────────────────────────────────────────────────── */
const event = (iconName, title, sub, visual = '', action = '', tone = '') =>
  `<article class="tile ev${tone ? ` tile--${tone}` : ''}"><div class="ev__head">${ic(iconName)}<span>${sub}</span></div><div class="ev__title">${title}</div>${visual}${action ? `<div class="ev__foot">${action}</div>` : ''}</article>`
const A = (phone) =>
  cabinet(
    phone,
    `<section class="sec"><div class="sec__head"><h2>Закреплённые</h2></div><div class="pins">${[
      'Мила',
      'Мама',
      'Продуктовая команда',
      'Дима (работа)',
    ]
      .slice(0, phone ? 4 : 4)
      .map((n, i) => `<div class="pinr">${av(n, `av--lg av--${i + 1}`)}<span>${n.split(' ')[0]}</span></div>`)
      .join('')}</div></section>
    <section class="sec"><div class="sec__head"><h2>Главное</h2><span class="hint">ноябрь, 1–8</span></div><div class="evs${phone ? ' evs--m' : ''}">
      ${event('sparkles', '3 412 сообщений в 14 чатах', 'Ваш месяц', pulse(40), '', 'ink')}
      ${event('refresh', 'С Милой +1 240 сообщений с прошлого отчёта', 'Мила', '', pill('Обновить отчёт', 'pill--sm'))}
      ${event('help', 'Мама угадала 4 из 5', 'Угадайка', '<div class="dots5"><i class="on"></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i></div>', '', 'lime')}
      ${event('sparkles', '5 000-е сообщение с Милой — через 10 дней', 'Круглые сообщения', '', '')}
      ${event('user', 'Дима — второй по переписке в этом месяце, отчёта нет', 'Ещё не разобран', '', pill('Разобрать', 'pill--sm'))}
    </div></section>
    <section class="sec"><div class="sec__head"><h2>Отчёты</h2></div><div class="tile rows">${REPORTS.map(
      (r) =>
        `<div class="li">${av(r.name, r.av)}<div class="li__main"><span class="li__title">${r.name}</span><span class="li__sub">${r.answer} · ${r.total}</span></div>${phone ? '' : `<div class="w200">${pulse(26)}</div>`}${ic('chevron')}</div>`,
    ).join('')}</div></section>`,
  )

/* ─── Б. Shelves ─────────────────────────────────────────────────────── */
const cover = (r) =>
  `<article class="cover tile tile--${r.tone}"><div class="cover__top">${av(r.name, `${r.av} av--sm`)}<span>${r.name}</span></div><div class="cover__num num">${r.total}</div><div class="cover__answer">${r.answer}</div>${pulse(24)}</article>`
const B = (phone) =>
  cabinet(
    phone,
    `<section class="tile tile--ink month"><div class="month__copy"><span class="q">Ваш ноябрь</span><span class="month__num num">3 412</span><span class="hint">сообщений в 14 личных чатах · вы пишете 47%</span></div>${
      phone
        ? ''
        : `<div class="month__people">${MONTH.slice(0, 3)
            .map(
              ([n, a, c]) => `<div class="mp2">${av(n, `${a} av--sm`)}<span>${n}</span><b class="num">${c}</b></div>`,
            )
            .join('')}</div>`
    }</section>
    <section class="sec"><div class="sec__head"><h2>Ваши отчёты</h2><a>Все 3</a></div><div class="shelf">${REPORTS.map(cover).join('')}<article class="cover cover--add tile">${ic('plus')}<span>Новый анализ</span></article></div></section>
    <section class="sec"><div class="sec__head"><h2>Ещё не разобраны</h2><span class="hint">по сообщениям за месяц</span></div><div class="shelf shelf--people">${MONTH.filter(
      (m) => !m[3],
    )
      .concat([
        ['Sofia Martins', '', 52, false],
        ['Катя', 'av--2', 31, false],
      ])
      .map(
        ([n, a, c]) =>
          `<div class="person">${av(n, `${a} av--xl`)}<span class="li__title">${n.split(' ')[0]}</span><span class="hint num">${c} за месяц</span>${pill('Разобрать', 'pill--sm')}</div>`,
      )
      .join('')}</div></section>`,
  )

/* ─── В. List and preview ────────────────────────────────────────────── */
const listRow = ([name, a, count, report], selected) =>
  `<div class="crow${selected ? ' on' : ''}">${av(name, a)}<div class="li__main"><span class="li__title">${name}</span><span class="li__sub">${report ? 'Отчёт · обновлён вчера' : `${count} за месяц · не разобран`}</span></div>${report ? '<span class="badge badge--lime">+1 240</span>' : ''}</div>`
const preview = `<section class="preview"><div class="preview__head">${av('Мила', 'av--1 av--xl')}<div class="li__main"><span class="t-h2x">Мила</span><span class="hint">март – ноябрь 2026 · отчёт от 3 октября</span></div></div>
  <div class="tile tile--ink"><span class="q">Сообщения</span><div class="figure num">4 800</div>${pulse(48)}</div>
  <div class="grid2"><div class="tile tile--lime"><span class="q">Кто пишет больше</span><div class="answer">На равных</div>${line(52, 48, '52%', '48%')}</div><div class="tile"><span class="q">Ответ</span><div class="answer">3 мин и 3 мин</div><span class="hint">отвечаете синхронно</span></div></div>
  <div class="tile since-mini"><span class="q">С прошлого анализа</span><span class="answer">+1 240 сообщений</span>${pill('Обновить', 'pill--sm', 'refresh')}</div>
  <div class="preview__actions">${pill('Открыть отчёт', 'pill--primary')}${pill('Итоги', '', 'sparkles')}${pill('Угадайка', '', 'help')}</div></section>`
const C = (phone) =>
  phone
    ? cabinet(
        true,
        `<div class="search">${ic('search')}<span>Поиск</span></div><div class="tile rows">${MONTH.map((m) => listRow(m, false)).join('')}</div>`,
      )
    : cabinet(
        false,
        `<div class="split2"><div class="clist"><div class="search">${ic('search')}<span>Поиск</span></div><div class="tile rows">${MONTH.map((m, i) => listRow(m, i === 0)).join('')}</div></div>${preview}</div>`,
        '',
      )

/* ─── Г. Inbox ───────────────────────────────────────────────────────── */
const task = (iconName, title, sub, action) =>
  `<div class="task"><span class="icon-box">${ic(iconName)}</span><div class="li__main"><span class="li__title">${title}</span><span class="li__sub">${sub}</span></div>${action}</div>`
const D = (phone) =>
  cabinet(
    phone,
    `<section class="sec"><div class="sec__head"><h2>Сейчас</h2><span class="badge">4</span></div><div class="tile rows">
      ${task('refresh', 'Мила: +1 240 сообщений', 'с отчёта 3 октября', pill('Обновить', 'pill--sm'))}
      ${task('help', 'Мама ответила на угадайку', '4 из 5 · вчера', pill('Смотреть', 'pill--sm'))}
      ${task('user', 'Дима (работа) не разобран', '612 сообщений за месяц — второй по переписке', pill('Разобрать', 'pill--sm'))}
      ${task('inbox', 'Ссылка на отчёт Милы закроется завтра', 'открыли 3 раза', pill('Продлить', 'pill--sm'))}
    </div></section>
    <section class="sec"><div class="sec__head"><h2>Отчёты</h2></div>${
      phone
        ? `<div class="tile rows">${REPORTS.map((r) => `<div class="li">${av(r.name, r.av)}<div class="li__main"><span class="li__title">${r.name}</span><span class="li__sub">${r.total} · ${r.answer}</span></div>${ic('chevron')}</div>`).join('')}</div>`
        : `<div class="tile table"><div class="tr th"><span>Чат</span><span>Сообщений</span><span>Кто пишет больше</span><span>Ответ</span><span>Обновлён</span></div>${REPORTS.map(
            (r) =>
              `<div class="tr"><span class="tc">${av(r.name, `${r.av} av--sm`)}${r.name}</span><span class="num">${r.total}</span><span>${line(r.split[0], r.split[1], `${r.split[0]}%`, `${r.split[1]}%`)}</span><span class="num">${r.reply}</span><span class="hint">${r.news ? `<span class="badge badge--lime">${r.news}</span>` : 'вчера'}</span></div>`,
          ).join('')}</div>`
    }</section>`,
  )

const frame = (cls, html) => `<div class="frame ${cls}">${html}</div>`
const SCREENS = { a: A, b: B, c: C, d: D }
document.querySelectorAll('[data-screen]').forEach((node) => {
  const draw = SCREENS[node.dataset.screen]
  node.innerHTML = frame('frame--wide', draw(false)) + frame('frame--phone', draw(true))
})
boot()
drawPulses()
