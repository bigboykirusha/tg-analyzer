"""Components for the «Портрет» v3 mockups. Every screen is built only from these."""
import re
from system import CSS, bars

P = {  # people of the demo account: name, initials, colour family
    'mila': ('Мила', 'М', 'red'), 'mama': ('Мама', 'М', 'orange'), 'team': ('Продуктовая команда', 'ПК', 'pink'),
    'katya': ('Катя', 'К', 'blue'), 'dima': ('Дима (работа)', 'ДР', 'teal'), 'anna': ('Анна Петрова', 'АП', 'green'),
    'artyom': ('Артём Ковалёв', 'АК', 'violet'), 'sofia': ('Sofia Martins', 'SM', 'green'), 'oleg': ('Олег Смирнов', 'ОС', 'pink'),
    'family': ('Семья', 'С', 'red'), 'run': ('Бег по утрам', 'БП', 'orange'),
    'sergey': ('Сергей', 'С', 'teal'), 'alexey': ('Алексей', 'А', 'orange'), 'natasha': ('Наташа', 'Н', 'blue'),
    'maria': ('Мария', 'М', 'red'), 'yulia': ('Юля', 'Ю', 'green'),
}

_I = {
    'back': '<path d="M15 18l-6-6 6-6"/>', 'chev': '<path d="M9 18l6-6-6-6"/>', 'down': '<path d="M6 9l6 6 6-6"/>',
    'share': '<path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>', 'x': '<path d="M6 6l12 12M18 6L6 18"/>',
    'more': '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>',
    'home': '<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/>',
    'refresh': '<path d="M20 12a8 8 0 11-2.3-5.7M20 4v5h-5"/>',
    'trash': '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    'link': '<path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>',
    'copy': '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
    'download': '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', 'send': '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
    'search': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    'lock': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    'alert': '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    'power': '<path d="M18.4 6.6a9 9 0 11-12.8 0M12 2v10"/>', 'unlink': '<path d="M10 14a5 5 0 007 0l1-1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7M3 3l18 18"/>',
    'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    'users': '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 010 8M22 21c0-3-2-5-4-5.5"/>',
    'check': '<path d="M5 12l5 5 9-10"/>', 'shield': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    'moon': '<path d="M21 13A9 9 0 1111 3a7 7 0 0010 10z"/>', 'globe': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
    'eye': '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'phone': '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', 'laptop': '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20"/>',
    'up': '<path d="M18 15l-6-6-6 6"/>', 'monitor': '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    'clip': '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>',
}
_FILL = {'play': '<path d="M7 4l13 8-13 8z"/>', 'pause': '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>'}

NB = ' '


def ic(name, cls=''):
    c = f' class="{cls}"' if cls else ''
    if name in _FILL:
        return f'<svg{c} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{_FILL[name]}</svg>'
    return (f'<svg{c} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true">{_I[name]}</svg>')


def logo(size=32, word=False, tile=False, bare=False):
    """The mark is the product's own mirrored pulse: you on top in ink, the other side below in their colour —
    neutral grey outside a report, the person's colour inside one. A tile only for the app icon."""
    up, dn = [4, 8, 11, 7, 5], [3, 5, 8, 4, 3]
    x0 = 4.4 if tile else 2.2
    step = 4.1 if tile else 5.0
    w = 2.8 if tile else 3.4
    bars_ = ''.join(f'<rect class="logo-up" x="{x0 + i * step:.1f}" y="{14 - u * (1 if tile else 1.15):.1f}" width="{w}" height="{u * (1 if tile else 1.15):.1f}" rx="{w / 2}"/>'
                    f'<rect class="logo-dn" x="{x0 + i * step:.1f}" y="15" width="{w}" height="{d * (1 if tile else 1.15):.1f}" rx="{w / 2}"/>' for i, (u, d) in enumerate(zip(up, dn)))
    rect = '<rect class="logo-rect" width="28" height="28" rx="8"/>' if tile else ''
    mark = f'<svg class="{"logo-tile" if tile else "logo"}" style="width:{size}px;height:{size}px" viewBox="0 0 28 28" aria-hidden="true">{rect}{bars_}</svg>'
    if bare:
        return mark
    if not word:
        return f'<a href="#" class="hit" aria-label="TG Analyzer, главная" style="display:inline-flex;position:relative">{mark}</a>'
    return f'<a href="#" class="row-f gap-2 wordmark" aria-label="TG Analyzer, главная">{mark}TG Analyzer</a>'


