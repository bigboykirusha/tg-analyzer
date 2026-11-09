"""Desktop screens (1440×900, people sidebar) and tablet (820×1180, phone shell with a wider column)."""
from kit import *
from phone import (HERO_SHARE, T_SPEED, T_QUESTIONS, T_HABITS, T_HOURS, T_RECORDS, WORD, VOCAB, EMOJI, LEDE, PARTS, stale,
                   member_body, member_rows, awards_tile, pairs_tile, PRIVACY_NOTE, lead_mila, poster_ph, FAB, waiting_rows, chapter_head,
                   progress_body, NEW_DATA, new_rows, account_groups, phone_field, STORY_TOGETHER, STORY_ACTIONS)

MAIN = 'flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;position:relative'


def shell(side, main, **kw):
    title = kw.pop('title')
    return page(title, f'<div style="display:flex;height:100%">{side}<main style="{MAIN}">{main}</main></div>', pc=True, **kw)


def sec(title, inner, extra=''):
    return f'<section class="section"><div class="row-f between"><h2 class="t-h2">{title}</h2>{extra}</div>{inner}</section>'


def quiz_tile():
    """Same anatomy as the lead tile: label, answer, body, actions at the bottom."""
    dots = ''.join(f'<i style="width:24px;height:24px;border-radius:50%;background:{"var(--you)" if k < 4 else "var(--surface-2)"}"></i>' for k in range(5))
    return f'''<article class="tile">
  <a href="#" class="ev-label t-small muted">{av('mama', 24)}Мама ответила на угадайку</a>
  <h3 class="a">Угадала 4 из 5</h3><span class="row-f gap-2" role="img" aria-label="4 верных ответа из 5">{dots}</span>
  <p class="t-small muted">Ошиблась в одном: кто дольше записывает голосовые.</p>
  <div class="row-f gap-2 mt-auto">{btn('Открыть отчёт', 'secondary', '', tag='a')}</div></article>'''


def month_tile():
    data = [('mila', 980), ('dima', 413), ('anna', 304)]
    segs = ''.join(f'<i data-hue="{P[k][2]}" style="flex:{n};background:var(--them)"></i>' for k, n in data) + '<i style="flex:838;background:var(--chart-neutral)"></i>'
    rows = ''.join(f'<div class="row-f gap-2">{av(k, 24)}<span class="t-small grow trunc">{P[k][0]}</span><span class="val">{n}</span></div>' for k, n in data)
    return f'''<article class="tile"><p class="q ev-label">Ваши 30 дней</p><h3 class="a">Больше всего — с Милой</h3>
  <div class="bar" role="img" aria-label="Мила 980, Дима (работа) 413, Анна Петрова 304, остальные 838">{segs}</div>
  <div class="stack gap-2">{rows}</div><p class="note mt-auto">2 535 сообщений в 7 личных чатах</p></article>'''


def home_reports(menu=''):
    return ('<div class="grid-4">' + mini_poster('mila', '4 800 сообщений', 1, 188, menu=menu) + mini_poster('mama', '1 900 сообщений', 2, 188)
            + mini_poster('team', '9 000 сообщений', 3, 188) + mini_poster('katya', '130 сообщений', 4, 188) + '</div>')


def home_main(menu='', busy=None):
    return f'''<div class="page page-max">
  <div class="stack gap-1"><h1 class="t-h1">Добрый вечер, Дима</h1><p class="t-body muted">Вот что нового в ваших переписках.</p></div>
  {sec('Сейчас главное', f'<div class="grid-3">{lead_mila()}{quiz_tile()}{month_tile()}</div>')}
  {sec('Отчёты', home_reports(menu))}
  {sec('Ещё не разобраны', group(waiting_rows(3, 'md', busy, True)))}
</div>'''


def D_home(theme=None):
    return shell(sidebar('home'), home_main(), title='Главная', theme=theme)


