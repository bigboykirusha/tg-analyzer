<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { LayoutGrid } from '../../lib/icons'

/**
 * A group's report under its poster (the poster has «В ролях»), four parts of cards of one anatomy:
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
      <GroupRoles :group="data.report.group" />
      <GroupPairs :group="data.report.group" />
    </ReportPart>
    <ReportPart id="talk" :title="t('group.tabs.talk')">
      <GroupTalk :data="data" :group="data.report.group" />
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')">
      <!-- The calendar takes its row; the dial and the week share the next one, no dial alone in a whole row (17.11). -->
      <ReportDays :data="data" week-beside />
      <GroupTime :data="data" />
    </ReportPart>
    <GroupWords :data="data" :group="data.report.group" />
  </div>
</template>

<style scoped>
.report-flow {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
  min-width: 0;
}
</style>
