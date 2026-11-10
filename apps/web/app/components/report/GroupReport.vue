<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { LayoutGrid } from '../../lib/icons'

/**
 * A group's report under its poster (the poster has «В ролях»): «Люди», «Роли», «Пары», «Время», «Слова и
 * эмодзи» — five cards, one anatomy each, in reading order.
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
    <GroupPeople :group="data.report.group" />
    <GroupRoles :group="data.report.group" />
    <GroupPairs :group="data.report.group" />
    <GroupTime :data="data" />
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
