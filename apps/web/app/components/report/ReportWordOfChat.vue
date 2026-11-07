<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * The word of the chat as a poster: the word itself at the size of the report's one big number,
 * in lime, how many times it was written, and the next three words as places two to four. The
 * same word as on the «Итоги» slide.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber } = useI18n()

const words = computed(() => props.data.report.vocabulary.topWords)
const word = computed(() => words.value[0] ?? null)
const runners = computed(() => words.value.slice(1, 4))
</script>

<template>
  <ReportSection v-if="word" wide tone="ink" :title="t('report.fmt.wordTitle')">
    <div class="word">
      <p class="word__value">{{ word.value }}</p>
      <p class="word__count t-num">{{ tc('report.fmt.wordCount', word.count) }}</p>
    </div>
    <ol v-if="runners.length" class="runners t-num" :aria-label="t('report.fmt.wordRunners')">
      <li v-for="(item, index) in runners" :key="item.value">
        <span class="runners__place">{{ index + 2 }}</span>
        <span class="runners__word">{{ item.value }}</span>
        <span class="runners__count">{{ formatNumber(item.count) }}</span>
      </li>
    </ol>
  </ReportSection>
</template>

<style scoped>
.word {
  display: grid;
  gap: var(--space-2);
}

.word__value {
  overflow-wrap: anywhere;
  color: var(--text);
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

.word__count {
  color: var(--text-muted);
  font: var(--text-small);
}

/* Places two to four: a hairline above, then one row (a list on a phone). */
.runners {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
  list-style: none;
  font: var(--text-small);
}

.runners li {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.runners__place,
.runners__count {
  color: var(--text-muted);
}

.runners__word {
  font-weight: 500;
}

@media (max-width: 640px) {
  .runners {
    display: grid;
    gap: var(--space-1);
  }

  .runners__count {
    margin-left: auto;
  }
}
</style>
