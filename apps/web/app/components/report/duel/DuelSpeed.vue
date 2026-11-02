<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Versus } from '../../../composables/useVersus'

/**
 * Reply time as one fact, Wrapped-style: the usual answer large, a plain sentence that says
 * who is faster, and the spread of replies next to it.
 */
const props = defineProps<{ data: ReportDto; item: Versus }>()
const { t, formatDecimal } = useI18n()
const name = computed(() => props.data.summary.title)
const responses = computed(() => props.data.report.responses)
const pair = computed(() => props.item.pairs[0]!)

const hasHistogram = computed(
  () => Boolean(responses.value.histogram) && responses.value.mineSamples + responses.value.theirsSamples > 0,
)

/** The figure is the leader's usual answer; when even, yours (they are about the same). */
const figure = computed(() => (props.item.lead === 'theirs' ? pair.value.theirs.text : pair.value.mine.text))
const sentence = computed(() => {
  const { lead, ratio } = props.item
  if (!lead) {
    const fast = Math.max(pair.value.mine.value, pair.value.theirs.value) < 60
    return fast ? t('report.fmt.speedEvenFast') : t('report.fmt.speedEven')
  }
  return t(lead === 'mine' ? 'report.fmt.speedMine' : 'report.fmt.speedTheirs', {
    name: name.value,
    ratio: formatDecimal(ratio),
    mine: pair.value.mine.text,
    theirs: pair.value.theirs.text,
  })
})
</script>

<template>
  <ReportSection wide :title="item.title" :text="t('report.speed.text')">
    <div class="speed">
      <div class="speed__fact">
        <span class="speed__label">{{ t('report.fmt.speedLabel') }}</span>
        <p class="speed__figure t-num">{{ figure }}</p>
        <p class="speed__sentence">{{ sentence }}</p>
      </div>
      <ReplySpeedChart v-if="hasHistogram" :histogram="responses.histogram!" :received-label="name" />
    </div>
  </ReportSection>
</template>

<style scoped>
.speed {
  display: grid;
  gap: var(--space-6);
}

.speed__fact {
  display: grid;
  align-content: start;
  gap: var(--space-3);
}

.speed__label {
  color: var(--text-muted);
  font: var(--text-label);
}

.speed__figure {
  font: var(--text-figure-lg);
  letter-spacing: -0.04em;
  white-space: nowrap;
}

.speed__sentence {
  max-width: 28rem;
  font: var(--text-lede);
  font-weight: 500;
}

@media (min-width: 901px) {
  .speed {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    align-items: center;
  }
}
</style>
