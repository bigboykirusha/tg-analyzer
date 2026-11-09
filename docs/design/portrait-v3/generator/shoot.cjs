const { chromium } = require('playwright')
const fs = require('fs'),
  path = require('path')
const dir = process.argv[2],
  out = process.argv[3],
  only = process.argv[4]
;(async () => {
  fs.mkdirSync(out, { recursive: true })
  const br = await chromium.launch()
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.html') && (!only || only.split(',').some((o) => f.startsWith(o))))
  const page = await br.newPage()
  const errs = []
  for (const f of files) {
    const html = fs.readFileSync(path.join(dir, f), 'utf8')
    const w = +(html.match(/width:(\d+)px;height:(\d+)px/) || [0, 390])[1],
      h = +(html.match(/width:(\d+)px;height:(\d+)px/) || [0, 0, 844])[2]
    await page.setViewportSize({ width: w, height: h })
    await page.goto('file://' + path.join(dir, f))
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.evaluate(() => document.fonts.ready)
    const over = await page.evaluate(() =>
      [...document.querySelectorAll('.app *')]
        .filter((e) => {
          const r = e.getBoundingClientRect()
          return (
            e.scrollWidth > e.clientWidth + 1 &&
            getComputedStyle(e).overflow === 'visible' &&
            !e.classList.contains('trunc') &&
            r.width > 0
          )
        })
        .slice(0, 3)
        .map((e) => e.className + ':' + (e.textContent || '').slice(0, 30)),
    )
    if (over.length) errs.push(f + ' overflow: ' + over.join(' | '))
    await page.screenshot({ path: path.join(out, f.replace('.html', '.png')) })
  }
  console.log(files.length + ' shots')
  if (errs.length) console.log(errs.join('\n'))
  await br.close()
})()
