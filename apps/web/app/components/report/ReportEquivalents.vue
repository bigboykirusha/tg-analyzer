<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Plane } from '../../lib/icons'

/** All voice time of the chat said as flights, a length you can picture. */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatDuration, formatDay } = useI18n()

/** Moscow — Singapore, seconds in the air. */
const FLIGHT_SEC = 9 * 3600
/** Below half a flight the comparison stops being a picture. */
const MIN_FLIGHTS = 0.5
/** More planes than this stop being counted at a glance. */
const MAX_PLANES = 8

const seconds = computed(() => {
  const voice = props.data.report.voice
  if (!voice) return 0
  return voice.voice.seconds.mine + voice.voice.seconds.theirs + voice.round.seconds.mine + voice.round.seconds.theirs
})
const flights = computed(() => seconds.value / FLIGHT_SEC)
const rounded = computed(() => Math.round(flights.value * 2) / 2)
const caption = computed(() =>
  rounded.value < 1 ? t('report.mix.flightHalf') : t('report.mix.flights', { count: formatNumber(rounded.value) }),
)
const comparisons = computed(() =>
  t('report.fmt.voiceComparisons', {
    films: formatNumber(Math.round(seconds.value / (90 * 60))),
    episodes: formatNumber(Math.round(seconds.value / (25 * 60))),
  }),
)
const planes = computed(() => Math.min(MAX_PLANES, Math.max(1, Math.round(flights.value))))
const longest = computed(() => {
  const record = props.data.report.voice?.voice.longest
  if (!record) return null
  return t('report.fmt.voiceLongest', {
    time: formatDuration(record.seconds),
    who: record.mine ? t('report.fmt.yours') : props.data.summary.title,
    date: formatDay(record.at.slice(0, 10), { day: 'numeric', month: 'long' }),
  })
})
</script>

<template>
  <ReportSection v-if="flights >= MIN_FLIGHTS" tone="ink" :title="t('report.mix.voiceTitle')">
    <p class="scale__figure t-num">{{ formatDuration(seconds) }}</p>
    <p class="scale__caption">
      {{ t('report.fmt.flightsSentence', { flights: caption }) }}
      <span class="scale__planes" aria-hidden="true"><Plane v-for="index in planes" :key="index" /></span>
    </p>
    <p class="scale__note">{{ comparisons }}</p>
    <p v-if="longest" class="scale__note">{{ longest }}</p>
  </ReportSection>
</template>

<style scoped>
.scale__figure {
  font: var(--text-figure);
  letter-spacing: -0.04em;
}

.scale__caption {
  font: var(--text-lede);
  font-weight: 500;
}

.scale__planes {
  display: inline-flex;
  gap: var(--space-1);
  margin-left: var(--space-1);
  color: var(--them);
  vertical-align: -0.2em;
}

.scale__planes svg {
  width: 20px;
  height: 20px;
}

.scale__note {
  color: var(--text-muted);
  font: var(--text-small);
}
</style>
