<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Versus } from '../../../composables/useVersus'

/**
 * Voice in one card: who talks more (voice messages and video notes together, by length), one
 * line of both lengths, and two facts under it — how long it is all together, with one picture of
 * that length («12 фильмов подряд»), and the longest voice message.
 */
const props = defineProps<{ item: Versus; data: ReportDto }>()
const { t, tc, formatDuration, formatCountdown, formatDay } = useI18n()

/** A picture of the length starts at half an hour; the longest recording at a minute. */
const MIN_PICTURE_SEC = 30 * 60
const MIN_LONGEST_SEC = 60
const FILM_SEC = 90 * 60
const SONG_SEC = 3 * 60

const name = computed(() => props.data.summary.title)
const sides = computed(() => {
  const total = (key: 'mine' | 'theirs') => props.item.pairs.reduce((sum, pair) => sum + pair[key].value, 0)
  return { mine: total('mine'), theirs: total('theirs') }
})
const seconds = computed(() => {
  const stats = props.data.report.voice
  if (!stats) return 0
  return stats.voice.seconds.mine + stats.voice.seconds.theirs + stats.round.seconds.mine + stats.round.seconds.theirs
})
const sideSeconds = (side: 'mine' | 'theirs') => {
  const stats = props.data.report.voice
  return stats ? stats.voice.seconds[side] + stats.round.seconds[side] : 0
}

const facts = computed(() => {
  const out: { key: string; label: string; value: string }[] = []
  if (seconds.value >= MIN_PICTURE_SEC) {
    const films = Math.round(seconds.value / FILM_SEC)
    const picture =
      films >= 2 ? tc('report.album.films', films) : tc('report.album.songs', Math.round(seconds.value / SONG_SEC))
    out.push({
      key: 'together',
      label: t('report.voice.together'),
      value: `${formatDuration(seconds.value)}, ${picture}`,
    })
  }
  const longest = props.data.report.voice?.voice.longest
  if (longest && longest.seconds >= MIN_LONGEST_SEC) {
    const who = longest.mine ? t('report.you') : name.value
    const day = formatDay(longest.at.slice(0, 10), { day: 'numeric', month: 'long' })
    out.push({
      key: 'longest',
      label: t('report.voice.longest'),
      value: `${formatCountdown(longest.seconds)} · ${who} · ${day}`,
    })
  }
  return out
})
</script>

<template>
  <ReportSection :title="item.title" :answer="item.lead ? `${item.figure} — ${item.note}` : t('report.fmt.voiceEven')">
    <ReportLine
      :mine="sides.mine"
      :theirs="sides.theirs"
      :left="formatDuration(sideSeconds('mine'))"
      :right="formatDuration(sideSeconds('theirs'))"
    />
    <dl v-if="facts.length" class="fact-line">
      <div v-for="fact in facts" :key="fact.key">
        <dt>{{ fact.label }}</dt>
        <dd class="t-num">{{ fact.value }}</dd>
      </div>
    </dl>
  </ReportSection>
</template>
