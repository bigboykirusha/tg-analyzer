<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { LayoutGrid } from '../../lib/icons'

const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatPercent } = useI18n()
const nameOf = useParticipantName()

type Tab = 'overview' | 'members' | 'talk' | 'dynamics' | 'network' | 'content'
const tab = ref<Tab>('overview')
const tabs = computed(() =>
  (['overview', 'members', 'talk', 'dynamics', 'network', 'content'] as const).map((value) => ({
    value,
    label: t(`group.${value}`),
  })),
)

const group = computed(() => props.data.report.group)
const health = computed(() => group.value?.health ?? null)
const leader = computed(() => {
  const participants = group.value?.participants ?? []
  return participants.reduce<(typeof participants)[number] | null>(
    (best, item) => (!best || item.messageCount > best.messageCount ? item : best),
    null,
  )
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
      :note="
        t('report.kpi.sentReceived', {
          sent: formatNumber(data.report.totals.sent),
          received: formatNumber(data.report.totals.received),
        })
      "
    >
      <template #accent>
        <div class="tile__label">{{ t('group.mostActive') }}</div>
        <div class="leader">
          <div class="leader__name">{{ leader ? nameOf(leader) : t('common.na') }}</div>
          <p v-if="leader" class="tile__note">
            {{ t('group.shareOfMessages', { value: formatPercent(leader.messageShare) }) }}
          </p>
        </div>
      </template>
      <UiMetricCard
        class="span-6"
        :label="t('group.activeMembers')"
        :value="formatNumber(health?.activeMembers ?? group.participants.length)"
        :sub="t('group.activeMembersSub')"
      />
      <UiMetricCard
        class="span-6"
        :label="t('group.activeNow')"
        :value="health ? formatNumber(health.activeMembersLast30Days) : t('common.na')"
        :sub="momentum"
      />
    </ReportHero>

    <!-- Phones read the whole report as one long page; wider screens switch tabs. -->
    <ReportNav v-model="tab" :options="tabs" :label="t('report.tabs.label')" />
    <GroupOverviewTab v-if="tab === 'overview'" :data="data" :group="group" />
    <GroupMembersTab v-else-if="tab === 'members'" :group="group" />
    <GroupTalkTab v-else-if="tab === 'talk'" :data="data" :group="group" />
    <GroupDynamicsTab v-else-if="tab === 'dynamics'" :data="data" />
    <GroupNetworkTab v-else-if="tab === 'network'" :group="group" />
    <GroupContentTab v-else :data="data" :group="group" />
  </div>
</template>

<style scoped>
.leader {
  display: grid;
  gap: var(--space-2);
}

.leader__name {
  overflow: hidden;
  font: 600 40px/1.05 var(--font-sans);
  letter-spacing: -0.04em;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

@media (max-width: 640px) {
  .leader__name {
    font-size: 32px;
  }
}
</style>
