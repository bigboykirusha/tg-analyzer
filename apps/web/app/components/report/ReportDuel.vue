<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Versus, VersusPair } from '../../composables/useVersus'
import { MoonStar, Sunrise } from '../../lib/icons'

/**
 * «Вы двое»: every two-sided habit as a card with its own picture: two clocks for reply
 * time, chat bubbles for message length, a grid of squares for questions, a voice wave,
 * the sun and the moon for mornings and evenings. The numbers all come from `useVersus`.
 */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()
const cards = useVersus(() => props.data)
const name = computed(() => props.data.summary.title)

const responses = computed(() => props.data.report.responses)
const hasHistogram = computed(
  () => Boolean(responses.value.histogram) && responses.value.mineSamples + responses.value.theirsSamples > 0,
)

/** Who leads a card: decides which number is bright and which is quiet. */
function leader(item: Versus | null | undefined): 'mine' | 'theirs' | null {
  if (!item || item.figure === t('report.duel.evenFigure')) return null
  return item.figure === t('report.you') ? 'mine' : 'theirs'
}
const first = (item: Versus | null | undefined) => item?.pairs[0] ?? null
const share = (pair: VersusPair | null) => {
  if (!pair) return 50
  const total = pair.mine.value + pair.theirs.value
  return total ? Math.round((pair.mine.value / total) * 100) : 50
}
const relative = (value: number, pair: VersusPair) => {
  const max = Math.max(pair.mine.value, pair.theirs.value)
  return max ? value / max : 0
}

// Questions: 40 squares split by share, yours first.
const QUESTION_CELLS = 40
const questionCells = computed(() => {
  const mine = Math.round((share(first(cards.value.questions)) / 100) * QUESTION_CELLS)
  return Array.from({ length: QUESTION_CELLS }, (_, index) => (index < mine ? 'mine' : 'theirs'))
})

// Voice: a wave per side, as long as that side talked. Heights repeat, so it reads as sound.
const WAVE_BARS = 56
const waveHeights = Array.from(
  { length: WAVE_BARS },
  (_, index) => 25 + Math.round(75 * Math.abs(Math.sin(index * 1.7) * Math.cos(index * 0.45))),
)
const voicePair = computed(() => cards.value.voice?.pairs.find((pair) => pair.key === 'voice') ?? null)
const roundPair = computed(() => cards.value.voice?.pairs.find((pair) => pair.key === 'round') ?? null)
const wave = (value: number) => {
  const pair = voicePair.value
  if (!pair) return []
  return waveHeights.slice(0, Math.max(3, Math.round(relative(value, pair) * WAVE_BARS)))
}
/** Video notes are circles whose area follows the minutes. */
const circle = (value: number) => {
  const pair = roundPair.value
  return pair ? `${Math.max(12, Math.sqrt(relative(value, pair)) * 72)}px` : '0px'
}

// Reactions: the count leader and each side's favourite emoji.
const reactionEmoji = computed(() => {
  const stats = props.data.report.reactions
  if (!stats) return null
  const plain = (items: { value: string; count: number }[]) =>
    items.filter((item) => item.value !== 'custom' && item.value !== 'paid').slice(0, 5)
  return { mine: plain(stats.topBySender.mine), theirs: plain(stats.topBySender.theirs) }
})

const rituals = computed(() =>
  [
    { key: 'morning', icon: Sunrise, item: cards.value.morning },
    { key: 'night', icon: MoonStar, item: cards.value.night },
  ].filter((ritual) => ritual.item),
)
</script>

