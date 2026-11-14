<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Trophy } from '../../lib/icons'
import type { ReportTile } from './ReportTiles.vue'

/**
 * «Ваши рекорды» as big numbers, two to a row: the longest conversation, the busiest day, the longest pause
 * (who broke it), how many conversations there were and, when it is shorter than the whole chat, the longest
 * run of days. The answer names the day of records when the longest conversation and the busiest day fell on
 * one date; otherwise it is the first record, which then leaves the grid.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatDuration, formatDay, formatNumber } = useI18n()

const report = computed(() => props.data.report)
const day = (value: string | null | undefined) =>
  value ? formatDay(value.slice(0, 10), { day: 'numeric', month: 'long' }) : ''
/** «в июле»: the month a pause began. */
const month = (value: string | null | undefined) =>
  value ? t('report.records.inMonth', { month: formatDay(value.slice(0, 10), { month: 'long' }) }) : null

const facts = computed<ReportTile[]>(() => {
  const { facts: known, sessions } = report.value
  const out: ReportTile[] = []
  const session = sessions.highlights[0]
  if (session)
    out.push({
      key: 'session',
      label: t('report.records.session'),
      value: formatDuration(session.durationSec),
      sub: day(session.startedAt),
    })
  if (known.mostActiveDate)
    out.push({
      key: 'day',
      label: t('report.records.dayCount'),
      value: formatNumber(known.mostActiveDate.total),
      sub: day(known.mostActiveDate.date),
    })
  const gap = known.longestGap
  if (gap)
    out.push({
      key: 'gap',
      label: t('report.records.gap'),
      value:
        gap.seconds < 2 * 86400 ? formatDuration(gap.seconds) : tc('insight.days', Math.round(gap.seconds / 86400)),
      sub:
        gap.brokenByMe === undefined || gap.brokenByMe === null
          ? month(gap.from)
          : t(gap.brokenByMe ? 'report.records.brokenByMe' : 'report.records.brokenByThem', {
              name: props.data.summary.title,
              date: day(gap.to),
            }),
    })
  if (sessions.totalSessions > 1)
    out.push({
      key: 'sessions',
      label: t('report.records.sessions'),
      value: formatNumber(sessions.totalSessions),
      sub: tc('report.records.perSession', sessions.averageSessionMessages, {
        count: formatNumber(sessions.averageSessionMessages),
      }),
    })
  // The run of days lives on the calendar card («Дней подряд»): one number, one place.
  return out
})

const sameDay = computed(() => {
  const session = report.value.sessions.highlights[0]?.startedAt?.slice(0, 10)
  const busiest = report.value.facts.mostActiveDate?.date?.slice(0, 10)
  return session && session === busiest ? session : null
})
/**
 * The answer is the day of records, or else the first record itself with its date — and then that record leaves
 * the grid below, so no number is said twice in one card.
 */
const answer = computed(() => {
  if (sameDay.value) return t('report.records.sameDay', { date: day(sameDay.value) })
  const first = facts.value[0]
  if (!first) return null
  return first.sub ? `${first.label} — ${first.value}, ${first.sub}` : `${first.label} — ${first.value}`
})
const tiles = computed(() => (sameDay.value ? facts.value : facts.value.slice(1)))
</script>

<template>
  <ReportSection v-if="facts.length" :icon="Trophy" :title="t('report.fmt.recordsTitle')" :answer="answer">
    <ReportTiles v-if="tiles.length" :tiles="tiles" />
  </ReportSection>
</template>
