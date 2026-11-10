/**
 * Text rules for dates and lengths that the Intl API does not give: a Russian month after «в»,
 * when a date needs its year, a recording's length with units. Pure, so the report, «Итоги» and
 * the link write them the same way.
 */

export type TextLocale = 'ru' | 'en'

const isRussian = (locale: string) => locale.toLowerCase().startsWith('ru')

// prettier-ignore
const MONTHS_RU_PREPOSITIONAL = [
  'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре',
]
// prettier-ignore
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
]

/** Month number 1–12 from a number or a `YYYY-MM` / `YYYY-MM-DD` string; null when it is none. */
function monthNumber(month: number | string): number | null {
  const value = typeof month === 'number' ? month : Number(/^\d{4}-(\d{2})/.exec(month)?.[1] ?? Number.NaN)
  return Number.isInteger(value) && value >= 1 && value <= 12 ? value : null
}

/** The month in the prepositional case, without the preposition: «августе». English: «August». */
export function monthPrepositional(month: number | string, locale: string): string {
  const number = monthNumber(month)
  if (number === null) return ''
  return (isRussian(locale) ? MONTHS_RU_PREPOSITIONAL : MONTHS_EN)[number - 1]!
}

/** «в августе» / «in August»; with `year`, «в августе 2025» / «in August 2025». Empty for an invalid month. */
export function inMonth(month: number | string, locale: string, year?: number | string | null): string {
  const name = monthPrepositional(month, locale)
  if (!name) return ''
  const tail = year === undefined || year === null || year === '' ? '' : ` ${year}`
  return `${isRussian(locale) ? 'в' : 'in'} ${name}${tail}`
}

/** An average year, in days: a report that covers more has dates that need a year to be read. */
const YEAR_DAYS = 365

/**
 * Whether dates of a report need their year: when it covers more than a year or its first and last
 * message sit in different calendar years («с 14 декабря по 2 февраля»). Accepts ISO dates or days.
 */
export function shouldShowYear(from: Date | string | null | undefined, to: Date | string | null | undefined): boolean {
  if (!from || !to) return false
  const start = new Date(from)
  const end = new Date(to)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
  if (start.getUTCFullYear() !== end.getUTCFullYear()) return true
  return Math.abs(end.getTime() - start.getTime()) / 86_400_000 > YEAR_DAYS
}

/** Keeps a number with its unit on one line. */
const NBSP = String.fromCharCode(160)

const UNITS = {
  ru: { hours: 'ч', minutes: 'мин', seconds: 'с' },
  en: { hours: 'h', minutes: 'min', seconds: 's' },
}

/**
 * The length of a recording: «45 с», «10 мин 29 с», «2 ч 5 мин» (seconds are dropped from an hour on,
 * where they are noise). Null, negative or infinite input gives an empty string.
 */
export function formatVoiceDuration(seconds: number | null | undefined, locale: string): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return ''
  const unit = isRussian(locale) ? UNITS.ru : UNITS.en
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = total % 60
  const part = (value: number, name: string) => `${value}${NBSP}${name}`
  if (hours) return [part(hours, unit.hours), minutes ? part(minutes, unit.minutes) : ''].filter(Boolean).join(' ')
  if (minutes) return [part(minutes, unit.minutes), rest ? part(rest, unit.seconds) : ''].filter(Boolean).join(' ')
  return part(rest, unit.seconds)
}
