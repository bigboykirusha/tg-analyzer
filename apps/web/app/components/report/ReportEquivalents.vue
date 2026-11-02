<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/** All voice time of the chat said as flights, a length you can picture. */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatDuration } = useI18n()

/** Moscow — Singapore, seconds in the air. */
const FLIGHT_SEC = 9 * 3600
/** Below half a flight the comparison stops being a picture. */
const MIN_FLIGHTS = 0.5

const seconds = computed(() => {
  const voice = props.data.report.voice
  if (!voice) return 0
  return voice.voice.seconds.mine + voice.voice.seconds.theirs + voice.round.seconds.mine + voice.round.seconds.theirs
})
const flights = computed(() => seconds.value / FLIGHT_SEC)
const caption = computed(() => {
  const count = Math.round(flights.value * 2) / 2
  return count < 1 ? t('report.mix.flightHalf') : t('report.mix.flights', { count: formatNumber(count) })
})
/** The longer of the two bars is the full width. */
const width = (value: number) =>
  `${(Math.min(value, Math.max(seconds.value, FLIGHT_SEC)) / Math.max(seconds.value, FLIGHT_SEC)) * 100}%`
</script>

<template>
  <ReportSection v-if="flights >= MIN_FLIGHTS" :title="t('report.mix.voiceTitle')" :text="caption">
    <p class="scale__figure t-num">{{ formatDuration(seconds) }}</p>
    <div class="scale__rows">
      <div class="scale__row">
        <span>{{ t('report.mix.byVoice') }}</span>
        <i class="scale__bar"><b :style="{ width: width(seconds) }" /></i>
      </div>
      <div class="scale__row">
        <span>{{ t('report.mix.oneFlight') }}</span>
        <i class="scale__bar"><b :style="{ width: width(FLIGHT_SEC) }" /></i>
      </div>
    </div>
  </ReportSection>
</template>

<style scoped>
.scale__figure {
  font: var(--text-figure);
  letter-spacing: -0.04em;
}

.scale__rows {
  display: grid;
  gap: var(--space-2);
}

.scale__row {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  color: var(--text-muted);
  font: var(--text-small);
}

.scale__bar {
  display: block;
  height: var(--space-2);
  border-radius: var(--radius-full);
  background: var(--fill-raised);
  overflow: hidden;
}

.scale__bar b {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--text);
}
</style>
