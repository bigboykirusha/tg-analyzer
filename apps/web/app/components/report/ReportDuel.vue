<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Вы двое»: every two-sided habit in a format of its own — a big fact for reply time, a short
 * bar for who starts, chat bubbles for length, squares for questions, podiums for
 * reactions, sound tracks for voice, a dial for laughs. The numbers all come from `useVersus`.
 */
const props = defineProps<{ data: ReportDto }>()
const cards = useVersus(() => props.data)
const name = computed(() => props.data.summary.title)
</script>

<template>
  <div class="report-grid duel">
    <DuelSpeed v-if="cards.speed" :data="data" :item="cards.speed" />
    <div v-if="cards.starts || cards.length" class="duel__stack">
      <DuelStarts v-if="cards.starts" :item="cards.starts" :their-name="name" />
      <DuelLength v-if="cards.length" :item="cards.length" :their-name="name" />
    </div>
    <DuelQuestions v-if="cards.questions" :item="cards.questions" :their-name="name" />
    <DuelReactions :data="data" :item="cards.reactions ?? null" />
    <DuelVoice v-if="cards.voice" :item="cards.voice" :their-name="name" />
    <ReportEquivalents :data="data" />
    <DuelRituals :data="data" />
    <DuelLaughs v-if="cards.laughs" :item="cards.laughs" :their-name="name" />
  </div>
</template>

<style scoped>
/* Cards go in pairs; who starts and message length share one cell beside reply time. A card left
   alone at the end takes the row. */
.duel__stack {
  display: grid;
  align-content: start;
  gap: var(--card-gap);
  min-width: 0;
}

.duel > :last-child:nth-child(odd) {
  grid-column: 1 / -1;
}
</style>
