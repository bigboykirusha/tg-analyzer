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
        // The whole chat in grey; the busiest day takes the strong step, so it reads at a glance.
        data: values.value.map((value) => ({
          value,
          itemStyle: { color: value === peak.value && value > 0 ? colors.neutralStrong : colors.neutral },
        })),
        barMaxWidth: 28,
        itemStyle: { borderRadius: barRadius },
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
