<script setup lang="ts">
import { MIN_CONVERSATIONS, MIN_REPLY_SAMPLES, type ReportDto } from '@tg-analyzer/shared'
import { HeartHandshake } from '../../lib/icons'

/**
 * The combined score follows the direct comparisons. Its four parts show what goes into the score.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber } = useI18n()

const score = computed(() => {
  const { sessions, responses, relationship } = props.data.report
  if (
    sessions.totalSessions < MIN_CONVERSATIONS ||
    responses.mineSamples < MIN_REPLY_SAMPLES ||
    responses.theirsSamples < MIN_REPLY_SAMPLES ||
    responses.iWriteFirstPct == null ||
    relationship?.responsiveness == null
  )
    return null
  return relationship
})
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
    :answer="t('report.relation.score', { score: formatNumber(score.score) })"
    wide
  >
    <ul class="parts">
      <li v-for="part in parts" :key="part.key" class="part">
        <span class="t-h3">{{ part.value }}</span>
        <span class="t-label part__label">{{ part.label }}</span>
        <span class="part__track" aria-hidden="true"><i :style="{ width: `${part.value}%` }" /></span>
      </li>
    </ul>
    <template #note>{{ t('report.relation.note') }}</template>
  </ReportSection>
</template>

<style scoped>
/* Each part is a number, its name and a short bar. */
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

@media (min-width: 901px) {
  .parts {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
