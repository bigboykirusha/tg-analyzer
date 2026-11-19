<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'
import { CalendarDays, Flame } from '../../lib/icons'

/**
 * The calendar of the whole period. In a private chat it also shows a run of consecutive days.
 */
const props = defineProps<{
  data: ReportDto
  streak?: boolean
}>()
const { t, tc, formatNumber } = useI18n()
const days = computed(() => fillDailyGaps(props.data.report.activity.daily))

const activeDays = computed(() => {
  const total = days.value.length
  if (total < 2) return null
  return tc('report.rhythm.activeDays', total, {
    active: formatNumber(days.value.filter((day) => day.total > 0).length),
  })
})
const run = useStreak(
  () => props.data,
  () => Boolean(props.streak),
)
</script>

<template>
  <ReportSection
    v-if="activeDays && run"
    id="part-streak"
    :icon="Flame"
    :title="t('report.main.streakTitle')"
    :figure="run.figure"
    :answer="run.answer"
  >
    <ActivityHeatmap :points="days" />
    <template v-if="!run.all" #note>{{ activeDays }}</template>
  </ReportSection>
  <ReportSection
    v-else-if="activeDays"
    :icon="CalendarDays"
    :title="t('report.rhythm.heatmapTitle')"
    :answer="activeDays"
  >
    <ActivityHeatmap :points="days" />
  </ReportSection>
</template>
