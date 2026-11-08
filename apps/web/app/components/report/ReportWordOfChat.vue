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
        <span class="runners__word">{{ index + 2 }}. {{ item.value }}</span>
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

/* Places two to four under a hairline, three columns: «2. завтра» and how often under it. */
.runners {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
  list-style: none;
  font: var(--text-ui);
}

.runners li {
  display: grid;
  min-width: 0;
}

.runners__word {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.runners__count {
  color: var(--text-muted);
}
</style>
