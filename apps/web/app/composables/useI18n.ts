import { en, type MessageKey } from '../i18n/en'
import { ru } from '../i18n/ru'

export type Locale = 'ru' | 'en'
export type { MessageKey }

const LOCALE_COOKIE = 'tg-analyzer-locale'
const messages: Record<Locale, Record<MessageKey, string>> = { en, ru }
const pluralRules: Record<Locale, Intl.PluralRules> = {
  en: new Intl.PluralRules('en-US'),
  ru: new Intl.PluralRules('ru-RU'),
}

type Params = Record<string, string | number>

function interpolate(template: string, params?: Params) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

/**
 * Translations and locale-aware formatting. The locale is kept in a cookie so
 * that server-rendered pages already use the right language.
 */
export function useI18n() {
  const cookie = useCookie<Locale>(LOCALE_COOKIE, { default: () => 'ru', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  const locale = computed<Locale>(() => (cookie.value === 'en' ? 'en' : 'ru'))
  const intlLocale = computed(() => (locale.value === 'ru' ? 'ru-RU' : 'en-US'))

  function setLocale(next: Locale) {
    cookie.value = next
  }

  function t(key: MessageKey, params?: Params) {
    return interpolate(messages[locale.value][key] ?? en[key] ?? key, params)
  }

  /**
   * Picks `key.one` / `key.few` / `key.many` / `key.other` by the count and
   * interpolates `{count}` (already formatted for the locale).
   */
  function tc(key: string, count: number, params?: Params) {
    const category = pluralRules[locale.value].select(count)
    const resolved = (
      `${key}.${category}` in messages[locale.value] ? `${key}.${category}` : `${key}.other`
    ) as MessageKey
    return t(resolved, { count: formatNumber(count), ...params })
  }

  function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat(intlLocale.value, options).format(value)
  }

  function formatDecimal(value: number | null | undefined, digits = 1) {
    if (value === null || value === undefined || !Number.isFinite(value)) return t('common.na')
    return formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits })
  }

  function formatPercent(value: number | null | undefined, digits = 0) {
    if (value === null || value === undefined || !Number.isFinite(value)) return t('common.na')
    return `${formatNumber(value, { maximumFractionDigits: digits })}%`
  }

  function formatDate(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) {
    if (!value) return t('common.na')
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return t('common.na')
    return new Intl.DateTimeFormat(intlLocale.value, options ?? { dateStyle: 'medium', timeStyle: 'short' }).format(
      date,
    )
  }

  /** Calendar day stored as `YYYY-MM-DD` (already in the report time zone). */
  function formatDay(
    day: string | null | undefined,
    options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
  ) {
    if (!day) return t('common.na')
    return formatDate(`${day}T12:00:00Z`, { ...options, timeZone: 'UTC' })
  }

  /** Calendar month stored as `YYYY-MM`. */
  function formatMonth(
    month: string | null | undefined,
    options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' },
  ) {
    if (!month) return t('common.na')
    return formatDate(`${month}-15T12:00:00Z`, { ...options, timeZone: 'UTC' })
  }

  function formatRelative(value: string | null | undefined) {
    if (!value) return t('common.na')
    const diffSeconds = (new Date(value).getTime() - Date.now()) / 1000
    if (!Number.isFinite(diffSeconds)) return t('common.na')
    const format = new Intl.RelativeTimeFormat(intlLocale.value, { numeric: 'auto' })
    const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
      ['year', 365 * 86400],
      ['month', 30 * 86400],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
    ]
    for (const [unit, seconds] of units) {
      if (Math.abs(diffSeconds) >= seconds) return format.format(Math.round(diffSeconds / seconds), unit)
    }
    return t('common.justNow')
  }

  /** Compact human duration: `< 1 мин`, `12 мин`, `3 ч 5 мин`, `2 д 4 ч`. */
  function formatDuration(seconds: number | null | undefined) {
    if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return t('common.na')
    if (seconds < 60) return t('duration.lessThanMinute')
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days) return hours ? t('duration.daysHours', { days, hours }) : t('duration.days', { days })
    if (hours) return minutes ? t('duration.hoursMinutes', { hours, minutes }) : t('duration.hours', { hours })
    return t('duration.minutes', { minutes })
  }

  /** Clock-style countdown: `4:05`. */
  function formatCountdown(seconds: number) {
    const safe = Math.max(0, Math.ceil(seconds))
    const hours = Math.floor(safe / 3600)
    const minutes = Math.floor((safe % 3600) / 60)
    const rest = String(safe % 60).padStart(2, '0')
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
  }

  return {
    locale,
    intlLocale,
    setLocale,
    t,
    tc,
    formatNumber,
    formatDecimal,
    formatPercent,
    formatDate,
    formatDay,
    formatMonth,
    formatRelative,
    formatDuration,
    formatCountdown,
  }
}
