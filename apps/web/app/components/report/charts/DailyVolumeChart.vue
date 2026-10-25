<script setup lang="ts">
import type { DatedActivityDto } from '@tg-analyzer/shared'

/** Expects a gap-free daily series (see `fillDailyGaps`). */
const props = defineProps<{ days: DatedActivityDto[] }>()
const { t, formatDay, formatNumber } = useI18n()
const theme = useChartTheme()

/** Past ~4 months a line of days is noise; weeks show the trend. */
const WEEKLY_AFTER_DAYS = 120

const weekly = computed(() => props.days.length > WEEKLY_AFTER_DAYS)
/** Days, or 7-day buckets from the first day, each labelled by its first date. */
const points = computed(() => {
  if (!weekly.value) return props.days.map((day) => ({ date: day.date, value: chartCount(day.total) }))
  const buckets: { date: string; value: number }[] = []
  props.days.forEach((day, index) => {
    if (index % 7 === 0) buckets.push({ date: day.date, value: 0 })
    buckets[buckets.length - 1]!.value += chartCount(day.total)
  })
  return buckets
})
const total = computed(() => points.value.reduce((sum, point) => sum + point.value, 0))

const option = computed(() => {
  const { base, colors, categoryAxis, valueAxis } = theme.value
  const labels = points.value.map((point) => formatDay(point.date, { day: 'numeric', month: 'short' }))
  return {
    ...base,
    tooltip: {
      ...base.tooltip,
      formatter: (items: { dataIndex: number; value: number }[]) => {
        const item = items[0]
        if (!item) return ''
        const day = labels[item.dataIndex] ?? ''
        const when = weekly.value ? t('chart.weekOf', { day }) : day
        return `${when}<br><b>${formatNumber(item.value)}</b>`
      },
    },
    xAxis: {
      ...categoryAxis(labels, { hideOverlap: true }),
      boundaryGap: false,
    },
    yAxis: valueAxis,
    series: [
      {
        type: 'line',
        data: points.value.map((point) => point.value),
        smooth: weekly.value ? 0.3 : false,
        symbol: points.value.length <= 14 ? 'circle' : 'none',
        symbolSize: 6,
        lineStyle: { color: colors.text, width: 1.5 },
        itemStyle: { color: colors.text },
        areaStyle: { color: colors.text, opacity: 0.08 },
      },
    ],
  }
})
</script>

<template>
  <div class="volume">
    <p class="volume__scale t-small t-muted">{{ weekly ? t('chart.perWeek') : t('chart.perDay') }}</p>
    <ChartFrame
      :option="option"
      :label="t('chart.dailyVolumeSummary', { days: formatNumber(days.length), messages: formatNumber(total) })"
      :empty="total === 0"
      tall
    />
  </div>
</template>

<style scoped>
.volume {
  display: grid;
  gap: var(--space-2);
}
</style>
