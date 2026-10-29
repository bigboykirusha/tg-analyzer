<script setup lang="ts">
import { compareWithPrevious, type ReportDto } from '@tg-analyzer/shared'

/** «Что изменилось»: the headline numbers against the previous analysis of this chat. */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatDay, formatDuration, formatNumber, formatPercent } = useI18n()

/** Share changes below this many points are noise. */
const MIN_SHARE_POINTS = 5
/** The pace must change at least this much to be worth a line. */
const MIN_PACE_RATIO = 1.25
/** Reply times must change at least this much to be worth a line. */
const MIN_SPEED_RATIO = 1.25

const changes = computed(() => {
  const before = props.data.previous
  if (!before) return null
  const now = props.data.report
  const lines: string[] = []

  const name = props.data.summary.title
  // Measured on the new days alone: a week barely moves the all-time numbers.
  const delta = compareWithPrevious(now, before)
  lines.push(delta.added ? tc('report.changes.newMessages', delta.added) : t('report.changes.noNewMessages'))

  const pace = delta.pace
  if (pace && Math.max(pace.since, pace.before) / Math.max(Math.min(pace.since, pace.before), 0.1) >= MIN_PACE_RATIO) {
    lines.push(
      t(pace.since > pace.before ? 'report.changes.paceUp' : 'report.changes.paceDown', {
        before: formatNumber(Math.round(pace.before)),
        now: formatNumber(Math.round(pace.since)),
      }),
    )
  }

  const share = delta.share
  if (share && Math.abs(share.since - share.before) >= MIN_SHARE_POINTS) {
    lines.push(t('report.changes.share', { before: formatPercent(share.before), now: formatPercent(share.since) }))
  }

  const speed = (key: 'mine' | 'theirs', previous: number | null, current: number | null) => {
    if (previous === null || current === null) return
    const ratio = Math.max(previous, current) / Math.max(Math.min(previous, current), 1)
    if (ratio < MIN_SPEED_RATIO) return
    const faster = current < previous
    lines.push(
      t(`report.changes.${key}${faster ? 'Faster' : 'Slower'}`, {
        before: formatDuration(previous),
        now: formatDuration(current),
        name,
      }),
    )
  }
  speed('theirs', before.medianTheirsSec, now.responses.medianTheirsSec)
  speed('mine', before.medianMineSec, now.responses.medianMineSec)

  const startsBefore = before.iWriteFirstPct
  const startsNow = now.responses.iWriteFirstPct
  if (startsBefore !== null && startsNow !== null && Math.abs(startsNow - startsBefore) >= 10) {
    lines.push(
      t(startsNow > startsBefore ? 'report.changes.startMore' : 'report.changes.startLess', {
        before: formatPercent(startsBefore),
        now: formatPercent(startsNow),
      }),
    )
  }

  return { since: formatDay(before.analyzedAt.slice(0, 10), { day: 'numeric', month: 'long' }), lines }
})
</script>

<template>
  <section v-if="changes" class="tile changes" :aria-label="t('report.changes.title', { date: changes.since })">
    <h2 class="changes__title">{{ t('report.changes.title', { date: changes.since }) }}</h2>
    <ul class="changes__list">
      <li v-for="line in changes.lines" :key="line">{{ line }}</li>
    </ul>
  </section>
</template>

<style scoped>
.changes {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-5);
}

.changes__title {
  font: var(--text-ui);
  font-weight: 600;
}

.changes__list {
  display: grid;
  gap: var(--space-1);
  padding-left: var(--space-5);
  color: var(--text);
  font: var(--text-small);
}
</style>
