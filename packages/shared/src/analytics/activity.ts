import type {
  ActivityDistributionDto,
  AvailabilityProfileDto,
  CompositionStatsDto,
  DatedActivityDto,
  DirectionalCountDto,
  MessageCompositionDto,
  MonthlyActivityDto,
  StreakDto,
  Trend,
} from '../api/types'
import { createDirectionalCount, normalizeCount, roundTo, toPercentage } from './primitives'

const DAY_MS = 24 * 60 * 60 * 1000
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/
const CALENDAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

function isCalendarDay(value: string): boolean {
  if (!CALENDAR_DAY.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function dayIndex(day: string) {
  return Date.parse(`${day}T00:00:00.000Z`) / DAY_MS
}

/** Adds zero rows for days without messages so charts keep a continuous axis. */
export function fillDailyGaps(items: readonly DatedActivityDto[]): DatedActivityDto[] {
  const ordered = items.filter((item) => isCalendarDay(item.date)).sort((a, b) => a.date.localeCompare(b.date))
  const first = ordered[0]
  const last = ordered[ordered.length - 1]
  if (!first || !last) return []

  const byDate = new Map(ordered.map((item) => [item.date, item]))
  const filled: DatedActivityDto[] = []
  for (let day = dayIndex(first.date); day <= dayIndex(last.date); day += 1) {
    const date = new Date(day * DAY_MS).toISOString().slice(0, 10)
    filled.push(byDate.get(date) ?? { date, sent: 0, received: 0, total: 0 })
  }
  return filled
}

export function computeMaxStreak(days: Iterable<string>): StreakDto {
  const sorted = [...new Set(days)].filter(isCalendarDay).sort()
  let best: StreakDto = { days: 0, startDate: null, endDate: null }
  let currentLength = 0
  let currentStart: string | null = null
  let previous: number | null = null

  for (const day of sorted) {
    const index = dayIndex(day)
    if (previous !== null && index - previous === 1) {
      currentLength += 1
    } else {
      currentLength = 1
      currentStart = day
    }
    if (currentLength > best.days) best = { days: currentLength, startDate: currentStart, endDate: day }
    previous = index
  }

  return best
}

/**
 * Compares the last three complete months with the three before them.
 * Requires six months of history; `incompleteMonth` (the current month) is ignored.
 */
export function computeTrend(months: readonly MonthlyActivityDto[], incompleteMonth?: string): Trend {
  const valid = months.filter((item) => CALENDAR_MONTH.test(item.month)).sort((a, b) => a.month.localeCompare(b.month))
  const firstMonth = valid[0]?.month
  const latestMonth = valid[valid.length - 1]?.month
  if (!firstMonth || !latestMonth) return 'unknown'

  const lastComplete = latestMonth === incompleteMonth ? shiftMonth(latestMonth, -1) : latestMonth
  const windowStart = shiftMonth(lastComplete, -5)
  if (firstMonth > windowStart) return 'unknown'

  const totals = new Map(valid.map((item) => [item.month, Math.max(0, item.total)]))
  const sumMonths = (from: number, to: number) => {
    let sum = 0
    for (let offset = from; offset <= to; offset += 1) sum += totals.get(shiftMonth(windowStart, offset)) ?? 0
    return sum
  }
  const previous = sumMonths(0, 2)
  const recent = sumMonths(3, 5)

  if (previous === 0 && recent === 0) return 'unknown'
  if (recent > previous * 1.15) return 'growing'
  if (recent < previous * 0.85) return 'fading'
  return 'stable'
}

function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number]
  const cursor = new Date(Date.UTC(year, monthNumber - 1 + offset, 1))
  return `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`
}

function bucketForHour(hour: number): keyof ActivityDistributionDto {
  if (hour <= 5) return 'night'
  if (hour <= 11) return 'morning'
  if (hour <= 17) return 'afternoon'
  return 'evening'
}

