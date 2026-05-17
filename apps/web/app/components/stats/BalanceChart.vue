<script setup lang="ts">
import VChart from 'vue-echarts'
import { CHART_THEME, COLORS } from '~~/utils/chart-theme'

const props = defineProps<{
  sent: number
  received: number
}>()
const { t } = useI18n()
const hasData = computed(() => props.sent + props.received > 0)

const option = computed(() => {
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
        fontFamily: 'DM Sans, sans-serif',
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
          { value: props.sent, name: t('chart.you'), itemStyle: { color: COLORS.sent() } },
          { value: props.received, name: t('chart.them'), itemStyle: { color: COLORS.received() } },
        ],
      },
    ],
  }
})
</script>

<template>
  <div v-if="!hasData" class="chart-empty t-small">{{ t('heatmap.empty') }}</div>
  <ClientOnly v-else>
    <VChart class="chart chart-sm" :option="option" autoresize />
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
