<script setup lang="ts">
import type { GroupReportDto, ReportDto } from '@tg-analyzer/shared'
import type { Fact } from '../ReportFacts.vue'
import type { Meter } from '../ReportMeters.vue'

const TOP = 5

const props = defineProps<{ data: ReportDto; group: GroupReportDto }>()
const { t, formatNumber, formatPercent } = useI18n()
const nameOf = useParticipantName()
const pairName = usePairNames(() => props.group)

const ranked = computed(() => [...props.group.participants].sort((a, b) => b.messageCount - a.messageCount))

const shareMeters = computed<Meter[]>(() => {
  const top = ranked.value.slice(0, TOP)
  const meters: Meter[] = top.map((participant) => ({
    key: participant.id,
    label: nameOf(participant),
    value: participant.messageShare,
    self: participant.isSelf,
    detail: t('group.memberMeta', {
      role: t(`group.roles.${participant.role}`),
      messages: formatNumber(participant.messageCount),
    }),
  }))
  const total = props.data.report.totals.messages
  const rest = ranked.value.slice(TOP).reduce((sum, item) => sum + item.messageCount, 0)
  if (rest > 0 && total > 0) meters.push({ key: 'others', label: t('group.others'), value: (rest / total) * 100 })
  return meters
})

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

const insights = computed(() => {
  const items: string[] = []
  const top = ranked.value[0]
  if (top && top.messageShare >= 35) {
    items.push(t('group.insight.dominant', { name: nameOf(top), share: formatPercent(top.messageShare) }))
  }
  if ((health.value?.lurkerRatio ?? 0) >= 45) items.push(t('group.insight.smallCore'))
  const pair = props.group.topPairs[0]
  if (pair) {
    items.push(
      t('group.insight.densestPair', {
        left: pairName(pair.leftParticipantId, pair.leftParticipantName),
        right: pairName(pair.rightParticipantId, pair.rightParticipantName),
      }),
    )
  }
  if (health.value?.momentum === 'growing') items.push(t('group.insight.growing'))
  return items
})
</script>

<template>
  <div class="report-grid">
    <ReportSection :title="t('group.pulseTitle')" :text="t('group.pulseText')">
      <ReportMeters v-if="shareMeters.length" :meters="shareMeters" />
      <p v-else class="t-small t-muted">{{ t('group.noParticipants') }}</p>
    </ReportSection>

    <ReportSection :title="t('group.healthTitle')">
      <template v-if="health">
        <ReportMeters :meters="healthMeters" />
      </template>
      <p v-else class="t-small t-muted">{{ t('group.insightsEmpty') }}</p>
    </ReportSection>

    <ReportSection v-if="healthFacts.length" wide :title="t('group.compositionTitle')">
      <ReportFacts :facts="healthFacts" :columns="3" />
    </ReportSection>

    <ReportSection wide :title="t('group.insightsTitle')">
      <ul v-if="insights.length" class="insights">
        <li v-for="item in insights" :key="item">{{ item }}</li>
      </ul>
      <p v-else class="t-small t-muted">{{ t('group.insightsEmpty') }}</p>
    </ReportSection>
  </div>
</template>

<style scoped>
/* Ruled lines, like «Главное» in private reports. */
.insights {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--space-8);
  list-style: none;
}

.insights li {
  padding-block: var(--space-3);
  border-top: 1px solid var(--border);
  font: var(--text-body);
}

@media (max-width: 640px) {
  .insights {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
