<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * Stickers sent: each side's four favourites in a row of its own (avatar first, as in «Ваш
 * словарь»), so it is clear who sends which, and the split between the two of you as one line.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc } = useI18n()

const PER_SIDE = 4

const stickers = computed(() => props.data.report.stickers)
const name = computed(() => props.data.summary.title)
const versus = useVersus(() => props.data)
const pair = computed(() => versus.value.stickers?.pairs[0] ?? null)
const answer = computed(() => {
  const item = versus.value.stickers
  if (!item) return null
  return item.lead ? `${item.figure} — ${item.note}` : t('report.fmt.stickersEven')
})
const variety = computed(() => {
  const stats = stickers.value
  if (!stats?.distinct) return undefined
  const kinds = tc('report.talk.stickerKinds', stats.distinct)
  return stats.packs ? `${kinds} ${tc('report.talk.packs', stats.packs)}` : kinds
})
const owners = computed(() => {
  const top = stickers.value?.top ?? []
  const of = (side: 'mine' | 'theirs') =>
    top
      .filter((sticker) => sticker[side] > 0)
      .sort((left, right) => right[side] - left[side])
      .slice(0, PER_SIDE)
  return [
    { key: 'mine' as const, items: of('mine') },
    { key: 'theirs' as const, items: of('theirs') },
  ].filter((owner) => owner.items.length)
})
</script>

<template>
  <ReportSection v-if="owners.length" :title="t('report.talk.stickersTitle')" :text="variety" :answer="answer">
    <div class="owners">
      <div v-for="owner in owners" :key="owner.key" class="owners__row">
        <ReportSideAvatar class="owners__avatar" :side="owner.key" :name="name" />
        <StickerGrid :stickers="owner.items" :side="owner.key" />
      </div>
    </div>
    <ReportLine
      v-if="pair"
      :mine="pair.mine.value"
      :theirs="pair.theirs.value"
      :left="pair.mine.text"
      :right="pair.theirs.text"
    />
  </ReportSection>
</template>

<style scoped>
.owners {
  display: grid;
  gap: var(--space-4);
}

.owners__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: var(--space-2);
}

.owners__avatar {
  margin-top: var(--space-6);
}
</style>
