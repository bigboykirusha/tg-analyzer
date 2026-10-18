<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { LayoutGrid } from '../../lib/icons'

const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatPercent } = useI18n()
const nameOf = useParticipantName()

type Tab = 'overview' | 'members' | 'dynamics' | 'network' | 'content'
const tab = ref<Tab>('overview')
const isPhone = useMediaQuery('(max-width: 640px)')
const tabs = computed(() =>
  (['overview', 'members', 'dynamics', 'network', 'content'] as const).map((value) => ({
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
    <ReportKpis>
      <UiMetricCard
        :label="t('report.kpi.messages')"
        :value="formatNumber(data.report.totals.messages)"
        :sub="
          t('report.kpi.sentReceived', {
            sent: formatNumber(data.report.totals.sent),
            received: formatNumber(data.report.totals.received),
          })
        "
      />
      <UiMetricCard
        :label="t('group.activeMembers')"
        :value="formatNumber(health?.activeMembers ?? group.participants.length)"
        :sub="t('group.activeMembersSub')"
      />
      <UiMetricCard
        :label="t('group.activeNow')"
        :value="health ? formatNumber(health.activeMembersLast30Days) : t('common.na')"
        :sub="momentum"
      />
      <UiMetricCard
        :label="t('group.mostActive')"
        :value="leader ? nameOf(leader) : t('common.na')"
        :sub="leader ? t('group.shareOfMessages', { value: formatPercent(leader.messageShare) }) : null"
      />
    </ReportKpis>

    <!-- Phones read the whole report as one long page; wider screens switch tabs. -->
    <ReportNav v-model="tab" :options="tabs" :label="t('report.tabs.label')" :scroll="isPhone" />
    <template v-if="isPhone">
      <ReportPart id="overview" :title="tabs[0]!.label"><GroupOverviewTab :data="data" :group="group" /></ReportPart>
      <ReportPart id="members" :title="tabs[1]!.label"><GroupMembersTab :group="group" /></ReportPart>
      <ReportPart id="dynamics" :title="tabs[2]!.label"><GroupDynamicsTab :data="data" /></ReportPart>
      <ReportPart id="network" :title="tabs[3]!.label"><GroupNetworkTab :group="group" /></ReportPart>
      <ReportPart id="content" :title="tabs[4]!.label"><GroupContentTab :data="data" :group="group" /></ReportPart>
    </template>
    <template v-else>
      <GroupOverviewTab v-if="tab === 'overview'" :data="data" :group="group" />
      <GroupMembersTab v-else-if="tab === 'members'" :group="group" />
      <GroupDynamicsTab v-else-if="tab === 'dynamics'" :data="data" />
      <GroupNetworkTab v-else-if="tab === 'network'" :group="group" />
      <GroupContentTab v-else :data="data" :group="group" />
    </template>
  </div>
</template>
