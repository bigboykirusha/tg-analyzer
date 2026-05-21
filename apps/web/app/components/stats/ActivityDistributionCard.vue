<script setup lang="ts">
import type { ActivityDistributionDto } from '@tg-analyzer/shared'

const props = defineProps<{
  distribution: ActivityDistributionDto
  totalMessages: number
}>()

const { t, formatNumber } = useI18n()

const items = computed(() => {
  const total = Math.max(props.totalMessages, 1)
  return [
    { key: 'night', label: t('chat.bucketNight'), value: props.distribution.night.total, share: (props.distribution.night.total / total) * 100 },
    { key: 'morning', label: t('chat.bucketMorning'), value: props.distribution.morning.total, share: (props.distribution.morning.total / total) * 100 },
    { key: 'afternoon', label: t('chat.bucketAfternoon'), value: props.distribution.afternoon.total, share: (props.distribution.afternoon.total / total) * 100 },
    { key: 'evening', label: t('chat.bucketEvening'), value: props.distribution.evening.total, share: (props.distribution.evening.total / total) * 100 },
  ]
})
</script>

<template>
  <div class="distribution">
    <div v-for="item in items" :key="item.key" class="distribution-row">
      <div class="distribution-head">
        <span class="t-small">{{ item.label }}</span>
        <span class="t-mono">{{ formatNumber(item.value) }} · {{ Math.round(item.share) }}%</span>
      </div>
      <div class="distribution-track">
        <div class="distribution-fill" :style="{ width: `${item.share}%` }" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.distribution {
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
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
}

.distribution-fill {
  height: 100%;
  min-width: 4px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 78%, #fff 12%), var(--accent));
}
</style>
