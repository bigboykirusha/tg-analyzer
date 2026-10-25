<script setup lang="ts">
import { fillDailyGaps, type ReportDto, type SessionHighlightDto } from '@tg-analyzer/shared'
import type { Fact } from '../ReportFacts.vue'

const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatDecimal, formatDuration, formatMonth, formatDate, formatPercent } = useI18n()

const report = computed(() => props.data.report)
const facts = computed(() => report.value.facts)
const sessions = computed(() => report.value.sessions)
const days = computed(() => fillDailyGaps(report.value.activity.daily))
const silenceDays = computed(() =>
  Math.round(facts.value.silencesOver30Days.reduce((sum, gap) => sum + gap.seconds, 0) / 86400),
)

const summaryFacts = computed<Fact[]>(() => [
  { key: 'month', label: t('report.timeline.mostActiveMonth'), value: formatMonth(facts.value.mostActiveMonth) },
  { key: 'trend', label: t('report.timeline.trend'), value: t(`report.trend.${facts.value.trend}`) },
  {
    key: 'streak',
    label: t('report.timeline.streak'),
    value: tc('report.timeline.days', facts.value.maxStreak.days),
  },
  {
    key: 'silences',
    label: t('report.timeline.silences'),
    value: formatNumber(facts.value.silencesOver30Days.length),
    sub: silenceDays.value ? tc('report.timeline.silenceDays', silenceDays.value) : null,
  },
])

const sessionFacts = computed<Fact[]>(() => [
  {
    key: 'perWeek',
    label: t('report.sessions.perWeek'),
    value: formatDecimal(sessions.value.sessionsPerActiveWeek),
    sub: t('report.sessions.perWeekHint'),
  },
  {
    key: 'size',
    label: t('report.sessions.averageSize'),
    value: formatNumber(sessions.value.averageSessionMessages),
    sub: t('report.sessions.averageSizeHint'),
  },
  {
    key: 'night',
    label: t('report.sessions.night'),
    value: formatPercent(sessions.value.nightSessionsPct),
    sub: t('report.sessions.nightHint'),
  },
])

function highlightLabel(index: number) {
  return t(index === 0 ? 'report.sessions.densest' : 'report.sessions.longestOne')
}

function range(session: SessionHighlightDto) {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
  return `${formatDate(session.startedAt, options)} – ${formatDate(session.endedAt, options)}`
}
</script>

<template>
  <div class="report-grid">
    <ReportSection :title="t('report.timeline.title')" :text="t('report.timeline.text')" wide>
      <DailyVolumeChart :days="days" />
    </ReportSection>

    <ReportSection :title="t('report.timeline.factsTitle')" wide>
      <ReportFacts :facts="summaryFacts" :columns="2" />
    </ReportSection>

    <ReportSection :title="t('report.sessions.title')" :text="t('report.sessions.text')" wide>
      <!-- The longest conversation is a highlight below, with its dates. -->
      <ReportFacts :facts="sessionFacts" :columns="3" />
      <div v-if="sessions.highlights.length" class="highlights">
        <div v-for="(session, index) in sessions.highlights" :key="session.startedAt" class="highlight">
          <span class="t-label">{{ highlightLabel(index) }}</span>
          <strong>{{ tc('common.messagesCount', session.totalMessages) }}</strong>
          <span class="t-small t-muted">{{ range(session) }}</span>
          <span class="t-small t-muted">
            {{ formatDuration(session.durationSec) }} ·
            {{
              t('report.sessions.split', {
                mine: formatNumber(session.sentMessages),
                theirs: formatNumber(session.receivedMessages),
              })
            }}
          </span>
        </div>
      </div>
    </ReportSection>
  </div>
</template>

<style scoped>
.highlights {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5) var(--space-6);
}

/* Ruled like the facts above. */
.highlight {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

.highlight strong {
  font: var(--text-title);
}

@media (max-width: 640px) {
  .highlights {
    grid-template-columns: 1fr;
  }
}
</style>
