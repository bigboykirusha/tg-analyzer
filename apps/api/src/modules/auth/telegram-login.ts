import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

/** A «login_url» signature older than this is refused: the button is pressed and opened at once. */
export const TELEGRAM_LOGIN_MAX_AGE_SECONDS = 10 * 60

/**
 * Checks what Telegram appended to a «login_url» button's address: an HMAC-SHA256 over the sorted `key=value` lines of
 * every field but `hash`, keyed with SHA-256 of the bot token (core.telegram.org/widgets/login#checking-authorization).
 * Returns the Telegram user id it vouches for, or null when the signature, the age or the id does not hold.
 */
export function verifyTelegramLogin(fields: Record<string, string>, botToken: string, now = Date.now()) {
  const hash = fields.hash
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null
  const check = Object.keys(fields)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n')
  const secret = createHash('sha256').update(botToken).digest()
  const expected = createHmac('sha256', secret).update(check).digest()
  if (!timingSafeEqual(expected, Buffer.from(hash, 'hex'))) return null

  const authDate = Number(fields.auth_date)
  const age = now / 1000 - authDate
  if (!Number.isFinite(authDate) || age > TELEGRAM_LOGIN_MAX_AGE_SECONDS || age < -60) return null
  const id = Number(fields.id)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
