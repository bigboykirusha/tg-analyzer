<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Versus } from '../../../composables/useVersus'

/**
 * Voice in one card: one number — how long you talked to each other, with a picture of that length
 * («вместе — это два фильма подряд») — then two rows: who talks more and the longest recording.
 */
const props = defineProps<{ item: Versus; data: ReportDto }>()
const { t, tc, formatDuration, formatCountdown, formatDay } = useI18n()

/** A picture of the length starts at half an hour; the longest recording at a minute. */
const MIN_PICTURE_SEC = 30 * 60
const MIN_LONGEST_SEC = 60
const FILM_SEC = 90 * 60
const SONG_SEC = 3 * 60

const name = computed(() => props.data.summary.title)
const seconds = computed(() => {
  const stats = props.data.report.voice
  if (!stats) return 0
  return stats.voice.seconds.mine + stats.voice.seconds.theirs + stats.round.seconds.mine + stats.round.seconds.theirs
})

/** The one number: everything you said to each other, and a picture of that length. */
const together = computed(() => {
  if (!seconds.value) return null
  const films = Math.round(seconds.value / FILM_SEC)
  const picture =
    seconds.value < MIN_PICTURE_SEC
      ? null
      : films >= 2
        ? tc('report.album.films', films)
        : tc('report.album.songs', Math.round(seconds.value / SONG_SEC))
  return { value: formatDuration(seconds.value), note: picture ? t('report.voice.togetherNote', { picture }) : null }
})

/** Rows: who talks more («Мила, в 3 раза») and the longest recording («Самое длинное, 3 авг — 6:42»). */
const rows = computed(() => {
  const out: { key: string; label: string; value: string; theirs?: boolean }[] = []
  out.push({
    key: 'lead',
    label: t('report.voice.leader'),
    value: props.item.lead
      ? `${props.item.lead === 'mine' ? t('report.you') : name.value}, ${props.item.note}`
      : t('report.habits.even'),
    theirs: props.item.lead === 'theirs',
  })
  const longest = props.data.report.voice?.voice.longest
  if (longest && longest.seconds >= MIN_LONGEST_SEC) {
    const day = formatDay(longest.at.slice(0, 10), { day: 'numeric', month: 'short' })
    out.push({
      key: 'longest',
      label: `${t('report.voice.longest')}, ${day}`,
      value: formatCountdown(longest.seconds),
    })
  }
  return out
})
</script>

<template>
  <ReportSection :title="item.title">
    <div v-if="together" class="voice__total">
      <p class="voice__figure t-num">{{ together.value }}</p>
      <p v-if="together.note" class="voice__note">{{ together.note }}</p>
    </div>
    <dl class="voice__rows">
      <div v-for="row in rows" :key="row.key" class="voice__row">
        <dt>{{ row.label }}</dt>
        <dd class="t-num" :class="{ 'voice__value--theirs': row.theirs }">{{ row.value }}</dd>
      </div>
    </dl>
  </ReportSection>
</template>

<style scoped>
.voice__figure {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

.voice__note {
  color: var(--text-muted);
  font: var(--text-small);
}

.voice__rows {
  display: grid;
  margin: 0;
}

.voice__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  box-shadow: var(--divider-top);
}

.voice__row dt {
  color: var(--text-muted);
  font: var(--text-ui);
  font-weight: 400;
}

.voice__row dd {
  margin: 0;
  font: var(--text-title);
  font-weight: 600;
  text-align: right;
}

.voice__value--theirs {
  color: var(--them-ink);
}
</style>
