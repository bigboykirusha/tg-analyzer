/** Normalised Telegram failures. Gateways translate library errors into these. */

export class TelegramFloodWaitError extends Error {
  constructor(readonly seconds: number) {
    super(`Telegram asked to wait ${seconds}s`)
    this.name = 'TelegramFloodWaitError'
  }
}

/** The stored authorization no longer works; the user must sign in again. */
export class TelegramSessionRevokedError extends Error {
  constructor(cause?: unknown) {
    super('Telegram session was revoked', { cause })
    this.name = 'TelegramSessionRevokedError'
  }
}

/** Another process is using this user's Telegram session right now. */
export class TelegramBusyError extends Error {
  constructor(message = 'Telegram session is busy with another operation') {
    super(message)
    this.name = 'TelegramBusyError'
  }
}

export type TelegramLoginErrorReason =
  'phone_invalid' | 'phone_banned' | 'code_invalid' | 'code_expired' | 'password_invalid' | 'session_expired'

export class TelegramLoginError extends Error {
  constructor(readonly reason: TelegramLoginErrorReason) {
    super(`Telegram login failed: ${reason}`)
    this.name = 'TelegramLoginError'
  }
}

function telegramErrorMessage(error: unknown): string {
  const value = error as { errorMessage?: unknown; message?: unknown } | null
  return String(value?.errorMessage ?? value?.message ?? '')
}

const REVOKED = /AUTH_KEY_UNREGISTERED|SESSION_REVOKED|SESSION_EXPIRED|USER_DEACTIVATED|AUTH_KEY_INVALID/
const DUPLICATED = /AUTH_KEY_DUPLICATED/
const LOGIN_ERRORS: Array<[RegExp, TelegramLoginErrorReason]> = [
  [/PHONE_NUMBER_INVALID|PHONE_NUMBER_UNOCCUPIED|PHONE_NUMBER_FLOOD/, 'phone_invalid'],
  [/PHONE_NUMBER_BANNED/, 'phone_banned'],
  [/PHONE_CODE_INVALID|PHONE_CODE_EMPTY/, 'code_invalid'],
  [/PHONE_CODE_EXPIRED/, 'code_expired'],
  [/PASSWORD_HASH_INVALID|SRP_PASSWORD_CHANGED/, 'password_invalid'],
]

/** Translates a raw gramjs error into one of the normalised errors above, or returns it unchanged. */
export function normalizeTelegramError(error: unknown): unknown {
  if (
    error instanceof TelegramFloodWaitError ||
    error instanceof TelegramSessionRevokedError ||
    error instanceof TelegramBusyError ||
    error instanceof TelegramLoginError
  ) {
    return error
  }

  const seconds = (error as { seconds?: unknown } | null)?.seconds
  const message = telegramErrorMessage(error)
  if (typeof seconds === 'number' && /FLOOD/.test(message)) return new TelegramFloodWaitError(seconds)
  const floodMatch = message.match(/FLOOD_(?:PREMIUM_)?WAIT_?(\d+)/)
  if (floodMatch) return new TelegramFloodWaitError(Number(floodMatch[1]))
  if (REVOKED.test(message)) return new TelegramSessionRevokedError(error)
  if (DUPLICATED.test(message)) return new TelegramBusyError('Telegram rejected a concurrent connection')
  for (const [pattern, reason] of LOGIN_ERRORS) {
    if (pattern.test(message)) return new TelegramLoginError(reason)
  }
  return error
}
