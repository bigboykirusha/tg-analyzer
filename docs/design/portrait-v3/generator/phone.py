"""Phone screens (390×844). Mila's report is stale (640 new since 2 Nov) on every screen that shows it."""
from kit import *

FAB = btn('Новый анализ', 'primary', 'xl fab', 'plus')
LIVE_PCT = 63
DOCK = (f'<div class="dock"><a href="#" class="live" aria-label="Разбираем «Дима (работа)», {LIVE_PCT}%. Подробнее">{ring(LIVE_PCT, av("dima", 32), 40)}'
        f'<span class="grow stack"><span class="t-small-strong trunc">Разбираем «Дима (работа)»</span><span class="t-small muted">{LIVE_PCT}%, ещё около минуты</span></span>{ic("up", "chev")}</a>'
        f'<button class="fab-round" aria-label="Новый анализ">{ic("plus")}</button></div>')


def sec(title, inner):
    return f'<section class="section"><h2 class="t-h2">{title}</h2>{inner}</section>'


def waiting_rows(n=3, size='sm', busy=None, long=False):
    rows = [('dima', 413, 'сообщений'), ('anna', 304, 'сообщения'), ('artyom', 268, 'сообщений'), ('sofia', 200, 'сообщений')][:n]
    rows = [(k, f'{c} {w} за месяц' if long else f'{c} за месяц') for k, c, w in rows]
    def trail(k):
        if k == busy:
            return '<span class="row-f gap-2 t-small muted"><span class="spin"></span>Разбираем</span>'
        return btn('Разобрать', 'secondary', size, aria=f'Разобрать: {P[k][0]}')
    return [row(av(k), P[k][0], m, trail(k)) for k, m in rows]


REPORT_TILES = ('<div class="grid-2">' + mini_poster('mila', '4 800 сообщений', 1, 160) + mini_poster('mama', '1 900 сообщений', 2, 160)
                + mini_poster('team', '9 000 сообщений', 3, 160) + mini_poster('katya', '130 сообщений', 4, 160) + '</div>')


def lead_mila():
    return f'''<article class="tile poster" data-hue="red">
  <a href="#" class="row-f gap-2 t-small muted">{av('mila', 24)}Мила</a>
  <h3 class="t-h3">640 новых сообщений с 2 ноября</h3>
  <p class="t-small muted">Отчёт пока о переписке до 2 ноября.</p>
  <div class="row-f gap-2">{btn('Обновить отчёт', 'poster-2', 'md', 'refresh')}{btn('Открыть', 'plain', 'md', tag='a')}</div></article>'''


def home(lead, theme=None, fab=FAB):
    body = f'''{ph_home_nav()}<main class="page" style="padding-bottom:120px">
  <div class="stack gap-1"><h1 class="t-h1">Добрый вечер, Дима</h1><p class="t-small muted">Вот что нового в ваших переписках.</p></div>
  {sec('Сейчас главное', lead)}
  {sec('Отчёты', REPORT_TILES)}
  {sec('Ещё не разобраны', group(waiting_rows()))}
</main>{fab}'''
    return page('Главная', body, theme=theme)


def S_home(theme=None):
    return home(lead_mila(), theme)


def S_progress():
    return home(lead_mila(), fab=DOCK)


def progress_body(big=False):
    """What the minimised capsule opens: the person's poster filling as we read, from today back."""
    return f'''<div class="tile poster" data-hue="teal" role="status" style="gap:var(--space-3)">
  <div class="row-f gap-3">{av('dima', 40)}<div class="grow stack"><b class="t-title" style="font-weight:600">Дима (работа)</b><span class="t-small muted">Дошли до 12 июля 2025</span></div><span class="t-h2">{LIVE_PCT}%</span></div>
  {pulse(72 if big else 48, 32, 2.0, mirrored=False, read_from=27 if big else 18)}
  <div class="axis"><span>сентябрь 2023</span><span>сегодня</span></div>
  <p class="t-small muted">Прочитано 2 600 из 4 100 сообщений. Можно закрыть {'вкладку' if big else 'приложение'} — отчёт сохранится сам.</p></div>'''


def S_progress_open():
    sheet = f'''<section class="sheet" role="dialog" aria-modal="true" aria-label="Разбираем переписку">
  <span class="grabber"></span>
  {sheet_head('Разбираем переписку')}
  {progress_body()}
  <div class="stack">{row('', 'Написать, когда будет готов', 'Сообщение придёт в Telegram', switch(True, 'Написать в Telegram, когда отчёт будет готов'))}</div>
  {btn('Отменить разбор', 'tinted', 'lg block')}
</section>'''
    return page('Разбор — подробности', dim_home() + '<div class="scrim"></div>' + sheet)


def S_session():
    lead = f'''<article class="tile start">
  <span class="empty-ic">{ic('power')}</span>
  <h3 class="t-h3">Telegram завершил сеанс</h3>
  <p class="t-small muted">Отчёты на месте. Чтобы разбирать новые чаты и обновлять отчёты, войдите снова — это займёт минуту.</p>
  {btn('Войти снова', 'primary', 'md')}</article>'''
    return home(lead, fab='')


def S_first():
    feat = f'''<article class="tile poster" data-hue="red" style="gap:var(--space-1);padding:var(--space-6) var(--card-padding) var(--card-padding)">
  {av('mila', 64)}
  <h2 class="t-h2" style="margin-top:var(--space-3)">Мила</h2>
  <p class="t-small muted">Чаще всех — 980 сообщений за месяц</p>
  <div style="margin-top:var(--space-4)">{btn('Разобрать', 'poster', 'xl block')}</div></article>'''
    rows = [('dima', '413 за месяц'), ('anna', '304 за месяц'), ('artyom', '268 за месяц'), ('family', 'Группа, 180 за месяц')]
    g = group([row(av(k), P[k][0], m, btn('Разобрать', 'secondary', 'sm', aria=f'Разобрать: {P[k][0]}')) for k, m in rows]
              + [row(lead_ic('search'), 'Все чаты Telegram', '', '', '', True, True)], 'Или кто-то ещё')
    return page('Первый вход', ph_home_nav() + f'''<main class="page" style="gap:var(--space-6)">
  <div class="stack gap-2"><h1 class="t-h1">С кого начнём?</h1><p class="t-body muted">Отчёт будет готов через минуту-две.</p></div>
  {feat}
  {g}
</main>''')


