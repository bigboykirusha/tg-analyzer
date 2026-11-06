// Builds self-contained prototype pages: every stylesheet, font and script from src/ is inlined,
// so a page opens straight from disk (file://) with nothing else next to it.
// Usage: node docs/prototypes/build.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(here, 'src')

/** CSS with every url(...) to a local font turned into a data URI. */
function inlineCss(file) {
  const css = fs.readFileSync(file, 'utf8')
  return css.replace(/url\((?!data:)['"]?([^'")]+)['"]?\)/g, (match, ref) => {
    const target = path.resolve(path.dirname(file), ref)
    if (!fs.existsSync(target)) return match
    const type = target.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream'
    return `url(data:${type};base64,${fs.readFileSync(target).toString('base64')})`
  })
}

for (const name of fs.readdirSync(src).filter((file) => file.endsWith('.html'))) {
  let html = fs.readFileSync(path.join(src, name), 'utf8')
  html = html.replace(
    /<link rel="stylesheet" href="([^"]+)" \/>/g,
    (_, href) => `<style>\n${inlineCss(path.resolve(src, href))}\n</style>`,
  )
  html = html.replace(
    /<script src="([^"]+)"><\/script>/g,
    (_, href) => `<script>\n${fs.readFileSync(path.resolve(src, href), 'utf8')}\n</script>`,
  )
  fs.writeFileSync(path.join(here, name), html)
  console.log(name, `${Math.round(html.length / 1024)} KB`)
}
