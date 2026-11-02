<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/** What the two of you sent, as a quiet list: a name, a dotted leader, a number. */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber } = useI18n()

const rows = computed(() => {
  const { report } = props.data
  const sum = (side: { mine: number; theirs: number } | undefined) => (side ? side.mine + side.theirs : 0)
  return [
    { key: 'voice', label: t('report.mix.sharedVoice'), count: sum(report.voice?.voice.count) },
    { key: 'stickers', label: t('report.mix.sharedStickers'), count: sum(report.stickers?.count) },
    { key: 'reactions', label: t('report.mix.sharedReactions'), count: sum(report.reactions?.given) },
    { key: 'round', label: t('report.mix.sharedRound'), count: sum(report.voice?.round.count) },
  ]
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
})
</script>

<template>
  <ReportSection v-if="rows.length > 1" tone="ink" :title="t('report.mix.sharedTitle')">
    <ol class="shared">
      <li v-for="row in rows" :key="row.key" class="shared__row">
        <span class="shared__label">{{ row.label }}</span>
        <i class="shared__leader" aria-hidden="true" />
        <span class="shared__count t-num">{{ formatNumber(row.count) }}</span>
      </li>
    </ol>
  </ReportSection>
</template>

<style scoped>
.shared {
  display: grid;
  list-style: none;
}

.shared__row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding-block: var(--space-2);
  border-top: 1px solid var(--border);
}

.shared__row:first-child {
  border-top: 0;
}

.shared__label {
  font: var(--text-ui);
}

.shared__leader {
  flex: 1;
  border-bottom: 1px dotted var(--border);
  transform: translateY(-0.25rem);
}

.shared__count {
  font: var(--text-ui);
  font-weight: 600;
}
</style>
