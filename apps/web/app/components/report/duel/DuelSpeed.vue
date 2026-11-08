<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/**
 * Who replies faster, in words (plaque «Е»): «×3» large in the faster side's colour, the answer as a
 * sentence, and one line of the two usual reply times. When neither leads there is no multiplier:
 * the answer says so and the line gives both times.
 */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t, formatNumber } = useI18n()
const pair = computed(() => props.item.pairs[0]!)

const times = computed(() => (Number.isFinite(props.item.ratio) ? Math.round(props.item.ratio * 10) / 10 : null))
const answer = computed(() => {
  const { lead, note } = props.item
  if (lead === 'mine') return t('report.speed.answerMine', { note })
  if (lead === 'theirs') return t('report.speed.answerTheirs', { name: props.theirName, note })
  return t('report.fmt.speedEven')
})
/** «обычно за 3 мин, вы — за 11 мин»: the faster side first. */
const usual = computed(() =>
  props.item.lead === 'mine'
    ? t('report.speed.usualMine', { mine: pair.value.mine.text, name: props.theirName, theirs: pair.value.theirs.text })
    : t('report.speed.usualTheirs', { theirs: pair.value.theirs.text, mine: pair.value.mine.text }),
)
</script>

<template>
  <ReportSection :title="item.title" class="speed" :class="{ 'speed--lead': item.lead && times }">
    <p v-if="item.lead && times" class="speed__times t-num" :class="`speed__times--${item.lead}`" aria-hidden="true">
      ×{{ formatNumber(times) }}
    </p>
    <p class="speed__answer">{{ answer }}</p>
    <p class="speed__usual t-num">{{ usual }}</p>
    <p class="speed__note">{{ t('report.speed.text') }}</p>
  </ReportSection>
</template>

<style scoped>
/* With a multiplier the card is a centred figure; without one it reads like the other cards. */
.speed--lead :deep(.report-section__head) {
  justify-items: center;
  text-align: center;
}

.speed__times {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
  text-align: center;
}

.speed__times--mine {
  color: var(--you);
}

.speed__times--theirs {
  color: var(--them-ink);
}

.speed__answer {
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
  text-wrap: balance;
}

.speed__usual,
.speed__note {
  color: var(--text-muted);
  font: var(--text-small);
}

.speed--lead .speed__answer,
.speed--lead .speed__usual,
.speed--lead .speed__note {
  text-align: center;
}

.speed__note {
  font: var(--text-caption);
}
</style>