def D_menu():
    menu = f'''<div class="menu" role="menu" aria-label="Отчёт «Мила»" style="right:var(--space-2);top:48px;width:260px">
  <button class="mi on" role="menuitem">{ic('refresh')}Обновить отчёт</button><button class="mi" role="menuitem">{ic('share')}Поделиться</button><hr>
  <button class="mi danger" role="menuitem">{ic('trash')}Удалить отчёт</button></div>'''
    return shell(sidebar('home'), home_main(menu), title='Главная — действия с отчётом')


def D_first():
    def card(key, meta, seed, primary):
        name, _, hue = P[key]
        return f'''<article class="tile poster" data-hue="{hue}" style="gap:var(--space-1);padding:var(--space-6)">{av(key, 40)}
  <h2 class="t-h3" style="margin-top:var(--space-3)">{name}</h2><p class="t-small muted">{meta}</p>
  <span style="margin:var(--space-4) 0">{pulse(36, 10, seed, mirrored=False)}</span>
  <div class="mt-auto">{btn('Разобрать', 'poster' if primary else 'poster-2', 'md', aria=f'Разобрать: {name}')}</div></article>'''
    top = f'<div class="grid-3">{card("mila", "Чаще всех — 980 сообщений за месяц", 1.0, True)}{card("dima", "413 сообщений за месяц", 2.0, False)}{card("anna", "304 сообщения за месяц", 3.0, False)}</div>'
    rows = [('artyom', '268 сообщений за месяц'), ('mama', '240 сообщений за месяц'), ('sofia', '200 сообщений за месяц'), ('family', 'Группа, 180 сообщений за месяц'), ('katya', '130 сообщений за месяц'), ('run', 'Группа, 120 сообщений за месяц')]
    g = group([row(av(k), P[k][0], m, btn('Разобрать', 'secondary', 'md', aria=f'Разобрать: {P[k][0]}')) for k, m in rows]
              + [row(lead_ic('search'), 'Все чаты Telegram', '', '', '', True, True)], 'Или кто-то ещё')
    main = f'''<div class="page page-max">
  <div class="stack gap-2"><h1 class="t-h1">С кого начнём?</h1><p class="t-body muted">Самые активные чаты месяца. Отчёт будет готов через минуту-две.</p></div>
  {top}{g}</div>'''
    return shell(sidebar('home', empty=True), main, title='Первый вход')


def poster_pc(name='Мила', meta='4 800 сообщений с 9 апреля по 2 ноября 2026', legend=('Вы', 'Мила'), extra='', up_scale=1.0):
    return f'''<section class="poster stack gap-3" style="padding:var(--space-8) var(--page-gutter) var(--space-6)">
  <div class="row-f between start gap-6"><div class="poster-name grow"><h1 class="t-display">{name}</h1></div>
  <div class="row-f gap-2" style="flex:none">{btn('Смотреть итоги', 'poster', 'md', 'play')}{btn('Поделиться', 'poster-2', 'md', 'share')}</div></div>
  <p class="t-body muted">{meta}</p>{extra}
  <div class="legend" style="margin-top:var(--space-2)"><span><i></i>{legend[0]}</span><span><i class="f"></i>{legend[1]}</span></div>
  {pulse(120, 40, 1.0, up_scale=up_scale)}
  <div class="axis"><span>апрель 2026</span><span>ноябрь 2026</span></div>
</section>'''


def report_bar(name, chapter=''):
    """The header after the poster has scrolled away: material, the name, the chapter under it, one action. No chapter switcher."""
    ch = f'<span class="t-caption muted" style="font-weight:400">{chapter}</span>' if chapter else ''
    return f'<div class="row-f gap-4 material" style="padding:var(--space-2) var(--page-gutter)"><span class="grow stack"><b class="t-title" style="font-weight:600">{name}</b>{ch}</span>{btn("Поделиться", "secondary", "md", "share")}</div>'


T_VOICE = tile('Голосовые', 'Мила записывает дольше', cmp('Вы', 'Мила', '1 ч 12 мин', '1 ч 45 мин', 41)
               + '<div class="stack">' + kv('Вместе', '2 ч 57 мин') + kv('Самое длинное', '4 мин 10 с', 'Мила, 18 мая') + '</div>')


