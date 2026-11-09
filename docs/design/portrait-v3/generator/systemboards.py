"""Two boards that document the system. Values are read from system.py, never typed by hand."""
import re
from kit import *
from system import HUES, CSS
from phone import phone_field

HUE_NAMES = {'red': 'Коралловый', 'orange': 'Апельсиновый', 'violet': 'Лавандовый', 'green': 'Лайм', 'teal': 'Мятный', 'blue': 'Голубой', 'pink': 'Розовый'}


def tok(name, dark=False):
    block = CSS.split('[data-theme=dark] {')[1].split('}')[0] if dark else CSS.split(':root, .app {')[1].split('}')[0]
    m = re.search(r'--' + re.escape(name) + r':\s*([^;]+);', block)
    return m.group(1).strip() if m else tok(name) if dark else '?'


def head(title, lede):
    return f'<div class="stack gap-2" style="max-width:960px"><h1 class="t-h1">{title}</h1><p class="t-body muted">{lede}</p></div>'


def blk(title, inner, note=''):
    n = f'<p class="spec">{note}</p>' if note else ''
    return f'<section class="tile gap-4"><h2 class="t-h3">{title}</h2>{n}{inner}</section>'


def S_tokens():
    neutrals = [('bg', 'Фон: сгруппированный, HIG'), ('surface', 'Плитки, листы, панель'), ('surface-2', 'Колодцы, поля, сегменты'), ('surface-raised', 'Листы, окна, меню (в тёмной — на ступень выше)'),
                ('text', 'Текст'), ('text-muted', 'Вторичный, ≥ 4.5:1 везде'), ('accent', 'Действия и «вы»'), ('danger', 'Только необратимое')]
    ncols = ''.join(f'<div class="stack gap-2"><div class="row-f gap-1"><span class="sw grow" style="background:{tok(n)}"></span><span class="sw grow" style="background:{tok(n, True)}"></span></div><b class="t-small-strong">--{n}</b><span class="spec">{tok(n)} / {tok(n, True)}<br>{u}</span></div>' for n, u in neutrals)
    hues = ''.join(f'''<div class="stack gap-2" data-hue="{k}"><div class="tile poster" style="height:104px;padding:var(--space-3);justify-content:space-between;border-radius:var(--radius-md)"><b class="t-small-strong">{HUE_NAMES[k]}</b>{pulse(24, 12, 1.0)}</div>
<div class="row-f gap-1"><span class="sw grow" style="height:28px;background:{h['tint']}"></span><span class="sw grow" style="height:28px;background:{h['them']}"></span><span class="sw grow" style="height:28px;background:{h['on_them']}"></span><span class="sw grow" style="height:28px;background:{h['poster_d']}"></span></div>
<span class="spec">постер {h['poster']} · тёмная {h['poster_d']}<br>на белом: метка {h['them']}, имя <b style="color:{h['them_ink']}">{h['them_ink']}</b><br>на постере: {h['on_them']}</span></div>''' for k, h in HUES.items())
    types = [('display', 'Мила', 'Имя на постере, лендинг', '56/56 · 88/88, 600, до 3 строк, кегль от ширины'), ('figure', 'good', 'Одно главное слово или число', '44/48 · 56/60, 600'),
             ('h1', 'Добрый вечер, Дима', 'Экран, глава', '30/36 · 34/40, 600'), ('h2', 'Сейчас главное', 'Раздел страницы, находка главы', '24/32 · 28/36, 600'),
             ('h3', 'Пишете на равных', 'Ответ карточки, заголовок листа', '20/28 · 22/28, 600'), ('num', '51%', 'Числа сравнения сторон — размер h2', '24/32, 500'),
             ('title', 'Дима (работа)', 'Строка, имя', '16/24, 500'), ('body', 'Кто пишет первым, кто отвечает быстрее', 'Чтение', '16/24, 400'),
             ('ui', 'Новый анализ', 'Кнопки, фильтры, меню', '15/20, 500'), ('small', 'Писали 7 часов назад', 'Вопрос карточки, мета, подсказки', '14/20, 400'),
             ('caption', 'апрель · 0:00', 'Оси, легенды', '12/16, 500')]
    trows = ''.join(f'<div class="row-f gap-6" style="padding:var(--space-3) 0;box-shadow:inset 0 -0.5px 0 var(--border)"><span class="t-{k} trunc" style="width:440px;flex:none">{s}</span><span class="grow stack"><b class="t-small-strong">.t-{k} — {u}</b><span class="spec">{spec}</span></span></div>' for k, s, u, spec in types)
    space = ''.join(f'<div class="stack gap-1" style="align-items:center"><span style="width:{v}px;height:{v}px;background:var(--accent);border-radius:var(--radius-mark)"></span><span class="spec">{v}</span></div>' for v in [2, 4, 8, 12, 16, 24, 32, 40, 48, 64])
    radii = ''.join(f'<div class="stack gap-1" style="align-items:center"><span style="width:72px;height:56px;background:var(--surface-2);border-radius:{v}px"></span><span class="spec">{v} {n}</span></div>' for v, n in [(4, 'метка'), (8, 'строка панели'), (12, 'поле'), (16, 'группа, меню'), (20, 'плитка, телефон'), (24, 'плитка, ПК'), (32, 'лист, окно')])
    ctrls = ''.join(f'<div class="stack gap-2 start">{btn(n, "secondary", s)}<span class="spec">{h}</span></div>' for n, s, h in [('Компактная', 'sm', '36 — строки, фильтры, ПК'), ('Обычная', '', '44 — телефон, плавающие'), ('Главная', 'xl block', '44 — во всю ширину')])
    avs = ''.join(f'<div class="stack gap-1" style="align-items:center">{av("mila", s)}<span class="spec">{s}</span></div>' for s in [24, 32, 40, 64])
    bps = group([row('', 'до 640', 'Телефон: одна колонка, поля 16, главное действие — плавающая кнопка внизу; в «Сейчас главное» одна плитка', '', 'wrap'),
                 row('', '641–900', 'Планшет: та же оболочка, колонка до 720 по центру, поля 32; «Отчёты» плитками не уже 150 (на 820 — по четыре), «Сейчас главное» по два', '', 'wrap'),
                 row('', '901–1199', 'Панель людей 280; колонка в один ряд плиток, инспектор участника — лист', '', 'wrap'),
                 row('', '1200+', 'Панель людей и две колонки плиток; инспектор участника — справа, сдвигает контент', '', 'wrap')])
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'inv'))
    try:
        from oklch import hex_to_oklch
    except ImportError:
        hex_to_oklch = None
    roles = [('poster', 'постер'), ('tint', 'оттенок'), ('them', 'метка'), ('them_ink', 'имя'), ('on_them', 'тон на постере'), ('room', 'комната')]
    def cell(hx):
        l = f'L {hex_to_oklch(hx)[0]:.2f}' if hex_to_oklch else hx
        return f'<div class="stack gap-1"><span class="sw" style="height:40px;background:{hx}"></span><span class="spec">{l}</span></div>'
    ladder = ('<div style="display:grid;grid-template-columns:120px repeat(7,minmax(0,1fr));gap:var(--space-2) var(--space-3);align-items:center">'
              + '<span></span>' + ''.join(f'<b class="t-small-strong">{HUE_NAMES[k]}</b>' for k in HUES)
              + ''.join(f'<span class="t-small muted">{rn}</span>' + ''.join(cell(HUES[k][r]) for k in HUES) for r, rn in roles) + '</div>')
    lines_ = (f'<div class="stack gap-3"><div class="row" style="min-height:auto">Линия списка — 1 px, --border</div>'
              f'<div class="row-f gap-4">{btn("Вторичная", "secondary", "md")}<span class="spec">кольцо 1 px, --border-strong</span></div>'
              f'<div class="row-f gap-4"><span class="field focus" style="width:200px"><span>Фокус поля</span></span><span class="spec">2 px, чернила</span></div>'
              f'<div class="row-f gap-6"><span class="menu" style="position:static;min-width:120px;padding:var(--space-3)">меню, лист</span><span class="spec">--shadow-overlay</span>'
              f'<span class="fab-round">{ic("plus")}</span><span class="spec">--shadow-float</span></div></div>')
    motion = group([row('', 'Нажатие — 90 мс', 'масштаб 0.97, без кривой', ''), row('', 'Смена состояния — 150 мс', 'кривая входа: быстрый старт, мягкий конец', ''),
                    row('', 'Лист, окно, капсула → лист — 400 мс', 'пружина на входе, уход M3 exit за 150 мс', '')])
    body = f'''<main class="page" style="padding:var(--space-12)">
  {head('«Портрет»: токены', 'Интерфейс нейтральный и плоский, цвет приносит человек. Имена токенов — как в apps/web/app/assets/styles/tokens.css. Значения сверены с Apple HIG, Radix Themes, Primer и Material 3 (docs/design-system.md §13). Шрифт один — Onest.')}
  <div class="grid-2" style="gap:var(--space-6)">
  {blk('Нейтральные', f'<div class="grid-4" style="gap:var(--space-4)">{ncols}</div>', 'Слева светлая тема, справа тёмная.')}
  {blk('Цвета людей', f'<div class="grid-4" style="gap:var(--space-3)">{hues}</div>', 'Семья цвета — как у аватара в Telegram: abs(id) % 7. Постер светлый и яркий, текст на нём чернилами. На белом человек — метка (≥ 3:1) и имя (≥ 4.5:1), на своём постере — глубокий тон (≥ 4.5:1). «Вы» всегда чернила.')}
  </div>
  {blk('Типографика', trows, 'Начертания 400 / 500 / 600. Межстрочные на сетке 4. Цифры табличные, число и единица не разрываются. Раздел крупнее ответа карточки, ответ — весомее чисел. Надзаголовков, капса и строк через «·» нет.')}
  <div class="grid-2" style="gap:var(--space-6)">
  {blk('Отступы — --space-*', f'<div class="row-f gap-4" style="align-items:flex-end">{space}</div>', 'Каждый шаг — одна роль. 2 — волосяной зазор (полоски, пульс); 4 — внутри контрола; 8 — связанные элементы; 12 — между карточками на телефоне, внутри строки; 16 — поля телефона, отступ карточки, между карточками на ПК; 24 — отступ карточки на ПК; 32 — между разделами, поля планшета; 40 — поля ПК, разделы на ПК; 48 / 64 — воздух экранов входа и лендинга. Внутри группы всегда меньше, чем между группами.')}
  {blk('Скругления — --radius-*', f'<div class="row-f gap-3" style="flex-wrap:wrap">{radii}</div>', 'Кнопки, фильтры, чипы и аватары — пилюля. Вложенные углы концентричны.')}
  {blk('Контролы — --control-*', f'<div class="row-f gap-4" style="align-items:flex-end">{ctrls}</div>', 'Кнопки: 44 — любая кнопка на телефоне (круги шапки, крестик листа, пилюли, широкая главная, поля); 36 — компактные в строках и фильтры, и все на ПК. 56 — не кнопки: шапка, строка списка, клетки кода. Плавающее — одно оформление: пилюля или круг, белая поверхность, волосяная обводка, одна мягкая тень.')}
  {blk('Аватары', f'<div class="row-f gap-6" style="align-items:flex-end">{avs}</div>', 'Цвет человека мягким градиентом, инициалы чернилами. Ваш — чернила.')}
  </div>
  {blk('Лестница людей — OKLCH', ladder, 'Семь семей идут одной лестницей: у каждой роли одна светлота L, оттенок свой. Ни один человек не громче другого. Контраст: метка на белом ≥ 3:1, имя ≥ 4.5:1, свой тон на постере ≥ 5:1, чернила на постере ≥ 9:1.')}
  <div class="grid-2" style="gap:var(--space-6)">{blk('Линии и тени', lines_, 'Одна толщина линии — 1 px. Кольцо выбора и фокуса — 2 px. Тени — два уровня и только у плавающего; плитки плоские.')}
  {blk('Движение', motion, 'Анимируются только transform и opacity. При reduced motion — короче и без сдвига, но не ноль.')}</div>
  <div class="grid-2" style="gap:var(--space-6)">{blk('Ширины экрана', bps)}
  {blk('Знак', f'<div class="row-f gap-8" style="align-items:center">{logo(32, word=True)}<span data-hue="red" class="row-f">{logo(32, word=True)}</span><span class="tile poster" data-hue="teal" style="flex-direction:row;padding:var(--space-3)">{logo(28, word=True)}</span>{logo(48, tile=True)}</div>', 'Знак — зеркальный пульс продукта: сверху «вы» чернилами, снизу семь цветов людей, с которыми вы переписываетесь. Единственное место, где цвет означает людей вообще, а не одного человека. Надпись — Onest 600. Плитка — только у иконки приложения. На ПК строка знака — это «Главная».')}</div>
</main>'''
    return page('Система — токены', body, pc=True, h=4110)


