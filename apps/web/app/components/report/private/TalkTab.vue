<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../../lib/icons'

/** What the two of you send besides words. Who does more lives in «Кто есть кто». */
const props = defineProps<{ data: ReportDto }>()
const { t, tc } = useI18n()

const report = computed(() => props.data.report)
const name = computed(() => props.data.summary.title)
const outdated = computed(() => !report.value.voice || !report.value.rituals)

// Reactions: custom emoji have no picture here, so only regular ones are shown.
const reactions = computed(() => report.value.reactions)
const plainEmoji = (items: { value: string; count: number }[]) =>
  items.filter((item) => item.value !== 'custom' && item.value !== 'paid').slice(0, 6)
const reactionPairs = computed(() => {
  const stats = reactions.value
  if (!stats) return null
  const mine = plainEmoji(stats.topBySender.mine)
  const theirs = plainEmoji(stats.topBySender.theirs)
  return mine.length || theirs.length ? { mine, theirs } : null
})

const stickers = computed(() => report.value.stickers)
const versus = useVersus(() => props.data)
const stickerVariety = computed(() => {
  const stats = stickers.value
  if (!stats?.distinct) return null
  const kinds = tc('report.talk.stickerKinds', stats.distinct)
  return stats.packs ? `${kinds} ${tc('report.talk.packs', stats.packs)}` : kinds
})

/** Sections with nothing to show collapse into one quiet line at the end of the part. */
const absent = computed(() =>
  [
    !report.value.voice?.voice.count.mine &&
      !report.value.voice?.voice.count.theirs &&
      !report.value.voice?.round.count.mine &&
      !report.value.voice?.round.count.theirs &&
      t('report.talk.missingVoice'),
    !reactionPairs.value && t('report.talk.missingReactions'),
    !stickers.value?.top.length && t('report.talk.missingStickers'),
  ].filter((item): item is string => Boolean(item)),
)
</script>

<template>
  <p v-if="outdated" class="note" role="status">
    <Info aria-hidden="true" />
    {{ t('report.talk.outdated') }}
  </p>

  <div v-else class="report-grid report-grid--even">
    <ReportSection
      v-if="stickers?.top.length"
      wide
      :title="t('report.talk.stickersTitle')"
      :text="stickerVariety ?? undefined"
    >
      <StickerGrid :stickers="stickers.top" />
      <div v-if="versus.stickers" class="split">
        <i class="split__bar" aria-hidden="true">
          <b :style="{ flexGrow: versus.stickers.pairs[0]!.mine.value }" />
          <b :style="{ flexGrow: versus.stickers.pairs[0]!.theirs.value }" />
        </i>
        <p class="split__legend t-num">
          <span>{{ t('report.you') }} · {{ versus.stickers.pairs[0]!.mine.text }}</span>
          <span>{{ name }} · {{ versus.stickers.pairs[0]!.theirs.text }}</span>
        </p>
      </div>
    </ReportSection>

    <p v-if="absent.length" class="note talk__absent">
      <Info aria-hidden="true" />
      <span>{{ t('report.talk.missing', { items: absent.join(', ') }) }}</span>
    </p>
  </div>
</template>

<style scoped>
.talk__absent {
  grid-column: 1 / -1;
}

.split {
  display: grid;
  gap: var(--space-2);
  margin-top: auto;
}

.split__bar {
  display: flex;
  gap: 3px;
  height: var(--bar-height);
}

.split__bar b {
  border-radius: var(--radius-full);
  background: var(--you);
}

.split__bar b + b {
  background: var(--them);
}

.split__legend {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-muted);
  font: var(--text-small);
}
</style>
