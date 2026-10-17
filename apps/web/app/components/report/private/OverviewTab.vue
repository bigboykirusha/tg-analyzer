<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Fact } from '../ReportFacts.vue'
import type { Meter } from '../ReportMeters.vue'

const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatDecimal, formatDuration, formatPercent } = useI18n()

const report = computed(() => props.data.report)
const responses = computed(() => report.value.responses)

const balanceVerdict = computed(() => {
  const { sent, received } = report.value.totals
  if (!sent || !received) return null
  const ratio = Math.max(sent, received) / Math.min(sent, received)
  if (ratio < 1.15) return t('report.balance.even')
  return t(sent > received ? 'report.balance.youMore' : 'report.balance.theyMore', { ratio: formatDecimal(ratio) })
})

const relationship = computed(() => report.value.relationship)
const relationshipTitle = computed(() =>
  relationship.value ? t(`report.relationship.label.${relationship.value.label}`) : t('report.relationship.title'),
)
const relationshipMeters = computed<Meter[]>(() => {
  const score = relationship.value
  if (!score) return []
  return [
    {
      key: 'reciprocity',
      label: t('report.relationship.reciprocity'),
      value: score.reciprocity,
      detail: t('report.relationship.reciprocityHint'),
    },
    {
      key: 'responsiveness',
      label: t('report.relationship.responsiveness'),
      value: score.responsiveness,
      detail: t('report.relationship.responsivenessHint'),
    },
    {
      key: 'stability',
      label: t('report.relationship.stability'),
      value: score.stability,
      detail: t('report.relationship.stabilityHint'),
    },
    {
      key: 'attention',
      label: t('report.relationship.attention'),
      value: score.attentionBalance,
      detail: t('report.relationship.attentionHint'),
    },
  ]
})

function spread(p25: number | null, p75: number | null, samples: number) {
  const confidence = t(
    samples >= 20 ? 'report.confidence.high' : samples >= 5 ? 'report.confidence.medium' : 'report.confidence.low',
  )
  const range = p25 !== null && p75 !== null ? `${formatDuration(p25)}–${formatDuration(p75)} · ` : ''
  return `${range}${tc('report.responses.samples', samples)} · ${confidence}`
}

const responseFacts = computed<Fact[]>(() => [
  {
    key: 'rate',
    label: t('report.responses.rate'),
    value: formatPercent(responses.value.responseRate, 1),
    sub: t('report.responses.rateHint'),
  },
  {
    key: 'mine',
    label: t('report.responses.mine'),
    value: formatDuration(responses.value.medianMineSec),
    sub: spread(responses.value.mineP25Sec, responses.value.mineP75Sec, responses.value.mineSamples),
  },
  {
    key: 'theirs',
    label: t('report.responses.theirs'),
    value: formatDuration(responses.value.medianTheirsSec),
    sub: spread(responses.value.theirsP25Sec, responses.value.theirsP75Sec, responses.value.theirsSamples),
  },
  {
    key: 'first',
    label: t('report.responses.firstMove'),
    value: formatPercent(responses.value.iWriteFirstPct),
    sub: t('report.responses.firstMoveHint'),
  },
])

const health = computed(() => report.value.health)
const healthMeters = computed<Meter[]>(() => {
  const score = health.value
  if (!score) return []
  return [
    { key: 'response', label: t('report.health.responseRate'), value: score.responseRate },
    // Shown as continuity so that every bar reads "higher is better".
    {
      key: 'continuity',
      label: t('report.health.continuity'),
      value: score.fragmentation === null ? null : 100 - score.fragmentation,
    },
    { key: 'initiative', label: t('report.health.initiative'), value: score.initiativeBalance },
    { key: 'stability', label: t('report.health.stability'), value: score.longTermStability },
  ]
})
</script>

<template>
  <div class="report-grid">
    <ReportSection :label="t('report.balance.label')" :title="t('report.balance.title')">
      <div class="balance">
        <BalanceDonut :sent="report.totals.sent" :received="report.totals.received" />
        <div class="balance__legend">
          <div class="balance__row">
            <span><i class="dot dot--sent" />{{ t('report.you') }}</span>
            <strong class="t-mono">{{ formatNumber(report.totals.sent) }}</strong>
          </div>
          <div class="balance__row">
            <span><i class="dot dot--received" />{{ t('report.them') }}</span>
            <strong class="t-mono">{{ formatNumber(report.totals.received) }}</strong>
          </div>
          <p v-if="balanceVerdict" class="t-small t-muted">{{ balanceVerdict }}</p>
        </div>
      </div>
    </ReportSection>

    <ReportSection :label="t('report.relationship.label')" :title="relationshipTitle">
      <ReportMeters v-if="relationship" :meters="relationshipMeters" />
      <p v-else class="t-small t-muted">{{ t('report.relationship.empty') }}</p>
    </ReportSection>

    <ReportSection
      :label="t('report.responses.label')"
      :title="t('report.responses.title')"
      :text="t('report.responses.text')"
    >
      <ReportFacts :facts="responseFacts" :columns="2" />
    </ReportSection>

    <ReportSection
      :label="t('report.health.label')"
      :title="
        health
          ? t('report.health.score', { score: health.score, label: t(`report.health.labels.${health.label}`) })
          : t('report.health.title')
      "
      :text="t('report.health.text')"
    >
      <ReportMeters v-if="health" :meters="healthMeters" />
      <p v-else class="t-small t-muted">{{ t('report.health.empty') }}</p>
    </ReportSection>

    <ReportSection
      :label="t('report.composition.label')"
      :title="t('report.composition.title')"
      :text="t('report.composition.text')"
      wide
    >
      <CompositionChart :composition="report.composition" />
    </ReportSection>
  </div>
</template>

<style scoped>
.balance {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-6);
}

.balance__legend {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--space-3);
}

.balance__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border);
}

.balance__row span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot--sent {
  background: var(--accent);
}

.dot--received {
  background: var(--accent-2);
}

@media (max-width: 480px) {
  .balance {
    gap: var(--space-4);
  }
}
</style>
