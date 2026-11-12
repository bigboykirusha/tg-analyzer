<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { BarChart2 } from '../../lib/icons'

/**
 * «Чаще всего»: the ten words the chat says most, as a chart — each a bar of its count against the first,
 * the count beside it. The words come thinned from `derived.words`, the same list the word of the chat
 * is taken from.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, quote } = useI18n()

const LIMIT = 10
const MIN = 5

const words = computed(() => props.data.derived.words.topWords.slice(0, LIMIT))
const max = computed(() => words.value[0]?.count ?? 1)
const answer = computed(() =>
  t('report.topWords.answer', {
    words: words.value
      .slice(0, 3)
      .map((word) => quote(word.value))
      .join(', '),
  }),
)
</script>

<template>
  <ReportSection v-if="words.length >= MIN" :icon="BarChart2" :title="t('report.topWords.title')" :answer="answer">
    <ol class="top">
      <li v-for="(word, index) in words" :key="word.value" class="top__row">
        <span class="t-label top__place">{{ index + 1 }}</span>
        <span class="t-body top__word">{{ word.value }}</span>
        <span class="t-label top__count">{{ formatNumber(word.count) }}</span>
        <span class="top__track" aria-hidden="true"><i :style="{ width: `${(100 * word.count) / max}%` }" /></span>
      </li>
    </ol>
  </ReportSection>
</template>

<style scoped>
.top {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.top__row {
  display: grid;
  grid-template-columns: var(--space-6) minmax(0, 1fr) auto;
  align-items: baseline;
  gap: var(--space-1) var(--space-2);
}

.top__place,
.top__count {
  color: var(--text-muted);
}

.top__word {
  overflow-wrap: anywhere;
}

.top__track {
  grid-column: 2 / -1;
  height: var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--room-tint);
  overflow: hidden;
}

.top__track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--them);
}
</style>
