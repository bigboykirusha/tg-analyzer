<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * Stickers: who sends them more often in the answer, then one favourite of each side, large — yours
 * on a grey card, theirs on their tint — with how many times it was sent and whose it is.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc } = useI18n()

const stickers = computed(() => props.data.report.stickers)
const name = computed(() => props.data.summary.title)
const versus = useVersus(() => props.data)
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
/** Each side's favourite: the sticker it sent most. */
const favourites = computed(() => {
  const top = stickers.value?.top ?? []
  const best = (side: 'mine' | 'theirs') =>
    [...top].filter((sticker) => sticker[side] > 0).sort((left, right) => right[side] - left[side])[0] ?? null
  return [
    { key: 'mine' as const, label: t('report.stickers.mine'), sticker: best('mine') },
    { key: 'theirs' as const, label: t('report.stickers.theirs', { name: name.value }), sticker: best('theirs') },
  ].filter((item) => item.sticker)
})
</script>

<template>
  <ReportSection v-if="favourites.length" :title="t('report.talk.stickersTitle')" :text="variety" :answer="answer">
    <ul class="favourites">
      <li v-for="item in favourites" :key="item.key" class="favourite" :class="`favourite--${item.key}`">
        <span class="favourite__art">
          <img
            v-if="item.sticker!.thumb"
            :src="item.sticker!.thumb"
            :alt="item.sticker!.emoji ?? t('report.talk.sticker')"
          />
          <span v-else class="favourite__emoji" aria-hidden="true">{{ item.sticker!.emoji ?? '🃏' }}</span>
        </span>
        <strong class="favourite__who">{{ item.label }}</strong>
        <span class="favourite__count t-num">{{ tc('report.stickers.times', item.sticker![item.key]) }}</span>
      </li>
    </ul>
  </ReportSection>
</template>

<style scoped>
.favourites {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.favourite {
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  text-align: center;
}

.favourite__art {
  display: grid;
  place-items: center;
  width: calc(var(--space-20) + var(--space-6));
  aspect-ratio: 1;
  margin-bottom: var(--space-2);
  border-radius: var(--radius-lg);
  background: var(--surface-2);
}

.favourite--theirs .favourite__art {
  background: var(--room-tint);
}

.favourite__art img {
  width: 80%;
  height: 80%;
  object-fit: contain;
}

.favourite__emoji {
  font: var(--text-figure);
}

.favourite__who {
  font: var(--text-title);
  font-weight: 600;
}

.favourite--theirs .favourite__who {
  color: var(--them-ink);
}

.favourite__count {
  color: var(--text-muted);
  font: var(--text-small);
}
</style>
