import type { ChatReport, DerivedReportMetrics } from '../api/types'
import { computeActivityDistribution, computeAvailabilityProfile, computeCompositionStats } from './activity'

export function deriveReportMetrics(report: ChatReport): DerivedReportMetrics {
  return {
    activityDistribution: computeActivityDistribution(report.activity.hourly),
    compositionStats: computeCompositionStats({
      totalChars: report.totals.chars,
      textMessageCount: report.totals.textMessages,
      composition: report.composition,
    }),
    availabilityProfile: computeAvailabilityProfile(report.activity.hourly.map((hour) => hour.total)),
  }
}