<template>
  <div class="report-grid report-grid--even">
    <!-- Reply time: two clocks and how the replies spread. -->
    <ReportSection v-if="cards.speed" wide :title="cards.speed.title" :text="t('report.speed.text')">
      <div class="speed">
        <div class="clocks">
          <div
            v-for="side in ['mine', 'theirs'] as const"
            :key="side"
            class="clock"
            :class="{ 'is-lead': leader(cards.speed) === side }"
          >
            <span class="clock__who">{{ side === 'mine' ? t('report.you') : name }}</span>
            <span class="clock__time t-num">{{ first(cards.speed)![side].text }}</span>
          </div>
          <p v-if="cards.speed.note" class="clocks__note">{{ cards.speed.figure }} — {{ cards.speed.note }}</p>
        </div>
        <ReplySpeedChart v-if="hasHistogram" :histogram="responses.histogram!" :received-label="name" />
      </div>
    </ReportSection>

    <!-- Who starts: one split, as large as the hero's. -->
    <ReportSection v-if="cards.starts" :title="cards.starts.title">
      <div class="split">
        <p class="split__figure t-num">
          <span :class="{ 'is-quiet': leader(cards.starts) === 'theirs' }">{{ first(cards.starts)!.mine.text }}</span>
          <small>/</small>
          <span :class="{ 'is-quiet': leader(cards.starts) === 'mine' }">{{ first(cards.starts)!.theirs.text }}</span>
        </p>
        <div class="split__bar" aria-hidden="true">
          <b :style="{ width: `${share(first(cards.starts))}%` }" />
          <i />
        </div>
        <p class="split__legend">
          <span>{{ t('report.you') }}</span>
          <span>{{ name }}</span>
        </p>
      </div>
    </ReportSection>

    <!-- Message length: two chat bubbles, as wide as the messages are long. -->
    <ReportSection v-if="cards.length" :title="cards.length.title" :text="cards.length.note || undefined">
      <div class="bubbles">
        <div
          class="bubble bubble--theirs"
          :style="{ width: `${40 + relative(first(cards.length)!.theirs.value, first(cards.length)!) * 60}%` }"
        >
          <span class="bubble__who">{{ name }}</span>
          <span class="bubble__text t-num">{{ first(cards.length)!.theirs.text }}</span>
        </div>
        <div
          class="bubble bubble--mine"
          :style="{ width: `${40 + relative(first(cards.length)!.mine.value, first(cards.length)!) * 60}%` }"
        >
          <span class="bubble__who">{{ t('report.you') }}</span>
          <span class="bubble__text t-num">{{ first(cards.length)!.mine.text }}</span>
        </div>
      </div>
    </ReportSection>

    <!-- Questions: forty squares shared out. -->
    <ReportSection v-if="cards.questions" :title="cards.questions.title">
      <div class="units">
        <p class="lead">
          <b>{{ cards.questions.figure }}</b>
          <span v-if="cards.questions.note">{{ cards.questions.note }}</span>
        </p>
        <div class="units__grid" aria-hidden="true">
          <i v-for="(cell, index) in questionCells" :key="index" :class="`units__cell--${cell}`" />
        </div>
        <p class="units__legend t-num">
          <span><i class="units__cell--mine" />{{ t('report.you') }} · {{ first(cards.questions)!.mine.text }}</span>
          <span><i class="units__cell--theirs" />{{ name }} · {{ first(cards.questions)!.theirs.text }}</span>
        </p>
      </div>
    </ReportSection>

    <!-- Reactions: who reacts more, and with what. -->
    <ReportSection v-if="cards.reactions" tone="lime" :title="cards.reactions.title">
      <p class="lead">
        <b>{{ cards.reactions.figure }}</b>
        <span v-if="cards.reactions.note">{{ cards.reactions.note }}</span>
      </p>
      <div v-if="reactionEmoji" class="reactions">
        <div v-for="side in ['mine', 'theirs'] as const" :key="side" class="reactions__side">
          <span class="reactions__who t-num">
            {{ side === 'mine' ? t('report.you') : name }} · {{ first(cards.reactions)![side].text }}
          </span>
          <EmojiGrid :items="reactionEmoji[side]" />
        </div>
      </div>
    </ReportSection>

    <!-- Voice: a sound wave per side, and video notes as circles. -->
    <ReportSection v-if="cards.voice" wide tone="ink" :title="cards.voice.title">
      <p class="lead">
        <b>{{ cards.voice.figure }}</b>
        <span v-if="cards.voice.note">{{ cards.voice.note }}</span>
      </p>
      <div class="voice">
        <div v-if="voicePair" class="voice__waves">
          <span class="voice__label">{{ t('report.duel.voiceLabel') }}</span>
          <div v-for="side in ['mine', 'theirs'] as const" :key="side" class="wave" :class="`wave--${side}`">
            <span class="wave__who">{{ side === 'mine' ? t('report.you') : name }}</span>
            <span class="wave__bars" aria-hidden="true">
              <i
                v-for="(height, index) in wave(voicePair[side].value)"
                :key="index"
                :style="{ height: `${height}%` }"
              />
            </span>
            <span class="wave__time t-num">{{ voicePair[side].text }}</span>
          </div>
        </div>
        <div v-if="roundPair" class="voice__circles">
          <span class="voice__label">{{ t('report.duel.roundLabel') }}</span>
          <div class="circles">
            <div v-for="side in ['mine', 'theirs'] as const" :key="side" class="circles__item">
              <span
                class="circles__dot"
                :class="`circles__dot--${side}`"
                :style="{ width: circle(roundPair[side].value), height: circle(roundPair[side].value) }"
              />
              <span class="circles__who">{{ side === 'mine' ? t('report.you') : name }}</span>
              <span class="circles__time t-num">{{ roundPair[side].text }}</span>
            </div>
          </div>
        </div>
      </div>
    </ReportSection>

    <!-- Mornings and evenings: the sun and the moon, each with its own winner. -->
    <ReportSection v-if="rituals.length" wide :title="t('report.duel.ritualsTitle')">
      <div class="rituals">
        <div v-for="ritual in rituals" :key="ritual.key" class="ritual">
          <component :is="ritual.icon" class="ritual__icon" aria-hidden="true" />
          <span class="ritual__question">{{ ritual.item!.title }}</span>
          <b class="ritual__name">{{ ritual.item!.figure }}</b>
          <span class="ritual__detail t-num">
            {{ t('report.you') }} · {{ first(ritual.item)!.mine.text }} &nbsp; {{ name }} ·
            {{ first(ritual.item)!.theirs.text }}
          </span>
        </div>
      </div>
    </ReportSection>
  </div>
