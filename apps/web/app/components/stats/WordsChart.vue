<script setup lang="ts">
import VChart from 'vue-echarts'
import type { TopItemDto } from '@tg-analyzer/shared'
import { CHART_THEME, COLORS } from '~~/utils/chart-theme'

const props = defineProps<{
  mine: TopItemDto[]
  theirs: TopItemDto[]
}>()
const { t } = useI18n()
const hasData = computed(() => props.mine.length > 0 || props.theirs.length > 0)
const isMobile = ref(false)

function syncMobileState() {
  if (!import.meta.client) {
    isMobile.value = false
    return
  }

  isMobile.value = window.innerWidth <= 640
}

const option = computed(() => {
  const theme = CHART_THEME.base()
  const merged = new Map<string, number>()
  for (const item of props.mine) {
    merged.set(item.value, (merged.get(item.value) ?? 0) + item.count)
  }
  for (const item of props.theirs) {
    merged.set(item.value, (merged.get(item.value) ?? 0) + item.count)
  }
  const labels = Array.from(merged.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([value]) => value)

  return {
    ...theme,
    tooltip: {
      ...theme.tooltip,
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      top: 0,
      textStyle: {
        color: COLORS.text(),
        fontFamily: 'DM Sans, sans-serif',
      },
    },
    grid: {
      ...theme.grid,
      top: 36,
      left: isMobile.value ? 52 : 88,
      right: isMobile.value ? 10 : theme.grid.right,
      bottom: isMobile.value ? 18 : theme.grid.bottom,
    },
    xAxis: {
      ...theme.xAxis,
      type: 'value',
    },
    yAxis: {
      ...theme.yAxis,
      type: 'category',
      inverse: true,
      data: labels,
    },
    series: [
      {
        type: 'bar',
        name: t('chart.you'),
        data: labels.map((label) => props.mine.find((item) => item.value === label)?.count ?? 0),
        barMaxWidth: 14,
        itemStyle: {
          color: COLORS.sent(),
          borderRadius: [0, 6, 6, 0],
        },
      },
      {
        type: 'bar',
        name: t('chart.them'),
        data: labels.map((label) => props.theirs.find((item) => item.value === label)?.count ?? 0),
        barMaxWidth: 14,
        itemStyle: {
          color: COLORS.received(),
          borderRadius: [0, 6, 6, 0],
        },
      },
    ],
  }
})

onMounted(() => {
  syncMobileState()
  if (import.meta.client) {
    window.addEventListener('resize', syncMobileState)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', syncMobileState)
  }
})
</script>

<template>
  <div v-if="!hasData" class="chart-empty t-small">{{ t('heatmap.empty') }}</div>
  <ClientOnly v-else>
    <VChart class="chart chart-words" :option="option" autoresize />
  </ClientOnly>
</template>

<style scoped>
.chart {
  width: 100%;
}

.chart-words {
  height: 420px;
}

.chart-empty {
  padding: var(--space-8);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 768px) {
  .chart-words {
    height: 280px;
  }
}

@media (max-width: 640px) {
  .chart-words {
    height: 300px;
    margin-left: calc(var(--space-2) * -1);
  }
}
</style>
