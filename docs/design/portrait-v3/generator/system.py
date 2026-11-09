"""«Портрет» v3 — tokens and component CSS for every mockup.

Token NAMES are the product's (apps/web/app/assets/styles/tokens.css), so a mockup is a spec the code follows
one to one. Values follow docs/design-system.md §13: Apple HIG (grouped backgrounds, text styles, 44 pt
targets, sheets, bar material), Radix Themes (space 4…80), Primer (layers), Material 3 (exit easing).
"""

# Seven person colours, Telegram order (abs(peer id) % 7), in the lime style of the logo: light, saturated,
# clean, ink text on top. them = bars on white (≥ 3:1); them_ink = names on white (≥ 4.5:1);
# on_them = the person on their own poster (lower pulse, their bar, their name; ≥ 4.5:1 on the poster);
# tint = chips and avatar tops; room = page tint; poster_d = dark theme poster, dimmed so it does not glare.
HUES = {
    'red':    dict(poster='#FF9B8F', tint='#FFD3CC', them='#E85445', them_ink='#C2372B', on_them='#7A2A22', room='#FFF4F2', poster_d='#E58A7F'),
    'orange': dict(poster='#FFB65C', tint='#FFDDB3', them='#CE7110', them_ink='#A35200', on_them='#6E3B00', room='#FFF7EC', poster_d='#E3A253'),
    'violet': dict(poster='#B9A6FF', tint='#E0D7FF', them='#7F66E8', them_ink='#5F45D1', on_them='#42309A', room='#F6F3FF', poster_d='#A595E3'),
    'green':  dict(poster='#C3EC6C', tint='#E6F8B6', them='#5E9112', them_ink='#467308', on_them='#3A5A06', room='#F7FDE9', poster_d='#ADD261'),
    'teal':   dict(poster='#6EE7D2', tint='#C2F5EC', them='#11998A', them_ink='#0A7566', on_them='#09564B', room='#EFFCF9', poster_d='#62CDBB'),
    'blue':   dict(poster='#8CC8FF', tint='#CFE6FF', them='#2D8CE5', them_ink='#1767BC', on_them='#134C8A', room='#F1F8FF', poster_d='#7DB2E3'),
    'pink':   dict(poster='#FF9ED8', tint='#FFD3EE', them='#E04FAE', them_ink='#AF2A80', on_them='#7A1D59', room='#FFF3FA', poster_d='#E38DC0'),
}