def cols2(a, b):
    return f'<div class="grid-2" style="align-items:start"><div class="cards">{a}</div><div class="cards">{b}</div></div>'


CH = ['Вы двое', 'Время', 'О чём']


def D_report(theme=None):
    body = f'''<div class="cards" style="padding:var(--space-6) var(--page-gutter)">{stale()}{chapter_head('Вы двое', LEDE['together'])}{HERO_SHARE}{cols2(T_SPEED + T_HABITS, T_QUESTIONS + T_VOICE)}</div>'''
    return shell(sidebar('mila'), poster_pc() + body, title='Отчёт — Вы двое', hue='green', room=True, theme=theme)


def D_time():
    heat_tile = tile('Активность по дням', 'Писали друг другу 196 из 208 дней', months_heat())
    body = f'''<div class="cards" style="flex:1;min-height:0;overflow:hidden;padding:var(--space-6) var(--page-gutter)">{chapter_head('Время', LEDE['time'])}
  {T_HOURS}{records_pc()}{heat_tile}
  <div style="height:var(--space-6)"></div>{chapter_head('О чём', LEDE['words'])}<div class="grid-2">{WORD}{VOCAB}</div></div>'''
    body = body.replace('Мила', 'Мама')  # a second person: the same chapter in her colour
    return shell(sidebar('mama'), report_bar('Мама', 'Время, 2 из 3') + body, title='Отчёт — Время', hue='orange', room=True)


def records_pc():
    facts = ''.join(f'<div class="stack gap-1"><span class="t-small muted">{k}</span><b class="t-title" style="font-weight:600">{v}</b><span class="t-small muted">{d}</span></div>'
                    for k, v, d in [('Самый долгий разговор', '14 ч 39 мин', '23 апреля'), ('Больше всего за день', '96 сообщений', '23 апреля'), ('Самая длинная пауза', '6 дней', 'в июле')])
    return tile('Ваши рекорды', '23 апреля — ваш день рекордов', f'<div class="grid-3">{facts}</div>')


def ending_pc():
    return f'''<section class="tile poster" style="flex-direction:row;align-items:center;gap:var(--space-8);padding:var(--space-8)">
  <div class="stack gap-3" style="width:420px;flex:none"><h2 class="t-h1">Итоги: Мила</h2><p class="t-body muted">Главное о вашей переписке в четырёх кадрах. Их можно скачать картинками или поделиться ссылкой.</p>
  <div class="row-f gap-2">{btn('Смотреть итоги', 'poster', 'md', 'play')}{btn('Поделиться', 'poster-2', 'md', 'share')}</div></div>
  <div class="grow">{pulse(64, 40, 3.0)}</div></section>'''


def D_words():
    body = f'''<div class="cards" style="flex:1;min-height:0;justify-content:flex-end;overflow:hidden;padding:0 var(--page-gutter) var(--space-10)">{chapter_head('О чём', LEDE['words'])}
  <div class="grid-2">{WORD}{VOCAB}</div>{EMOJI}{ending_pc()}</div>'''
    return shell(sidebar('mila'), report_bar('Мила', 'О чём, 3 из 3') + body, title='Отчёт — О чём', hue='green', room=True)


