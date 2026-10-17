<script setup lang="ts">
import type { DirectionalCountDto } from '@tg-analyzer/shared'

const props = defineProps<{ hourly: DirectionalCountDto[]; receivedLabel?: string }>()
const { t, formatNumber } = useI18n()
const theme = useChartTheme()

const sent = computed(() => props.hourly.map((hour) => chartCount(hour.sent)))
const received = computed(() => props.hourly.map((hour) => chartCount(hour.received)))
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
const label = computed(() =>
  t('chart.hourlySummary', { sent: formatNumber(sum(sent.value)), received: formatNumber(sum(received.value)) }),
)

const option = computed(() => {
  const { base, colors, categoryAxis, valueAxis } = theme.value
  const bar = (name: string, data: number[], color: string) => ({
    type: 'bar',
    name,
    data,
    barMaxWidth: 18,
    itemStyle: { color, borderRadius: [4, 4, 0, 0] },
  })
  return {
    ...base,
    grid: { ...base.grid, top: 40, bottom: 24 },
    xAxis: categoryAxis(
      props.hourly.map((_, hour) => `${hour}:00`),
      { interval: 2 },
    ),
    yAxis: valueAxis,
    series: [
      bar(t('chart.you'), sent.value, colors.sent),
      bar(props.receivedLabel ?? t('chart.them'), received.value, colors.received),
    ],
  }
})
</script>

<template>
  <ChartFrame :option="option" :label="label" :empty="sum(sent) + sum(received) === 0" />
</template>