</template>

<style scoped>
/* A big word and a quiet line under it: the answer of a card. */
.lead {
  display: grid;
  gap: var(--space-1);
}

.lead b {
  overflow: hidden;
  font: var(--text-figure);
  letter-spacing: -0.04em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lead span {
  color: var(--text-muted);
  font: var(--text-ui);
}

.is-quiet {
  color: var(--text-subtle);
}

/* Reply time */
.speed {
  display: grid;
  gap: var(--space-6);
}

.clocks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: center;
  gap: var(--space-4);
}

.clock {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-2);
  color: var(--text-muted);
}

.clock.is-lead {
  background: var(--lime);
  color: var(--on-lime);
}

.clock__who {
  overflow: hidden;
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clock__time {
  font: var(--text-figure);
  letter-spacing: -0.04em;
}

.clocks__note {
  grid-column: 1 / -1;
  color: var(--text-muted);
  font: var(--text-ui);
}

@media (min-width: 901px) {
  .speed {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    align-items: center;
  }
}

/* Who starts */
.split {
  display: grid;
  gap: var(--space-3);
  margin-top: auto;
}

.split__figure {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font: var(--text-figure-lg);
  letter-spacing: -0.05em;
}

.split__figure small {
  color: var(--text-subtle);
  font-size: 0.5em;
}

.split__bar {
  display: flex;
  gap: 2px;
  height: 12px;
  overflow: hidden;
  border-radius: var(--radius-full);
}

.split__bar b {
  background: var(--you);
}

.split__bar i {
  flex: 1;
  background: var(--them);
}

.split__legend {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-muted);
  font: var(--text-small);
}