def D_group():
    cast = '<div class="row-f gap-4" style="margin-top:var(--space-2)">' + ''.join(f'<span class="stack gap-1" style="align-items:center">{av(k, 40)}<span class="t-caption" style="font-weight:400">{P[k][0]}</span></span>' for k in ['sergey', 'alexey', 'natasha', 'maria', 'yulia']) + '<span class="stack gap-1" style="align-items:center"><span class="av av-40 add">+3</span><span class="t-caption" style="font-weight:400">ещё</span></span></div>'
    poster = poster_pc('Продуктовая команда', '9 000 сообщений, 8 участников, с 30 апреля 2026', ('Вы', 'Остальные'), cast, up_scale=0.2)
    members = tile('Кто и как участвует', 'Ядро — четыре человека', member_rows('sergey') + row('', 'Все участники (8)', '', '', 'compact', True, True), rows=True)
    inspector = f'<aside class="inspector" aria-label="Сергей">{member_body()}</aside>'
    body = f'''<div style="padding:var(--space-6) var(--page-gutter) 0">{chapter_head('Люди', 'Пишут все понемногу, без явных лидеров')}</div><div style="display:grid;grid-template-columns:minmax(0,1fr) var(--inspector);gap:var(--card-gap);padding:var(--space-3) var(--page-gutter);align-items:start">
  <div class="cards">{members}{awards_tile()}</div>{inspector}</div>'''
    return shell(sidebar('team'), poster + body, title='Группа — Люди', hue='pink', room=True)


def D_progress():
    return shell(sidebar('home', progress='dima'), home_main(busy='dima'), title='Идёт разбор')


def D_progress_open():
    dlg = f'''<section class="dialog md" role="dialog" aria-modal="true" aria-label="Разбираем переписку" style="top:150px">
  <div class="row-f gap-3"><h2 class="t-h3 grow">Разбираем переписку</h2>{ibtn('x', 'Свернуть')}</div>
  {progress_body(True)}
  <div class="stack">{row('', 'Написать, когда будет готов', 'Сообщение придёт в Telegram', switch(True, 'Написать в Telegram, когда отчёт будет готов'))}</div>
  <div class="row-f end">{btn('Отменить разбор', 'tinted', 'md')}</div></section>'''
    behind = f'<div style="display:flex;height:100%" aria-hidden="true" inert>{sidebar("home", progress="dima")}<main style="{MAIN}">{home_main(busy='dima')}</main></div>'
    return page('Разбор — подробности', behind + '<div class="scrim"></div>' + dlg, pc=True)


def D_new():
    data = NEW_DATA + [('run', 'Группа, писали 4 часа назад', 'new')]
    main = f'''<div class="page" style="max-width:var(--page-max-narrow)">
  <div class="stack gap-1"><h1 class="t-h1">Новый анализ</h1><p class="t-body muted">Выберите чат — отчёт будет готов через минуту-две.</p></div>
  <div class="row-f gap-4">{search('Поиск чата', '<span class="kbd">/</span>').replace('class="search"', 'class="search grow"')}{filters(['Все', 'Личные', 'Группы'], 0, 'Какие чаты')}</div>
  <div class="group">{new_rows('md', data)}</div></div>'''
    return shell(sidebar('none'), main, title='Новый анализ')


def story_cover_card():
    return f'''<div class="poster stack" data-hue="green" style="width:240px;aspect-ratio:9/16;border-radius:var(--radius-lg);padding:var(--space-3) var(--space-4) var(--space-4);flex:none">
  <div class="story-seg" style="grid-template-columns:repeat(4,1fr)"><i class="on"></i><i></i><i></i><i></i></div>
  <div class="stack grow gap-3" style="justify-content:center">{pulse(24, 28, 1.0)}<div class="stack gap-1"><b class="t-h1">Мила</b><span class="t-small muted">4 800 сообщений за 208 дней</span></div></div>
  {btn('Смотреть итоги', 'poster', 'md block', 'play')}</div>'''


def D_share():
    dlg = f'''<section class="dialog" role="dialog" aria-modal="true" aria-label="Поделиться" style="top:120px;width:640px;margin-left:-320px;flex-direction:row;gap:var(--space-6)">
  {story_cover_card()}
  <div class="stack grow gap-4"><div class="row-f gap-3"><h2 class="t-h3 grow">Поделиться</h2>{ibtn('x', 'Закрыть')}</div>
  <div class="stack">{row(lead_ic('download'), 'Скачать картинки', 'Четыре кадра для сторис', '', '', False, True)}{row(lead_ic('send'), 'Отправить', 'Через меню «Поделиться» системы', '', '', False, True)}</div>
  <div class="stack"><h3 class="t-small muted" style="font-weight:400;padding-top:var(--space-2)">По ссылке</h3>
  {row(lead_ic('link'), 'Ссылка на отчёт', 'Откроется без входа', '', '', True, True)}
  {row(lead_ic('users'), 'Угадайка', 'Мила угадывает, кто что пишет', '', '', True, True)}</div></div></section>'''
    behind = f'<div style="display:flex;height:100%" aria-hidden="true" inert>{sidebar("mila")}<main style="{MAIN}">{poster_pc()}</main></div>'
    return page('Окно «Поделиться»', behind + '<div class="scrim"></div>' + dlg, pc=True, hue='green', room=True)


