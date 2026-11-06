// Screens for pages-v1.html: every variant is one function drawn twice, at desktop and phone size.
/* global ICONS, rnd, boot */
Object.assign(ICONS, {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  monitor:
    '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  phone: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
  laptop:
    '<path d="M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z"/><path d="M20.054 15.987H3.946"/>',
  trash:
    '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:
    '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  chevdown: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  down: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
})
const ic = (name) => `<i data-icon="${name}"></i>`

/** Hairline pulse placeholder: drawn after layout at one tick per 3 px of its real width. */
const pulse = (_width, height) =>
  `<svg class="pulse-mini" data-h="${height}" preserveAspectRatio="none" style="height:${height}px"></svg>`
function drawPulses() {
  document.querySelectorAll('svg.pulse-mini[data-h]').forEach((svg) => {
    const n = Math.max(8, Math.floor(svg.getBoundingClientRect().width / 3))
    let lines = `<line class="axis" x1="0" x2="${n}" y1="50" y2="50"/>`
    for (let i = 0; i < n; i++) {
      if (rnd() < 0.08) continue
      const base = 0.35 + 0.45 * Math.abs(Math.sin(i * 0.11)) + rnd() * 0.25
      const up = Math.min(48, base * 46)
      const down = Math.min(48, base * (0.7 + rnd() * 0.5) * 44)
      lines += `<line class="u" x1="${i + 0.5}" x2="${i + 0.5}" y1="49" y2="${49 - up}"/><line class="t" x1="${i + 0.5}" x2="${i + 0.5}" y1="51" y2="${51 + down}"/>`
    }
    svg.setAttribute('viewBox', `0 0 ${n} 100`)
    svg.innerHTML = lines
  })
}

const CHATS = [
  ['Мила', 'av--1', '1 240', 'up', 'Пишете на равных', '4 800', 'март – ноябрь'],
  ['Мама', 'av--3', '612', 'up', 'Мама пишет больше', '2 140', 'май – ноябрь'],
  ['Продуктовая команда', 'av--5', '540', 'down', 'Активнее всех Артём', '7 901', 'группа · 2025 – 2026'],
  ['Артём', 'av--4', '214', 'up', 'Вы пишете больше', '1 320', 'июль – ноябрь'],
  ['Sofia', '', '96', 'down', 'Отвечаете синхронно', '840', 'август – ноябрь'],
]

/* ─── Shells ─────────────────────────────────────────────────────────── */
function cabinet(phone, active, bar, body) {
  if (phone)
    return `<div class="screen"><div class="phone-top"><i class="logo"></i><span class="grow">TG Analyzer</span><span class="av av--sm av--4">К</span></div><div class="content">${bar}${body}</div></div>`
  const item = (key, icon, label) => `<div class="side__item${active === key ? ' on' : ''}">${ic(icon)}${label}</div>`
  const chats = CHATS.slice(0, 4)
    .map(([name], i) => `<div class="side__item"><span class="dot dot--${i + 1}"></span>${name}</div>`)
    .join('')
  return `<div class="screen shell"><aside class="side"><div class="side__brand"><i></i>TG Analyzer</div>${item('home', 'home', 'Главная')}${item('new', 'plus', 'Новый анализ')}<div class="side__head">Отчёты</div>${chats}<div style="height:24px"></div>${item('account', 'user', 'Кирилл')}</aside><div class="content">${bar}${body}</div></div>`
}
function site(phone, body) {
  const nav = phone
    ? '<span class="pill pill--sm">Войти</span>'
    : '<span class="pill pill--ghost">Приватность</span><span class="pill pill--sm">Войти</span>'
  return `<div class="screen"><div class="phone-top"><i class="logo"></i><span class="grow">TG Analyzer</span>${nav}</div><div class="content">${body}</div></div>`
}
const bar = (title, lede, actions = '') =>
  `<div class="pbar"><div class="grow"><h1>${title}</h1>${lede ? `<div class="lede">${lede}</div>` : ''}</div>${actions}</div>`

/* ─── Home ───────────────────────────────────────────────────────────── */
const chartRows = (top = true) =>
  CHATS.map(
    ([name, av, count, trend], i) =>
      `<div class="li chart-row${top && i === 0 ? ' chart-row--top' : ''}"><span class="li__place">${i + 1}</span><span class="av av--sm ${av}">${name[0]}</span><div class="li__main"><span class="li__title">${name}</span><span class="li__sub">${['4 800', '2 140', '7 901', '1 320', '840'][i]} за всё время</span></div><span class="${trend}">${ic(trend)}</span><span class="li__value">${count}</span></div>`,
  ).join('')
