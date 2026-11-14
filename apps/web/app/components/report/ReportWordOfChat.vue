<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Quote } from '../../lib/icons'

/**
 * The word of the chat, the one tile of «О чём» in the person's poster colour: the word at the size of
 * the report's one big number, how many times it was written and who wrote it more. The places after it are
 * «Чаще всего», right under this card (one number, one place). The same word as on the «Итоги» frame.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber } = useI18n()

const word = computed(() => props.data.derived.words.wordOfChat)
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
  <ReportSection v-if="word" tone="ink" :icon="Quote" :title="t('report.fmt.wordTitle')">
    <div class="word">
      <p class="word__value">{{ word.value }}</p>
      <p class="word__count">{{ tc('report.fmt.wordCount', word.count) }}</p>
    </div>
    <ReportLine
      v-if="sides"
      class="word__line"
      size="lg"
      :mine="sides.mine"
      :theirs="sides.theirs"
      :right-name="data.summary.title"
      :left="formatNumber(sides.mine)"
      :right="formatNumber(sides.theirs)"
    />
  </ReportSection>
</template>

<style scoped>
/* The other side's name on the poster colour reads in the poster's ink: their own tone is too close to it in the dark theme. */
.word__line :deep(.cmp__name--them) {
  color: var(--on-poster);
}

/* Beside a taller card in a row (a computer) the split rests at the bottom, the word at the top. */
.word__line {
  margin-top: auto;
}

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
</style>
