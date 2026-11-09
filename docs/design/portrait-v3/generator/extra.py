"""States and screens that complete the set: loading, errors, limits, empty, narrow, English, FAQ, 404, group stories.
Built only from kit/phone/desktop parts — if a screen needs something new, the system is incomplete."""
from kit import *
from phone import (home, lead_mila, FAB, sec, REPORT_TILES, waiting_rows, poster_ph, chapter_head, story, STORY_ACTIONS, dim_home,
                   sheet_head, new_rows, NEW_DATA, S_share, SHARE_ROWS, stories_feature, ph_plain_nav, S_report, S_together)
from desktop import shell, home_main, sec as dsec, pub_header, pub_footer


def skel(w='100%', h=16, r='var(--radius-xs)'):
    return f'<span class="skel" style="display:block;width:{w};height:{h}px;border-radius:{r}"></span>'


def skel_tile(h=148):
    return f'<div class="tile" style="min-height:{h}px">{skel("40%", 12)}{skel("80%", 20)}{skel("60%", 12)}<span class="mt-auto">{skel("100%", 24)}</span></div>'


# ─── phone ──────────────────────────────────────────────────────────────

def S_loading():
    body = f'''{ph_home_nav()}<main class="page" aria-busy="true" style="padding-bottom:var(--fab-clearance)">
  <div class="stack gap-2">{skel("70%", 28)}{skel("50%", 14)}</div>
  {sec('Сейчас главное', skel_tile(176))}
  {sec('Отчёты', '<div class="grid-2">' + skel_tile() + skel_tile() + skel_tile() + skel_tile() + '</div>')}
</main>{FAB}'''
    return page('Главная — загрузка', body)


def S_failed():
    toast = (f'<div class="toast" role="alert" style="left:var(--page-gutter);right:var(--page-gutter);top:64px">{ic("alert")}'
             f'<span class="grow">Не получилось разобрать «Дима (работа)». Telegram был занят.</span><button class="btn">Повторить</button></div>')
    return home(lead_mila()).replace('</main>', '</main>' + toast, 1).replace('<title>Главная</title>', '<title>Разбор не удался</title>')


def S_limit():
    note = (f'<div class="tile" style="flex-direction:row;align-items:center;gap:var(--space-3);background:var(--surface-2)">{lead_ic("lock")}'
            f'<span class="grow stack gap-0-5"><b class="t-small-strong">На сегодня разборы закончились</b><span class="t-small muted">Следующий — завтра в 14:20</span></span></div>')
    data = [(k, m, 'few' if st in ('new', 'update') else st) for k, m, st in NEW_DATA]
    data = [(k, ('Можно завтра в 14:20' if st == 'few' and k != 'oleg' else m), st) for k, m, st in data]
    sheet = f'''<section class="sheet" role="dialog" aria-modal="true" aria-label="Новый анализ" style="top:56px">
  <span class="grabber"></span>
  {sheet_head('Новый анализ')}
  {note}
  <div class="stack">{new_rows(data=data)}</div>
</section>'''
    return page('Лимит на сегодня', dim_home() + '<div class="scrim"></div>' + sheet)


def S_empty():
    body = f'''{ph_home_nav()}<main class="page" style="flex:1;justify-content:center">
  <div class="stack gap-3 start"><span class="empty-ic">{ic("search")}</span>
  <h1 class="t-h1">Пока нечего разбирать</h1>
  <p class="t-body muted">В вашем Telegram нет личных чатов и групп, где есть хотя бы 100 сообщений. Когда переписка наберётся, она появится здесь.</p>
  <div style="margin-top:var(--space-2)">{btn('Обновить список', 'secondary', '', 'refresh')}</div></div>
</main>'''
    return page('Нет чатов для разбора', body)


