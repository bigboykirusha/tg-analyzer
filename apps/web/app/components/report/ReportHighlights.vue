<script setup lang="ts">
import { fillDailyGaps, isEven, type ReportDto } from '@tg-analyzer/shared'
import { Flame, Scale, Trophy } from '../../lib/icons'

/**
 * «Главное»: the few findings this chat stands out with, before the details (Health's highlights, Wrapped's
 * one big number). The longest run of days together as a poster in the person's colour when it is a real one,
 * the balance with its split (it carries `#part-balance`), the busiest day. Each is told again in its part
 * below; the numbers come from the same places, so they never differ.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatDay, formatDuration } = useI18n()
const { answer: balanceAnswer, figure: balanceFigure } = useBalance(() => props.data)

const report = computed(() => props.data.report)
const day = (value: string | null) => (value ? formatDay(value.slice(0, 10), { day: 'numeric', month: 'long' }) : '')

/** Seven days in a row and more is worth the poster. */
const streak = computed(() => {
  const run = report.value.facts.maxStreak
  if (!run || run.days < 7) return null
  const total = fillDailyGaps(report.value.activity.daily).length
  return {
    figure: tc('report.habits.days', run.days, { count: formatNumber(run.days) }),
    answer:
      run.days >= total
        ? t('report.main.streakAll')
        : t('report.main.streakFrom', { from: day(run.startDate), to: day(run.endDate) }),
  }
})

const split = computed(() => {
  const { sent, received } = report.value.totals
  const total = sent + received
  if (!total) return null
  const mine = Math.round((100 * sent) / total)
  return { mine, theirs: 100 - mine, even: isEven(sent, received) }
})

/** «52 на 48» when you write about as much; «×1,8» and who it is for otherwise (useBalance). */
const balance = computed(() => {
  if (!balanceAnswer.value || !split.value) return null
  return {
    figure: split.value.even
      ? t('report.main.split', { mine: split.value.mine, theirs: split.value.theirs })
      : balanceFigure.value,
    answer: balanceAnswer.value,
  }
})

const record = computed(() => {
  const busiest = report.value.facts.mostActiveDate
  if (!busiest || busiest.total < 20) return null
  const session = report.value.sessions.highlights[0]
  const sameDay = session?.startedAt.slice(0, 10) === busiest.date.slice(0, 10)
  return {
    figure: tc('common.messagesCount', busiest.total, { count: formatNumber(busiest.total) }),
    answer: sameDay
      ? t('report.main.recordSession', { date: day(busiest.date), duration: formatDuration(session!.durationSec) })
      : t('report.main.recordDay', { date: day(busiest.date) }),
  }
})
</script>

<template>
  <ReportSection
    v-if="streak"
    tone="ink"
    :icon="Flame"
    :title="t('report.main.streakTitle')"
    :figure="streak.figure"
    :answer="streak.answer"
  />
  <ReportSection
    v-if="balance"
    id="part-balance"
    :icon="Scale"
    :title="t('report.balance.title')"
    :figure="balance.figure"
    :answer="balance.answer"
  >
    <div v-if="split" class="split" aria-hidden="true">
      <i class="split__mine" :style="{ flexGrow: split.mine }" />
      <i class="split__theirs" :style="{ flexGrow: split.theirs }" />
    </div>
  </ReportSection>
  <ReportSection
    v-if="record"
    :icon="Trophy"
    :title="t('report.main.recordTitle')"
    :figure="record.figure"
    :answer="record.answer"
  />
</template>

<style scoped>
/* You in ink, the other side in their colour, as every two-sided bar of the report. */
.split {
  display: flex;
  gap: var(--space-0-5);
  height: var(--space-3);
}

.split i {
  flex-basis: 0;
  border-radius: var(--radius-pill);
}

.split__mine {
  background: var(--text);
}

.split__theirs {
  background: var(--them);
}
</style>
