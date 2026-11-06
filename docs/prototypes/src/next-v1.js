// Screens for next-v1.html: the first wave after the 07.11 discussion. Helpers (ICONS, icon, rnd, line, boot) come from report-v2.js.
/* global ICONS, icon, rnd, line, boot */
Object.assign(ICONS, {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  down: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  external:
    '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  sparkles:
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  sticker:
    '<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/><path d="M8 13h.01"/><path d="M16 13h.01"/><path d="M10 16s.8 1 2 1c1.3 0 2-1 2-1"/>',
  text: '<path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/>',
})
const ic = (name) => `<i data-icon="${name}"></i>`
const me = (cls = '') => `<span class="pav pav--me ${cls}">Я</span>`
const mila = (cls = '') => `<span class="pav ${cls}">М</span>`
const btn = (label, kind = '', iconName = '') =>
  `<span class="pill ${kind}">${iconName ? ic(iconName) : ''}${label}</span>`

/* ─── Pulse with chapters ────────────────────────────────────────────── */
// Weekly volume of the demo chat: a slow start, a peak in May–June, an even summer and a busier autumn.
const CHAPTERS = [
  { weeks: 7, level: [0.25, 0.55], name: 'Начало', when: 'март – апрель' },
  { weeks: 9, level: [0.85, 1], name: 'Самый активный период', short: 'Пик', when: 'май – июнь' },
  { weeks: 12, level: [0.5, 0.6], name: 'Ровный ход', short: 'Ровно', when: 'июль – сентябрь' },
  { weeks: 6, level: [0.7, 0.8], name: 'Снова чаще', when: 'октябрь – ноябрь' },
]
const WEEKS = CHAPTERS.reduce((sum, c) => sum + c.weeks, 0)
const pulseSvg = (height) =>
  `<svg class="pulse-mini" data-chapters data-h="${height}" preserveAspectRatio="none" style="height:${height}px"></svg>`
function drawPulses() {
  document.querySelectorAll('svg[data-chapters]').forEach((svg) => {
    const n = Math.max(WEEKS, Math.floor(svg.getBoundingClientRect().width / 3))
    let lines = `<line class="axis" x1="0" x2="${n}" y1="50" y2="50"/>`
    let start = 0
    CHAPTERS.forEach(({ weeks, level: [from, to] }) => {
      const span = Math.round((weeks / WEEKS) * n)
      for (let i = 0; i < span; i++) {
        const x = start + i + 0.5
        const lv = from + ((to - from) * i) / span
        const up = Math.min(48, lv * (0.7 + rnd() * 0.35) * 46)
        const down = Math.min(48, lv * (0.65 + rnd() * 0.35) * 44)
        lines += `<line class="u" x1="${x}" x2="${x}" y1="49" y2="${49 - up}"/><line class="t" x1="${x}" x2="${x}" y1="51" y2="${51 + down}"/>`
      }
      start += span
    })
    svg.setAttribute('viewBox', `0 0 ${n} 100`)
    svg.innerHTML = lines
  })
}
const chapters = (phone) =>
  phone
    ? `<div class="chap-marks">${CHAPTERS.map((c, i) => `<span style="flex-grow:${c.weeks}"><b>${i + 1}</b></span>`).join('')}</div><ol class="chap-list">${CHAPTERS.map((c, i) => `<li><b>${i + 1}</b><span>${c.name}</span><small>${c.when}</small></li>`).join('')}</ol>`
    : `<div class="chaps">${CHAPTERS.map((c) => `<div style="flex-grow:${c.weeks}"><span>${c.short ?? c.name}</span><small>${c.when}</small></div>`).join('')}</div>`

