<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { LayoutGrid } from '../../lib/icons'
import { hueOf } from '../../lib/hue'

const props = defineProps<{ data: ReportDto }>()
const { t, formatPercent } = useI18n()
const nameOf = useParticipantName()

/** Three parts of one long page: the people, how the chat talks, and when. */
const group = computed(() => props.data.report.group)
const headlines = useChapterHeadlines(() => props.data)
const answerOf = (id: string) => headlines.value.find((headline) => headline.id === id)?.text ?? null
/** A clear leader only: a one-point lead is not a finding (25% more messages than the next one). */
const clearLeader = computed(() => {
  const participants = [...(group.value?.participants ?? [])].sort((a, b) => b.messageCount - a.messageCount)
  const [first, second] = participants
  if (!first) return null
  return !second || first.messageCount >= second.messageCount * 1.25 ? first : null
})
</script>

<template>
  <UiEmptyState
    v-if="!group"
    :icon="LayoutGrid"
    :title="t('group.noGroupData')"
    :description="t('group.noGroupDataText')"
  />

  <div v-else class="report-flow">
    <ReportPart id="people" :title="t('group.tabs.people')" :answer="answerOf('people')">
      <ReportSection
        :title="t('group.mostActive')"
        :answer="clearLeader ? nameOf(clearLeader) : t('group.leader.even')"
        :data-hue="clearLeader && !clearLeader.isSelf ? hueOf(clearLeader.id) : undefined"
      >
        <p v-if="clearLeader" class="leader__share" :class="{ 'leader__share--you': clearLeader.isSelf }">
          <span class="t-figure">{{ formatPercent(clearLeader.messageShare) }}</span>
          <span class="t-small">{{ t('group.ofMessages') }}</span>
        </p>
      </ReportSection>
      <GroupOverviewTab :group="group" />
      <GroupMembersTab :group="group" />
      <GroupNetworkTab :group="group" />
    </ReportPart>
    <ReportPart id="talk" :title="t('group.tabs.talk')" :answer="answerOf('talk')" columns>
      <GroupTalkTab :data="data" :group="group" />
      <GroupContentTab :data="data" :group="group" />
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')" :answer="answerOf('time')">
      <GroupDynamicsTab :data="data" />
    </ReportPart>
  </div>
</template>

<style scoped>
.leader__share {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  color: var(--text-muted);
}

.leader__share .t-figure {
  color: var(--them-ink);
}

.leader__share--you .t-figure {
  color: var(--you);
}
</style>
