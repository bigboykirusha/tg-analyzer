export function calculateMedian(values: readonly number[]): number | null {
  if (values.length === 0) return null

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const middleValue = sorted[middle]
  if (middleValue === undefined) return null
  if (sorted.length % 2 === 1) return middleValue

  const previousValue = sorted[middle - 1]
  return previousValue === undefined ? null : Math.round((previousValue + middleValue) / 2)
}

export function calculatePercentile(values: readonly number[], percentile: number): number | null {
  if (values.length === 0) return null

  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1))
  return sorted[index] ?? null
}

export function clampNumber(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

export function calculateAverage(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
