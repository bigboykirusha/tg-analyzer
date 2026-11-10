<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Слова»: the word of your chat as the answer, then what each of you says that the other does not —
 * up to five chips a side, no shared words and no counts. Obscene words are hidden (`derived.words`);
 * when the chat has some, a quiet link shows them to the owner. No word of the chat (too few repeats)
 * leaves the chips alone; no chips and no word, no card. With an `author` it names the author's side
 * and keeps the link away: the reader of a shared report does not choose what the owner sees.
 */
const props = defineProps<{ data: ReportDto; author?: string | null }>()
const emit = defineEmits<{ profanity: [show: boolean] }>()
const { t } = useI18n()

const { words, mine, theirs, figure, answer, any } = useWordsFacts(() => props.data)
const name = computed(() => props.data.summary.title)
const shown = computed(() => words.value.profanity === 'shown')
</script>

<template>
  <ReportSection v-if="any" id="part-words" :title="t('report.words.card')" :figure="figure" :answer="answer">
    <div v-if="mine.length || theirs.length" class="words">
      <div v-if="mine.length" class="words__side">
        <p class="t-label">{{ author ?? t('report.words.mine') }}</p>
        <WordChips :items="mine" :counts="false" tone="mine" />
      </div>
      <div v-if="theirs.length" class="words__side">
        <p class="t-label words__them">{{ name }}</p>
        <WordChips :items="theirs" :counts="false" tone="theirs" />
      </div>
    </div>
    <template v-if="!author && words.hasProfanity" #note>
      <button type="button" class="link" @click="emit('profanity', !shown)">
        {{ shown ? t('report.words.hide') : t('report.words.show') }}
      </button>
    </template>
  </ReportSection>
</template>

<style scoped>
.words {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.words__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.words__them {
  color: var(--them-ink);
}
</style>
