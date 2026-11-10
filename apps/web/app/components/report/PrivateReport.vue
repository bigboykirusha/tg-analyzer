<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../lib/icons'

/**
 * A private chat's report under its poster: five cards in reading order, one anatomy each — «Баланс»,
 * «Привычки», «Время», «Слова», «Эмодзи и реакции». A card the chat is too small for is not drawn at all
 * (the floors live in `@tg-analyzer/shared`), so a short chat shows fewer cards, never weak ones.
 * `noWords`: a shared link without words — the words and emoji go away instead of standing empty.
 */
const props = defineProps<{ data: ReportDto; noWords?: boolean }>()
defineEmits<{ profanity: [show: boolean] }>()
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
    <ReportBalance :data="data" />
    <ReportHabits :data="data" />
    <ReportTime :data="data" />
    <template v-if="!noWords">
      <ReportWords :data="data" @profanity="$emit('profanity', $event)" />
      <ReportFavourites :data="data" />
    </template>
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
  gap: var(--card-gap);
  min-width: 0;
}

.report-note {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--text-muted);
  --icon-size: var(--icon-sm);
}

/* Desktop: two columns in reading order — «Баланс» and «Привычки» side by side, «Время» across, then the words. */
@media (min-width: 901px) {
  .report-flow {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .report-flow > .report-section--wide,
  .report-flow > .report-note {
    grid-column: 1 / -1;
  }
}
</style>
