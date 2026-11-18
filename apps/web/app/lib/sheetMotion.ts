/** A duration token (`--duration-sheet`) in ms, read from the page once: the one number the sheets' timers use. */
const cache = new Map<string, number>()
export function tokenMs(name: string, fallback = 320): number {
  if (typeof document === 'undefined') return fallback
  const hit = cache.get(name)
  if (hit !== undefined) return hit
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const value = raw.endsWith('ms') ? parseFloat(raw) : raw.endsWith('s') ? parseFloat(raw) * 1000 : NaN
  const ms = Number.isFinite(value) ? value : fallback
  cache.set(name, ms)
  return ms
}
