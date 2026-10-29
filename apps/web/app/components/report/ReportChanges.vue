<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/** «Что изменилось»: the headline numbers against the previous analysis of this chat. */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatDay, formatDuration, formatPercent } = useI18n()

/** Share changes below this many points are noise. */
const MIN_SHARE_POINTS = 3
/** Reply times must change at least this much to be worth a line. */
const MIN_SPEED_RATIO = 1.25

const changes = computed(() => {
  const before = props.data.previous
  if (!before) return null
  const now = props.data.report
  const lines: string[] = []

  const added = Math.max(0, now.totals.messages - before.messages)
  lines.push(added ? tc('report.changes.newMessages', added) : t('report.changes.noNewMessages'))

  const shareBefore = before.messages ? (before.sent / before.messages) * 100 : null
  const shareNow = now.totals.messages ? (now.totals.sent / now.totals.messages) * 100 : null
  if (shareBefore !== null && shareNow !== null && Math.abs(shareNow - shareBefore) >= MIN_SHARE_POINTS) {
    lines.push(t('report.changes.share', { before: formatPercent(shareBefore), now: formatPercent(shareNow) }))
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