def dim_home(tiles_first=False):
    lead = '' if tiles_first else sec("Сейчас главное", lead_mila())
    return f'<div aria-hidden="true" inert>{ph_home_nav()}<main class="page"><div class="stack gap-1"><h1 class="t-h1">Добрый вечер, Дима</h1><p class="t-small muted">Вот что нового в ваших переписках.</p></div>{lead}{sec("Отчёты", REPORT_TILES)}</main></div>'


NEW_DATA = [('mila', 'Отчёт от 2 ноября, 640 новых', 'update'), ('run', 'Группа, писали 4 часа назад', 'new'), ('dima', 'Писали 7 часов назад', 'new'),
            ('anna', 'Писали 13 часов назад', 'new'), ('family', 'Группа, писали 13 часов назад', 'new'), ('mama', 'Отчёт от вчера', 'done'),
            ('team', 'Группа, отчёт от вчера', 'done'), ('artyom', 'Писали 4 дня назад', 'new'), ('katya', 'Отчёт от 1 ноября', 'done'),
            ('sofia', 'Писали 12 дней назад', 'new'), ('oleg', '60 сообщений, для отчёта нужно 100', 'few')]


def new_trail(k, state, size='sm'):
    n = P[k][0]
    if state == 'update':
        return btn('Обновить', 'secondary', size, aria=f'Обновить отчёт: {n}')
    if state == 'new':
        return btn('Разобрать', 'secondary', size, aria=f'Разобрать: {n}')
    return ''


def new_rows(size='sm', data=None):
    return ''.join(row(av(k), P[k][0], m, new_trail(k, st, size), 'few' if st == 'few' else '', st == 'done', st == 'done') for k, m, st in (data or NEW_DATA))


def S_new():
    sheet = f'''<section class="sheet" role="dialog" aria-modal="true" aria-label="Новый анализ" style="top:56px">
  <span class="grabber"></span>
  {sheet_head('Новый анализ')}
  <div class="stack gap-3">{search('Поиск чата')}{filters(['Все', 'Личные', 'Группы'], 0, 'Какие чаты')}</div>
  <div class="stack">{new_rows()}</div>
</section>'''
    return page('Лист «Новый анализ»', dim_home() + '<div class="scrim"></div>' + sheet)


def report_actions(key='mila'):
    return f'''<div class="stack">{row(lead_ic('refresh'), 'Обновить отчёт', '640 новых сообщений с 2 ноября', '', '', False, True)}{row(lead_ic('share'), 'Поделиться', '«Итоги», ссылка или угадайка', '', '', False, True)}</div>
  <div class="stack">{row(lead_ic('trash', 'danger'), 'Удалить отчёт', '', '', 'danger', False, True)}</div>'''


def S_menu():
    sheet = f'''<section class="sheet" role="dialog" aria-modal="true" aria-label="Отчёт «Мила»">
  <span class="grabber"></span>
  <div class="row-f gap-3">{av('mila', 48)}<div class="grow stack"><h2 class="t-h3">Мила</h2><p class="t-small muted">Отчёт от 2 ноября, 4 800 сообщений</p></div>{ibtn('x', 'Закрыть')}</div>
  {report_actions()}
</section>'''
    return page('Действия с отчётом («⋯» на карточке)', dim_home() + '<div class="scrim"></div>' + sheet)


def S_delete():
    sheet = f'''<section class="sheet" role="alertdialog" aria-modal="true" aria-label="Удалить отчёт «Мила»?">
  <span class="grabber"></span>
  <div class="stack gap-2"><h2 class="t-h3">Удалить отчёт «Мила»?</h2>
  <p class="t-small muted">Удалим отчёт, «Итоги» и ссылки на них. Переписка в Telegram не изменится, разобрать чат можно снова.</p></div>
  <div class="stack gap-2">{btn('Удалить отчёт', 'danger', 'xl block')}{btn('Отменить', 'tinted', 'xl block')}</div>
</section>'''
    return page('Удалить отчёт?', dim_home() + '<div class="scrim"></div>' + sheet)


# ─── report ──────────────────────────────────────────────────────────────

def poster_ph(name='Мила', meta='4 800 сообщений с 9 апреля по 2 ноября 2026', legend=('Вы', 'Мила'), action=True):
    act = f'<div>{btn("Смотреть итоги", "poster", "lg", "play")}</div>' if action else ''
    return f'''<section class="poster stack gap-3" style="padding:var(--space-2) var(--page-gutter) var(--space-6)">
  <div class="row-f between">{ibtn("back", "Назад", "on-poster")}{ibtn("share", "Поделиться", "on-poster")}</div>
  <div class="stack gap-2 poster-name" style="margin-top:var(--space-4)"><h1 class="t-display">{name}</h1><p class="t-small muted">{meta}</p></div>
  <div class="legend"><span><i></i>{legend[0]}</span><span><i class="f"></i>{legend[1]}</span></div>
  {pulse(60, 32, 1.0)}
  <div class="axis"><span>апрель</span><span>ноябрь</span></div>
  {act}
</section>'''


def stale():
    return f'''<div class="tile" style="flex-direction:row;align-items:center;gap:var(--space-3)">
  <span class="grow stack gap-0-5"><b class="t-small-strong">640 новых сообщений</b><span class="t-small muted">Их пока нет в отчёте</span></span>
  {btn('Обновить', 'secondary', 'sm', 'refresh')}</div>'''


