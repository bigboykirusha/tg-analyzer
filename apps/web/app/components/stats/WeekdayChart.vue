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
const values = computed(() =>
  Array.from({ length: 7 }, (_, index) => normalizeChartCount(props.activity[String(index)]?.total)),
)
const total = computed(() => values.value.reduce((sum, value) => sum + value, 0))
const hasData = computed(() => total.value > 0)
const chartDescription = computed(() => t('chart.weekdaySummary', { messages: formatNumber(total.value) }))

const option = computed(() => {
  void preference.value
  const theme = CHART_THEME.base()
  const labels = t('chart.weekdays').split(',')
  return {
    ...theme,
    tooltip: {
      ...theme.tooltip,
      trigger: 'axis',
    },
    xAxis: {
      ...theme.xAxis,
      type: 'category',
      data: labels,
    },
    yAxis: {
      ...theme.yAxis,
      type: 'value',
      minInterval: 1,
    },
    series: [
      {
        type: 'bar',
        data: values.value,
        barMaxWidth: 28,
        itemStyle: {
          color: COLORS.sent(),
          borderRadius: [6, 6, 0, 0],
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
