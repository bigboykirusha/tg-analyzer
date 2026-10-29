import type { MessageKey } from './useI18n'
import { ApiClientError } from './useApi'

const MESSAGES: Partial<Record<ApiClientError['code'], MessageKey>> = {
  NETWORK_ERROR: 'errors.network',
  RATE_LIMITED: 'errors.rateLimited',
  LOGIN_PHONE_INVALID: 'errors.phoneInvalid',
  LOGIN_PHONE_BANNED: 'errors.phoneBanned',
  LOGIN_CODE_INVALID: 'errors.codeInvalid',
  LOGIN_CODE_EXPIRED: 'errors.codeExpired',
  LOGIN_PASSWORD_INVALID: 'errors.passwordInvalid',
  LOGIN_SESSION_EXPIRED: 'errors.loginExpired',
  TELEGRAM_FLOOD_WAIT: 'errors.floodWait',
  TELEGRAM_REAUTH_REQUIRED: 'errors.telegramReauth',
  TELEGRAM_BUSY: 'errors.telegramBusy',
  TELEGRAM_UNAVAILABLE: 'errors.telegramUnavailable',
  CHAT_NOT_FOUND: 'errors.chatNotFound',
  PARSE_ALREADY_RUNNING: 'errors.parseRunning',
  PARSE_ALREADY_QUEUED: 'errors.parseQueued',
  PARSE_QUEUE_FULL: 'errors.parseQueueFull',
  PARSE_COOLDOWN: 'errors.parseCooldown',
  QUEUE_UNAVAILABLE: 'errors.queueUnavailable',
  TEAM_NOT_FOUND: 'errors.teamNotFound',
  TEAM_FORBIDDEN: 'errors.teamForbidden',
  TEAM_OWNER_CANNOT_LEAVE: 'errors.teamOwnerCannotLeave',
  TEAMS_LIMIT_REACHED: 'errors.teamsLimit',
  PLAN_LIMIT_REACHED: 'errors.planLimit',
  INVITE_INVALID: 'errors.inviteInvalid',
  REPORT_ALREADY_SHARED: 'errors.reportAlreadyShared',
}

/** Turns any thrown value into a short, localised sentence for the user. */
export function useErrorMessage() {
  const { t, formatDuration } = useI18n()

  return function errorMessage(error: unknown, fallback: MessageKey = 'errors.generic') {
    if (!(error instanceof ApiClientError)) return t(fallback)
    const key = MESSAGES[error.code]
    if (!key) return t(fallback)
    return t(key, { wait: formatDuration(error.retryAfter ?? 60) })
  }
}
