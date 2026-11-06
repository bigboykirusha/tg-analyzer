<script setup lang="ts">
/**
 * The one comparison line of the report: «value ━━━━ ━━ value», you in ink on the left, the
 * other side in lime on the right. The values default to the two shares in percent.
 */
const props = defineProps<{ mine: number; theirs: number; left?: string; right?: string; label?: string }>()
const { formatPercent } = useI18n()

const total = computed(() => props.mine + props.theirs)
const share = (value: number) => (total.value ? (value / total.value) * 100 : 50)
</script>

<template>
  <div class="report-line t-num" role="img" :aria-label="label ?? `${left ?? ''} / ${right ?? ''}`">
    <span>{{ left ?? formatPercent(share(mine)) }}</span>
    <i class="report-line__bar" aria-hidden="true">
      <b :style="{ flexGrow: share(mine) }" />
      <b :style="{ flexGrow: share(theirs) }" />
    </i>
    <span>{{ right ?? formatPercent(share(theirs)) }}</span>
  </div>
</template>

<style scoped>
.report-line {
  display: grid;
  grid-template-columns: minmax(4ch, auto) minmax(0, 1fr) minmax(4ch, auto);
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}

.report-line > span:last-child {
  text-align: right;
}

.report-line__bar {
  display: flex;
  gap: var(--space-1);
  height: var(--bar-height);
}

.report-line__bar b {
  min-width: var(--bar-height);
  border-radius: var(--radius-full);
  background: var(--you);
}

.report-line__bar b + b {
  background: var(--them);
}
</style>
