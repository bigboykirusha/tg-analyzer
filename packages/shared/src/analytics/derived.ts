import type { ChatReport, DerivedReportMetrics, ProfanityMode, ReportSnapshotDto } from '../api/types'
import { computeActivityDistribution, computeAvailabilityProfile, computeCompositionStats } from './activity'
import { deriveFavourites } from './favourites'
import { deriveHabits } from './habits'
import { deriveInsights } from './insights'
import { deriveQuiz } from './quiz'
import { deriveWords, reportHasProfanity } from './words'

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

export interface DeriveOptions {
  /** `shown` keeps obscene words in `words.view`: the owner's own report only. Default `hidden`. */
  profanity?: ProfanityMode
}

export function deriveReportMetrics(report: ChatReport, options: DeriveOptions = {}): DerivedReportMetrics {
  const profanity = options.profanity ?? 'hidden'
  const clean = deriveWords(report, 'hidden')
  return {
    activityDistribution: computeActivityDistribution(report.activity.hourly),
    compositionStats: computeCompositionStats({
      totalChars: report.totals.chars,
      textMessageCount: report.totals.textMessages,
      composition: report.composition,
    }),
    availabilityProfile: computeAvailabilityProfile(report.activity.hourly.map((hour) => hour.total)),
    insights: deriveInsights(report),
    quiz: deriveQuiz(report),
    habitRows: deriveHabits(report),
    words: {
      profanity,
      hasProfanity: reportHasProfanity(report),
      view: profanity === 'hidden' ? clean : deriveWords(report, 'shown'),
      clean,
    },
    favourites: deriveFavourites(report),
  }
}
