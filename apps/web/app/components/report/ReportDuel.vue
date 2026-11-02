<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Вы двое»: every two-sided habit as a card of its own. Reply speed carries its chart and
 * takes the full width, voice holds voice messages and video notes, the rest go in pairs.
 */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()
const cards = useVersus(() => props.data)
const name = computed(() => props.data.summary.title)

const responses = computed(() => props.data.report.responses)
const hasHistogram = computed(
  () => Boolean(responses.value.histogram) && responses.value.mineSamples + responses.value.theirsSamples > 0,
)

/** Cards that share a row; a lone one in a row takes the full width. */
const rows = computed(() =>
  [['starts', 'length'], ['questions', 'reactions'], ['voice'], ['morning', 'night']].flatMap((keys) => {
    const present = keys.map((key) => cards.value[key]).filter((item) => item !== null && item !== undefined)
    return present.map((item) => ({ item: item!, wide: present.length === 1 }))
  }),
)
</script>

<template>
  <div class="report-grid report-grid--even">
    <ReportSection v-if="cards.speed" wide :title="cards.speed.title" :text="t('report.speed.text')">
      <div class="speed">
        <ReportVersus :item="cards.speed" :their-name="name" />
        <ReplySpeedChart v-if="hasHistogram" :histogram="responses.histogram!" :received-label="name" />
      </div>
    </ReportSection>

    <ReportSection v-for="row in rows" :key="row.item.key" :wide="row.wide" :title="row.item.title">
      <ReportVersus :item="row.item" :their-name="name" />
    </ReportSection>
  </div>
</template>

<style scoped>
/* Wide screens: the verdict on the left, the distribution on the right. */
.speed {
  display: grid;
  gap: var(--space-6);
}

@media (min-width: 901px) {
  .speed {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    align-items: center;
  }
}
</style>
