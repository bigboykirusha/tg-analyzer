<script setup lang="ts">
/** How fast each side answers: the share of its answers that fall into each time bucket. */
const props = defineProps<{ histogram: { mine: number[]; theirs: number[] }; receivedLabel?: string }>()
const { t, formatPercent } = useI18n()
const theme = useChartTheme()

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
const share = (values: number[]) => {
  const total = sum(values)
  return values.map((value) => (total ? Math.round((value / total) * 1000) / 10 : 0))
}
const empty = computed(() => sum(props.histogram.mine) + sum(props.histogram.theirs) === 0)
const label = computed(() => t('chart.replySpeedSummary'))

const option = computed(() => {
  const { base, colors, barRadius, categoryAxis, valueAxis } = theme.value
  const bar = (name: string, data: number[], color: string) => ({
    type: 'bar',
    name,
    data,
    barMaxWidth: 28,
    itemStyle: { color, borderRadius: barRadius },
  })
  return {
    ...base,
    tooltip: { ...base.tooltip, valueFormatter: (value: unknown) => formatPercent(Number(value), 1) },
    grid: { ...base.grid, bottom: 40 },
    xAxis: categoryAxis(t('chart.replyBuckets').replaceAll(' ', '\u00a0').split(','), { interval: 0 }),
    yAxis: { ...valueAxis, minInterval: 0, axisLabel: { ...valueAxis.axisLabel, formatter: (v: number) => `${v}%` } },
    series: [
      bar(t('chart.you'), share(props.histogram.mine), colors.sent),
      bar(props.receivedLabel ?? t('chart.them'), share(props.histogram.theirs), colors.received),
    ],
  }
})
</script>

<template>
  <ChartFrame :option="option" :label="label" :empty="empty" />
</template>