def S_narrow():
    rows = [row(av('team'), 'Продуктовая команда — запуск весенней кампании', 'Группа, 9 000 сообщений, отчёт от вчера', '', '', True, True),
            row(av('artyom'), 'Артём Ковалёв-Ширяев', '268 за месяц', btn('Разобрать', 'secondary', 'sm'))]
    body = f'''{ph_home_nav()}<main class="page" style="padding-bottom:var(--fab-clearance)">
  <div class="stack gap-1"><h1 class="t-h1">Добрый вечер, Константин</h1><p class="t-small muted">Вот что нового в ваших переписках.</p></div>
  {sec('Сейчас главное', lead_mila())}
  {sec('Отчёты', '<div class="grid-2">' + mini_poster('team', '9 000 сообщений', 3, 160) + mini_poster('mila', '4 800 сообщений', 1, 160) + '</div>')}
  {sec('Ещё не разобраны', group(rows))}
</main>{FAB}'''
    return page('360 px, длинные имена', body, w=360)


def S_english():
    html = S_together()
    for ch in '\u00a0\u202f\u2009\u2060':
        html = html.replace(ch, ' ' if ch != '\u2060' else '')
    for a, b in [('Кто пишет больше', 'Who writes more'), ('Пишете на равных', 'You write equally'), ('2 434 и 2 366 сообщений', '2,434 and 2,366 messages'),
                 ('Кто отвечает быстрее', 'Who replies faster'), ('Отвечаете одинаково быстро', 'You reply just as fast'), ('Обычно — за 3 минуты. Ночью дольше у обоих.', 'Usually within 3 minutes. Slower at night for both.'),
                 ('Кто задаёт вопросы', 'Who asks questions'), ('Спрашиваете поровну', 'You ask equally'), ('Один квадрат — 10 вопросов', 'One square — 10 questions'),
                 ('Ваши привычки', 'Your habits'), ('Разговор начинаете по очереди', 'You take turns starting'), ('Первым пишет утром', 'Writes first in the morning'),
                 ('по очереди', 'in turns'), ('Чаще смеётся', 'Laughs more'), ('поровну', 'equally'), ('«Спокойной ночи» желает', 'Says «good night»'), ('81 раз против 66', '81 times vs 66'),
                 ('Вы двое, 1 из 3', 'You two, 1 of 3'), ('>Вы двое<', '>You two<'), ('>Вы<', '>You<'), ('>Мила<', '>Mila<'), ('Мила</b>', 'Mila</b>'), ('Назад', 'Back'), ('Поделиться', 'Share'),
                 ('3 мин', '3 min'), ('lang="ru"', 'lang="en"'), ('<title>Отчёт — Вы двое</title>', '<title>Report in English</title>')]:
        html = html.replace(a.replace('\xa0', ' ').replace('\u202f', ' '), b)
    return html


FAQ = [('Что увидит человек по ссылке?', 'Только числа и пульс переписки. Имена и частые слова — по вашему выбору. Тексты сообщений не видит никто: мы их не храним.'),
       ('Узнает ли собеседник?', 'Нет. Разбор идёт в вашем аккаунте; собеседник узнает, только если вы поделитесь ссылкой.'),
       ('Почему нужен вход через Telegram?', 'Переписка есть только у Telegram. Мы входим как новое устройство и читаем историю, когда вы нажимаете «Разобрать».'),
       ('Что вы храните?', 'Только итог: подсчёты, часы, частые слова и эмодзи. Тексты сообщений не сохраняются.'),
       ('Как удалить отчёт?', 'В меню отчёта на главной или в «Новом анализе». Вместе с ним удаляются «Итоги» и ссылки.'),
       ('Почему чат не разбирается?', 'Нужно хотя бы 100 сообщений: меньше — и большинство карточек будут пустыми.')]


def faq_group(head=''):
    """One list on every platform: question as the row title, answer as its wrapped second line."""
    return group([row('', q, a, '', 'wrap') for q, a in FAQ], head)


def S_faq():
    body = ph_plain_nav() + f'''<main class="page"><div class="stack gap-2"><h1 class="t-h1">Вопросы и ответы</h1><p class="t-body muted">Коротко о том, как работает TG Analyzer.</p></div>
  {faq_group()}
</main>'''
    return page('Вопросы и ответы', body)


def S_404():
    body = f'''<header class="nav-ph between">{logo(28, word=True)}<a href="#" class="t-small muted">Приватность</a></header>
  <main class="stack gap-3" style="padding:0 var(--page-gutter) var(--space-16);flex:1;justify-content:center">
  <h1 class="t-h1">Такой страницы нет</h1>
  <p class="t-body muted">Возможно, ссылка устарела или в ней опечатка.</p>
  <div class="stack gap-2" style="margin-top:var(--space-4)">{btn('На главную', 'primary', 'xl block', tag='a')}</div></main>'''
    return page('404', body)


