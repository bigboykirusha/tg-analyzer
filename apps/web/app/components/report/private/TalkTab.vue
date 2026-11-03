<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../../lib/icons'

/** What the two of you send besides words. Who does more lives in «Кто есть кто». */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()

const report = computed(() => props.data.report)
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
</style>
