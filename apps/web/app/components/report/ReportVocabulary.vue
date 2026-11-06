<script setup lang="ts">
import { splitVocabulary, type ReportDto } from '@tg-analyzer/shared'

/**
 * «Ваш словарь», each word in one place (`splitVocabulary`): one row per side — its avatar, then
 * the words only that side leans on — and under a hairline the words you share. The word of the
 * chat has a card of its own and is left out here.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatDecimal } = useI18n()

const vocabulary = computed(() => props.data.report.vocabulary)
const name = computed(() => props.data.summary.title)
const split = computed(() =>
  splitVocabulary(vocabulary.value.topWordsBySender.mine, vocabulary.value.topWordsBySender.theirs, {
    exclusive: vocabulary.value.uniqueWordsBySender,
    exclude: vocabulary.value.topWords.slice(0, 1).map((item) => item.value),
  }),
)
const owners = computed(() =>
  [
    { key: 'mine' as const, who: t('report.you'), items: split.value.mine },
    { key: 'theirs' as const, who: name.value, items: split.value.theirs },
  ].filter((owner) => owner.items.length),
)
/** «Слов в сообщении: вы — 3,2, Мила — 4,1». */
const perMessage = computed(() => {
  const { mine, theirs } = vocabulary.value.wordsPerMessage
  if (mine === null || theirs === null) return undefined
  return t('report.words.perMessagePair', {
    mine: formatDecimal(mine),
    theirs: formatDecimal(theirs),
    name: name.value,
  })
})
const hasWords = computed(() => split.value.shared.length + owners.value.length > 0)
</script>

<template>
  <ReportSection v-if="hasWords" :title="t('report.words.title')" :text="perMessage">
    <div v-if="owners.length" class="owners">
      <div v-for="owner in owners" :key="owner.key" class="owners__row">
        <ReportSideAvatar class="owners__avatar" :side="owner.key" :name="owner.who" />
        <WordChips :items="owner.items" :side="owner.key" :empty="t('report.words.none')" />
      </div>
    </div>
    <div v-if="split.shared.length" class="shared">
      <span class="shared__label">{{ t('report.words.shared') }}</span>
      <WordChips :items="split.shared" :empty="t('report.words.none')" />
    </div>
  </ReportSection>
</template>

<style scoped>
.owners {
  display: grid;
  gap: var(--space-2);
}

.owners__row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

/* The avatar sits on the chips' first line. */
.owners__avatar {
  margin-top: var(--space-1);
}

.shared {
  display: grid;
  gap: var(--space-2);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}

.shared__label {
  color: var(--text-muted);
  font: var(--text-small);
}
</style>
