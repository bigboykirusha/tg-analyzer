<script setup lang="ts">
import type { StickerDto } from '@tg-analyzer/shared'

/** Favourite stickers: the preview from Telegram, or the sticker's emoji when there is none. */
defineProps<{ stickers: StickerDto[] }>()
const { t, formatNumber } = useI18n()
</script>

<template>
  <ul class="stickers">
    <li v-for="sticker in stickers" :key="sticker.id" class="sticker">
      <span class="sticker__art">
        <img v-if="sticker.thumb" :src="sticker.thumb" :alt="sticker.emoji ?? t('report.talk.sticker')" />
        <span v-else class="sticker__emoji" aria-hidden="true">{{ sticker.emoji ?? '🃏' }}</span>
      </span>
      <span class="sticker__count t-num">{{ formatNumber(sticker.mine + sticker.theirs) }}</span>
    </li>
  </ul>
</template>

<style scoped>
.stickers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: var(--space-3);
  list-style: none;
}

.sticker {
  display: grid;
  justify-items: center;
  gap: var(--space-1);
}

.sticker__art {
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--surface-2);
}

.sticker__art img {
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.sticker__emoji {
  font-size: 34px;
  line-height: 1;
}

.sticker__count {
  color: var(--text-muted);
  font: var(--text-small);
}
</style>
