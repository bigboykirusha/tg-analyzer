import type { DirectionalCountDto, TopItemDto } from '../api/types'

export function calculateMedian(values: readonly number[]): number | null {
  if (values.length === 0) return null

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? null

  const lower = sorted[middle - 1]
  const upper = sorted[middle]
  return lower === undefined || upper === undefined ? null : Math.round((lower + upper) / 2)
}

/** Nearest-rank percentile. */
export function calculatePercentile(values: readonly number[], percentile: number): number | null {
  if (values.length === 0) return null

  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1))
  return sorted[index] ?? null
}

export function calculateAverage(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function clampNumber(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

/** Coerces untrusted JSON into a non-negative integer counter. */
export function normalizeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function toPercentage(value: number, total: number, digits = 2): number {
  return total ? roundTo((value / total) * 100, digits) : 0
}

export function increment<K>(map: Map<K, number>, key: K, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by)
}

export function topItems(counts: ReadonlyMap<string, number>, limit = 20): TopItemDto[] {
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }))
}

export function createDirectionalCount(): DirectionalCountDto {
  return { sent: 0, received: 0, total: 0 }
}

export function addDirectional(count: DirectionalCountDto, outgoing: boolean, by = 1) {
  count.total += by
  if (outgoing) count.sent += by
  else count.received += by
}