const reportCard = ([name, av, , , answer, total, period], phone, poster = false, tone = '') =>
  `<article class="tile rcard${poster ? ' poster' : ''}${tone ? ` tile--${tone}` : ''}"><div class="rcard__head"><span class="av ${av}">${name[0]}</span><div class="li__main"><span class="li__title">${name}</span><span class="li__sub">${period}</span></div></div><div class="rcard__count">${total}<small>сообщений</small></div>${pulse(phone ? 300 : 300, poster ? 56 : 36)}<div class="rcard__answer">${answer}</div>${poster ? '' : '<div class="rcard__foot"><span>Обновлён 2 дня назад</span>' + ic('chevron') + '</div>'}</article>`

const HOME = {
  a: (phone) =>
    cabinet(
      phone,
      'home',
      bar('Главная', '', '<span class="pill pill--primary">' + ic('plus') + 'Новый анализ</span>'),
      `<section class="tile tile--ink"><div class="sec__head"><h2 class="q">Чарт месяца</h2><span class="badge">ноябрь</span></div><div class="list">${chartRows()}</div></section>
      <section class="tile tile--lime" style="flex-direction:row;align-items:center;gap:16px;padding:16px 24px"><div class="li__main"><span class="li__title">Ещё не разобран: Олег</span><span class="li__sub" style="color:var(--on-lime-muted)">1 240 сообщений за месяц — третье место в чарте</span></div><span class="pill">Разобрать</span></section>
      <section class="sec"><div class="sec__head"><h2>Отчёты</h2><a>Все 10</a></div><div class="grid3">${CHATS.slice(
        0,
        phone ? 2 : 3,
      )
        .map((c) => reportCard(c, phone))
        .join('')}</div></section>`,
    ),
  b: (phone) =>
    cabinet(
      phone,
      'home',
      bar('Главная', 'Ноябрь, 1–7', '<span class="pill pill--primary">' + ic('plus') + 'Новый анализ</span>'),
      `<div class="grid2" style="grid-template-columns:${phone ? '1fr' : '2fr 1fr'}">
        <section class="tile tile--ink"><h2 class="q">Сообщений в ноябре</h2><div class="figure num" style="font:var(--text-figure);letter-spacing:var(--tracking-figure)">3 412</div>${pulse(560, 56)}<dl class="fact-line facts" style="border-top-color:var(--border)"><div><dt>Против октября</dt><dd>+18%</dd></div><div><dt>Чатов с перепиской</dt><dd>14</dd></div></dl></section>
        <section class="tile tile--lime"><h2 class="q">Чаще всего — с Милой</h2><div class="figure num" style="font:var(--text-figure);letter-spacing:var(--tracking-figure)">36%</div><p class="small" style="margin-top:auto">1 240 из 3 412 сообщений месяца</p></section>
      </div>
      <div class="grid2">
        <section class="tile"><h2 class="q">Чарт месяца</h2><div class="list">${chartRows(false)}</div></section>
        <section class="tile"><h2 class="q">Ещё не разобраны</h2><div class="list">${[
          ['Олег', '1 240 за месяц'],
          ['Анна', '380 за месяц'],
          ['Бег по утрам', 'группа · 210 за месяц'],
          ['Катя', '96 за месяц'],
        ]
          .map(
            ([n, s], i) =>
              `<div class="li"><span class="av av--sm av--${(i % 4) + 2}">${n[0]}</span><div class="li__main"><span class="li__title">${n}</span><span class="li__sub">${s}</span></div><span class="pill pill--sm">Анализ</span></div>`,
          )
          .join('')}</div></section>
      </div>
      <section class="sec"><div class="sec__head"><h2>Отчёты</h2><a>Все 10</a></div><div class="tile" style="padding:8px 24px"><div class="list">${CHATS.map(
        ([name, av, , , answer, total, period]) =>
          `<div class="li"><span class="av ${av}">${name[0]}</span><div class="li__main"><span class="li__title">${name}</span><span class="li__sub">${answer} · ${period}</span></div>${phone ? '' : `<div style="width:220px">${pulse(220, 28)}</div>`}<span class="li__end">${total}</span>${ic('chevron')}</div>`,
      ).join('')}</div></div></section>`,
    ),
  c: (phone) =>
    cabinet(
      phone,
      'home',
      bar('Главная', '', '<span class="pill pill--primary">' + ic('plus') + 'Новый анализ</span>'),
      `<section class="sec"><div class="sec__head"><h2>Чарт месяца</h2><a>ноябрь</a></div><div class="grid4" style="grid-template-columns:repeat(${phone ? 2 : 5},minmax(0,1fr))">${CHATS.slice(
        0,
        phone ? 4 : 5,
      )
        .map(
          ([name, av, count, trend], i) =>
            `<div class="tile${i === 0 ? ' tile--ink' : ''}" style="gap:8px"><span class="caption" style="color:var(--text-muted)">${i + 1} место</span><span class="av ${av}">${name[0]}</span><span class="li__title">${name}</span><span class="rcard__count" style="font:var(--text-h2)">${count} <span class="${trend}">${ic(trend)}</span></span></div>`,
        )
        .join('')}</div></section>
      <section class="sec"><div class="sec__head"><h2>Отчёты</h2><a>Все 10</a></div><div class="grid3">${CHATS.slice(
        0,
        phone ? 2 : 3,
      )
        .map((c, i) => reportCard(c, phone, true, i === 0 ? 'lime' : ''))
        .join('')}</div></section>
      <section class="tile tile--grey" style="flex-direction:row;align-items:center;gap:16px"><div class="li__main"><span class="li__title">Олег, Анна и ещё 12 чатов не разобраны</span><span class="li__sub">Отчёт по каждому — за минуту</span></div><span class="pill">Выбрать</span></section>`,
    ),
}

