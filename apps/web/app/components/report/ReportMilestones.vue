<script setup lang="ts">
import type { MilestoneDto } from '@tg-analyzer/shared'

/** Round message numbers of a chat with their date; `authors` names who wrote each, in the same order. */
const props = defineProps<{ milestones: MilestoneDto[]; authors: string[] }>()
const { t, formatNumber, formatDate } = useI18n()

const rows = computed(() =>
  props.milestones.map((milestone, index) => ({
    key: milestone.index,
    label:
      milestone.index === 1
        ? t('report.talk.milestoneFirst')
        : t('report.talk.milestoneN', { n: formatNumber(milestone.index) }),
    date: formatDate(milestone.at, { day: 'numeric', month: 'long', year: 'numeric' }),
    author: props.authors[index] ?? '',
    mine: milestone.mine,
  })),
)
</script>

<template>
  <ol class="milestones">
    <li v-for="row in rows" :key="row.key" class="milestone">
      <i class="milestone__dot" :class="{ 'milestone__dot--mine': row.mine }" aria-hidden="true" />
      <strong class="t-title">{{ row.label }}</strong>
      <span class="t-small t-muted">{{ row.date }} · {{ row.author }}</span>
    </li>
  </ol>
</template>

<style scoped>
.milestones {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-4) var(--space-6);
  list-style: none;
}

.milestone {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-1) var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

.milestone > span {
  grid-column: 2;
}

.milestone__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--them);
}

.milestone__dot--mine {
  background: var(--you);
}
</style>
