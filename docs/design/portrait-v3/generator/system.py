"""«Портрет» v3 — tokens and component CSS for every mockup.

Token NAMES are the product's (apps/web/app/assets/styles/tokens.css), so a mockup is a spec the code follows
one to one. Values follow docs/design-system.md §13: Apple HIG (grouped backgrounds, text styles, 44 pt
targets, sheets, bar material), Radix Themes (space 4…80), Primer (layers), Material 3 (exit easing).
"""

# Seven person colours, Telegram order (abs(peer id) % 7), in the lime style of the logo: light, saturated,
# clean, ink text on top. them = bars on white (≥ 3:1); them_ink = names on white (≥ 4.5:1);
# on_them = the person on their own poster (lower pulse, their bar, their name; ≥ 4.5:1 on the poster);
# tint = chips and avatar tops; room = page tint; poster_d = dark theme poster, dimmed so it does not glare.
# One ladder for all seven (OKLCH L): poster .82–.85 (each family the lightest step that keeps its chroma), tint .92, them .62, them_ink .52,
# on_them .41, room .977, dark poster = poster − .12, dark room = the hue at L .18 C .02.
# Yellow sits one step higher (poster .88): at .85 the eye reads yellow as mustard. —
# every person is equally loud; each keeps its own hue angle and as much chroma as sRGB allows.
HUES = {
    'yellow': dict(poster='#FBD530', tint='#FCEBAE', them='#A68003', them_ink='#826401', on_them='#5D4703', room='#FEF8E1', poster_d='#E9B60B', room_d='#14110C'),
    'orange': dict(poster='#FFBB69', tint='#FEDFB8', them='#C66B01', them_ink='#9F5104', on_them='#6F3C02', room='#FEF6EB', poster_d='#D69546'),
    'violet': dict(poster='#C6B9FE', tint='#E7DFFF', them='#846CEF', them_ink='#634AD6', on_them='#45339E', room='#F8F6FF', poster_d='#A191DF'),
    'green':  dict(poster='#B8DF5E', tint='#DDEEAC', them='#649820', them_ink='#4A7812', on_them='#365502', room='#F4FBE7', poster_d='#93B745'),
    'teal':   dict(poster='#6CE6D2', tint='#BEF1E8', them='#149B8C', them_ink='#147A6A', on_them='#0A574C', room='#EEFBF8', poster_d='#50BDAB'),
    'blue':   dict(poster='#92CAFE', tint='#D1E7FF', them='#2A89E1', them_ink='#1869BD', on_them='#104A88', room='#F2F8FE', poster_d='#6EA4D4'),
    'pink':   dict(poster='#FFA4DA', tint='#FFD7EF', them='#D544A4', them_ink='#AE297F', on_them='#7C1F5A', room='#FFF4FA', poster_d='#D580B3'),
}

def _dark_room(room):
    """Dark theme room: the person's hue at L .18, C .02 — tinted black, not pure black."""
    import math
    r, g, b = [int(room[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in (r, g, b)]
    l = (0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2]) ** (1 / 3)
    m = (0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2]) ** (1 / 3)
    s_ = (0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2]) ** (1 / 3)
    A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s_
    B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s_
    H = math.atan2(B, A)
    L, C = 0.18, 0.02
    a_, b_ = C * math.cos(H), C * math.sin(H)
    l2, m2, s2 = [(L + x * a_ + y * b_) ** 3 for x, y in ((0.3963377774, 0.2158037573), (-0.1055613458, -0.0638541728), (-0.0894841775, -1.2914855480))]
    rgb = [4.0767416621 * l2 - 3.3077115913 * m2 + 0.2309699292 * s2, -1.2684380046 * l2 + 2.6097574011 * m2 - 0.3413193965 * s2, -0.0041960863 * l2 - 0.7034186147 * m2 + 1.7076147010 * s2]
    enc = [round(255 * min(1, max(0, 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055))) for x in rgb]
    return '#%02X%02X%02X' % tuple(enc)


