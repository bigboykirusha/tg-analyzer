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
    aria-label="TG Analyzer"
    :aria-current="current ? 'page' : undefined"
  >
    <BrandMark :size="28" />
    <span v-if="!bare" class="brand-link__name" aria-hidden="true">TG Analyzer</span>
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
  border-radius: var(--radius-sm);
  color: var(--text);
  white-space: nowrap;
}

.brand-link--bare {
  justify-content: center;
  min-width: var(--hit-min);
}

/* The wordmark: the title role at the interface's heaviest weight. */
.brand-link__name {
  font: var(--text-title);
  font-weight: 600;
}

@media (min-width: 901px) {
  .brand-link {
    min-height: var(--control-sm);
  }
}
</style>
