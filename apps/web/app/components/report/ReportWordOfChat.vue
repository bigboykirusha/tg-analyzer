<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * The word of the chat as a wall: three lines of the word repeated, the middle one bright with
 * one copy in lime. The same word as on the «Итоги» slide (there swearing is masked). The count
 * goes to screen readers; the picture says «this word, everywhere».
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc } = useI18n()

const word = computed(() => props.data.report.vocabulary.topWords[0] ?? null)
const REPEAT = 16
</script>

<template>
  <ReportSection v-if="word" wide tone="ink" :title="t('report.fmt.wordTitle')">
    <p class="sr-only">«{{ word.value }}» — {{ tc('report.fmt.wordCount', word.count) }}</p>
    <div class="wall" aria-hidden="true">
      <span>{{ `${word.value} `.repeat(REPEAT) }}</span>
      <span class="wall__hit"
        >{{ word.value }} <em>{{ word.value }}</em> {{ `${word.value} `.repeat(REPEAT - 2) }}</span
      >
      <span>{{ `${word.value} `.repeat(REPEAT) }}</span>
    </div>
  </ReportSection>
</template>

<style scoped>
/* The wall runs to the card's edge and fades out instead of cutting a word. */
.wall {
  display: grid;
  margin-right: calc(-1 * var(--card-padding));
  overflow: hidden;
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
  text-transform: uppercase;
  white-space: nowrap;
  mask-image: linear-gradient(to right, var(--text) 75%, transparent);
}

.wall span {
  color: var(--text-muted);
  opacity: 0.4;
}

.wall .wall__hit {
  color: var(--text);
  opacity: 1;
}

.wall em {
  color: var(--them);
  font-style: normal;
}
</style>
