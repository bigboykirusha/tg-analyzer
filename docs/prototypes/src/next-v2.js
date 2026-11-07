// Screens for next-v2.html: the share modal with links, the quiz end to end, the public report and
// «Итоги» as shareable cards. Helpers (ICONS, rnd, line, boot) come from report-v2.js.
/* global ICONS, rnd, line, boot */
Object.assign(ICONS, {
  chevron: '<path d="m9 18 6-6-6-6"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  share2:
    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  unlink:
    '<path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"/><path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"/><line x1="8" x2="8" y1="2" y2="5"/><line x1="2" x2="5" y1="8" y2="8"/><line x1="16" x2="16" y1="19" y2="22"/><line x1="19" x2="22" y1="16" y2="16"/>',
})
const ic = (name) => `<i data-icon="${name}"></i>`
const btn = (label, kind = '', iconName = '') =>
  `<span class="pill ${kind}">${iconName ? ic(iconName) : ''}${label}</span>`
const av = (letter, cls = '') => `<span class="pav ${cls}">${letter}</span>`
const me = (cls = '') => av('Я', `pav--me ${cls}`)
const mila = (cls = '') => av('М', cls)
const kirill = (cls = '') => av('К', `pav--me ${cls}`)
const you = (cls = '') => av('Я', cls)
const choice = (avatar, label, state = '') => `<div class="choice ${state}">${avatar}<span>${label}</span></div>`

/* ─── 1. Modal ───────────────────────────────────────────────────────── */
const preview = `<div class="mp"><span class="mp__bars"><i class="on"></i><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="mp__slide"><small>Вы и Мила</small><b class="num">4 800</b><small>сообщений</small></span></div>`
const row = (iconName, title, sub, extra = '', chevron = false) =>
  `<div class="mrow"><span class="icon-box">${ic(iconName)}</span><span class="mrow__copy"><span class="li__title">${title}</span><span class="li__sub">${sub}</span>${extra}</span>${chevron ? ic('chevron') : ''}</div>`
const head = (title, back = false) =>
  `<div class="sheet__head">${back ? `<span class="round">${ic('arrow-left')}</span>` : ''}<h3>${title}</h3><span class="round">${ic('x')}</span></div>`

const modalMain = (phone) =>
  `${head('Итоги: Мила')}<div class="mgrid${phone ? ' mgrid--m' : ''}">${phone ? '' : preview}<div class="mcol">
    <p class="hint">Слайды о вашей переписке — как сторис</p>
    ${btn('Смотреть итоги', 'pill--primary pill--block', 'play')}
    ${row('download', 'Сохранить картинками', '7 картинок 1080×1920')}
    ${row('share', 'Отправить', 'В Telegram или другое приложение')}
    <div class="mdiv"><span>По ссылке</span></div>
    ${row('link', 'Ссылка на отчёт', 'Открывается без входа · до 14 ноября', '<span class="badge badge--ok">Включена</span>', true)}
    ${row('help', 'Угадайка для Милы', 'Пять вопросов «кто из вас чаще»', '<span class="badge badge--lime">Мила угадала 4 из 5</span>', true)}
  </div></div>
  <p class="sheet__note">${ic('lock')}В ссылках нет текстов сообщений — их нет и у нас.</p>`

const toggle = (label, sub, on) =>
  `<div class="li"><div class="li__main"><span class="li__title">${label}</span><span class="li__sub">${sub}</span></div><span class="switch${on ? ' on' : ''}"></span></div>`
const modalLink = `${head('Ссылка на отчёт', true)}
  <div class="list">
    ${toggle('Имя Милы', 'Выключено — в отчёте будет «Собеседник»', false)}
    ${toggle('Слова и эмодзи', 'Часть «О чём» целиком', false)}
    ${toggle('Стикеры и реакции', 'Картинки стикеров и счёт реакций', true)}
  </div>
  <div class="field-row"><span class="li__title">Срок</span><div class="segs"><span class="on">7 дней</span><span>30 дней</span><span>Без срока</span></div></div>
  <div class="linkbox"><span class="num">tganalyzer.app/r/k3F9xQ</span>${btn('Копировать', 'pill--primary pill--sm', 'copy')}</div>
  <div class="mfoot"><span class="hint">Открыли 3 раза</span><span class="danger-link">Отключить ссылку</span></div>`

