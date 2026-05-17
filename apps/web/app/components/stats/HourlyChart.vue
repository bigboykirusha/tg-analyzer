<script setup lang="ts">
import VChart from 'vue-echarts'
import type { DirectionalCountDto } from '@tg-analyzer/shared'
import { CHART_THEME, COLORS } from '~~/utils/chart-theme'

const props = defineProps<{
  activity: Record<string, DirectionalCountDto>
}>()
const { t } = useI18n()
const hasData = computed(() => Object.values(props.activity).some((entry) => (entry?.sent ?? 0) > 0 || (entry?.received ?? 0) > 0))

const option = computed(() => {
  const theme = CHART_THEME.base()
  const hours = Array.from({ length: 24 }, (_, hour) => String(hour))

  return {
    ...theme,
    grid: {
      ...theme.grid,
      top: 20,
      bottom: 24,
    },
    tooltip: {
      ...theme.tooltip,
      trigger: 'axis',
    },
    xAxis: {
      ...theme.xAxis,
      type: 'category',
      data: hours.map((hour) => `${hour}:00`),
    },
    yAxis: {
      ...theme.yAxis,
      type: 'value',
    },
    series: [
      {
        type: 'bar',
        name: t('chart.you'),
        data: hours.map((hour) => props.activity[hour]?.sent ?? 0),
        barMaxWidth: 18,
        itemStyle: {
          color: COLORS.sent(),
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        type: 'bar',
        name: t('chart.them'),
        data: hours.map((hour) => props.activity[hour]?.received ?? 0),
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
