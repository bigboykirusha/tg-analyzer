<script setup lang="ts">
import type { GroupParticipantDto, GroupReportDto } from '@tg-analyzer/shared'
import type { Fact } from '../ReportFacts.vue'

const props = defineProps<{ group: GroupReportDto }>()
const { t, formatNumber, formatDecimal, formatPercent, formatDate, formatRelative } = useI18n()
const nameOf = useParticipantName()
const pairName = usePairNames(() => props.group)

const ranked = computed(() => [...props.group.participants].sort((a, b) => b.messageCount - a.messageCount))
const selectedId = ref<string | null>(null)
const selected = computed(() => ranked.value.find((item) => item.id === selectedId.value) ?? ranked.value[0] ?? null)

function window(participant: GroupParticipantDto) {
  if (!participant.firstSeen || !participant.lastSeen) return null
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  return `${formatDate(participant.firstSeen, options)} – ${formatDate(participant.lastSeen, options)}`
}

const facts = computed<Fact[]>(() => {
  const p = selected.value
  if (!p) return []
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

const connections = computed(() => {
  const p = selected.value
  if (!p) return []
  return props.group.topPairs
    .filter((pair) => pair.leftParticipantId === p.id || pair.rightParticipantId === p.id)
    .map((pair) => ({
      name:
        pair.leftParticipantId === p.id
          ? pairName(pair.rightParticipantId, pair.rightParticipantName)
          : pairName(pair.leftParticipantId, pair.leftParticipantName),
      score: pair.symmetricScore,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
})
</script>

<template>
  <div class="members">
    <ReportSection :label="t('group.members')" :title="t('group.membersTitle')" :text="t('group.membersText')">
      <ul class="member-list">
        <li v-for="participant in ranked" :key="participant.id">
          <button
            type="button"
            class="member"
            :class="{ 'member--active': participant.id === selected?.id }"
            :aria-pressed="participant.id === selected?.id"
            @click="selectedId = participant.id"
          >
            <UiAvatar :title="nameOf(participant)" size="sm" />
            <span class="member__copy">
              <span class="member__name">{{ nameOf(participant) }}</span>
              <span class="t-small t-muted">{{ t(`group.roles.${participant.role}`) }}</span>
            </span>
            <span class="member__share t-mono">{{ formatPercent(participant.messageShare) }}</span>
          </button>
        </li>
      </ul>
    </ReportSection>

    <ReportSection
      v-if="selected"
      :label="t('group.spotlight')"
      :title="nameOf(selected)"
      :text="window(selected) ?? undefined"
    >
      <div class="role">
        <span class="role__name">{{ t(`group.roles.${selected.role}`) }}</span>
        <p class="t-small t-muted">
          {{
            t(`group.roleReasons.${selected.role}`, {
              share: formatPercent(selected.messageShare),
              starter: formatPercent(selected.starterShare),
              consistency: selected.consistencyScore,
            })
          }}
        </p>
      </div>
      <ReportFacts :facts="facts" />
      <div class="stack">
        <span class="t-label">{{ t('group.topWords') }}</span>
        <WordChips :items="selected.topWords" :empty="t('report.words.none')" />
      </div>
      <div class="stack">
        <span class="t-label">{{ t('group.topConnections') }}</span>
        <ul v-if="connections.length" class="connections">
          <li v-for="item in connections" :key="item.name">
            <span>{{ item.name }}</span>
            <strong class="t-mono">{{ formatNumber(item.score) }}</strong>
          </li>
        </ul>
        <p v-else class="t-small t-muted">{{ t('group.topPairsEmpty') }}</p>
      </div>
    </ReportSection>
  </div>
</template>

<style scoped>
.members {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: var(--space-5);
  align-items: start;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 640px;
  overflow-y: auto;
  list-style: none;
}

.member {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);
}

.member:hover {
  background: var(--surface-2);
}

.member--active {
  border-color: var(--accent-border);
  background: var(--accent-subtle);
}

.member__copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.member__name {
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member__share {
  color: var(--text-muted);
}

.role {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.role__name {
  color: var(--text);
  font: var(--text-ui);
  font-weight: 600;
}

.connections {
  display: flex;
  flex-direction: column;
  list-style: none;
}

.connections li {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border);
}

.connections li:last-child {
  border-bottom: 0;
}

@media (max-width: 900px) {
  .members {
    grid-template-columns: minmax(0, 1fr);
  }

  .member-list {
    max-height: 360px;
  }
}
</style>
