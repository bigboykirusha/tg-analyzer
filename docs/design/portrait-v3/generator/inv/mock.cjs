// Mockup inventory: every preview board, same collector.
const { chromium } = require('playwright')
const fs = require('fs'),
  path = require('path')
const dir = process.argv[2],
  OUT = process.argv[3]
const collectSrc = fs.readFileSync(path.join(__dirname, 'collect.js'), 'utf8')
;(async () => {
  const b = await chromium.launch()
  const page = await b.newPage()
  const all = {}
  for (const f of fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.html') && !f.startsWith('sys'))
    .sort()) {
    const html = fs.readFileSync(path.join(dir, f), 'utf8')
    const m = html.match(/width:(\d+)px;height:(\d+)px/)
    await page.setViewportSize({ width: +m[1], height: +m[2] })
    await page.goto('file://' + path.join(dir, f))
    await page.evaluate(() => document.fonts.ready)
    await page.addScriptTag({ content: collectSrc })
    const res = await page.evaluate(() => window.__collect('.app'))
    for (const [cat, vals] of Object.entries(res)) {
      const c = (all[cat] ||= {})
      for (const [v, info] of Object.entries(vals)) {
        const t = (c[v] ||= { n: 0, ex: [], where: [] })
        t.n += info.n
        for (const e of info.ex) if (t.ex.length < 4 && !t.ex.includes(e)) t.ex.push(e)
        if (t.where.length < 6 && !t.where.includes(f)) t.where.push(f.replace('.html', ''))
      }
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(all))
  for (const [cat, vals] of Object.entries(all)) console.log(cat.padEnd(22), Object.keys(vals).length)
  await b.close()
})()
