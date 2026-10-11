<script setup lang="ts">
import VChart from 'vue-echarts'
import '../../lib/registerECharts'
import type { MonthlyActivityDto } from '@tg-analyzer/shared'
import { CHART_THEME, COLORS, normalizeChartCount } from '~~/utils/chart-theme'

const props = defineProps<{
  items: MonthlyActivityDto[]
}>()
const { t, formatDate, formatNumber } = useI18n()
const { preference } = useTheme()
const values = computed(() => props.items.map((item) => normalizeChartCount(item.total)))
const total = computed(() => values.value.reduce((sum, value) => sum + value, 0))
const hasData = computed(() => total.value > 0)
const chartDescription = computed(() =>
  t('chart.monthlySummary', { months: formatNumber(props.items.length), messages: formatNumber(total.value) }),
)

const option = computed(() => {
  void preference.value
  const theme = CHART_THEME.base()
  const labels = props.items.map((item) =>
    formatDate(`${item.month}-01T00:00:00`, {
      month: 'short',
      year: '2-digit',
    }),
  )

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
        type: 'line',
        smooth: true,
        symbolSize: 7,
        data: values.value,
        areaStyle: {
          color: COLORS.accentMuted(),
        },
        lineStyle: {
          color: COLORS.sent(),
          width: 3,
        },
        itemStyle: {
          color: COLORS.sent(),
        },
      },
    ],
  }
})
</script>

<template>
  <div v-if="!hasData" class="chart-empty t-small">{{ t('chart.noActivity') }}</div>
  <ClientOnly v-else>
    <VChart class="chart chart-lg" :option="option" role="img" :aria-label="chartDescription" autoresize />
  </ClientOnly>
</template>

<style scoped>
.chart {
  width: 100%;
}

.chart-lg {
  height: 320px;
}

.chart-empty {
  padding: var(--space-8);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 768px) {
  .chart-lg {
    height: 200px;
  }
}
</style>
