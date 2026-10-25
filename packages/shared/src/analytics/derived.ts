import type { ChatReport, DerivedReportMetrics, ReportSnapshotDto } from '../api/types'
import { computeActivityDistribution, computeAvailabilityProfile, computeCompositionStats } from './activity'
import { deriveInsights } from './insights'

/** Headline numbers of a stored report, so a re-analysis can show what changed. */
export function snapshotReport(report: ChatReport, analyzedAt: Date): ReportSnapshotDto {
  return {
    analyzedAt: analyzedAt.toISOString(),
    messages: report.totals.messages,
    sent: report.totals.sent,
    received: report.totals.received,
    medianMineSec: report.responses?.medianMineSec ?? null,
    medianTheirsSec: report.responses?.medianTheirsSec ?? null,
    iWriteFirstPct: report.responses?.iWriteFirstPct ?? null,
  }
}

export function deriveReportMetrics(report: ChatReport): DerivedReportMetrics {
  return {
    activityDistribution: computeActivityDistribution(report.activity.hourly),
    compositionStats: computeCompositionStats({
      totalChars: report.totals.chars,
      textMessageCount: report.totals.textMessages,
      composition: report.composition,
    }),
    availabilityProfile: computeAvailabilityProfile(report.activity.hourly.map((hour) => hour.total)),
    insights: deriveInsights(report),
  }
}