def chapter_head(title, lede):
    return f'<div class="stack gap-1" style="padding-top:var(--space-2)"><h2 class="t-h1">{title}</h2><p class="t-small muted">{lede}</p></div>'


HERO_SHARE = hero('Кто пишет больше', 'Пишете на равных', cmp('Вы', 'Мила', '51%', '49%', 51) + '<p class="t-small muted">2 434 и 2 366 сообщений</p>')
T_SPEED = tile('Кто отвечает быстрее', 'Отвечаете одинаково быстро', cmp('Вы', 'Мила', '3 мин', '3 мин') + '<p class="note">Обычно — за 3 минуты. Ночью дольше у обоих.</p>')
T_QUESTIONS = tile('Кто задаёт вопросы', 'Спрашиваете поровну',
                   '<div style="display:grid;grid-template-columns:48px minmax(0,1fr);gap:var(--space-2) var(--space-3);align-items:center">'
                   '<span class="t-small muted">Вы</span><span class="squares">' + '<i></i>' * 22 + '</span>'
                   '<span class="t-small them-ink">Мила</span><span class="squares them">' + '<i></i>' * 21 + '</span></div><p class="note">Один квадрат — 10 вопросов</p>')
T_HABITS = tile('Ваши привычки', 'Разговор начинаете по очереди', kv('Первым пишет утром', 'по очереди') + kv('Чаще смеётся', 'поровну') + kv('«Спокойной ночи» желает', 'Мила', '81 раз против 66'), rows=True)
TOGETHER = [T_SPEED, T_QUESTIONS, T_HABITS]
LEDE = {'together': 'Пишете на равных и отвечаете одинаково быстро', 'time': 'Дневной ритм, на связи почти каждый день', 'words': '«good» на двоих, а у каждого свои слова'}


def S_report(theme=None):
    return page('Отчёт — постер', poster_ph() + f'<main class="cards" style="padding:var(--space-4) var(--page-gutter)">{stale()}{chapter_head("Вы двое", LEDE["together"])}{HERO_SHARE}</main>', theme=theme, hue='red', room=True)


def S_together():
    return page('Отчёт — Вы двое', ph_report_nav('Мила', 'Вы двое, 1 из 3') + f'<main class="cards" style="padding:var(--space-2) var(--page-gutter)"><h2 class="sr-only">Вы двое</h2>{HERO_SHARE}{"".join(TOGETHER)}</main>', hue='red', room=True)


PARTS = ('<div class="grid-4" style="text-align:center;gap:0">' + ''.join(
    f'<span class="stack"><b class="t-small-strong">{v}</b><span class="t-caption muted" style="font-weight:400">{k}</span></span>'
    for k, v in [('ночь', '1%'), ('утро', '27%'), ('день', '38%'), ('вечер', '34%')]) + '</div>')
T_HOURS = tile('Ваше время', 'Пик — с 11:00 до 14:00', hours() + PARTS)
T_RECORDS = tile('Ваши рекорды', '23 апреля — ваш день рекордов', kv('Самый долгий разговор', '14 ч 39 мин', '23 апреля') + kv('Больше всего за день', '96 сообщений', '23 апреля') + kv('Самая длинная пауза', '6 дней', 'в июле'), rows=True)


T_HEAT = tile('Активность по дням', 'Писали друг другу 196 из 208 дней', months_heat(MONTHS[2:], 3))


def S_time():
    return page('Отчёт — Время', ph_report_nav('Мила', 'Время, 2 из 3') + f'<main class="cards" style="padding:var(--space-2) var(--page-gutter)">{chapter_head("Время", LEDE["time"])}{T_HOURS}{T_RECORDS}{T_HEAT}</main>', hue='red', room=True)


WORD = ('<section class="tile poster"><p class="q">Слово вашей переписки</p><p class="t-figure">good</p><p class="t-small muted">214 раз за всё время</p>'
        + cmp('Вы', 'Мила', '118', '96', 55)
        + '<div class="grid-3 mt-auto" style="gap:var(--space-2);padding-top:var(--space-3);box-shadow:inset 0 0.5px 0 var(--on-poster-line)">'
        + ''.join(f'<span class="stack"><b class="t-small-strong">{w}</b><span class="t-small muted">{n}</span></span>' for w, n in [('дела', 152), ('great', 142), ('job', 142)]) + '</div></section>')
VOCAB = tile('Ваш словарь', 'Вы чаще пишете «кофе», Мила — «дедлайн»',
             '<p class="t-small muted">Только вы</p>' + chips(['кофе', 'выходных', 'ладно']) + '<p class="t-small them-ink">Только Мила</p>' + chips(['дедлайн', 'созвон', 'релиз'], 'them')
             + '<p class="t-small muted">Общие</p>' + chips(['спасибо', 'завтра', 'получится', 'вечером'], 'shared'))
EMOJI = tile('Любимые эмодзи', '☀️ — общее любимое, 161 раз', chips(['☀️ <b>161</b>', '🎉 <b>142</b>', '👍 <b>125</b>', '😂 <b>121</b>', '❤️ <b>120</b>'], 'shared'))


def S_words():
    return page('Отчёт — О чём', ph_report_nav('Мила', 'О чём, 3 из 3') + f'<main class="cards" style="padding:var(--space-2) var(--page-gutter)">{chapter_head("О чём", LEDE["words"])}{WORD}{VOCAB}{EMOJI}</main>', hue='red', room=True)


def ending(pad='var(--space-8) var(--page-gutter) var(--space-10)', fill=False):
    return f'''<section class="poster stack gap-3" style="padding:{pad};{'flex:1' if fill else ''}">
  {pulse(56, 24, 3.0)}
  <h2 class="t-h1" style="margin-top:var(--space-3)">Итоги: Мила</h2>
  <p class="t-small muted">Главное о вашей переписке в четырёх кадрах. Их можно сохранить в галерею или отправить.</p>
  <div class="stack gap-2" style="margin-top:var(--space-2)">{btn('Смотреть итоги', 'poster', 'xl block', 'play')}{btn('Поделиться', 'poster-2', 'xl block', 'share')}</div></section>'''


