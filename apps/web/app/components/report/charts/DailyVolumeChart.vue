<script setup lang="ts">
import type { DatedActivityDto } from '@tg-analyzer/shared'

/** Expects a gap-free daily series (see `fillDailyGaps`). */
const props = defineProps<{ days: DatedActivityDto[] }>()
const { t, formatDay, formatNumber } = useI18n()
const theme = useChartTheme()

const values = computed(() => props.days.map((day) => chartCount(day.total)))
const total = computed(() => values.value.reduce((sum, value) => sum + value, 0))

const option = computed(() => {
  const { base, colors, categoryAxis, valueAxis } = theme.value
  const labels = props.days.map((day) => formatDay(day.date, { day: 'numeric', month: 'short' }))
  return {
    ...base,
    xAxis: {
      ...categoryAxis(labels, { hideOverlap: true }),
      boundaryGap: false,
    },
    yAxis: valueAxis,
    series: [
      {
        type: 'line',
        data: values.value,
        symbol: props.days.length <= 14 ? 'circle' : 'none',
        symbolSize: 6,
        lineStyle: { color: colors.sent, width: 2.5 },
        itemStyle: { color: colors.sent },
        areaStyle: { color: colors.sent, opacity: 0.12 },
      },
    ],
  }
})
</script>

<template>
  <ChartFrame
    :option="option"
    :label="t('chart.dailyVolumeSummary', { days: formatNumber(days.length), messages: formatNumber(total) })"
    :empty="total === 0"
    tall
  />
</template>
