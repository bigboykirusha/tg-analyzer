<script setup lang="ts">
import { isEven, type ReportDto } from '@tg-analyzer/shared'
import { Users } from '../../lib/icons'

/**
 * «Вы и {имя}»: everything the two of you can be compared in, as one sheet — a match's statistics. You on the
 * left in ink, the other side on the right in their colour; each row the two values, what they are of, and two
 * bars from the middle out. A scoreboard first (how many rows each side leads); only the rows with a leader get
 * bars, grouped by topic; the even ones fold into one line of names. A row with too few events behind it is left out. Reply time and the starter come from `useVersus`, so
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
  /** Whether a bigger value is a merit; «more unanswered questions» or «more double texts» score no point. */
  scored: boolean
}

function row(
  key: string,
  label: string,
  mine: number,
  theirs: number,
  format: typeof formatNumber = formatNumber,
  faster = false,
  scored = true,
): Row | null {
  if (mine + theirs <= 0) return null
  const [a, b] = faster ? [theirs, mine] : [mine, theirs]
  const shareMine = Math.round((100 * a) / Math.max(1, a + b))
  const lead = isEven(a, b) ? null : a > b ? 'mine' : 'theirs'
  return { key, label, mine: format(mine), theirs: format(theirs), shareMine, lead, scored }
}

const counted = (key: string, label: string, count: { mine: number; theirs: number } | undefined, scored = true) =>
  count && count.mine + count.theirs >= MIN
    ? row(key, label, count.mine, count.theirs, formatNumber, false, scored)
    : null

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
        counted('double', t('report.match.doubleTexts'), habits?.doubleTexts, false),
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
        counted('unanswered', t('report.match.unanswered'), habits?.unansweredQuestions, false),
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
/** Only the rows where one side leads get bars; the even ones fold into a single line of names. */
const decisive = computed(() =>
  groups.value
    .map((group) => ({ ...group, rows: group.rows.filter((item) => item.lead) }))
    .filter((group) => group.rows.length),
)
const tally = computed(() => ({
  mine: rows.value.filter((item) => item.scored && item.lead === 'mine').length,
  theirs: rows.value.filter((item) => item.scored && item.lead === 'theirs').length,
  even: rows.value.filter((item) => !item.lead).length,
}))
const evenNames = computed(() =>
  rows.value
    .filter((item) => !item.lead)
    .map((item) => item.label.toLocaleLowerCase())
    .join(', '),
)
/**
 * The sheet's answer, from the scoreboard's own counts: equal leads are «even»; «almost everywhere» only when
 * the other side leads in at most one row and the leader in at least three; otherwise a plain «more often».
 * Rows where more is no merit (unanswered questions, double texts) score nothing and are left out here.
 */
const answer = computed(() => {
  if (rows.value.filter((item) => item.scored).length < 3) return null
  const { mine, theirs } = tally.value
  if (mine === theirs) return t('report.match.answerEven')
  const mineLeads = mine > theirs
  const [lead, other] = mineLeads ? [mine, theirs] : [theirs, mine]
  const most = lead >= 3 && other <= 1
  if (mineLeads) return t(most ? 'report.match.answerMostMine' : 'report.match.answerMine')
  return t(most ? 'report.match.answerMostTheirs' : 'report.match.answerTheirs', { name: name.value })
})
</script>

<template>
  <ReportSection v-if="answer" id="part-match" wide :icon="Users" :title="t('report.match.title')" :answer="answer">
    <div class="sheet">
      <div class="score">
        <p class="score__side">
          <span class="t-figure score__figure">{{ tally.mine }}</span>
          <span class="t-label score__name">{{ t('report.you') }}</span>
        </p>
        <p class="t-label score__even">{{ t('report.match.evenCount', { count: tally.even }) }}</p>
        <p class="score__side score__side--theirs">
          <span class="t-figure score__figure score__figure--theirs">{{ tally.theirs }}</span>
          <span class="t-label score__name score__name--theirs">{{ name }}</span>
        </p>
      </div>
      <section v-for="group in decisive" :key="group.key" class="sheet__group" :aria-label="group.title">
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
      <p v-if="tally.even" class="t-label sheet__even">{{ t('report.match.evenList', { names: evenNames }) }}</p>
    </div>
  </ReportSection>
</template>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* The scoreboard: how many comparisons each side leads, the even ones quietly between. */
.score {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: end;
  gap: var(--space-3);
}

.score__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.score__side--theirs {
  align-items: flex-end;
  text-align: right;
}

.score__figure--theirs,
.score__name--theirs {
  color: var(--them-ink);
}

.score__name {
  color: var(--text-muted);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score__name--theirs {
  color: var(--them-ink);
}

.score__even {
  color: var(--text-muted);
  text-align: center;
  white-space: nowrap;
}

.sheet__even {
  color: var(--text-muted);
  text-wrap: pretty;
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
