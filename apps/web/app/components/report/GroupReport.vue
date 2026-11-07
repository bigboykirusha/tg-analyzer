<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { LayoutGrid } from '../../lib/icons'

const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatPercent } = useI18n()
const nameOf = useParticipantName()

/** Three parts of one long page: the people and who talks to whom, how the chat talks, and when. */
type Part = 'people' | 'talk' | 'time'
const part = ref<Part>('people')
const tabs = computed(() => [
  { value: 'people' as const, label: t('group.tabs.people') },
  { value: 'talk' as const, label: t('group.tabs.talk') },
  { value: 'time' as const, label: t('report.tabs.time') },
])

const group = computed(() => props.data.report.group)
const health = computed(() => group.value?.health ?? null)
const leader = computed(() => {
  const participants = group.value?.participants ?? []
  return participants.reduce<(typeof participants)[number] | null>(
    (best, item) => (!best || item.messageCount > best.messageCount ? item : best),
    null,
  )
})
/** Members and the month's active ones sit under the pulse as facts, not as two thin tiles. */
const heroFacts = computed(() => {
  const g = group.value
  if (!g) return []
  const active = health.value ? formatNumber(health.value.activeMembersLast30Days) : t('common.na')
  return [
    {
      key: 'members',
      label: t('group.activeMembers'),
      value: formatNumber(health.value?.activeMembers ?? g.participants.length),
    },
    { key: 'active', label: t('group.activeNow'), value: momentum.value ? `${active} · ${momentum.value}` : active },
  ]
})
const momentum = computed(() =>
  health.value && health.value.momentum !== 'unknown' ? t(`group.momentum.${health.value.momentum}`) : null,
)
</script>

<template>
  <UiEmptyState
    v-if="!group"
    :icon="LayoutGrid"
    :title="t('group.noGroupData')"
    :description="t('group.noGroupDataText')"
  />

  <div v-else class="stack stack--lg">
    <ReportHero
      :data="data"
      :label="t('report.kpi.messages')"
      :value="formatNumber(data.report.totals.messages)"
      :facts="heroFacts"
      :note="
        t('report.kpi.sentReceived', {
          sent: formatNumber(data.report.totals.sent),
          received: formatNumber(data.report.totals.received),
        })
      "
    >
      <template #accent>
        <div class="tile__label">{{ t('group.mostActive') }}</div>
        <div class="leader__name">{{ leader ? nameOf(leader) : t('common.na') }}</div>
        <p v-if="leader" class="leader__share">
          <span class="t-figure">{{ formatPercent(leader.messageShare) }}</span>
          <span class="t-small">{{ t('group.ofMessages') }}</span>
        </p>
      </template>
    </ReportHero>

    <ReportNav v-model="part" :options="tabs" :label="t('report.tabs.label')" />
    <ReportPart id="people" :title="t('group.tabs.people')">
      <GroupOverviewTab :group="group" />
      <GroupMembersTab :group="group" />
      <GroupNetworkTab :group="group" />
    </ReportPart>
    <ReportPart id="talk" :title="t('group.tabs.talk')" columns>
      <GroupTalkTab :data="data" :group="group" />
      <GroupContentTab :data="data" :group="group" />
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')">
      <GroupDynamicsTab :data="data" />
    </ReportPart>
  </div>
</template>

<style scoped>
/* The busiest member: the name in the editorial face, their share as the tile's figure at the bottom. */
.leader__name {
  display: -webkit-box;
  overflow: hidden;
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.leader__share {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-top: auto;
  color: var(--text-muted);
}

.leader__share .t-figure {
  color: var(--text);
}
</style>
