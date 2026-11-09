"""Writes every artboard into the canvas folder and a plain preview for screenshots."""
import json, os, re, sys, datetime
sys.path.insert(0, os.path.dirname(__file__))
from phone import SCREENS as PH
try:
    from desktop import SCREENS as PC
except ImportError:
    PC = []
try:
    from systemboards import SCREENS as SY
except ImportError:
    SY = []

# CANVAS_DIR: the Claude Design project folder (*.dc.html + canvas.json); PREVIEW_DIR: plain pages for screenshots.
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('CANVAS_DIR') or os.path.join(HERE, '..', 'concepts', 'project')
PREV = os.environ.get('PREVIEW_DIR') or os.path.join(HERE, '..', 'preview')
os.makedirs(ROOT, exist_ok=True)
os.makedirs(PREV, exist_ok=True)


def preview(html):
    html = html.replace('<script src="./support.js"></script>', '')
    html = re.sub(r'<script type="text/x-dc".*?</script>', '', html, flags=re.S)
    m = re.search(r'<helmet>(.*?)</helmet>', html, re.S)
    head = m.group(1) if m else ''
    html = html.replace(m.group(0), '') if m else html
    html = html.replace('</head>', head + '</head>').replace('<x-dc>', '').replace('</x-dc>', '')
    return html


boards, order, written = {}, [], []
rows = [('sys', SY, 0, 1520), ('ph', PH, 1, 470), ('pc', PC, 2, 1520)]
y = 0
notes = {}
for kind, screens, _, step in rows:
    if not screens:
        continue
    per_row = {'sys': 2, 'ph': 7, 'pc': 4}[kind]
    title = {'sys': 'Система «Портрет» — токены, компоненты, состояния', 'ph': 'Телефон — все экраны и состояния', 'pc': 'ПК — все экраны и состояния'}[kind]
    notes[f'n-{kind}'] = {'x': 0, 'y': y, 'text': title, 'kind': 'title1', 'maxW': per_row * step, 'page': 'final'}
    y += 260
    for i, (slug, name, fn) in enumerate(screens):
        html = fn()
        w = int(re.search(r'"width":(\d+)', html).group(1)); h = int(re.search(r'"height":(\d+)', html).group(1))
        col, r = i % per_row, i // per_row
        if col == 0 and r > 0:
            y += row_h + 120
        if col == 0:
            row_h = 0
        row_h = max(row_h, h)
        fname = f'{slug}.dc.html'
        open(os.path.join(ROOT, fname), 'w').write(html)
        open(os.path.join(PREV, f'{slug}.html'), 'w').write(preview(html))
        boards[fname] = {'x': col * step, 'y': y, 'w': w, 'h': h, 'title': name, 'page': 'final'}
        order.append(fname)
        written.append(fname)
    y += row_h + 160

canvas = os.path.join(ROOT, 'canvas.json')
idx = json.load(open(canvas)) if os.path.exists(canvas) else {'boards': {}, 'order': [], 'notes': {}}
# keep the concept boards (A/B/C), drop superseded F-* boards and everything on the final page
removed = [k for k, b in idx['boards'].items() if b.get('page') == 'final' and k not in boards]
for k in removed:
    idx['boards'].pop(k)
idx['boards'].update(boards)
idx['order'] = order + [k for k in idx['order'] if k in idx['boards'] and k not in boards]
idx['notes'] = {k: v for k, v in idx['notes'].items() if v.get('page') != 'final'}
idx['notes'].update(notes)
idx['pages'] = [{'id': 'final', 'name': 'Продукт: система и все экраны'}, {'id': 'concepts', 'name': 'Концепты A, B, C (архив)'}]
idx['launch'] = {'view': 'canvas', 'page': 'final'}
json.dump(idx, open(os.path.join(ROOT, 'canvas.json'), 'w'), ensure_ascii=False)
json.dump({'written': written, 'removed': [r for r in removed if r not in boards]}, open(os.path.join(PREV, '_manifest.json'), 'w'), ensure_ascii=False)
print(len(written), 'written;', len(removed), 'removed')
