<script setup lang="ts">
import VChart from 'vue-echarts'
import '../../lib/registerECharts'
import type { DirectionalCountDto } from '@tg-analyzer/shared'
import { CHART_THEME, COLORS, normalizeChartCount } from '~~/utils/chart-theme'

const props = defineProps<{
  activity: Record<string, DirectionalCountDto>
}>()
const { t, formatNumber } = useI18n()
const { preference } = useTheme()
const hours = Array.from({ length: 24 }, (_, hour) => String(hour))
const sent = computed(() => hours.map((hour) => normalizeChartCount(props.activity[hour]?.sent)))
const received = computed(() => hours.map((hour) => normalizeChartCount(props.activity[hour]?.received)))
const sentTotal = computed(() => sent.value.reduce((sum, value) => sum + value, 0))
const receivedTotal = computed(() => received.value.reduce((sum, value) => sum + value, 0))
const hasData = computed(() => sentTotal.value + receivedTotal.value > 0)
const chartDescription = computed(() =>
  t('chart.hourlySummary', {
    sent: formatNumber(sentTotal.value),
    received: formatNumber(receivedTotal.value),
  }),
)

const option = computed(() => {
  void preference.value
  const theme = CHART_THEME.base()
  return {
    ...theme,
    grid: {
      ...theme.grid,
      top: 40,
      bottom: 24,
    },
    tooltip: {
      ...theme.tooltip,
      trigger: 'axis',
    },
    legend: {
      top: 0,
      icon: 'circle',
      textStyle: {
        color: COLORS.text(),
        fontFamily: 'Inter, system-ui, sans-serif',
      },
    },
    xAxis: {
      ...theme.xAxis,
      type: 'category',
      data: hours.map((hour) => `${hour}:00`),
      axisLabel: {
        ...theme.xAxis.axisLabel,
        interval: 2,
      },
    },
    yAxis: {
      ...theme.yAxis,
      type: 'value',
      minInterval: 1,
    },
    series: [
      {
        type: 'bar',
        name: t('chart.you'),
        data: sent.value,
        barMaxWidth: 18,
        itemStyle: {
          color: COLORS.sent(),
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        type: 'bar',
        name: t('chart.them'),
        data: received.value,
        barMaxWidth: 18,
        itemStyle: {
          color: COLORS.received(),
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  }
})
</script>

<template>
  <div v-if="!hasData" class="chart-empty t-small">{{ t('chart.noActivity') }}</div>
  <ClientOnly v-else>
    <VChart class="chart chart-sm" :option="option" role="img" :aria-label="chartDescription" autoresize />
  </ClientOnly>
</template>

<style scoped>
.chart {
  width: 100%;
}

.chart-sm {
  height: 300px;
}

.chart-empty {
  padding: var(--space-8);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 768px) {
  .chart-sm {
    height: 200px;
  }
}
</style>
