<script setup lang="ts">
import type { HabitId, ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../lib/icons'

/**
 * A private chat's report under its poster: long on purpose, every finding at the size of a finding.
 *   «Вы и {имя}» — message balance, conversation habits and the combined score;
 *   «Время» — the hours and parts of the day, mornings and nights, the calendar and weekdays, the records, the milestones;
 *   «Как говорите» — what the chat is made of, voice, reactions, stickers;
 *   «О чём» — the word of the chat, the top words, each side's own words, the favourite emoji.
 * A card the chat is too small for is not drawn at all (the floors live in `@tg-analyzer/shared`), so a
 * short chat shows fewer cards, never weak ones.
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
      <div class="report-row">
        <ReportSplit :data="data" />
        <ReportConversation :data="data" />
      </div>
      <ReportRelationship :data="data" />
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')">
      <div class="report-row">
        <ReportTime :data="data" parts />
        <ReportWeek :weekday="data.report.activity.weekday" />
      </div>
      <ReportDays :data="data" streak />
      <ReportRituals :data="data" />
      <div class="report-row">
        <ReportRecords :data="data" />
        <ReportMilestones :data="data" />
      </div>
    </ReportPart>
    <ReportPart id="talk" :title="t('report.tabs.talk')">
      <div class="report-row">
        <ReportFormats :data="data" />
        <ReportVoice :data="data" />
      </div>
      <div class="report-row">
        <DuelReactions v-if="known('reactions')" :data="data" :item="versus.reactions ?? null" />
        <DuelStickers v-if="known('stickers')" :data="data" />
      </div>
    </ReportPart>
    <ReportPart v-if="!noWords" id="words" :title="t('report.tabs.words')">
      <div class="report-row">
        <ReportWordOfChat :data="data" />
        <ReportTopWords :data="data" />
      </div>
      <div class="report-row">
        <ReportVocabulary :data="data" />
        <ReportFavourites :data="data" lean />
      </div>
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