/* ─── Shells ─────────────────────────────────────────────────────────── */
const SIDE_CHATS = ['Мила', 'Мама', 'Продуктовая команда']
function cabinet(phone, body, { title = '', active = '', reportBar = false } = {}) {
  const rbar = reportBar
    ? `<div class="rbar"><span class="round">${ic('arrow-left')}</span>${mila('pav--lg')}<b class="grow">Мила</b>${
        phone ? '' : '<div class="segs"><span class="on">Вы двое</span><span>Время</span><span>О чём</span></div>'
      }${btn(phone ? '' : 'Поделиться', 'pill--primary', 'share')}</div>${
        phone
          ? '<div class="segs segs--full"><span class="on">Вы двое</span><span>Время</span><span>О чём</span></div>'
          : ''
      }`
    : title
      ? `<div class="pbar"><div class="grow"><h1>${title}</h1></div></div>`
      : ''
  if (phone) return `<div class="screen"><div class="content">${rbar}${body}</div></div>`
  const item = (key, iconName, label) =>
    `<div class="side__item${active === key ? ' on' : ''}">${ic(iconName)}${label}</div>`
  const chats = SIDE_CHATS.map(
    (name, i) =>
      `<div class="side__item${active === name ? ' on' : ''}"><span class="dot dot--${i + 1}"></span>${name}</div>`,
  ).join('')
  return `<div class="screen shell"><aside class="side"><div class="side__brand"><i></i>TG Analyzer</div>${item('home', 'home', 'Главная')}${item('new', 'plus', 'Новый анализ')}<div class="side__head">Отчёты</div>${chats}</aside><div class="content">${rbar}${body}</div></div>`
}
function site(phone, body, cta = 'Сделать свой отчёт') {
  return `<div class="screen"><div class="phone-top"><i class="logo"></i><span class="grow">TG Analyzer</span>${btn(cta, 'pill--sm')}</div><div class="content">${body}</div></div>`
}

/* ─── 1. Since last time + chapters ──────────────────────────────────── */
const legend = '<span class="keys"><span class="key">Вы</span><span class="key key--them">Мила</span></span>'
function hero(phone, factsSince) {
  const facts = factsSince
    ? `<dl class="facts facts--ink"><div><dt>С 3 октября</dt><dd>+1 240 сообщений</dd></div><div><dt>Ваш ответ</dt><dd>5 → 3 мин</dd></div>${phone ? '' : '<div><dt>Начинаете вы</dt><dd>44 → 51%</dd></div>'}</dl>`
    : `<dl class="facts facts--ink"><div><dt>Самый активный месяц</dt><dd>май 2026</dd></div><div><dt>Последние 3 месяца</dt><dd>Чаще</dd></div></dl>`
  return `<div class="hero-row${phone ? ' hero-row--m' : ''}">
    <section class="tile tile--ink"><div class="tile__head"><span class="q">Сообщения</span>${legend}</div><div class="figure num">4 800</div>${pulseSvg(phone ? 48 : 64)}${chapters(phone)}${facts}</section>
    <section class="tile tile--lime"><span class="q">Кто пишет больше</span><div class="answer">Пишете на равных</div><div class="figure num">52 / 48</div>${line(52, 48, '2 491', '2 309')}</section>
  </div>`
}
const delta = (label, value, before, dir) =>
  `<div class="delta"><span class="delta__label">${label}</span><span class="delta__value num">${dir ? `<span class="delta__dir">${ic(dir)}</span>` : ''}${value}</span><span class="delta__before">${before}</span></div>`
const sinceStrip = (phone) =>
  `<section class="tile since${phone ? ' since--m' : ''}"><div class="since__head"><span class="q">С прошлого анализа</span><span class="hint">3 октября → сегодня</span></div><div class="since__cells">
    ${delta('Новых сообщений', '+1 240', 'было 3 560', '')}
    ${delta('Вы отвечаете быстрее', '3 мин', 'было 5 мин', 'down')}
    ${delta('Разговор чаще начинаете вы', '51%', 'было 44%', 'up')}
  </div></section>`
