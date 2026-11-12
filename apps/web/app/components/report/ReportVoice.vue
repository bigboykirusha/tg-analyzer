<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { AudioLines } from '../../lib/icons'
import type { ReportTile } from './ReportTiles.vue'

/**
 * «Голосом»: how long you talked to each other in voice messages and video notes as the one big number,
 * with a picture of that length («это два фильма подряд»), then the counts and the longest recordings as
 * numbers of their own — whose and when. Who talks more lives in «Вы и {имя}».
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatDuration, formatCountdown, formatDay, formatNumber } = useI18n()

/** Fewer recordings than this together is not a habit. */
const MIN = 5
const MIN_PICTURE_SEC = 30 * 60
const FILM_SEC = 90 * 60
const SONG_SEC = 3 * 60

const name = computed(() => props.data.summary.title)
const voice = computed(() => props.data.report.voice)
const count = computed(() => {
  const stats = voice.value
  if (!stats) return 0
  return stats.voice.count.mine + stats.voice.count.theirs + stats.round.count.mine + stats.round.count.theirs
})
const seconds = computed(() => {
  const stats = voice.value
  if (!stats) return 0
  return stats.voice.seconds.mine + stats.voice.seconds.theirs + stats.round.seconds.mine + stats.round.seconds.theirs
})

const answer = computed(() => {
  if (seconds.value < MIN_PICTURE_SEC) return t('report.voice.together')
  const films = Math.round(seconds.value / FILM_SEC)
  const picture =
    films >= 2 ? tc('report.album.films', films) : tc('report.album.songs', Math.round(seconds.value / SONG_SEC))
  return t('report.voice.togetherNote', { picture })
})

const whose = (mine: boolean) => (mine ? t('report.you') : name.value)
const day = (value: string) => formatDay(value.slice(0, 10), { day: 'numeric', month: 'long' })

const tiles = computed<ReportTile[]>(() => {
  const stats = voice.value
  if (!stats) return []
  const out: ReportTile[] = []
  const sides = (side: { mine: number; theirs: number }) =>
    t('report.voice.sides', { mine: formatNumber(side.mine), name: name.value, theirs: formatNumber(side.theirs) })
  const voices = stats.voice.count.mine + stats.voice.count.theirs
  if (voices)
    out.push({
      key: 'voices',
      label: t('report.duel.voiceLabel'),
      value: formatNumber(voices),
      sub: sides(stats.voice.count),
    })
  const rounds = stats.round.count.mine + stats.round.count.theirs
  if (rounds)
    out.push({
      key: 'rounds',
      label: t('report.duel.roundLabel'),
      value: formatNumber(rounds),
      sub: sides(stats.round.count),
    })
  const longest = stats.voice.longest
  if (longest && longest.seconds > 0)
    out.push({
      key: 'longest',
      label: t('report.voice.longestVoice'),
      value: formatCountdown(longest.seconds),
      sub: `${whose(longest.mine)}, ${day(longest.at)}`,
    })
  const longestRound = stats.round.longest
  if (longestRound && longestRound.seconds > 0)
    out.push({
      key: 'longestRound',
      label: t('report.voice.longestRound'),
      value: formatCountdown(longestRound.seconds),
      sub: `${whose(longestRound.mine)}, ${day(longestRound.at)}`,
    })
  return out
})
</script>

<template>
  <ReportSection
    v-if="count >= MIN && seconds > 0"
    :icon="AudioLines"
    :title="t('report.voice.title')"
    :figure="formatDuration(seconds)"
    :answer="answer"
  >
    <ReportTiles :tiles="tiles" />
  </ReportSection>
</template>
