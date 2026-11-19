<script setup lang="ts">
import type { HabitId, ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../lib/icons'

/**
 * The body of a private report. Related findings share a surface and stack in reading order on narrow screens.
 * `noWords`: a shared link without words — the words and emoji go away instead of standing empty.
 */
const props = defineProps<{ data: ReportDto; noWords?: boolean }>()
const { t } = useI18n()
const versus = useVersus(() => props.data)
/** Habits without enough events behind them leave their cards out (`derived.habitRows.skipped`). */
const known = (id: HabitId) => !props.data.derived.habitRows.skipped.includes(id)
/** Reports made before voice and rituals were counted: say so instead of leaving cards out silently. */
const outdated = computed(() => !props.data.report.voice || !props.data.report.rituals)
</script>

<template>
  <div class="report-flow">
    <p v-if="data.report.totals.messages < 20" class="report-note t-label" role="status">
      <Info aria-hidden="true" />
      {{ t('report.lowData') }}
    </p>
    <ReportPart id="together" :title="t('report.tabs.withName', { name: data.summary.title })">
      <ReportPanel wide-aside>
        <ReportSplit :data="data" />
        <ReportReplyDistribution :data="data" />
        <template #aside><ReportConversation :data="data" /></template>
        <template #footer><ReportRelationship :data="data" /></template>
      </ReportPanel>
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')">
      <ReportPanel wide-aside>
        <ReportTime :data="data" parts />
        <template #aside>
          <ReportWeek :weekday="data.report.activity.weekday" :heatmap="data.report.activity.heatmap" />
        </template>
        <template #footer><ReportDays :data="data" streak /></template>
      </ReportPanel>
      <ReportRituals :data="data" />
      <ReportPanel>
        <ReportRecords :data="data" />
        <template #aside><ReportMilestones :data="data" /></template>
      </ReportPanel>
    </ReportPart>
    <ReportPart id="talk" :title="t('report.tabs.talk')">
      <ReportPanel>
        <ReportFormats :data="data" />
        <template #aside><ReportVoice :data="data" /></template>
      </ReportPanel>
      <ReportPanel>
        <DuelReactions v-if="known('reactions')" :data="data" :item="versus.reactions ?? null" />
        <template #aside><DuelStickers v-if="known('stickers')" :data="data" /></template>
      </ReportPanel>
    </ReportPart>
    <ReportPart v-if="!noWords" id="words" :title="t('report.tabs.words')">
      <ReportPanel wide-aside>
        <ReportWordOfChat :data="data" />
        <ReportVocabulary :data="data" />
        <template #aside>
          <ReportTopWords :data="data" />
          <ReportFavourites :data="data" lean />
        </template>
      </ReportPanel>
    </ReportPart>
    <p v-if="outdated" class="report-note t-label" role="status">
      <Info aria-hidden="true" />
      {{ t('report.talk.outdated') }}
    </p>
  </div>
</template>

<style scoped>
.report-note {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--text-muted);
  --icon-size: var(--icon-sm);
}
</style>
