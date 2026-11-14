import type { ReportDto } from '@tg-analyzer/shared'
import { parseWindow } from '../lib/persona'

/**
 * «Пик — с 11:00 до 14:00»: the usual window of being in touch (`availabilityProfile.peakWindow`). The «Время» card
 * and the verdict under the poster read this one function, so the window is said the same way in both.
 */
export function usePeakWindow(data: () => ReportDto) {
  const { t } = useI18n()
  const window = computed(() => parseWindow(data().derived.availabilityProfile.peakWindow))
  const hours = computed(() => {
    const peak = window.value
    return peak ? Array.from({ length: peak.length }, (_, index) => (peak.start + index) % 24) : []
  })
  /** The dash held to its numbers. */
  const answer = computed(() =>
    window.value ? t('report.time.peak', { from: window.value.from, to: window.value.to }).replace(/–/gu, '⁠–⁠') : null,
  )
  return { window, hours, answer }
}
