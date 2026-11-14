<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Versus } from '../../../composables/useVersus'
import { Heart } from '../../../lib/icons'

/**
 * Reactions: each side's three favourites on a podium of its own (ReportPodium), yours in ink, theirs
 * in their colour. The answer says who reacts more and whether the favourite is the same.
 */
const props = defineProps<{ data: ReportDto; item: Versus | null }>()
const { t } = useI18n()
const name = computed(() => props.data.summary.title)

// Custom emoji have no picture here, so only regular ones are shown.
const plain = (items: { value: string; count: number }[]) =>
  items.filter((entry) => entry.value !== 'custom' && entry.value !== 'paid').slice(0, 3)

const sides = computed(() => {
  const stats = props.data.report.reactions
  if (!stats) return []
  return [
    { key: 'mine' as const, who: t('report.you'), items: plain(stats.topBySender.mine) },
    { key: 'theirs' as const, who: name.value, items: plain(stats.topBySender.theirs) },
  ]
    .filter((side) => side.items.length)
    .map((side) => ({ ...side, top: side.items[0]?.value ?? null }))
})

/** «Ставите поровну, любимые — разные»: who reacts more, then whether the favourite is the same. */
const answer = computed(() => {
  const item = props.item
  const parts: string[] = []
  if (item) {
    const mine = item.lead === 'mine'
    if (!item.lead) parts.push(t('report.reactions.answer.even'))
    else if (!Number.isFinite(item.ratio))
      parts.push(
        mine ? t('report.reactions.answer.onlyMine') : t('report.reactions.answer.onlyTheirs', { name: name.value }),
      )
    else
      parts.push(
        mine
          ? t('report.reactions.answer.mine', { note: item.note })
          : t('report.reactions.answer.theirs', { name: name.value, note: item.note }),
      )
  }
  const [mine, theirs] = sides.value
  if (mine?.top && theirs?.top)
    parts.push(
      mine.top === theirs.top ? t('report.reactions.same', { emoji: mine.top }) : t('report.reactions.different'),
    )
  return parts.length ? parts.join(', ') : null
})
</script>

<template>
  <ReportSection v-if="sides.length" :icon="Heart" :title="t('report.talk.reactionsTitle')" :answer="answer">
    <div class="podiums">
      <ReportPodium v-for="side in sides" :key="side.key" :items="side.items" :tone="side.key" :who="side.who" />
    </div>
  </ReportSection>
</template>

<style scoped>
.podiums {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
  gap: var(--space-4);
}
</style>
