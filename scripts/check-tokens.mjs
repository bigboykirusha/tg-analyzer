// Lists CSS custom properties that are read (var(--x)) but declared nowhere in the web app.
// Usage: node scripts/check-tokens.mjs — exits 1 when something is missing.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// fileURLToPath, not URL.pathname: on Windows the pathname is «/L:/…» and the walk fails.
const root = fileURLToPath(new URL('../apps/web/app/', import.meta.url))
const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.(vue|css|ts)$/.test(name)) files.push(path)
  }
}
walk(root)

const declared = new Set()
const used = new Map()
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const [, name] of text.matchAll(/(--[\w-]+)\s*:/g)) declared.add(name)
  // Style bindings in templates and scripts declare custom properties too: { '--x': … }.
  for (const [, name] of text.matchAll(/['"](--[\w-]+)['"]\s*[:,]/g)) declared.add(name)
  for (const [, name, fallback] of text.matchAll(/var\((--[\w-]+)\s*(,)?/g)) {
    if (fallback) continue // var(--x, fallback) is optional by design
    if (!used.has(name)) used.set(name, new Set())
    used.get(name).add(file.replace(root, ''))
  }
}
const missing = [...used].filter(([name]) => !declared.has(name))
for (const [name, where] of missing) console.log(`${name}  ←  ${[...where].slice(0, 4).join(', ')}`)
console.log(`${missing.length} undeclared custom properties`)
process.exit(missing.length ? 1 : 0)
