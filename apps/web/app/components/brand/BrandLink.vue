<script setup lang="ts">
/** The logo and the name: the same in every header and in the sidebar. */
withDefaults(defineProps<{ to?: string }>(), { to: '/' })
</script>

<template>
  <NuxtLink :to="to" class="brand-link" aria-label="TG Analyzer">
    <BrandMark />
    <span class="brand-link__name">TG Analyzer</span>
  </NuxtLink>
</template>

<style scoped>
.brand-link {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 10px;
  border-radius: var(--radius-sm);
  color: var(--text);
  font: 600 16px/1 var(--font-sans);
  letter-spacing: -0.02em;
  white-space: nowrap;
}
</style>
