<script setup lang="ts">
import type { ReportDto, SideCountDto } from '@tg-analyzer/shared'
import { Info } from '../../../lib/icons'
import type { Comparison } from '../ReportCompare.vue'
import type { Fact } from '../ReportFacts.vue'

const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatDecimal, formatDuration, formatNumber, formatPercent } = useI18n()

const minutes = (seconds: number) => (seconds ? formatDuration(seconds) : formatNumber(0))

/** Differences smaller than this ratio read as «about the same». */
const EVEN_RATIO = 1.25
/** Below this many mornings, evenings or questions a split is noise. */
const MIN_SAMPLES = 5

const report = computed(() => props.data.report)
const name = computed(() => props.data.summary.title)
const outdated = computed(() => !report.value.voice || !report.value.rituals)

/** «You: 2.3× more» / «Mila: 2.3× more» / «About equal». */
function moreVerdict(side: SideCountDto) {
  if (!side.theirs) return t('report.talk.onlyMine')
  if (!side.mine) return t('report.talk.onlyTheirs', { name: name.value })
  const ratio = Math.max(side.mine, side.theirs) / Math.min(side.mine, side.theirs)
  if (ratio < EVEN_RATIO) return t('report.talk.even')
  return t(side.mine > side.theirs ? 'report.talk.moreMine' : 'report.talk.moreTheirs', {
    ratio: formatDecimal(ratio),
    name: name.value,
  })
}

type Format = 'count' | 'minutes'

function row(key: string, label: string, side: SideCountDto, format: Format = 'count'): Comparison | null {
  const total = side.mine + side.theirs
  if (!total) return null
  return {
    key,
    label,
    mine: format === 'minutes' ? minutes(side.mine) : formatNumber(side.mine),
    theirs: format === 'minutes' ? minutes(side.theirs) : formatNumber(side.theirs),
    minePct: Math.round((side.mine / total) * 100),
    verdict: moreVerdict(side),
  }
}

/** Who usually does something: «Mostly you, 72%» / «Taking turns». */
function shareRow(key: string, label: string, side: SideCountDto, unit: string): Comparison | null {
  const total = side.mine + side.theirs
  if (total < MIN_SAMPLES) return null
  const mine = Math.round((side.mine / total) * 100)
  let verdict = t('report.talk.turns')
  if (mine >= 60) verdict = t('report.talk.shareYou', { share: formatPercent(mine) })
  else if (mine <= 40) verdict = t('report.talk.shareThem', { share: formatPercent(100 - mine), name: name.value })
  return {
    key,
    label,
    mine: tc(unit, side.mine),
    theirs: tc(unit, side.theirs),
    minePct: mine,
    verdict,
  }
}

const notNull = <T,>(value: T | null): value is T => value !== null

// Voice messages and video notes.
const voice = computed(() => report.value.voice)
const voiceRows = computed(() => {
  const stats = voice.value
  if (!stats) return []
  return [
    row('voice', t('report.talk.voice'), stats.voice.seconds, 'minutes'),
    row('round', t('report.talk.round'), stats.round.seconds, 'minutes'),
  ].filter(notNull)
})
// Voice messages without a length in the export still count: the total stays visible.
const voiceFacts = computed<Fact[]>(() => {
  const stats = voice.value
  if (!stats) return []
  const counts = [
    stats.voice.count.mine + stats.voice.count.theirs
      ? tc('report.talk.voiceCount', stats.voice.count.mine + stats.voice.count.theirs)
      : null,
    stats.round.count.mine + stats.round.count.theirs
      ? tc('report.talk.roundCount', stats.round.count.mine + stats.round.count.theirs)
      : null,
  ].filter(notNull)
  return counts.length ? [{ key: 'count', label: t('report.talk.inTotal'), value: counts.join(', ') }] : []
})

// Reactions: custom emoji have no picture here, so only regular ones are shown.
const reactions = computed(() => report.value.reactions)
const plainEmoji = (items: { value: string; count: number }[]) =>
  items.filter((item) => item.value !== 'custom' && item.value !== 'paid').slice(0, 6)
const reactionRows = computed(() => {
  const stats = reactions.value
  if (!stats) return []
  return [row('given', t('report.talk.reactionsGiven'), stats.given)].filter(notNull)
})