CSS = r"""
:root, .app {
  --font-sans: 'Onest', -apple-system, system-ui, sans-serif;
  --space-0-5: 2px; --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px;
  --space-8: 32px; --space-10: 40px; --space-12: 48px; --space-16: 64px; --space-20: 80px;
  --bg: #F2F2F7; --surface: #FFFFFF; --surface-2: #EEEEF2; --surface-raised: #FFFFFF; --fill-raised: #EEEEF2;
  --hover: rgba(60,60,67,0.06); --pressed: rgba(60,60,67,0.12); --sidebar-selection: #E9E9EE;
  --border: rgba(60,60,67,0.18); --border-strong: rgba(60,60,67,0.3);
  --text: #111113; --text-muted: #63636B; --text-faint: #8E8E93;
  --accent: #111113; --on-accent: #FFFFFF; --accent-hover: #2C2C30; --you: #111113;
  --danger: #D1241B; --danger-soft: #FDECEA; --switch-off: #8E8E93; --switch-on: #111113;
  --scrim: rgba(0,0,0,0.32);
  --bar-glass: rgba(242,242,247,0.8); --room-glass: var(--bar-glass); --glass-filter: saturate(180%) blur(20px);
  --shadow-overlay: 0 16px 48px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(0,0,0,0.06);
  --shadow-float: 0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08);
  --opacity-disabled: 0.38; --press-scale: 0.97;
  --heat-0: #EEEEF2; --heat-1: #C9C9D0; --heat-2: #9E9EA7; --heat-3: #6E6E77; --heat-4: #3F3F45;
  --chart-neutral: #C7C7CE; --chart-neutral-strong: #3F3F45;
  --avatar-on-poster: rgba(255,255,255,0.6); --lime-brand: #C3EC6C; --lime-brand-deep: #3A5A06; --story-backdrop: #0B0B0C;
  --poster: #E5E5EA; --room-tint: #EEEEF2; --them: #8E8E93; --them-ink: #63636B; --on-them: #3A3A3F; --room: var(--bg);
  --on-poster: #111113; --on-poster-muted: rgba(17,17,19,0.72); --on-poster-line: rgba(17,17,19,0.16);
  --on-poster-chip: rgba(17,17,19,0.08); --on-poster-faint: rgba(17,17,19,0.3);
  --text-display: 600 56px/56px var(--font-sans); --tracking-display: -0.045em;
  --text-figure: 600 44px/48px var(--font-sans); --tracking-figure: -0.035em;
  --text-h1: 600 30px/36px var(--font-sans); --tracking-h1: -0.025em;
  --text-h2: 600 24px/32px var(--font-sans); --tracking-h2: -0.02em;
  --text-h3: 600 20px/28px var(--font-sans); --tracking-h3: -0.015em;
  --text-num: 500 24px/28px var(--font-sans);
  --text-title: 500 16px/24px var(--font-sans);
  --text-body: 400 16px/24px var(--font-sans);
  --text-ui: 500 15px/20px var(--font-sans);
  --text-small: 400 14px/20px var(--font-sans);
  --text-small-strong: 500 14px/20px var(--font-sans);
  --text-caption: 500 12px/16px var(--font-sans);
  --radius-mark: 4px; --radius-xs: 8px; --radius-sm: 12px; --radius-md: 16px; --radius-lg: 20px; --radius-xl: 32px; --radius-full: 999px;
  --control-sm: 32px; --control-md: 36px; --control-lg: 44px; --control-xl: 48px;
  --card-padding: 16px; --card-gap: 12px; --page-gutter: 16px; --page-gap: 32px;
  --pulse-sm: 24px; --pulse-md: 32px; --pulse-lg: 48px;
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
  --border: rgba(84,84,88,0.65); --border-strong: rgba(140,140,148,0.6);
  --text: #F5F5F7; --text-muted: #A1A1A8; --text-faint: #6E6E73;
  --accent: #F5F5F7; --on-accent: #111113; --accent-hover: #FFFFFF; --you: #F5F5F7;
  --danger: #FF6961; --danger-soft: #3A1A18; --switch-off: #6E6E73; --switch-on: #F5F5F7; --scrim: rgba(0,0,0,0.6);
  --bar-glass: rgba(0,0,0,0.72);
  --shadow-overlay: 0 16px 48px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.08);
  --heat-0: #2C2C2E; --heat-1: #48484C; --heat-2: #6C6C72; --heat-3: #94949B; --heat-4: #C4C4CA;
  --chart-neutral: #48484C; --chart-neutral-strong: #D1D1D6;
}
""" + ''.join(
    "[data-hue={n}]{{--poster:{poster};--room-tint:{tint};--them:{them};--them-ink:{them_ink};--on-them:{on_them};--room:{room};--room-glass:{glass};}}\n"
    "[data-theme=dark] [data-hue={n}],[data-theme=dark][data-hue={n}]{{--poster:{poster_d};--room:var(--bg);--room-glass:var(--bar-glass);--room-tint:var(--surface-2);--them:{poster};--them-ink:{poster};}}\n".format(n=n, glass='rgba({},{},{},0.8)'.format(*[int(h['room'][i:i + 2], 16) for i in (1, 3, 5)]), **h)
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
.btn svg { width: 18px; height: 18px; }
.btn.sm { height: var(--control-sm); padding: 0 var(--space-3); font: var(--text-small-strong); gap: var(--space-1); }
.btn.sm svg { width: 16px; height: 16px; }
.btn.md { height: var(--control-md); padding: 0 var(--space-4); }
.btn.xl { height: var(--control-xl); padding: 0 var(--space-6); font: var(--text-title); }
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
.fab { position: absolute; left: 50%; bottom: 34px; transform: translateX(-50%); box-shadow: var(--shadow-float); }
.spin { width: 16px; height: 16px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent; opacity: 0.9; flex: none; }
.icon-btn { position: relative; width: var(--control-md); height: var(--control-md); border-radius: var(--radius-full); display: inline-flex; align-items: center; justify-content: center;
  background: var(--surface-2); color: var(--text); flex: none; }
.icon-btn svg { width: 18px; height: 18px; }
.room .icon-btn { background: var(--surface); }
.sheet .icon-btn, .dialog .icon-btn { background: var(--fill-raised); }
.icon-btn.on-poster { background: var(--on-poster-chip); color: var(--on-poster); }
.icon-btn.lg { width: var(--control-xl); height: var(--control-xl); background: var(--surface); }
.icon-btn.sm { width: var(--control-sm); height: var(--control-sm); }
/* avatars 24 / 32 / 40 / 48 / 64 */
.av { border-radius: 50%; flex: none; display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(var(--room-tint), var(--poster)); color: var(--on-poster); font-weight: 600; }
.av.you { background: var(--you); color: var(--on-accent); }
[data-theme=dark] .av:not(.you):not(.add) { background: var(--poster); color: #111113; }
.poster .btn-plain, .poster .btn-secondary { color: var(--on-poster); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.av.add { background: var(--on-poster-chip); }
.av-24 { width: 24px; height: 24px; font-size: 10px; } .av-32 { width: 32px; height: 32px; font-size: 12px; }
.av-40 { width: 40px; height: 40px; font-size: 14px; } .av-48 { width: 48px; height: 48px; font-size: 16px; } .av-64 { width: 64px; height: 64px; font-size: 22px; }
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
.poster .row, .poster .kv { box-shadow: inset 0 -0.5px 0 var(--on-poster-line); }
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
.row { position: relative; display: flex; align-items: center; gap: var(--space-3); min-height: 56px; padding: var(--space-2) 0; box-shadow: inset 0 -0.5px 0 var(--border); width: 100%; }
.row:last-child { box-shadow: none; }
.row.compact { min-height: 44px; }
.row .t { font: var(--text-title); }
.row .m { font: var(--text-small); color: var(--text-muted); }
.row .v { font: var(--text-body); color: var(--text-muted); white-space: nowrap; }
.row .chev { width: 16px; height: 16px; color: var(--text-faint); }
.row.danger .t { color: var(--danger); }
.row.is-selected::before { content: ''; position: absolute; inset: 2px calc(-1 * var(--space-3)); border-radius: var(--radius-sm); background: var(--sidebar-selection); }
.row.is-hover::before { content: ''; position: absolute; inset: 2px calc(-1 * var(--space-3)); border-radius: var(--radius-sm); background: var(--hover); }
.row > * { position: relative; }
.kv { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); padding: var(--space-3) 0; box-shadow: inset 0 -0.5px 0 var(--border); font: var(--text-small); }
.kv:last-child { box-shadow: none; }
.kv > b { font-weight: 600; text-align: right; white-space: nowrap; }
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
.pulse i { display: block; flex: 1; border-radius: 2px; min-width: 1px; }
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
.heat i { display: block; aspect-ratio: 1; border-radius: 2px; }
.h0 { background: var(--heat-0); } .h1 { background: var(--heat-1); } .h2 { background: var(--heat-2); } .h3 { background: var(--heat-3); } .h4 { background: var(--heat-4); }
.squares { display: flex; flex-wrap: wrap; gap: var(--space-0-5); }
.squares i { width: 10px; height: 10px; border-radius: 2px; background: var(--you); }
.squares.them i { background: var(--them); }
.podium { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); align-items: end; text-align: center; }
.podium .e { font-size: 28px; line-height: 36px; } .podium .e.first { font-size: 36px; line-height: 44px; }
.podium i { display: block; border-radius: var(--radius-sm) var(--radius-sm) var(--radius-mark) var(--radius-mark); background: var(--chart-neutral); margin-top: var(--space-1); }
.podium i.first { background: var(--chart-neutral-strong); }
.podium b { display: block; font: var(--text-small); color: var(--text-muted); margin-top: var(--space-1); font-weight: 400; }
/* bars: the one place for material — only over scrolling content */
.nav-ph { position: relative; display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--page-gutter); min-height: 52px; }
.material { background: var(--bar-glass); -webkit-backdrop-filter: var(--glass-filter); backdrop-filter: var(--glass-filter); box-shadow: inset 0 -0.5px 0 var(--border); }
.room .material { background: var(--room-glass); }
.nav-title { flex: 1; min-width: 0; text-align: center; display: flex; flex-direction: column; }
.nav-title b { font: 600 15px/20px var(--font-sans); }
.nav-title span { font: var(--text-caption); color: var(--text-muted); font-weight: 400; }
.sidebar { width: 280px; flex: none; background: var(--surface); box-shadow: inset -0.5px 0 0 var(--border); display: flex; flex-direction: column; padding: var(--space-4) var(--space-3); gap: var(--space-0-5); }
.sb-row { position: relative; display: flex; align-items: center; gap: var(--space-3); min-height: var(--control-md); padding: var(--space-1) var(--space-2); border-radius: var(--radius-xs); font: var(--text-ui); }
.sb-row.person { min-height: 48px; }
.sb-row .m { font: var(--text-small); color: var(--text-muted); }
.sb-row.on { background: var(--sidebar-selection); }
.sb-row .lead { width: 32px; height: 32px; border-radius: 50%; background: var(--surface-2); display: inline-flex; align-items: center; justify-content: center; flex: none; color: var(--text); }
.sb-row.on .lead { background: var(--surface); }
.sb-row .lead svg { width: 18px; height: 18px; }
.sb-row .m.new { color: var(--text); font-weight: 500; }
.sb-h { font: var(--text-caption); color: var(--text-muted); padding: var(--space-4) var(--space-2) var(--space-1); }
.logo-rect { fill: var(--lime-brand); } .logo-up { fill: #111113; } .logo-dn { fill: var(--lime-brand-deep); }
.wordmark { font: 600 16px/24px var(--font-sans); letter-spacing: -0.01em; }
/* overlays */
.scrim { position: absolute; inset: 0; background: var(--scrim); }
.sheet { position: absolute; left: 0; right: 0; bottom: 0; background: var(--surface-raised); border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--space-2) var(--space-4) 34px; display: flex; flex-direction: column; gap: var(--space-4); overscroll-behavior: contain; }
.grabber { align-self: center; width: 36px; height: 5px; border-radius: 3px; background: var(--border-strong); }
.sheet-h { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; min-height: 44px; }
.sheet-h > h2 { text-align: center; font: var(--text-h3); letter-spacing: var(--tracking-h3); }
.dialog { position: absolute; left: 50%; background: var(--surface-raised); border-radius: var(--radius-xl); padding: var(--space-6); box-shadow: var(--shadow-overlay);
  display: flex; flex-direction: column; gap: var(--space-4); }
