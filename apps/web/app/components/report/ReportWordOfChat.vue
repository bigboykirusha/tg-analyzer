<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * The word of the chat, Wrapped-style: one word as large as the card allows, how often it came
 * up, and who says it. The same word as on the «Итоги» slide (there swearing is masked).
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber } = useI18n()

const vocabulary = computed(() => props.data.report.vocabulary)
const word = computed(() => vocabulary.value.topWords[0] ?? null)

const often = computed(() => {
  if (!word.value) return null
  const { firstMessageAt, lastMessageAt } = props.data.report.period
  if (!firstMessageAt || !lastMessageAt) return null
  const days = Math.max(1, Math.round((Date.parse(lastMessageAt) - Date.parse(firstMessageAt)) / 86_400_000) + 1)
  const perDay = word.value.count / days
  if (perDay >= 1) return tc('report.fmt.wordPerDay', Math.round(perDay))
  return tc('report.fmt.wordEveryDays', Math.max(2, Math.round(1 / perDay)))
})

const sides = computed(() => {
  if (!word.value) return null
  const find = (items: { value: string; count: number }[]) =>
    items.find((item) => item.value === word.value!.value)?.count
  const mine = find(vocabulary.value.topWordsBySender.mine)
  const theirs = find(vocabulary.value.topWordsBySender.theirs)
  return mine === undefined || theirs === undefined ? null : { mine, theirs }
})
</script>

<template>
  <ReportSection
    v-if="word"
    wide
    tone="ink"
    :title="t('report.fmt.wordTitle')"
    :sides="
      sides ? { mine: formatNumber(sides.mine), theirs: formatNumber(sides.theirs), name: data.summary.title } : null
    "
  >
    <p class="word">«{{ word.value }}»</p>
    <p class="word__sentence">
      {{ tc('report.fmt.wordCount', word.count) }}<template v-if="often">. {{ often }}</template>
    </p>
  </ReportSection>
</template>

<style scoped>
.word {
  overflow-wrap: anywhere;
  font: var(--text-figure-lg);
  letter-spacing: var(--tracking-display);
}

.word__sentence {
  font: var(--text-lede);
  font-weight: 500;
}
</style>
