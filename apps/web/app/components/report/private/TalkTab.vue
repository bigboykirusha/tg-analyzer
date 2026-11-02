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

  <template v-else>
    <ReportSection
      v-if="reactionPairs"
      tone="lime"
      :title="t('report.talk.reactionsTitle')"
      :text="t('report.talk.reactionsText')"
    >
      <div class="emoji-pair">
        <div v-if="reactionPairs.mine.length">
          <span class="t-label">{{ t('report.talk.reactionsMine') }}</span>
          <EmojiGrid :items="reactionPairs.mine" />
        </div>
        <div v-if="reactionPairs.theirs.length">
          <span class="t-label">{{ t('report.talk.reactionsTheirs', { name }) }}</span>
          <EmojiGrid :items="reactionPairs.theirs" />
        </div>
      </div>
    </ReportSection>

    <ReportShared :data="data" />

    <ReportEquivalents :data="data" />

    <ReportSection
      v-if="stickers?.top.length"
      wide
      :title="t('report.talk.stickersTitle')"
      :text="stickerVariety ?? undefined"
    >
      <StickerGrid :stickers="stickers.top" />
    </ReportSection>

    <p v-if="absent.length" class="note">
      <Info aria-hidden="true" />
      <span>{{ t('report.talk.missing', { items: absent.join(', ') }) }}</span>
    </p>
  </template>
</template>

<style scoped>
.emoji-pair {
  display: grid;
  gap: var(--space-4);
}

@media (min-width: 641px) {
  .emoji-pair {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.emoji-pair > div {
  display: grid;
  align-content: start;
  gap: var(--space-2);
}
</style>
