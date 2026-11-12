<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { HeartHandshake } from '../../lib/icons'

/**
 * «Оценка отношений»: the chat's balance as one score out of 100 and a word for it («Тёплые»), then the four
 * parts it is made of as bars — how evenly you write, how quickly you answer, how regularly you are in touch,
 * who starts. The note says what it is counted from (numbers, never the texts), so the score reads as a measure,
 * not a verdict.
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
    :figure="t('report.relation.score', { score: score.score })"
    :answer="t(`report.relation.label.${score.label}`)"
  >
    <ul class="parts">
      <li v-for="part in parts" :key="part.key" class="part">
        <span class="t-body part__label">{{ part.label }}</span>
        <span class="t-label part__value">{{ part.value }}</span>
        <span class="part__track" aria-hidden="true"><i :style="{ width: `${part.value}%` }" /></span>
      </li>
    </ul>
    <template #note>{{ t('report.relation.note') }}</template>
  </ReportSection>
</template>

<style scoped>
.parts {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.part {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-1) var(--space-3);
  align-items: baseline;
}

.part__value {
  color: var(--text-muted);
}

.part__track {
  grid-column: 1 / -1;
  height: var(--space-2);
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
