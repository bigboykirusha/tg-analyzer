<script setup lang="ts">
import type { StickerDto } from '@tg-analyzer/shared'

/**
 * Favourite stickers: the preview from Telegram, or the sticker's emoji when there is none. With
 * `side`, the count is that side's. Rows of four.
 */
const props = defineProps<{ stickers: StickerDto[]; side?: 'mine' | 'theirs' }>()
const count = (sticker: StickerDto) => (props.side ? sticker[props.side] : sticker.mine + sticker.theirs)
const { t, formatNumber } = useI18n()
</script>

<template>
  <ul class="stickers">
    <li v-for="sticker in stickers" :key="sticker.id" class="sticker">
      <span class="sticker__art">
        <img v-if="sticker.thumb" :src="sticker.thumb" :alt="sticker.emoji ?? t('report.talk.sticker')" />
        <span v-else class="sticker__emoji" aria-hidden="true">{{ sticker.emoji ?? '🃏' }}</span>
      </span>
      <span class="sticker__count tnum">{{ formatNumber(count(sticker)) }}</span>
    </li>
  </ul>
</template>

<style scoped>
/* Rows of four everywhere: the card shows whole rows, never one sticker alone on the last line (17.11). */
.stickers {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  list-style: none;
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
  border-radius: var(--radius-card);
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
