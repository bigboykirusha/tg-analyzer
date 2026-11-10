<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * The word of the chat, the one tile of «О чём» in the person's poster colour: the word at the size of
 * the report's one big number, how many times it was written, who wrote it more, and places two to four
 * under a hairline. The same word as on the «Итоги» frame.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber } = useI18n()

const word = computed(() => props.data.derived.words.wordOfChat)
const runners = computed(() => props.data.derived.words.topWords.slice(1, 4))
/** How many times each side wrote it, when both sides' lists have it. */
const sides = computed(() => {
  const value = word.value?.value
  const bySender = props.data.report.vocabulary.topWordsBySender
  const mine = bySender.mine.find((item) => item.value === value)?.count
  const theirs = bySender.theirs.find((item) => item.value === value)?.count
  return mine !== undefined && theirs !== undefined ? { mine, theirs } : null
})
</script>

<template>
  <ReportSection v-if="word" tone="ink" :title="t('report.fmt.wordTitle')">
    <div class="word">
      <p class="word__value">{{ word.value }}</p>
      <p class="word__count">{{ tc('report.fmt.wordCount', word.count) }}</p>
    </div>
    <ReportLine
      v-if="sides"
      size="lg"
      :mine="sides.mine"
      :theirs="sides.theirs"
      :right-name="data.summary.title"
      :left="formatNumber(sides.mine)"
      :right="formatNumber(sides.theirs)"
    />
    <ol v-if="runners.length" class="runners" :aria-label="t('report.fmt.wordRunners')">
      <li v-for="item in runners" :key="item.value">
        <span class="runners__word">{{ item.value }}</span>
        <span class="runners__count">{{ formatNumber(item.count) }}</span>
      </li>
    </ol>
  </ReportSection>
</template>

<style scoped>
.word {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.word__value {
  overflow-wrap: anywhere;
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

.word__count {
  color: var(--text-muted);
  font: var(--text-label);
}

/* Places two to four under a hairline, three columns: the word and how often under it. */
.runners {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-3);
  box-shadow: var(--poster-divider-top);
}

.runners li {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font: var(--text-label);
}

.runners__word {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.runners__count {
  color: var(--text-muted);
}
</style>
