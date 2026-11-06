// Drawings for report-v3-review.html; helpers (rnd, $$, boot) come from report-v2.js.
/* global rnd, $$, boot */
const svgNS = 'http://www.w3.org/2000/svg'
const el = (name, attrs) => {
  const node = document.createElementNS(svgNS, name)
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v))
  return node
}

// Pulse: n columns, you up, them down.
$$('[data-pulse]').forEach((svg) => {
  const n = Number(svg.dataset.pulse)
  const [, , w, h] = svg.getAttribute('viewBox').split(' ').map(Number)
  const step = w / n
  const bar = svg.classList.contains('pulse-svg--thin') ? 1.6 : Math.max(4, step * 0.55)
  const mid = h / 2
  svg.append(el('line', { x1: 0, x2: w, y1: mid, y2: mid }))
  for (let i = 0; i < n; i++) {
    const base = 0.45 + 0.4 * Math.abs(Math.sin(i * 0.5)) + rnd() * 0.15
    const a = Math.min(1, base) * (mid - 3)
    const b = Math.min(1, base * (0.8 + rnd() * 0.4)) * (mid - 3)
    const x = i * step + (step - bar) / 2
    svg.append(el('rect', { class: 'you', x, y: mid - a, width: bar, height: a - 1, rx: Math.min(2, bar / 2) }))
    svg.append(el('rect', { class: 'them', x, y: mid + 1, width: bar, height: b, rx: Math.min(2, bar / 2) }))
  }
})

// Monthly bars with the peak in lime and its value on top.
$$('[data-months]').forEach((svg) => {
  const names = svg.dataset.months.split(',')
  const values = svg.dataset.values.split(',').map(Number)
  const [, , w, h] = svg.getAttribute('viewBox').split(' ').map(Number)
  const max = Math.max(...values)
  const gap = 8
  const bw = (w - gap * (values.length - 1)) / values.length
  const top = 18
  const bottom = h - 18
  values.forEach((v, i) => {
    const x = i * (bw + gap)
    const bh = ((bottom - top) * v) / max
    const peak = v === max
    svg.append(el('rect', { x, y: bottom - bh, width: bw, height: bh, rx: 4, class: peak ? 'peak' : '' }))
    const label = el('text', { x: x + bw / 2, y: h - 2, 'text-anchor': 'middle' })
    label.textContent = names[i]
    svg.append(label)
    if (peak) {
      const value = el('text', { x: x + bw / 2, y: bottom - bh - 6, 'text-anchor': 'middle', class: 'val' })
      value.textContent = v
      svg.append(value)
    }
  })
})

// Compact area line.
$$('.area-svg').forEach((svg) => {
  const [, , w, h] = svg.getAttribute('viewBox').split(' ').map(Number)
  const vals = [
    198, 186, 272, 128, 113, 165, 150, 168, 257, 245, 151, 150, 155, 128, 4, 106, 121, 163, 171, 257, 245, 151, 150,
    155, 129, 210, 132, 160, 248, 212,
  ]
  const max = 300
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, h - (v / max) * (h - 4)])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
  svg.append(el('path', { class: 'fill', d: `${d}L${w},${h}L0,${h}Z` }))
  svg.append(el('path', { class: 'stroke', d }))
})

// Month calendars.
const heat = () => {
  const r = rnd()
  return r < 0.12 ? '' : r < 0.35 ? 'h1' : r < 0.65 ? 'h2' : r < 0.88 ? 'h3' : 'h4'
}
const MONTHS = ['март', 'апр.', 'май', 'июнь', 'июль', 'авг.', 'сент.']
$$('[data-cal]').forEach((box) => {
  const count = Number(box.dataset.cal)
  MONTHS.slice(-count).forEach((name, m) => {
    const month = document.createElement('div')
    month.className = 'month'
    const offset = (m * 3) % 7
    const days = [30, 31][m % 2]
    let cells = ''
    for (let i = 0; i < offset; i++) cells += '<i class="e"></i>'
    for (let d = 0; d < days; d++) cells += `<i class="${heat()}"></i>`
    month.innerHTML = `<span class="month__name">${name}</span><div class="month__days">${cells}</div>`
    box.append(month)
  })
})
$$('[data-weeks]').forEach((box) => {
  const weeks = Number(box.dataset.weeks)
  box.style.gridTemplateColumns = `repeat(${weeks}, minmax(0, 1fr))`
  let cells = ''
  for (let i = 0; i < weeks * 7; i++) cells += `<i class="${heat()}"></i>`
  box.innerHTML = cells
})

// Emoji.
const EMO = [
  ['😂', 118, 327],
  ['☀️', 134, 110],
  ['❤️', 0, 214],
  ['😴', 0, 124],
  ['👍', 123, 0],
  ['😅', 0, 87],
]
const mini = (a, b) =>
  `<div class="mini">${a ? `<b style="flex-grow:${a}"></b>` : ''}${b ? `<b class="t" style="flex-grow:${b}"></b>` : ''}</div>`
const num = (v) => (v ? v : '—')
$$('[data-emo]').forEach((box) => {
  box.innerHTML = EMO.map(
    ([e, a, b]) =>
      `<div class="emo-tile"><span class="e">${e}</span>${mini(a, b)}<span class="n num"><b>${num(a)}</b> · ${num(b)}</span></div>`,
  ).join('')
})
$$('[data-emo-rows]').forEach((box) => {
  box.innerHTML = EMO.map(
    ([e, a, b]) =>
      `<div class="emo-row"><span class="e">${e}</span><div class="line"><span>${num(a)}</span><div class="split">${a ? `<b style="flex-grow:${a}"></b>` : ''}${b ? `<b class="t" style="flex-grow:${b}"></b>` : ''}</div><span>${num(b)}</span></div></div>`,
  ).join('')
})

// Stickers.
$$('[data-stk]').forEach((box) => {
  const items = box.dataset.stk.split(',')
  const counts = box.dataset.n.split(',')
  const who = box.dataset.who?.split(',')
  box.innerHTML = items
    .map(
      (e, i) =>
        `<div>${who ? `<span class="avatar who ${who[i] === 'я' ? 'avatar--you' : ''}">${who[i].toUpperCase()}</span>` : ''}<span class="e">${e}</span><small class="num">${counts[i]}</small></div>`,
    )
    .join('')
})

// Word wall of whole words.
$$('[data-wall]').forEach((box) => {
  const word = box.dataset.wall
  const perLine = box.closest('.frame--m') ? 3 : 6
  const line = (cls, hl) =>
    `<div class="${cls}">${Array.from({ length: perLine }, (_, i) => `<span class="${i === hl ? 'hl' : ''}">${word}</span>`).join('')}</div>`
  box.innerHTML = line('', -1) + line('mid', 1) + line('', -1)
})

boot()