const QUESTIONS = [
  ['Кто чаще пишет первым', true],
  ['Кто чаще ставит ❤️', true],
  ['Кто записывает больше голосовых', true],
  ['Кто чаще желает спокойной ночи', true],
  ['Кто чаще смеётся', true],
  ['Кто отвечает быстрее', false, 'Почти поровну — не спрашиваем'],
]
const modalQuizA = `${head('Угадайка для Милы', true)}
  <p class="hint">Мила выбирает, кто из вас чаще — вы или она. Ответ видит сразу после выбора. Счёт придёт вам, если она согласится.</p>
  <div class="list qlist">${QUESTIONS.map(
    ([q, on, note]) =>
      `<div class="li${on ? '' : ' li--off'}"><div class="li__main"><span class="li__title">${q}</span>${note ? `<span class="li__sub">${note}</span>` : ''}</div>${on ? '<span class="switch on"></span>' : ''}</div>`,
  ).join('')}</div>
  <div class="field-row"><span class="li__title">Ответить до</span><div class="segs"><span class="on">7 дней</span><span>30 дней</span></div></div>
  ${btn('Отправить Миле в Telegram', 'pill--primary pill--block', 'send')}
  ${btn('Копировать ссылку', 'pill--block', 'copy')}`
const modalQuizB = `${head('Угадайка для Милы', true)}
  <div class="qready"><b class="num">5</b><span>вопросов готовы: кто чаще пишет первым, ставит ❤️, записывает голосовые, желает спокойной ночи и смеётся</span></div>
  ${btn('Отправить Миле в Telegram', 'pill--primary pill--block', 'send')}
  ${btn('Копировать ссылку', 'pill--block', 'copy')}
  <p class="sheet__note">${ic('lock')}Мила увидит только эти пять вопросов и счёт.</p>`
const modalQuizDone = `${head('Угадайка для Милы', true)}
  <div class="qscore"><span class="figure num">4 из 5</span><span class="hint">Мила ответила 7 ноября</span></div>
  <ol class="qz__list qz__list--plain">${[
    ['Кто чаще пишет первым', 1, 'Вы, 51%'],
    ['Кто чаще ставит ❤️', 1, 'Мила, 74 против 61'],
    ['Кто записывает больше голосовых', 0, 'Вы, 41 против 33'],
    ['Кто чаще желает спокойной ночи', 1, 'Вы, 65 против 61'],
    ['Кто чаще смеётся', 1, 'Вы, 57 против 55'],
  ]
    .map(
      ([q, ok, a]) =>
        `<li><span class="${ok ? 'ok' : 'no'}">${ic(ok ? 'check' : 'x')}</span><span class="qz__q">${q}<small>${a}</small></span></li>`,
    )
    .join('')}</ol>
  ${btn('Новая угадайка', 'pill--block')}
  <div class="mfoot"><span class="hint">Ссылка работает до 14 ноября</span><span class="danger-link">Удалить</span></div>`

const desktopModal = (body, wide = false) =>
  `<div class="screen dim"><div class="dim__page dim__page--blank"></div><div class="dialog${wide ? ' dialog--wide' : ''} dialog--center">${body}</div></div>`
const phoneSheet = (body) =>
  `<div class="screen dim dim--m"><div class="dim__page dim__page--blank"></div><div class="sheet">${body}</div></div>`

