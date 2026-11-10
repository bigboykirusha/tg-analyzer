<script setup lang="ts">
import type { HabitId, ReportDto } from '@tg-analyzer/shared'

/**
 * «Вы двое» after «Кто пишет больше»: reply time, the small habits as rows, squares for questions,
 * stickers by side, podiums for reactions, one voice card. The numbers all come from `useVersus`,
 * so one value never gets two answers.
 */
const props = defineProps<{ data: ReportDto }>()
const cards = useVersus(() => props.data)
/** Habits without enough events behind them leave their cards out (`derived.habitRows.skipped`). */
const known = (id: HabitId) => !props.data.derived.habitRows.skipped.includes(id)
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
    :data="data"
    :starts="cards.starts ?? null"
    :laughs="cards.laughs ?? null"
    :voice="cards.voice ? null : voiceCounts"
  />
  <DuelQuestions v-if="cards.questions && known('questions')" :item="cards.questions" :their-name="name" />
  <DuelStickers v-if="known('stickers')" :data="data" />
  <DuelReactions v-if="known('reactions')" :data="data" :item="cards.reactions ?? null" />
  <DuelVoice v-if="cards.voice && known('voice')" :item="cards.voice" :data="data" />
</template>