def D_stories():
    slide = f'''<div class="poster stack phone-scale" data-hue="green" role="dialog" aria-modal="true" aria-label="Итоги, кадр 2 из 4" style="position:absolute;left:50%;top:48px;width:440px;height:782px;margin-left:-220px;border-radius:var(--radius-lg);padding:var(--space-3) var(--space-6) var(--space-6);overflow:hidden">
  <div class="story-seg" style="grid-template-columns:repeat(4,1fr)"><i class="on"></i><i class="on"></i><i></i><i></i></div>
  <div class="row-f between" style="margin-top:var(--space-3)"><span class="t-ui">Вы двое, 2 из 4</span>{ibtn('pause', 'Пауза', 'on-poster')}</div>
  {STORY_TOGETHER}{STORY_ACTIONS.replace('"btn btn-poster-2 lg', '"btn btn-poster-2 md')}</div>'''
    nav = (f'<button class="icon-btn lg" aria-label="Предыдущий кадр" style="position:absolute;left:428px;top:415px">{ic("back")}</button>'
           f'<button class="icon-btn lg" aria-label="Следующий кадр" style="position:absolute;right:428px;top:415px">{ic("chev")}</button>'
           f'<button class="icon-btn lg" aria-label="Закрыть" style="position:absolute;right:var(--space-6);top:var(--space-6)">{ic("x")}</button>'
           f'<p class="t-small" style="position:absolute;left:var(--space-6);bottom:var(--space-6);color:var(--story-hint)">← → листать, пробел — пауза, Esc — закрыть</p>')
    return page('Итоги на ПК', f'<div class="backdrop" style="position:absolute;inset:0"></div>{slide}{nav}', pc=True)


def D_account():
    look, notify, links, devices, out = account_groups(pc=True)
    main = f'''<div class="page page-max">
  <div class="row-f gap-4">{av(None, 64, True)}<div class="stack"><h1 class="t-h1">Дима</h1><p class="t-small muted">@dima_k, +7 912 •••-••-89</p></div></div>
  <div class="grid-2" style="gap:var(--page-gap);align-items:start"><div class="stack gap-8">{look}{notify}{out}</div><div class="stack gap-8">{links}{devices}</div></div>
</div>'''
    return page('Аккаунт', f'<div style="display:flex;height:100%">{sidebar("account")}<main style="{MAIN}">{main}</main></div>', pc=True)


def pub_header(nav=True):
    """Header of every public desktop page: logo on the column edge, site links on the right."""
    links = (f'<nav class="row-f gap-8 t-ui" aria-label="Сайт"><a href="#" class="muted">Пример отчёта</a><a href="#" class="muted">Приватность</a>'
             f'{btn("Войти", "secondary", "md", tag="a")}</nav>') if nav else ''
    return f'<header class="row-f between" style="padding:var(--space-6) var(--page-gutter);width:100%;max-width:var(--page-max);margin:0 auto">{logo(32, word=True)}{links}</header>'


def pub_footer():
    return (f'<footer class="row-f between t-small muted" style="padding:var(--space-6) var(--page-gutter);width:100%;max-width:var(--page-max);margin:0 auto">'
            f'<span>Неофициальный сервис, работает через Telegram API</span>'
            f'<span class="row-f gap-4"><a href="#">Приватность</a><a href="#" class="row-f gap-2" aria-label="Язык: русский">{ic("globe")}RU</a>'
            f'<button class="icon-btn sm" style="background:none;color:var(--text-muted)" aria-label="Тема: как в системе">{ic("moon")}</button></span></footer>')


