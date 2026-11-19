<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { BarChart2 } from '../../lib/icons'

const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, quote } = useI18n()

const LIMIT = 10
const MIN = 5

const words = computed(() => props.data.derived.words.topWords.slice(0, LIMIT))
const answer = computed(() => {
  const top = words.value.slice(0, 3)
  if (!top.length) return null
  return t('report.topWords.answer', {
    words: top.map((word) => quote(word.value)).join(', '),
  })
})
</script>

<template>
  <ReportSection
    v-if="words.length >= MIN"
    class="word-ranking"
    :icon="BarChart2"
    :title="t('report.topWords.title')"
    :answer="answer"
  >
    <ol class="ranking" role="list" :style="{ '--ranking-rows': Math.ceil(words.length / 2) }">
      <li v-for="(word, index) in words" :key="word.value" class="ranking__row">
        <span class="t-label tnum ranking__rank">{{ index + 1 }}</span>
        <span class="t-body ranking__word" :class="{ 'ranking__word--leading': index < 3 }">{{ word.value }}</span>
        <span class="t-label tnum ranking__count">{{ formatNumber(word.count) }}</span>
      </li>
    </ol>
  </ReportSection>
</template>

<style scoped>
.word-ranking {
  container-type: inline-size;
}

.ranking {
  display: grid;
  column-gap: var(--space-6);
}

@container (min-width: 25rem) {
  .ranking {
    grid-auto-flow: column;
    grid-template-rows: repeat(var(--ranking-rows, 5), auto);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.ranking__row {
  display: grid;
  grid-template-columns: var(--space-5) minmax(0, 1fr) auto;
  align-items: baseline;
  gap: var(--space-3);
  padding-block: var(--space-1);
  box-shadow: var(--divider-top);
}

.ranking__rank,
.ranking__count {
  color: var(--text-muted);
}

.ranking__count {
  white-space: nowrap;
}

.ranking__word {
  overflow-wrap: anywhere;
}

.ranking__word--leading {
  font-weight: 600;
}
</style>
