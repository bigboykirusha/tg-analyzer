// Checks the text/background pairs of the design tokens by APCA (APCA-W3 0.0.98G-4g), the contrast the owner chose
// over WCAG 2 on 17.11.2026: it weighs the polarity, so a light theme is not held stricter than reading needs and a
// dark one is not let off. Usage: node scripts/check-contrast.mjs — prints the table, exits 1 below a target.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const css = readFileSync(fileURLToPath(new URL('../apps/web/app/assets/styles/tokens.css', import.meta.url)), 'utf8')

/** The declarations of the first rule that starts with `head`. */
function block(head) {
  const start = css.indexOf(head)
  if (start === -1) throw new Error(`tokens.css: no rule «${head}»`)
  return Object.fromEntries(
    [...css.slice(start, css.indexOf('\n}', start)).matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [
      m[1],
      m[2].trim(),
    ]),
  )
}
const primitives = block(':root {\n  /* Neutrals, light')
const light = block(':root {\n  color-scheme: light;')
const dark = { ...light, ...block(":root[data-theme='dark'] {") }

function resolve(name, theme) {
  let value = theme[name] ?? primitives[name]
  for (let hop = 0; value?.startsWith('var(') && hop < 10; hop++) {
    const ref = value.match(/var\((--[\w-]+)/)[1]
    value = theme[ref] ?? primitives[ref]
  }
  if (!value) throw new Error(`tokens.css: ${name} does not resolve`)
  return value
}

function rgba(value) {
  if (value.startsWith('#')) return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)).concat(1)
  const parts = value
    .match(/rgba?\(([^)]+)\)/)[1]
    .split(',')
    .map(Number)
  return [parts[0], parts[1], parts[2], parts[3] ?? 1]
}
const over = (fg, bg) => [0, 1, 2].map((k) => Math.round(fg[k] * fg[3] + bg[k] * (1 - fg[3]))).concat(1)

function apca(text, background) {
  const luminance = ([r, g, b]) =>
    0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.072175 * (b / 255) ** 2.4
  const clamp = (y) => (y < 0.022 ? y + (0.022 - y) ** 1.414 : y)
  const yt = clamp(luminance(text))
  const yb = clamp(luminance(background))
  if (Math.abs(yb - yt) < 0.0005) return 0
  if (yb > yt) {
    const s = (yb ** 0.56 - yt ** 0.57) * 1.14
    return s < 0.1 ? 0 : (s - 0.027) * 100
  }
  const s = (yb ** 0.65 - yt ** 0.62) * 1.14
  return s > -0.1 ? 0 : -(s + 0.027) * 100
}

/**
 * Targets (APCA Bronze, by role): body and the primary button 75; quiet text, labels, danger, the other side's name
 * and the quiet line on a poster 60; glyphs (chevrons) 30.
 */
const PAIRS = [
  ['--text', '--bg', 75],
  ['--text', '--surface', 75],
  ['--text-muted', '--bg', 60],
  ['--text-muted', '--surface', 60],
  ['--text-muted', '--surface-raised', 60],
  ['--text-muted', '--fill-raised', 60],
  ['--text', '--selection', 75],
  ['--text-muted', '--selection', 60],
  ['--text-faint', '--surface', 30],
  ['--text-faint', '--surface-raised', 30],
  ['--on-accent', '--accent', 75],
  ['--danger', '--surface', 60],
  ['--them-ink', '--surface', 60],
]
const HUES = ['yellow', 'orange', 'violet', 'green', 'teal', 'blue', 'pink']

const rows = []
for (const [themeName, theme] of [
  ['light', light],
  ['dark', dark],
]) {
  for (const [text, background, target] of PAIRS) {
    let bg = rgba(resolve(background, theme))
    if (bg[3] < 1) bg = over(bg, rgba(resolve('--bg', theme)))
    rows.push([themeName, `${text} on ${background}`, apca(over(rgba(resolve(text, theme)), bg), bg), target])
  }
  // One poster in both themes: ink and the quiet line on each person's poster colour.
  for (const hue of HUES) {
    const poster = rgba(primitives[`--hue-${hue}-poster`])
    rows.push([themeName, `--on-poster on ${hue}`, apca(rgba(resolve('--on-poster', theme)), poster), 60])
    rows.push([
      themeName,
      `--on-poster-muted on ${hue}`,
      apca(over(rgba(resolve('--on-poster-muted', theme)), poster), poster),
      60,
    ])
  }
}

let failed = 0
for (const [themeName, pair, lc, target] of rows) {
  const low = Math.abs(lc) < target
  if (low) failed++
  console.log(
    `${low ? '✗' : ' '} ${themeName.padEnd(5)} ${pair.padEnd(36)} Lc ${Math.abs(lc).toFixed(1).padStart(5)} / ${target}`,
  )
}
console.log(failed ? `${failed} pairs below their APCA target` : `${rows.length} pairs meet their APCA targets`)
process.exit(failed ? 1 : 0)