const duelPeek = `<h2 class="part-title">Вы двое</h2>`
const SINCE = {
  a: (phone) => cabinet(phone, hero(phone, true) + duelPeek, { active: 'Мила', reportBar: true }),
  b: (phone) => cabinet(phone, hero(phone, false) + sinceStrip(phone) + duelPeek, { active: 'Мила', reportBar: true }),
}
const chatRows = `<div class="tile chatrows"><div class="li"><span class="av av--1">М</span><div class="li__main"><span class="li__title">Мила</span><span class="li__sub"><span class="badge badge--lime">+1 240 новых</span> отчёт от 3 октября</span></div>${btn('Обновить', 'pill--sm', 'refresh')}</div><div class="li"><span class="av av--3">М</span><div class="li__main"><span class="li__title">Мама</span><span class="li__sub">Обновлён вчера · новых нет</span></div>${btn('Открыть', 'pill--sm')}</div></div>`

/* ─── 2. Milestones ──────────────────────────────────────────────────── */
const MILESTONES = [
  { n: '1-е', date: '12 марта', who: 'mila', what: ['sticker', 'Стикер 👋'] },
  { n: '100-е', date: '19 марта', who: 'me', what: ['text', '9 слов'] },
  { n: '1 000-е', date: '24 мая', who: 'me', what: ['mic', 'Голосовое 0:42'] },
  { n: '5 000-е', date: 'около 16 ноября', next: true },
]
const milestoneCard = (phone) => {
  const items = MILESTONES.map(
    (m) =>
      `<li class="ms${m.next ? ' ms--next' : ''}"><span class="ms__dot"></span><b class="ms__n num">${m.n}</b><span class="ms__date">${m.date}</span>${
        m.next
          ? '<span class="ms__what">Через ~9 дней при нынешнем темпе</span>'
          : `<span class="ms__who">${m.who === 'me' ? me('pav--sm') + 'Вы' : mila('pav--sm') + 'Мила'}</span><span class="ms__what">${ic(m.what[0])}${m.what[1]}</span><span class="ms__link">${ic('external')}Открыть в Telegram</span>`
      }</li>`,
  ).join('')
  return `<section class="tile tile--ink ms-card${phone ? ' ms-card--m' : ''}"><span class="q">Круглые сообщения</span><div class="answer">Следующее — 5 000-е, примерно через 9 дней</div><ol class="ms-track">${items}</ol></section>`
}

/* ─── 3. Share dialog ────────────────────────────────────────────────── */
const option = (iconName, title, sub, extra = '') =>
  `<div class="opt"><span class="icon-box">${ic(iconName)}</span><div class="li__main"><span class="li__title">${title}</span><span class="li__sub">${sub}</span>${extra}</div>${ic('chevron')}</div>`
const shareChoose = `<div class="sheet__head"><h3>Поделиться</h3><span class="round">${ic('x')}</span></div>
  <div class="opts">
    ${option('sparkles', '«Итоги»', '7 слайдов о вашей переписке — посмотреть, сохранить картинками')}
    ${option('link', 'Ссылка на отчёт', 'Откроется без входа. Вы решаете, что в ней видно', '<span class="badge badge--ok">Включена · до 14 ноября</span>')}
    ${option('help', 'Угадайка для Милы', '5 вопросов «кто больше» — знает ли Мила вашу переписку', '<span class="badge badge--lime">Мила угадала 4 из 5</span>')}
  </div>
  <p class="sheet__note">${ic('lock')}В ссылках нет текстов сообщений — их нет и у нас.</p>`
const toggle = (label, sub, on) =>
  `<div class="li"><div class="li__main"><span class="li__title">${label}</span><span class="li__sub">${sub}</span></div><span class="switch${on ? ' on' : ''}"></span></div>`
