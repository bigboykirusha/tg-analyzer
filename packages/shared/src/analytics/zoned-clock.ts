export interface LocalTime {
  /** `YYYY-MM-DD` */
  day: string
  /** `YYYY-MM` */
  month: string
  /** 0–23 */
  hour: number
  /** 0 = Sunday … 6 = Saturday */
  weekday: number
}

export type ZonedClock = (timestamp: number) => LocalTime

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// Every real-world UTC offset is a multiple of 15 minutes, so local date parts
// are constant inside a 15-minute UTC bucket. Caching per bucket turns the
// expensive Intl formatting into a map lookup for message-dense chats.
const BUCKET_MS = 15 * 60 * 1000
const MAX_CACHE_ENTRIES = 50_000

export function resolveTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return 'UTC'
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/**
 * Returns a fast converter from epoch milliseconds to local calendar parts in
 * the given IANA time zone. Invalid zones fall back to UTC.
 */
export function createZonedClock(timeZone: string): ZonedClock {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  })
  const cache = new Map<number, LocalTime>()

  return (timestamp) => {
    const bucket = Math.floor(timestamp / BUCKET_MS)
    const cached = cache.get(bucket)
    if (cached) return cached

    let year = '1970'
    let month = '01'
    let day = '01'
    let hour = 0
    let weekday = 0
    for (const part of formatter.formatToParts(timestamp)) {
      if (part.type === 'year') year = part.value
      else if (part.type === 'month') month = part.value
      else if (part.type === 'day') day = part.value
      else if (part.type === 'hour') hour = Number(part.value)
      else if (part.type === 'weekday') weekday = WEEKDAYS[part.value] ?? 0
    }

    const local: LocalTime = { day: `${year}-${month}-${day}`, month: `${year}-${month}`, hour, weekday }
    if (cache.size >= MAX_CACHE_ENTRIES) cache.clear()
    cache.set(bucket, local)
    return local
  }
}
