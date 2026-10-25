<script setup lang="ts">
/**
 * The mark: a conversation as a seismograph. Ticks above the line are your
 * messages, ticks below are theirs. Ink follows the text colour, so the mark
 * works on paper and on night ink alike.
 */
withDefaults(defineProps<{ size?: number }>(), { size: 32 })
</script>

<template>
  <svg class="brand-mark" :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <rect width="32" height="32" rx="7" class="brand-mark__field" />
    <path d="M5 16h22" class="brand-mark__line" />
    <path d="M9.5 14.5v-7M17.5 14.5v-10M25 14.5v-4" class="brand-mark__you" />
    <path d="M13.5 17.5v6M21.5 17.5v8" class="brand-mark__them" />
  </svg>
</template>

<style scoped>
.brand-mark {
  flex: 0 0 auto;
  display: block;
}

.brand-mark__field {
  fill: var(--text);
}

.brand-mark__line,
.brand-mark__you,
.brand-mark__them {
  fill: none;
  stroke-linecap: round;
}

.brand-mark__line {
  stroke: var(--bg);
  stroke-width: 1.2;
  opacity: 0.45;
}

.brand-mark__you {
  stroke: var(--you);
  stroke-width: 3;
}

.brand-mark__them {
  stroke: var(--bg);
  stroke-width: 3;
}
</style>