def S_group_story():
    c = f'''<div class="stack grow gap-8 story-body">
  <div class="stack gap-3"><h1 class="t-display">В ролях</h1><p class="t-body muted">Пишут все понемногу, ядро — четыре человека</p></div>
  <div class="stack">{''.join(row(av(k, 40), P[k][0], role, f'<span class="val">{v}</span>') for k, role, v in [('sergey', 'Ядро', '22%'), ('alexey', 'Отвечает больше всех', '19%'), ('natasha', 'Пара с Марией', '17%'), ('maria', 'Укладывает чат спать', '15%')])}</div>
</div>'''
    return page('Итоги группы — В ролях', story(c, 2, label='Люди, 2 из 4'), hue='pink')


def S_dark_share():
    return S_share().replace('class="app ph', 'data-theme="dark" class="app ph', 1).replace('<div class="app ph', '<div data-theme="dark" class="app ph', 1)


# ─── desktop ────────────────────────────────────────────────────────────

def D_loading():
    main = f'''<div class="page page-max" aria-busy="true">
  <div class="stack gap-2">{skel("40%", 32)}{skel("30%", 16)}</div>
  {dsec('Сейчас главное', '<div class="grid-3">' + skel_tile(220) * 3 + '</div>')}
  {dsec('Отчёты', '<div class="grid-4">' + skel_tile(188) * 4 + '</div>')}
</div>'''
    return shell(sidebar('home'), main, title='Главная — загрузка')


def D_faq():
    priv = [('eye', 'Читаем переписку один раз', 'Когда вы нажимаете «Разобрать» или «Обновить»'),
            ('check', 'Храним только итог', 'Подсчёты, часы, частые слова и эмодзи'),
            ('lock', 'Тексты сообщений не храним', 'Ни у себя, ни в ссылках')]
    side = group([row(lead_ic(i), t, m, '', 'wrap') for i, t, m in priv] + [row('', 'Как мы обращаемся с данными', '', '', '', True, True)], 'Коротко о данных')
    main = f'''<main class="page" style="width:100%;max-width:var(--page-max);margin:0 auto;padding:var(--space-6) var(--page-gutter) var(--space-16)">
  <div class="stack gap-2"><h1 class="t-h1">Вопросы и ответы</h1><p class="t-body muted">Коротко о том, как работает TG Analyzer.</p></div>
  <div style="display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:var(--space-10);align-items:start">{faq_group('Частые вопросы')}{side}</div></main>'''
    return page('Вопросы и ответы', pub_header() + main, pc=True)


def D_404():
    card = f'''<section class="stack" style="width:440px;background:var(--surface);border-radius:var(--radius-xl);padding:var(--space-8)">
  <h1 class="t-h2">Такой страницы нет</h1>
  <p class="t-body muted" style="margin-top:var(--space-2)">Возможно, ссылка устарела или в ней опечатка.</p>
  <div style="margin-top:var(--space-6)">{btn('На главную', 'primary', 'xl block', tag='a')}</div></section>'''
    return page('404', pub_header(nav=False) + f'<main class="grow row-f center">{card}</main>' + pub_footer(), pc=True)


PH_EXTRA = [('ph-loading', 'Главная — загрузка', S_loading), ('ph-failed', 'Разбор не удался', S_failed), ('ph-limit', 'Лимит на сегодня', S_limit),
            ('ph-empty', 'Нет чатов для разбора', S_empty), ('ph-narrow', '360 px, длинные имена', S_narrow), ('ph-english', 'Отчёт на английском', S_english),
            ('ph-faq', 'Вопросы и ответы', S_faq), ('ph-404', '404', S_404), ('ph-group-story', 'Итоги группы', S_group_story), ('ph-dark-share', 'Тёмная — «Поделиться»', S_dark_share)]
PC_EXTRA = [('pc-loading', 'Главная — загрузка', D_loading), ('pc-faq', 'Вопросы и ответы', D_faq), ('pc-404', '404', D_404)]
