<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * Stickers: who sends them more often in the answer («Мила шлёт их в 2 раза чаще»), then one
 * favourite of each side, large — yours on a grey card, theirs on their tint — named by its side
 * (theirs in their colour) with how many times it was sent.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc } = useI18n()

const stickers = computed(() => props.data.report.stickers)
const name = computed(() => props.data.summary.title)
const versus = useVersus(() => props.data)
const answer = computed(() => {
  const item = versus.value.stickers
  if (!item) return null
  if (!item.lead) return t('report.fmt.stickersEven')
  const mine = item.lead === 'mine'
  if (!Number.isFinite(item.ratio))
    return mine ? t('report.stickers.answer.onlyMine') : t('report.stickers.answer.onlyTheirs', { name: name.value })
  return mine
    ? t('report.stickers.answer.mine', { note: item.note })
    : t('report.stickers.answer.theirs', { name: name.value, note: item.note })
})
/** Each side's favourite: the sticker it sent most. */
const favourites = computed(() => {
  const top = stickers.value?.top ?? []
  const best = (side: 'mine' | 'theirs') =>
    [...top].filter((sticker) => sticker[side] > 0).sort((left, right) => right[side] - left[side])[0] ?? null
  return [
    { key: 'mine' as const, label: t('report.you'), sticker: best('mine') },
    { key: 'theirs' as const, label: name.value, sticker: best('theirs') },
  ].filter((item) => item.sticker)
})
</script>

<template>
  <ReportSection v-if="favourites.length" :title="t('report.talk.stickersTitle')" :answer="answer">
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
        <span class="favourite__count t-num">{{ tc('report.stickers.favourite', item.sticker![item.key]) }}</span>
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
  width: calc(var(--space-20) + var(--space-4));
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
  max-width: 100%;
  overflow: hidden;
  font: var(--text-title);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.favourite--theirs .favourite__who {
  color: var(--them-ink);
}

.favourite__count {
  color: var(--text-muted);
  font: var(--text-small);
}
</style>