def S_ending():
    scrolled = f'<main class="cards" style="flex:1;min-height:0;justify-content:flex-end;overflow:hidden;padding:0 var(--page-gutter) var(--space-6)">{VOCAB}{EMOJI}</main>'
    return page('Отчёт — конец', ph_report_nav('Мила', 'О чём, 3 из 3') + scrolled + ending(), hue='red', room=True)


def fan():
    cards = ''
    for i, (x, y, r) in enumerate([(0, 6, -8), (12, 2, -2), (24, 0, 5)]):
        inner = f'<span class="story-seg" style="grid-template-columns:repeat(4,1fr)"><i class="on"></i><i></i><i></i><i></i></span><span class="stack gap-1"><b style="font-size:12px;line-height:14px">Мила</b>{pulse(10, 5, 1.0)}</span>' if i == 2 else ''
        cards += f'<span class="thumb916" style="left:{x}px;top:{y}px;transform:rotate({r}deg);padding:6px">{inner}</span>'
    return f'<span class="fan" aria-hidden="true">{cards}</span>'


def stories_feature(size='md'):
    return f'''<a href="#" class="feature poster" data-hue="red">{fan()}
  <span class="grow stack gap-1"><b class="t-h3">Итоги: Мила</b><span class="t-small muted">Четыре кадра о вашей переписке</span>
  <span style="margin-top:var(--space-3)">{btn('Смотреть', 'poster', size, 'play', tag='span')}</span></span></a>'''


SHARE_ROWS = f'''<div class="stack">{row(lead_ic('download'), 'Сохранить в галерею', '4 картинки для сторис', '', '', False, True)}{row(lead_ic('send'), 'Отправить', 'В Telegram или другое приложение', '', '', False, True)}</div>
  <div class="stack"><h3 class="t-small muted" style="font-weight:400;padding-top:var(--space-2)">По ссылке</h3>
  {row(lead_ic('link'), 'Ссылка на отчёт', 'Откроется без входа', '', '', True, True)}
  {row(lead_ic('users'), 'Угадайка', 'Мила угадывает, кто что пишет', '', '', True, True)}</div>'''


def S_share():
    sheet = f'''<section class="sheet" role="dialog" aria-modal="true" aria-label="Поделиться">
  <span class="grabber"></span>
  {sheet_head('Поделиться')}
  {stories_feature()}
  {SHARE_ROWS}
</section>'''
    return page('Лист «Поделиться»', poster_ph(action=False) + '<div class="scrim"></div>' + sheet, hue='red', room=True)


def link_preview():
    return f'''<div class="stack gap-2"><p class="t-small muted">Так увидит Мила</p>
  <div class="tile poster" style="gap:var(--space-1)"><b class="t-h3">Дима и Мила</b><span class="t-small muted">4 800 сообщений с 9 апреля</span><span style="margin-top:var(--space-3)">{pulse(48, 16, 1.0)}</span></div></div>'''


def S_link():
    sheet = f'''<section class="sheet" role="dialog" aria-modal="true" aria-label="Ссылка на отчёт">
  <span class="grabber"></span>
  {sheet_head('Ссылка на отчёт', 'back')}
  {link_preview()}
  <div class="stack">{row('', 'Показывать имена', 'Без имён — «Автор» и «Собеседник»', switch(True, 'Показывать имена'))}
  {row('', 'Показывать слова и эмодзи', 'Без них в отчёте только числа', switch(False, 'Показывать слова и эмодзи'))}</div>
  <div class="stack gap-3">{btn('Скопировать ссылку', 'primary', 'xl block', 'copy')}<p class="t-small muted" style="text-align:center">Выключить ссылку можно в аккаунте</p></div>
</section>'''
    return page('Ссылка на отчёт', poster_ph(action=False) + '<div class="scrim"></div>' + sheet, hue='red', room=True)


STORY_ACTIONS = f'<div class="story-actions">{btn("Сохранить", "poster-2", "lg", "download")}{btn("Поделиться", "poster-2", "lg", "share")}</div>'


def story(content, i=1, n=4, label='Итоги: Мила'):
    seg_ = f'<div class="story-seg" style="grid-template-columns:repeat({n},1fr)" role="progressbar" aria-valuemin="1" aria-valuemax="{n}" aria-valuenow="{i}" aria-label="Кадр {i} из {n}">' + ''.join(f'<i class="{"on" if k < i else ""}"></i>' for k in range(n)) + '</div>'
    return f'''<div class="poster stack" style="height:100%;padding:var(--space-3) var(--page-gutter) var(--space-8)" role="dialog" aria-modal="true" aria-label="Итоги">
  {seg_}
  <div class="row-f between" style="margin-top:var(--space-3)"><span class="t-ui">{label}</span><span class="row-f gap-2">{ibtn('pause', 'Пауза', 'on-poster')}{ibtn('x', 'Закрыть', 'on-poster')}</span></div>
  {content}
  {STORY_ACTIONS}
</div>'''


def S_story_cover():
    c = f'''<div class="stack grow gap-6" style="justify-content:center">
  {pulse(40, 72, 1.0)}
  <div class="stack gap-3 poster-name"><h1 class="t-display" style="--display-max:88px">Мила</h1><p class="t-h3">4 800 сообщений за 208 дней</p>
  <p class="t-small muted">С 9 апреля по 2 ноября 2026</p></div>
</div>'''
    return page('Итоги — обложка', story(c, 1, label='Итоги, 1 из 4'), hue='red')


