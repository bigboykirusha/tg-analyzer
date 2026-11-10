<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../lib/icons'

/**
 * A private chat's report under its poster, three parts of cards of one anatomy:
 *   «Вы двое» — balance, reply speed, habits, questions, stickers, reactions, voice;
 *   «Время» — the usual hours and the parts of the day, the records, the calendar and the weekdays;
 *   «О чём» — the word of the chat, each side's own words, the favourite emoji.
 * A card the chat is too small for is not drawn at all (the floors live in `@tg-analyzer/shared`), so a
 * short chat shows fewer cards, never weak ones.
 * `noWords`: a shared link without words — the words and emoji go away instead of standing empty.
 */
const props = defineProps<{ data: ReportDto; noWords?: boolean }>()
const { t } = useI18n()
/** Reports made before voice and rituals were counted: say so instead of leaving cards out silently. */
const outdated = computed(() => !props.data.report.voice || !props.data.report.rituals)
</script>

<template>
  <div class="report-flow">
    <p v-if="data.report.totals.messages < 20" class="report-note t-label" role="status">
      <Info aria-hidden="true" />
      {{ t('report.lowData') }}
    </p>
    <ReportPart id="together" :title="t('report.tabs.together')">
      <ReportBalance :data="data" />
      <ReportDuel :data="data" />
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')">
      <ReportTime :data="data" parts />
      <ReportRecords :data="data" />
      <ReportDays :data="data" />
    </ReportPart>
    <ReportPart v-if="!noWords" id="words" :title="t('report.tabs.words')">
      <ReportWordOfChat :data="data" />
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
