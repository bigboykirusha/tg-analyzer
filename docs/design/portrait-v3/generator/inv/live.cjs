// Live inventory: signs in to the demo, analyses three chats, then walks every screen at 4 widths × 2 themes.
const { chromium } = require('playwright')
const fs = require('fs'),
  path = require('path')
const BASE = 'http://127.0.0.1:3000'
const OUT = process.argv[2] || path.join(__dirname, 'live.json')
const collectSrc = fs.readFileSync(path.join(__dirname, 'collect.js'), 'utf8')

async function hydrated(page, url) {
  await page.goto(BASE + url)
  await page
    .waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__), null, { timeout: 30000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(600)
}

;(async () => {
  const browser = await chromium.launch()
  // 1. sign in and analyse
  const setup = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await setup.addCookies([
    { name: 'tg-analyzer-theme', value: 'light', url: BASE },
    { name: 'tg-analyzer-locale', value: 'ru', url: BASE },
  ])
  const p = await setup.newPage()
  await hydrated(p, '/login')
  await p.locator('.phone-input').fill('9001234561')
  await p.getByRole('button', { name: 'Получить код' }).click()
  await p.locator('.otp-input').first().click()
  await p.keyboard.type('12345')
  await p.getByRole('button', { name: 'Подтвердить код' }).click()
  await p.waitForURL('**/dashboard', { timeout: 30000 })
  for (const name of ['Катя', 'Мила', 'Weekend plans']) {
    await hydrated(p, '/new')
    const row = p.locator('.chat-row').filter({ hasText: name }).first()
    const btn = row.getByRole('button', { name: 'Разобрать', exact: true })
    if (await btn.count()) {
      await btn.click()
      await p
        .locator('.toast')
        .getByText('Отчёт готов', { exact: true })
        .waitFor({ timeout: 120000 })
        .catch((e) => console.log('wait', name, e.message))
    }
  }
  const state = await setup.storageState()
  await setup.close()

  const pages = [
    '/',
    '/login',
    '/faq',
    '/example',
    '/dashboard',
    '/new',
    '/account',
    '/chat/1001',
    '/chat/-1002004',
    '/does-not-exist',
  ]
  const widths = [360, 390, 820, 1440]
  const all = {}
  const merge = (res, where) => {
    for (const [cat, vals] of Object.entries(res)) {
      const c = (all[cat] ||= {})
      for (const [v, info] of Object.entries(vals)) {
        const t = (c[v] ||= { n: 0, ex: [], where: [] })
        t.n += info.n
        for (const e of info.ex) if (t.ex.length < 4 && !t.ex.includes(e)) t.ex.push(e)
        if (t.where.length < 6 && !t.where.includes(where)) t.where.push(where)
      }
    }
  }
  for (const theme of ['light', 'dark']) {
    for (const w of widths) {
      const ctx = await browser.newContext({
        storageState: state,
        viewport: { width: w, height: w < 900 ? 844 : 900 },
        isMobile: w < 900,
        hasTouch: w < 900,
      })
      await ctx.addCookies([
        { name: 'tg-analyzer-theme', value: theme, url: BASE },
        { name: 'tg-analyzer-locale', value: 'ru', url: BASE },
      ])
      const page = await ctx.newPage()
      for (const url of pages) {
        await hydrated(page, url)
        // scroll through so lazy parts render
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 700) {
            window.scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 60))
          }
          window.scrollTo(0, 0)
        })
        await page.addScriptTag({ content: collectSrc })
        merge(await page.evaluate(() => window.__collect('#__nuxt, #teleports')), `${url}@${w}${theme[0]}`)
        if (url === '/chat/1001') {
          for (const [label, close] of [
            ['Поделиться', true],
            ['Смотреть итоги', true],
          ]) {
            const b = page.getByRole('button', { name: label }).first()
            if ((await b.count()) && (await b.isVisible().catch(() => false))) {
              await b.click().catch(() => {})
              await page.waitForTimeout(900)
              merge(
                await page.evaluate(() => window.__collect('#__nuxt, #teleports')),
                `${url}+${label}@${w}${theme[0]}`,
              )
              if (close) {
                await page.keyboard.press('Escape')
                await page.waitForTimeout(400)
              }
            }
          }
        }
      }
      await ctx.close()
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(all))
  for (const [cat, vals] of Object.entries(all)) console.log(cat.padEnd(22), Object.keys(vals).length)
  await browser.close()
})()