STORY_TOGETHER = f'''<div class="stack grow gap-8" style="justify-content:center">
  <div class="stack gap-3"><h1 class="t-display" style="font-size:56px;line-height:56px">На равных</h1><p class="t-body muted">51 на 49, и отвечаете одинаково быстро</p></div>
  <div class="big">{cmp('Вы', 'Мила', '51%', '49%', 51)}</div>
  <div class="facts"><div><b>3 мин</b><span>отвечаете оба</span></div><div><b>по очереди</b><span>начинаете разговор</span></div>
  <div><b>2 ч 57 мин</b><span>голосовых вместе</span></div><div><b>поровну</b><span>смеётесь</span></div></div>
</div>'''


def S_story():
    return page('Итоги — Вы двое', story(STORY_TOGETHER, 2, label='Вы двое, 2 из 4'), hue='red')


def S_story_end():
    c = f'''<div class="stack grow gap-8" style="justify-content:center">
  <h1 class="t-display" style="font-size:56px;line-height:56px">Вы и Мила</h1>
  <div class="facts"><div><b>51 на 49</b><span>пишете на равных</span></div><div><b>11–14</b><span>ваши часы</span></div>
  <div><b>«good»</b><span>слово переписки</span></div><div><b>196 дней</b><span>из 208 на связи</span></div></div>
</div>'''
    return page('Итоги — последний кадр', story(c, 4, label='Итоги, 4 из 4'), hue='red')


GROUP_MEMBERS = [('you', 'Вы', 'Иногда', '9%'), ('sergey', 'Сергей', 'Ядро', '22%'), ('alexey', 'Алексей', 'Ядро', '19%'), ('natasha', 'Наташа', 'Ядро', '17%'), ('maria', 'Мария', 'Ядро', '15%')]


def member_rows(sel=None):
    out = ''
    for k, n, role, s in GROUP_MEMBERS:
        a = av(None, 40, True) if k == 'you' else av(k)
        out += row(a, n, role, f'<span class="t-ui muted">{s}</span>', 'compact' + (' is-selected' if k == sel else ''), k != 'you', k != 'you')
    return out


def awards_tile():
    return tile('Номинации', None, ''.join(row(av(k, 32), t, f'<span class="them-ink" data-hue="{P[k][2]}">{P[k][0]}</span>, {v}', '', 'compact') for k, t, v in [
        ('yulia', 'Заводит разговоры', '15% разговоров'), ('alexey', 'Отвечает больше всех', '41 ответ в день'), ('sergey', 'Звезда реакций', '468 реакций'), ('maria', 'Укладывает чат спать', '24 раза')]), rows=True)


def S_group():
    members = tile('Кто и как участвует', 'Ядро — четыре человека', member_rows() + row('', 'Все участники (8)', '', '', 'compact', True, True), rows=True)
    return page('Группа — Люди', ph_report_nav('Продуктовая команда', 'Люди, 1 из 3') + f'<main class="cards" style="padding:var(--space-2) var(--page-gutter)">{chapter_head("Люди", "Пишут все понемногу, без явных лидеров")}{members}{awards_tile()}</main>', hue='pink', room=True)


def pairs_tile():
    def nm(k):
        return f'<span class="them-ink" data-hue="{P[k][2]}">{P[k][0]}</span>'
    return tile('Самые плотные пары', 'Наташа и Мария', ''.join(row('', f'{nm(a)} и {nm(b)}', m, f'<span class="t-ui muted">{c}</span>', 'compact') for a, b, m, c in [
        ('natasha', 'maria', 'Отвечают друг другу чаще всех', '309'), ('natasha', 'sergey', '', '214'), ('natasha', 'yulia', '', '188')]), rows=True)


def starts_tile():
    def nm(k):
        return f'<span class="them-ink" data-hue="{P[k][2]}">{P[k][0]}</span>'
    return tile('Кто начинает разговоры', 'Чаще всех — Юля', ''.join(kv(nm(k), v) for k, v in [('yulia', '15%'), ('alexey', '13%'), ('sergey', '11%')]), rows=True)


def S_group_talk():
    pod = ('<div class="podium">' + ''.join(f'<div><span class="e {"first" if f else ""}">{e}</span><i class="{"first" if f else ""}" style="height:{hgt}px"></i><b>{n}</b></div>'
           for e, f, hgt, n in [('👍', False, 48, 703), ('❤️', True, 80, '1 000'), ('😂', False, 40, 683)]) + '</div>')
    react = tile('Любимые реакции', '❤️ — 1 000 раз', pod)
    return page('Группа — Общение', ph_report_nav('Продуктовая команда', 'Общение, 2 из 3') + f'<main class="cards" style="padding:var(--space-2) var(--page-gutter)">{chapter_head("Общение", "Самая плотная пара — Наташа и Мария")}{pairs_tile()}{react}{starts_tile()}</main>', hue='pink', room=True)


def member_body():
    return f'''<div class="row-f gap-3">{av('sergey', 64)}<div class="grow stack"><h3 class="t-h2">Сергей</h3><p class="t-small muted">Ядро, 22% сообщений</p></div></div>
  <div class="stack">{kv('Сообщений', '1 980')}{kv('Начинает разговоры', '11%')}{kv('Получает ответов', '154')}{kv('Отвечает обычно', 'за 2 мин')}{kv('Последнее сообщение', '8 ноября')}</div>
  <div class="stack gap-2"><p class="t-small muted">Частые слова</p>{chips(['макет', 'бэклог', 'еду', 'запиши', 'перенесли'])}</div>
  <div class="stack"><p class="t-small muted">Чаще всего отвечает</p>{row(av('natasha', 32), 'Наташе', '', '<span class="t-ui muted">214</span>', 'compact')}{row(av('maria', 32), 'Марии', '', '<span class="t-ui muted">156</span>', 'compact')}</div>'''


def S_member():
    sheet = f'''<section class="sheet" role="dialog" aria-modal="true" aria-label="Сергей" style="top:96px">
  <span class="grabber"></span>{sheet_head('Участник')}{member_body()}</section>'''
    return page('Группа — участник', f'<div aria-hidden="true" inert>{ph_report_nav("Продуктовая команда", "Люди, 1 из 3")}</div><div class="scrim"></div>' + sheet, hue='pink', room=True)


