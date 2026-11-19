<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Shapes } from '../../lib/icons'

/**
 * Show each format on the same scale, with its actual count beside the share.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatPercent } = useI18n()

const stats = computed(() => props.data.derived.compositionStats)
const composition = computed(() => props.data.report.composition)

const formats = computed(() => {
  const counts = composition.value
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  return (
    [
      ['text', counts.text],
      ['media', counts.media],
      ['sticker', counts.sticker],
      ['voice', counts.voice],
      ['file', counts.file],
    ] as const
  )
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, label: t(`report.formats.kind.${key}`), count, share: (count / total) * 100 }))
})

const share = computed(() => stats.value.textSharePct)
const answer = computed(() => {
  const chars = stats.value.avgCharsPerTextMessage
  if (!chars) return t('report.formats.answerPlain')
  const rounded = Math.round(chars)
  return tc('report.formats.answer', rounded, { count: formatNumber(rounded) })
})
</script>

<template>
  <ReportSection
    v-if="share !== null && formats.length > 1"
    :icon="Shapes"
    :title="t('report.formats.title')"
    :answer="answer"
  >
    <dl class="formats">
      <div v-for="item in formats" :key="item.key" class="formats__row">
        <dt class="t-body">{{ item.label }}</dt>
        <dd class="t-label tnum formats__count">{{ formatNumber(item.count) }}</dd>
        <dd class="t-label tnum formats__percent">{{ formatPercent(item.share) }}</dd>
        <dd aria-hidden="true" class="formats__track"><i :style="{ width: `${item.share}%` }" /></dd>
      </div>
    </dl>
  </ReportSection>
</template>

<style scoped>
.formats {
  display: grid;
  gap: var(--space-3);
}

.formats__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: baseline;
  gap: var(--space-1) var(--space-3);
}

.formats__count {
  color: var(--text-muted);
}

.formats__percent {
  min-width: var(--space-8);
  text-align: end;
}

.formats__track {
  grid-column: 1 / -1;
  height: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
}

.formats__track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--text);
}
</style>
