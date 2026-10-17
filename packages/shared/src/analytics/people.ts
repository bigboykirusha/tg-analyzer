import type { ContactStatsDto } from '../api/types'
import { computeResponseStats, SESSION_BOUNDARY_MS, type TimelinePoint } from './timeline'

const DAY_MS = 24 * 60 * 60 * 1000

/** How far back the people overview reads each chat. */
export const PEOPLE_WINDOW_DAYS = 90

export interface ContactInput {
  chatId: string
  title: string
  hasAvatar: boolean
  /** Messages of the last {@link PEOPLE_WINDOW_DAYS} days, any order. */
  messages: readonly TimelinePoint[]
}

/**
 * Light statistics for one private chat over the recent window: volume now
 * vs. the month before, who writes, how fast each side replies and who starts.
 */
export function computeContactStats(input: ContactInput, now: number): ContactStatsDto {
  const windowStart = now - PEOPLE_WINDOW_DAYS * DAY_MS
  const recentStart = now - 30 * DAY_MS
  const previousStart = now - 60 * DAY_MS
  const points = input.messages.filter(
    (point) => Number.isFinite(point.ts) && point.ts >= windowStart && point.ts <= now,
  )

  let last30 = 0
  let previous30 = 0
  let sent = 0
  let lastMessageAt: number | null = null
  for (const point of points) {
    if (point.ts >= recentStart) last30 += 1
    else if (point.ts >= previousStart) previous30 += 1
    if (point.outgoing) sent += 1
    if (lastMessageAt === null || point.ts > lastMessageAt) lastMessageAt = point.ts
  }

  const responses = computeResponseStats(points)
  // Conversations = runs separated by long silences; computeResponseStats counts them for iWriteFirstPct.
  const ordered = [...points].sort((left, right) => left.ts - right.ts)
  let conversations = 0
  for (let index = 0; index < ordered.length; index += 1) {
    if (index === 0 || ordered[index]!.ts - ordered[index - 1]!.ts > SESSION_BOUNDARY_MS) conversations += 1
  }

  return {
    chatId: input.chatId,
    title: input.title,
    hasAvatar: input.hasAvatar,
    messages90: points.length,
    sent90: sent,
    received90: points.length - sent,
    last30,
    previous30,
    lastMessageAt: lastMessageAt === null ? null : new Date(lastMessageAt).toISOString(),
    medianMineSec: responses.medianMineSec,
    medianTheirsSec: responses.medianTheirsSec,
    mineSamples: responses.mineSamples,
    theirsSamples: responses.theirsSamples,
    iWriteFirstPct: responses.iWriteFirstPct,
    conversations,
  }
}
