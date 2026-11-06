<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Вы двое»: every two-sided habit in a picture of its own — a line for reply time, the small
 * habits as rows, squares for questions, stickers, podiums for reactions, sound tracks for voice,
 * the voice album and its longest recording, the care rituals and the edges of the day. The
 * numbers all come from `useVersus`, so one value never gets two answers.
 */
const props = defineProps<{ data: ReportDto }>()
const cards = useVersus(() => props.data)
const name = computed(() => props.data.summary.title)
</script>

<template>
  <!-- Cards in reading order straight into the part's masonry; between coloured tiles stand white ones. -->
  <DuelSpeed v-if="cards.speed" :item="cards.speed" />
  <DuelHabits :starts="cards.starts ?? null" :laughs="cards.laughs ?? null" :their-name="name" />
  <DuelQuestions v-if="cards.questions" :item="cards.questions" :their-name="name" />
  <DuelStickers :data="data" />
  <DuelReactions :data="data" :item="cards.reactions ?? null" />
  <DuelVoice v-if="cards.voice" :item="cards.voice" :their-name="name" />
  <DuelAlbum :data="data" />
  <DuelLongestVoice :data="data" />
  <DuelCare :data="data" />
  <DuelDayEdges :data="data" />
</template>