_FLAGS = {
    'ru': '<rect width="24" height="8" fill="#FFFFFF"/><rect y="8" width="24" height="8" fill="#1C57A5"/><rect y="16" width="24" height="8" fill="#D52B1E"/>',
    'ua': '<rect width="24" height="12" fill="#2167C4"/><rect y="12" width="24" height="12" fill="#FFD43B"/>',
    'by': '<rect width="24" height="16" fill="#C8313E"/><rect y="16" width="24" height="8" fill="#4AA657"/><rect width="5" height="24" fill="#FFFFFF"/><path d="M2.5 2l1.5 2-1.5 2-1.5-2zM2.5 9l1.5 2-1.5 2-1.5-2zM2.5 16l1.5 2-1.5 2-1.5-2z" fill="#C8313E"/>',
    'kz': '<rect width="24" height="24" fill="#2BB5D8"/><circle cx="12" cy="11" r="4" fill="#FFD43B"/><path d="M7 17q5 3 10 0" stroke="#FFD43B" stroke-width="1.4" fill="none"/>',
    'gb': '<rect width="24" height="24" fill="#1E3A8A"/><path d="M0 0l24 24M24 0L0 24" stroke="#FFFFFF" stroke-width="5"/><path d="M0 0l24 24M24 0L0 24" stroke="#D52B1E" stroke-width="1.6"/>'
          '<path d="M12 0v24M0 12h24" stroke="#FFFFFF" stroke-width="7"/><path d="M12 0v24M0 12h24" stroke="#D52B1E" stroke-width="4"/>',
}
COUNTRIES = [('ru', 'Россия', '+7'), ('ua', 'Украина', '+380'), ('by', 'Беларусь', '+375'), ('kz', 'Казахстан', '+7')]


def flag(code, size=20):
    return f'<span class="flag" style="width:{size}px;height:{size}px" aria-hidden="true"><svg viewBox="0 0 24 24">{_FLAGS[code]}</svg></span>'


def av(key, size=40, you=False):
    if you:
        return f'<span class="av av-{size} you" aria-hidden="true">Д</span>'
    name, ini, hue = P[key]
    return f'<span class="av av-{size}" data-hue="{hue}" aria-hidden="true">{ini}</span>'


def btn(label, kind='primary', size='', icon=None, cls='', tag='button', state='', aria=''):
    i = ic(icon) if icon else ''
    attr = ' href="#"' if tag == 'a' else ''
    attr += f' aria-label="{aria}"' if aria else ''
    return f'<{tag}{attr} class="btn btn-{kind} {size} {cls} {state}">{i}{label}</{tag}>'


def lead_ic(name, cls=''):
    return f'<span class="lead-ic {cls}">{ic(name)}</span>'


def ibtn(icon, label, cls=''):
    return f'<button class="icon-btn {cls}" aria-label="{label}">{ic(icon)}</button>'


def filters(items, on=0, label=''):
    """Filters: plain small buttons, the chosen one sits on the grey selection plate (as in the sidebar). No segmented controls."""
    return f'<div class="filters" role="radiogroup" aria-label="{label}">' + ''.join(
        f'<button role="radio" aria-checked="{str(i == on).lower()}" class="btn sm {"on" if i == on else ""}">{t}</button>' for i, t in enumerate(items)) + '</div>'


def search(placeholder='Поиск', extra=''):
    return f'<label class="search">{ic("search")}<span class="grow">{placeholder}</span>{extra}</label>'


def ring(pct, inner='', size=40, stroke=3):
    r = (size - stroke) / 2
    c = 2 * 3.14159 * r
    return (f'<span class="ring" style="width:{size}px;height:{size}px" role="img" aria-label="Готово {pct}%"><svg viewBox="0 0 {size} {size}">'
            f'<circle class="track" cx="{size / 2}" cy="{size / 2}" r="{r}" fill="none" stroke-width="{stroke}"/>'
            f'<circle class="val" cx="{size / 2}" cy="{size / 2}" r="{r}" fill="none" stroke-width="{stroke}" stroke-linecap="round" stroke-dasharray="{c * pct / 100:.1f} {c:.1f}"/></svg>{inner}</span>')


