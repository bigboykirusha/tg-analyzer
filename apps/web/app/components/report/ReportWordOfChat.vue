<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Quote } from '../../lib/icons'

/**
 * The lead word of «О чём»: its count and how it divides between the two sides.
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
  <ReportSection v-if="word" id="part-word" :icon="Quote" :title="t('report.fmt.wordTitle')">
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
</style>