/* ─── 3. Guest ───────────────────────────────────────────────────────── */
const guestTop = `<div class="phone-top"><i class="logo"></i><span class="grow">TG Analyzer</span></div>`
const steps = (step) =>
  `<div class="qz__steps">${[1, 2, 3, 4, 5].map((i) => `<i class="${i < step ? 'done' : i === step ? 'on' : ''}"></i>`).join('')}</div>`
const GUEST = [
  [
    'Приглашение',
    `<section class="tile tile--ink qz"><div class="sl__pair">${kirill('pav--lg')}${you('pav--lg')}</div><span class="hint">Кирилл разобрал вашу переписку в Telegram</span><div class="answer">Угадаете, кто из вас чаще?</div><span class="hint">5 вопросов · меньше минуты</span></section>${btn('Начать', 'pill--primary pill--block')}<p class="sheet__note">${ic('lock')}Это игра по статистике переписки: здесь нет ни одного сообщения. Ссылка работает до 14 ноября.</p>`,
  ],
  [
    'Вопрос',
    `<div class="qz__top"><span class="hint">Вопрос 2 из 5</span>${steps(2)}</div><section class="tile qz"><div class="answer">Кто чаще ставит реакцию ❤️?</div><div class="choices">${choice(kirill('pav--xl'), 'Кирилл')}${choice(you('pav--xl'), 'Вы')}</div></section>`,
  ],
  [
    'Ответ',
    `<div class="qz__top"><span class="hint">Вопрос 2 из 5 · верно</span>${steps(2)}</div><section class="tile tile--lime qz"><div class="answer">Вы — 74 против 61</div><div class="choices">${choice(kirill('pav--xl'), 'Кирилл', 'dim-choice')}${choice(you('pav--xl'), 'Вы', 'picked')}</div>${line(61, 74, '61', '74')}</section>${btn('Дальше', 'pill--primary pill--block')}`,
  ],
  [
    'Итог',
    `<section class="tile tile--ink qz"><span class="hint">Вы и Кирилл</span><div class="figure num">4 из 5</div><div class="answer">Вы хорошо знаете вашу переписку</div></section><div class="tile consent"><div class="li"><div class="li__main"><span class="li__title">Показать счёт Кириллу</span><span class="li__sub">Он увидит «4 из 5» и ваши ответы</span></div><span class="switch on"></span></div></div>${btn('Разобрать свою переписку', 'pill--primary pill--block')}<p class="hint center">И сделать угадайку для Кирилла</p>`,
  ],
  [
    'Уже пройдено',
    `<section class="tile qz"><span class="hint">Вы уже ответили 7 ноября</span><div class="figure num">4 из 5</div><ol class="qz__list qz__list--plain">${[
      ['Кто чаще пишет первым', 1],
      ['Кто чаще ставит ❤️', 1],
      ['Кто записывает больше голосовых', 0],
      ['Кто чаще желает спокойной ночи', 1],
      ['Кто чаще смеётся', 1],
    ]
      .map(([q, ok]) => `<li><span class="${ok ? 'ok' : 'no'}">${ic(ok ? 'check' : 'x')}</span>${q}</li>`)
      .join('')}</ol></section>${btn('Разобрать свою переписку', 'pill--primary pill--block')}`,
  ],
  [
    'Ссылка не работает',
    `<section class="tile qz qz--empty"><span class="icon-box">${ic('unlink')}</span><div class="answer">Ссылка больше не работает</div><span class="hint">Кирилл её отключил, или прошло 7 дней. Попросите прислать новую.</span></section>${btn('Разобрать свою переписку', 'pill--primary pill--block')}`,
  ],
]