def switch(on, label):
    return f'<button class="switch {"on" if on else ""}" role="switch" aria-checked="{str(on).lower()}" aria-label="{label}"></button>'


def tile(q, a=None, body='', cls='', hue=None, rows=False, tag='section'):
    h = f' data-hue="{hue}"' if hue else ''
    ans = f'<h3 class="a">{a}</h3>' if a else ''
    return f'<{tag} class="tile {"rows" if rows else ""} {cls}"{h}><p class="q">{q}</p>{ans}{body}</{tag}>'


def hero(q, a, body):
    return f'<section class="hero"><p class="q">{q}</p><h3 class="a">{a}</h3>{body}</section>'


def cmp(you_lbl, them_lbl, you_v, them_v, share=None):
    b = ''
    if share is not None:
        b = f'<div class="bar" aria-hidden="true"><i class="y" style="flex:{share}"></i><i class="t" style="flex:{100 - share}"></i></div>'
    return (f'<div class="stack gap-3"><div class="cmp"><span class="lbl">{you_lbl}</span><span class="lbl them">{them_lbl}</span>'
            f'<span class="num">{you_v}</span><span class="num them">{them_v}</span></div>{b}</div>')


def row(lead='', title='', meta='', trail='', cls='', chev=False, href=False, aria=''):
    m = f'<span class="m trunc">{meta}</span>' if meta else ''
    c = ic('chev', 'chev') if chev else ''
    tag = 'a' if href else 'div'
    attr = ' href="#"' if href else ''
    attr += f' aria-label="{aria}"' if aria else ''
    return f'<{tag}{attr} class="row {cls}">{lead}<span class="grow stack"><span class="t trunc">{title}</span>{m}</span>{trail}{c}</{tag}>'


def group(rows, head='', foot=''):
    h = f'<h2 class="group-h">{head}</h2>' if head else ''
    f = f'<p class="group-f">{foot}</p>' if foot else ''
    return f'<div class="stack">{h}<div class="group">{"".join(rows)}</div>{f}</div>'


def kv(k, v, sub=''):
    s = f'<span class="sub">{sub}</span>' if sub else ''
    return f'<div class="kv"><span>{k}</span><b>{v}{s}</b></div>'


def chips(words, kind=''):
    return '<div class="chips">' + ''.join(f'<span class="chip {kind}">{w}</span>' for w in words) + '</div>'


def pulse(n=64, h=32, seed=1.0, mirrored=True, read_from=None, up_scale=1.0):
    up = [max(4, round(v * up_scale)) for v in bars(n, seed, hi=h, lo=3)]
    if not mirrored:
        cells = ''.join(f'<i class="{"off" if read_from is not None and i < read_from else ""}" style="height:{(v if read_from is None or i >= read_from else 3)}px"></i>' for i, v in enumerate(up))
        return f'<div class="pulse" aria-hidden="true"><div class="one" style="height:{h}px">{cells}</div></div>'
    dn = bars(n, seed + 2.3, hi=h, lo=3, f1=0.5, f2=0.27)
    return (f'<div class="pulse" aria-hidden="true"><div class="up" style="height:{h}px">' + ''.join(f'<i style="height:{v}px"></i>' for v in up) +
            f'</div><div class="dn" style="height:{h}px">' + ''.join(f'<i style="height:{v}px"></i>' for v in dn) + '</div></div>')


def hours(window=(11, 13), h=96):
    vals = [2, 1, 1, 0, 0, 1, 4, 9, 14, 15, 17, 19, 21, 20, 16, 18, 13, 12, 14, 16, 17, 15, 18, 20]
    top = max(vals)
    cells = ''.join(f'<i class="{"hot" if window[0] <= i <= window[1] else ""}" style="height:{max(3, round(v / top * h))}px"></i>' for i, v in enumerate(vals))
    return (f'<div class="stack gap-2"><div class="hours" style="height:{h}px" role="img" aria-label="Сообщения по часам: больше всего с 11 до 14, меньше всего ночью">{cells}</div>'
            '<div class="axis"><span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div></div>')


