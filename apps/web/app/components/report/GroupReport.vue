<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { LayoutGrid } from '../../lib/icons'

/** A group's report, three parts of one long page: the people, how the chat talks, and when. */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()

const group = computed(() => props.data.report.group)
const headlines = useChapterHeadlines(() => props.data)
const answerOf = (id: string) => headlines.value.find((headline) => headline.id === id)?.text ?? null
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
      <GroupPeople :group="group" />
    </ReportPart>
    <ReportPart id="talk" :title="t('group.tabs.talk')" :answer="answerOf('talk')" columns>
      <GroupTalk :data="data" :group="group" />
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')" :answer="answerOf('time')">
      <GroupTime :data="data" />
    </ReportPart>
  </div>
</template>

<style scoped>
.report-flow {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>
