// Summarises the files written by measure.mjs and checks them against the thresholds in README.md.
//   node apps/web/tests/visual/summarize.mjs <out-dir> [--check]
// With --check the exit code is 1 when a threshold is exceeded.
import { readFileSync } from 'node:fs'

const dirArg = process.argv[2] || '.'
const check = process.argv.includes('--check')

// Thresholds (docs/design-system.md §1, POLISH.md §6).
// Four looks: ink, neutral fill, round neutral icon, and the plain glyph (bars, sheets, a card's «⋯»), 11.11.
// Five radii: mark 8 (chart bars), well 12 (controls), card 16, sheet 24, pill.
const LIMITS = { buttonLooks: 5, buttonSizes: 2, textStylesPerScreen: 8, textStylesTotal: 8, radii: 5 }

// Rows (list rows, sidebar links), data chips and a person's circle with their name («Разобрать ещё») are tappable
// but are not buttons: they are objects of a list.
const NOT_BUTTONS = /(^|\.)(list-row|router-link-(exact-)?active|menu-item|chip|more__person)(\.|$)/
const uniq = (arr) => [...new Set(arr)]
const count = (arr) => arr.reduce((acc, key) => ((acc[key] = (acc[key] || 0) + 1), acc), {})
// "h44 r999 bg:rgb() bd:0px rgb() fs14px/500 c:rgb()" → parts.
const part = (sig, re) => sig.match(re)?.[1] ?? ''
const heightOf = (sig) => part(sig, /^h(\d+)/)
const radiusOf = (sig) => part(sig, / r(\S+) /)
const bgOf = (sig) => part(sig, /bg:(rgba?\([^)]*\)|transparent)/)
const borderOf = (sig) => (sig.includes('bd:0px') ? 'no-border' : 'border')
const colorOf = (sig) => part(sig, / c:(rgba?\([^)]*\))/)
/**
 * A look is what the eye tells apart: fill, outline, text colour, shape. The system has two shapes by role —
 * the 12 px rounded rectangle of a button and the round of an icon, chip or filter — and they are one shape
 * family here; any other corner is a look of its own.
 */
const lookOf = (b) => {
  const r = radiusOf(b.sig)
  const shape = r.split('/').every((x) => +x >= 100 || +x === 12) ? 'system' : 'other-r' + r
  return `${bgOf(b.sig)} | ${borderOf(b.sig)} | ${colorOf(b.sig)} | ${shape}`
}

/**
 * The button kind by class family. After the reduction there are three (primary, secondary, icon) and the
 * segmented control; the poster/sheet inversions are the same kind with other token values. The old variant
 * names fold into the family they alias.
 */
const kindOf = (b) => {
  const c = b.cls
  if (/btn--(primary|poster)(?![\w-])/.test(c)) return 'primary'
  if (/btn--(secondary|tinted|plain|poster-soft|danger)(?![\w-])/.test(c)) return 'secondary'
  if (/icon-btn/.test(c)) return 'icon'
  if (/filters__item|segmented__item|tabs__item|select__addon/.test(c)) return 'segmented'
  return `other(${c})`
}
// A top-only or bottom-only radius is the same radius.
const radiusFamily = (r) => String(Math.max(...r.split('/').map(Number)))
const EMOJI_ONLY = /^[\p{Extended_Pictographic}\p{Emoji_Component}\s]+$/u

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
      {
        ...v,
        buttons: v.buttons.filter((b) => !NOT_BUTTONS.test(b.cls)),
        // Emoji are pictures, not a text style.
        text: v.text.filter((t) => !EMOJI_ONLY.test(t.sample)),
        radii: v.radii.filter((r) => r !== '0').map(radiusFamily),
      },
    ]),
  )
  const all = (k) => Object.values(S).flatMap((s) => s[k])
  console.log(`\n===== ${mode}`)

  const buttons = all('buttons')
  const looks = uniq(buttons.map(lookOf))
  const sizes = uniq(buttons.map((b) => heightOf(b.sig))).sort((a, b) => a - b)
  console.log(
    `button looks, visual (fill | outline | text | shape; poster and sheet inversions count): ${looks.length}; heights: ${sizes.join(', ')}`,
  )
  const kinds = uniq(buttons.map(kindOf))
  console.log(`button kinds by class family (information only, not checked): ${kinds.length} (${kinds.join(', ')})`)
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

  console.log('per screen: button kinds / button heights / surface shapes / text styles')
  let worstText = 0
  for (const [name, s] of Object.entries(S)) {
    const lk = uniq(s.buttons.map(kindOf)).length
    const hs = uniq(s.buttons.map((b) => heightOf(b.sig))).length
    const sf = uniq(s.surfaces.map((x) => x.sig.replace(/ bg:.*/, ''))).length
    const ts = uniq(s.text.map((t) => t.sig)).length
    worstText = Math.max(worstText, ts)
    console.log(`  ${name}: ${lk} / ${hs} / ${sf} / ${ts}`)
    if (ts > LIMITS.textStylesPerScreen) fail(`${name}: ${ts} text styles (limit ${LIMITS.textStylesPerScreen})`)
  }
  // The limit is on what the eye tells apart (fill, outline, text colour, shape), not on class names.
  if (looks.length > LIMITS.buttonLooks) {
    fail(`${looks.length} visual button looks (limit ${LIMITS.buttonLooks})`)
    for (const look of looks) console.log(`      ${look}`)
  }
  // Text styles over the whole system, not per screen: one scale for every page.
  const textStyles = uniq(text.map((t) => t.sig))
  if (textStyles.length > LIMITS.textStylesTotal) {
    fail(
      `${textStyles.length} text styles across the system (limit ${LIMITS.textStylesTotal}): ${textStyles.join(', ')}`,
    )
  }
  if (sizes.length > LIMITS.buttonSizes) fail(`${sizes.length} button heights (limit ${LIMITS.buttonSizes})`)
  if (Object.keys(radii).length > LIMITS.radii) fail(`${Object.keys(radii).length} radii (limit ${LIMITS.radii})`)
  if (mode === 'mobile')
    console.log(`report height ${d.blocks.height}, words ${d.blocks.words}; group height ${d.gblocks.height}`)
}

if (check && failed) process.exit(1)