/** Groups 24 hourly buckets into night / morning / afternoon / evening. */
export function computeActivityDistribution(hourly: readonly DirectionalCountDto[]): ActivityDistributionDto {
  const result: ActivityDistributionDto = {
    night: createDirectionalCount(),
    morning: createDirectionalCount(),
    afternoon: createDirectionalCount(),
    evening: createDirectionalCount(),
  }

  hourly.slice(0, 24).forEach((counts, hour) => {
    const bucket = result[bucketForHour(hour)]
    const sent = normalizeCount(counts?.sent)
    const received = normalizeCount(counts?.received)
    bucket.sent += sent
    bucket.received += received
    bucket.total += sent + received
  })

  return result
}

export function computeCompositionStats(params: {
  totalChars: number
  textMessageCount: number
  composition: MessageCompositionDto
}): CompositionStatsDto {
  const { composition } = params
  const counts = {
    text: normalizeCount(composition.text),
    media: normalizeCount(composition.media),
    voice: normalizeCount(composition.voice),
    sticker: normalizeCount(composition.sticker),
    file: normalizeCount(composition.file),
  }
  const classified = counts.text + counts.media + counts.voice + counts.sticker + counts.file

  if (!classified) {
    return {
      textSharePct: null,
      mediaSharePct: null,
      voiceSharePct: null,
      stickerSharePct: null,
      fileSharePct: null,
      avgCharsPerTextMessage: null,
    }
  }

  return {
    textSharePct: toPercentage(counts.text, classified),
    mediaSharePct: toPercentage(counts.media, classified),
    voiceSharePct: toPercentage(counts.voice, classified),
    stickerSharePct: toPercentage(counts.sticker, classified),
    fileSharePct: toPercentage(counts.file, classified),
    avgCharsPerTextMessage: params.textMessageCount ? roundTo(params.totalChars / params.textMessageCount, 2) : null,
  }
}

/** Describes when a conversation usually happens, from 24 hourly totals. */
export function computeAvailabilityProfile(hourlyTotals: readonly number[]): AvailabilityProfileDto {
  const totals = Array.from({ length: 24 }, (_, hour) => normalizeCount(hourlyTotals[hour]))
  const activeHours = totals.filter((total) => total > 0).length
  const sum = totals.reduce((acc, total) => acc + total, 0)
  const average = sum / 24
  const concentrationIndex = average > 0 ? roundTo(Math.max(...totals) / average, 2) : null
  const predictability =
    concentrationIndex === null || concentrationIndex < 2 ? 'low' : concentrationIndex < 3.5 ? 'medium' : 'high'

  const windows = rankWindows(totals)
  const peak = windows[0]
  const peakHours = new Set(peak?.hours)
  const secondary = windows.find((window) => window.total > 0 && window.hours.every((hour) => !peakHours.has(hour)))

  return {
    activeHours,
    activeHoursPct: roundTo((activeHours / 24) * 100, 2),
    concentrationIndex,
    predictability,
    peakWindow: peak && peak.total > 0 ? formatWindow(peak.start, peak.hours.length) : null,
    secondaryWindow: secondary ? formatWindow(secondary.start, secondary.hours.length) : null,
  }
}

function rankWindows(hourly: readonly number[], size = 3) {
  const peakHour = hourly.reduce((best, value, hour) => (value > (hourly[best] ?? 0) ? hour : best), 0)
  const distanceToPeak = (start: number) => {
    const distance = Math.abs(((start + Math.floor(size / 2)) % 24) - peakHour)
    return Math.min(distance, 24 - distance)
  }

  return Array.from({ length: 24 }, (_, start) => {
    const hours = Array.from({ length: size }, (_unused, offset) => (start + offset) % 24)
    return { start, hours, total: hours.reduce((sum, hour) => sum + (hourly[hour] ?? 0), 0) }
  }).sort(
    (left, right) =>
      right.total - left.total || distanceToPeak(left.start) - distanceToPeak(right.start) || left.start - right.start,
  )
}

function formatWindow(start: number, size: number) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(start)}:00-${pad((start + size) % 24)}:00`
}
