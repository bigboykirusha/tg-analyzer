<script setup lang="ts">
import VChart from 'vue-echarts'
import '../../lib/registerECharts'
import { CHART_THEME, COLORS, normalizeChartCount } from '~~/utils/chart-theme'

const props = defineProps<{
  sent: number
  received: number
}>()
const { t, formatNumber } = useI18n()
const { preference } = useTheme()
const sent = computed(() => normalizeChartCount(props.sent))
const received = computed(() => normalizeChartCount(props.received))
const hasData = computed(() => sent.value + received.value > 0)
const chartDescription = computed(() =>
  t('chart.balanceSummary', { sent: formatNumber(sent.value), received: formatNumber(received.value) }),
)

const option = computed(() => {
  void preference.value
  const theme = CHART_THEME.base()
  return {
    ...theme,
    tooltip: {
      ...theme.tooltip,
      trigger: 'item',
    },
    legend: {
      bottom: 0,
      icon: 'circle',
      textStyle: {
        color: COLORS.text(),
        fontFamily: 'Inter, system-ui, sans-serif',
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['58%', '78%'],
        center: ['50%', '42%'],
        label: { show: false },
        itemStyle: {
          borderColor: 'transparent',
          borderWidth: 4,
        },
        data: [
          { value: sent.value, name: t('chart.you'), itemStyle: { color: COLORS.sent() } },
          { value: received.value, name: t('chart.them'), itemStyle: { color: COLORS.received() } },
        ],
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