/* ─── 4. Rules ───────────────────────────────────────────────────────── */
const RULES = [
  [
    'Вопросы',
    'Из <code>derived.quiz</code>, только однозначные: разрыв между сторонами от 10%. Не больше пяти, от понятного («кто пишет первым») к неожиданному. Меньше трёх однозначных — угадайку не предлагаем.',
  ],
  [
    'Что уходит наружу',
    'Имя автора из Telegram, пять вопросов с двумя числами и срок. Имя собеседника не нужно: для гостя он — «Вы».',
  ],
  [
    'Перспектива',
    'Сервер переворачивает стороны: «mine» автора становится «Кирилл», «theirs» — «Вы». В странице нет данных о том, у кого чей Telegram id.',
  ],
  [
    'Результат',
    'Счёт и ответы гостя хранятся при ссылке и видны автору только с согласия (переключатель включён, его можно выключить до отправки). Без согласия автор видит «Мила ответила», без счёта.',
  ],
  ['Повтор', 'Один проход: после ответа ссылка показывает итог. Защиты от подсматривания нет и не нужно — это игра.'],
  [
    'Срок и удаление',
    '7 дней по умолчанию, можно 30. «Удалить» стирает ссылку и результат. Удаление отчёта или аккаунта удаляет все его ссылки.',
  ],
  [
    'Данные',
    'Миграция: таблица <code>share_links</code> (token, kind: report | quiz, report_id, settings, снимок данных, expires_at, revoked_at, result). Публичные эндпоинты <code>GET /s/:token</code> и <code>POST /s/:token/answer</code> с ограничением частоты.',
  ],
  [
    'Рост',
    'Кнопка гостя ведёт на вход. После первого отчёта, если чат с автором разобран, — «Сделать угадайку для Кирилла».',
  ],
]

/* ─── 5. Public report ───────────────────────────────────────────────── */
const legend = '<span class="keys"><span class="key">Кирилл</span><span class="key key--them">Собеседник</span></span>'
const publicPage = (phone) =>
  `<div class="screen"><div class="phone-top"><i class="logo"></i><span class="grow">TG Analyzer</span>${btn('Войти', 'pill--sm')}</div><div class="content">
    <div class="pubbar">${ic('link')}<span>Отчёт Кирилла открыт по ссылке до 14 ноября. Имя собеседника скрыто, текстов сообщений нет.</span></div>
    <div class="rbar">${kirill('pav--lg')}<b class="grow">Кирилл и собеседник</b></div>
    <div class="hero-row${phone ? ' hero-row--m' : ''}"><section class="tile tile--ink"><div class="tile__head"><span class="q">Сообщения</span>${legend}</div><div class="figure num">1 900</div><svg class="pulse-mini" data-h="56" preserveAspectRatio="none" style="height:56px"></svg></section><section class="tile tile--lime"><span class="q">Кто пишет больше</span><div class="answer">Собеседник пишет больше</div><div class="figure num">42 / 58</div>${line(42, 58, '794', '1 106')}</section></div>
    <h2 class="part-title">Вы двое</h2>
    <section class="tile tile--grey cta"><div class="li__main"><span class="li__title">А как пишете вы?</span><span class="li__sub">Отчёт по любому чату за минуту. Тексты сообщений не сохраняем.</span></div>${btn('Сделать свой отчёт', 'pill--primary')}</section>
  </div></div>`
const publicGone = `<div class="screen"><div class="phone-top"><i class="logo"></i><span class="grow">TG Analyzer</span></div><div class="content content--center"><section class="tile qz qz--empty"><span class="icon-box">${ic('unlink')}</span><div class="answer">Отчёт больше не открыт</div><span class="hint">Автор отключил ссылку, или её срок закончился.</span></section>${btn('Сделать свой отчёт', 'pill--primary pill--block')}</div></div>`

