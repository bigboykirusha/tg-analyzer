<script setup lang="ts">
import type { MonthlyActivityDto } from '@tg-analyzer/shared'

const props = defineProps<{ months: MonthlyActivityDto[] }>()
const { t, formatMonth, formatNumber } = useI18n()
const theme = useChartTheme()

const values = computed(() => props.months.map((month) => chartCount(month.total)))
const total = computed(() => values.value.reduce((sum, value) => sum + value, 0))

const labels = computed(() => {
  const months = props.months.map((item) => item.month)
  const multiYear = new Set(months.map((month) => month.slice(0, 4))).size > 1
  return months.map((month, index) => {
    const name = formatMonth(month, { month: 'short' })
    return multiYear && (index === 0 || month.endsWith('-01')) ? `${name} ${month.slice(0, 4)}` : name
  })
})

const option = computed(() => {
  const { base, colors, categoryAxis, valueAxis } = theme.value
  return {
    ...base,
    xAxis: categoryAxis(labels.value),
    yAxis: valueAxis,
    series: [
      {
        type: 'bar',
        data: values.value,
        barMaxWidth: 28,
        itemStyle: { color: colors.sent, borderRadius: [6, 6, 0, 0] },
      },
    ],
  }
})
</script>

<template>
  <ChartFrame
    :option="option"
    :label="t('chart.monthlySummary', { months: formatNumber(months.length), messages: formatNumber(total) })"
    :empty="total === 0"
  />
</template>
