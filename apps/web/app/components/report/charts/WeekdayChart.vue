<script setup lang="ts">
import type { DirectionalCountDto } from '@tg-analyzer/shared'

const props = defineProps<{ weekday: DirectionalCountDto[] }>()
const { t, formatNumber } = useI18n()
const theme = useChartTheme()

// Reports store Sunday first; charts start the week on Monday.
const order = [1, 2, 3, 4, 5, 6, 0]
const values = computed(() => order.map((day) => chartCount(props.weekday[day]?.total)))
const total = computed(() => values.value.reduce((sum, value) => sum + value, 0))
const peak = computed(() => Math.max(...values.value))

const option = computed(() => {
  const { base, colors, barRadius, categoryAxis, valueAxis } = theme.value
  const names = t('chart.weekdaysShort').split(',')
  return {
    ...base,
    xAxis: categoryAxis(order.map((day) => names[day] ?? '')),
    yAxis: valueAxis,
    series: [
      {
        type: 'bar',
        // The busiest day reads at a glance: it stays solid, the other days step back.
        data: values.value.map((value) => ({
          value,
          itemStyle: { opacity: value === peak.value && value > 0 ? 1 : 0.35 },
        })),
        barMaxWidth: 28,
        itemStyle: { color: colors.text, borderRadius: barRadius },
      },
    ],
  }
})
</script>

<template>
  <ChartFrame
    :option="option"
    :label="t('chart.weekdaySummary', { messages: formatNumber(total) })"
    :empty="total === 0"
    compact
  />
</template>
