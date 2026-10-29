<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'
import type { Fact } from '../ReportFacts.vue'

const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatDecimal, formatMonth, formatPercent } = useI18n()

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

// Milestones live with the timeline: they are moments in time, not habits.
const milestones = computed(() => report.value.milestones ?? [])
const milestoneAuthors = computed(() =>
  milestones.value.map((milestone) => (milestone.mine ? t('report.you') : props.data.summary.title)),
)
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
      <ReportFacts :facts="sessionFacts" :columns="3" />
    </ReportSection>

    <ReportSection
      v-if="milestones.length"
      wide
      :title="t('report.talk.milestonesTitle')"
      :text="t('report.talk.milestonesText')"
    >
      <ReportMilestones :milestones="milestones" :authors="milestoneAuthors" :chat-id="data.summary.chatId" />
    </ReportSection>
  </div>
</template>
