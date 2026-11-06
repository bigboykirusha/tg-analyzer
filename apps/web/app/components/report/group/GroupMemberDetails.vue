<script setup lang="ts">
import type { GroupParticipantDto, GroupReportDto } from '@tg-analyzer/shared'
import type { Fact } from '../ReportFacts.vue'

const props = defineProps<{ participant: GroupParticipantDto; group: GroupReportDto }>()
const { t, formatNumber, formatDecimal, formatPercent, formatDate, formatRelative } = useI18n()
const pairName = usePairNames(() => props.group)
const period = computed(() => {
  const { firstSeen, lastSeen } = props.participant
  if (!firstSeen || !lastSeen) return null
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  return `${formatDate(firstSeen, options)} – ${formatDate(lastSeen, options)}`
})

const facts = computed<Fact[]>(() => {
  const p = props.participant
  return [
    {
      key: 'messages',
      label: t('group.messages'),
      value: formatNumber(p.messageCount),
      sub: t('group.shareOfMessages', { value: formatPercent(p.messageShare) }),
    },
    { key: 'starters', label: t('group.starters'), value: formatPercent(p.starterShare), sub: t('group.startersHint') },
    {
      key: 'replies',
      label: t('group.repliesReceived'),
      value: formatNumber(p.repliesReceived),
      sub: t('group.repliesReceivedHint'),
    },
    {
      key: 'words',
      label: t('group.wordsPerMessage'),
      value: p.avgWordsPerMessage === null ? t('common.na') : formatDecimal(p.avgWordsPerMessage),
    },
    { key: 'media', label: t('group.media'), value: formatNumber(p.mediaCount), sub: formatPercent(p.mediaShare) },
    { key: 'last', label: t('group.lastSeen'), value: p.lastSeen ? formatRelative(p.lastSeen) : t('common.na') },
  ]
})

const connections = computed(() =>
  props.group.topPairs
    .filter(
      (pair) => pair.leftParticipantId === props.participant.id || pair.rightParticipantId === props.participant.id,
    )
    .map((pair) => ({
      name:
        pair.leftParticipantId === props.participant.id
          ? pairName(pair.rightParticipantId, pair.rightParticipantName)
          : pairName(pair.leftParticipantId, pair.leftParticipantName),
      score: pair.symmetricScore,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3),
)
</script>

<template>
  <div class="member-detail">
    <p v-if="period" class="t-small t-muted">{{ period }}</p>
    <div class="role">
      <span class="role__name">{{ t(`group.roles.${participant.role}`) }}</span>
      <p class="t-small t-muted">
        {{
          t(`group.roleReasons.${participant.role}`, {
            share: formatPercent(participant.messageShare),
            starter: formatPercent(participant.starterShare),
            consistency: participant.consistencyScore,
          })
        }}
      </p>
    </div>
    <ReportFacts :facts="facts" />
    <div class="stack">
      <span class="t-label">{{ t('group.topWords') }}</span>
      <WordChips :items="participant.topWords" :empty="t('report.words.none')" />
    </div>
    <div class="stack">
      <span class="t-label">{{ t('group.topConnections') }}</span>
      <ul v-if="connections.length" class="connections">
        <li v-for="item in connections" :key="item.name">
          <span>{{ item.name }}</span
          ><strong class="t-num">{{ formatNumber(item.score) }}</strong>
        </li>
      </ul>
      <p v-else class="t-small t-muted">{{ t('group.topPairsEmpty') }}</p>
    </div>
  </div>
</template>

<style scoped>
.member-detail {
  display: grid;
  min-width: 0;
  gap: var(--space-4);
}
.role {
  display: grid;
  gap: var(--space-2);
}
.role__name {
  color: var(--text);
  font: var(--text-ui);
}
.connections {
  display: grid;
  list-style: none;
}
.connections li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border);
}
.connections li > span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.connections li > strong {
  flex: none;
}
.connections li:last-child {
  border-bottom: 0;
}
</style>
