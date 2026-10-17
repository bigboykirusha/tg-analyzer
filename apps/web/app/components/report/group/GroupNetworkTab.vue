<script setup lang="ts">
import type { GroupReportDto } from '@tg-analyzer/shared'
import type { Meter } from '../ReportMeters.vue'

const props = defineProps<{ group: GroupReportDto }>()
const { t, tc, formatNumber, formatDecimal } = useI18n()
const nameOf = useParticipantName()
const pairName = usePairNames(() => props.group)

const maxPair = computed(() => Math.max(1, ...props.group.topPairs.map((pair) => pair.symmetricScore)))
const pairs = computed(() =>
  props.group.topPairs.map((pair) => ({
    key: `${pair.leftParticipantId}-${pair.rightParticipantId}`,
    title: `${pairName(pair.leftParticipantId, pair.leftParticipantName)} × ${pairName(pair.rightParticipantId, pair.rightParticipantName)}`,
    width: (pair.symmetricScore / maxPair.value) * 100,
    direct: pair.directReplies,
    implied: pair.impliedReplies,
  })),
)

const starters = computed<Meter[]>(() =>
  [...props.group.participants]
    .sort((a, b) => b.starterShare - a.starterShare)
    .slice(0, 6)
    .map((p) => ({ key: p.id, label: nameOf(p), value: p.starterShare })),
)

const magnets = computed(() =>
  [...props.group.participants]
    .filter((p) => p.magnetScore !== null)
    .sort((a, b) => (b.magnetScore ?? 0) - (a.magnetScore ?? 0))
    .slice(0, 6),
)
</script>

<template>
  <div class="report-grid">
    <ReportSection wide :label="t('group.network')" :title="t('group.networkTitle')" :text="t('group.networkText')">
      <ul v-if="pairs.length" class="pairs">
        <li v-for="pair in pairs" :key="pair.key" class="pair">
          <div class="pair__head">
            <strong>{{ pair.title }}</strong>
            <span class="t-small t-muted">
              {{ tc('group.pairDirectCount', pair.direct) }} · {{ tc('group.pairImpliedCount', pair.implied) }}
            </span>
          </div>
          <div class="pair__track" aria-hidden="true">
            <div class="pair__fill" :style="{ width: `${pair.width}%` }" />
          </div>
        </li>
      </ul>
      <p v-else class="t-small t-muted">{{ t('group.topPairsEmpty') }}</p>
    </ReportSection>

    <ReportSection :label="t('group.network')" :title="t('group.starterLeaders')" :text="t('group.startersHint')">
      <ReportMeters :meters="starters" />
    </ReportSection>

    <ReportSection :label="t('group.network')" :title="t('group.replyMagnets')" :text="t('group.magnetHint')">
      <ul v-if="magnets.length" class="ranking">
        <li v-for="p in magnets" :key="p.id">
          <span>{{ nameOf(p) }}</span>
          <strong class="t-mono">{{ formatDecimal(p.magnetScore ?? 0) }}</strong>
        </li>
      </ul>
      <p v-else class="t-small t-muted">{{ t('report.relationship.empty') }}</p>
      <p class="t-small t-muted">
        {{ t('group.repliesTotal', { count: formatNumber(group.participants.reduce((s, p) => s + p.replyCount, 0)) }) }}
      </p>
    </ReportSection>
  </div>
</template>

<style scoped>
.pairs,
.ranking {
  display: flex;
  flex-direction: column;
  list-style: none;
}

.pairs {
  gap: var(--space-4);
}

.pair {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.pair__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-1) var(--space-3);
}

.pair__track {
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--surface-2);
}

.pair__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
}

.ranking li {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border);
}

.ranking li:last-child {
  border-bottom: 0;
}
</style>
