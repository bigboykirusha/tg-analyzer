<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Вы двое»: every two-sided habit in a picture of its own — a line for reply time, the small
 * habits as rows, squares for questions, stickers by side, podiums for reactions, one voice card,
 * the care rituals and the edges of the day. The
 * numbers all come from `useVersus`, so one value never gets two answers.
 */
const props = defineProps<{ data: ReportDto }>()
const cards = useVersus(() => props.data)
const name = computed(() => props.data.summary.title)
/** Voice messages and video notes counted, for chats whose report has no lengths: a habit row then. */
const voiceCounts = computed(() => {
  const voice = props.data.report.voice
  if (!voice) return null
  const mine = voice.voice.count.mine + voice.round.count.mine
  const theirs = voice.voice.count.theirs + voice.round.count.theirs
  return mine + theirs ? { mine, theirs } : null
})
</script>

<template>
  <!-- Cards in reading order straight into the part's masonry; between coloured tiles stand white ones. -->
  <DuelSpeed v-if="cards.speed" :item="cards.speed" :their-name="name" />
  <DuelHabits
    :starts="cards.starts ?? null"
    :laughs="cards.laughs ?? null"
    :voice="cards.voice ? null : voiceCounts"
    :their-name="name"
  />
  <DuelQuestions v-if="cards.questions" :item="cards.questions" :their-name="name" />
  <DuelStickers :data="data" />
  <DuelReactions :data="data" :item="cards.reactions ?? null" />
  <DuelVoice v-if="cards.voice" :item="cards.voice" :data="data" />
  <DuelCare :data="data" />
  <DuelDayEdges :data="data" />
</template>
