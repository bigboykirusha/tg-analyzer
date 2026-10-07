import type {
  ActivityDistributionDto,
  AvailabilityProfileDto,
  CompositionStatsDto,
  DirectionalCountDto,
  MessageCompositionDto,
} from './api'

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
    const bucket = bucketForHour(hour)
    result[bucket].sent += counts?.sent ?? 0
    result[bucket].received += counts?.received ?? 0
    result[bucket].total += counts?.total ?? 0
  }
  return result
}

export function computeCompositionStats(params: {
  totalMessages: number
  totalChars: number
  textMessageCount: number
  messageComposition: MessageCompositionDto
}): CompositionStatsDto {
  if (!params.totalMessages) {
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
    textSharePct: Number(((params.messageComposition.text / params.totalMessages) * 100).toFixed(2)),
    mediaSharePct: Number(((params.messageComposition.media / params.totalMessages) * 100).toFixed(2)),
    voiceSharePct: Number(((params.messageComposition.voice / params.totalMessages) * 100).toFixed(2)),
    stickerSharePct: Number(((params.messageComposition.sticker / params.totalMessages) * 100).toFixed(2)),
    fileSharePct: Number(((params.messageComposition.file / params.totalMessages) * 100).toFixed(2)),
    avgCharsPerTextMessage: params.textMessageCount
      ? Number((params.totalChars / params.textMessageCount).toFixed(2))
      : null,
  }
}

export function computeAvailabilityProfile(hourlyActivity: Readonly<Record<string, number>>): AvailabilityProfileDto {
  const entries = Object.entries(hourlyActivity).map(([hour, total]) => ({ hour: Number(hour), total }))
  const activeHours = entries.filter((entry) => entry.total > 0)
  const totalMessages = entries.reduce((sum, entry) => sum + entry.total, 0)
  const peakHours = [...entries].sort((left, right) => right.total - left.total).slice(0, 3)
  const peakWindow = buildWindowLabel(peakHours.map((entry) => entry.hour))
  const secondaryWindow = peakHours.length >= 2 ? buildWindowLabel(peakHours.slice(1).map((entry) => entry.hour)) : null
  const averageHourly = entries.length ? totalMessages / entries.length : 0
  const maxHourly = peakHours[0]?.total ?? 0
  const concentrationIndex = averageHourly > 0 ? Number((maxHourly / averageHourly).toFixed(2)) : null
  const predictability =
    concentrationIndex === null || concentrationIndex < 2 ? 'low' : concentrationIndex < 3.5 ? 'medium' : 'high'

  return {
    activeHours: activeHours.length,
    activeHoursPct: Number(((activeHours.length / 24) * 100).toFixed(2)),
    concentrationIndex,
    predictability,
    peakWindow,
    secondaryWindow,
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

function buildWindowLabel(hours: number[]): string | null {
  if (!hours.length) return null
  const sorted = [...hours].sort((left, right) => right - left)
  const start = sorted[sorted.length - 1]
  const end = sorted[0]
  if (start === undefined || end === undefined) return null
  return `${padNumber(start)}:00-${padNumber((end + 1) % 24)}:00`
}

function padNumber(value: number): string {
  return String(value).padStart(2, '0')
}