def S_components():
    states = ''.join(f'<div class="stack gap-2 start">{btn("Разобрать", "primary", "md", state=s)}<span class="spec">{n}</span></div>' for s, n in [('', 'обычная'), ('is-hover', 'наведение'), ('is-press', 'нажатие'), ('is-focus', 'фокус'), ('is-disabled', 'неактивна')])
    states += '<div class="stack gap-2 start"><button class="btn btn-primary md"><span class="spin"></span>Разбираем…</button><span class="spec">загрузка</span></div>'
    kinds = ''.join(f'<div class="stack gap-2 start">{btn(l, k, "md")}<span class="spec">{n}</span></div>' for k, l, n in [('primary', 'Новый анализ', 'главная'), ('secondary', 'Разобрать', 'вторичная'), ('tinted', 'Все чаты', 'тихая'), ('plain', 'Отменить', 'текстовая'), ('danger', 'Удалить', 'опасная')])
    poster_btns = f'<div class="tile poster" data-hue="red" style="flex-direction:row;gap:var(--space-2);align-items:center">{btn("Смотреть итоги", "poster", "md", "play")}{btn("Обновить отчёт", "poster-2", "md", "refresh")}{ibtn("back", "Назад", "on-poster")}<span class="spec muted">на постере</span></div>'
    fields = f'''<div class="grid-2" style="gap:var(--space-4)">
  <div class="stack gap-2"><span class="label">Номер телефона</span>{phone_field(number='<span class="ph">912 345-67-89</span>', state='')}<span class="hint">пусто; код страны — по стране входа</span></div>
  <div class="stack gap-2"><span class="label">Номер телефона</span>{phone_field()}<span class="hint">фокус</span></div>
  <div class="stack gap-2"><span class="label">Пароль</span><div class="field error" style="padding-right:var(--space-1)"><span class="grow" style="font-size:20px;letter-spacing:3px">••••••</span><button class="icon-btn" style="background:none;color:var(--text-muted)" aria-label="Показать пароль">{ic('eye')}</button></div><span class="err">{ic('alert')}Пароль не подошёл</span></div></div>
  <div class="otp" style="max-width:360px"><span>1</span><span>2</span><span>3</span><span class="focus"></span><span></span></div>'''
    controls = f'''<div class="stack gap-4"><div style="max-width:420px">{search('Поиск чата')}</div>
  <div class="row-f gap-6" style="flex-wrap:wrap">{filters(['Все', 'Личные', 'Группы'], 0, 'Чаты')}
  {switch(True, 'Вкл')}{switch(False, 'Выкл')}{chips(['кофе'])}<span data-hue="red">{chips(['дедлайн'], 'them')}</span>{chips(['спасибо'], 'shared')}{ibtn('share', 'Поделиться')}{ibtn('x', 'Закрыть')}</div>
  <div class="row-f gap-3">{''.join(flag(c, 24) for c, _, _ in COUNTRIES)}{flag('gb', 24)}<span class="spec">флаги кодов страны рисуем сами: Windows вместо эмодзи-флага пишет «RU». Язык — по-прежнему «RU» с глобусом</span></div></div>'''
    rows = group([row(av('dima'), 'Дима (работа)', 'Писали 7 часов назад', btn('Разобрать', 'secondary', 'sm')), row(av('mila'), 'Мила', 'Отчёт от 2 ноября, 640 новых', btn('Обновить', 'secondary', 'sm')),
                  row(av('oleg'), 'Олег Смирнов', '38 сообщений, для отчёта нужно 100', '', 'few'),
                  row('', 'Тема', '', '<span class="v">Как в системе</span>', '', True, True), row('', 'Писать в Telegram', 'Когда отчёт готов', switch(True, 'Писать в Telegram')),
                  row(lead_ic('trash', 'danger'), 'Удалить отчёт', '', '', 'danger', False, True)], 'Заголовок группы', 'Подпись группы объясняет последствия.')
    side = f'''<div class="stack gap-0-5" style="width:280px;background:var(--surface);border-radius:var(--radius-md);padding:var(--space-3);box-shadow:inset 0 0 0 0.5px var(--border)">
  <a class="sb-row home on">{logo(28, bare=True)}<span class="wordmark">TG Analyzer</span></a>
  <a class="sb-row person">{av('mila', 32)}<span class="grow stack"><span>Мила</span><span class="m new">640 новых сообщений</span></span></a>
  <a class="sb-row person">{av('katya', 32)}<span class="grow stack"><span>Катя</span><span class="m">130 сообщений</span></span></a>
  {live_card('dima', 63)}</div>'''
    anatomy = f'''<div class="grid-3" style="gap:var(--space-4);align-items:start" data-hue="red">
  {tile('Кто пишет больше', 'Пишете на равных', cmp('Вы', 'Мила', '51%', '49%', 51) + '<p class="note">2 434 и 2 366 сообщений</p>')}
  <div class="stack gap-2"><p class="t-small"><b>1. Вопрос</b> называет метрику — тихая строка, не надзаголовок.</p><p class="t-small"><b>2. Ответ</b> — одна фраза. Есть у каждой карточки; фраза главы не повторяет её слово в слово.</p><p class="t-small"><b>3. Сравнение</b> — две цифры и одна полоска 8 px; вы — чернила слева, человек — его метка справа.</p><p class="t-small"><b>4. Первая находка главы</b> стоит без карточки, крупно; мелкие факты — строками с линиями.</p></div>
  <section class="tile poster"><p class="q">Слово вашей переписки</p><p class="t-figure">good</p><p class="t-small muted">Плитка цвета постера — не больше одной на главу.</p></section></div>
  <div class="grid-3" style="gap:var(--space-4);align-items:start;margin-top:var(--space-2)">
  <div style="max-width:220px">{mini_poster('mila', '4 800 сообщений', 1, 160)}</div>
  <div class="stack gap-2"><p class="t-small"><b>Карточка отчёта</b> — маленький постер: аватар, имя, объём, пульс. Действия всегда на виду — «⋯» открывает «Обновить, Поделиться, Удалить». Долгое нажатие — только ускоритель.</p>
  <p class="t-small"><b>Идущий разбор</b> свёрнут в капсулу внизу (телефон) или карточку в панели (ПК). Нажатие открывает подробности.</p></div>
  <div style="position:relative;height:72px;background:var(--bg);border-radius:var(--radius-lg)"><div class="dock" style="bottom:8px;left:8px;right:8px"><a class="live">{ring(63, av('dima', 32), 40)}<span class="grow stack"><span class="t-small-strong trunc">Разбираем «Дима (работа)»</span><span class="t-small muted">63%, ещё около минуты</span></span></a><span class="fab-round">{ic('plus')}</span></div></div></div>'''
    overlays = f'''<div class="grid-3" style="gap:var(--space-4);align-items:start">
  <div style="position:relative;height:72px"><div class="toast" role="status" style="left:0;right:0;top:0">{ic('check')}<span class="grow">Отчёт «Мила» обновлён</span><button class="btn">Открыть</button></div></div>
  <div style="position:relative;height:170px"><div class="menu" style="left:0;top:0"><button class="mi on">{ic('refresh')}Обновить отчёт</button><button class="mi">{ic('share')}Поделиться</button><hr><button class="mi danger">{ic('trash')}Удалить отчёт</button></div></div>
  <div class="stack gap-3" style="background:var(--surface-raised);border-radius:var(--radius-xl);padding:var(--space-6);box-shadow:var(--shadow-overlay)"><h3 class="t-h3">Удалить отчёт «Мила»?</h3><p class="t-small muted">Заголовок называет объект, текст — последствия. Фокус на «Отменить».</p><div class="row-f gap-2 end">{btn('Отменить', 'secondary', 'md')}{btn('Удалить', 'danger', 'md')}</div></div></div>'''
    empt = f'''<div class="grid-3" style="gap:var(--space-4)">
  <div class="stack gap-3 start" style="background:var(--bg);border-radius:var(--radius-lg);padding:var(--space-6)"><span class="empty-ic">{ic('power')}</span><b class="t-h3">Telegram завершил сеанс</b><p class="t-small muted">Ошибка говорит, что случилось и что делать.</p>{btn('Войти снова', 'primary', 'md')}</div>
  <div class="stack gap-3 start" style="background:var(--bg);border-radius:var(--radius-lg);padding:var(--space-6)"><span class="empty-ic">{ic('search')}</span><b class="t-h3">Ничего не нашли</b><p class="t-small muted">Пустое состояние подсказывает шаг.</p>{btn('Сбросить поиск', 'tinted', 'md')}</div>
  <div class="stack gap-3" style="background:var(--bg);border-radius:var(--radius-lg);padding:var(--space-6)"><span class="skel" style="height:20px;width:60%"></span><span class="skel" style="height:28px;width:85%"></span><span class="skel" style="height:8px;border-radius:var(--radius-full)"></span><span class="skel" style="height:16px;width:40%"></span><p class="spec">Загрузка — скелет формы, крутилка только в кнопке и для фоновой работы.</p></div></div>'''
    rules = ''.join(f'<li class="t-small" style="margin-bottom:var(--space-2)">{r}</li>' for r in [
        'Цвет означает только человека. Интерфейс и действия монохромны, «вы» — чернила, на постере человек — его глубокий тон.',
        'Одна главная кнопка на экран. На телефоне главное действие — плавающая кнопка внизу; кнопки внутри плиток тихие.',
        'Одно действие — одно имя: «Разобрать» для нового чата, «Обновить отчёт» для готового (в компактной кнопке строки — «Обновить»), процесс — «Разбираем».',
        'У каждой карточки есть ответ. Первая находка главы — без карточки; в «О чём» её место занимает «Слово переписки» — единственная плитка цвета постера в части. Мелкие факты — строками; значение строки — ui 500 чернилами в правой колонке.',
        'Материал (размытие) — только у панелей, под которые прокручивается контент. Плитки, кнопки и листы плоские.',
        'Листы на телефоне, окна на ПК; «Закрыть» у ведущего края. Подтверждение называет объект и последствия, фокус — на «Отменить».',
        'Всё, что есть в меню долгого нажатия, есть и на виду: кнопка «⋯» на карточке отчёта.',
        'Чат меньше 100 сообщений не разбираем: строка говорит, сколько нужно, кнопки нет.',
        'Пустые и ошибочные состояния говорят, что делать дальше. Обещание приватности — правдиво: «подсчёты и частые слова, без текстов».',
        'Цель касания ≥ 44, фокус — контур 2 px со смещением 2, без анимации. Длинные имена — до трёх строк, кегль от ширины.'])
    body = f'''<main class="page" style="padding:var(--space-12)">
  {head('«Портрет»: компоненты и состояния', 'Каждый экран собран только из этих частей. Если элемента нет здесь — его нет в продукте.')}
  <div class="grid-2" style="gap:var(--space-6)">
  {blk('Кнопки: виды', f'<div class="row-f gap-4" style="flex-wrap:wrap">{kinds}</div>{poster_btns}')}
  {blk('Кнопки: состояния', f'<div class="row-f gap-4" style="flex-wrap:wrap">{states}</div>', 'Наведение — только при мыши. Нажатие 90 мс, масштаб 0.97. Фокус — контур 2 + 2 px. Неактивная — 38%.')}
  {blk('Поля и код', fields)}
  {blk('Поиск, фильтры, переключатели, чипы', controls, 'Сегментов нет: фильтр — маленькие кнопки, выбранная — чернила. Настройка с вариантами — строка со значением и меню. Переключатель 40 × 24, включённый — чернила.')}
  {blk('Строки и группы', rows, 'Строка — одно действие, нажимается целиком. Мета — small серым. Опасное — красным, отдельной группой.')}
  {blk('Панель людей (ПК)', side, 'Ширина 280. Строка знака — «Главная»; у людей аватар 32 слева. Выбранное — серая плашка. Новое — мета чернилами вместо точки. Идущий разбор — карточка внизу, открывает подробности.')}
  </div>
  {blk('Карточка отчёта', anatomy)}
  {blk('Поверх экрана', overlays, 'Тост — над плавающей кнопкой на телефоне, сверху справа на ПК. Подложка 32% чёрного, тень мягкая.')}
  {blk('Пусто, ошибка, загрузка', empt)}
  {blk('Правила целостности', f'<ol style="margin:0;padding-left:var(--space-6)">{rules}</ol>')}
</main>'''
    return page('Система — компоненты', body, pc=True, h=3110)


SCREENS = [('sys-tokens', 'Система — токены', S_tokens), ('sys-components', 'Система — компоненты и состояния', S_components)]