const shareLink = `<div class="sheet__head"><span class="round">${ic('arrow-left')}</span><h3>Ссылка на отчёт</h3></div>
  <div class="list">
    ${toggle('Имя собеседника', 'Выключено — в отчёте будет «Собеседник»', false)}
    ${toggle('Слова и эмодзи', 'Часть «О чём» целиком', false)}
    ${toggle('Стикеры и реакции', 'Картинки стикеров и счёт реакций', true)}
  </div>
  <div class="field-row"><span class="li__title">Срок</span><div class="segs"><span class="on">7 дней</span><span>30 дней</span><span>Без срока</span></div></div>
  <div class="linkbox"><span class="num">tganalyzer.app/r/k3F9xQ</span>${btn('Копировать', 'pill--primary pill--sm', 'copy')}</div>
  <span class="danger-link">Отключить ссылку</span>`
const SHARE = (phone) =>
  phone
    ? null
    : `<div class="screen dim"><div class="dim__page">${hero(false, false)}</div><div class="dialog">${shareChoose}</div><div class="dialog dialog--second">${shareLink}</div></div>`
const sharePhone = (body) =>
  `<div class="screen dim dim--m"><div class="dim__page">${hero(true, false)}</div><div class="sheet">${body}</div></div>`

/* ─── 4. Quiz for the other person ───────────────────────────────────── */
const quizTop = (step) =>
  `<div class="qz__top"><span class="hint">Кирилл разобрал вашу переписку</span><div class="qz__steps">${[1, 2, 3, 4, 5].map((i) => `<i class="${i < step ? 'done' : i === step ? 'on' : ''}"></i>`).join('')}</div></div>`
const choice = (av, label, state = '') => `<div class="choice ${state}">${av}<span>${label}</span></div>`
const kirill = (cls = '') => `<span class="pav pav--me ${cls}">К</span>`
const you = (cls = '') => `<span class="pav ${cls}">Я</span>`
const QUIZ = [
  `${quizTop(2)}<section class="tile qz"><span class="hint">Вопрос 2 из 5</span><div class="answer">Кто чаще ставит реакцию ❤️?</div><div class="choices">${choice(kirill('pav--xl'), 'Кирилл')}${choice(you('pav--xl'), 'Вы')}</div></section><p class="sheet__note">${ic('lock')}Вы видите только счёт — ни одного сообщения.</p>`,
  `${quizTop(2)}<section class="tile tile--lime qz"><span class="hint">Вопрос 2 из 5 · верно</span><div class="answer">Вы — 74 против 61</div><div class="choices">${choice(kirill('pav--xl'), 'Кирилл', 'dim-choice')}${choice(you('pav--xl'), 'Вы', 'picked')}</div>${line(61, 74, '61', '74')}</section>${btn('Дальше', 'pill--primary pill--block')}`,
  `<section class="tile tile--ink qz"><span class="hint">Угадайка · вы и Кирилл</span><div class="figure num">4 из 5</div><div class="answer">Вы хорошо знаете вашу переписку</div><ol class="qz__list">${[
    ['Кто чаще пишет первым', 1],
    ['Кто чаще ставит ❤️', 1],
    ['Кто отвечает быстрее', 0],
    ['Кто записывает больше голосовых', 1],
    ['Кто чаще желает спокойной ночи', 1],
  ]
    .map(([q, ok]) => `<li><span class="${ok ? 'ok' : 'no'}">${ic(ok ? 'check' : 'x')}</span>${q}</li>`)
    .join(
      '',
    )}</ol></section>${btn('Разобрать свою переписку', 'pill--primary pill--block')}${btn('Отправить счёт Кириллу', 'pill--block', 'send')}`,
]

