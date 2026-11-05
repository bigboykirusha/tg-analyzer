<script setup lang="ts">
import type { EChartsCoreOption } from 'echarts/core'
import VChart from 'vue-echarts'
import '../../../lib/registerECharts'

withDefaults(
  defineProps<{ option: EChartsCoreOption; label: string; empty?: boolean; tall?: boolean; compact?: boolean }>(),
  {
    empty: false,
    tall: false,
    compact: false,
  },
)
const { t } = useI18n()
</script>

<template>
  <div v-if="empty" class="chart-empty t-small">{{ t('chart.noActivity') }}</div>
  <ClientOnly v-else>
    <VChart
      class="chart"
      :class="{ 'chart--tall': tall, 'chart--compact': compact }"
      :option="option"
      role="img"
      :aria-label="label"
      autoresize
    />
    <template #fallback>
      <div class="chart" :class="{ 'chart--tall': tall, 'chart--compact': compact }" />
    </template>
  </ClientOnly>
</template>

<style scoped>
.chart {
  width: 100%;
  height: 300px;
}

.chart--tall {
  height: 340px;
}

.chart--compact {
  height: 220px;
}

.chart-empty {
  padding: var(--space-8);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 640px) {
  .chart,
  .chart--tall,
  .chart--compact {
    height: 220px;
  }
}
</style>
