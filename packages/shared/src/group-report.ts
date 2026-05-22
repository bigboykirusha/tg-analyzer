import type { GroupMemberRole, GroupParticipantDto } from './api'

export type ProductGroupRole = 'anchor' | 'contributor' | 'newcomer' | 'inactive'
type LegacyGroupRole = 'reactor' | 'lurker' | 'ghost' | 'catalyst'

type GroupRoleInput = {
  role?: GroupMemberRole | ProductGroupRole | LegacyGroupRole | null
  messageShare?: number | null
  consistencyScore?: number | null
  starterShare?: number | null
  firstSeen?: Date | string | null
  lastSeen?: Date | string | null
  messageCount?: number | null
}

function toTimestamp(value: Date | string | null | undefined) {
  if (!value) {
    return null
  }

  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export function resolveProductGroupRole(input: GroupRoleInput, now = new Date()): ProductGroupRole {
  const messageShare = input.messageShare ?? 0
  const starterShare = input.starterShare ?? 0
  const consistencyScore = input.consistencyScore ?? 0
  const messageCount = input.messageCount ?? 0
  const firstSeen = toTimestamp(input.firstSeen)
  const lastSeen = toTimestamp(input.lastSeen)
  const nowMs = now.getTime()
  const daysSinceFirstSeen = firstSeen === null ? null : (nowMs - firstSeen) / (24 * 60 * 60 * 1000)
  const daysSinceLastSeen = lastSeen === null ? null : (nowMs - lastSeen) / (24 * 60 * 60 * 1000)

  if (daysSinceLastSeen !== null && daysSinceLastSeen > 90) {
    return 'inactive'
  }
  if (daysSinceLastSeen === null && (input.role === 'ghost' || input.role === 'lurker' || input.role === 'inactive')) {
    return 'inactive'
  }
  if (daysSinceFirstSeen !== null && daysSinceFirstSeen <= 30 && messageShare < 2 && messageCount < 25) {
    return 'newcomer'
  }
  if (messageShare >= 15 || (messageShare >= 10 && starterShare >= 15) || messageCount >= 500) {
    return 'anchor'
  }
  if (messageShare >= 2 || messageCount >= 50 || consistencyScore >= 2 || starterShare >= 5) {
    return 'contributor'
  }

  return 'contributor'
}

export function resolveParticipantProductRole(participant: GroupParticipantDto, now = new Date()) {
  return resolveProductGroupRole(participant, now)
}