/* ─── 5. Public report ───────────────────────────────────────────────── */
const publicPage = (phone) =>
  site(
    phone,
    `<div class="pubbar">${ic('link')}<span>Отчёт Кирилла открыт по ссылке до 14 ноября. Имя собеседника скрыто, текстов сообщений нет.</span></div>
    <div class="rbar"><span class="pav pav--me pav--lg">К</span><b class="grow">Кирилл и собеседник</b></div>
    ${hero(phone, false).replaceAll('Мила', 'Собеседник').replace('key">Вы', 'key">Кирилл').replace('Пишете', 'Пишут')}
    <h2 class="part-title">Вы двое</h2>
    <div class="grid2"><section class="tile"><span class="q">Кто отвечает быстрее</span><div class="answer">Отвечают синхронно</div><div class="row-av">${kirill('pav--sm')}<span class="num">3 мин</span><span class="pav pav--sm">С</span><span class="num">3 мин</span></div></section><section class="tile tile--grey"><span class="q">Привычки</span>${line(51, 49, '51%', '49%')}<span class="hint">Начинают разговор по очереди</span></section></div>
    <section class="tile tile--grey cta"><div class="li__main"><span class="li__title">А как пишете вы?</span><span class="li__sub">Отчёт по любому чату за минуту. Тексты сообщений не сохраняем.</span></div>${btn('Сделать свой отчёт', 'pill--primary')}</section>`,
    'Войти',
  )

/* ─── 6. Story ───────────────────────────────────────────────────────── */
const slide = (tone, body, foot = true) =>
  `<div class="sl sl--${tone}">${body}${foot ? '<div class="sl__foot"><i class="logo"></i>tganalyzer.app</div>' : ''}</div>`
const SLIDES = [
  [
    'Обложка',
    slide(
      'ink',
      `<div class="sl__pair">${me()}${mila()}</div><div class="sl__kicker">Вы и Мила</div><div class="sl__title">Восемь месяцев переписки</div><div class="sl__sub">март – ноябрь 2026</div>${pulseSvg(56)}`,
    ),
  ],
  [
    'Одно число',
    slide(
      'lime',
      `<div class="sl__kicker">Каждый день</div><div class="sl__big num">22</div><div class="sl__title">сообщения в среднем</div><div class="sl__sub">222 дня подряд — ни одного пропуска</div>`,
    ),
  ],
  [
    'Вопрос',
    slide(
      'white',
      `<div class="sl__kicker">Угадайте</div><div class="sl__title">Кто чаще ставит реакцию ❤️?</div><div class="sl__choices">${choice(me('pav--lg'), 'Вы')}${choice(mila('pav--lg'), 'Мила')}</div><div class="sl__sub">Нажмите на ответ</div>`,
      false,
    ),
  ],
  [
    'Ответ',
    slide(
      'ink',
      `<div class="sl__kicker">Ответ</div><div class="sl__title">Мила</div><div class="sl__big num">74</div><div class="sl__sub">реакции ❤️ против ваших 61</div>${line(61, 74, '61', '74')}`,
    ),
  ],
  [
    'Ваше время',
    slide(
      'white',
      `<div class="sl__kicker">Ваше время</div><div class="clock"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" class="clock__ring"/><path class="clock__arc" d="M50 10 A40 40 0 0 1 84.64 30"/><text x="50" y="47" text-anchor="middle">00–03</text><text x="50" y="60" text-anchor="middle" class="s">пик</text></svg></div><div class="sl__title">После полуночи вы разговорчивее всего</div>`,
    ),
  ],
  [
    'Слово',
    slide(
      'ink',
      `<div class="sl__kicker">Слово вашей переписки</div><div class="sl__word">good</div><div class="sl__sub">200 раз за восемь месяцев</div>`,
    ),
  ],
  [
    'Постер',
    slide(
      'poster',
      `<div class="sl__pair">${me()}${mila()}</div><div class="sl__kicker">Вы и Мила · 2026</div><div class="sl__title">Восемь месяцев на связи</div>${pulseSvg(40)}<div class="post"><div class="post__cell post__cell--ink"><b class="num">4 800</b><span>сообщений</span></div><div class="post__cell post__cell--lime"><b class="num">222</b><span>дня подряд</span></div><div class="post__cell"><b class="num">3 мин</b><span>ответ</span></div><div class="post__cell"><b>good</b><span>слово года</span></div></div>`,
    ),
  ],
]

