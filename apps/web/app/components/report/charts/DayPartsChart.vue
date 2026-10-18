<script setup lang="ts">
import type { ActivityDistributionDto } from '@tg-analyzer/shared'

const props = defineProps<{
  distribution: ActivityDistributionDto
}>()

const { t, formatNumber } = useI18n()

const items = computed(() => {
  const counts = {
    night: chartCount(props.distribution.night.total),
    morning: chartCount(props.distribution.morning.total),
    afternoon: chartCount(props.distribution.afternoon.total),
    evening: chartCount(props.distribution.evening.total),
  }
  const total = Math.max(
    Object.values(counts).reduce((sum, value) => sum + value, 0),
    1,
  )
  return [
    {
      key: 'night',
      label: t('chat.bucketNight'),
      value: counts.night,
      share: (counts.night / total) * 100,
    },
    {
      key: 'morning',
      label: t('chat.bucketMorning'),
      value: counts.morning,
      share: (counts.morning / total) * 100,
    },
    {
      key: 'afternoon',
      label: t('chat.bucketAfternoon'),
      value: counts.afternoon,
      share: (counts.afternoon / total) * 100,
    },
    {
      key: 'evening',
      label: t('chat.bucketEvening'),
      value: counts.evening,
      share: (counts.evening / total) * 100,
    },
  ]
})
const hasActivity = computed(() => items.value.some((item) => item.value > 0))
</script>

<template>
  <p v-if="!hasActivity" class="t-small distribution-empty">{{ t('common.na') }}</p>
  <div v-else class="distribution">
    <div v-for="item in items" :key="item.key" class="distribution-row">
      <div class="distribution-head">
        <span class="t-small">{{ item.label }}</span>
        <span class="t-num">{{ formatNumber(item.value) }} · {{ Math.round(item.share) }}%</span>
      </div>
      <div class="distribution-track" aria-hidden="true">
        <div class="distribution-fill" :style="{ width: `${item.share}%` }" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.distribution-empty {
  color: var(--text-muted);
}

.distribution {
  flex: 1;
  justify-content: space-evenly;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.distribution-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.distribution-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.distribution-track {
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--surface-2);
  overflow: hidden;
}

.distribution-fill {
  height: 100%;
  background: var(--accent);
}
</style>