// Stickers.
const stickers = computed(() => report.value.stickers)
const stickerRows = computed(() => {
  const stats = stickers.value
  if (!stats) return []
  return [row('stickers', t('report.talk.stickersWho'), stats.count)].filter(notNull)
})
const stickerVariety = computed(() => {
  const stats = stickers.value
  if (!stats?.distinct) return null
  const kinds = tc('report.talk.stickerKinds', stats.distinct)
  return stats.packs ? `${kinds} ${tc('report.talk.packs', stats.packs)}` : kinds
})

// Mornings and evenings.
const rituals = computed(() => report.value.rituals)
const ritualRows = computed(() => {
  const stats = rituals.value
  if (!stats) return []
  return [
    shareRow('morning', t('report.talk.morningFirst'), stats.morningFirst, 'report.talk.mornings'),
    shareRow('night', t('report.talk.nightLast'), stats.nightLast, 'report.talk.evenings'),
  ].filter(notNull)
})

// Questions.
const habits = computed(() => report.value.habits)
const questionRows = computed(() => {
  const turns = habits.value?.questionTurns
  if (!turns || turns.mine + turns.theirs < MIN_SAMPLES) return []
  const asks = row('asks', t('report.talk.asksMore'), turns)
  return asks ? [asks] : []
})

/** Sections with nothing to show collapse into one quiet line at the end of the part. */
const absent = computed(() =>
  [
    !voiceRows.value.length && !voiceFacts.value.length && t('report.talk.missingVoice'),
    !(reactions.value && reactionRows.value.length) && t('report.talk.missingReactions'),
    !stickers.value?.top.length && t('report.talk.missingStickers'),
  ].filter((item): item is string => Boolean(item)),
)
const tooFew = computed(() =>
  [
    !ritualRows.value.length && t('report.talk.missingRituals'),
    !questionRows.value.length && t('report.talk.missingQuestions'),
  ].filter((item): item is string => Boolean(item)),
)
</script>

<template>
  <p v-if="outdated" class="note" role="status">
    <Info aria-hidden="true" />
    {{ t('report.talk.outdated') }}
  </p>

  <template v-else>
    <ReportSection
      v-if="voiceRows.length || voiceFacts.length"
      :title="t('report.talk.voiceTitle')"
      :text="t('report.talk.voiceText')"
    >
      <ReportCompare v-if="voiceRows.length" :their-name="name" :rows="voiceRows" />
      <ReportFacts v-if="voiceFacts.length" :facts="voiceFacts" />
    </ReportSection>

    <ReportSection
      v-if="reactions && reactionRows.length"
      tone="lime"
      :title="t('report.talk.reactionsTitle')"
      :text="t('report.talk.reactionsText')"
    >
      <ReportCompare :their-name="name" :rows="reactionRows" />
      <div class="emoji-pair">
        <div>
          <span class="t-label">{{ t('report.talk.reactionsMine') }}</span>
          <EmojiGrid :items="plainEmoji(reactions.topBySender.mine)" />
        </div>
        <div>
          <span class="t-label">{{ t('report.talk.reactionsTheirs', { name }) }}</span>
          <EmojiGrid :items="plainEmoji(reactions.topBySender.theirs)" />
        </div>
      </div>
    </ReportSection>

    <ReportSection
      v-if="ritualRows.length"
      tone="grey"
      :title="t('report.talk.ritualsTitle')"
      :text="t('report.talk.ritualsText')"
    >
      <ReportCompare :their-name="name" :rows="ritualRows" />
    </ReportSection>

    <ReportSection
      v-if="questionRows.length"
      :title="t('report.talk.questionsTitle')"
      :text="t('report.talk.questionsText')"
    >
      <ReportCompare :their-name="name" :rows="questionRows" />
    </ReportSection>

    <ReportEquivalents :data="data" />

    <ReportShared :data="data" />

    <ReportSection
      v-if="stickers?.top.length"
      wide
      :title="t('report.talk.stickersTitle')"
      :text="stickerVariety ?? undefined"
    >
      <ReportCompare :their-name="name" :rows="stickerRows" />
      <StickerGrid :stickers="stickers.top" />
    </ReportSection>

    <p v-if="absent.length || tooFew.length" class="note">
      <Info aria-hidden="true" />
      <span>
        <template v-if="absent.length">{{ t('report.talk.missing', { items: absent.join(', ') }) }}</template>
        <template v-if="tooFew.length"> {{ t('report.talk.tooFew', { items: tooFew.join(', ') }) }}</template>
      </span>
    </p>
  </template>
</template>

<style scoped>
.emoji-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.emoji-pair > div {
  display: grid;
  align-content: start;
  gap: var(--space-2);
}

@media (max-width: 640px) {
  .emoji-pair {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
