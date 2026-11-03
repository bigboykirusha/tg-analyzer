<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/**
 * Message length as two chat bubbles without text: one rounded stroke per word of a usual
 * message. The words themselves are never stored, only how many there are.
 */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t } = useI18n()

const pair = computed(() => props.item.pairs[0]!)
/** Stroke widths repeat in this order, so the bubbles read like words of different length. */
const WIDTHS = [34, 52, 28, 20, 44, 30, 38, 26, 48, 22, 36, 30]
const MAX_WORDS = 12
const strokes = (words: number) => WIDTHS.slice(0, Math.min(MAX_WORDS, Math.max(1, Math.round(words))))
</script>

<template>
  <ReportSection :title="item.title">
    <div
      class="chat"
      role="img"
      :aria-label="`${theirName}: ${pair.theirs.text}. ${t('report.you')}: ${pair.mine.text}`"
    >
      <div class="bubble bubble--theirs">
        <i v-for="(width, index) in strokes(pair.theirs.value)" :key="index" :style="{ width: `${width}px` }" />
      </div>
      <div class="bubble bubble--mine">
        <i v-for="(width, index) in strokes(pair.mine.value)" :key="index" :style="{ width: `${width}px` }" />
      </div>
    </div>
    <div class="sides">
      <div>
        <span class="sides__value t-num">{{ pair.theirs.text }}</span>
        <span class="sides__who">{{ theirName }}</span>
      </div>
      <div class="sides__right">
        <span class="sides__value t-num">{{ pair.mine.text }}</span>
        <span class="sides__who">{{ t('report.you') }}</span>
      </div>
    </div>
  </ReportSection>
</template>

<style scoped>
.chat {
  display: grid;
  gap: var(--space-2);
  margin-top: auto;
}

.bubble {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 85%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
}

.bubble i {
  display: block;
  height: 9px;
  border-radius: var(--radius-full);
  background: currentColor;
  opacity: 0.5;
}

.bubble--theirs {
  justify-self: start;
  border-bottom-left-radius: var(--radius-xs);
  background: var(--them);
  color: var(--on-lime);
}

.bubble--mine {
  justify-self: end;
  border-bottom-right-radius: var(--radius-xs);
  background: var(--you);
  color: var(--surface);
}

.sides {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.sides div {
  display: grid;
  min-width: 0;
}

.sides__right {
  text-align: right;
}

.sides__value {
  font: var(--text-figure-sm);
}

.sides__who {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