PRIVACY_NOTE = 'В отчёте только подсчёты и частые слова.'


def S_guest():
    poster = f'''<section class="poster stack gap-3" style="padding:var(--space-3) var(--page-gutter) var(--space-6)">
  <div class="row-f between">{logo(28, word=True)}<a href="#" class="t-small muted">Приватность</a></div>
  <div class="stack gap-2 poster-name" style="margin-top:var(--space-6)"><h1 class="t-display">Дима и Мила</h1><p class="t-small muted">Дима поделился с вами отчётом о переписке: 4 800 сообщений с 9 апреля.</p></div>
  {pulse(56, 24, 1.0)}
</section>'''
    main = f'''<main class="cards" style="padding:var(--space-4) var(--page-gutter) 140px"><h2 class="sr-only">Главное</h2>
  {tile('Кто пишет больше', 'Пишете на равных', cmp('Дима', 'Мила', '51%', '49%', 51))}
  {tile('Коротко', None, kv('Отвечаете', 'оба за 3 мин') + kv('Пик', 'с 11:00 до 14:00') + kv('Писали друг другу', '196 из 208 дней'), rows=True)}
</main>{btn('Разобрать свои переписки', 'primary', 'xl fab', tag='a')}'''
    return page('Гость — отчёт по ссылке', poster + main, hue='red', room=True)


def quiz_shell(content, step=None):
    seg_ = ''
    if step:
        seg_ = '<div class="story-seg" style="grid-template-columns:repeat(5,1fr);margin-bottom:var(--space-4)">' + ''.join(f'<i class="{"on" if k < step else ""}"></i>' for k in range(5)) + '</div>'
    return f'<main class="poster stack" style="height:100%;padding:var(--space-3) var(--page-gutter) var(--space-8)">{seg_}{content}</main>'


def S_quiz_start():
    c = f'''<div class="row-f between">{logo(28, word=True)}<a href="#" class="t-small muted">Приватность</a></div>
  <div class="stack gap-4 grow" style="justify-content:center">{pulse(40, 40, 1.0)}
  <h1 class="t-h1" style="font-size:40px;line-height:44px">Дима позвал вас в угадайку</h1>
  <p class="t-body muted">Пять вопросов о вашей переписке: кто дольше записывает голосовые, кто желает спокойной ночи, чьё это слово.</p></div>
  <div class="stack gap-3"><p class="t-small muted" style="text-align:center">Дима увидит, сколько вы угадали</p>{btn('Начать', 'poster', 'xl block')}</div>'''
    return page('Гость — угадайка, старт', quiz_shell(c), hue='red')


def S_quiz():
    def ch(key, name, cls='', note=''):
        a = av(key, 40) if key else av(None, 40, True)
        mark = f'<span class="row-f gap-1 t-small muted">{ic("check")}{note}</span>' if cls == 'on' else ''
        return f'<button class="choice {cls}" role="radio" aria-checked="{str(cls == "on").lower()}">{a}<span class="t-title grow">{name}</span>{mark}</button>'
    c = f'''<p class="t-small muted">Вопрос 3 из 5</p>
  <div class="stack grow" style="justify-content:center"><h1 class="t-h1" style="font-size:36px;line-height:40px">Кто чаще желает «спокойной ночи»?</h1>
  <div class="stack gap-2" role="radiogroup" aria-label="Ответ" style="margin-top:var(--space-8)">{ch(None, 'Дима')}{ch('mila', 'Я, Мила', 'on', '81 раз')}</div>
  <p class="t-ui" role="status" style="margin-top:var(--space-4)">Верно — это вы, 81 раз против 66.</p></div>
  <div>{btn('Следующий вопрос', 'poster', 'xl block')}</div>'''
    return page('Гость — угадайка, вопрос', quiz_shell(c, 3), hue='red')


def S_quiz_end():
    c = f'''<div class="stack gap-3 grow" style="justify-content:center"><p class="t-small muted">Угадайка от Димы</p>
  <p class="t-figure" style="font-size:96px;line-height:96px">4 из 5</p>
  <h1 class="t-h2">Вы хорошо знаете эту переписку</h1>
  <p class="t-body muted">Не угадали один вопрос — кто дольше записывает голосовые. Дима уже видит результат.</p></div>
  <div class="stack gap-2">{btn('Разобрать свои переписки', 'poster', 'xl block', tag='a')}{btn('Открыть отчёт Димы', 'poster-2', 'xl block', tag='a')}</div>'''
    return page('Гость — угадайка, итог', quiz_shell(c, 6), hue='red')


def S_link_off():
    body = f'''<header class="nav-ph between">{logo(28, word=True)}<a href="#" class="t-small muted">Приватность</a></header>
  <main class="stack gap-3" style="padding:0 var(--page-gutter) var(--space-16);flex:1;justify-content:center">
  <h1 class="t-h1">Ссылка больше не работает</h1>
  <p class="t-body muted">Автор выключил её или удалил отчёт. Попросите прислать новую.</p>
  <div class="stack gap-2" style="margin-top:var(--space-4)">{btn('Разобрать свои переписки', 'primary', 'xl block', tag='a')}{btn('Что такое TG Analyzer', 'plain', 'lg block', tag='a')}</div></main>'''
    return page('Гость — ссылка не работает', body)


