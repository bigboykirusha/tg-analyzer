<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { BarChart2 } from '../../lib/icons'

/**
 * «Чаще всего»: the ten words the chat says most. The first three are big, each with its count under it; places
 * 4–10 are a compact numbered list. The words come thinned from `derived.words`, the same list the word of the chat
 * is taken from.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, quote } = useI18n()

const LIMIT = 10
const MIN = 5

const words = computed(() => props.data.derived.words.topWords.slice(0, LIMIT))
const podium = computed(() => words.value.slice(0, 3))
const rest = computed(() => words.value.slice(3))
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
    <div class="podium">
      <p v-for="(word, index) in podium" :key="word.value" class="podium__item">
        <span class="t-label podium__place" aria-hidden="true">{{ index + 1 }}</span>
        <span class="t-h3 podium__word">{{ word.value }}</span>
        <span class="t-label podium__count">{{ formatNumber(word.count) }}</span>
      </p>
    </div>
    <ol v-if="rest.length" class="rest" start="4">
      <li v-for="(word, index) in rest" :key="word.value" class="rest__row">
        <span class="t-label rest__place">{{ index + 4 }}</span>
        <span class="t-body rest__word">{{ word.value }}</span>
        <span class="t-label rest__count">{{ formatNumber(word.count) }}</span>
      </li>
    </ol>
  </ReportSection>
</template>

<style scoped>
/* The first three, big: a word and its count under it, three columns. */
.podium {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.podium__item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.podium__word {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* A phone's card has ~88px a word: the top three become full-width rows (place, the word, the count at the right). */
@media (max-width: 640px) {
  .podium {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
  }

  .podium__item {
    display: grid;
    grid-template-columns: var(--space-5) minmax(0, 1fr) auto;
    align-items: baseline;
    gap: var(--space-2);
  }

  .podium__item .podium__place {
    display: inline;
  }
}

/* The place is only for the phone's rows; the columns keep their own order. */
.podium__place {
  display: none;
}

.podium__place,
.podium__count,
.rest__place,
.rest__count {
  color: var(--text-muted);
}

/* Places 4–10: a compact numbered list in two columns, filled down the first, then the second. */
.rest {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(4, auto);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2) var(--space-5);
  margin-top: var(--space-4);
}

/* A phone's card is too narrow for two columns of long words: one column there. */
@media (max-width: 640px) {
  .rest {
    grid-auto-flow: row;
    grid-template-rows: none;
    grid-template-columns: minmax(0, 1fr);
  }
}

.rest__row {
  display: grid;
  grid-template-columns: var(--space-5) minmax(0, 1fr) auto;
  align-items: baseline;
  gap: var(--space-2);
}

.rest__word {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
