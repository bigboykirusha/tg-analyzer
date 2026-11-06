<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Play } from '../../../lib/icons'

/**
 * «Вы наговорили»: every voice message and video note of the chat as one album — a cover with the
 * two of you, the total length, how many recordings, and one picture of the length («9 фильмов»).
 * The player bar is a picture of the length, not a control.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatDuration, formatCountdown } = useI18n()

/** Below half an hour an album is a stretch. */
const MIN_SECONDS = 30 * 60
const FILM_SEC = 90 * 60
const SONG_SEC = 3 * 60

const voice = computed(() => props.data.report.voice)
const seconds = computed(() => {
  const stats = voice.value
  if (!stats) return 0
  return stats.voice.seconds.mine + stats.voice.seconds.theirs + stats.round.seconds.mine + stats.round.seconds.theirs
})
const recordings = computed(() => {
  const stats = voice.value
  if (!stats) return ''
  const notes = stats.voice.count.mine + stats.voice.count.theirs
  const rounds = stats.round.count.mine + stats.round.count.theirs
  const parts = [notes && tc('report.album.voices', notes), rounds && tc('report.album.rounds', rounds)].filter(Boolean)
  return parts.join(` ${t('report.album.and')} `)
})
/** One picture of the length: films when there are at least two, songs otherwise. */
const picture = computed(() => {
  const films = Math.round(seconds.value / FILM_SEC)
  return films >= 2 ? tc('report.album.films', films) : tc('report.album.songs', Math.round(seconds.value / SONG_SEC))
})
</script>

<template>
  <ReportSection v-if="seconds >= MIN_SECONDS" :title="t('report.album.title')">
    <div class="album">
      <div class="album__cover">{{ t('report.album.cover', { name: data.summary.title }) }}</div>
      <div class="album__meta">
        <b class="album__length">{{ formatDuration(seconds) }}</b>
        <span v-if="recordings">{{ recordings }}</span>
        <span>{{ picture }}</span>
      </div>
    </div>
    <div class="player t-num" aria-hidden="true">
      <span class="player__play"><Play /></span>
      <span class="player__track"><i /></span>
      <span>0:00 / {{ formatCountdown(seconds) }}</span>
    </div>
  </ReportSection>
</template>

<style scoped>
.album {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: center;
  gap: var(--space-4);
}

/* The cover is the pair, so ink, never lime (lime is the other side). */
.album__cover {
  display: grid;
  align-content: end;
  aspect-ratio: 1;
  padding: var(--space-4);
  overflow-wrap: anywhere;
  border-radius: var(--radius-md);
  background: var(--tile-ink);
  color: var(--on-tile-ink);
  font: var(--text-title);
  text-wrap: balance;
}

.album__meta {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
  color: var(--text-muted);
  font: var(--text-small);
}

.album__length {
  color: var(--text);
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

.player {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-caption);
}

.player__play {
  display: grid;
  place-items: center;
  width: var(--control-sm);
  height: var(--control-sm);
  border-radius: var(--radius-full);
  background: var(--accent);
  color: var(--on-accent);
}

.player__play svg {
  fill: currentColor;
}

.player__track {
  height: var(--bar-height);
  border-radius: var(--radius-full);
  background: var(--chart-neutral);
}

.player__track i {
  display: block;
  width: 4%;
  height: 100%;
  border-radius: inherit;
  background: var(--text);
}

@media (max-width: 640px) {
  .album {
    grid-template-columns: 88px minmax(0, 1fr);
  }
}
</style>
