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
  <div class="duel">
    <!-- Two columns of different cards side by side: reply time and stickers, who starts, length and questions. -->
    <div class="report-grid duel__top">
      <div class="duel__stack">
        <DuelSpeed v-if="cards.speed" :data="data" :item="cards.speed" />
        <DuelStickers :data="data" />
      </div>
      <div class="duel__stack">
        <DuelStarts v-if="cards.starts" :item="cards.starts" :their-name="name" />
        <DuelLength v-if="cards.length" :item="cards.length" :their-name="name" />
        <DuelQuestions v-if="cards.questions" :item="cards.questions" :their-name="name" />
      </div>
    </div>
    <div class="report-grid report-grid--even duel__rest">
      <DuelReactions :data="data" :item="cards.reactions ?? null" />
      <DuelVoice v-if="cards.voice" :item="cards.voice" :their-name="name" />
      <ReportEquivalents :data="data" />
      <DuelRituals :data="data" />
      <DuelLaughs v-if="cards.laughs" :item="cards.laughs" :their-name="name" />
    </div>
  </div>
</template>

<style scoped>
.duel {
  display: grid;
  gap: var(--card-gap);
}

/* Each column is a stack whose last card takes what is left, so both columns end on one line. */
.duel__top {
  align-items: stretch;
}

.duel__stack {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
  min-width: 0;
}

.duel__stack > :last-child {
  flex: 1;
}

/* A card left alone at the end takes the row. */
.duel__rest > :last-child:nth-child(odd) {
  grid-column: 1 / -1;
}
</style>
