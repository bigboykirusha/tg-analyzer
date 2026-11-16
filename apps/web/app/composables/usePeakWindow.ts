import type { ReportDto } from '@tg-analyzer/shared'
import { parseWindow } from '../lib/persona'

/**
 * «Пик — с 11:00 до 14:00»: the usual window of being in touch (`availabilityProfile.peakWindow`). The «Время» card
 * and the verdict under the poster read this one function, so the window is said the same way in both.
 */
export function usePeakWindow(data: () => ReportDto) {
  const { t } = useI18n()
  const window = computed(() => parseWindow(data().derived.availabilityProfile.peakWindow))
  const spread = (span: NonNullable<typeof window.value>) =>
    Array.from({ length: span.length }, (_, index) => (span.start + index) % 24)
  const hours = computed(() => (window.value ? spread(window.value) : []))
  /** The second window of the day (`availabilityProfile.secondaryWindow`), a step lighter on the dial. */
  const second = computed(() => {
    const span = parseWindow(data().derived.availabilityProfile.secondaryWindow)
    return span ? spread(span) : []
  })
  /** The dash held to its numbers. */
  const answer = computed(() =>
    window.value ? t('report.time.peak', { from: window.value.from, to: window.value.to }).replace(/–/gu, '⁠–⁠') : null,
  )
  return { window, hours, second, answer }
}
