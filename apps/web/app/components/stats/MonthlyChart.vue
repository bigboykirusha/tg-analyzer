<script setup lang="ts">
import VChart from 'vue-echarts'
import type { MonthlyActivityDto } from '@tg-analyzer/shared'
import { CHART_THEME, COLORS } from '~~/utils/chart-theme'

const props = defineProps<{
  items: MonthlyActivityDto[]
}>()
const { formatDate } = useI18n()

const option = computed(() => {
  const theme = CHART_THEME.base()
  const labels = props.items.map((item) => formatDate(`${item.month}-01T00:00:00`, {
    month: 'short',
    year: '2-digit',
  }))

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
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbolSize: 7,
        data: props.items.map((item) => item.total),
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
  <ClientOnly>
    <VChart class="chart chart-lg" :option="option" autoresize />
  </ClientOnly>
</template>

<style scoped>
.chart {
  width: 100%;
}

.chart-lg {
  height: 320px;
}

@media (max-width: 768px) {
  .chart-lg {
    height: 200px;
  }
}
</style>
