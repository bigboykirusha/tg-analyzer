<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Вы двое»: every two-sided habit in a format of its own — a big fact for reply time, a tug
 * of war for who starts, chat bubbles for length, squares for questions, podiums for
 * reactions, sound tracks for voice, a dial for laughs. The numbers all come from `useVersus`.
 */
const props = defineProps<{ data: ReportDto }>()
const cards = useVersus(() => props.data)
const name = computed(() => props.data.summary.title)
</script>

<template>
  <div class="report-grid report-grid--even duel">
    <DuelSpeed v-if="cards.speed" :data="data" :item="cards.speed" />
    <DuelStarts v-if="cards.starts" :item="cards.starts" :their-name="name" />
    <DuelLength v-if="cards.length" :item="cards.length" :their-name="name" />
    <DuelQuestions v-if="cards.questions" :item="cards.questions" :their-name="name" />
    <DuelReactions :data="data" :item="cards.reactions ?? null" />
    <DuelVoice v-if="cards.voice" :item="cards.voice" :their-name="name" />
    <ReportEquivalents :data="data" />
    <DuelRituals :data="data" />
    <DuelLaughs v-if="cards.laughs" :item="cards.laughs" :their-name="name" />
  </div>
</template>

<style scoped>
/* Reply time spans the row, the rest go in pairs; a card left alone at the end takes the row. */
.duel > :last-child:nth-child(even) {
  grid-column: 1 / -1;
}
</style>
