<script setup lang="ts">
import type { StickerDto } from '@tg-analyzer/shared'

/**
 * Favourite stickers: the preview from Telegram, or the sticker's emoji when there is none. With
 * `side`, the count is that side's and the grid is one row of four.
 */
const props = defineProps<{ stickers: StickerDto[]; side?: 'mine' | 'theirs' }>()
const count = (sticker: StickerDto) => (props.side ? sticker[props.side] : sticker.mine + sticker.theirs)
const { t, formatNumber } = useI18n()
</script>

<template>
  <ul class="stickers" :class="{ 'stickers--row': side }">
    <li v-for="sticker in stickers" :key="sticker.id" class="sticker">
      <span class="sticker__art">
        <img v-if="sticker.thumb" :src="sticker.thumb" :alt="sticker.emoji ?? t('report.talk.sticker')" />
        <span v-else class="sticker__emoji" aria-hidden="true">{{ sticker.emoji ?? '🃏' }}</span>
      </span>
      <span class="sticker__count t-h2">{{ formatNumber(count(sticker)) }}</span>
    </li>
  </ul>
</template>

<style scoped>
.stickers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: var(--space-2);
  list-style: none;
}

.stickers--row {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.sticker {
  display: grid;
  justify-items: center;
  gap: var(--space-1);
}

.sticker__art {
  display: grid;
  width: var(--avatar-lg);
  height: var(--avatar-lg);
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--surface-2);
}

.sticker__art img {
  width: calc(var(--avatar-lg) - var(--space-2));
  height: calc(var(--avatar-lg) - var(--space-2));
  object-fit: contain;
}

.sticker__emoji {
  font: var(--text-h2);
}

.sticker__count {
  color: var(--text-muted);
  font: var(--text-label);
}
</style>
