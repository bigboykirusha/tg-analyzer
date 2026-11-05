<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Чем выделяется этот чат»: up to three of the most unusual facts of this chat, picked by how
 * far each is from ordinary. Each card opens the part where the fact lives; nothing «примерно
 * поровну» ever gets here. The first card is ink, the others white.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatDuration, formatDay, formatPercent } = useI18n()
const versus = useVersus(() => props.data)

interface Highlight {
  key: string
  question: string
  answer: string
  note: string
  part: 'together' | 'time' | 'words'
  /** How unusual: a lead of 3× scores 3, a 90-day streak 3. */
  score: number
}

const MAX = 3

const highlights = computed<Highlight[]>(() => {
  const report = props.data.report
  const name = props.data.summary.title
  const out: Highlight[] = []

  // Who does more, only clear leads.
  for (const item of Object.values(versus.value)) {
    if (!item?.lead || item.ratio < 1.5) continue
    const pair = item.pairs[0]
    out.push({
      key: `versus-${item.key}`,
      question: item.title,
      answer: `${item.figure} — ${item.note}`,
      note: pair ? `${t('report.you')} · ${pair.mine.text} · ${name} · ${pair.theirs.text}` : '',
      part: 'together',
      score: Number.isFinite(item.ratio) ? item.ratio : 4,
    })
  }

  const streak = report.facts.maxStreak.days
  if (streak >= 14)
    out.push({
      key: 'streak',
      question: t('report.highlights.streak'),
      answer: tc('report.fmt.streakDays', streak),
      note: t('report.fmt.streakNote'),
      part: 'time',
      score: streak / 30,
    })

  const session = report.sessions.highlights[0]
  if (session && session.durationSec >= 4 * 3600)
    out.push({
      key: 'session',
      question: t('report.highlights.session'),
      answer: formatDuration(session.durationSec),
      note: formatDay(session.startedAt.slice(0, 10), { day: 'numeric', month: 'long' }),
      part: 'time',
      score: session.durationSec / (8 * 3600),
    })

  const distribution = props.data.derived.activityDistribution
  const parts = [distribution.night, distribution.morning, distribution.afternoon, distribution.evening].map(
    (item) => item.total,
  )
  const total = parts.reduce((sum, value) => sum + value, 0)
  const night = parts[0] ?? 0
  if (total && night === Math.max(...parts))
    out.push({
      key: 'night',
      question: t('report.fmt.clockTitle'),
      answer: t('report.fmt.role.night'),
      note: t('report.highlights.nightNote', { pct: formatPercent((night / total) * 100) }),
      part: 'time',
      score: (night / total) * 6,
    })

  const word = report.vocabulary.topWords[0]
  if (word && word.count >= 20)
    out.push({
      key: 'word',
      question: t('report.fmt.wordTitle'),
      answer: `«${word.value}»`,
      note: tc('report.fmt.wordCount', word.count),
      part: 'words',
      score: 1.4,
    })

  return out.sort((left, right) => right.score - left.score).slice(0, MAX)
})
</script>

<template>
  <section v-if="highlights.length >= 2" class="highlights" aria-labelledby="highlights-title">
    <h2 id="highlights-title" class="t-h3">{{ t('report.highlights.title') }}</h2>
    <div class="highlights__list">
      <a
        v-for="(item, index) in highlights"
        :key="item.key"
        :href="`#part-${item.part}`"
        class="tile highlight"
        :class="{ 'tile--ink': index === 0 }"
      >
        <span class="highlight__question">{{ item.question }}</span>
        <span class="highlight__answer t-num">{{ item.answer }}</span>
        <span v-if="item.note" class="highlight__note">{{ item.note }}</span>
      </a>
    </div>
  </section>
</template>

<style scoped>
.highlights {
  display: grid;
  gap: var(--space-4);
}

/* Three in a row on wide screens; a plain column on phones and tablets, nothing scrolls sideways. */
.highlights__list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--card-gap);
}

@media (max-width: 900px) {
  .highlights__list {
    grid-template-columns: minmax(0, 1fr);
  }
}

.highlight {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  /* --text is remapped inside an ink tile, so the answer reads on both. */
  color: var(--text);
  text-decoration: none;
  transition: background-color var(--transition-fast);
}

.highlight__question,
.highlight__note {
  color: var(--text-muted);
  font: var(--text-small);
}

.highlight__answer {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
  white-space: normal;
  text-wrap: balance;
}

@media (hover: hover) and (pointer: fine) {
  .highlight:not(.tile--ink):hover {
    background: var(--fill-hover);
  }
}
</style>
