import { readFileSync } from 'node:fs'
import { pool } from './db'
import { logger } from './lib/logger'
import { redis } from './lib/redis'
import { sleep } from './lib/time'
import { BotApiError, botEnabled, botSubscribersAfter, sendBotMessage, setBotSubscribed } from './modules/notify/bot'

/**
 * The bot's news to everyone subscribed (pressed Start, not /stop). Without `--send` it only counts who would get it.
 *
 *   pnpm --filter @tg-analyzer/api broadcast -- "Текст"            # dev: count only
 *   pnpm --filter @tg-analyzer/api broadcast -- --send "Текст"     # dev: send
 *   docker compose exec worker node dist/broadcast.js --send --file /tmp/news.txt   # the file inside the container
 *   … --send --after 123456789 "Текст"   # carry on after an interrupted run: the last chat id it printed
 *
 * Plain text, up to 4096 characters. About 25 messages a second (Telegram's limit is 30); a 429 waits as told,
 * someone who blocked the bot (403) or whose chat is gone (400 chat not found) is unsubscribed. Every 100 messages
 * it prints how far it got.
 */

const PAGE = 500
const PAUSE_MS = 40

function readArgs(argv: string[]) {
  let send = false
  let file: string | undefined
  let after = 0
  const words: string[] = []
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]!
    if (arg === '--') continue
    if (arg === '--send') send = true
    else if (arg === '--file' || arg === '--after') {
      const value = argv[++index]
      if (!value) throw new Error(`${arg} needs a value`)
      if (arg === '--file') file = value
      else if (/^\d+$/.test(value)) after = Number(value)
      else throw new Error('--after takes a chat id')
    } else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`)
    else words.push(arg)
  }
  if (file && words.length) throw new Error('Pass the text or --file, not both')
  const text = (file ? readFileSync(file, 'utf8') : words.join(' ')).trim()
  return { send, text, after }
}

async function main() {
  const { send, text, after: start } = readArgs(process.argv.slice(2))
  if (!botEnabled()) throw new Error('TELEGRAM_BOT_TOKEN is not set')
  if (!text) throw new Error('Nothing to send: pass the text, or --file path')
  if (text.length > 4096) throw new Error(`The text is ${text.length} characters; Telegram takes 4096`)

  let after = start
  let total = 0
  let sent = 0
  let blocked = 0
  let failed = 0
  for (;;) {
    const page = await botSubscribersAfter(after, PAGE)
    if (!page.length) break
    after = page.at(-1)!.chatId
    total += page.length
    if (!send) continue
    for (const { chatId } of page) {
      for (let attempt = 0; ; attempt++) {
        try {
          await sendBotMessage(chatId, text)
          sent++
        } catch (error) {
          if (error instanceof BotApiError && error.code === 429 && attempt < 3) {
            await sleep((error.retryAfter ?? 5) * 1000)
            continue
          }
          if (
            error instanceof BotApiError &&
            (error.code === 403 || (error.code === 400 && /chat not found/i.test(error.message)))
          ) {
            await setBotSubscribed(chatId, false)
            blocked++
          } else {
            failed++
            logger.warn({ err: error, chatId }, 'broadcast message failed')
          }
        }
        break
      }
      const done = sent + blocked + failed
      if (done % 100 === 0) console.log(`… ${done} done, last chat ${chatId}`)
      await sleep(PAUSE_MS)
    }
  }
  console.log(
    send
      ? `Sent ${sent} of ${total}; ${blocked} blocked the bot (unsubscribed), ${failed} failed.`
      : `${total} subscribers would get it. Add --send to send.`,
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end().catch(() => undefined)
    redis.disconnect()
  })
