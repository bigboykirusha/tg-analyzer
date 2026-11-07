/**
 * «Вечерние собеседники»: the part of the day a chat lives in, from the middle of its usual window
 * (`derived.availabilityProfile.peakWindow`). The report («Ваше время») and «Итоги» both read it
 * from here, so one chat never gets two answers.
 */
export type Persona = 'night' | 'morning' | 'day' | 'evening'

export function parseWindow(span: string | null | undefined) {
  if (!span) return null
  const [from = '', to = ''] = span.split('-')
  const start = Number.parseInt(from, 10)
  const end = Number.parseInt(to, 10)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return { from, to, start, end, length: (end - start + 24) % 24 || 24 }
}

export function personaOf(span: string | null | undefined): Persona | null {
  const window = parseWindow(span)
  if (!window) return null
  const middle = (window.start + window.length / 2) % 24
  if (middle >= 5 && middle < 11) return 'morning'
  if (middle >= 11 && middle < 17) return 'day'
  if (middle >= 17 && middle < 22) return 'evening'
  return 'night'
}