/* ─── 7. Card share ──────────────────────────────────────────────────── */
const reactionsCard = (withButton) =>
  `<section class="tile tile--lime"><div class="tile__head"><span class="q">Кто ставит реакции</span>${withButton ? `<span class="round round--sm">${ic('share')}</span>` : ''}</div><div class="answer">Мила — чуть щедрее</div>${line(46, 54, '238', '279')}<div class="emo-mini"><span>❤️ <b class="num">61 · 74</b></span><span>😂 <b class="num">50 · 58</b></span><span>👍 <b class="num">49 · 41</b></span></div></section>`
const cardPoster = `<div class="poster45"><div class="poster45__top"><div class="sl__pair">${me('pav--sm')}${mila('pav--sm')}</div><span>Вы и Мила</span></div>${reactionsCard(false)}<div class="poster45__foot"><i class="logo"></i>tganalyzer.app</div></div>`
const CARD = (phone) =>
  phone
    ? `<div class="screen"><div class="content">${reactionsCard(true)}<section class="tile"><span class="q">Кто говорит голосом</span><div class="answer">Говорите поровну</div>${line(52, 48, '1 ч 16 мин', '1 ч 11 мин')}</section></div></div>`
    : null
const cardSheet = `<div class="screen dim dim--m"><div class="dim__page"></div><div class="sheet sheet--tall"><div class="sheet__head"><h3>Карточка</h3><span class="round">${ic('x')}</span></div>${cardPoster}${btn('Сохранить картинку', 'pill--primary pill--block', 'download')}${btn('Отправить', 'pill--block', 'send')}</div></div>`

/* ─── 8. New analysis ────────────────────────────────────────────────── */
const PINNED = [
  ['Мила', 'av--1', 'Отчёт есть'],
  ['Мама', 'av--3', 'Разобрать'],
  ['Продуктовая команда', 'av--5', 'Разобрать'],
]
const startBlock = (phone) =>
  `<section class="tile pinned"><div class="tile__head"><span class="q">С кого начать</span><span class="hint">${ic('pin')}Закреплены у вас в Telegram</span></div><div class="pinned__row">${PINNED.map(
    ([name, av, action], i) =>
      `<div class="pin${i === 1 ? ' pin--busy' : ''}"><span class="av av--xl ${av}">${name[0]}</span><span class="li__title">${phone && name.length > 10 ? name.slice(0, 9) + '…' : name}</span>${i === 1 ? '<span class="hint">Читаем…</span>' : btn(action, 'pill--sm')}</div>`,
  ).join('')}</div></section>`
const YEARS = ['2023', '2024', '2025', '2026']
const reading = (phone) =>
  `<section class="tile tile--ink reading"><div class="tile__head"><span class="q">Читаем переписку с Мамой</span><span class="hint">ещё около минуты</span></div><div class="answer">Дошли до марта 2025</div><div class="timeline"><div class="timeline__fill" style="left:70%"></div><span class="timeline__head" style="left:70%"></span>${YEARS.map((y, i) => `<span class="timeline__year" style="left:${i * 31 + 2}%">${y}</span>`).join('')}</div><dl class="facts facts--ink"><div><dt>Прочитано</dt><dd class="num">3 700 сообщений</dd></div>${phone ? '' : '<div><dt>Самое раннее пока</dt><dd>4 марта 2025</dd></div>'}</dl><p class="sheet__note">${ic('send')}Можно закрыть вкладку — бот напишет, когда отчёт будет готов.</p></section>`
const restList = `<div class="search">${ic('search')}<span>Поиск чата Telegram</span></div><div class="tile chatrows">${[
  ['Артём Ковалёв', 'av--4', '3 дня назад'],
  ['Sofia Martins', '', '13 дней назад'],
  ['Дима (работа)', 'av--2', '7 часов назад'],
]
  .map(
    ([n, av, s]) =>
      `<div class="li"><span class="av ${av}">${n[0]}</span><div class="li__main"><span class="li__title">${n}</span><span class="li__sub">${s}</span></div>${btn('Анализ', 'pill--sm')}</div>`,
  )
  .join('')}</div>`