.dialog.sm { width: 420px; margin-left: -210px; } .dialog.md { width: 560px; margin-left: -280px; }
.menu { position: absolute; background: var(--surface-raised); border-radius: var(--radius-md); padding: var(--space-1); box-shadow: var(--shadow-overlay); min-width: 240px; }
.menu .mi { display: flex; align-items: center; gap: var(--space-3); height: var(--control-lg); padding: 0 var(--space-3); border-radius: var(--radius-sm); font: var(--text-ui); width: 100%; }
.pc .menu .mi { height: var(--control-md); }
.menu .mi.on { background: var(--sidebar-selection); }
.menu .mi.danger { color: var(--danger); }
.menu .mi svg { width: 18px; height: 18px; }
.menu hr { border: 0; height: 0.5px; background: var(--border); margin: var(--space-1) var(--space-2); }
.toast { position: absolute; display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4); border-radius: var(--radius-md);
  background: var(--accent); color: var(--on-accent); box-shadow: var(--shadow-overlay); font: var(--text-small); min-height: 48px; }
.toast .btn { height: var(--control-sm); padding: 0 var(--space-3); background: transparent; color: var(--on-accent); font: var(--text-small-strong); text-decoration: underline; text-underline-offset: 3px; }
/* fields */
.label { font: var(--text-small-strong); }
.hint { font: var(--text-small); color: var(--text-muted); }
.field { display: flex; align-items: center; gap: var(--space-3); height: var(--control-xl); padding: 0 var(--space-4); border-radius: var(--radius-sm); background: var(--surface-2); font: var(--text-body); box-shadow: inset 0 0 0 1px var(--border); }
.sheet .field { background: var(--fill-raised); }
.field.focus { box-shadow: inset 0 0 0 1.5px var(--accent); background: var(--surface); }
.field.error { box-shadow: inset 0 0 0 1.5px var(--danger); }
.field .ph { color: var(--text-muted); }
.field svg { width: 18px; height: 18px; color: var(--text-muted); }
.search { display: flex; align-items: center; gap: var(--space-2); height: var(--control-md); padding: 0 var(--space-3); border-radius: var(--radius-sm); background: var(--surface-2); font: var(--text-body); color: var(--text-muted); }
.search svg { width: 16px; height: 16px; }
.sheet .search { background: var(--fill-raised); }
.pc .search { background: var(--surface); }
.filters { display: flex; gap: var(--space-1); }
.filters .btn { color: var(--text-muted); background: none; }
.filters .btn.on { color: var(--text); background: var(--sidebar-selection); }
.sheet .filters .btn.on { background: var(--fill-raised); }
.otp { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--space-2); }
.otp span { height: 56px; border-radius: var(--radius-sm); background: var(--surface-2); box-shadow: inset 0 0 0 1px var(--border); display: flex; align-items: center; justify-content: center; font: 600 24px/32px var(--font-sans); }
.otp span.focus { background: var(--surface); box-shadow: inset 0 0 0 1.5px var(--accent); }
.otp.error span { box-shadow: inset 0 0 0 1.5px var(--danger); }
.err { font: var(--text-small); color: var(--danger); display: flex; gap: var(--space-2); align-items: center; }
.err svg { width: 16px; height: 16px; }
.switch { position: relative; width: 40px; height: 24px; border-radius: var(--radius-full); background: var(--switch-off); flex: none; }
.switch::before { content: ''; position: absolute; inset: -10px -2px; }
.switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.switch.on { background: var(--switch-on); }
[data-theme=dark] .switch.on::after { background: #111113; }
.switch.on::after { left: 18px; }
.skel { background: var(--surface-2); border-radius: var(--radius-xs); }
.empty-ic { width: 48px; height: 48px; border-radius: 50%; background: var(--surface-2); display: flex; align-items: center; justify-content: center; color: var(--text-muted); flex: none; }
.sheet .empty-ic { background: var(--fill-raised); }
.empty-ic svg { width: 22px; height: 22px; }
.empty-ic.sm { width: 40px; height: 40px; }
.story-seg { display: grid; gap: var(--space-1); }
.story-seg i { height: 3px; border-radius: 2px; background: var(--on-poster-faint); }
.story-seg i.on { background: var(--on-poster); }
.thumb916 { position: relative; aspect-ratio: 9/16; border-radius: var(--radius-sm); background: var(--poster); color: var(--on-poster); padding: var(--space-2); display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
.thumb916 b { font: 600 14px/16px var(--font-sans); letter-spacing: -0.01em; }
.thumb916 small { font: 400 10px/12px var(--font-sans); color: var(--on-poster-muted); }
.kbd { font: var(--text-caption); padding: var(--space-0-5) var(--space-2); border-radius: var(--radius-xs); background: var(--surface-2); color: var(--text-muted); }
.choice { display: flex; align-items: center; gap: var(--space-3); height: 64px; padding: 0 var(--space-4); border-radius: var(--radius-lg); background: var(--surface); color: var(--text); width: 100%; }
.choice.on { box-shadow: inset 0 0 0 2px var(--accent); }
.choice.wrong { box-shadow: inset 0 0 0 2px var(--danger); }
.sw { border-radius: var(--radius-sm); height: 56px; box-shadow: inset 0 0 0 0.5px var(--border); }
.spec { font: var(--text-small); color: var(--text-muted); }
.backdrop { background: var(--story-backdrop); }
.inspector { background: var(--surface); border-radius: var(--radius-lg); padding: var(--card-padding); display: flex; flex-direction: column; gap: var(--space-4); align-self: start; }
/* report card: a small poster with the person's avatar; actions are on view (⋯), long press is only a shortcut */
.mini { position: relative; gap: var(--space-1); }
.mini .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-2); }
.mini .name { font: 600 16px/22px var(--font-sans); letter-spacing: -0.01em; }
.icon-btn.sm.on-poster { width: var(--control-sm); height: var(--control-sm); }
/* live progress: minimised to a capsule (phone dock) or a card (sidebar); opens the details */
.ring { position: relative; flex: none; display: inline-flex; align-items: center; justify-content: center; }
.ring svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.ring .track { stroke: var(--surface-2); } .ring .val { stroke: var(--accent); }
.dock { position: absolute; left: var(--page-gutter); right: var(--page-gutter); bottom: 34px; display: flex; gap: var(--space-2); align-items: center; }
.live { flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--space-3); height: 56px; padding: 0 var(--space-4) 0 var(--space-2); border-radius: var(--radius-full);
  background: var(--surface-raised); color: var(--text); box-shadow: var(--shadow-float); }
