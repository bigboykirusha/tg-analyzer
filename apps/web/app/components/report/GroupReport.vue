<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { LayoutGrid } from '../../lib/icons'

/**
 * A group's report under its poster (the poster has «В ролях»), in four chapters:
 * «Люди» (the people, the roles, the pairs), «Общение» (reactions, who starts, own words, stickers),
 * «Время» (the hours, the calendar, the weekdays) and «О чём» (the shared words and the emoji).
 */
defineProps<{ data: ReportDto }>()
const { t } = useI18n()
</script>

<template>
  <UiEmptyState
    v-if="!data.report.group"
    :icon="LayoutGrid"
    :title="t('group.noGroupData')"
    :description="t('group.noGroupDataText')"
  />

  <div v-else class="report-flow">
    <ReportPart id="people" :title="t('group.tabs.people')">
      <GroupPeople :group="data.report.group" :words="data.derived.words.group" :total="data.report.totals.messages" />
      <ReportPanel>
        <GroupRoles :group="data.report.group" />
        <template #aside><GroupPairs :group="data.report.group" /></template>
      </ReportPanel>
    </ReportPart>
    <ReportPart id="talk" :title="t('group.tabs.talk')">
      <GroupTalk :data="data" :group="data.report.group" />
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')">
      <ReportPanel wide-aside>
        <ReportTime :data="data" />
        <template #aside>
          <ReportWeek :weekday="data.report.activity.weekday" :heatmap="data.report.activity.heatmap" />
        </template>
        <template #footer><ReportDays :data="data" /></template>
      </ReportPanel>
    </ReportPart>
    <GroupWords :data="data" :group="data.report.group" />
  </div>
</template>
