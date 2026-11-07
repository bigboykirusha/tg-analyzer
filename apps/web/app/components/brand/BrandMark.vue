<script setup lang="ts">
/**
 * The mark: a conversation as a mirrored pulse on an ink tile, the picture every report opens with.
 * The lime is the brand's own colour — the only place it appears; in reports colour means a person.
 */
withDefaults(defineProps<{ size?: number }>(), { size: 28 })
</script>

<template>
  <svg class="brand-mark" :width="size" :height="size" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
    <rect width="28" height="28" rx="8" class="brand-mark__field" />
    <rect x="4.3" y="10.4" width="1.8" height="3" rx="0.9" class="brand-mark__you" />
    <rect x="7.3" y="7.4" width="1.8" height="6" rx="0.9" class="brand-mark__you" />
    <rect x="10.3" y="9.4" width="1.8" height="4" rx="0.9" class="brand-mark__you" />
    <rect x="13.3" y="4.4" width="1.8" height="9" rx="0.9" class="brand-mark__you" />
    <rect x="16.3" y="8.4" width="1.8" height="5" rx="0.9" class="brand-mark__you" />
    <rect x="19.3" y="6.4" width="1.8" height="7" rx="0.9" class="brand-mark__you" />
    <rect x="22.3" y="10.4" width="1.8" height="3" rx="0.9" class="brand-mark__you" />
    <rect x="4.3" y="14.6" width="1.8" height="2" rx="0.9" class="brand-mark__them" />
    <rect x="7.3" y="14.6" width="1.8" height="4" rx="0.9" class="brand-mark__them" />
    <rect x="10.3" y="14.6" width="1.8" height="6" rx="0.9" class="brand-mark__them" />
    <rect x="13.3" y="14.6" width="1.8" height="5" rx="0.9" class="brand-mark__them" />
    <rect x="16.3" y="14.6" width="1.8" height="8" rx="0.9" class="brand-mark__them" />
    <rect x="19.3" y="14.6" width="1.8" height="3" rx="0.9" class="brand-mark__them" />
    <rect x="22.3" y="14.6" width="1.8" height="2" rx="0.9" class="brand-mark__them" />
  </svg>
</template>

<style scoped>
.brand-mark {
  flex: 0 0 auto;
  display: block;
}

.brand-mark__field {
  fill: var(--brand-square);
}

.brand-mark__you {
  fill: var(--brand-bar);
}

.brand-mark__them {
  fill: var(--brand);
}
</style>