/* ─── 6. Story ───────────────────────────────────────────────────────── */
function pulse(height) {
  const n = 70
  let lines = `<line class="axis" x1="0" x2="${n}" y1="50" y2="50"/>`
  for (let i = 0; i < n; i++) {
    const lv = 0.45 + 0.35 * Math.abs(Math.sin(i * 0.09)) + rnd() * 0.2
    lines += `<line class="u" x1="${i + 0.5}" x2="${i + 0.5}" y1="49" y2="${49 - lv * 44}"/><line class="t" x1="${i + 0.5}" x2="${i + 0.5}" y1="51" y2="${51 + lv * (0.7 + rnd() * 0.3) * 42}"/>`
  }
  return `<svg class="pulse-mini" viewBox="0 0 ${n} 100" preserveAspectRatio="none" style="height:${height}px">${lines}</svg>`
}
const hours = () => {
  const vals = [7, 5, 3, 1, 1, 1, 1, 2, 3, 5, 6, 7, 8, 9, 9, 8, 8, 9, 9, 8, 9, 10, 9, 8]
  return `<div class="hrs">${vals.map((v, h) => `<i class="${h >= 20 && h <= 22 ? 'pk' : ''}" style="height:${v * 10}%"></i>`).join('')}</div><div class="hrs__axis"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>`
}
const pair = `<div class="sl__head"><div class="sl__pair">${me('pav--sm')}${mila('pav--sm')}</div><span>Вы и Мила</span></div>`
const card = (tone, kicker, title, answer, body, facts = []) =>
  `<div class="sl sl--rich sl--${tone}">${pair}<div class="sl__kicker">${kicker}</div><div class="sl__q">${title}</div>${answer ? `<div class="sl__answer">${answer}</div>` : ''}<div class="sl__body">${body}</div>${
    facts.length
      ? `<dl class="sl__facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`
      : ''
  }<div class="sl__foot"><i class="logo"></i>tganalyzer.app</div></div>`
const podium = (rows) =>
  `<div class="pods">${rows
    .map(
      ([e, a, b]) =>
        `<div class="pod"><span class="pod__e">${e}</span><div class="pod__bars"><b style="height:${a}%"></b><b class="t" style="height:${b}%"></b></div><span class="pod__n num">${a} · ${b}</span></div>`,
    )
    .join('')}</div>`
const buckets = `<div class="bk">${[
  ['< 1 мин', 34, 31],
  ['1–5', 28, 30],
  ['5–30', 20, 21],
  ['до 2 ч', 11, 12],
  ['дольше', 7, 6],
]
  .map(
    ([l, a, b]) =>
      `<div class="bk__row"><span>${l}</span><div class="bk__bars"><b style="width:${a * 2.4}%"></b><b class="t" style="width:${b * 2.4}%"></b></div></div>`,
  )
  .join('')}</div>`
const SLIDES = [
  [
    'Обложка',
    card(
      'ink',
      'Итоги · март – ноябрь 2026',
      'Восемь месяцев переписки',
      '<span class="num sl__big2">4 800</span> сообщений',
      pulse(64),
      [
        ['Подряд без пропусков', '222 дня'],
        ['В день', '22 сообщения'],
      ],
    ),
  ],
  [
    'Кто пишет больше',
    card(
      'lime',
      'Баланс',
      'Кто пишет больше',
      'Пишете на равных',
      `<div class="sl__fig num">52 / 48</div>${line(52, 48, '2 491', '2 309')}`,
      [
        ['Длиннее пишет', 'Мила, 9 слов'],
        ['Чаще начинает', 'вы, 51%'],
      ],
    ),
  ],
  [
    'Скорость',
    card(
      'white',
      'Ответы',
      'Кто отвечает быстрее',
      'Отвечаете синхронно',
      `<div class="row-av">${me('pav--sm')}<span class="num">3 мин</span>${mila('pav--sm')}<span class="num">3 мин</span></div>${buckets}`,
      [
        ['За 5 минут', '62% ответов'],
        ['Дольше 2 часов', '7%'],
      ],
    ),
  ],
  [
    'Ваше время',
    card('ink', 'Ритм', 'Когда вы пишете', 'Вечерняя смена', hours(), [
      ['Пик', '20:00–23:00'],
      ['Чаще всего', 'по средам'],
    ]),
  ],
  [
    'Реакции',
    card(
      'lime',
      'Реакции',
      'Кто ставит реакции',
      'Мила — чуть щедрее',
      podium([
        ['❤️', 61, 74],
        ['😂', 50, 58],
        ['👍', 49, 41],
      ]),
      [['Всего', '238 против 279']],
    ),
  ],
  [
    'Слово',
    card(
      'ink',
      'О чём',
      'Слово вашей переписки',
      '',
      `<div class="sl__word sl__word--rich">good</div><div class="sl__sub">200 раз</div><ol class="sl__places"><li><b>2</b>дела<span class="num">153</span></li><li><b>3</b>great<span class="num">140</span></li><li><b>4</b>job<span class="num">140</span></li></ol>`,
    ),
  ],
  [
    'Круглые',
    card(
      'white',
      'Вехи',
      'Круглые сообщения',
      'Следующее — 5&nbsp;000-е, через 10 дней',
      `<ol class="sl__ms"><li><b class="num">1-е</b><span>30 марта · Мила</span></li><li><b class="num">100-е</b><span>3 апреля · Мила</span></li><li><b class="num">1 000-е</b><span>13 мая · вы</span></li><li class="next"><b class="num">5 000-е</b><span>около 17 ноября</span></li></ol>`,
    ),
  ],
]
const viewer = `<div class="viewer"><div class="viewer__bars">${SLIDES.map((_, i) => `<i class="${i < 2 ? 'done' : i === 2 ? 'on' : ''}"></i>`).join('')}</div><div class="viewer__top"><span class="round round--dark">${ic('x')}</span></div>${SLIDES[2][1]}<div class="viewer__bar">${btn('Поделиться этим слайдом', 'pill--light', 'share')}<span class="round round--dark">${ic('download')}</span></div></div>`

/* ─── Render ─────────────────────────────────────────────────────────── */
const frame = (cls, html, label) => `<div class="frame ${cls}"${label ? ` data-label="${label}"` : ''}>${html}</div>`
const RENDER = {
  modal: () =>
    frame('frame--wide frame--lbl', desktopModal(modalMain(false), true), 'ПК · главный шаг') +
    frame('frame--wide frame--lbl', desktopModal(modalLink), 'ПК · ссылка на отчёт') +
    frame('frame--phone frame--lbl', phoneSheet(modalMain(true)), 'Телефон · главный шаг'),
  'author-a': () =>
    frame('frame--wide frame--lbl', desktopModal(modalQuizA), 'ПК · настройка') +
    frame('frame--phone frame--lbl', phoneSheet(modalQuizDone), 'Телефон · ответ получен'),
  'author-b': () => frame('frame--phone frame--lbl', phoneSheet(modalQuizB), 'Телефон'),
  guest: () =>
    GUEST.map(([label, body]) =>
      frame(
        'frame--phone frame--lbl',
        `<div class="screen">${guestTop}<div class="content">${body}</div></div>`,
        label,
      ),
    ).join(''),
  public: () =>
    frame('frame--wide frame--lbl', publicPage(false), 'ПК') +
    frame('frame--phone frame--lbl', publicPage(true), 'Телефон') +
    frame('frame--phone frame--lbl', publicGone, 'Ссылка отключена'),
  viewer: () => frame('frame--phone frame--lbl', viewer, 'Просмотр «Итогов» на телефоне'),
}
document.querySelectorAll('[data-screen]').forEach((node) => {
  node.innerHTML = RENDER[node.dataset.screen]()
})
document.querySelector('[data-stories]').innerHTML = SLIDES.map(
  ([label, html], i) => `<figure class="story-frame"><figcaption>${i + 1}. ${label}</figcaption>${html}</figure>`,
).join('')
document.querySelector('[data-rules]').innerHTML = `<table class="ledger plan-table"><tbody>${RULES.map(
  ([k, v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`,
).join('')}</tbody></table>`

// Pulse in the public report frame.
document.querySelectorAll('svg.pulse-mini[data-h]').forEach((svg) => {
  svg.outerHTML = pulse(Number(svg.dataset.h))
})
boot()