.live .chev { width: 16px; height: 16px; color: var(--text-faint); }
.fab-round { width: 56px; height: 56px; border-radius: 50%; background: var(--accent); color: var(--on-accent); box-shadow: var(--shadow-float); display: inline-flex; align-items: center; justify-content: center; flex: none; }
.fab-round svg { width: 22px; height: 22px; }
.sb-live { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-md); background: var(--surface-2); margin: var(--space-2) 0; }
.sb-live .ring .track { stroke: var(--surface); }
/* flags: drawn, because Windows shows letters instead of flag emoji */
.flag { flex: none; border-radius: 50%; box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.12); overflow: hidden; display: inline-block; }
.flag svg { display: block; width: 100%; height: 100%; }
/* stories: every frame can be saved or shared on its own */
.story-actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
.facts { display: grid; grid-template-columns: 1fr 1fr; }
.facts > div { padding: var(--space-3) 0; box-shadow: inset 0 -0.5px 0 var(--on-poster-line); display: flex; flex-direction: column; gap: var(--space-0-5); }
.facts > div:nth-last-child(-n+2) { box-shadow: none; }
.facts b { font: 600 24px/28px var(--font-sans); letter-spacing: -0.02em; }
.facts span { font: var(--text-small); color: var(--on-poster-muted); }
/* share: «Итоги» as one poster tile, then plain rows */
.feature { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4); border-radius: var(--radius-lg); }
.fan { position: relative; width: 88px; height: 112px; flex: none; }
.fan .thumb916 { position: absolute; top: 0; width: 63px; box-shadow: 0 2px 8px rgba(0,0,0,0.16); background: var(--poster); }
.lead-ic { width: 32px; height: 32px; border-radius: 50%; background: var(--surface-2); display: inline-flex; align-items: center; justify-content: center; flex: none; color: var(--text); }
.sheet .lead-ic, .dialog .lead-ic { background: var(--fill-raised); }
.lead-ic svg { width: 18px; height: 18px; }
.big .cmp .num { font: var(--text-figure); letter-spacing: var(--tracking-figure); } .big .bar { height: 12px; }
.row.few .t { color: var(--text-muted); }
.lead-ic.danger { color: var(--danger); background: var(--danger-soft); }
.poster .av:not(.you):not(.add) { background: var(--avatar-on-poster); color: var(--on-them); }
.poster .choice .av:not(.you) { background: linear-gradient(var(--room-tint), var(--poster)); color: var(--on-poster); }
.heat i.none { background: none; }
.row.wrap .m { white-space: normal; overflow: visible; }
/* device keyboard — not product UI, shown so a focused field explains the space below it */
.kb { position: absolute; left: 0; right: 0; bottom: 0; background: #D1D4DA; padding: 8px 4px 34px; display: grid; gap: 8px; }
.kb .r { display: flex; gap: 6px; justify-content: center; }
.kb i { font-style: normal; flex: 1; height: 46px; border-radius: 5px; background: #FFFFFF; box-shadow: 0 1px 0 #898A8D; display: flex; align-items: center; justify-content: center; font: 400 25px/1 var(--font-sans); color: #000; }
.kb.letters i { height: 42px; font-size: 20px; max-width: 32px; }
.kb i.fn { background: #ABB0BA; font-size: 15px; max-width: none; }
.kb i.blank { background: none; box-shadow: none; }
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