/* ─── Privacy ────────────────────────────────────────────────────────── */
const FACTS = [
  ['eye', 'Читаем', 'Сообщения выбранного чата — только во время разбора и только в памяти сервера.'],
  ['database', 'Храним', 'Готовую статистику: числа, часы, частые слова и эмодзи. Из неё нельзя собрать переписку.'],
  [
    'eyeoff',
    'Не храним',
    'Тексты сообщений, фото, голосовые и файлы. Пароль двухэтапной проверки сразу уходит в Telegram.',
  ],
  ['ban', 'Не делаем', 'Не пишем от вашего имени, не читаем другие чаты и не передаём данные третьим лицам.'],
]
const QUESTIONS = [
  'Это безопасно?',
  'Собеседник узнает об отчёте?',
  'Что вы храните?',
  'Сколько это стоит?',
  'Почему вход через номер телефона?',
]
const qa = () =>
  `<div class="tile" style="padding:8px 24px"><div class="qa">${QUESTIONS.map((q) => `<div>${q}${ic('chevdown')}</div>`).join('')}</div></div>`
const controls = () =>
  `<div class="grid2"><div class="tile"><div class="rcard__head"><span class="icon-box">${ic('power')}</span><h3 class="q">Отключить нас</h3></div><p class="hint">Telegram → Настройки → Устройства → TG Analyzer → Завершить сеанс. Или «Выйти» в аккаунте.</p></div><div class="tile"><div class="rcard__head"><span class="icon-box">${ic('trash')}</span><h3 class="q">Удалить всё</h3></div><p class="hint">Аккаунт → «Выйти и удалить отчёты». Стираем сразу, без корзины.</p></div></div>`