const START = (phone) =>
  cabinet(phone, startBlock(phone) + reading(phone) + restList, { title: 'Новый анализ', active: 'new' })

/* ─── Plan table ─────────────────────────────────────────────────────── */
const PLAN = [
  [
    '1',
    '«С прошлого раза» и главы',
    'Повод открыть отчёт снова. Данные уже есть.',
    'S–M',
    'Расширить снимок (JSON, без миграции); главы — чистая функция в shared',
  ],
  [
    '2',
    'Круглые сообщения',
    'Живой факт и прогноз следующей вехи.',
    'S',
    'Данные есть. Проверить ссылки на сообщения личных чатов',
  ],
  [
    '3',
    'Поделиться: ссылка и угадайка',
    'Рост: отчёт выходит за пределы аккаунта.',
    'M',
    'Таблица ссылок (миграция), публичный эндпоинт, срок и отзыв',
  ],
  [
    '4',
    '«Итоги» как рассказ',
    'Шеринг, который хочется досмотреть.',
    'M',
    'Переписать ReportStory; угадайка из derived.quiz',
  ],
  ['5', 'Поделиться карточкой', 'Делиться тем, что зацепило, а не всем отчётом.', 'S–M', 'html2canvas уже есть'],
  [
    '6',
    'С кого начать и живое чтение',
    'Первый анализ — нужному человеку, ожидание не пустое.',
    'S',
    'pinned в списке диалогов; дата самого раннего сообщения в прогрессе',
  ],
  [
    '—',
    'Версия отчёта 3 (без экрана)',
    'Основа для динамики и звонков.',
    'M',
    'Помесячные медианы ответа и инициативы, звонки. Один повторный анализ на всё',
  ],
]

/* ─── Render ─────────────────────────────────────────────────────────── */
const frame = (cls, html) => `<div class="frame ${cls}">${html}</div>`
const both = (draw) => frame('frame--wide', draw(false)) + frame('frame--phone', draw(true))
const RENDER = {
  'since-a': () => both(SINCE.a),
  'since-b': () => both(SINCE.b) + frame('frame--rows', chatRows),
  milestones: () => frame('frame--cw', milestoneCard(false)) + frame('frame--m', milestoneCard(true)),
  share: () =>
    frame('frame--wide', SHARE(false)) +
    frame('frame--phone frame--n1', sharePhone(shareChoose)) +
    frame('frame--phone frame--n2', sharePhone(shareLink)),
  quiz: () =>
    QUIZ.map((body, i) =>
      frame(
        `frame--phone frame--q${i + 1}`,
        `<div class="screen"><div class="phone-top"><i class="logo"></i><span class="grow">TG Analyzer</span></div><div class="content">${body}</div></div>`,
      ),
    ).join(''),
  public: () => both(publicPage),
  card: () => frame('frame--phone frame--c1', CARD(true)) + frame('frame--phone frame--c2', cardSheet),
  start: () => both(START),
}
document.querySelectorAll('[data-screen]').forEach((node) => {
  node.innerHTML = RENDER[node.dataset.screen]()
})
document.querySelector('[data-stories]').innerHTML = SLIDES.map(
  ([label, html], i) => `<figure class="story-frame"><figcaption>${i + 1}. ${label}</figcaption>${html}</figure>`,
).join('')
document.querySelector('[data-plan]').innerHTML =
  `<table class="ledger plan-table"><thead><tr><th></th><th>Что</th><th>Зачем</th><th>Сложность</th><th>Что нужно</th></tr></thead><tbody>${PLAN.map(
    (row) => `<tr>${row.map((cell, i) => (i === 1 ? `<td><b>${cell}</b></td>` : `<td>${cell}</td>`)).join('')}</tr>`,
  ).join('')}</tbody></table>`
boot()
drawPulses()
