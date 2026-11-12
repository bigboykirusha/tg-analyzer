<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { HeartHandshake } from '../../lib/icons'

/**
 * «Оценка отношений»: the word is the finding («Тёплые», «В одну сторону») and stands as the card's figure; the
 * score out of 100 backs it as one quiet line; the four parts it is made of — how evenly you write, how quickly you
 * answer, how regularly you are in touch, who starts — are four numbers, each with a short bar. The note says what
 * it is counted from (numbers, never the texts), so the score reads as a measure, not a verdict.
 */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()

const score = computed(() => props.data.report.relationship)
const parts = computed(() => {
  const value = score.value
  if (!value) return []
  return (
    [
      ['reciprocity', value.reciprocity],
      ['responsiveness', value.responsiveness],
      ['stability', value.stability],
      ['attentionBalance', value.attentionBalance],
    ] as const
  )
    .filter((entry): entry is [(typeof entry)[0], number] => entry[1] !== null)
    .map(([key, part]) => ({ key, label: t(`report.relation.part.${key}`), value: part }))
})
</script>

<template>
  <ReportSection
    v-if="score"
    id="part-relation"
    :icon="HeartHandshake"
    :title="t('report.relation.title')"
    :figure="t(`report.relation.label.${score.label}`)"
  >
    <p class="score t-body">
      <strong class="score__value">{{ score.score }}</strong> {{ t('report.relation.outOf') }}
    </p>
    <ul class="parts">
      <li v-for="part in parts" :key="part.key" class="part">
        <span class="t-h2 part__value">{{ part.value }}</span>
        <span class="t-label part__label">{{ part.label }}</span>
        <span class="part__track" aria-hidden="true"><i :style="{ width: `${part.value}%` }" /></span>
      </li>
    </ul>
    <template #note>{{ t('report.relation.note') }}</template>
  </ReportSection>
</template>

<style scoped>
.score {
  margin-top: calc(-1 * var(--space-2));
  color: var(--text-muted);
}

.score__value {
  color: var(--text);
  font-weight: 600;
}

/* Two by two under a hairline: each part a number, its name, a short bar. */
.parts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4) var(--space-4);
  padding-top: var(--space-4);
  box-shadow: var(--divider-top);
}

.part {
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);
  min-width: 0;
}

.part__label {
  color: var(--text-muted);
}

.part__track {
  height: var(--space-1);
  margin-top: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--room-tint);
  overflow: hidden;
}

.part__track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--them);
}
</style>
