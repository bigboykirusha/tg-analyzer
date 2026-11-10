<script setup lang="ts">
import { fillDailyGaps, type PublicReportDto } from '@tg-analyzer/shared'
import { parseWindow } from '../../lib/persona'

/**
 * A report opened by a shared link, without signing in: the main things on one screen — who writes
 * more, who replies faster, the hours, the days — and, when the author allowed it, the words. Names
 * are the author's and the other side's («Автор» and «Собеседник» when hidden); «вы» is never said,
 * because the reader is the other side. It ends on an invitation to one's own report.
 *
 * A phone folds reply time, the peak and the days into one tile «Коротко» and floats the invitation.
 */
const props = defineProps<{ share: PublicReportDto }>()
const { t, tc, formatNumber, formatDuration, formatDay } = useI18n()
const wide = useMediaQuery('(min-width: 641px)')

const data = computed(() => {
  const value = props.share.data
  return { ...value, summary: { ...value.summary, title: value.summary.title || t('share.partner') } }
})
const report = computed(() => data.value.report)
const author = computed(() => (props.share.settings.showName ? props.share.author : t('share.author')))
const partner = computed(() => data.value.summary.title)
provideReportAuthor(() => author.value)

const days = computed(() => fillDailyGaps(report.value.activity.daily))
const heading = computed(() => t('publicReport.pair', { me: author.value, name: partner.value }))
const lede = computed(() => {
  const messages = tc('common.messagesCount', report.value.totals.messages)
  const first = days.value[0]?.date
  return first
    ? t('publicReport.lede', {
        name: author.value,
        messages,
        date: formatDay(first, { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s?г\.$/u, ''),
      })
    : messages
})

const versus = useVersus(() => data.value)
const mineShare = computed(() => {
  const totals = report.value.totals
  return totals.messages ? Math.round((totals.sent / totals.messages) * 100) : null
})
const shareAnswer = computed(() => {
  const share = mineShare.value
  if (share === null) return null
  if (share > 55) return t('publicReport.writesMore', { name: author.value })
  if (share < 45) return t('publicReport.writesMore', { name: partner.value })
  return t('report.kpi.even')
})
const speed = computed(() => versus.value.speed ?? null)
const speedAnswer = computed(() => {
  const item = speed.value
  if (!item) return null
  if (!item.lead) return t('report.fmt.speedEven')
  return t('publicReport.repliesFaster', { name: item.lead === 'mine' ? author.value : partner.value, note: item.note })
})

const peak = computed(() => parseWindow(data.value.derived.availabilityProfile.peakWindow))
const peakHours = computed(() => {
  const window = peak.value
  return window ? Array.from({ length: window.length }, (_, index) => (window.start + index) % 24) : undefined
})
const peakAnswer = computed(() =>
  peak.value ? t('report.time.peak', { from: peak.value.from, to: peak.value.to }) : null,
)
const activeDays = computed(() => {
  const total = days.value.length
  if (!total) return null
  return tc('report.rhythm.activeDays', total, {
    active: formatNumber(days.value.filter((day) => day.total > 0).length),
  })
})

/** The phone's «Коротко»: the same three answers as rows. */
const brief = computed(() => {
  const rows: { key: string; label: string; value: string }[] = []
  const { medianMineSec: mine, medianTheirsSec: theirs } = report.value.responses
  if (mine !== null && theirs !== null)
    rows.push({
      key: 'reply',
      label: t('publicReport.briefReply'),
      value:
        formatDuration(mine) === formatDuration(theirs)
          ? t('publicReport.bothIn', { time: formatDuration(mine) })
          : t('publicReport.replyPair', { mine: formatDuration(mine), theirs: formatDuration(theirs) }),
    })
  if (peak.value)
    rows.push({
      key: 'peak',
      label: t('publicReport.briefPeak'),
      value: t('share.window', { from: peak.value.from, to: peak.value.to }),
    })
  const total = days.value.length
  if (total)
    rows.push({
      key: 'days',
      label: t('publicReport.briefDays'),
      value: tc('share.daysOf', total, { active: formatNumber(days.value.filter((day) => day.total > 0).length) }),
    })
  return rows
})
const words = computed(() => props.share.settings.words && report.value.vocabulary.topWords.length > 0)
</script>

<template>
  <div class="guest">
    <ReportPoster :data="data" :heading="heading" :lede="lede" />
    <UiPageContainer>
      <div class="guest__grid">
        <h2 class="sr-only">{{ t('publicReport.mainTitle') }}</h2>
        <ReportSection :title="t('report.kpi.whoWritesMore')" :answer="shareAnswer">
          <ReportLine
            v-if="mineShare !== null"
            size="lg"
            :mine="report.totals.sent"
            :theirs="report.totals.received"
            :right-name="partner"
            :left="`${mineShare}%`"
            :right="`${100 - mineShare}%`"
          />
        </ReportSection>

        <ReportSection v-if="!wide && brief.length" :title="t('publicReport.briefTitle')">
          <ReportFacts :facts="brief" />
        </ReportSection>

        <template v-if="wide">
          <ReportSection v-if="speed" :title="t('report.duel.speed')" :answer="speedAnswer">
            <ReportLine
              size="lg"
              :bar="false"
              :mine="speed.pairs[0]!.mine.value"
              :theirs="speed.pairs[0]!.theirs.value"
              :right-name="partner"
              :left="speed.pairs[0]!.mine.text"
              :right="speed.pairs[0]!.theirs.text"
            />
          </ReportSection>
          <ReportSection v-if="peak" :title="t('report.fmt.clockTitle')" :answer="peakAnswer">
            <HourlyChart :hourly="report.activity.hourly" :peak="peakHours" />
          </ReportSection>
          <ReportSection class="guest__days" :title="t('report.rhythm.heatmapTitle')" :answer="activeDays">
            <ActivityHeatmap :points="days" />
          </ReportSection>
        </template>

        <template v-if="words">
          <ReportWordOfChat :data="data" />
          <ReportVocabulary :data="data" />
          <ReportEmoji :data="data" />
        </template>

        <section v-if="wide" class="tile guest__invite">
          <h2 class="guest__invite-title">{{ t('publicReport.endTitle') }}</h2>
          <p class="guest__invite-text">{{ t('publicReport.endText') }}</p>
          <UiButton class="guest__invite-action" variant="primary" block to="/login">{{
            t('publicReport.cta')
          }}</UiButton>
        </section>
      </div>
    </UiPageContainer>
    <UiButton v-if="!wide" class="guest__fab" variant="primary" size="lg" to="/login">{{
      t('publicReport.cta')
    }}</UiButton>
  </div>
</template>

<style scoped>
.guest__grid {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
  padding: var(--space-4) 0 var(--fab-clearance);
}

/* The invitation floats above the content on a phone, in reach of the thumb. */
.guest__fab {
  position: fixed;
  z-index: var(--z-dock);
  bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
  left: 50%;
  box-shadow: var(--shadow-float);
  transform: translateX(-50%);
  white-space: nowrap;
}

.guest__invite {
  gap: var(--space-2);
}

.guest__invite-title {
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
}

.guest__invite-text {
  color: var(--text-muted);
  font: var(--text-small);
}

.guest__invite-action {
  margin-top: auto;
}

@media (min-width: 641px) {
  .guest__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: var(--space-8) 0 0;
  }

  .guest__grid :deep(.report-section--wide) {
    grid-column: 1 / -1;
  }
}

/* Desktop: three tiles a row; the days take two, the invitation closes the row. */
@media (min-width: 901px) {
  .guest__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .guest__days {
    grid-column: span 2;
  }
}
</style>
