// Screenshots of the whole user path in 4 modes (1440×900 / 390×844 × light / dark), against a stack in
// TELEGRAM_MODE=fake. From apps/web: `pnpm shots <baseUrl> <outDir> [mode]` (mode: mobile-light, desktop-dark…).
// Writes <outDir>/<mode>/NN-screen.png and notes.txt with the report height and word count.
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'

const pw = await import(pathToFileURL(resolve(process.cwd(), 'node_modules/@playwright/test/index.mjs')).href)
const { chromium, devices } = pw
const BASE = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '')
const OUT = process.argv[3] || 'shots'
const only = process.argv[4]
// An iPhone context in Chromium: everything of the device except its browser type.
const phone = { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }
delete phone.defaultBrowserType
const modes = [
  { name: 'desktop-light', theme: 'light', ctx: { viewport: { width: 1440, height: 900 } } },
  { name: 'desktop-dark', theme: 'dark', ctx: { viewport: { width: 1440, height: 900 } } },
  { name: 'mobile-light', theme: 'light', ctx: phone },
  { name: 'mobile-dark', theme: 'dark', ctx: phone },
]
const notes = []
const log = (m, s) => {
  notes.push(`[${m}] ${s}`)
  console.log(`[${m}] ${s}`)
}

for (const mode of modes) {
  if (only && mode.name !== only) continue
  const dir = `${OUT}/${mode.name}`
  await mkdir(dir, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({
    ...mode.ctx,
    colorScheme: mode.theme,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
  })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE }).catch(() => {})
  await context.addCookies([
    { name: 'tg-analyzer-theme', value: mode.theme, url: BASE },
    { name: 'tg-analyzer-locale', value: 'ru', url: BASE },
  ])
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message.slice(0, 160)))
  const ready = async () => {
    await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__), null, { timeout: 60000 })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(800)
  }
  const shot = (name, fullPage = true) =>
    page
      .screenshot({ path: `${dir}/${name}.png`, fullPage })
      .catch((e) => log(mode.name, `shot ${name} failed: ${e.message}`))
  const step = async (name, fn) => {
    try {
      await fn()
    } catch (e) {
      log(mode.name, `STEP ${name} failed: ${String(e.message).split('\n')[0]}`)
      await shot(`fail-${name}`, false)
    }
  }
  const hscroll = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  let token = null

  await step('public', async () => {
    for (const [path, name] of [
      ['/', '01-landing'],
      ['/example', '02-example'],
      ['/nope', '03-404'],
      ['/privacy', '04-privacy'],
    ]) {
      await page.goto(BASE + path)
      await ready()
      await shot(name)
      const h = await hscroll()
      if (h > 0) log(mode.name, `${path} horizontal scroll ${h}px`)
    }
  })
  await step('login', async () => {
    await page.goto(BASE + '/login')
    await ready()
    await shot('05-login', false)
    // A made-up number sent to a live API would reach a stranger's Telegram: only a fake-mode API may be used.
    const mode = (await fetch(`${BASE}/api/v1/notifications/unread`)).headers.get('x-telegram-mode')
    if (mode !== 'fake') throw new Error('The API is not in TELEGRAM_MODE=fake: refusing to sign in.')
    const number = `900${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`.replace(/9$/, '1')
    await page.locator('.phone-input').fill(number)
    await page.getByRole('button', { name: 'Получить код' }).click()
    await page.locator('.otp-input').first().waitFor()
    await shot('06-login-code', false)
    await page.locator('.otp-input').first().click()
    await page.keyboard.type('12345')
    const enter = page.getByRole('button', { name: 'Войти', exact: true })
    if (await enter.isEnabled().catch(() => false)) await enter.click().catch(() => {})
    await page.waitForURL('**/dashboard', { timeout: 30000 })
    await ready()
    await shot('07-home-first')
  })
  await step('new', async () => {
    await page.goto(BASE + '/new')
    await ready()
    await shot('08-new')
  })
  await step('analyse', async () => {
    for (const [title, id] of [
      ['Мила', '1011'],
      ['Продуктовая команда', '-1002001'],
      ['Катя', '1006'],
    ]) {
      await page.goto(BASE + '/new')
      await ready()
      const row = page.locator('.chat-row').filter({ hasText: title }).first()
      const start = row.getByRole('button', { name: /^Разобрать/ })
      if (await start.count()) {
        await start.first().click()
        await page
          .waitForFunction(
            (cid) => location.pathname.endsWith(`/chat/${cid}`) || document.querySelector('.toast'),
            id,
            { timeout: 90000 },
          )
          .catch(() => {})
        await page.waitForTimeout(1500)
      }
    }
    await page.goto(BASE + '/dashboard')
    await ready()
    await shot('09-home')
  })
  await step('report', async () => {
    await page.goto(BASE + '/chat/1011')
    await ready()
    await page.waitForTimeout(800)
    await shot('10-report-top', false)
    await shot('11-report-full')
    const h = await hscroll()
    if (h > 0) log(mode.name, `report horizontal scroll ${h}px`)
    log(
      mode.name,
      `report height ${await page.evaluate(() => document.documentElement.scrollHeight)}px, words ${await page.evaluate(() => document.querySelector('main')?.innerText.split(/\s+/).length)}`,
    )
    await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 1.6)))
    await page.waitForTimeout(500)
    await shot('12-report-scrolled', false)
  })
  await step('small-report', async () => {
    await page.goto(BASE + '/chat/1006')
    await ready()
    await shot('13-report-small')
  })
  await step('group', async () => {
    await page.goto(BASE + '/chat/-1002001')
    await ready()
    await page.waitForTimeout(800)
    await shot('14-group-top', false)
    await shot('15-group-full')
  })
  await step('share', async () => {
    await page.goto(BASE + '/chat/1011')
    await ready()
    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')].filter(
        (b) => (b.getAttribute('aria-label') || b.textContent || '').trim() === 'Поделиться',
      )
      const visible = buttons.find((b) => b.getBoundingClientRect().width > 0)
      visible?.click()
    })
    await page.getByRole('dialog').waitFor({ timeout: 10000 })
    await page.waitForTimeout(600)
    await shot('16-share', false)
    const link = page.getByRole('dialog').getByText('Ссылка на отчёт').first()
    await link.evaluate((el) => (el.closest('button, a, [role=button]') || el).click())
    await page.waitForTimeout(600)
    await shot('17-share-link', false)
    const response = page.waitForResponse((r) => /\/links/.test(r.url()) && r.request().method() === 'POST', {
      timeout: 15000,
    })
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Скопировать|Создать|Поделиться ссылкой/ })
      .first()
      .click()
    token = (await (await response).json()).token
    await page.waitForTimeout(800)
    await shot('18-share-link-done', false)
    await page.keyboard.press('Escape')
  })
  await step('stories', async () => {
    await page.goto(BASE + '/chat/1011')
    await ready()
    const watch = page.getByRole('button', { name: 'Смотреть итоги' }).first()
    await watch.waitFor({ timeout: 30000 })
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('button')].some((b) => /Смотреть итоги/.test(b.textContent || '') && !b.disabled),
      null,
      { timeout: 30000 },
    )
    await watch.click()
    const stories = page.getByRole('dialog', { name: 'Итоги переписки' })
    await stories.waitFor({ timeout: 15000 })
    const count = await stories.locator('.stories__segment').count()
    for (let i = 0; i < count; i++) {
      await page.waitForTimeout(700)
      await shot(`19-story-${i + 1}`, false)
      await page.keyboard.press('ArrowRight')
    }
    await page.keyboard.press('Escape')
  })
  await step('guest', async () => {
    if (!token) throw new Error('no share token')
    const guest = await browser.newContext({ ...mode.ctx, colorScheme: mode.theme, locale: 'ru-RU' })
    await guest.addCookies([{ name: 'tg-analyzer-theme', value: mode.theme, url: BASE }])
    const gp = await guest.newPage()
    await gp.goto(`${BASE}/s/${token}`)
    await gp.waitForTimeout(4000)
    await gp.screenshot({ path: `${dir}/20-guest.png`, fullPage: true })
    await guest.close()
  })
  await step('account', async () => {
    await page.goto(BASE + '/account')
    await ready()
    await shot('21-account')
  })
  log(mode.name, `console errors: ${JSON.stringify([...new Set(errors)].slice(0, 6))}`)
  await browser.close()
}
await writeFile(`${OUT}/notes.txt`, notes.join('\n'))
