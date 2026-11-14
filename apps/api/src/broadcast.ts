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
 *   docker compose exec worker node dist/broadcast.js --send --file /tmp/news.txt   # on the server
 *
 * Plain text, up to 4096 characters. About 25 messages a second (Telegram's limit is 30); a 429 waits as told,
 * someone who blocked the bot (403) is unsubscribed.
 */

const PAGE = 500
const PAUSE_MS = 40

function readArgs(argv: string[]) {
  const send = argv.includes('--send')
  const fileAt = argv.indexOf('--file')
  const file = fileAt >= 0 ? argv[fileAt + 1] : undefined
  const words = argv.filter((arg, index) => !arg.startsWith('--') && (fileAt < 0 || index !== fileAt + 1))
  const text = (file ? readFileSync(file, 'utf8') : words.join(' ')).trim()
  return { send, text }
}

async function main() {
  const { send, text } = readArgs(process.argv.slice(2))
  if (!botEnabled()) throw new Error('TELEGRAM_BOT_TOKEN is not set')
  if (!text) throw new Error('Nothing to send: pass the text, or --file path')
  if (text.length > 4096) throw new Error(`The text is ${text.length} characters; Telegram takes 4096`)

  let after = 0
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
          if (error instanceof BotApiError && error.code === 403) {
            await setBotSubscribed(chatId, false)
            blocked++
          } else {
            failed++
            logger.warn({ err: error, chatId }, 'broadcast message failed')
          }
        }
        break
      }
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
