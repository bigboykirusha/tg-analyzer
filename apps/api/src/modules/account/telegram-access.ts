import { ApiError } from '../../lib/errors'
import {
  telegram,
  TelegramBusyError,
  TelegramFloodWaitError,
  TelegramSessionRevokedError,
  type TelegramAccountApi,
  type WithSessionOptions,
} from '../../telegram'
import { logger } from '../../lib/logger'
import { deactivateTelegramSession, getTelegramSession } from './telegram-sessions'

/** Telegram's error code behind a revoked session (AUTH_KEY_UNREGISTERED, SESSION_REVOKED…), never anything secret. */
function telegramReason(error: TelegramSessionRevokedError) {
  const cause = (error as { cause?: { errorMessage?: unknown; message?: unknown } }).cause
  return String(cause?.errorMessage ?? cause?.message ?? error.message).slice(0, 80)
}

export const telegramReauthRequired = () =>
  new ApiError(401, 'TELEGRAM_REAUTH_REQUIRED', 'Telegram session expired, please sign in again')

/**
 * Runs an operation on the user's Telegram account from an HTTP request and
 * translates Telegram failures into API errors.
 */
export async function withUserTelegram<T>(
  userId: string,
  work: (api: TelegramAccountApi) => Promise<T>,
  options?: WithSessionOptions,
): Promise<T> {
  const session = await getTelegramSession(userId)
  if (!session) throw telegramReauthRequired()

  try {
    return await telegram.withSession(userId, session, work, options)
  } catch (error) {
    if (error instanceof TelegramSessionRevokedError) {
      // Telegram ended the authorization: the site then asks to sign in again. Said in the log with Telegram's own
      // reason, so «it signed me out» can be told apart from a refused refresh cookie (14.11).
      logger.warn({ userId, telegramError: telegramReason(error) }, 'telegram session lost')
      await deactivateTelegramSession(userId)
      throw telegramReauthRequired()
    }
    if (error instanceof TelegramBusyError) {
      throw new ApiError(409, 'TELEGRAM_BUSY', 'Telegram is busy with another operation, try again shortly')
    }
    if (error instanceof TelegramFloodWaitError) {
      throw new ApiError(429, 'TELEGRAM_FLOOD_WAIT', 'Telegram asked to slow down', error.seconds)
    }
    throw error
  }
}