def heat(n=56, cols=14, seed=0, gaps=(5, 19, 33, 40)):
    import math
    cells = ''.join(f'<i class="h{0 if (i + seed) % 47 in gaps else 1 + min(3, int(abs(math.sin((i + seed) * 1.7) * 2 + math.cos((i + seed) * 0.6) * 1.8)))}"></i>' for i in range(n))
    return f'<div class="heat" style="grid-template-columns:repeat({cols},minmax(0,1fr))" role="img" aria-label="Активность по дням: писали 196 из 208 дней">{cells}</div>'


MONTHS = [('Апрель', 2026, 4), ('Май', 2026, 5), ('Июнь', 2026, 6), ('Июль', 2026, 7), ('Август', 2026, 8), ('Сентябрь', 2026, 9), ('Октябрь', 2026, 10), ('Ноябрь', 2026, 11)]


def month_cells(year, month, first=(2026, 4, 9), last=(2026, 11, 2)):
    """One month as the calendar has it: weeks from Monday, days outside the report left blank."""
    import calendar, datetime, math
    lead = datetime.date(year, month, 1).weekday()
    days = calendar.monthrange(year, month)[1]
    cells = ['<i class="none"></i>'] * lead
    quiet = {(7, 12), (7, 13), (7, 14), (7, 15), (7, 16), (7, 17), (5, 3), (6, 21), (8, 9), (9, 27), (10, 4), (10, 18)}
    for d in range(1, days + 1):
        if (year, month, d) < first or (year, month, d) > last:
            cells.append('<i class="none"></i>')
            continue
        lvl = 0 if (month, d) in quiet else 1 + min(3, int(abs(math.sin(d * 1.7 + month) * 2 + math.cos(d * 0.6 + month) * 1.8)))
        cells.append(f'<i class="h{lvl}"></i>')
    return f'<div class="heat" style="grid-template-columns:repeat(7,minmax(0,1fr))">{"".join(cells)}</div>'


def months_heat(months=MONTHS, cols=8):
    return (f'<div class="grid-4" role="img" aria-label="Активность по дням: писали 196 из 208 дней" style="grid-template-columns:repeat({cols},minmax(0,1fr));gap:var(--space-4) var(--space-3)">' + ''.join(
        f'<div class="stack gap-2"><span class="t-caption muted">{n}</span>{month_cells(y, m)}</div>' for n, y, m in months) + '</div>')


def mini_poster(key, meta, seed, h=148, period='', more=True, menu=''):
    name, _, hue = P[key]
    per = f'<span class="t-small muted trunc">{period}</span>' if period else ''
    m = f'<button class="icon-btn sm on-poster" aria-label="Действия с отчётом «{name}»">{ic("more")}</button>' if more else ''
    z = ';z-index:5' if menu else ''
    return (f'<article class="tile poster mini" data-hue="{hue}" style="min-height:{h}px{z}">{menu}'
            f'<div class="top">{av(key, 32)}{m}</div>'
            f'<a href="#" class="name clamp2">{name}</a>{per}<span class="t-small muted">{meta}</span>'
            f'<span class="mt-auto" style="padding-top:var(--space-3)">{pulse(28, 12, seed)}</span></article>')


def thumb(kind, title, n=4, i=0):
    seg_ = '<span class="story-seg" style="grid-template-columns:repeat(4,1fr)">' + ''.join(f'<i class="{"on" if k <= i else ""}"></i>' for k in range(n)) + '</span>'
    return f'<div class="thumb916" data-hue="red">{seg_}<span class="stack gap-1"><small>{kind}</small><b>{title}</b>{pulse(14, 7, 1.0 + i)}</span></div>'


def thumbs():
    return '<div class="grid-4" style="gap:var(--space-2)">' + thumb('Итоги', 'Мила', i=0) + thumb('Вы двое', 'На равных', i=1) + thumb('Ваше время', 'Днём', i=2) + thumb('О чём', '«good»', i=3) + '</div>'


# ─── shells ──────────────────────────────────────────────────────────────

def _nbsp(html):
    head, sep, body = html.partition('</helmet>')

    def fix(m):
        t = m.group(1)
        t = re.sub(r'(\d) (\d{3})', '\\1' + NB + '\\2', t)
        t = re.sub(r'(\d) (?=[а-яёА-ЯЁ%])', '\\1' + NB, t)
        t = re.sub(r' (—|–) ', NB + '\\1 ', t)
        return '>' + t + '<'
    return head + sep + re.sub(r'>([^<>]+)<', fix, body)


