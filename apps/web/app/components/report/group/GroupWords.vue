<script setup lang="ts">
import type { GroupReportDto, ReportDto } from '@tg-analyzer/shared'

/**
 * «Слова и эмодзи» of a group: the word most members share as the answer, the shared words as chips and
 * the chat's favourite emoji with how often.
 */
const props = defineProps<{ data: ReportDto; group: GroupReportDto }>()
const { t, formatNumber } = useI18n()

const words = computed(() => props.data.derived.words)
const shared = computed(() => words.value.group?.shared ?? props.group.sharedVocabulary)
const top = computed(() => shared.value[0] ?? null)
/** The first word answers the card; the chips go on from the second, so no word is said twice. */
const chips = computed(() => shared.value.slice(1, 9))
const emoji = computed(() => props.data.derived.favourites.topEmoji.slice(0, 8))
</script>

<template>
  <ReportSection
    v-if="top || emoji.length"
    id="part-words"
    :title="t('group.wordsTitle')"
    :answer="
      top
        ? t('group.sharedVocabularyAnswer', { word: top.value })
        : t('group.favouriteEmoji', { emoji: emoji[0]!.value })
    "
  >
    <WordChips v-if="chips.length" :items="chips" :counts="false" tone="shared" />
    <ul v-if="emoji.length" class="emoji">
      <li v-for="item in emoji" :key="item.value" class="emoji__chip t-label">
        <span class="t-h2">{{ item.value }}</span>
        {{ formatNumber(item.count) }}
      </li>
    </ul>
  </ReportSection>
</template>

<style scoped>
.emoji {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.emoji__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-3) 0 var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
}
</style>
