<script setup lang="ts">
import type { HabitId, ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../lib/icons'

/**
 * A private chat's report under its poster: long on purpose, every finding at the size of a finding.
 *   «Главное» — the few things this chat stands out with (the run of days, the balance, the busiest day);
 *   «Вы и {имя}» — the relationship score and the match sheet of everything the two sides compare in;
 *   «Время» — the hours and parts of the day, the calendar and weekdays, the records, the milestones;
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
    <ReportPart id="main" :title="t('report.tabs.main')">
      <ReportHighlights :data="data" />
    </ReportPart>
    <ReportPart id="together" :title="t('report.tabs.withName', { name: data.summary.title })">
      <ReportRelationship :data="data" />
      <ReportMatch :data="data" />
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')">
      <ReportTime :data="data" parts />
      <ReportDays :data="data" />
      <ReportRecords :data="data" />
      <ReportMilestones :data="data" />
    </ReportPart>
    <ReportPart id="talk" :title="t('report.tabs.talk')">
      <ReportFormats :data="data" />
      <ReportVoice :data="data" />
      <DuelReactions v-if="known('reactions')" :data="data" :item="versus.reactions ?? null" />
      <DuelStickers v-if="known('stickers')" :data="data" />
    </ReportPart>
    <ReportPart v-if="!noWords" id="words" :title="t('report.tabs.words')">
      <ReportWordOfChat :data="data" />
      <ReportTopWords :data="data" />
      <ReportVocabulary :data="data" />
      <ReportFavourites :data="data" lean />
    </ReportPart>
    <p v-if="outdated" class="report-note t-label" role="status">
      <Info aria-hidden="true" />
      {{ t('report.talk.outdated') }}
    </p>
  </div>
</template>

<style scoped>
.report-flow {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.report-note {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--text-muted);
  --icon-size: var(--icon-sm);
}
</style>
