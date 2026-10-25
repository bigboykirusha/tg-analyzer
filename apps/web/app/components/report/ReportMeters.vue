<script setup lang="ts">
export interface Meter {
  key: string
  label: string
  /** 0–100, or null when unknown. */
  value: number | null
  detail?: string
  /** The bar of the current user, drawn in «your» colour. */
  self?: boolean
}

defineProps<{ meters: Meter[] }>()
const { formatPercent } = useI18n()
</script>

<template>
  <div class="meters">
    <div v-for="meter in meters" :key="meter.key" class="meter" :class="{ 'meter--self': meter.self }">
      <div class="meter__heading">
        <span>{{ meter.label }}</span>
        <strong class="meter__value">{{ formatPercent(meter.value) }}</strong>
      </div>
      <div
        v-if="meter.value !== null"
        class="meter__track"
        role="meter"
        :aria-label="meter.label"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="meter.value"
      >
        <span :style="{ width: `${Math.min(100, Math.max(0, meter.value))}%` }" />
      </div>
      <span v-if="meter.detail" class="meter__detail">{{ meter.detail }}</span>
    </div>
  </div>
</template>

<style scoped>
.meters {
  display: grid;
  gap: var(--space-5);
}

.meter {
  display: grid;
  gap: var(--space-2);
}

.meter__heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  font: var(--text-ui);
}

.meter__value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.meter--self .meter__track span {
  background: var(--you);
}

.meter--self .meter__heading span {
  color: var(--you-ink);
  font-weight: 600;
}

.meter__detail {
  color: var(--text-muted);
  font: var(--text-small);
}

.meter__track {
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--surface-2);
}

.meter__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--text);
  transition: width var(--transition-slow);
}
</style>
