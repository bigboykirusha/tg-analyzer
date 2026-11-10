<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'
import type { Fact } from './ReportFacts.vue'

/**
 * «Ваши рекорды» as rows of facts (a ledger on desktop): the longest conversation, the busiest day,
 * the longest pause and, when it is shorter than the whole chat, the longest run of days. The answer
 * names the day of records when the longest conversation and the busiest day fell on one date.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatDuration, formatDay } = useI18n()

const report = computed(() => props.data.report)
const day = (value: string | null | undefined) =>
  value ? formatDay(value.slice(0, 10), { day: 'numeric', month: 'long' }) : ''
/** «в июле»: the month a pause began. */
const month = (value: string | null | undefined) =>
  value ? t('report.records.inMonth', { month: formatDay(value.slice(0, 10), { month: 'long' }) }) : null

const facts = computed<Fact[]>(() => {
  const { facts: known, sessions } = report.value
  const out: Fact[] = []
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
      label: t('report.records.day'),
      value: tc('common.messagesCount', known.mostActiveDate.total),
      sub: day(known.mostActiveDate.date),
    })
  const gap = known.longestGap
  if (gap)
    out.push({
      key: 'gap',
      label: t('report.records.gap'),
      value: tc('insight.days', Math.max(1, Math.round(gap.seconds / 86400))),
      sub: month(gap.from),
    })
  // A streak as long as the whole chat is the calendar's answer («208 из 208 дней»), not a record.
  const streak = known.maxStreak
  if (streak.days > 1 && streak.days < fillDailyGaps(report.value.activity.daily).length)
    out.push({ key: 'streak', label: t('report.records.streak'), value: tc('insight.days', streak.days) })
  return out
})

const answer = computed(() => {
  const session = report.value.sessions.highlights[0]?.startedAt?.slice(0, 10)
  const busiest = report.value.facts.mostActiveDate?.date?.slice(0, 10)
  if (session && session === busiest) return t('report.records.sameDay', { date: day(session) })
  const first = facts.value[0]
  return first ? `${first.label} — ${first.value}` : null
})
</script>

<template>
  <ReportSection v-if="facts.length" wide :title="t('report.fmt.recordsTitle')" :answer="answer">
    <ReportFacts :facts="facts" columns />
  </ReportSection>
</template>
