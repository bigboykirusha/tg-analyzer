// Summarises the files written by measure.mjs and checks them against the thresholds in README.md.
//   node apps/web/tests/visual/summarize.mjs <out-dir> [--check]
// With --check the exit code is 1 when a threshold is exceeded.
import { readFileSync } from 'node:fs'

const dirArg = process.argv[2] || '.'
const check = process.argv.includes('--check')

// Thresholds (docs/design-system.md §1, POLISH.md §6).
const LIMITS = { buttonLooks: 3, buttonSizes: 2, textStylesPerScreen: 8, radii: 4 }

// Rows (list rows, sidebar links) and data chips are tappable but are not buttons.
const NOT_BUTTONS = /(^|\.)(list-row|router-link-(exact-)?active|menu-item|chip)(\.|$)/
const uniq = (arr) => [...new Set(arr)]
const count = (arr) => arr.reduce((acc, key) => ((acc[key] = (acc[key] || 0) + 1), acc), {})
// "h44 r999 bg:rgb() bd:0px rgb() fs14px/500 c:rgb()" → parts.
const part = (sig, re) => sig.match(re)?.[1] ?? ''
const heightOf = (sig) => part(sig, /^h(\d+)/)
const radiusOf = (sig) => part(sig, / r(\S+) /)
const bgOf = (sig) => part(sig, /bg:(rgba?\([^)]*\)|transparent)/)
const borderOf = (sig) => (sig.includes('bd:0px') ? 'no-border' : 'border')
const colorOf = (sig) => part(sig, / c:(rgba?\([^)]*\))/)
/** A look is what the eye tells apart: fill, outline, text colour, shape (circle / pill / other). */
const lookOf = (b) => {
  const r = radiusOf(b.sig)
  const shape = r.split('/').every((x) => +x >= 100) ? 'round' : 'other-r' + r
  return `${bgOf(b.sig)} | ${borderOf(b.sig)} | ${colorOf(b.sig)} | ${shape}`
}

let failed = false
const fail = (message) => {
  failed = true
  console.log(`  ✗ ${message}`)
}

for (const mode of ['desktop', 'mobile']) {
  let d
  try {
    d = JSON.parse(readFileSync(`${dirArg}/audit-${mode}.json`, 'utf8'))
  } catch {
    continue
  }
  const S = Object.fromEntries(
    Object.entries(d.screens).map(([k, v]) => [
      k,
      { ...v, buttons: v.buttons.filter((b) => !NOT_BUTTONS.test(b.cls)) },
    ]),
  )
  const all = (k) => Object.values(S).flatMap((s) => s[k])
  console.log(`\n===== ${mode}`)

  const buttons = all('buttons')
  const looks = uniq(buttons.map(lookOf))
  const sizes = uniq(buttons.map((b) => heightOf(b.sig))).sort((a, b) => a - b)
  console.log(`button looks (fill | outline | text | shape): ${looks.length}; heights: ${sizes.join(', ')}`)
  const byClass = {}
  for (const b of buttons) (byClass[b.cls.split('.').slice(0, 2).join('.')] ||= new Set()).add(`h${heightOf(b.sig)}`)
  console.log(
    `button classes: ${Object.keys(byClass).length}\n` +
      Object.entries(byClass)
        .map(([k, v]) => `  ${k}: ${[...v].join(', ')}`)
        .join('\n'),
  )
  console.log(`button full signatures: ${uniq(buttons.map((b) => b.sig)).length}`)

  const surf = all('surfaces')
  console.log(`surface shapes (radius + padding): ${uniq(surf.map((s) => s.sig.replace(/ bg:.*/, ''))).length}`)

  const text = all('text')
  const sizesPx = uniq(text.map((t) => t.sig.split('/')[0])).sort((a, b) => parseFloat(a) - parseFloat(b))
  console.log(
    `text styles (size/line/weight): ${uniq(text.map((t) => t.sig)).length}; font sizes: ${sizesPx.join(' ')}`,
  )
  const radii = count(all('radii'))
  console.log(
    `radii (${Object.keys(radii).length}): ${Object.entries(radii)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}×${v}`)
      .join(' ')}`,
  )

  console.log('per screen: button looks / button heights / surface shapes / text styles')
  let worstText = 0
  for (const [name, s] of Object.entries(S)) {
    const lk = uniq(s.buttons.map(lookOf)).length
    const hs = uniq(s.buttons.map((b) => heightOf(b.sig))).length
    const sf = uniq(s.surfaces.map((x) => x.sig.replace(/ bg:.*/, ''))).length
    const ts = uniq(s.text.map((t) => t.sig)).length
    worstText = Math.max(worstText, ts)
    console.log(`  ${name}: ${lk} / ${hs} / ${sf} / ${ts}`)
    if (ts > LIMITS.textStylesPerScreen) fail(`${name}: ${ts} text styles (limit ${LIMITS.textStylesPerScreen})`)
  }
  if (looks.length > LIMITS.buttonLooks) fail(`${looks.length} button looks (limit ${LIMITS.buttonLooks})`)
  if (sizes.length > LIMITS.buttonSizes) fail(`${sizes.length} button heights (limit ${LIMITS.buttonSizes})`)
  if (Object.keys(radii).length > LIMITS.radii) fail(`${Object.keys(radii).length} radii (limit ${LIMITS.radii})`)
  if (mode === 'mobile')
    console.log(`report height ${d.blocks.height}, words ${d.blocks.words}; group height ${d.gblocks.height}`)
}

if (check && failed) process.exit(1)
