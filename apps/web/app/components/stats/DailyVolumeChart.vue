<script setup lang="ts">
import VChart from 'vue-echarts'
import type { DatedActivityDto } from '@tg-analyzer/shared'
import { CHART_THEME, COLORS } from '~~/utils/chart-theme'

const props = defineProps<{
  items: DatedActivityDto[]
}>()

const { formatDate } = useI18n()
const { t } = useI18n()
const hasData = computed(() => props.items.some((item) => item.total > 0))

const option = computed(() => {
  const theme = CHART_THEME.base()
  const labels = props.items.map((item, index) => {
    if (!props.items.length) {
      return ''
    }

    const stride = Math.max(1, Math.ceil(props.items.length / 6))
    if (index % stride !== 0 && index !== props.items.length - 1) {
      return ''
    }

    return formatDate(`${item.date}T00:00:00`, {
      month: 'short',
      day: 'numeric',
    })
  })

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
      boundaryGap: false,
    },
    yAxis: {
      ...theme.yAxis,
      type: 'value',
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'none',
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
  <div v-if="!hasData" class="chart-empty t-small">{{ t('heatmap.empty') }}</div>
  <ClientOnly v-else>
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
