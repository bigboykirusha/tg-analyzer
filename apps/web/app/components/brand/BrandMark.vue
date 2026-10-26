<script setup lang="ts">
/**
 * The mark: a conversation as bars on an ink tile. Bars above the line are
 * your messages, lime bars below are theirs, the same as in every report.
 */
withDefaults(defineProps<{ size?: number }>(), { size: 28 })
</script>

<template>
  <svg class="brand-mark" :width="size" :height="size" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
    <rect width="28" height="28" rx="8" class="brand-mark__field" />
    <g transform="translate(3 3)">
      <rect x="3" y="3" width="3.4" height="9" rx="1.7" class="brand-mark__you" />
      <rect x="9.3" y="1" width="3.4" height="11" rx="1.7" class="brand-mark__you" />
      <rect x="15.6" y="5" width="3.4" height="7" rx="1.7" class="brand-mark__you" />
      <rect x="3" y="13" width="3.4" height="5" rx="1.7" class="brand-mark__them" />
      <rect x="9.3" y="13" width="3.4" height="8" rx="1.7" class="brand-mark__them" />
      <rect x="15.6" y="13" width="3.4" height="4" rx="1.7" class="brand-mark__them" />
    </g>
  </svg>
</template>

<style scoped>
.brand-mark {
  flex: 0 0 auto;
  display: block;
}

.brand-mark__field {
  fill: var(--tile-ink);
}

.brand-mark__you {
  fill: var(--on-tile-ink);
}

.brand-mark__them {
  fill: var(--lime);
}
</style>
