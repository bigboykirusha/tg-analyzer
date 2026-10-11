import type {
  ActivityDistributionDto,
  AvailabilityProfileDto,
  CompositionStatsDto,
  DirectionalCountDto,
  MessageCompositionDto,
} from './api'
import { normalizeCount } from './analytics-primitives'

export function computeActivityDistribution(
  activity: Readonly<Record<string, DirectionalCountDto>>,
): ActivityDistributionDto {
  const result: ActivityDistributionDto = {
    night: createDirectionalCount(),
    morning: createDirectionalCount(),
    afternoon: createDirectionalCount(),
    evening: createDirectionalCount(),
  }

  for (const [hourLabel, counts] of Object.entries(activity)) {
    const hour = Number(hourLabel)
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue
    const bucket = bucketForHour(hour)
    const sent = normalizeCount(counts?.sent)
    const received = normalizeCount(counts?.received)
    result[bucket].sent += sent
    result[bucket].received += received
    result[bucket].total += sent + received
  }
  return result
}

export function computeCompositionStats(params: {
  totalChars: number
  textMessageCount: number
  messageComposition: MessageCompositionDto
}): CompositionStatsDto {
  const composition = {
    text: normalizeCount(params.messageComposition.text),
    media: normalizeCount(params.messageComposition.media),
    voice: normalizeCount(params.messageComposition.voice),
    sticker: normalizeCount(params.messageComposition.sticker),
    file: normalizeCount(params.messageComposition.file),
  }
  const classifiedMessages = Object.values(composition).reduce((sum, value) => sum + value, 0)

  if (!classifiedMessages) {
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
    textSharePct: toPercentage(composition.text, classifiedMessages),
    mediaSharePct: toPercentage(composition.media, classifiedMessages),
    voiceSharePct: toPercentage(composition.voice, classifiedMessages),
    stickerSharePct: toPercentage(composition.sticker, classifiedMessages),
    fileSharePct: toPercentage(composition.file, classifiedMessages),
    avgCharsPerTextMessage: params.textMessageCount
      ? Number((params.totalChars / params.textMessageCount).toFixed(2))
      : null,
  }
}

export function computeAvailabilityProfile(hourlyActivity: Readonly<Record<string, number>>): AvailabilityProfileDto {
  const entries = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    total: normalizeCount(hourlyActivity[String(hour)]),
  }))
  const activeHours = entries.filter((entry) => entry.total > 0)
  const totalMessages = entries.reduce((sum, entry) => sum + entry.total, 0)
  const averageHourly = entries.length ? totalMessages / entries.length : 0
  const maxHourly = Math.max(...entries.map((entry) => entry.total))
  const concentrationIndex = averageHourly > 0 ? Number((maxHourly / averageHourly).toFixed(2)) : null
  const predictability =
    concentrationIndex === null || concentrationIndex < 2 ? 'low' : concentrationIndex < 3.5 ? 'medium' : 'high'
  const windows = buildRankedWindows(entries.map((entry) => entry.total))
  const peak = windows[0]
  const occupiedHours = new Set(peak?.hours ?? [])
  const secondary = windows.find((window) => window.total > 0 && window.hours.every((hour) => !occupiedHours.has(hour)))

  return {
    activeHours: activeHours.length,
    activeHoursPct: Number(((activeHours.length / 24) * 100).toFixed(2)),
    concentrationIndex,
    predictability,
    peakWindow: peak && peak.total > 0 ? formatWindow(peak.start, peak.hours.length) : null,
    secondaryWindow: secondary ? formatWindow(secondary.start, secondary.hours.length) : null,
  }
}

function createDirectionalCount(): DirectionalCountDto {
  return { sent: 0, received: 0, total: 0 }
}

function bucketForHour(hour: number): keyof ActivityDistributionDto {
  if (hour <= 5) return 'night'
  if (hour <= 11) return 'morning'
  if (hour <= 17) return 'afternoon'
  return 'evening'
}

function buildRankedWindows(hourly: readonly number[], size = 3) {
  const peakHour = hourly.reduce((best, value, hour) => (value > (hourly[best] ?? 0) ? hour : best), 0)
  return Array.from({ length: 24 }, (_, start) => {
    const hours = Array.from({ length: size }, (__, offset) => (start + offset) % 24)
    return { start, hours, total: hours.reduce((sum, hour) => sum + (hourly[hour] ?? 0), 0) }
  }).sort((left, right) => {
    if (right.total !== left.total) return right.total - left.total
    const leftCenterDistance = circularHourDistance((left.start + Math.floor(size / 2)) % 24, peakHour)
    const rightCenterDistance = circularHourDistance((right.start + Math.floor(size / 2)) % 24, peakHour)
    return leftCenterDistance - rightCenterDistance || left.start - right.start
  })
}

function circularHourDistance(left: number, right: number) {
  const distance = Math.abs(left - right)
  return Math.min(distance, 24 - distance)
}

function formatWindow(start: number, size: number) {
  return `${padNumber(start)}:00-${padNumber((start + size) % 24)}:00`
}

function padNumber(value: number): string {
  return String(value).padStart(2, '0')
}

function toPercentage(value: number, total: number) {
  return Number(((value / total) * 100).toFixed(2))
}
