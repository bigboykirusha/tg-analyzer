import type { ConversationFactsDto, DirectionalCountDto, MonthlyActivityDto, StreakInfoDto } from './api'

export function mapDailyActivity(map: ReadonlyMap<string, { sent: number; received: number }>) {
  return Array.from(map.entries())
    .map(([date, counts]) => ({
      date,
      sent: counts.sent,
      received: counts.received,
      total: counts.sent + counts.received,
    }))
    .sort((left, right) => left.date.localeCompare(right.date))
}

export function mapMonthlyActivity(map: ReadonlyMap<string, DirectionalCountDto>): MonthlyActivityDto[] {
  return Array.from(map.entries())
    .map(([month, counts]) => ({ month, ...counts }))
    .sort((left, right) => left.month.localeCompare(right.month))
}

export function computeMaxStreak(days: readonly string[]): StreakInfoDto {
  const sorted = [...new Set(days)]
    .filter((day) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
      const date = new Date(`${day}T00:00:00.000Z`)
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day
    })
    .sort()
  let max = 0
  let current = 0
  let previousTime: number | null = null
  let currentStart: string | null = null
  let bestStart: string | null = null
  let bestEnd: string | null = null

  for (const day of sorted) {
    const time = Date.parse(`${day}T00:00:00.000Z`)
    if (previousTime === null || time - previousTime === 24 * 60 * 60 * 1000) {
      if (current === 0) currentStart = day
      current += 1
    } else {
      current = 1
      currentStart = day
    }
    if (current > max) {
      max = current
      bestStart = currentStart
      bestEnd = day
    }
    previousTime = time
  }

  return { days: max, startDate: bestStart, endDate: bestEnd }
}

export function computeTrend(months: readonly MonthlyActivityDto[]): ConversationFactsDto['trend'] {
  if (months.length < 6) return 'unknown'

  const totalsByMonth = new Map(months.map((item) => [item.month, item.total]))
  const lastMonth = months[months.length - 1]?.month
  if (!lastMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(lastMonth)) return 'unknown'

  const monthWindow = buildMonthWindow(lastMonth, 6)
  const previousThree = monthWindow.slice(0, 3).reduce((sum, month) => sum + (totalsByMonth.get(month) ?? 0), 0)
  const lastThree = monthWindow.slice(3).reduce((sum, month) => sum + (totalsByMonth.get(month) ?? 0), 0)
  if (previousThree === 0 && lastThree === 0) return 'unknown'
  if (lastThree > previousThree * 1.15) return 'growing'
  if (lastThree < previousThree * 0.85) return 'fading'
  return 'stable'
}

function buildMonthWindow(lastMonth: string, count: number): string[] {
  const [yearText, monthText] = lastMonth.split('-')
  const cursor = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1))
  cursor.setUTCMonth(cursor.getUTCMonth() - count + 1)

  return Array.from({ length: count }, () => {
    const value = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    return value
  })
}