def S_privacy():
    items = [('eye', 'Читаем переписку один раз', 'Когда вы нажимаете «Разобрать» или «Обновить»'),
             ('check', 'Храним только итог', 'Подсчёты, часы, частые слова и эмодзи'),
             ('lock', 'Тексты сообщений не храним', 'Ни у себя, ни в ссылках'),
             ('shield', 'Сеанс Telegram — ваш', 'Он виден в аккаунте и в Telegram, завершить можно в любой момент'),
             ('trash', 'Отчёт можно удалить', 'Вместе с «Итогами» и ссылками — в меню отчёта')]
    g = group([row(lead_ic(i), t, m, '', 'wrap') for i, t, m in items])
    faq = group([row('', q, '', '', '', True, True) for q in ['Что увидит человек по ссылке?', 'Узнает ли собеседник?', 'Почему нужен вход через Telegram?']], 'Частые вопросы')
    body = ph_plain_nav() + f'''<main class="page"><div class="stack gap-2"><h1 class="t-h1">Как мы обращаемся с данными</h1>
  <p class="t-body muted">Коротко и без мелкого шрифта.</p></div>{g}{faq}</main>'''
    return page('Как мы обращаемся с данными', body)


LINKS = [('mila', 'Отчёт «Мила»', 'Открыли 3 раза', True), ('mama', 'Угадайка «Мама»', 'Мама ответила 6 ноября', True), ('katya', 'Отчёт «Катя»', 'Выключена 5 ноября', False)]
DEVICES = [('monitor', 'TG Analyzer — этот сеанс', 'Chrome, Москва, сейчас'), ('phone', 'iPhone 15', 'Telegram для iOS, 2 минуты назад'), ('laptop', 'MacBook Air', 'Telegram Desktop, вчера')]


def account_groups(pc=False):
    lang = '<span class="v">Русский</span>'
    look = group([row('', 'Язык', '', lang, '', True, True), row('', 'Тема', '', '<span class="v">Как в системе</span>', '', True, True),
                  row('', 'Часовой пояс', 'По нему считаются дни и часы' if pc else '', '<span class="v">Москва, UTC+3</span>')], 'Оформление')
    notify = group([row('', 'Писать в Telegram', 'Когда отчёт готов', switch(True, 'Писать в Telegram, когда отчёт готов'))], 'Уведомления')
    links = group([row(av(k, 32), t, m, switch(on, f'{t}: ссылка {"включена" if on else "выключена"}')) for k, t, m, on in LINKS], 'Ссылки на отчёты',
                  'Выключенная ссылка перестаёт открываться. Включить её можно снова.')
    devices = group([row(lead_ic(i), t, m) for i, t, m in DEVICES], 'Устройства Telegram', 'Завершить сеанс другого устройства можно в Telegram.')
    out = group([row('', 'Выйти', '', '', '', False, True)], '', 'Завершим сеанс TG Analyzer в Telegram. Отчёты останутся.')
    return look, notify, links, devices, out


def S_account(theme=None):
    look, notify, links, devices, out = account_groups()
    body = f'''<main class="page">
  <div class="row-f gap-4">{av(None, 64, True)}<div class="stack"><h1 class="t-h1">Дима</h1><p class="t-small muted">@dima_k, +7 912 •••-••-89</p></div></div>
  {look}{notify}{links}{devices}{out}
</main>'''
    return page('Аккаунт', ph_plain_nav('Аккаунт') + body, theme=theme, h=1260)


def numpad():
    keys = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '⌫']]
    return '<div class="kb" aria-hidden="true">' + ''.join('<div class="r">' + ''.join(f'<i class="{"blank" if k == "" else "fn" if k == "⌫" else ""}">{k}</i>' for k in r) + '</div>' for r in keys) + '</div>'


def letters():
    rows = ['йцукенгшщзх', 'фывапролджэ', 'ячсмитьбю']
    out = '<div class="r">' + ''.join(f'<i>{c}</i>' for c in rows[0]) + '</div><div class="r">' + ''.join(f'<i>{c}</i>' for c in rows[1]) + '</div>'
    out += '<div class="r"><i class="fn" style="max-width:42px">⇧</i>' + ''.join(f'<i>{c}</i>' for c in rows[2]) + '<i class="fn" style="max-width:42px">⌫</i></div>'
    out += '<div class="r"><i class="fn" style="max-width:88px">123</i><i style="max-width:none;font-size:15px">пробел</i><i class="fn" style="max-width:88px">Готово</i></div>'
    return f'<div class="kb letters" aria-hidden="true">{out}</div>'


def login(content):
    nav = f'<header class="nav-ph">{ibtn("back", "Назад")}<div class="grow"></div><a href="#" class="t-ui muted" style="padding:var(--space-2)">Приватность</a></header>'
    return f'<div class="stack" style="height:100%;background:var(--surface)">{nav}<main class="stack" style="padding:var(--space-6) var(--page-gutter)">{content}</main></div>'


def phone_field(code='ru', dial='+7', number='912 345-67-89', state='focus'):
    return (f'<div class="field {state}" style="padding-left:var(--space-2)"><button class="row-f gap-2 t-ui" style="height:36px;padding:0 var(--space-2);border-radius:var(--radius-xs);background:var(--surface-2)" '
            f'aria-label="Код страны: {dial}" aria-haspopup="menu">{flag(code, 20)}{dial}{ic("down")}</button><span>{number}</span></div>')


def country_menu(top, left, width):
    items = ''.join(f'<button class="mi {"on" if c == "ru" else ""}" role="menuitemradio" aria-checked="{str(c == "ru").lower()}">{flag(c, 20)}<span class="grow">{n}</span><span class="muted">{d}</span></button>' for c, n, d in COUNTRIES)
    return f'<div class="menu" role="menu" aria-label="Код страны" style="left:{left}px;top:{top}px;width:{width}px">{items}<hr><button class="mi" role="menuitem">{ic("globe")}<span class="grow">Другая страна</span></button></div>'


def S_login(menu=False):
    c = f'''<h1 class="t-h1">Ваш номер в Telegram</h1>
  <p class="t-body muted" style="margin-top:var(--space-2)">Пришлём код в приложение Telegram.</p>
  <label class="label" style="margin:var(--space-8) 0 var(--space-2)" for="tel">Номер телефона</label>
  {phone_field()}
  <div style="margin-top:var(--space-6)">{btn('Получить код', 'primary', 'xl block')}</div>'''
    over = country_menu(262, 16, 358) if menu else numpad()
    return page('Вход — номер' + (', код страны' if menu else ''), login(c) + over)