def page(title, body, pc=False, theme=None, hue=None, room=False, w=None, h=None):
    w = w or (1440 if pc else 390)
    h = h or (900 if pc else 844)
    attrs = f' data-theme="{theme}"' if theme else ''
    attrs += f' data-hue="{hue}"' if hue else ''
    cls = 'app ' + ('pc' if pc else 'ph') + (' room' if room else '')
    html = f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0}}
:where(a){{color:inherit}}:where(a:hover){{color:inherit}}
{CSS}
</style>
</helmet>
<div class="{cls}"{attrs} style="width:{w}px;height:{h}px">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''
    return _nbsp(html)


def ph_home_nav():
    return f'<header class="nav-ph between">{logo(32)}<a href="#" class="hit" style="position:relative;border-radius:50%" aria-label="Аккаунт">{av(None, 32, you=True)}</a></header>'


def ph_report_nav(name, chapter, material=True):
    return (f'<header class="nav-ph {"material" if material else ""}">{ibtn("back", "Назад")}'
            f'<div class="nav-title"><b class="trunc">{name}</b><span>{chapter}</span></div>{ibtn("share", "Поделиться")}</header>')


def ph_plain_nav(title='', right=''):
    t = f'<div class="nav-title"><b>{title}</b></div>' if title else '<div class="grow"></div>'
    return f'<header class="nav-ph">{ibtn("back", "Назад")}{t}{right or "<span style=width:36px></span>"}</header>'


def sheet_head(title, lead='close', right=''):
    l = ibtn('x', 'Закрыть') if lead == 'close' else ibtn('back', 'Назад') if lead == 'back' else '<span></span>'
    return f'<div class="sheet-h">{l}<h2>{title}</h2><span class="row-f end">{right}</span></div>'


REPORTS = [('mila', '640 новых сообщений', True), ('mama', 'Угадайка: 4 из 5', True), ('team', 'Группа, 8 участников', False), ('katya', '130 сообщений', False)]


def live_card(key='dima', pct=63):
    return (f'<a href="#" class="sb-live" aria-label="Разбираем «{P[key][0]}», {pct}%. Подробнее">{ring(pct, av(key, 32), 40)}'
            f'<span class="grow stack"><span class="t-small muted">Разбираем</span><span class="t-ui trunc">{P[key][0]}</span><span class="t-small muted">{pct}%, ещё около минуты</span></span></a>')


def sidebar(on='home', progress=None, empty=False):
    def prow(key, meta, new):
        name = P[key][0]
        cur = ' aria-current="page"' if on == key else ''
        return f'<a href="#" class="sb-row person {"on" if on == key else ""}"{cur}>{av(key, 32)}<span class="grow stack"><span class="trunc">{name}</span><span class="m trunc {"new" if new else ""}">{meta}</span></span></a>'
    rows = ''
    if not empty:
        rows += ''.join(prow(k, m, d) for k, m, d in REPORTS)
    else:
        rows += '<p class="t-small muted" style="padding:var(--space-1) var(--space-2)">Здесь появятся люди, чьи переписки вы разберёте.</p>'
    live = live_card(progress) if progress else ''
    acc = ' on' if on == 'account' else ''
    home_on = on == 'home'
    return f'''<nav class="sidebar" aria-label="Разделы">
  <a href="#" class="sb-row home {'on' if home_on else ''}" aria-label="TG Analyzer, главная"{' aria-current="page"' if home_on else ''}>{logo(28, bare=True)}<span class="wordmark">TG Analyzer</span></a>
  <div style="height:var(--space-3)"></div>
  {btn('Новый анализ', 'primary', 'md block', 'plus', tag='a')}
  <div style="height:var(--space-3)"></div>
  <h2 class="sb-h">Отчёты</h2>
  {rows}
  <div class="mt-auto">{live}</div>
  <a href="#" class="sb-row person{acc}"{' aria-current="page"' if acc else ''}>{av(None, 32, you=True)}<span class="grow stack"><span>Дима</span><span class="m">Аккаунт</span></span></a>
</nav>'''