/* Message length */
.bubbles {
  display: grid;
  gap: var(--space-3);
  margin-top: auto;
}

.bubble {
  display: grid;
  gap: 2px;
  min-width: 0;
  max-width: 100%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
}

.bubble--theirs {
  justify-self: start;
  border-bottom-left-radius: var(--radius-xs);
  background: var(--them);
  color: var(--on-lime);
}

.bubble--mine {
  justify-self: end;
  border-bottom-right-radius: var(--radius-xs);
  background: var(--you);
  color: var(--surface);
}

.bubble__who {
  overflow: hidden;
  font: var(--text-caption);
  opacity: 0.7;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bubble__text {
  font: var(--text-h3);
}

/* Questions */
.units {
  display: grid;
  gap: var(--space-4);
}

.units__grid {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 4px;
}

.units__grid i,
.units__legend i {
  display: block;
  aspect-ratio: 1;
  border-radius: var(--radius-xs);
}

.units__cell--mine {
  background: var(--you);
}

.units__cell--theirs {
  background: var(--them);
}

.units__legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
  color: var(--text-muted);
  font: var(--text-small);
}

.units__legend span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.units__legend i {
  width: 10px;
}

/* Reactions */
.reactions {
  display: grid;
  gap: var(--space-4);
}

.reactions__side {
  display: grid;
  gap: var(--space-2);
}

.reactions__who {
  color: var(--text-muted);
  font: var(--text-label);
}

/* Voice */
.voice {
  display: grid;
  gap: var(--space-6);
}

.voice__label {
  color: var(--text-muted);
  font: var(--text-caption);
}

.voice__waves {
  display: grid;
  gap: var(--space-3);
}

.wave {
  display: grid;
  grid-template-columns: minmax(0, 6rem) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
}

.wave__who {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wave__bars {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 40px;
  min-width: 0;
}

.wave__bars i {
  flex: 0 1 4px;
  min-width: 2px;
  border-radius: var(--radius-full);
}

.wave--mine .wave__bars i {
  background: var(--you);
}

.wave--theirs .wave__bars i {
  background: var(--them);
}

.wave__time {
  font: var(--text-title);
}

.voice__circles {
  display: grid;
  gap: var(--space-3);
}

.circles {
  display: flex;
  align-items: flex-end;
  gap: var(--space-8);
}

.circles__item {
  display: grid;
  justify-items: start;
  gap: var(--space-1);
}

.circles__dot {
  border-radius: 50%;
}

.circles__dot--mine {
  background: var(--you);
}

.circles__dot--theirs {
  background: var(--them);
}

.circles__who {
  color: var(--text-muted);
  font: var(--text-small);
}

.circles__time {
  font: var(--text-title);
}

@media (min-width: 901px) {
  .voice {
    grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
    align-items: end;
  }
}

/* Mornings and evenings */
.rituals {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--card-gap);
}

.ritual {
  display: grid;
  align-content: start;
  gap: var(--space-1);
  padding: var(--space-5);
  border-radius: var(--radius-md);
  background: var(--surface-2);
}

.ritual__icon {
  --icon-size: var(--icon-lg);
  margin-bottom: var(--space-3);
}

.ritual__question {
  color: var(--text-muted);
  font: var(--text-small);
}

.ritual__name {
  overflow: hidden;
  font: var(--text-figure-sm);
  letter-spacing: -0.03em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ritual__detail {
  color: var(--text-muted);
  font: var(--text-small);
}

@media (max-width: 640px) {
  .rituals {
    grid-template-columns: minmax(0, 1fr);
  }

  .split__figure {
    font: var(--text-figure);
  }

  .clock__time {
    font: var(--text-figure-sm);
  }
}
</style>
