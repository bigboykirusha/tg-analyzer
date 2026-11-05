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
  <!-- Cards in reading order straight into the part's masonry: each keeps its own height. -->
  <DuelSpeed v-if="cards.speed" :data="data" :item="cards.speed" />
  <DuelStarts v-if="cards.starts" :item="cards.starts" :their-name="name" />
  <DuelQuestions v-if="cards.questions" :item="cards.questions" :their-name="name" />
  <DuelStickers :data="data" />
  <DuelReactions :data="data" :item="cards.reactions ?? null" />
  <DuelVoice v-if="cards.voice" :item="cards.voice" :their-name="name" />
  <ReportEquivalents :data="data" />
  <DuelRituals :data="data" />
  <DuelLaughs v-if="cards.laughs" :item="cards.laughs" :their-name="name" />
</template>
