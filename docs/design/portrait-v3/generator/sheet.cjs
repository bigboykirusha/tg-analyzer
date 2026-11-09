const { chromium } = require('playwright')
const fs = require('fs'),
  path = require('path')
const dir = process.argv[2],
  prefix = process.argv[3],
  out = process.argv[4],
  cols = +(process.argv[5] || 7),
  w = +(process.argv[6] || 260)
;(async () => {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.png'))
    .sort()
  const html =
    `<body style="margin:0;background:#888;font:12px sans-serif"><div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:10px;padding:10px">` +
    files
      .map(
        (f) =>
          `<div><div style="color:#fff">${f}</div><img style="width:${w}px;display:block" src="file://${path.join(dir, f)}"></div>`,
      )
      .join('') +
    '</div></body>'
  const tmp = path.join(require('os').tmpdir(), 'portrait-sheet.html')
  fs.writeFileSync(tmp, html)
  const br = await chromium.launch()
  const p = await br.newPage({ viewport: { width: cols * (w + 10) + 10, height: 400 } })
  await p.goto('file://' + tmp)
  await p.waitForTimeout(500)
  await p.screenshot({ path: out, fullPage: true })
  await br.close()
})()
