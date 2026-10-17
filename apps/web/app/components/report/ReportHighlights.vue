<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Главное»: a handful of dated facts that read as a story of the chat.
 * Every card is optional and appears only when the data supports it.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatDay, formatDuration } = useI18n()

interface Highlight {
  key: string
  label: string
  value: string
  sub: string | null
}

const DAY_SECONDS = 86_400
const LONG_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }

const report = computed(() => props.data.report)

/** «3 года 4 месяца», «5 месяцев», «12 дней» between two dates. */
function span(fromIso: string, toIso: string) {
  const from = new Date(fromIso)
  const to = new Date(toIso)
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  if (to.getDate() < from.getDate()) months -= 1
  if (months <= 0) return tc('report.highlights.days', Math.max(1, Math.round((+to - +from) / DAY_SECONDS / 1000)))
  const years = Math.floor(months / 12)
  const rest = months % 12
  return [years ? tc('report.highlights.years', years) : '', rest ? tc('report.highlights.months', rest) : '']
    .filter(Boolean)
    .join(' ')
}

const sinceCard = (): Highlight | null => {
  const { firstMessageAt, lastMessageAt } = report.value.period
  if (!firstMessageAt || !lastMessageAt) return null
  return {
    key: 'since',
    label: t('report.highlights.since'),
    value: formatDay(firstMessageAt.slice(0, 10), LONG_DATE),
    sub: t('report.highlights.sinceSub', { span: span(firstMessageAt, lastMessageAt) }),
  }
}

const busiestDayCard = (): Highlight | null => {
  const day = report.value.facts.mostActiveDate
  if (!day || day.total < 2) return null
  return {
    key: 'busiest',
    label: t('report.highlights.busiestDay'),
    value: formatDay(day.date, LONG_DATE),
    sub: tc('common.messagesCount', day.total),
  }
}

const longestTalkCard = (): Highlight | null => {
  const longest = [...report.value.sessions.highlights].sort((a, b) => b.durationSec - a.durationSec)[0]
  if (!longest || longest.durationSec < 60) return null
  return {
    key: 'talk',
    label: t('report.highlights.longestTalk'),
    value: formatDuration(longest.durationSec),
    sub: `${formatDay(longest.startedAt.slice(0, 10), LONG_DATE)} · ${tc('common.messagesCount', longest.totalMessages)}`,
  }
}

const streakCard = (): Highlight | null => {
  const streak = report.value.facts.maxStreak
  if (streak.days < 3 || !streak.startDate || !streak.endDate) return null
  return {
    key: 'streak',
    label: t('report.highlights.streak'),
    value: tc('report.highlights.days', streak.days),
    sub: `${formatDay(streak.startDate, { day: 'numeric', month: 'long' })} – ${formatDay(streak.endDate, LONG_DATE)}`,
  }
}

const silenceCard = (): Highlight | null => {
  const gap = report.value.facts.longestGap
  if (!gap || !gap.to || gap.seconds < 2 * DAY_SECONDS) return null
  const date = formatDay(gap.to.slice(0, 10), LONG_DATE)
  const sub =
    gap.brokenByMe === undefined
      ? t('report.highlights.silenceEnded', { date })
      : t(gap.brokenByMe ? 'report.highlights.silenceBrokenByMe' : 'report.highlights.silenceBrokenByThem', { date })
  return {
    key: 'silence',
    label: t('report.highlights.silence'),
    value: tc('report.highlights.days', Math.round(gap.seconds / DAY_SECONDS)),
    sub,
  }
}

const wordsCard = (): Highlight | null => {
  const { mine, theirs } = report.value.vocabulary.topWordsBySender
  const my = mine[0]?.value
  const their = theirs[0]?.value
  if (!my && !their) return null
  return {
    key: 'words',
    label: t('report.highlights.words'),
    value: [my, their]
      .filter(Boolean)
      .map((word) => `«${word}»`)
      .join(' · '),
    sub:
      my && their
        ? t('report.highlights.wordsSub')
        : t(my ? 'report.highlights.wordsMine' : 'report.highlights.wordsTheirs'),
  }
}

const highlights = computed(() =>
  [sinceCard(), busiestDayCard(), longestTalkCard(), streakCard(), silenceCard(), wordsCard()].filter(
    (card): card is Highlight => card !== null,
  ),
)
</script>

<template>
  <section v-if="highlights.length" class="highlights" :aria-label="t('report.highlights.title')">
    <h2 class="t-label">{{ t('report.highlights.title') }}</h2>
    <ul class="highlights__list">
      <li v-for="card in highlights" :key="card.key" class="highlight" :data-highlight="card.key">
        <span class="highlight__label">{{ card.label }}</span>
        <strong class="highlight__value">{{ card.value }}</strong>
        <span v-if="card.sub" class="highlight__sub">{{ card.sub }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.highlights {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.highlights__list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  list-style: none;
}

.highlight {
  display: grid;
  align-content: start;
  gap: var(--space-1);
  min-width: 0;
  padding: var(--space-5);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.highlight__label {
  color: var(--text-muted);
  font: var(--text-small);
}

.highlight__value {
  overflow-wrap: anywhere;
  color: var(--text);
  font: var(--text-title);
}

.highlight__sub {
  color: var(--text-muted);
  font: var(--text-small);
}

@media (max-width: 900px) {
  .highlights__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Phones: a swipeable strip instead of a tall stack. */
@media (max-width: 640px) {
  .highlights__list {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    margin-inline: calc(var(--space-4) * -1);
    padding-inline: var(--space-4);
    scrollbar-width: none;
  }

  .highlights__list::-webkit-scrollbar {
    display: none;
  }

  .highlight {
    flex: 0 0 78%;
    scroll-snap-align: start;
  }
}
</style>