def S_code():
    c = f'''<h1 class="t-h1">Код из Telegram</h1>
  <p class="t-body muted" style="margin-top:var(--space-2)">Отправили в приложение Telegram на +7 912 345-67-89. <a href="#" style="color:var(--text);text-decoration:underline;text-underline-offset:3px">Изменить номер</a></p>
  <div class="otp" style="margin-top:var(--space-8)" role="group" aria-label="Код из пяти цифр, одно поле"><span>1</span><span>2</span><span>3</span><span class="focus"></span><span></span></div>
  <p class="t-small muted" style="margin-top:var(--space-3)">Отправить снова через 0:42</p>
  <div style="margin-top:var(--space-6)">{btn('Войти', 'primary', 'xl block')}</div>'''
    return page('Вход — код', login(c) + numpad())


def S_password():
    c = f'''<h1 class="t-h1">Облачный пароль</h1>
  <p class="t-body muted" style="margin-top:var(--space-2)">В Telegram включена двухэтапная защита. Пароль проверяет Telegram, мы его не храним.</p>
  <label class="label" style="margin:var(--space-8) 0 var(--space-2)">Пароль</label>
  <div class="field error" style="padding-right:var(--space-1)"><span class="grow" style="font-size:20px;letter-spacing:3px">••••••••</span><button class="icon-btn" style="background:none;color:var(--text-muted)" aria-label="Показать пароль" aria-pressed="false">{ic('eye')}</button></div>
  <p class="err" role="alert" style="margin-top:var(--space-2)">{ic('alert')}Пароль не подошёл. Подсказка: «кот»</p>
  <div style="margin-top:var(--space-6)">{btn('Войти', 'primary', 'xl block')}</div>
  <a href="#" class="t-small muted" style="margin-top:var(--space-4);text-align:center">Забыли пароль? Сбросить его можно только в Telegram</a>'''
    return page('Вход — облачный пароль', login(c) + letters())


def S_landing():
    def person(key, fact, value, seed):
        name, _, hue = P[key]
        return f'<div class="tile poster" data-hue="{hue}" style="gap:var(--space-1)"><span class="t-h3">{value}</span><span class="t-small muted">{fact}</span><span style="margin-top:var(--space-2)">{pulse(40, 12, seed)}</span></div>'
    hero_ = f'''<main class="stack gap-4" style="padding:var(--space-6) var(--page-gutter) 160px">
  <h1 class="t-display" style="font-size:52px;line-height:52px">Зеркало ваших переписок</h1>
  <p class="t-body muted">Кто пишет первым, кто отвечает быстрее, о чём вы говорите и когда. Отчёт по любому чату Telegram за пару минут — без хранения текстов.</p>
  <div class="cards" aria-label="Примеры" style="margin-top:var(--space-3)">{person('mila', 'Пишете на равных', 'Мила, 51 на 49', 1)}{person('artyom', 'Отвечает быстрее вас', 'Артём, в 3 раза', 2)}</div>
</main>'''
    nav = f'<header class="nav-ph between">{logo(28, word=True)}<a href="#" class="t-ui">Войти</a></header>'
    bar = f'<div class="stack gap-2" style="position:absolute;left:0;right:0;bottom:0;padding:var(--space-3) var(--page-gutter) 34px;background:var(--bg)">{btn("Войти через Telegram", "primary", "xl block", tag="a")}{btn("Посмотреть пример отчёта", "plain", "md block", tag="a")}</div>'
    return page('Лендинг', nav + hero_ + bar)


SCREENS = [
    ('ph-landing', 'Лендинг', S_landing), ('ph-login', 'Вход — номер', S_login), ('ph-country', 'Вход — код страны', lambda: S_login(True)), ('ph-code', 'Вход — код', S_code),
    ('ph-password', 'Вход — пароль, ошибка', S_password), ('ph-first', 'Первый вход', S_first), ('ph-home', 'Главная', S_home), ('ph-progress', 'Главная — идёт разбор', S_progress),
    ('ph-progress-open', 'Разбор — подробности', S_progress_open), ('ph-new', 'Лист «Новый анализ»', S_new), ('ph-menu', 'Действия с отчётом', S_menu), ('ph-delete', 'Удалить отчёт?', S_delete),
    ('ph-session', 'Сеанс Telegram завершён', S_session), ('ph-account', 'Аккаунт', S_account), ('ph-privacy', 'Как мы обращаемся с данными', S_privacy),
    ('ph-report', 'Отчёт — постер', S_report), ('ph-together', 'Отчёт — Вы двое', S_together), ('ph-time', 'Отчёт — Время', S_time),
    ('ph-words', 'Отчёт — О чём', S_words), ('ph-ending', 'Отчёт — конец', S_ending), ('ph-share', 'Лист «Поделиться»', S_share),
    ('ph-link', 'Ссылка на отчёт', S_link), ('ph-story-cover', 'Итоги — обложка', S_story_cover), ('ph-story', 'Итоги — Вы двое', S_story),
    ('ph-story-end', 'Итоги — последний кадр', S_story_end), ('ph-group', 'Группа — Люди', S_group), ('ph-group-talk', 'Группа — Общение', S_group_talk),
    ('ph-member', 'Группа — участник', S_member), ('ph-guest', 'Гость — отчёт', S_guest), ('ph-quiz-start', 'Гость — угадайка, старт', S_quiz_start),
    ('ph-quiz', 'Гость — угадайка, вопрос', S_quiz), ('ph-quiz-end', 'Гость — угадайка, итог', S_quiz_end), ('ph-link-off', 'Гость — ссылка не работает', S_link_off),
    ('ph-dark-home', 'Тёмная — главная', lambda: S_home('dark')), ('ph-dark-report', 'Тёмная — отчёт', lambda: S_report('dark')),
]
