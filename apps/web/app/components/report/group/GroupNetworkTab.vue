<script setup lang="ts">
import type { GroupReportDto } from '@tg-analyzer/shared'
import type { Fact } from '../ReportFacts.vue'
import type { Meter } from '../ReportMeters.vue'

/** How the group holds together: the closest pairs and the group's health. */
const props = defineProps<{ group: GroupReportDto }>()
const { t, tc, formatNumber, formatPercent } = useI18n()
const pairName = usePairNames(() => props.group)

const pairs = computed(() =>
  props.group.topPairs.map((pair) => ({
    key: `${pair.leftParticipantId}-${pair.rightParticipantId}`,
    left: pairName(pair.leftParticipantId, pair.leftParticipantName),
    right: pairName(pair.rightParticipantId, pair.rightParticipantName),
    direct: pair.directReplies,
    implied: pair.impliedReplies,
  })),
)

const health = computed(() => props.group.health)
const healthMeters = computed<Meter[]>(() => {
  const value = health.value
  if (!value) return []
  return [
    // Shown as evenness so every bar reads "higher is better".
    {
      key: 'evenness',
      label: t('group.evenness'),
      value: Math.round((1 - value.giniCoefficient) * 100),
      detail: t('group.evennessHint'),
    },
    {
      key: 'coverage',
      label: t('group.responseCoverage'),
      value: value.responseCoverage,
      detail: t('group.responseCoverageHint'),
    },
    {
      key: 'consistency',
      label: t('group.consistency'),
      value: value.consistency,
      detail: t('group.consistencyHint'),
    },
    ...(value.retentionRate === null
      ? []
      : [
          {
            key: 'retention',
            label: t('group.retention'),
            value: value.retentionRate,
            detail: t('group.retentionHint'),
          },
        ]),
  ]
})

const healthFacts = computed<Fact[]>(() => {
  const value = health.value
  if (!value) return []
  return [
    { key: 'lurkers', label: t('group.lurkers'), value: formatPercent(value.lurkerRatio), sub: t('group.lurkersHint') },
    {
      key: 'churned',
      label: t('group.churned'),
      value: formatNumber(value.churnedMembers),
      sub: t('group.churnedHint'),
    },
    {
      key: 'peak',
      label: t('group.peakSimultaneity'),
      value: formatNumber(value.peakSimultaneity),
      sub: t('group.peakSimultaneityHint'),
    },
  ]
})
</script>

<template>
  <div class="report-grid">
    <ReportSection v-if="pairs.length" :title="t('group.networkTitle')" :text="t('group.networkText')">
      <ol class="pairs">
        <li v-for="(pair, index) in pairs" :key="pair.key" class="pair">
          <span class="pair__rank t-num">{{ index + 1 }}</span>
          <span class="pair__names">
            <strong>{{ pair.left }} × {{ pair.right }}</strong>
            <span class="t-small t-muted">
              {{ tc('group.pairDirectCount', pair.direct) }} · {{ tc('group.pairImpliedCount', pair.implied) }}
            </span>
          </span>
        </li>
      </ol>
    </ReportSection>

    <ReportSection v-if="health" tone="grey" :title="t('group.healthTitle')">
      <ReportMeters :meters="healthMeters" />
      <ReportFacts :facts="healthFacts" />
    </ReportSection>
  </div>
</template>

<style scoped>
.pairs {
  display: grid;
  list-style: none;
}

.pair {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding-block: var(--space-3);
  border-top: 1px solid var(--border);
}

.pair:first-child {
  padding-top: 0;
  border-top: 0;
}

.pair__rank {
  flex: none;
  width: 1.5em;
  color: var(--text-muted);
  font: var(--text-ui);
}

.pair__names {
  display: grid;
  gap: 2px;
  min-width: 0;
}
</style>
