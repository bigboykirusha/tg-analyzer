<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/** The notable days of the chat on one line, oldest first: across on a wide screen, down on a phone. */
const props = defineProps<{ data: ReportDto }>()
const { t, formatDay, formatDuration, formatNumber } = useI18n()

interface Entry {
  key: string
  at: string
  title: string
  sub?: string
}

const events = computed<Entry[]>(() => {
  const { report, summary } = props.data
  const out: Entry[] = []
  if (report.period.firstMessageAt)
    out.push({ key: 'first', at: report.period.firstMessageAt.slice(0, 10), title: t('report.mix.chronFirst') })
  const busiest = report.facts.mostActiveDate
  if (busiest)
    out.push({
      key: 'busiest',
      at: busiest.date,
      title: t('report.mix.chronBusiest', { count: formatNumber(busiest.total) }),
    })
  const voice = report.voice?.voice.longest
  if (voice)
    out.push({
      key: 'voice',
      at: voice.at.slice(0, 10),
      title: t('report.mix.chronVoice', { time: formatDuration(voice.seconds) }),
      sub: voice.mine ? t('report.you') : summary.title,
    })
  const session = report.sessions.highlights[0]
  if (session)
    out.push({
      key: 'session',
      at: session.startedAt.slice(0, 10),
      title: t('report.mix.chronSession', { time: formatDuration(session.durationSec) }),
    })
  const streak = report.facts.maxStreak
  if (streak.days > 1 && streak.endDate)
    out.push({
      key: 'streak',
      at: streak.endDate,
      title: t('report.mix.chronStreak', { count: formatNumber(streak.days) }),
    })
  return out.sort((a, b) => a.at.localeCompare(b.at))
})
const when = (day: string) => formatDay(day, { day: 'numeric', month: 'short', year: 'numeric' })
</script>

<template>
  <ReportSection v-if="events.length > 2" wide tone="ink" :title="t('report.mix.chronTitle')">
    <ol class="chron" :style="{ '--steps': events.length }">
      <li v-for="event in events" :key="event.key" class="chron__item">
        <i class="chron__dot" aria-hidden="true" />
        <time class="chron__when" :datetime="event.at">{{ when(event.at) }}</time>
        <b class="chron__title">{{ event.title }}</b>
        <span v-if="event.sub" class="chron__sub">{{ event.sub }}</span>
      </li>
    </ol>
  </ReportSection>
</template>

<style scoped>
.chron {
  display: grid;
  grid-template-columns: repeat(var(--steps), minmax(0, 1fr));
  list-style: none;
}

/* The line runs along the top of the row; every dot sits on it. */
.chron__item {
  position: relative;
  display: grid;
  align-content: start;
  gap: var(--space-1);
  padding: var(--space-4) var(--space-4) 0 0;
  border-top: 2px solid var(--border);
}

.chron__dot {
  position: absolute;
  top: calc(var(--space-2) * -1 - 1px);
  left: 0;
  width: var(--space-3);
  height: var(--space-3);
  border-radius: var(--radius-full);
  background: var(--text);
}

.chron__when,
.chron__sub {
  color: var(--text-muted);
  font: var(--text-small);
}

.chron__title {
  font: var(--text-ui);
  font-weight: 600;
  text-wrap: balance;
}

@media (max-width: 900px) {
  .chron {
    grid-template-columns: minmax(0, 1fr);
  }

  .chron__item {
    padding: 0 0 var(--space-4) var(--space-6);
    border-top: 0;
    border-left: 2px solid var(--border);
  }

  .chron__item:last-child {
    padding-bottom: 0;
  }

  .chron__dot {
    top: var(--space-1);
    left: calc(var(--space-3) / -2 + 1px);
  }
}
</style>
