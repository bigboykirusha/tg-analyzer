<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Versus } from '../../../composables/useVersus'

/**
 * Reply time as one fact, Wrapped-style: the usual answer large, both sides under it, and the
 * spread of replies below. A half-width card, paired with who starts.
 */
const props = defineProps<{ data: ReportDto; item: Versus }>()
const { t } = useI18n()
const name = computed(() => props.data.summary.title)
const responses = computed(() => props.data.report.responses)
const pair = computed(() => props.item.pairs[0]!)

const hasHistogram = computed(
  () => Boolean(responses.value.histogram) && responses.value.mineSamples + responses.value.theirsSamples > 0,
)

/** The figure is the leader's usual answer; when even, yours (they are about the same). */
const figure = computed(() => (props.item.lead === 'theirs' ? pair.value.theirs.text : pair.value.mine.text))
</script>

<template>
  <ReportSection :title="item.title" :text="t('report.speed.text')">
    <div class="speed">
      <div class="speed__fact">
        <span class="speed__label">{{ t('report.fmt.speedLabel') }}</span>
        <p class="speed__figure t-num">{{ figure }}</p>
        <p class="speed__sides t-num">
          {{ t('report.you') }} · {{ pair.mine.text }} &nbsp; {{ name }} · {{ pair.theirs.text }}
        </p>
      </div>
      <ReplySpeedChart v-if="hasHistogram" :histogram="responses.histogram!" :received-label="name" />
    </div>
  </ReportSection>
</template>

<style scoped>
.speed {
  display: grid;
  gap: var(--space-4);
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
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
  white-space: nowrap;
}

.speed__sides {
  color: var(--text-muted);
  font: var(--text-small);
}
</style>