const PRIVACY = {
  a: (phone) =>
    site(
      phone,
      `<div class="statement"><h1>Тексты ваших переписок у нас не остаются</h1><p>Мы читаем один выбранный чат, считаем числа и сохраняем только их. Ниже — что именно происходит с каждым видом данных.</p></div>
      <section class="tile"><table class="ledger"><thead><tr><th>Данные</th><th>Читаем</th><th>Храним</th>${phone ? '' : '<th>Сколько</th>'}</tr></thead><tbody>${[
        ['Тексты сообщений', 'yes:в памяти', 'no:нет', 'пока идёт разбор'],
        ['Фото, голосовые, файлы', 'no:нет', 'no:нет', '—'],
        ['Числа отчёта', 'yes:считаем', 'yes:да', 'пока не удалите'],
        ['Другие чаты', 'no:нет', 'no:нет', '—'],
        ['Пароль 2FA', 'no:сразу в Telegram', 'no:нет', '—'],
      ]
        .map(
          ([what, read, keep, long]) =>
            `<tr><td>${what}</td><td class="${read.split(':')[0]}">${read.split(':')[1]}</td><td class="${keep.split(':')[0]}">${keep.split(':')[1]}</td>${phone ? '' : `<td class="no">${long}</td>`}</tr>`,
        )
        .join('')}</tbody></table></section>
      <section class="sec"><h2>Ваши кнопки</h2>${controls(phone)}</section>
      <section class="sec"><h2>Частые вопросы</h2>${qa()}</section>`,
    ),
  b: (phone) =>
    site(
      phone,
      `<div class="statement"><h1>Приватность</h1><p>Путь вашего чата от входа до отчёта — и где на нём остаётся текст.</p></div>
      <div class="two-col"><nav class="toc-side"><span class="on">Путь чата</span><span>Ваши кнопки</span><span>Частые вопросы</span><span>Полная политика</span></nav>
      <div style="display:grid;gap:32px"><section class="tile"><div class="steps">${[
        ['Вход через Telegram', 'Официальный вход по коду, как в любое приложение Telegram.', ''],
        ['Вы выбираете один чат', 'Другие чаты мы не открываем.', ''],
        ['Читаем его в памяти сервера', 'Тексты не пишутся на диск и в базу.', ''],
        ['Сохраняем только числа', 'Часы, доли, частые слова и эмодзи — это и есть отчёт.', 'lime'],
        ['Текст исчезает', 'Как только разбор закончен, в памяти ничего не остаётся.', ''],
      ]
        .map(([h, p, cls]) => `<div class="step ${cls}"><div><h3>${h}</h3><p>${p}</p></div></div>`)
        .join('')}</div></section>
      <section class="sec"><h2>Ваши кнопки</h2>${controls(phone)}</section>
      <section class="sec"><h2>Частые вопросы</h2>${qa()}</section></div></div>`,
    ),
  c: (phone) =>
    site(
      phone,
      `<div class="statement"><h1>Приватность и вопросы</h1><p>Коротко и без мелкого шрифта. <span class="link">Полная политика</span></p></div>
      <div class="grid2" style="grid-template-columns:${phone ? '1fr' : '1.2fr 1fr'}">
        <section class="tile tile--ink" style="justify-content:space-between;min-height:${phone ? 0 : 280}px"><span class="icon-box">${ic('eyeoff')}</span><div><h2 class="answer">Тексты, фото и голосовые мы не храним</h2><p class="hint" style="margin-top:8px">Пароль двухэтапной проверки сразу уходит в Telegram. Остаётся только статистика.</p></div></section>
        <div class="grid2" style="grid-template-columns:1fr">${FACTS.filter((f) => f[1] !== 'Не храним')
          .map(
            ([icon, t, p]) =>
              `<div class="tile" style="flex-direction:row;gap:16px"><span class="icon-box">${ic(icon)}</span><div class="li__main"><h3 class="q">${t}</h3><p class="hint">${p}</p></div></div>`,
          )
          .join('')}</div>
      </div>
      <section class="sec"><h2>Ваши кнопки</h2>${controls(phone)}</section>
      <section class="sec"><h2>Частые вопросы</h2>${qa()}</section>`,
    ),
}

/* ─── Account ────────────────────────────────────────────────────────── */
const DEVICES = [
  ['laptop', 'Chrome · Windows', 'Тбилиси · это устройство', true],
  ['phone', 'Safari · iPhone', 'Тбилиси · 2 дня назад', false],
  ['monitor', 'Яндекс Браузер · macOS', 'Москва · 3 недели назад', false],
]
const deviceRows = () =>
  DEVICES.map(
    ([icon, name, sub, now]) =>
      `<div class="li"><span class="icon-box">${ic(icon)}</span><div class="li__main"><span class="li__title">${name}</span><span class="li__sub${now ? ' device-now' : ''}">${sub}</span></div>${now ? '<span class="badge badge--ok">сейчас</span>' : '<span class="pill pill--sm">Завершить</span>'}</div>`,
  ).join('')
const devicesCard = () =>
  `<div class="tile" style="padding:8px 24px 16px"><div class="list">${deviceRows()}</div><span class="pill pill--danger" style="justify-self:start">Завершить все, кроме этого</span></div>`
const telegramCard = () =>
  `<div class="tile" style="padding:8px 24px"><div class="list"><div class="li"><span class="icon-box">${ic('send')}</span><div class="li__main"><span class="li__title">Сеанс в Telegram</span><span class="li__sub">«TG Analyzer» в Настройки → Устройства · с 29 октября</span></div><span class="badge badge--ok">подключён</span></div><div class="li"><div class="li__main"><span class="li__title">Отключаться после анализа</span><span class="li__sub">Сеанс в Telegram завершится, когда отчёт готов</span></div><span class="switch"></span></div><div class="li"><div class="li__main"><span class="li__title">Сообщить в боте</span><span class="li__sub">Напишем в @tganalyzer_bot, когда отчёт готов</span></div><span class="switch on"></span></div></div></div>`
