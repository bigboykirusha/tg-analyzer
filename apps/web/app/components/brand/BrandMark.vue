<script setup lang="ts">
/**
 * The mark: the product's mirrored pulse — «you» on top in ink, the other side below in the same ink, softer.
 * One colour, because colour means a person and the mark is nobody's: it reads the same on the page, on a
 * poster and on the app icon (`public/logo.svg` is its tile). `tile` is the app icon only.
 */
withDefaults(defineProps<{ size?: number; tile?: boolean }>(), { size: 28, tile: false })

const UP = [5, 9, 13, 8, 11, 6, 4]
const DOWN = [4, 7, 10, 6, 8, 5, 3]
const W = 2.6
const GAP = 1.1
const X0 = (28 - (7 * W + 6 * GAP)) / 2
const bars = UP.map((up, i) => ({
  x: +(X0 + i * (W + GAP)).toFixed(2),
  up: +(up * 0.9).toFixed(2),
  down: +(DOWN[i]! * 0.9).toFixed(2),
}))
</script>

<template>
  <svg
    class="brand-mark"
    :class="{ 'brand-mark--tile': tile }"
    :width="size"
    :height="size"
    viewBox="0 0 28 28"
    aria-hidden="true"
  >
    <rect v-if="tile" class="brand-mark__tile" width="28" height="28" rx="8" />
    <template v-for="bar in bars" :key="bar.x">
      <rect class="brand-mark__up" :x="bar.x" :y="14 - bar.up" :width="W" :height="bar.up" :rx="W / 2" />
      <rect class="brand-mark__down" :x="bar.x" y="15" :width="W" :height="bar.down" :rx="W / 2" />
    </template>
  </svg>
</template>

<style scoped>
.brand-mark {
  flex: none;
}

.brand-mark__up {
  fill: var(--brand-ink);
}

.brand-mark__down {
  fill: var(--brand-ink);
  fill-opacity: 0.4;
}

.brand-mark__tile {
  fill: var(--brand-tile);
}

.brand-mark--tile .brand-mark__up,
.brand-mark--tile .brand-mark__down {
  fill: var(--on-accent);
}
</style>
