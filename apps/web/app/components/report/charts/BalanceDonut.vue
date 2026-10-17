<script setup lang="ts">
const props = defineProps<{ sent: number; received: number }>()
const { t, formatNumber } = useI18n()

const total = computed(() => props.sent + props.received)
const sentShare = computed(() => (total.value ? (props.sent / total.value) * 100 : 0))
</script>

<template>
  <div
    class="donut"
    :class="{ 'donut--empty': !total }"
    role="img"
    :aria-label="t('chart.balanceSummary', { sent: formatNumber(sent), received: formatNumber(received) })"
    :style="{ '--sent-angle': `${sentShare * 3.6}deg` }"
  >
    <div class="donut__center">
      <strong>{{ total ? `${Math.round(sentShare)}%` : t('common.na') }}</strong>
      <span>{{ t('chart.you') }}</span>
    </div>
  </div>
</template>

<style scoped>
.donut {
  display: grid;
  width: 160px;
  aspect-ratio: 1;
  flex-shrink: 0;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(var(--accent) 0 var(--sent-angle), var(--accent-2) var(--sent-angle) 360deg);
}

.donut--empty {
  background: var(--surface-2);
}

.donut__center {
  display: grid;
  width: 72%;
  aspect-ratio: 1;
  place-content: center;
  border-radius: 50%;
  background: var(--surface);
  text-align: center;
}

.donut__center strong {
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
}

.donut__center span {
  color: var(--text-muted);
  font-size: 12px;
}

@media (max-width: 640px) {
  .donut {
    width: 128px;
  }

  .donut__center strong {
    font-size: 24px;
  }
}
</style>
