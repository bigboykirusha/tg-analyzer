<script setup lang="ts">
/**
 * The logo as the way home. With the word in public headers and the sidebar (where this row is «Главная»);
 * the bare mark in the phone app bar. Always a 44 tap.
 */
withDefaults(defineProps<{ to?: string; bare?: boolean; current?: boolean }>(), {
  to: '/',
  bare: false,
  current: false,
})
</script>

<template>
  <NuxtLink
    :to="to"
    class="brand-link"
    :class="{ 'brand-link--bare': bare }"
    aria-label="TGDuet"
    :aria-current="current ? 'page' : undefined"
  >
    <BrandMark class="brand-link__mark" />
    <span v-if="!bare" class="brand-link__name brand-wordmark" aria-hidden="true">TGDuet</span>
  </NuxtLink>
</template>

<style scoped>
.brand-link {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--control-md);
  border-radius: var(--radius-well);
  color: var(--text);
  white-space: nowrap;
}

.brand-link--bare {
  justify-content: center;
  min-width: var(--hit-min);
}

/* Sized to the bar it sits in (tokens.css). */
.brand-link__mark {
  width: var(--brand-mark-size);
  height: var(--brand-mark-size);
}

/* The wordmark is part of the logo. */
.brand-link__name {
  font: var(--brand-word);
  letter-spacing: var(--tracking-h3);
}

@media (min-width: 901px) {
  .brand-link {
    min-height: var(--control-sm);
  }
}
</style>
