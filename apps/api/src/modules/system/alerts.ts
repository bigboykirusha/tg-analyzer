import { config } from '../../config'
import { logger } from '../../lib/logger'
import { redis } from '../../lib/redis'
import { isWorkerAlive } from './heartbeat'

/**
 * Alerts without an outside service: a JSON webhook (ALERT_WEBHOOK_URL; the body carries `text`
 * and `content`, which Slack, Mattermost and Discord read) or a Telegram bot message
 * (ALERT_TELEGRAM_BOT_TOKEN + ALERT_TELEGRAM_CHAT_ID). With neither set everything here is a no-op.
 * The same alert goes out once per ALERT_THROTTLE_MINUTES, across all API and worker instances.
 */

export type ErrorKind = 'server' | 'client' | 'worker'

const KIND_TITLES: Record<ErrorKind, string> = {
  server: 'API answers 5xx',
  client: 'Browser errors',
  worker: 'Worker errors',
}

export function alertsEnabled() {
  return Boolean(config.ALERT_WEBHOOK_URL || (config.ALERT_TELEGRAM_BOT_TOKEN && config.ALERT_TELEGRAM_CHAT_ID))
}

async function deliver(text: string) {
  const tasks: Promise<Response>[] = []
  if (config.ALERT_WEBHOOK_URL) {
    tasks.push(
      fetch(config.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, content: text, event: 'alert', at: new Date().toISOString() }),
        signal: AbortSignal.timeout(10_000),
      }),
    )
  }
  if (config.ALERT_TELEGRAM_BOT_TOKEN && config.ALERT_TELEGRAM_CHAT_ID) {
    tasks.push(
      fetch(`https://api.telegram.org/bot${config.ALERT_TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: config.ALERT_TELEGRAM_CHAT_ID, text }),
        signal: AbortSignal.timeout(10_000),
      }),
    )
  }
  const results = await Promise.allSettled(tasks)
  for (const result of results) {
    if (result.status === 'rejected') logger.warn({ err: result.reason }, 'alert delivery failed')
    else if (!result.value.ok) logger.warn({ status: result.value.status }, 'alert delivery rejected')
  }
}

/** Sends `text` unless the same `key` was sent within the throttle window. Never throws. */
export async function sendAlert(key: string, text: string) {
  if (!alertsEnabled()) return false
  try {
    const first = await redis.set(`alert:sent:${key}`, '1', 'EX', config.ALERT_THROTTLE_MINUTES * 60, 'NX')
    if (first !== 'OK') return false
    logger.error({ event: 'alert', alertKey: key }, text)
    await deliver(`TG Analyzer: ${text}`)
    return true
  } catch (error) {
    logger.warn({ err: error }, 'alert failed')
    return false
  }
}

/**
 * Counts one error of `kind` in the current window and raises an alert when the window
 * reaches the threshold. Fire and forget: errors here must not add to the errors counted.
 */
export function recordError(kind: ErrorKind) {
  if (!alertsEnabled()) return
  void (async () => {
    const windowMs = config.ALERT_WINDOW_MINUTES * 60_000
    const bucket = Math.floor(Date.now() / windowMs)
    const key = `alert:count:${kind}:${bucket}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, config.ALERT_WINDOW_MINUTES * 120)
    if (count === config.ALERT_ERROR_THRESHOLD) {
      await sendAlert(
        `burst:${kind}`,
        `${KIND_TITLES[kind]}: ${count} in ${config.ALERT_WINDOW_MINUTES} min. Check the logs (event client_error / request failed).`,
      )
    }
  })().catch(() => undefined)
}

const WATCH_INTERVAL_MS = 30_000
/** Heartbeats expire after 30 s; three missed checks in a row rule out a restart or a deploy. */
const MISSES_BEFORE_ALERT = 3

/** Checks the worker heartbeat; run in the API (the worker cannot report its own death). */
export function startWorkerWatch(check: () => Promise<boolean> = isWorkerAlive, intervalMs = WATCH_INTERVAL_MS) {
  if (!alertsEnabled()) return () => undefined
  let misses = 0
  let alerted = false
  const timer = setInterval(() => {
    void (async () => {
      const alive = await check().catch(() => true)
      if (alive) {
        if (alerted) await sendAlert('worker-recovered', 'worker is processing jobs again.')
        misses = 0
        alerted = false
        return
      }
      misses += 1
      if (misses >= MISSES_BEFORE_ALERT && !alerted) {
        alerted = await sendAlert(
          'worker-down',
          'worker has stopped answering (no heartbeat). Analyses are not running; see docs/RUNBOOK.md.',
        )
      }
    })().catch(() => undefined)
  }, intervalMs)
  timer.unref()
  return () => clearInterval(timer)
}