def D_login():
    card = f'''<section class="stack" style="width:440px;background:var(--surface);border-radius:var(--radius-xl);padding:var(--space-8)">
  <h1 class="t-h2">Ваш номер в Telegram</h1>
  <p class="t-body muted" style="margin-top:var(--space-2)">Пришлём код в приложение Telegram.</p>
  <label class="label" style="margin:var(--space-6) 0 var(--space-2)">Номер телефона</label>
  {phone_field()}
  <div style="margin-top:var(--space-6)">{btn('Получить код', 'primary', 'xl block')}</div></section>'''
    body = f'''{pub_header(nav=False)}
  <main class="grow row-f center">{card}</main>
  {pub_footer()}'''
    return page('Вход', body, pc=True)


def D_landing():
    def person(key, fact, value, seed, big=False):
        name, _, hue = P[key]
        if big:
            return f'<div class="tile poster" data-hue="{hue}" style="grid-column:1/-1;gap:var(--space-1);padding:var(--space-8);border-radius:var(--radius-xl)"><span class="t-h1">{value}</span><span class="t-body muted">{fact}</span><span style="margin-top:var(--space-6)">{pulse(90, 34, seed)}</span></div>'
        return f'<div class="tile poster" data-hue="{hue}" style="gap:var(--space-1)"><span class="t-h3">{value}</span><span class="t-small muted">{fact}</span><span style="margin-top:var(--space-4)">{pulse(40, 16, seed)}</span></div>'
    comp = f'<div class="grid-2" aria-label="Примеры">{person("mila", "Пишете на равных, отвечаете одинаково быстро", "Мила, 51 на 49", 1, True)}{person("artyom", "Отвечает быстрее вас", "Артём, в 3 раза", 2)}{person("mama", "Чаще всего пишете вечером", "Мама, с 19 до 22", 3)}</div>'
    body = f'''{pub_header()}
  <main class="grow" style="display:grid;grid-template-columns:5fr 6fr;gap:var(--space-16);align-items:center;padding:0 var(--page-gutter) var(--space-10);width:100%;max-width:var(--page-max);margin:0 auto">
  <div class="stack gap-6"><h1 class="t-display">Зеркало ваших переписок</h1>
  <p class="t-body muted" style="max-width:60ch">Кто пишет первым, кто отвечает быстрее, о чём вы говорите и когда. Отчёт по любому чату Telegram за пару минут — без хранения текстов.</p>
  <div class="row-f gap-3">{btn('Войти через Telegram', 'primary', 'xl', tag='a')}{btn('Пример отчёта', 'secondary', 'xl', tag='a')}</div></div>{comp}</main>'''
    return page('Лендинг', body, pc=True)


def D_guest():
    poster = f'''<section class="poster stack gap-3" style="padding:var(--space-6) max(var(--page-gutter), calc((100% - var(--page-max)) / 2 + var(--page-gutter))) var(--space-8)">
  <div class="row-f between">{logo(32, word=True)}<a href="#" class="t-ui">Приватность</a></div>
  <div class="poster-name" style="margin-top:var(--space-10)"><h1 class="t-display">Дима и Мила</h1></div>
  <p class="t-body muted">Дима поделился с вами отчётом о переписке: 4 800 сообщений с 9 апреля 2026.</p>
  <div style="margin-top:var(--space-4)">{pulse(150, 32, 1.0)}</div><div class="axis"><span>апрель 2026</span><span>ноябрь 2026</span></div></section>'''
    tiles = f'''<h2 class="sr-only">Главное</h2><div class="grid-3" style="padding:var(--space-8) max(var(--page-gutter), calc((100% - var(--page-max)) / 2 + var(--page-gutter)));align-items:stretch">
  {tile('Кто пишет больше', 'Пишете на равных', cmp('Дима', 'Мила', '51%', '49%', 51))}
  {tile('Кто отвечает быстрее', 'Отвечаете одинаково быстро', cmp('Дима', 'Мила', '3 мин', '3 мин') + '<p class="note">Обычно — за 3 минуты.</p>')}
  {tile('Ваше время', 'Пик — с 11:00 до 14:00', hours(h=64))}
  <div style="grid-column:1/3">{tile('Активность по дням', 'Писали друг другу 196 из 208 дней', months_heat(MONTHS[2:], 6))}</div>
  <section class="tile" style="justify-content:space-between"><div class="stack gap-2"><h3 class="a">А как у вас?</h3><p class="note">Разберите любой свой чат Telegram — отчёт будет готов через минуту-две.</p></div>{btn('Разобрать свои переписки', 'primary', 'md block', tag='a')}</section>
  </div>'''
    return page('Гость — отчёт по ссылке', poster + tiles, pc=True, hue='green', room=True)


