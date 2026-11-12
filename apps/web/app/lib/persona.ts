/**
 * A chat's usual window (`derived.availabilityProfile.peakWindow`, «13-16») as hours: the private report, the
 * group report and «Итоги» all read it from here, so one chat never gets two answers.
 */
export function parseWindow(span: string | null | undefined) {
  if (!span) return null
  const [from = '', to = ''] = span.split('-')
  const start = Number.parseInt(from, 10)
  const end = Number.parseInt(to, 10)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return { from, to, start, end, length: (end - start + 24) % 24 || 24 }
}
