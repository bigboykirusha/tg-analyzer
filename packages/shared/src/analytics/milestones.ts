import type { DatedActivityDto } from '../api/types'
import { MILESTONES } from './chat-report'

export interface MilestoneForecastDto {
  /** The next round number, e.g. 5 000. */
  index: number
  /** Whole days until it at the pace of the last four weeks. */
  days: number
}

/** The pace is the last four weeks of the chat. */
const PACE_DAYS = 28
/** Further than this is a guess, not a forecast. */
const MAX_FORECAST_DAYS = 365

/**
 * When the next round-number message will come, at the pace of the last four weeks. Null when the
 * chat went quiet (nothing in the four weeks before `now`), the pace is too slow for a year, or
 * the chat passed every milestone.
 */
export function forecastMilestone(
  totalMessages: number,
  daily: readonly DatedActivityDto[],
  now: Date = new Date(),
): MilestoneForecastDto | null {
  const index = MILESTONES.find((value) => value > totalMessages)
  if (index === undefined) return null
  const since = new Date(now.getTime() - PACE_DAYS * 86_400_000).toISOString().slice(0, 10)
  const recent = daily.filter((day) => day.date > since).reduce((sum, day) => sum + day.total, 0)
  if (!recent) return null
  const days = Math.ceil((index - totalMessages) / (recent / PACE_DAYS))
  return days <= MAX_FORECAST_DAYS ? { index, days } : null
}
