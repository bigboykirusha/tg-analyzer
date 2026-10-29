<script setup lang="ts">
export interface Comparison {
  key: string
  /** The question this row answers: «Кто начинает разговор». */
  label: string
  /** Formatted values for each side. */
  mine: string
  theirs: string
  /** Your share of the bar, 0–100; null hides the bar. */
  minePct: number | null
  /** One plain sentence with the answer. */
  verdict: string
  /** The verdict says it all («almost always answered»): no bar, no values. */
  quiet?: boolean
}

const props = defineProps<{
  rows: Comparison[]
  /** The other side by name instead of «Собеседник». */ theirName?: string
}>()
const { t } = useI18n()
const them = computed(() => props.theirName || t('report.them'))
</script>

<template>
  <ul class="compare">
    <li v-for="row in rows" :key="row.key" class="compare__row">
      <div class="compare__head">
        <span class="compare__label">{{ row.label }}</span>
        <span class="compare__verdict">{{ row.verdict }}</span>
      </div>
      <div
        v-if="row.minePct !== null && !row.quiet"
        class="compare__bar"
        role="img"
        :aria-label="`${t('report.you')}: ${row.mine}, ${them}: ${row.theirs}`"
      >
        <span class="compare__mine" :style="{ width: `${row.minePct}%` }" />
        <span class="compare__theirs" />
      </div>
      <div v-if="!row.quiet" class="compare__values">
        <span><i class="dot dot--mine" />{{ t('report.you') }} · {{ row.mine }}</span>
        <span>{{ row.theirs }} · {{ them }}<i class="dot dot--theirs" /></span>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.compare {
  display: grid;
  gap: var(--space-5);
  list-style: none;
}

.compare__row {
  display: grid;
  gap: var(--space-2);
}

.compare__head {
  display: grid;
  gap: 2px;
}

.compare__label {
  color: var(--text-muted);
  font: var(--text-small);
}

.compare__verdict {
  color: var(--text);
  font: var(--text-ui);
  font-weight: 600;
}

.compare__bar {
  display: flex;
  gap: 2px;
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-full);
}

.compare__mine {
  flex: 0 0 auto;
  background: var(--you);
  transition: width var(--transition-slow);
}

.compare__theirs {
  flex: 1 1 auto;
  background: var(--them);
}

.compare__values {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-muted);
  font: var(--text-small);
}

.compare__values span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot--mine {
  background: var(--you);
}

.dot--theirs {
  background: var(--them);
}
</style>
