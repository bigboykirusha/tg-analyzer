<script setup lang="ts">
import { isEven, type ReportDto } from '@tg-analyzer/shared'
import { Users } from '../../lib/icons'

/**
 * «Вы и {имя}»: everything the two of you can be compared in, as one sheet — a match's statistics. You on the
 * left in ink, the other side on the right in their colour; each row the two values, what they are of, and two
 * bars from the middle out. Rows grouped by topic: the conversation, the answers, the mood, mornings and nights,
 * voice. A row with too few events behind it is left out. Reply time and the starter come from `useVersus`, so
 * they read the same here and in the «Итоги».
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatPercent, formatDuration } = useI18n()
const versus = useVersus(() => props.data)
const name = computed(() => props.data.summary.title)

/** Fewer events than this on both sides together is noise. */
const MIN = 5

interface Row {
  key: string
  label: string
  mine: string
  theirs: string
  /** Each side's share of the bar, 0–100; for reply time the faster side gets the longer bar. */
  shareMine: number
  lead: 'mine' | 'theirs' | null
}

function row(
  key: string,
  label: string,
  mine: number,
  theirs: number,
  format: typeof formatNumber = formatNumber,
  faster = false,
): Row | null {
  if (mine + theirs <= 0) return null
  const [a, b] = faster ? [theirs, mine] : [mine, theirs]
  const shareMine = Math.round((100 * a) / Math.max(1, a + b))
  const lead = isEven(a, b) ? null : a > b ? 'mine' : 'theirs'
  return { key, label, mine: format(mine), theirs: format(theirs), shareMine, lead }
}

const counted = (key: string, label: string, count: { mine: number; theirs: number } | undefined) =>
  count && count.mine + count.theirs >= MIN ? row(key, label, count.mine, count.theirs) : null

const groups = computed(() => {
  const { report } = props.data
  const habits = report.habits
  const rituals = report.rituals
  const voice = report.voice
  const starts = report.responses.iWriteFirstPct
  const speed = versus.value.speed?.pairs[0]
  const lastWord = habits?.lastWordMinePct ?? null
  const out: { key: string; title: string; rows: Row[] }[] = [
    {
      key: 'talk',
      title: t('report.match.group.talk'),
      rows: [
        starts === null
          ? null
          : row('starts', t('report.habits.starts'), starts, 100 - starts, (value) => formatPercent(value)),
        lastWord === null
          ? null
          : row('lastWord', t('report.match.lastWord'), lastWord, 100 - lastWord, (value) => formatPercent(value)),
        counted('double', t('report.match.doubleTexts'), habits?.doubleTexts),
      ].filter((item): item is Row => item !== null),
    },
    {
      key: 'answers',
      title: t('report.match.group.answers'),
      rows: [
        speed
          ? row('speed', t('report.match.speed'), speed.mine.value, speed.theirs.value, formatDuration, true)
          : null,
        counted('questions', t('report.match.questions'), habits?.questionTurns),
        counted('unanswered', t('report.match.unanswered'), habits?.unansweredQuestions),
      ].filter((item): item is Row => item !== null),
    },
    {
      key: 'mood',
      title: t('report.match.group.mood'),
      rows: [
        counted('laughs', t('report.match.laughs'), habits?.laughs),
        counted('reactions', t('report.match.reactions'), report.reactions?.given),
        counted('stickers', t('report.talk.stickersTitle'), report.stickers?.count),
      ].filter((item): item is Row => item !== null),
    },
    {
      key: 'day',
      title: t('report.match.group.day'),
      rows: [
        counted('goodMorning', t('report.match.goodMorning'), rituals?.goodMorning),
        counted('morningFirst', t('report.habits.morning'), rituals?.morningFirst),
        counted('goodNight', t('report.match.goodNight'), rituals?.goodNight),
      ].filter((item): item is Row => item !== null),
    },
    {
      key: 'voice',
      title: t('report.match.group.voice'),
      rows: [
        voice && voice.voice.seconds.mine + voice.voice.seconds.theirs > 0
          ? row(
              'voice',
              t('report.duel.voiceLabel'),
              voice.voice.seconds.mine,
              voice.voice.seconds.theirs,
              formatDuration,
            )
          : null,
        voice &&
        voice.round.count.mine + voice.round.count.theirs >= MIN &&
        voice.round.seconds.mine + voice.round.seconds.theirs > 0
          ? row(
              'round',
              t('report.duel.roundLabel'),
              voice.round.seconds.mine,
              voice.round.seconds.theirs,
              formatDuration,
            )
          : null,
      ].filter((item): item is Row => item !== null),
    },
  ]
  return out.filter((group) => group.rows.length)
})

const rows = computed(() => groups.value.flatMap((group) => group.rows))
/** The sheet's answer: who is ahead more often, or that it is even almost everywhere. */
const answer = computed(() => {
  const all = rows.value
  if (all.length < 3) return null
  const mine = all.filter((item) => item.lead === 'mine').length
  const theirs = all.filter((item) => item.lead === 'theirs').length
  const even = all.length - mine - theirs
  if (even >= mine && even >= theirs) return t('report.match.answerEven')
  return mine > theirs ? t('report.match.answerMine') : t('report.match.answerTheirs', { name: name.value })
})
</script>

<template>
  <ReportSection v-if="answer" id="part-match" wide :icon="Users" :title="t('report.match.title')" :answer="answer">
    <div class="sheet">
      <p class="sheet__sides t-label" aria-hidden="true">
        <span>{{ t('report.you') }}</span>
        <span class="sheet__them">{{ name }}</span>
      </p>
      <section v-for="group in groups" :key="group.key" class="sheet__group" :aria-label="group.title">
        <h4 class="t-label sheet__title">{{ group.title }}</h4>
        <div v-for="item in group.rows" :key="item.key" class="vs">
          <span class="t-body vs__value" :class="{ 'vs__value--behind': item.lead === 'theirs' }">{{ item.mine }}</span>
          <span class="t-label vs__label">{{ item.label }}</span>
          <span class="t-body vs__value vs__value--theirs" :class="{ 'vs__value--behind': item.lead === 'mine' }">
            {{ item.theirs }}
          </span>
          <span class="vs__bars" aria-hidden="true">
            <span class="vs__track vs__track--mine"><i :style="{ width: `${item.shareMine}%` }" /></span>
            <span class="vs__track"><i :style="{ width: `${100 - item.shareMine}%` }" /></span>
          </span>
        </div>
      </section>
    </div>
  </ReportSection>
</template>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.sheet__sides {
  display: flex;
  justify-content: space-between;
}

.sheet__them {
  color: var(--them-ink);
}

.sheet__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sheet__title {
  color: var(--text-muted);
}

/* One comparison: the two values at the edges, what they are of in the middle, two bars growing from the middle. */
.vs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-1) var(--space-3);
}

.vs__label {
  color: var(--text-muted);
  text-align: center;
}

.vs__value--theirs {
  text-align: right;
}

/* The side that is behind steps back: the leader reads first. */
.vs__value--behind {
  color: var(--text-muted);
}

.vs__bars {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-0-5);
}

.vs__track {
  display: flex;
  height: var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--room-tint);
  overflow: hidden;
}

.vs__track--mine {
  justify-content: flex-end;
}

.vs__track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--them);
}

.vs__track--mine i {
  background: var(--text);
}
</style>