const lookCard = () =>
  `<div class="tile" style="padding:8px 24px"><div class="list"><div class="li"><span class="li__title" style="flex:1">Язык</span><span class="segs"><span class="on">Русский</span><span>English</span></span></div><div class="li"><span class="li__title" style="flex:1">Тема</span><span class="segs"><span class="on">Авто</span><span>Светлая</span><span>Тёмная</span></span></div><div class="li"><div class="li__main"><span class="li__title">Часовой пояс</span><span class="li__sub">По нему считаем часы в отчётах</span></div><span class="li__end">Москва, UTC+3</span></div></div></div>`
const dataCard = () =>
  `<div class="tile" style="padding:8px 24px"><div class="list"><div class="li"><span class="li__title" style="flex:1">Отчёты</span><span class="li__end">10</span>${ic('chevron')}</div><div class="li"><span class="li__title" style="flex:1">Тексты сообщений</span><span class="li__end">Не храним</span></div><div class="li"><span class="li__title" style="flex:1">Как мы обращаемся с данными</span>${ic('chevron')}</div></div></div>`
const profile = () =>
  `<div class="profile"><span class="av av--4">К</span><div><h2>Кирилл</h2><p>@bbkirusha · +7 ••• •• 12 34</p></div></div>`
const exits = () =>
  `<div style="display:flex;flex-wrap:wrap;gap:8px"><span class="pill">${ic('logout')}Выйти</span><span class="pill pill--danger">${ic('trash')}Выйти и удалить отчёты</span></div><p class="note-line">«Выйти» завершает сеанс в Telegram, отчёты остаются. Удаление — сразу и без корзины.</p>`
const group = (label, card) => `<div class="groups"><span class="group-label">${label}</span>${card}</div>`

const ACCOUNT = {
  a: (phone) =>
    cabinet(
      phone,
      'account',
      bar('Аккаунт', ''),
      `${profile()}<div class="grid2" style="align-items:start">${group('Устройства', devicesCard())}${group('Telegram', telegramCard())}${group('Оформление', lookCard())}${group('Данные', dataCard())}</div>${exits()}`,
    ),
  b: (phone) =>
    cabinet(
      phone,
      'account',
      bar('Аккаунт', phone ? '' : 'Кирилл · @bbkirusha'),
      phone
        ? `${profile()}<div class="tile" style="padding:8px 24px"><div class="list">${[
            ['laptop', 'Устройства', '3'],
            ['send', 'Telegram', 'подключён'],
            ['sun', 'Оформление', 'Русский · Авто'],
            ['database', 'Данные', '10 отчётов'],
          ]
            .map(
              ([i, t, v]) =>
                `<div class="li"><span class="icon-box">${ic(i)}</span><span class="li__title" style="flex:1">${t}</span><span class="li__end">${v}</span>${ic('chevron')}</div>`,
            )
            .join('')}</div></div>${exits()}`
        : `<div class="two-col"><nav class="settings-nav"><span>${ic('user')}Профиль</span><span class="on">${ic('laptop')}Устройства</span><span>${ic('send')}Telegram</span><span>${ic('sun')}Оформление</span><span>${ic('database')}Данные</span></nav><div style="display:grid;gap:16px"><div class="sec__head"><h2>Устройства</h2></div><p class="note-line">Где открыт TG Analyzer. Завершите сеанс, если устройство не ваше.</p>${devicesCard()}</div></div>`,
    ),
  c: (phone) =>
    cabinet(
      phone,
      'account',
      bar('Аккаунт', ''),
      `${profile()}<div class="grid3"><div class="tile stat"><b>10</b><span>отчётов</span></div><div class="tile tile--lime stat"><b>Не храним</b><span>тексты сообщений</span></div><div class="tile stat"><b>3</b><span>устройства</span></div></div>
      <section class="sec"><h2>Устройства</h2>${devicesCard()}</section>
      <div class="grid2" style="align-items:start"><section class="sec"><h2>Telegram</h2>${telegramCard()}</section><section class="sec"><h2>Оформление</h2>${lookCard()}</section></div>${exits()}`,
    ),
}

const SCREENS = { home: HOME, privacy: PRIVACY, account: ACCOUNT }
document.querySelectorAll('[data-screen]').forEach((node) => {
  const [page, variant] = node.dataset.screen.split('-')
  const draw = SCREENS[page][variant]
  node.innerHTML = `<div class="frame frame--wide">${draw(false)}</div><div class="frame frame--phone">${draw(true)}</div>`
})
boot()
drawPulses()