# ─── tablet: the phone shell, one centred column up to 720 ─────────────────

def T_home():
    reports = ('<div class="grid-4">' + mini_poster('mila', '4 800 сообщений', 1, 160) + mini_poster('mama', '1 900 сообщений', 2, 160)
               + mini_poster('team', '9 000 сообщений', 3, 160) + mini_poster('katya', '130 сообщений', 4, 160) + '</div>')
    body = f'''{ph_home_nav()}<main class="page column" style="padding-bottom:var(--fab-clearance)">
  <div class="stack gap-1"><h1 class="t-h1">Добрый вечер, Дима</h1><p class="t-small muted">Вот что нового в ваших переписках.</p></div>
  <section class="section"><h2 class="t-h2">Сейчас главное</h2><div class="grid-2">{lead_mila()}{quiz_tile()}<div style="grid-column:1/-1">{month_tile()}</div></div></section>
  <section class="section"><h2 class="t-h2">Отчёты</h2>{reports}</section>
  <section class="section"><h2 class="t-h2">Ещё не разобраны</h2>{group(waiting_rows(4))}</section></main>{FAB}'''
    return page('Планшет — главная', body, w=820, h=1180).replace('class="app ph', 'class="app ph tab', 1)


def T_report():
    cards = f'''{chapter_head('Вы двое', LEDE['together'])}{HERO_SHARE}<div class="grid-2">{T_SPEED}{T_QUESTIONS}</div>{T_HABITS}'''.replace('Мила', 'Мама').replace('2 434 и 2 366', '970 и 930')
    body = f'''{poster_ph('Мама', '1 900 сообщений с 9 апреля по 8 ноября 2026', ('Вы', 'Мама'))}<div class="cards column" style="padding:var(--space-6) var(--page-gutter)">{cards}</div>'''
    return page('Планшет — отчёт', body, w=820, h=1180, hue='orange', room=True).replace('class="app ph', 'class="app ph tab', 1)


SCREENS = [
    ('pc-landing', 'Лендинг', D_landing), ('pc-login', 'Вход', D_login), ('pc-first', 'Первый вход', D_first), ('pc-home', 'Главная', D_home),
    ('pc-menu', 'Главная — действия с отчётом', D_menu), ('pc-progress', 'Идёт разбор (свёрнут)', D_progress), ('pc-progress-open', 'Разбор — подробности', D_progress_open),
    ('pc-new', 'Новый анализ', D_new), ('pc-report', 'Отчёт — Вы двое', D_report), ('pc-time', 'Отчёт — Время', D_time),
    ('pc-words', 'Отчёт — О чём и финал', D_words), ('pc-group', 'Группа — Люди, участник', D_group), ('pc-share', 'Окно «Поделиться»', D_share), ('pc-stories', 'Итоги', D_stories),
    ('pc-account', 'Аккаунт', D_account), ('pc-guest', 'Гость — отчёт по ссылке', D_guest),
    ('pc-dark', 'Тёмная — отчёт', lambda: D_report('dark')), ('tab-home', 'Планшет 820 — главная', T_home), ('tab-report', 'Планшет 820 — отчёт', T_report),
]