CSS = r"""
:root, .app {
  --font-sans: 'Onest', -apple-system, system-ui, sans-serif;
  --space-0-5: 2px; --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px;
  --space-8: 32px; --space-10: 40px; --space-12: 48px; --space-16: 64px;
  --safe-bottom: 34px; --fab-clearance: 128px; --page-max: 1200px; --page-max-narrow: 720px; --inspector: 400px; --sidebar: 280px;
  --bg: #F2F2F7; --surface: #FFFFFF; --surface-2: #EEEEF2; --surface-raised: #FFFFFF; --fill-raised: #EEEEF2;
  --hover: rgba(29,29,31,0.04); --pressed: rgba(29,29,31,0.08); --sidebar-selection: rgba(29,29,31,0.07);
  --border: #E5E5EA; --border-strong: #D1D1D6;
  --text: #1D1D1F; --text-muted: #6C6C72; --text-faint: #8E8E93;
  --accent: #1D1D1F; --on-accent: #FFFFFF; --accent-hover: #3A3A3C; --you: #1D1D1F;
  --danger: #D1241B; --danger-soft: #FDECEA; --switch-off: #D1D1D6; --switch-on: #1D1D1F;
  --scrim: rgba(0,0,0,0.32);
  --bar-glass: rgba(242,242,247,0.8); --room-glass: var(--bar-glass); --glass-filter: saturate(180%) blur(20px);
  --shadow-overlay: 0 16px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04);
  --shadow-float: 0 4px 16px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06);
  --opacity-disabled: 0.38; --press-scale: 0.97;
  --heat-0: #EEEEF2; --heat-1: #C7C7CC; --heat-2: #9C9CA3; --heat-3: #6C6C72; --heat-4: #3A3A3C;
  --chart-neutral: #C7C7CC; --chart-neutral-strong: #3A3A3C;
  --avatar-on-poster: rgba(255,255,255,0.6); --story-hint: #98989D; --story-backdrop: #0B0B0C;
  --poster: #E5E5EA; --room-tint: #EEEEF2; --them: #8E8E93; --them-ink: #6C6C72; --on-them: #3A3A3C; --room: var(--bg);
  --on-poster: #1D1D1F; --on-poster-muted: rgba(29,29,31,0.72); --on-poster-line: rgba(29,29,31,0.16);
  --on-poster-chip: rgba(29,29,31,0.08); --on-poster-faint: rgba(29,29,31,0.3);
  --text-display: 600 56px/56px var(--font-sans); --tracking-display: -0.045em;
  --text-figure: 600 44px/48px var(--font-sans); --tracking-figure: -0.035em;
  --text-h1: 600 30px/36px var(--font-sans); --tracking-h1: -0.025em;
  --text-h2: 600 24px/32px var(--font-sans); --tracking-h2: -0.02em;
  --text-h3: 600 20px/28px var(--font-sans); --tracking-h3: -0.015em;
  --text-num: 500 24px/32px var(--font-sans);
  --text-title: 500 16px/24px var(--font-sans);
  --text-body: 400 16px/24px var(--font-sans);
  --text-ui: 500 15px/20px var(--font-sans);
  --text-small: 400 14px/20px var(--font-sans);
  --text-small-strong: 500 14px/20px var(--font-sans);
  --text-caption: 500 12px/16px var(--font-sans);
  --radius-mark: 4px; --radius-xs: 8px; --radius-sm: 12px; --radius-md: 16px; --radius-lg: 20px; --radius-xl: 32px; --radius-full: 999px;
  --control-sm: 36px; --control-md: 36px; --control-lg: 44px; --control-xl: 44px; --row: 56px;
  --card-padding: 16px; --card-gap: 12px; --page-gutter: 16px; --page-gap: 32px;
}
.pc {
  --text-display: 600 88px/88px var(--font-sans);
  --text-figure: 600 56px/60px var(--font-sans);
  --text-h1: 600 34px/40px var(--font-sans);
  --text-h2: 600 28px/36px var(--font-sans);
  --text-h3: 600 22px/28px var(--font-sans);
  --radius-lg: 24px; --card-padding: 24px; --card-gap: 16px; --page-gutter: 40px; --page-gap: 40px;
}
[data-theme=dark] {
  --bg: #000000; --surface: #1C1C1E; --surface-2: #2C2C2E; --surface-raised: #2C2C2E; --fill-raised: #3A3A3C;
  --hover: rgba(235,235,245,0.06); --pressed: rgba(235,235,245,0.12); --sidebar-selection: #2C2C2E;
  --border: #38383A; --border-strong: #48484A;
  --text: #F5F5F7; --text-muted: #98989D; --text-faint: #6E6E73;
  --accent: #F5F5F7; --on-accent: #1D1D1F; --accent-hover: #FFFFFF; --you: #F5F5F7;
  --danger: #FF6961; --danger-soft: #3A1A18; --switch-off: #6E6E73; --switch-on: #F5F5F7; --scrim: rgba(0,0,0,0.6);
  --bar-glass: rgba(0,0,0,0.72);
  --shadow-overlay: 0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08);
  --heat-0: #2C2C2E; --heat-1: #48484C; --heat-2: #6C6C72; --heat-3: #94949B; --heat-4: #C4C4CA;
  --chart-neutral: #48484C; --chart-neutral-strong: #D1D1D6;
}
""" + ''.join(
    "[data-hue={n}]{{--poster:{poster};--room-tint:{tint};--them:{them};--them-ink:{them_ink};--on-them:{on_them};--room:{room};--room-glass:{glass};}}\n"
    "[data-theme=dark] [data-hue={n}],[data-theme=dark][data-hue={n}]{{--poster:{poster_d};--room:{room_d};--room-glass:var(--bar-glass);--room-tint:var(--surface-2);--them:{poster};--them-ink:{poster};}}\n".format(n=n, room_d=h.get('room_d') or _dark_room(h['room']), glass='rgba({},{},{},0.8)'.format(*[int(h['room'][i:i + 2], 16) for i in (1, 3, 5)]), **{k: v for k, v in h.items() if k != 'room_d'})
    for n, h in HUES.items()) + r"""
* { box-sizing: border-box; }
.app { font-family: var(--font-sans); color: var(--text); background: var(--bg); position: relative; overflow: hidden;
  display: flex; flex-direction: column; -webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums; }
.app ::selection { background: var(--room-tint); color: var(--text); }
:where(.app) h1, :where(.app) h2, :where(.app) h3, :where(.app) p { margin: 0; }
:where(.app) a { color: inherit; text-decoration: none; }
:where(.app) button { font: inherit; color: inherit; border: 0; background: none; padding: 0; cursor: pointer; text-align: inherit; }
:where(.app) svg { width: 20px; height: 20px; flex: none; }
.app :focus-visible, .is-focus { outline: 2px solid var(--accent); outline-offset: 2px; }
.room { background: var(--room); }
/* layout utilities */
.stack { display: flex; flex-direction: column; }
.row-f { display: flex; align-items: center; }
.grow { flex: 1; min-width: 0; }
.gap-0-5 { gap: var(--space-0-5); } .gap-1 { gap: var(--space-1); } .gap-2 { gap: var(--space-2); } .gap-3 { gap: var(--space-3); }
.gap-4 { gap: var(--space-4); } .gap-6 { gap: var(--space-6); } .gap-8 { gap: var(--space-8); } .gap-10 { gap: var(--space-10); }
.between { justify-content: space-between; } .center { justify-content: center; } .start { align-items: flex-start; } .end { justify-content: flex-end; } .base { align-items: baseline; }
.grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--card-gap); }
.grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--card-gap); }
.grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--card-gap); }
.page { display: flex; flex-direction: column; gap: var(--page-gap); padding: var(--space-2) var(--page-gutter) var(--space-12); }
.pc .page { padding: var(--space-12) var(--page-gutter) var(--space-16); }
.cards { display: flex; flex-direction: column; gap: var(--card-gap); }
.section { display: flex; flex-direction: column; gap: var(--space-3); }
.pc .section { gap: var(--space-4); }
.mt-auto { margin-top: auto; }
/* type */
.t-display { font: var(--text-display); letter-spacing: var(--tracking-display); text-wrap: balance; overflow-wrap: anywhere; hyphens: auto; }
.poster-name { container-type: inline-size; }
.poster-name .t-display { font-size: clamp(36px, 15cqi, var(--display-max, 56px)); line-height: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.pc .poster-name .t-display { --display-max: 88px; font-size: clamp(48px, 9cqi, var(--display-max)); }
.t-figure { font: var(--text-figure); letter-spacing: var(--tracking-figure); }
.t-h1 { font: var(--text-h1); letter-spacing: var(--tracking-h1); text-wrap: balance; }
.t-h2 { font: var(--text-h2); letter-spacing: var(--tracking-h2); text-wrap: balance; }
.t-h3 { font: var(--text-h3); letter-spacing: var(--tracking-h3); text-wrap: balance; }
.t-num { font: var(--text-num); letter-spacing: -0.02em; white-space: nowrap; }
.t-title { font: var(--text-title); }
.t-body { font: var(--text-body); text-wrap: pretty; }
.t-ui { font: var(--text-ui); }
.t-small { font: var(--text-small); text-wrap: pretty; }
.t-small-strong { font: var(--text-small-strong); }
.t-caption { font: var(--text-caption); }
.muted { color: var(--text-muted); }
.them-ink { color: var(--them-ink); }
.trunc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.nowrap { white-space: nowrap; }
/* buttons — sm 32 in rows, md 36 on desktop, lg 44 on phone, xl 48 for the one primary of a phone screen */
.btn { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); height: var(--control-lg);
  padding: 0 var(--space-4); border-radius: var(--radius-full); font: var(--text-ui); white-space: nowrap; }
.btn svg { width: 20px; height: 20px; }
.btn.sm { height: var(--control-sm); padding: 0 var(--space-3); font: var(--text-small-strong); gap: var(--space-1); }
.btn.sm svg { width: 16px; height: 16px; }
.btn.md { height: var(--control-md); padding: 0 var(--space-4); }
.btn.xl { height: var(--control-xl); padding: 0 var(--space-6); }
.btn.block { width: 100%; }
.btn.sm::before, .btn.md::before, .hit::before { content: ''; position: absolute; inset: -6px -4px; }
.icon-btn::before { content: ''; position: absolute; inset: -6px; }
.btn-primary { background: var(--accent); color: var(--on-accent); }
.btn-secondary { background: var(--surface); color: var(--text); box-shadow: inset 0 0 0 1px var(--border-strong); }
.tile .btn-secondary, .sheet .btn-secondary, .dialog .btn-secondary, .group .btn-secondary { background: none; }
.btn-tinted { background: var(--surface-2); color: var(--text); }
.sheet .btn-tinted, .dialog .btn-tinted, .tile .btn-tinted { background: var(--fill-raised); }
.btn-plain { color: var(--text); padding: 0 var(--space-2); }
.btn-danger { background: var(--danger-soft); color: var(--danger); }
.btn-poster { background: var(--on-poster); color: var(--poster); }
.btn-poster-2 { background: var(--on-poster-chip); color: var(--on-poster); }
.btn.is-hover.btn-primary { background: var(--accent-hover); }
.btn.is-hover.btn-secondary { background: var(--hover); }
.btn.is-press { transform: scale(var(--press-scale)); }
.btn.is-disabled { opacity: var(--opacity-disabled); }
.fab { position: absolute; left: 50%; bottom: var(--safe-bottom); transform: translateX(-50%); box-shadow: var(--shadow-float); }
.spin { width: 16px; height: 16px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent; opacity: 0.9; flex: none; }
.icon-btn { position: relative; width: var(--control-md); height: var(--control-md); border-radius: var(--radius-full); display: inline-flex; align-items: center; justify-content: center;
  background: var(--surface-2); color: var(--text); flex: none; }
.icon-btn svg { width: 20px; height: 20px; }
.room .icon-btn { background: var(--surface); }
.sheet .icon-btn, .dialog .icon-btn { background: var(--fill-raised); }
.icon-btn.on-poster { background: var(--on-poster-chip); color: var(--on-poster); }
.icon-btn.lg { width: var(--control-lg); height: var(--control-lg); }
.icon-btn.sm { width: var(--control-sm); height: var(--control-sm); }
/* avatars 24 / 32 / 40 / 48 / 64 */
.av { border-radius: 50%; flex: none; display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(var(--room-tint), var(--poster)); color: var(--on-poster); font-weight: 600; }
.av.you { background: var(--you); color: var(--on-accent); }
[data-theme=dark] .av:not(.you):not(.add) { background: var(--poster); color: #1D1D1F; }
.poster .btn-plain, .poster .btn-secondary { color: var(--on-poster); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.av.add { background: var(--on-poster-chip); }
.av-24 { width: 24px; height: 24px; font-size: 10px; } .av-32 { width: 32px; height: 32px; font-size: 12px; }
.av-40 { width: 40px; height: 40px; font-size: 14px; } .av-64 { width: 64px; height: 64px; font-size: 22px; }
/* tiles: question → answer → picture → note */
.tile { background: var(--surface); border-radius: var(--radius-lg); padding: var(--card-padding); display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.tile .q { font: var(--text-small); color: var(--text-muted); }
.tile .a { font: var(--text-h3); letter-spacing: var(--tracking-h3); text-wrap: balance; }
.tile .note { font: var(--text-small); color: var(--text-muted); }
.tile.rows { gap: 0; padding-top: var(--space-1); padding-bottom: var(--space-1); }
.tile.rows > .q { padding-top: var(--space-3); padding-bottom: var(--space-1); }
.tile.rows > .a { padding-bottom: var(--space-2); }
/* the person's colour — every poster surface (report top, tiles, stories, guest) shares these */
.poster { background: var(--poster); color: var(--on-poster); }
.poster .q, .poster .muted, .poster .note, .poster .axis, .poster .cmp .lbl { color: var(--on-poster-muted); }
.poster .them-ink, .poster .cmp .lbl.them { color: var(--on-them); }
.poster .bar .y { background: var(--on-poster); }
.poster .bar .t { background: var(--on-them); }
.poster .row, .poster .kv { box-shadow: inset 0 -1px 0 var(--on-poster-line); }
.poster .row:last-child, .poster .kv:last-child { box-shadow: none; }
/* a chapter's first finding, without a container */
.hero { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-2) 0 var(--space-3); }
.hero .q { font: var(--text-small); color: var(--text-muted); }
.hero .a { font: var(--text-h2); letter-spacing: var(--tracking-h2); text-wrap: balance; }
.hero .cmp .num { font: var(--text-figure); letter-spacing: var(--tracking-figure); }
.hero .bar { height: 12px; }
/* rows */
.group { background: var(--surface); border-radius: var(--radius-md); padding: 0 var(--space-4); }
.pc .group { border-radius: var(--radius-lg); padding: 0 var(--space-6); }
.group-h { font: var(--text-small); color: var(--text-muted); padding: 0 var(--space-4) var(--space-2); }
.group-f { font: var(--text-small); color: var(--text-muted); padding: var(--space-2) var(--space-4) 0; }
.row { position: relative; display: flex; align-items: center; gap: var(--space-3); min-height: var(--row); padding: var(--space-1) 0; box-shadow: inset 0 -1px 0 var(--border); width: 100%; }
.row:last-child { box-shadow: none; }
/* the separator starts where the text starts, as in iOS lists */
.row:has(> .av, > .lead-ic, > span > .av) { box-shadow: none; }
.row:has(> .av, > .lead-ic, > span > .av)::after { content: ''; position: absolute; right: 0; bottom: 0; height: 1px; background: var(--border); left: var(--row-inset, 52px); }
.row:has(> .av-32, > .lead-ic) { --row-inset: 44px; } .row:has(> .av-24) { --row-inset: 36px; }
.row:last-child::after { display: none; }
.poster .row:has(> .av, > .lead-ic)::after { background: var(--on-poster-line); }
.row.compact { min-height: var(--row); }
.row .t { font: var(--text-title); }
.row .m { font: var(--text-small); color: var(--text-muted); }
.row .v { font: var(--text-body); color: var(--text-muted); white-space: nowrap; }
.row .chev { width: 16px; height: 16px; color: var(--text-faint); }
.row.danger .t { color: var(--danger); }
.row.is-selected::before { content: ''; position: absolute; inset: 2px calc(-1 * var(--space-3)); border-radius: var(--radius-sm); background: var(--sidebar-selection); }
.row.is-hover::before { content: ''; position: absolute; inset: 2px calc(-1 * var(--space-3)); border-radius: var(--radius-sm); background: var(--hover); }
.row > * { position: relative; }
.kv { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); padding: var(--space-3) 0; box-shadow: inset 0 -1px 0 var(--border); font: var(--text-small); }
.kv:last-child { box-shadow: none; }
.kv > b { font: var(--text-ui); text-align: right; white-space: nowrap; color: var(--text); }
.kv .sub { display: block; font: var(--text-caption); font-weight: 400; color: var(--text-muted); }
.poster .kv .sub { color: var(--on-poster-muted); }
.slot { width: 168px; display: flex; justify-content: flex-end; align-items: center; gap: var(--space-2); flex: none; }
/* chips */
.chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.chip { font: var(--text-small); padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); background: var(--surface-2); color: var(--text); }
.chip.them { background: var(--room-tint); }
.chip.shared { background: none; box-shadow: inset 0 0 0 1px var(--border-strong); }
.chip b { font-weight: 500; color: var(--text-muted); margin-left: var(--space-1); }
/* compare: you vs them — two numbers and one bar, you first and left */
.cmp { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-1) var(--space-2); }
.cmp .lbl { font: var(--text-small); color: var(--text-muted); }
.cmp .lbl.them { color: var(--them-ink); text-align: right; }
.cmp .num { font: var(--text-num); letter-spacing: -0.02em; white-space: nowrap; }
.cmp .num.them { text-align: right; }
.bar { display: flex; gap: var(--space-0-5); height: 8px; border-radius: var(--radius-full); overflow: hidden; }
.bar i { display: block; }
.bar .y { background: var(--you); }
.bar .t { background: var(--them); }
.share-bar { display: block; height: 8px; border-radius: var(--radius-full); background: var(--them); }
/* the mark: mirrored pulse — you on top in ink, them below in their deep tone */
.pulse { display: flex; flex-direction: column; gap: var(--space-0-5); }
.pulse .up, .pulse .dn, .pulse .one { display: flex; gap: var(--space-0-5); }
.pulse .up { align-items: flex-end; } .pulse .dn { align-items: flex-start; } .pulse .one { align-items: flex-end; }
.pulse i { display: block; flex: 1; border-radius: var(--radius-full); min-width: 1px; }
.pulse .up i, .pulse .one i { background: var(--on-poster); }
.pulse .dn i { background: var(--on-them); }
.pulse .one i.off { background: var(--on-poster-faint); }
.legend { display: flex; gap: var(--space-4); font: var(--text-caption); color: var(--on-poster-muted); }
.legend span { display: inline-flex; align-items: center; gap: var(--space-1); }
.legend i { width: 8px; height: 8px; border-radius: 50%; background: var(--on-poster); }
.legend i.f { background: var(--on-them); }
/* charts — the whole chat is neutral; only people get colour */
.hours { display: flex; align-items: flex-end; gap: var(--space-0-5); }
.hours i { display: block; flex: 1; border-radius: var(--radius-mark) var(--radius-mark) 2px 2px; background: var(--chart-neutral); }
.hours i.hot { background: var(--chart-neutral-strong); }
.axis { display: flex; justify-content: space-between; font: var(--text-caption); color: var(--text-muted); }
.heat { display: grid; gap: var(--space-0-5); }
.heat i { display: block; aspect-ratio: 1; border-radius: var(--radius-mark); }
.h0 { background: var(--heat-0); } .h1 { background: var(--heat-1); } .h2 { background: var(--heat-2); } .h3 { background: var(--heat-3); } .h4 { background: var(--heat-4); }
.squares { display: flex; flex-wrap: wrap; gap: var(--space-0-5); }
.squares i { width: 12px; height: 12px; border-radius: var(--radius-mark); background: var(--you); }
.squares.them i { background: var(--them); }
.podium { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); align-items: end; text-align: center; }
.podium .e { font-size: 28px; line-height: 36px; } .podium .e.first { font-size: 36px; line-height: 44px; }
.podium i { display: block; border-radius: var(--radius-sm) var(--radius-sm) var(--radius-mark) var(--radius-mark); background: var(--chart-neutral); margin-top: var(--space-1); }
.podium i.first { background: var(--chart-neutral-strong); }
.podium b { display: block; font: var(--text-small); color: var(--text-muted); margin-top: var(--space-1); font-weight: 400; }
/* bars: the one place for material — only over scrolling content */
.nav-ph { position: relative; display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--page-gutter); min-height: var(--row); }
.material { background: var(--bar-glass); -webkit-backdrop-filter: var(--glass-filter); backdrop-filter: var(--glass-filter); box-shadow: inset 0 -1px 0 var(--border); }
.room .material { background: var(--room-glass); }
.nav-title { flex: 1; min-width: 0; text-align: center; display: flex; flex-direction: column; }
.nav-title b { font: 600 15px/20px var(--font-sans); }
.nav-title span { font: var(--text-caption); color: var(--text-muted); font-weight: 400; }
.sidebar { width: var(--sidebar); flex: none; background: var(--surface); box-shadow: inset -1px 0 0 var(--border); display: flex; flex-direction: column; padding: var(--space-4) var(--space-3); gap: var(--space-0-5); }
.sb-row { position: relative; display: flex; align-items: center; gap: var(--space-3); min-height: var(--control-md); padding: var(--space-1) var(--space-2); border-radius: var(--radius-xs); font: var(--text-ui); }
.sb-row.person { min-height: 48px; }
.sb-row .m { font: var(--text-small); color: var(--text-muted); }
.sb-row.on { background: var(--sidebar-selection); }
.sb-row .lead { width: 32px; height: 32px; border-radius: 50%; background: var(--surface-2); display: inline-flex; align-items: center; justify-content: center; flex: none; color: var(--text); }
.sb-row.on .lead { background: var(--surface); }
.sb-row .lead svg { width: 20px; height: 20px; }
.sb-row .m.new { color: var(--text); font-weight: 500; }
.sb-h { font: var(--text-caption); color: var(--text-muted); padding: var(--space-4) var(--space-2) var(--space-1); }
.logo .logo-up { fill: var(--you); } .poster .logo .logo-up { fill: var(--on-poster); }
.logo-rect { fill: #1D1D1F; } .logo-tile .logo-up { fill: #FFFFFF; } 
.sb-row.home { min-height: 48px; gap: var(--space-3); padding-left: var(--space-1); }
.wordmark { font: 600 16px/24px var(--font-sans); letter-spacing: -0.01em; }
/* overlays */
.scrim { position: absolute; inset: 0; background: var(--scrim); }
.sheet { position: absolute; left: 0; right: 0; bottom: 0; background: var(--surface-raised); border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--space-2) var(--space-4) var(--safe-bottom); display: flex; flex-direction: column; gap: var(--space-4); overscroll-behavior: contain; }
.grabber { align-self: center; width: 36px; height: 5px; border-radius: var(--radius-full); background: var(--border-strong); }
.sheet-h { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; min-height: 44px; }
.sheet-h > h2 { text-align: center; font: var(--text-h3); letter-spacing: var(--tracking-h3); }
.dialog { position: absolute; left: 50%; background: var(--surface-raised); border-radius: var(--radius-xl); padding: var(--space-6); box-shadow: var(--shadow-overlay);
  display: flex; flex-direction: column; gap: var(--space-4); }
.dialog.sm { width: 420px; margin-left: -210px; } .dialog.md { width: 520px; margin-left: -260px; } .dialog.lg { width: 680px; margin-left: -340px; }
.menu { position: absolute; background: var(--surface-raised); border-radius: var(--radius-md); padding: var(--space-1); box-shadow: var(--shadow-overlay); min-width: 240px; }
.menu .mi { display: flex; align-items: center; gap: var(--space-3); height: var(--control-lg); padding: 0 var(--space-3); border-radius: var(--radius-sm); font: var(--text-ui); width: 100%; }
.pc .menu .mi { height: var(--control-md); }
.menu .mi.on { background: var(--sidebar-selection); }
.menu .mi.danger { color: var(--danger); }
.menu .mi svg { width: 20px; height: 20px; }
.menu hr { border: 0; height: 1px; background: var(--border); margin: var(--space-1) var(--space-2); }
.toast { position: absolute; display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4); border-radius: var(--radius-md);
  background: var(--accent); color: var(--on-accent); box-shadow: var(--shadow-overlay); font: var(--text-small); min-height: 48px; }
.toast .btn { height: var(--control-sm); padding: 0 var(--space-3); background: transparent; color: var(--on-accent); font: var(--text-small-strong); border-radius: var(--radius-full); box-shadow: inset 0 0 0 1px currentColor; }
/* fields */
.label { font: var(--text-small-strong); }
.hint { font: var(--text-small); color: var(--text-muted); }
.field { display: flex; align-items: center; gap: var(--space-3); height: var(--control-lg); padding: 0 var(--space-4); border-radius: var(--radius-sm); background: var(--surface-2); font: var(--text-body); box-shadow: inset 0 0 0 1px var(--border); }
.sheet .field { background: var(--fill-raised); }
.field.focus { box-shadow: inset 0 0 0 2px var(--accent); background: var(--surface); }
.field.error { box-shadow: inset 0 0 0 2px var(--danger); }
.field .ph { color: var(--text-muted); }
/* country code: a pill inset 4 on every side, its corners concentric with the field (12 − 4 = 8) */
.field:has(> .cc) { padding-left: var(--space-1); }
.field .cc { display: flex; align-items: center; gap: var(--space-2); height: calc(var(--control-lg) - 2 * var(--space-1)); padding: 0 var(--space-2) 0 var(--space-2); border-radius: var(--radius-xs); background: var(--surface-2); font: var(--text-body); color: var(--text); }
.field.focus .cc { background: var(--surface-2); }
.field .cc svg { width: 16px; height: 16px; }
.field svg { width: 20px; height: 20px; color: var(--text-muted); }
.search { display: flex; align-items: center; gap: var(--space-2); height: var(--control-md); padding: 0 var(--space-3); border-radius: var(--radius-sm); background: var(--surface-2); font: var(--text-body); color: var(--text-muted); }
.search svg { width: 16px; height: 16px; }
.sheet .search { background: var(--fill-raised); }
.pc .search { background: var(--surface); }
.filters { display: flex; gap: var(--space-1); }
.filters .btn { color: var(--text-muted); background: none; }
.filters .btn.on { color: var(--text); background: var(--sidebar-selection); }
.sheet .filters .btn.on { background: var(--fill-raised); }
.otp { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--space-2); }
.otp span { height: var(--row); border-radius: var(--radius-sm); background: var(--surface-2); box-shadow: inset 0 0 0 1px var(--border); display: flex; align-items: center; justify-content: center; font: 600 24px/32px var(--font-sans); }
.otp span.focus { background: var(--surface); box-shadow: inset 0 0 0 2px var(--accent); }
.otp.error span { box-shadow: inset 0 0 0 2px var(--danger); }
.err { font: var(--text-small); color: var(--danger); display: flex; gap: var(--space-2); align-items: center; }
.err svg { width: 16px; height: 16px; }
.switch { position: relative; width: 40px; height: 24px; border-radius: var(--radius-full); background: var(--switch-off); flex: none; }
.switch::before { content: ''; position: absolute; inset: -10px -2px; }
.switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.switch.on { background: var(--switch-on); }
[data-theme=dark] .switch.on::after { background: #1D1D1F; }
.switch.on::after { left: 18px; }
.skel { background: var(--surface-2); border-radius: var(--radius-xs); }
.empty-ic { display: flex; color: var(--text-muted); flex: none; }  /* bare symbol like iOS unavailable views — no grey disc */
.empty-ic svg { width: 32px; height: 32px; stroke-width: 1.5; }
.story-seg { display: grid; gap: var(--space-1); }
.story-seg i { height: 4px; border-radius: var(--radius-full); background: var(--on-poster-faint); }
.story-seg i.on { background: var(--on-poster); }
.thumb916 { position: relative; aspect-ratio: 9/16; border-radius: var(--radius-sm); background: var(--poster); color: var(--on-poster); padding: var(--space-2); display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
.thumb916 b { font: 600 12px/16px var(--font-sans); }
.thumb916 small { font: var(--text-caption); font-weight: 400; color: var(--on-poster-muted); }
.kbd { font: var(--text-caption); padding: var(--space-0-5) var(--space-2); border-radius: var(--radius-xs); background: var(--surface-2); color: var(--text-muted); }
.choice { display: flex; align-items: center; gap: var(--space-3); height: var(--row); padding: 0 var(--space-4); border-radius: var(--radius-lg); background: var(--surface); color: var(--text); width: 100%; }
.choice.on { box-shadow: inset 0 0 0 2px var(--accent); }
.choice.wrong { box-shadow: inset 0 0 0 2px var(--danger); }
.sw { border-radius: var(--radius-sm); height: 56px; box-shadow: inset 0 0 0 1px var(--border); }
.spec { font: var(--text-small); color: var(--text-muted); }
.backdrop { background: var(--story-backdrop); }
.inspector { background: var(--surface); border-radius: var(--radius-lg); padding: var(--card-padding); display: flex; flex-direction: column; gap: var(--space-4); align-self: start; }
/* report card: a small poster with the person's avatar; actions are on view (⋯), long press is only a shortcut */
.mini { position: relative; gap: var(--space-1); }
.mini .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-2); }
.mini .name { font: 600 16px/24px var(--font-sans); }
.icon-btn.sm.on-poster { width: var(--control-sm); height: var(--control-sm); }
/* live progress: minimised to a capsule (phone dock) or a card (sidebar); opens the details */
.ring { position: relative; flex: none; display: inline-flex; align-items: center; justify-content: center; }
.ring svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.ring .track { stroke: var(--surface-2); } .ring .val { stroke: var(--accent); }
.dock { position: absolute; left: 50%; transform: translateX(-50%); max-width: calc(100% - 2 * var(--page-gutter)); bottom: var(--safe-bottom); display: flex; }
.account-btn { width: var(--control-lg); height: var(--control-lg); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--surface-raised); box-shadow: inset 0 0 0 1px var(--border), var(--shadow-float); position: relative; }
.live { min-width: 0; display: flex; align-items: center; gap: var(--space-2); height: var(--control-lg); padding: 0 var(--space-3) 0 var(--space-1); border-radius: var(--radius-full); color: var(--text); }
.live .chev { width: 16px; height: 16px; color: var(--text-faint); }
.sb-live { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-md); background: var(--surface-2); margin: var(--space-2) 0; }
.sb-live .ring .track { stroke: var(--surface); }
/* flags: drawn, because Windows shows letters instead of flag emoji */
.flag { flex: none; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08); overflow: hidden; display: inline-block; }
.flag svg { display: block; width: 100%; height: 100%; }
/* stories: every frame can be saved or shared on its own */
.story-actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
.facts { display: grid; grid-template-columns: 1fr 1fr; }
.facts > div { padding: var(--space-3) 0; box-shadow: inset 0 -1px 0 var(--on-poster-line); display: flex; flex-direction: column; gap: var(--space-0-5); }
.facts > div:nth-last-child(-n+2) { box-shadow: none; }
.facts b { font: var(--text-h2); letter-spacing: var(--tracking-h2); }
.facts span { font: var(--text-small); color: var(--on-poster-muted); }
/* share: «Итоги» as one poster tile, then plain rows */
.feature { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4); border-radius: var(--radius-lg); }
.fan { position: relative; width: 88px; height: 112px; flex: none; }
.fan .thumb916 { position: absolute; top: 0; width: 64px; box-shadow: 0 0 0 1px var(--on-poster-line); background: var(--poster); }
.lead-ic { width: 32px; height: 32px; border-radius: 50%; background: none; display: inline-flex; align-items: center; justify-content: center; flex: none; color: var(--text); }

.lead-ic svg { width: 20px; height: 20px; }
.big .cmp .num { font: var(--text-figure); letter-spacing: var(--tracking-figure); } .big .bar { height: 12px; }
.row.few .t { color: var(--text-muted); }
.lead-ic.danger { color: var(--danger); }
.poster .av:not(.you):not(.add) { background: var(--avatar-on-poster); color: var(--on-them); }
.poster .choice .av:not(.you) { background: linear-gradient(var(--room-tint), var(--poster)); color: var(--on-poster); }
.heat i.none { background: none; }
.row.wrap { padding: var(--space-3) 0; align-items: flex-start; }
.row.wrap > .lead-ic { margin-top: var(--space-0-5); }
.row.wrap .stack { gap: var(--space-0-5); }
.row.wrap .m { white-space: normal; overflow: visible; }
/* device keyboard — not product UI, shown so a focused field explains the space below it */
.kb { position: absolute; left: 0; right: 0; bottom: 0; background: #D1D4DA; padding: 8px 4px 34px; display: grid; gap: 8px; }
.kb .r { display: flex; gap: 6px; justify-content: center; }
.kb i { font-style: normal; flex: 1; height: 46px; border-radius: 5px; background: #FFFFFF; box-shadow: 0 1px 0 #898A8D; display: flex; align-items: center; justify-content: center; font: 400 25px/1 var(--font-sans); color: #000; }
.kb.letters i { height: 42px; font-size: 20px; max-width: 32px; }
.kb i.fn { background: #ABB0BA; font-size: 15px; max-width: none; }
.kb i.blank { background: none; box-shadow: none; }
.link { text-decoration: underline; text-underline-offset: 0.2em; text-decoration-thickness: 1px; }
.mask { letter-spacing: 0.2em; }
.page-max { width: 100%; max-width: var(--page-max); }
/* one row value: ui 500, ink, tabular, a fixed right column; rows without a chevron keep its place */
.val { font: var(--text-ui); color: var(--text); white-space: nowrap; text-align: right; }
.poster .val { color: var(--on-poster); }
.chev-space { width: 16px; flex: none; }
.row .btn.sm { min-width: 96px; }
.ev-label { min-height: 24px; display: flex; align-items: center; gap: var(--space-2); }
/* a phone-size frame on desktop (stories) keeps the phone type */
.pc .phone-scale { --text-display: 600 56px/56px var(--font-sans); --text-figure: 600 44px/48px var(--font-sans); --text-h1: 600 30px/36px var(--font-sans);
  --text-h2: 600 24px/32px var(--font-sans); --text-h3: 600 20px/28px var(--font-sans); }
.cover-thumb { width: 72px; height: 128px; flex: none; border-radius: var(--radius-sm); background: var(--poster); box-shadow: inset 0 0 0 1px var(--on-poster-line);
  padding: var(--space-2); display: flex; flex-direction: column; justify-content: space-between; }
/* Итоги: one picture per frame, centred between the controls; the saved picture keeps the stories safe zone (250 / 340 of 1920) */
.story-body { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: var(--space-4); }
.story .t-display { line-height: 1; }
.st-art { display: flex; flex-direction: column; justify-content: flex-end; }
.st-lede { font: var(--text-h3); letter-spacing: var(--tracking-h3); text-wrap: balance; }
/* «Вы двое»: a conversation — her bubble left in her deep tone, yours right in ink, Telegram service pills between */
.st-chat { display: flex; flex-direction: column; gap: var(--space-1); }
.bubble { display: flex; flex-direction: column; gap: var(--space-0-5); max-width: 72%; padding: var(--space-3) var(--space-4); border-radius: var(--radius-xl); color: var(--poster); font: var(--text-small); }
.bubble b { font: var(--text-display); letter-spacing: var(--tracking-display); }
.bubble.sm { padding: var(--space-2) var(--space-3); font: var(--text-ui); }
.bubble.them { align-self: flex-start; background: var(--on-them); border-bottom-left-radius: var(--radius-mark); }
.bubble.you { align-self: flex-end; background: var(--on-poster); border-bottom-right-radius: var(--radius-mark); text-align: right; }
.service { align-self: center; padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); background: var(--on-poster-chip); font: var(--text-small-strong); }
/* «Время»: the day as a clock face */
.st-dial-wrap { display: flex; justify-content: center; }
.st-dial { width: 220px; height: 220px; overflow: visible; }
.story.still .st-dial { width: 200px; height: 200px; }
.st-dial line { stroke: var(--on-poster-faint); stroke-width: 8; stroke-linecap: round; }
.st-dial line.hot { stroke: var(--on-poster); }
.st-dial text { fill: var(--on-poster-muted); font: var(--text-caption); text-anchor: middle; }
.st-dial text.big { fill: var(--on-poster); font: var(--text-h1); letter-spacing: var(--tracking-h1); }
/* «О чём»: a numbered top five and the favourite emoji as a sticker */
.st-top { list-style: none; margin: 0; padding: 0; }
.st-top li { display: grid; grid-template-columns: var(--space-6) 1fr auto; align-items: center; min-height: 40px; }
.st-top .n { font: var(--text-h3); color: var(--on-poster-muted); }
.st-top b { font: var(--text-h2); letter-spacing: var(--tracking-h2); }
.st-top li:first-child { min-height: 64px; }
.st-top li:first-child b { font: var(--text-display); line-height: 64px; letter-spacing: var(--tracking-display); }
.st-top .c { font: var(--text-small); color: var(--on-poster-muted); }
/* group: a class photo, the share pinned on each portrait */
.st-cast { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4) var(--space-3); }
.st-cast > div { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-1); }
.poster .st-cast .av { background: linear-gradient(var(--room-tint), var(--poster)); color: var(--on-them); box-shadow: 0 0 0 2px var(--on-poster-chip); margin-bottom: var(--space-1); }
.st-cast .pct { padding: 0 var(--space-2); border-radius: var(--radius-full); background: var(--on-poster); color: var(--poster); font: var(--text-small-strong); font-style: normal; }
/* shared pieces of the frames: who it is about, three facts, parts of the day, plain lines */
.st-who { display: flex; align-items: center; gap: var(--space-2); font: var(--text-ui); }
.st-pair { display: flex; }
.st-pair .av + .av { margin-left: calc(-1 * var(--space-2)); box-shadow: 0 0 0 2px var(--poster); }
.poster .st-who .av:not(.you) { background: linear-gradient(var(--room-tint), var(--poster)); color: var(--on-them); }
.st-parts { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.st-parts span { display: inline-flex; align-items: baseline; gap: var(--space-1); padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); background: var(--on-poster-chip); font: var(--text-small); }
.st-parts span.on { background: var(--on-poster); color: var(--poster); }
.st-parts b { font: var(--text-ui); font-weight: 600; }
.st-parts.emo i { font-style: normal; font-size: 20px; line-height: 20px; }
.st-lines { display: flex; flex-direction: column; gap: var(--space-1); font: var(--text-body); color: var(--on-poster-muted); white-space: nowrap; }
.st-lines b { color: var(--on-poster); font-weight: 600; }
.story.still { flex: none; padding: 23.1% var(--page-gutter) 31.5%; border-radius: var(--radius-sm); overflow: hidden; }
.story.still .story-body { gap: var(--space-3); }
.story.still .bubble { padding: var(--space-2) var(--space-3); }
.story.still .bubble b { font: var(--text-figure); letter-spacing: var(--tracking-figure); }
.story.still .st-lines { gap: 0; }
.story-mark { display: flex; align-items: center; justify-content: center; gap: var(--space-2); font: var(--text-small-strong); padding-top: var(--space-4); }
.safe-zone { position: absolute; left: 0; right: 0; border: 1px dashed var(--on-poster-faint); background: var(--on-poster-chip); display: flex; align-items: center; justify-content: center; font: var(--text-caption); color: var(--on-poster-muted); }
/* Controls that float over content — header circles, sheet close, the bottom pill, the progress capsule, «+» — are one family:
   44 on the phone, pill or circle, raised surface, hairline ring, one soft shadow. On a poster the same shape, translucent. */
.ph .icon-btn { width: var(--control-lg); height: var(--control-lg); }
.ph .icon-btn.sm { width: var(--control-sm); height: var(--control-sm); }
.nav-ph .icon-btn:not(.on-poster), .icon-btn.lg, .live { background: var(--surface-raised); box-shadow: inset 0 0 0 1px var(--border), var(--shadow-float); }
.sheet-h .icon-btn, .dialog .icon-btn { background: var(--surface-raised); box-shadow: inset 0 0 0 1px var(--border); }
.icon-btn.on-poster { box-shadow: inset 0 0 0 1px var(--on-poster-line); }
.fab { box-shadow: var(--shadow-float); }
.pc { --control-xl: 44px; }
.tab { --page-gutter: 32px; }
.tab .column { width: 100%; max-width: 720px; margin: 0 auto; }
.tab .poster > * { width: 100%; max-width: calc(720px - 2 * var(--page-gutter)); margin-left: auto; margin-right: auto; }
"""


def bars(n, seed=0.0, hi=30, lo=3, f1=0.55, f2=0.21):
    import math
    out = []
    for i in range(n):
        v = abs(math.sin(i * f1 + seed) * 0.62 + math.cos(i * f2 + seed * 1.7) * 0.38)
        out.append(round(lo + v * (hi - lo)))
    return out
